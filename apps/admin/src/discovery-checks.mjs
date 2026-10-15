const categories = { characters: 'characters', weapons: 'weapons', materials: 'items' };

export function checkDiscovery(plan, review, sitemap, indexes) {
  const checks = [];
  const locations = new Set([...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1].replaceAll('&amp;', '&')));
  for (const page of plan.pages) {
    const included = locations.has(`https://gachia.com${page.path}`);
    checks.push({ ruleId: 'sitemap.membership', path: page.path,
      status: included === (page.kind !== 'deleted') ? 'passed' : 'failed',
      message: page.kind === 'deleted' ? '删除页面不应残留在 sitemap' : '受影响页面应包含在 sitemap' });
  }
  for (const change of plan.changes) {
    const category = Object.hasOwn(categories, change.dataset) ? categories[change.dataset] : null;
    if (!category) { checks.push({ ruleId: 'search.unsupported', entityId: change.id, status: 'not_covered', message: '攻略等数据未接入当前搜索索引' }); continue; }
    const source = review.snapshot.contents.find((file) => file.path === `packages/data/games/hi3/raw-${change.dataset}.json`);
    const rows = source?.deleted ? [] : JSON.parse(source?.content ?? '[]');
    const row = rows.find((item) => item.id === change.id);
    for (const locale of ['zh', 'en', 'ja']) {
      const entries = indexes[locale]?.hi3?.[category];
      const validEntries = Array.isArray(entries) && entries.every((item) => item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string');
      const matches = validEntries ? entries.filter((item) => item.id === change.id) : [];
      const expectedName = row?.[`name${locale === 'zh' ? '' : locale === 'en' ? 'En' : 'Ja'}`];
      const expectedAlt = locale === 'zh' ? row?.nameEn ?? '' : row?.name;
      const valid = validEntries && (change.type === 'deleted' ? matches.length === 0 :
        matches.length === 1 && typeof expectedName === 'string' && matches[0].name === expectedName && matches[0].nameAlt === expectedAlt);
      checks.push({ ruleId: 'search.entity', entityId: change.id, category, locale, status: valid ? 'passed' : 'failed',
        message: change.type === 'deleted' ? '删除实体不得残留搜索索引' : '实体唯一存在且三语名称与源数据一致' });
    }
  }
  checks.push({ ruleId: 'search.ui_behavior', status: 'not_covered', message: '索引可发现性检查不等于搜索输入、排序或点击交互验收' });
  return checks;
}

export async function fetchDiscovery(origin, plan, review, fetcher = fetch) {
  if (typeof origin !== 'string' || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin) || Number(new URL(origin).port) > 65535) {
    throw new Error('Explicit loopback preview origin required');
  }
  const load = async (path) => {
    const started = performance.now();
    const signal = AbortSignal.timeout(30000);
    const observation = { path, timeoutMs: 30000, byteLimit: 8 * 1024 * 1024, bytesRead: 0 };
    let phase = 'request';
    try {
      const response = await fetcher(new URL(path, origin), { redirect: 'error', signal });
      observation.httpStatus = response.status;
      if (response.status !== 200) {
        observation.failureKind = 'http_status';
        await response.body?.cancel();
        throw new Error('Unexpected status');
      }
      phase = 'body';
      const chunks = [];
      for await (const chunk of response.body) {
        observation.bytesRead += chunk.length;
        if (observation.bytesRead > observation.byteLimit) {
          observation.failureKind = 'response_too_large';
          throw new Error('Response budget exceeded');
        }
        chunks.push(chunk);
      }
      observation.elapsedMs = Math.round(performance.now() - started);
      return { text: Buffer.concat(chunks).toString('utf8'), observation };
    } catch (error) {
      observation.elapsedMs = Math.round(performance.now() - started);
      observation.failureKind ??= signal.aborted || error?.name === 'TimeoutError' ? 'timeout' :
        error?.name === 'AbortError' ? 'aborted' : phase === 'body' ? 'body_read_failed' : 'request_failed';
      // Never persist response bodies, headers, redirect targets, or arbitrary error text.
      throw Object.assign(new Error('Local discovery failed'), { observation });
    }
  };
  const checks = []; let sitemap; const indexes = {};
  try {
    const loaded = await load('/sitemap.xml');
    if (!/<urlset(?:\s|>)/.test(loaded.text)) {
      throw Object.assign(new Error('Expected sitemap urlset'), { observation: { ...loaded.observation, failureKind: 'expected_urlset' } });
    }
    sitemap = loaded.text;
  } catch (error) { checks.push({ ruleId: 'sitemap.fetch', status: 'failed', diagnostic: error.observation,
    message: 'sitemap 请求失败、超时、超限或不是 urlset；不自动跟随索引或重定向' }); }
  const hasSearchChanges = plan.changes.some((change) => Object.hasOwn(categories, change.dataset));
  if (hasSearchChanges) for (const locale of ['zh', 'en', 'ja']) {
    let observation;
    try {
      const loaded = await load(`/data-manifest/search-${locale}.json`);
      observation = loaded.observation;
      indexes[locale] = JSON.parse(loaded.text);
    }
    catch (error) { checks.push({ ruleId: 'search.fetch', locale, status: 'failed',
      diagnostic: error.observation ?? { ...observation, failureKind: 'invalid_json' }, message: '搜索索引请求失败或数据无效' }); }
  }
  const evaluated = checkDiscovery(plan, review, sitemap ?? '', indexes);
  return [...checks, ...evaluated.filter((check) => sitemap !== undefined || check.ruleId !== 'sitemap.membership')];
}
