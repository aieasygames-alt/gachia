"""Read-only production inventory; responses cached privately for reproducible review."""
import concurrent.futures
import datetime
import hashlib
import http.client
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent
PRIVATE = ROOT / '.private'
PRIVATE.mkdir(exist_ok=True)
urls = json.loads((ROOT / 'sitemap-urls.json').read_text())
for locale in ['zh', 'en', 'ja']:
    for path in ['build', 'events', 'redeem-codes', 'gacha']:
        url = f'https://gachia.com/{locale}/starrail/{path}'
        if url not in urls:
            urls.append(url)

def priority(url):
    parts = urllib.parse.urlparse(url).path.strip('/').split('/')
    return (parts[0] != 'zh', len(parts) > 3, 'guides' not in parts, url)

def capture(url):
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    dest = PRIVATE / (key + '.json')
    if dest.exists():
        return json.loads(dest.read_text())
    row = {'url': url, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    for attempt in range(3):
        try:
            client = urllib.request.build_opener(urllib.request.ProxyHandler({'https': 'http://127.0.0.1:1087'}))
            req = urllib.request.Request(url, headers={'User-Agent': 'GachiaCMS/1.0', 'Accept-Encoding': 'identity'})
            try:
                response = client.open(req, timeout=35)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read()
            row.update(status=response.code, finalUrl=response.url,
                       cacheControl=response.headers.get('cache-control'), sha256=hashlib.sha256(raw).hexdigest())
            soup = BeautifulSoup(raw, 'html.parser')
            row['title'] = soup.title.get_text(' ', strip=True) if soup.title else ''
            desc = soup.find('meta', attrs={'name': 'description'})
            row['description'] = desc.get('content') if desc else ''
            canonical = soup.find('link', rel='canonical')
            row['canonical'] = canonical.get('href') if canonical else None
            row['robots'] = [m.get('content') for m in soup.find_all('meta', attrs={'name': 'robots'})]
            row['headings'] = [{'tag': h.name, 'text': h.get_text(' ', strip=True)} for h in soup.find_all(['h1', 'h2', 'h3'])]
            row['jsonLd'] = [s.get_text() for s in soup.find_all('script', attrs={'type': 'application/ld+json'})]
            main = soup.find('main') or soup
            row['links'] = [{'text': a.get_text(' ', strip=True), 'href': urllib.parse.urljoin(url, a['href'])}
                            for a in main.find_all('a', href=True)]
            row['images'] = [{'alt': img.get('alt'), 'src': img.get('src')} for img in main.find_all('img')]
            for el in main.find_all(['script', 'style', 'nav', 'footer', 'header']):
                el.decompose()
            row['text'] = main.get_text('\n', strip=True)
            row['versionMentions'] = sorted(set(re.findall(r'(?<!\d)(?:v|V)?[1-9]\.\d{1,2}(?!\d)', row['text'])))
            row['textLength'] = len(row['text'])
            dest.write_text(json.dumps(row, ensure_ascii=False))
            return row
        except (urllib.error.URLError, http.client.RemoteDisconnected, TimeoutError, OSError) as error:
            if attempt == 2:
                row['error'] = type(error).__name__
                return row
            time.sleep(0.3)

if __name__ == '__main__':
    urls.sort(key=priority)
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(capture, url): url for url in urls}
        for future in concurrent.futures.as_completed(futures):
            row = future.result()
            rows.append(row)
            if len(rows) % 25 == 0:
                print(json.dumps({'completed': len(rows), 'total': len(urls), 'errors': sum('error' in r for r in rows)}, ensure_ascii=False), flush=True)
            (PRIVATE / 'progress.json').write_text(json.dumps(rows, ensure_ascii=False))
    rows.sort(key=lambda r: r['url'])
    (PRIVATE / 'pages.json').write_text(json.dumps(rows, ensure_ascii=False))
    index = [{k: v for k, v in row.items() if k not in ['text', 'links', 'images', 'jsonLd']} for row in rows]
    (ROOT / 'page-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'complete': len(rows), 'statuses': {str(s): sum(r.get('status') == s for r in rows) for s in set(r.get('status') for r in rows)}}, ensure_ascii=False), flush=True)
