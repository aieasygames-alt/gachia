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
