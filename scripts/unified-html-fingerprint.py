"""Parse generated HTML, excluding host-dependent framework script payloads."""
import json
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit


class Fingerprint(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.body = False
        self.bodies = 0
        self.ended = False
        self.skip = None
        self.raw = []
        self.title = None
        self.titles = []
        self.text = []
        self.headings = []
        self.heading = None
        self.canonicals = []
        self.metadata = []
        self.links = []
        self.media = []
        self.resources = []
        self.jsonld = []

    def handle_starttag(self, tag, attrs):
        keys = [key for key, _ in attrs]
        assert len(keys) == len(set(keys)), "Duplicate HTML attribute"
        attrs = dict(attrs)
        if self.skip:
            return
        if tag in ("script", "style"):
            if tag == "script" and "src" in attrs:
                self.resources.append([tag, sorted(attrs.items())])
            self.skip = (tag, attrs.get("type", "").lower() == "application/ld+json")
            self.raw = []
            return
        if tag == "body":
            assert not self.body and not self.ended, "Duplicate body"
            self.body = True
            self.bodies += 1
        elif tag == "title":
            assert self.title is None, "Nested title"
            self.title = []
        elif tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href"))
        elif tag in ("link", "base"):
            self.resources.append([tag, sorted(attrs.items())])
        elif tag == "meta":
            name = attrs.get("name", attrs.get("property", "")).lower()
            if name == "description" or name.startswith(("og:", "twitter:")):
                self.metadata.append([name, attrs.get("content")])
        if self.body:
            if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                assert self.heading is None, "Nested heading"
                self.heading = [tag, []]
            if tag == "a":
                self.links.append(sorted(attrs.items()))
            if tag in ("img", "source", "video", "audio", "iframe", "object", "embed"):
                self.media.append([tag, sorted(attrs.items())])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag in ("script", "style"):
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.skip:
            if tag == self.skip[0]:
                if self.skip[1]:
                    raw = "".join(self.raw)
                    assert "<" not in raw, "JSON-LD must escape raw-text delimiters"
                    self.jsonld.append(json.loads(raw))
                self.skip = None
            return
        if tag == "body":
            assert self.body, "Unexpected body end"
            self.body = False
            self.ended = True
        elif tag == "title":
            assert self.title is not None, "Unexpected title end"
            self.titles.append(" ".join("".join(self.title).split()))
            self.title = None
        elif self.heading and tag == self.heading[0]:
            self.headings.append([tag, " ".join("".join(self.heading[1]).split())])
            self.heading = None

    def handle_data(self, data):
        if self.skip:
            self.raw.append(data)
            return
        if self.title is not None:
            self.title.append(data)
        if self.body:
            self.text.append(data)
            if self.heading:
                self.heading[1].append(data)

    def result(self, status):
        assert self.bodies == 1 and self.ended and not self.body, "Missing/unclosed body"
        assert not self.skip and self.title is None and self.heading is None, "Unclosed document field"
        assert status in (200, 404), "Unreviewed HTML status"
        assert len(self.titles) == 1 and self.titles[0], "Missing/duplicate title"
        text = " ".join(" ".join(self.text).split())
        assert text, "Missing rendered text"
        if status == 200:
            assert len(self.canonicals) == 1, "Missing/duplicate canonical"
            canonical = urlsplit(self.canonicals[0])
            assert canonical.scheme == "https" and canonical.netloc == "gachia.com", "Non-production canonical"
            assert not canonical.query and not canonical.fragment, "Noncanonical URL"
            assert any(row[0] == "description" and row[1] for row in self.metadata), "Missing description"
        else:
            assert not self.canonicals and not self.jsonld, "Missing page retains canonical/structured data"
        return {"title": self.titles[0], "text": text, "headings": self.headings,
                "canonical": self.canonicals, "metadata": sorted(self.metadata),
                "links": self.links, "media": self.media, "resources": self.resources, "jsonld": self.jsonld}


def main():
    rows = json.load(sys.stdin)
    assert isinstance(rows, list) and 0 < len(rows) <= 2500, "Invalid HTML batch"
    results = []
    for row in rows:
        parser = Fingerprint()
        parser.feed(row["html"])
        parser.close()
        results.append(parser.result(row["status"]))
    json.dump(results, sys.stdout, ensure_ascii=True, separators=(",", ":"))


if __name__ == "__main__":
    main()
