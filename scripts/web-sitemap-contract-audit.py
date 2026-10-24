"""Read-only, local compiled-Worker sitemap acceptance using an XML parser."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
PUBLIC = "https://gachia.com"
MAIN = "/sitemaps/main/sitemap.xml"
ROUTE_CONTRACT = json.loads((Path(__file__).resolve().parent.parent / "packages/core/route-ownership.json").read_text())
if ROUTE_CONTRACT.get("schemaVersion") != 1 or set(ROUTE_CONTRACT["games"]) != {"nte", "genshin", "azur-promilia", "lvmeng"}:
    raise ValueError("Unsupported route ownership contract")
ROUTE_GAMES = ROUTE_CONTRACT["games"]


def route_owner(path):
    segments = [part for part in path.split("/") if part]
    for owner, routes in ROUTE_GAMES.items():
        if len(segments) < 2 or segments[1] != owner:
            continue
        if segments[0] in ("_games", "sitemaps"):
            return owner
        if segments[0] in routes["locales"] and (len(segments) == 2 or
                (len(segments) == 3 and segments[2] in routes["pages"]) or
                (len(segments) == 4 and segments[2] in routes["details"])):
            return owner
    return "main"


def main_sitemap_path(path):
    segments = [part for part in path.split("/") if part]
    if not segments or segments[0] not in ("zh", "en", "ja") or route_owner(path) != "main":
        return False
    routes = ROUTE_GAMES.get(segments[1]) if len(segments) > 1 else None
    return not routes or (len(segments) == 4 and segments[2] in routes["mainIndexableDetails"])


def canonical_path(value):
    url = urllib.parse.urlsplit(value)
    if url.scheme != "https" or url.netloc != "gachia.com" or url.query or url.fragment:
        raise ValueError(f"Noncanonical sitemap URL: {value}")
    if not url.path.startswith("/") or "//" in url.path or "%" in url.path or "\\" in url.path or any(part in (".", "..") for part in url.path.split("/")):
        raise ValueError(f"Invalid sitemap path: {value}")
    return url.path


def locations(document, root_name, entry_name):
    if "<!DOCTYPE" in document.upper() or "<!ENTITY" in document.upper():
        raise ValueError("DTD/entity declarations are not allowed")
    root = ET.fromstring(document)
    if root.tag != NS + root_name or not len(root):
        raise ValueError(f"Expected nonempty namespaced {root_name}")
    urls = []
    for entry in root:
        locs = entry.findall(NS + "loc")
        if entry.tag != NS + entry_name or len(locs) != 1 or not locs[0].text:
            raise ValueError(f"Invalid {entry_name} entry")
        url = locs[0].text
        canonical_path(url)
        urls.append(url)
    if len(urls) != len(set(urls)):
        raise ValueError("Duplicate sitemap locations")
    return urls


def verify_documents(index_xml, main_xml):
    children = locations(index_xml, "sitemapindex", "sitemap")
    if PUBLIC + MAIN not in children:
        raise ValueError("Root index does not discover the main shard")
    owners = set()
    for child in children:
        path = canonical_path(child)
        if path == MAIN:
            continue
        match = re.fullmatch(r"/sitemaps/([a-z0-9-]+)/index\.xml", path)
        if not match:
            raise ValueError(f"Unknown sitemap child: {child}")
        if match[1] not in ROUTE_GAMES:
            raise ValueError(f"Unknown sitemap owner: {child}")
        owners.add(match[1])
    pages = locations(main_xml, "urlset", "url")
    for url in pages:
        segments = canonical_path(url).split("/")[1:]
        if segments[0] not in ("zh", "en", "ja"):
            raise ValueError(f"Main shard contains a non-page URL: {url}")
        if route_owner(canonical_path(url)) != "main":
            raise ValueError(f"Main shard overrides a dedicated owner: {url}")
        if not main_sitemap_path(canonical_path(url)):
            raise ValueError(f"Main shard contains an unapproved fallback page: {url}")
    return {"children": children, "dedicatedOwners": sorted(owners), "mainUrls": pages}


def compare_before(before, verified):
    old = {entry["url"] for entry in before}
    new = set(verified["mainUrls"])
    removed = {}
    for url in sorted(old - new):
        path = canonical_path(url)
        segments = path.split("/")[1:]
        if url in verified["children"]:
            reason = "sitemap-reference-moved-to-index"
        elif route_owner(path) in verified["dedicatedOwners"]:
            reason = f"dedicated-owner:{route_owner(path)}"
        else:
            raise ValueError(f"Unexplained removal from main sitemap: {url}")
        removed.setdefault(reason, []).append(url)
    return {
        "before": len(old), "after": len(new), "unchanged": len(old & new),
        "added": sorted(new - old), "removedCounts": {reason: len(urls) for reason, urls in removed.items()},
        "removed": removed,
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origin", required=True, help="Explicit local Worker origin")
    parser.add_argument("--before-json", type=Path)
    parser.add_argument("--baseline-kind", choices=("source-evaluation", "runtime-assets-reconstruction", "http-capture"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if bool(args.before_json) != bool(args.baseline_kind):
        parser.error("--before-json and --baseline-kind must be supplied together; do not label a reconstruction as a live capture")
    origin = urllib.parse.urlsplit(args.origin)
    if origin.scheme != "http" or origin.hostname != "127.0.0.1" or not origin.port or origin.username or origin.password or origin.path not in ("", "/") or origin.query or origin.fragment:
        parser.error("Only an explicit credential-free http://127.0.0.1:PORT origin is accepted")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def get(path):
        request = urllib.request.Request(args.origin.rstrip("/") + path, headers={"cf-connecting-ip": "192.0.2.200"})
        with opener.open(request, timeout=30) as response:
            if response.status != 200 or response.headers.get_content_type() not in ("application/xml", "text/xml"):
                raise ValueError(f"{path}: expected HTTP 200 XML")
            payload = response.read(10 * 1024 * 1024 + 1)
            if len(payload) > 10 * 1024 * 1024:
                raise ValueError("XML exceeds acceptance response budget")
            return payload.decode("utf-8")

    index_xml, main_xml = get("/sitemap.xml"), get(MAIN)
    verified = verify_documents(index_xml, main_xml)
    report = {
        "schemaVersion": 1, "status": "local_compiled_worker_xml_verified", "cloudVerification": "not_performed",
        "children": verified["children"], "dedicatedOwners": verified["dedicatedOwners"],
        "mainUrlCount": len(verified["mainUrls"]),
        "mainByLocale": dict(Counter(canonical_path(url).split("/")[1] for url in verified["mainUrls"])),
        "indexXmlSha256": hashlib.sha256(index_xml.encode()).hexdigest(),
        "mainXmlSha256": hashlib.sha256(main_xml.encode()).hexdigest(),
    }
    if args.before_json:
        report["diff"] = compare_before(json.loads(args.before_json.read_text()), verified)
        report["baselineEvidence"] = {
            "kind": args.baseline_kind,
            "sha256": hashlib.sha256(args.before_json.read_bytes()).hexdigest(),
        }
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key != "diff"}, indent=2))


if __name__ == "__main__":
    main()
