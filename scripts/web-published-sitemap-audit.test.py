import importlib.util
from pathlib import Path
import tempfile
import json
import unittest

spec = importlib.util.spec_from_file_location("published", Path(__file__).with_name("web-published-sitemap-audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def xml(root, entry, paths):
    children = "".join(f"<{entry}><loc>https://gachia.com{path}</loc></{entry}>" for path in paths)
    return f'<{root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{children}</{root}>'


class PublishedSitemapTests(unittest.TestCase):
    def test_main_owned_item_details_cannot_disappear_with_whole_game_filtering(self):
        records = [{"id": "annulith"}, {"id": "fons"}]
        result = audit.main_fallback_coverage([], records)
        self.assertEqual(result["status"], "blocked_main_owned_urls_missing")
        self.assertEqual(result["missingCount"], 6)
        self.assertEqual(audit.main_fallback_coverage(result["missing"], records)["missingCount"], 0)
        for bad in [[], [{"id": "../other"}], [{"id": "a"}, {"id": "a"}]]:
            with self.assertRaises(ValueError):
                audit.main_fallback_coverage([], bad)

    def setUp(self):
        self.owners = ["genshin", "nte", "azur-promilia", "lvmeng"]
        self.index = xml("sitemapindex", "sitemap", [audit.contract.MAIN] + [f"/sitemaps/{owner}/index.xml" for owner in self.owners])
        self.main = xml("urlset", "url", ["/zh", "/en/roco/guides"])
        self.documents = {f"/sitemaps/{owner}/index.xml": xml("urlset", "url", [f"/zh/{owner}"]) for owner in self.owners}

    def test_complete_disjoint_union_with_nested_index(self):
        self.documents["/sitemaps/nte/index.xml"] = xml("sitemapindex", "sitemap", ["/sitemaps/nte/zh.xml"])
        self.documents["/sitemaps/nte/zh.xml"] = xml("urlset", "url", ["/zh/nte"])
        result = audit.verify_graph(self.index, self.main, self.documents.__getitem__)
        self.assertEqual(result["unionCount"], 6)
        self.assertEqual(result["documents"], 7)

    def test_rejects_cross_owner_or_external_shards_and_cycles(self):
        for reference in ["/sitemaps/genshin/index.xml", "/sitemaps/nte/index.xml", "/zh/nte", "/sitemaps/nte/%2e%2e/other.xml"]:
            documents = {**self.documents, "/sitemaps/nte/index.xml": xml("sitemapindex", "sitemap", [reference])}
            with self.assertRaises(ValueError):
                audit.verify_graph(self.index, self.main, documents.__getitem__)

    def test_rejects_wrong_page_owner_unknown_owner_and_duplicates(self):
        for paths in [["/en/roco"], ["/zh/nte", "/zh/nte"], ["/xx/nte"]]:
            documents = {**self.documents, "/sitemaps/nte/index.xml": xml("urlset", "url", paths)}
            with self.assertRaises(ValueError):
                audit.verify_graph(self.index, self.main, documents.__getitem__)
        with self.assertRaises(ValueError):
            audit.verify_graph(self.index.replace("lvmeng", "unknown"), self.main, self.documents.__getitem__)

    def test_rejects_dtd_and_preview_locations(self):
        for document in ["<!DOCTYPE urlset>" + self.documents["/sitemaps/nte/index.xml"], self.documents["/sitemaps/nte/index.xml"].replace("https://gachia.com", "https://preview.example")]:
            with self.assertRaises(ValueError):
                audit.verify_graph(self.index, self.main, {**self.documents, "/sitemaps/nte/index.xml": document}.__getitem__)

    def test_compiled_expectations_fail_closed_on_missing_or_ambiguous_caches(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError):
                audit.compiled_documents(root)
            for route, body in [("sitemap.xml", self.index), ("sitemaps/main/sitemap.xml", self.main)]:
                path = root / "cache/build/route-cache/APP_ROUTE/hash/$" / (route + ".cache")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps({"type": "route", "meta": {"status": 200}, "body": body}))
            self.assertEqual(len(audit.compiled_documents(root)["mainUrls"]), 2)
            duplicate = root / "cache/other/route-cache/APP_ROUTE/hash/$/sitemap.xml.cache"
            duplicate.parent.mkdir(parents=True)
            duplicate.write_text(json.dumps({"type": "route", "meta": {"status": 200}, "body": self.index}))
            with self.assertRaisesRegex(ValueError, "Ambiguous"):
                audit.compiled_documents(root)


if __name__ == "__main__":
    unittest.main()
