const routes = { characters: 'characters', weapons: 'weapons', materials: 'items' };

export function searchSamples(plan, review) {
  const samples = []; const notCovered = []; const selected = new Set();
  for (const change of plan.changes) {
    if (!Object.hasOwn(routes, change.dataset)) continue;
    if (change.type === 'deleted' || selected.has(change.dataset)) {
      notCovered.push({ ruleId: 'search.ui_sample_gap', entityId: change.id, dataset: change.dataset,
        status: 'not_covered', message: '未抽样实体或删除实体的搜索交互未检查；索引一致性另行验证' });
      continue;
    }
    selected.add(change.dataset);
    const source = review.snapshot.contents.find((file) => file.path === `packages/data/games/hi3/raw-${change.dataset}.json`);
    const row = JSON.parse(source?.content ?? '[]').find((item) => item.id === change.id);
    for (const locale of ['zh', 'en', 'ja']) samples.push({ entityId: change.id, dataset: change.dataset, locale,
      query: row?.[locale === 'zh' ? 'name' : locale === 'en' ? 'nameEn' : 'nameJa'],
      path: `/${locale}/hi3/${routes[change.dataset]}/${change.id}` });
  }
  return { samples, notCovered };
}

export async function checkSearchInteractions(context, origin, plan, review, assertCurrent, profile = 'desktop', keyboard = false) {
  const { samples, notCovered } = searchSamples(plan, review);
  const checks = keyboard ? [] : notCovered.map((item) => ({ ...item, profile }));
  for (const sample of keyboard ? samples.slice(0, 3) : samples) {
    assertCurrent();
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', () => errors.push('uncaught_page_error'));
    const check = { ...sample, profile, viewport: page.viewportSize(), ruleId: keyboard ? 'search.ui_keyboard' : 'search.ui_sample', status: 'failed' };
    try {
      if (typeof sample.query !== 'string' || !sample.query.trim()) throw new Error('Missing translation');
      await page.goto(`${origin}/${sample.locale}/hi3`, { waitUntil: 'networkidle', timeout: 60000 });
      const trigger = page.getByRole('button', { name: /搜索|検索|Search/ });
      await trigger.waitFor({ state: 'visible', timeout: 10000 });
      check.triggerInViewport = await inViewport(trigger);
      await trigger.click({ timeout: 10000 });
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 10000 });
      await dialog.locator('input').fill(sample.query, { timeout: 10000 });
      check.dialogInViewport = await inViewport(dialog);
      check.inputInViewport = await inViewport(dialog.locator('input'));
      check.horizontalOverflow = await page.evaluate((width) => document.documentElement.scrollWidth > Math.min(window.innerWidth, width) + 1, page.viewportSize().width);
      if (check.horizontalOverflow) check.overflowElements = await page.evaluate((width) => [...document.querySelectorAll('body *')].filter((node) => {
        const box = node.getBoundingClientRect(); return box.width > 0 && box.right > width + 1;
      }).slice(0, 12).map((node) => ({ tag: node.tagName, className: String(node.className), right: node.getBoundingClientRect().right })), page.viewportSize().width);
      const result = dialog.locator(`a[href="${sample.path}"]`);
      await result.waitFor({ state: 'visible', timeout: 10000 });
      check.resultCount = await result.count();
      check.nameMatches = (await result.innerText()).includes(sample.query);
      await result.scrollIntoViewIfNeeded();
      check.resultInViewport = await inViewport(result);
      if (keyboard) {
        await dialog.locator('input').focus();
        const last = dialog.locator('a[href]').last();
        await page.keyboard.press('Shift+Tab');
        check.reverseTabWrapped = await last.evaluate((node) => node === document.activeElement);
        await page.keyboard.press('Tab');
        check.forwardTabWrapped = await dialog.locator('input').evaluate((node) => node === document.activeElement);
        if (!check.reverseTabWrapped || !check.forwardTabWrapped) throw new Error('Focus escaped dialog');
        const count = await dialog.locator('a[href]').count();
        for (let i = 0; i <= count; i++) {
          await page.keyboard.press('Tab');
          if (await result.evaluate((node) => node === document.activeElement)) break;
        }
        check.targetKeyboardFocused = await result.evaluate((node) => node === document.activeElement);
        if (!check.targetKeyboardFocused) throw new Error('Keyboard target unreachable');
      }
      const response = await Promise.all([
        page.waitForResponse((response) => response.url() === `${origin}${sample.path}` && response.request().isNavigationRequest(), { timeout: 30000 }),
        keyboard ? page.keyboard.press('Enter') : result.click({ timeout: 10000 }),
      ]);
      await page.waitForURL(`${origin}${sample.path}`, { timeout: 30000 });
      await page.locator('h1').first().waitFor({ timeout: 10000 });
      check.httpStatus = response[0].status();
      check.observedPath = new URL(page.url()).pathname;
      check.observedLanguage = await page.locator('html').getAttribute('lang');
      check.canonicalMatches = await page.locator('link[rel=canonical]').getAttribute('href') === `https://gachia.com${sample.path}`;
      const langMatches = sample.locale === 'zh' ? /^zh(?:-|$)/.test(check.observedLanguage ?? '') : check.observedLanguage === sample.locale;
      check.status = check.triggerInViewport && check.dialogInViewport && check.inputInViewport && check.resultInViewport && !check.horizontalOverflow && check.resultCount === 1 && check.nameMatches && check.httpStatus === 200 && langMatches && check.canonicalMatches && !errors.length ? 'passed' : 'failed';
      check.message = keyboard ? '首个变更类别三语键盘抽样：Tab/Shift+Tab循环、Tab定位结果、Enter导航与目标元数据' : '三语全名搜索抽样：结果名称、唯一链接、点击导航、HTTP、语言与 canonical';
    } catch {
      check.message = '搜索抽样未完成：缺少名称、搜索入口、结果或目标页面检查失败';
    } finally { await page.close(); }
    checks.push(check);
    assertCurrent();
  }
  if (!keyboard) checks.push({ ruleId: 'search.ui_remaining', profile, status: 'not_covered', message: '每个变更类别仅抽样首个非删除实体的三语全名；键盘导航仅抽样首类别；未验收排序质量、模糊词、备用名称、真实设备键盘、读屏、背景inert、方向键选择与攻略搜索' });
  return checks;
}

export async function checkSearchEmptyAndClose(context, origin, assertCurrent, profile = 'desktop') {
  const checks = [];
  for (const locale of ['zh', 'en', 'ja']) {
    assertCurrent();
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', () => errors.push('uncaught_page_error'));
    const check = { ruleId: 'search.ui_empty_close', locale, profile, viewport: page.viewportSize(), status: 'failed' };
    try {
      await page.goto(`${origin}/${locale}/hi3`, { waitUntil: 'networkidle', timeout: 60000 });
      const trigger = page.getByRole('button', { name: /搜索|検索|Search/ });
      const dialog = page.getByRole('dialog');
      const indexResponse = page.waitForResponse((response) => response.url() === `${origin}/data-manifest/search-${locale}.json`, { timeout: 30000 });
      indexResponse.catch(() => {});
      await trigger.click({ timeout: 10000 });
      const input = dialog.locator('input');
      await input.waitFor({ state: 'visible', timeout: 10000 });
      check.initialInputFocused = await input.evaluate((node) => node === document.activeElement);
      // Await a successfully loaded index so a loading failure cannot look like empty results.
      const index = await indexResponse;
      if (index.status() !== 200) throw new Error('Index unavailable');
      const data = await index.json();
      if (!data.hi3 || !Object.values(data.hi3).some((rows) => Array.isArray(rows) && rows.length)) throw new Error('Empty index');
      const query = 'gachia-workbench-no-match-7e92d4a1';
      if (JSON.stringify(data).toLowerCase().includes(query)) throw new Error('Query collision');
      await input.fill(query, { timeout: 10000 });
      const emptyText = { zh: '未找到相关结果', en: 'No results found', ja: '該当する結果がありません' }[locale];
      await dialog.getByText(emptyText, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      check.noResultLinks = await dialog.locator('a[href]').count() === 0;
      await page.keyboard.press('Tab');
      check.emptyTabTrapped = await input.evaluate((node) => node === document.activeElement);
      await page.keyboard.press('Shift+Tab');
      check.emptyReverseTabTrapped = await input.evaluate((node) => node === document.activeElement);
      await input.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 10000 });
      check.escapeClosed = true;
      check.focusRestoredAfterEscape = await trigger.evaluate((node) => node === document.activeElement);
      await trigger.click();
      await input.waitFor({ state: 'visible', timeout: 10000 });
      check.resetAfterEscape = await input.inputValue() === '';
      await input.fill(query);
      // Exercise a real pointer click outside the dialog, not a synthetic DOM event.
      await page.mouse.click(4, 4);
      await dialog.waitFor({ state: 'hidden', timeout: 10000 });
      check.backdropClosed = true;
      check.focusRestoredAfterBackdrop = await trigger.evaluate((node) => node === document.activeElement);
      await trigger.click();
      await input.waitFor({ state: 'visible', timeout: 10000 });
      check.resetAfterBackdrop = await input.inputValue() === '';
      check.status = check.initialInputFocused && check.emptyTabTrapped && check.emptyReverseTabTrapped && check.focusRestoredAfterEscape && check.focusRestoredAfterBackdrop && check.noResultLinks && check.resetAfterEscape && check.resetAfterBackdrop && !errors.length ? 'passed' : 'failed';
      check.message = '无匹配查询、三语提示、Escape/遮罩关闭及重新打开清空输入';
    } catch { check.message = '无结果或关闭交互未完成；不以空白、加载失败代替无结果验收'; }
    finally { await page.close(); }
    checks.push(check); assertCurrent();
  }
  return checks;
}

async function inViewport(locator) {
  return locator.evaluate((node, viewport) => {
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.left >= -1 && box.top >= -1 && box.right <= Math.min(window.innerWidth, viewport.width) + 1 && box.bottom <= Math.min(window.innerHeight, viewport.height) + 1;
  }, locator.page().viewportSize());
}
