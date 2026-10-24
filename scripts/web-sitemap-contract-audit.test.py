import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("sitemap_audit", Path(__file__).with_name("web-sitemap-contract-audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def xml(root, entry, paths):
    children = "".join(f"<{entry}><loc>https://gachia.com{path}</loc></{entry}>" for path in paths)
    return f'<{root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{children}</{root}>'


class SitemapContractTests(unittest.TestCase):
    def setUp(self):
        self.index = xml("sitemapindex", "sitemap", [audit.MAIN, "/sitemaps/nte/index.xml"])
        self.pages = xml("urlset", "url", ["/zh", "/en/sea/guides/one"])

    def test_valid_index_and_disjoint_shard(self):
        result = audit.verify_documents(self.index, self.pages)
        self.assertEqual(result["dedicatedOwners"], ["nte"])
        self.assertEqual(len(result["mainUrls"]), 2)

    def test_old_urlset_is_not_an_index(self):
        with self.assertRaises(ValueError):
            audit.verify_documents(self.pages, self.pages)

    def test_namespace_is_required(self):
        with self.assertRaises(ValueError):
            audit.verify_documents(self.index.replace(' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', ''), self.pages)

    def test_protected_language_cannot_leak_through_main(self):
        with self.assertRaisesRegex(ValueError, "dedicated owner"):
            audit.verify_documents(self.index, xml("urlset", "url", ["/ja/nte/guides/untranslated"]))

    def test_only_approved_main_fallback_details_are_accepted(self):
        paths = [f"/{locale}/nte/items/annulith" for locale in ("zh", "en", "ja")]
        self.assertEqual(len(audit.verify_documents(self.index, xml("urlset", "url", paths))["mainUrls"]), 3)
        for path in ["/ja/nte/items", "/en/lvmeng", "/zh/nte/unknown/sample", "/ja/nte/items/annulith/extra", "/ja/nte/items/%61nnulith"]:
            with self.assertRaises(ValueError):
                audit.verify_documents(self.index, xml("urlset", "url", [path]))

    def test_main_fallback_removal_cannot_be_excused_as_a_dedicated_owner(self):
        result = audit.verify_documents(self.index, self.pages)
        with self.assertRaisesRegex(ValueError, "Unexplained removal"):
            audit.compare_before([{"url": "https://gachia.com/ja/nte/items/annulith"}], result)

    def test_legacy_dispatch_matrix_matches_typescript(self):
        paths = set()
        for game, rule in audit.ROUTE_GAMES.items():
            for locale in ("zh", "en", "ja", "fr"):
                paths.add(f"/{locale}/{game}")
                for section in set(rule["pages"] + rule["details"] + ["unknown"]):
                    for suffix in ("", "/sample", "/sample/extra"):
                        paths.add(f"/{locale}/{game}/{section}{suffix}")
            for prefix in ("_games", "sitemaps"):
                for suffix in ("", "/index.xml", "/nested/file"):
                    paths.add(f"/{prefix}/{game}{suffix}")
        matrix = "".join(f"{path}\t{audit.route_owner(path)}\n" for path in sorted(paths))
        self.assertEqual(audit.hashlib.sha256(matrix.encode()).hexdigest(), "6f4629fabf35c459f9518341c811c8337762fbd4505af0f82291f355259e08f3")

    def test_no_duplicates_or_preview_origins(self):
        for pages in [xml("urlset", "url", ["/zh", "/zh"]), self.pages.replace("https://gachia.com", "https://preview.workers.dev")]:
            with self.assertRaises(ValueError):
                audit.verify_documents(self.index, pages)

    def test_no_dtd_or_malformed_xml(self):
        for pages in ['<!DOCTYPE urlset>' + self.pages, '<urlset>']:
            with self.assertRaises((ValueError, audit.ET.ParseError)):
                audit.verify_documents(self.index, pages)

    def test_main_discovery_and_page_only_contract(self):
        for index, pages in [(xml("sitemapindex", "sitemap", ["/sitemaps/nte/index.xml"]), self.pages), (self.index, xml("urlset", "url", ["/sitemaps/nte/index.xml"]))]:
            with self.assertRaises(ValueError):
                audit.verify_documents(index, pages)

    def test_every_removed_url_requires_an_explanation(self):
        result = audit.verify_documents(self.index, self.pages)
        before = [{"url": f"https://gachia.com{path}"} for path in ["/zh", "/en/sea/guides/one", "/ja/nte", "/sitemaps/nte/index.xml"]]
        diff = audit.compare_before(before, result)
        self.assertEqual(diff["removedCounts"], {"dedicated-owner:nte": 1, "sitemap-reference-moved-to-index": 1})
        self.assertEqual(diff["added"], [])
        with self.assertRaisesRegex(ValueError, "Unexplained removal"):
            audit.compare_before(before + [{"url": "https://gachia.com/zh/sea/guides/lost"}], result)


if __name__ == "__main__":
    unittest.main()
