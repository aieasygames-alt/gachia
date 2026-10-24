"""Parse explicit local sitemap snapshots for offline comparison, never approval."""

import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
PAGE = re.compile(r'https://gachia\.com/(?:zh|en|ja)(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*')
LIMIT = 10 * 1024 * 1024


def read_snapshots(paths):
    if not paths or len(paths) > 16:
        raise ValueError('Supply 1 to 16 explicit local urlset snapshots')
    urls, snapshots = set(), []
    for name in paths:
        path = Path(name)
        if not path.is_file() or path.stat().st_size > LIMIT:
            raise ValueError('Sitemap snapshot must be a local file within the byte budget')
        with path.open('rb') as handle:
            payload = handle.read(LIMIT + 1)
        if len(payload) > LIMIT:
            raise ValueError('Sitemap snapshot exceeds byte budget')
        document = payload.decode('utf-8')
        if '<!DOCTYPE' in document.upper() or '<!ENTITY' in document.upper():
            raise ValueError('DTD/entity declarations are not allowed')
        root = ET.fromstring(document)
        if root.tag != NS + 'urlset' or not len(root) or len(root) > 50000:
            raise ValueError('Expected a nonempty namespaced urlset with at most 50000 URLs, not a sitemap index')
        entries = []
        for entry in root:
            locations = entry.findall(NS + 'loc')
            if entry.tag != NS + 'url' or len(locations) != 1 or not locations[0].text:
                raise ValueError('Invalid sitemap URL entry')
            url = locations[0].text
            if len(url) > 2048 or not PAGE.fullmatch(url) or url in urls:
                raise ValueError('Noncanonical or duplicate page URL in supplied snapshots')
            entries.append(url)
            urls.add(url)
        snapshots.append({'path': str(path.resolve()), 'sha256': hashlib.sha256(payload).hexdigest(), 'urlCount': len(entries)})
    return {'snapshots': snapshots, 'urls': sorted(urls), 'evidenceKind': 'supplied_local_snapshots_not_production_acceptance'}


if __name__ == '__main__':
    try:
        print(json.dumps(read_snapshots(sys.argv[1:])))
    except (ValueError, OSError, ET.ParseError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
