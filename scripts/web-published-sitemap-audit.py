"""Bounded cloud XML acceptance. Main comes from the target; other owners remain production-owned."""

import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("contract", Path(__file__).with_name("web-sitemap-contract-audit.py"))
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
ROOT = Path(__file__).resolve().parent.parent
ORIGINS = {"staging": "https://gachia-staging.aieasygames.workers.dev", "production": contract.PUBLIC}


def main_fallback_coverage(main_urls, materials):
    ids = [entry.get("id") for entry in materials]
    if not ids or any(not isinstance(value, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value) for value in ids) or len(ids) != len(set(ids)):
        raise ValueError("Invalid Main-owned NTE material inventory")
    # Inventory coverage must agree with path ownership, not merely a game prefix.
    required = {f"{contract.PUBLIC}/{locale}/nte/items/{value}" for locale in ("zh", "en", "ja") for value in ids}
    if any(not contract.main_sitemap_path(contract.canonical_path(url)) for url in required):
        raise ValueError("Main fallback inventory conflicts with route ownership contract")
    missing = sorted(required - set(main_urls))
    return {"requiredCount": len(required), "missingCount": len(missing), "missing": missing,
            "status": "blocked_main_owned_urls_missing" if missing else "main_fallback_urls_present"}


def verify_owner_pages(pages, owner):
    for url in pages:
        segments = contract.canonical_path(url).split("/")[1:]
        if len(segments) < 2 or segments[0] not in ("zh", "en", "ja") or contract.route_owner(contract.canonical_path(url)) != owner:
            raise ValueError(f"Wrong sitemap owner {owner}: {url}")


def verify_graph(index_xml, main_xml, get):
    verified = contract.verify_documents(index_xml, main_xml)
    if set(verified["dedicatedOwners"]) != {"genshin", "nte", "azur-promilia", "lvmeng"}:
        raise ValueError("Unexpected dedicated owner set")
    sets = {"main": set(verified["mainUrls"])}
    documents = 2
    visited = set()
    for owner in verified["dedicatedOwners"]:
        pages = set()
        pending = [(f"/sitemaps/{owner}/index.xml", 0)]
        while pending:
            path, depth = pending.pop()
            if path in visited or depth > 3 or documents >= 40:
                raise ValueError("Duplicate, recursive or oversized sitemap graph")
            visited.add(path)
            if not re.fullmatch(rf"/sitemaps/{re.escape(owner)}/[A-Za-z0-9/_-]+\.xml", path):
                raise ValueError("Cross-owner sitemap reference")
            document = get(path)
            documents += 1
            if "<!DOCTYPE" in document.upper() or "<!ENTITY" in document.upper():
                raise ValueError("DTD/entity declarations are not allowed")
            root = ET.fromstring(document)
            if root.tag == contract.NS + "sitemapindex":
                children = contract.locations(document, "sitemapindex", "sitemap")
                pending.extend((contract.canonical_path(child), depth + 1) for child in children)
            else:
                urls = contract.locations(document, "urlset", "url")
                verify_owner_pages(urls, owner)
                if pages.intersection(urls):
                    raise ValueError("Duplicate URL across owner shards")
                pages.update(urls)
            if len(pages) > 50000:
                raise ValueError("Owner URL budget exceeded")
        if not pages:
            raise ValueError("Empty owner sitemap")
        sets[owner] = pages
    union = set()
    for owner, pages in sets.items():
        if union.intersection(pages):
            raise ValueError("Overlapping sitemap owners")
        union.update(pages)
    return {"documents": documents, "counts": {owner: len(pages) for owner, pages in sets.items()},
            "mainByLocale": dict(Counter(contract.canonical_path(url).split("/")[1] for url in sets["main"])),
            "unionCount": len(union), "owners": {owner: sorted(pages) for owner, pages in sets.items()}}


def compiled_documents(directory):
    documents = {}
    for path in directory.glob("cache/*/route-cache/APP_ROUTE/*/$/**/sitemap.xml.cache"):
        key = "/" + str(path).split("/$/", 1)[1].removesuffix(".cache")
        if key in ("/sitemap.xml", contract.MAIN):
            if key in documents:
                raise ValueError("Ambiguous compiled XML cache")
            data = json.loads(path.read_text())
            if data.get("type") != "route" or data.get("meta", {}).get("status") != 200:
                raise ValueError("Invalid compiled XML cache")
            documents[key] = data["body"]
    if len(documents) != 2:
        raise ValueError("Missing compiled XML expectations")
    return contract.verify_documents(documents["/sitemap.xml"], documents[contract.MAIN])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("environment", choices=["local", *ORIGINS])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    expected = compiled_documents(ROOT / "apps/web/.open-next")
    coverage = main_fallback_coverage(expected["mainUrls"], json.loads((ROOT / "packages/data/games/nte/raw-materials.json").read_text()))
    precheck = {"schemaVersion": 1, "status": coverage["status"], "environment": args.environment, "cloudRequestsPerformed": False, "fallbackCoverage": coverage}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(precheck, ensure_ascii=False, indent=2) + "\n")
    if coverage["missingCount"]:
        raise ValueError(f"Publication blocked: {coverage['missingCount']} Main-owned NTE item URLs missing; repair route-level ownership before deployment")
    if args.environment == "local":
        print(json.dumps(precheck, indent=2))
        return
    origin = ORIGINS[args.environment]
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), contract.NoRedirect())
    observations = []

    def get(path, target=contract.PUBLIC):
        contract.canonical_path(contract.PUBLIC + path)
        if not (path == "/sitemap.xml" or path.startswith("/sitemaps/")) or not path.endswith(".xml"):
            raise ValueError("Not a sitemap path")
        request = urllib.request.Request(target + path, headers={"User-Agent": "GachiaReleaseAudit/1.0"})
        with opener.open(request, timeout=30) as response:
            if response.status != 200 or response.headers.get_content_type() not in ("application/xml", "text/xml"):
                raise ValueError("Expected HTTP 200 XML")
            if target == ORIGINS["staging"] and "noindex" not in response.headers.get("x-robots-tag", ""):
                raise ValueError("Staging XML must be noindex")
            if target == contract.PUBLIC and "noindex" in response.headers.get("x-robots-tag", ""):
                raise ValueError("Production XML must not be noindex")
            payload = response.read(10 * 1024 * 1024 + 1)
            if len(payload) > 10 * 1024 * 1024:
                raise ValueError("XML byte budget exceeded")
            observations.append({"origin": target, "path": path, "status": response.status})
            return payload.decode("utf-8")

    try:
        precheck["cloudRequestsPerformed"] = True
        index, main_xml = get("/sitemap.xml", origin), get(contract.MAIN, origin)
        actual = contract.verify_documents(index, main_xml)
        if set(actual["children"]) != set(expected["children"]) or set(actual["mainUrls"]) != set(expected["mainUrls"]):
            raise ValueError("Published Main sitemap differs from the sealed artifact")
        graph = verify_graph(index, main_xml, get)
    except Exception as error:
        failure = {**precheck, "status": "failed", "error": str(error), "observations": observations}
        args.output.write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n")
        raise
    report = {"schemaVersion": 1, "status": "published_xml_graph_verified", "environment": args.environment,
              "mainOrigin": origin, "dedicatedOwnerOrigin": contract.PUBLIC, "mainArtifactEqual": True, "cloudRequestsPerformed": True,
              "fallbackCoverage": coverage, "observations": observations, **graph}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key not in ("owners", "observations")}, indent=2))


if __name__ == "__main__":
    main()
