"""Versioned Next streaming metadata semantics; the legacy parser stays frozen."""
import json
import runpy
import sys
from pathlib import Path


LegacyFingerprint = runpy.run_path(
    str(Path(__file__).with_name("unified-html-fingerprint.py"))
)["Fingerprint"]


class StreamingFingerprint(LegacyFingerprint):
    def __init__(self):
        super().__init__()
        self.language_links = []

    def handle_starttag(self, tag, attrs):
        skipped = self.skip is not None
        before = len(self.resources)
        super().handle_starttag(tag, attrs)
        attributes = dict(attrs)
        if not skipped and tag == "link" and "hreflang" in attributes:
            assert attributes["hreflang"], "Empty alternate language"
            assert "alternate" in attributes.get("rel", "").lower().split(), "Non-alternate hreflang"
            assert attributes.get("href"), "Missing alternate language URL"
            assert len(self.resources) == before + 1, "Ambiguous alternate language link"
            self.language_links.append(self.resources.pop())

    def handle_data(self, data):
        # A streamed title is document metadata, even when emitted in the body.
        # Its value is still compared independently by the strict legacy parser.
        if not self.skip and self.title is not None:
            self.title.append(data)
        else:
            super().handle_data(data)

    def result(self, status):
        result = super().result(status)
        result["languageLinks"] = sorted(self.language_links)
        return result


def main():
    rows = json.load(sys.stdin)
    assert isinstance(rows, list) and 0 < len(rows) <= 2500, "Invalid HTML batch"
    results = []
    for row in rows:
        parser = StreamingFingerprint()
        parser.feed(row["html"])
        parser.close()
        results.append(parser.result(row["status"]))
    json.dump(results, sys.stdout, ensure_ascii=True, separators=(",", ":"))


if __name__ == "__main__":
    main()
