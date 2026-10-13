import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { FactError } from './facts.mjs';
import { validateEvidence } from './content.mjs';

export const officialSource = Object.freeze({ id: 'hi3-global-en', server: 'Global', language: 'en',
  page: 'https://honkaiimpact3.hoyoverse.com/global/en-us/news/cate/514',
  endpoint: 'https://sg-public-api-static.hoyoverse.com/content_v2_user/app/5fcd2aa439ca4aea/getContentList?iChanId=514&iPage=1&iPageSize=3&sLangKey=en-us' });
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(address, prefix);
export const publicIPv4 = (address) => isIP(address) === 4 && !blocked.check(address);

export function officialFetcher({ resolveAddress = lookup, get = https.get, schedule = setTimeout, cancel = clearTimeout } = {}) {
  return async function fetchSource() {
    let dnsTimer;
    const address = await Promise.race([resolveAddress(new URL(officialSource.endpoint).hostname, { family: 4 }), new Promise((_, reject) => {
      dnsTimer = schedule(() => reject(new Error('DNS timeout')), 5000);
    })]).finally(() => cancel(dnsTimer));
    if (!publicIPv4(address.address)) throw new Error('Unsafe source address');
    return new Promise((resolve, reject) => {
      const request = get(officialSource.endpoint, { agent: false,
        lookup: (_host, options, done) => options.all ? done(null, [{ address: address.address, family: 4 }]) : done(null, address.address, 4),
        headers: { Accept: 'application/json', 'User-Agent': 'GachiaLocalWorkbench/0.1' } }, (response) => {
        const chunks = []; let size = 0; let ended = false;
        response.on('data', (chunk) => { size += chunk.length; if (size > 2 * 1024 * 1024) request.destroy(new Error('Response too large')); else chunks.push(chunk); });
        response.on('error', (error) => { reject(error); request.destroy(error); });
        response.on('aborted', () => request.destroy(new Error('Response aborted')));
        response.on('close', () => { if (!ended) request.destroy(new Error('Response closed before completion')); });
        response.on('end', () => { ended = true; resolve({ status: response.statusCode, retryAfter: response.headers['retry-after'], body: Buffer.concat(chunks).toString('utf8') }); });
      });
      const timer = schedule(() => request.destroy(new Error('Request timeout')), 15000);
      request.on('close', () => cancel(timer)); request.on('error', reject);
    });
  };
}
export const fetchOfficial = officialFetcher();

export function parseOfficial(body) {
  const data = JSON.parse(body);
  if (data.retcode !== 0 || !Array.isArray(data.data?.list) || !Number.isInteger(data.data.iTotal) || data.data.iTotal < 0 || data.data.list.length > 3 || (data.data.iTotal > 0 && !data.data.list.length)) throw new Error('Invalid official list');
  const ids = new Set();
  return data.data.list.map((row) => {
    if (!Number.isSafeInteger(row.iInfoId) || row.iInfoId <= 0 || ids.has(row.iInfoId) || typeof row.sTitle !== 'string' || !row.sTitle.trim() || row.sTitle.length > 200 || typeof row.sContent !== 'string' || row.sContent.length < 80 || typeof row.dtStartTime !== 'string' || !/^\d{4}-\d{2}-\d{2} /.test(row.dtStartTime)) throw new Error('Incomplete announcement');
    ids.add(row.iInfoId);
    return { id: String(row.iInfoId), title: row.sTitle, rawHtml: row.sContent, publishedAt: row.dtStartTime.slice(0, 10),
      url: `https://honkaiimpact3.hoyoverse.com/global/en-us/news/${row.iInfoId}`,
      server: 'Global', language: 'en', verification: 'unverified' };
  });
}

export function sourceService(store, { fetcher = fetchOfficial, clock = Date.now } = {}) {
  let busy = false;
  store.reconcileSource(officialSource.id, clock());
  const state = () => {
    const record = store.sourceRecord(officialSource.id);
    return { ...officialSource, status: 'never_checked', ...record, busy,
      stale: Boolean((record?.lastSuccess || record?.lastAttempt) && clock() - Date.parse(record.lastSuccess ?? record.lastAttempt) > 7 * 86400000),
      coverage: '仅官网Global英文Latest首屏最多3篇；不证明历史完整、无遗漏或其他服务器适用' };
  };
  return { state, importExcerpt(input) {
    if (input?.confirmExcerpt !== true) throw new FactError('请确认已审阅原文片段；导入不等于事实确认');
    const snapshot = store.sourceRecord(officialSource.id);
    if (!snapshot || input.snapshotDigest !== snapshot.digest) throw new FactError('公告快照已变化，请刷新后重新选择', 409);
    const article = snapshot.articles?.find((item) => item.id === input.articleId);
    const excerpt = typeof input.excerpt === 'string' ? input.excerpt.trim().replace(/\r\n?/g, '\n') : '';
    if (!article || !excerpt || excerpt.length > 30000 || !article.rawHtml.replace(/\r\n?/g, '\n').includes(excerpt)) throw new FactError('片段必须是该快照原文的连续内容，且不超过30000字符');
    const validated = validateEvidence({ ...article, body: excerpt, sourceType: 'official_claim' });
    return store.importEvidence({ ...validated, sourceSnapshot: { sourceId: officialSource.id,
      articleId: article.id, digest: snapshot.digest, fetchedAt: snapshot.lastSuccess,
      articleDigest: createHash('sha256').update(article.rawHtml).digest('hex'), format: 'raw_html_excerpt' } });
  }, async collect(input) {
    if (input?.confirmPublicFetch !== true) throw new FactError('必须确认只读访问国际服公开官方来源');
    if (busy) throw new FactError('采集进行中或尚在来源冷却期', 409);
    store.reconcileSource(officialSource.id, clock());
    // Persist intent before network access; a crash must not leave the old success visible.
    const { before, record: intent } = store.beginSourceCollection(officialSource.id, clock());
    busy = true;
    const record = { ...intent, status: 'access_failed' };
    try {
      const response = await fetcher();
      if (response.status !== 200) {
        if (response.status === 429) {
          const seconds = /^\d+$/.test(response.retryAfter ?? '') ? Number(response.retryAfter) * 1000 : Date.parse(response.retryAfter ?? '') - clock();
          if (Number.isFinite(seconds)) record.nextAllowedAt = Math.max(record.nextAllowedAt, clock() + Math.max(0, seconds));
        }
        throw new Error('HTTP failure');
      }
      let articles;
      try { articles = parseOfficial(response.body); }
      catch { record.status = 'parse_failed'; throw new Error('Parse failure'); }
      const digest = createHash('sha256').update(JSON.stringify(articles)).digest('hex');
      record.status = digest === before.digest ? 'success_unchanged' : 'success_changed';
      record.digest = digest; record.articles = articles; record.lastSuccess = new Date(clock()).toISOString();
    } catch { record.status = record.status === 'parse_failed' ? 'parse_failed' : 'access_failed'; }
    finally {
      busy = false;
      store.reconcileSource(officialSource.id, clock());
      store.finishSourceCollection(officialSource.id, intent.collectionAttempt.id, record, clock());
    }
    return state();
  } };
}
