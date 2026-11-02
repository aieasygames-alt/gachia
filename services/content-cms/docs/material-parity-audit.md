# Material page parity audit

`auditMaterialParity` compares an explicit expected route set with a separately
observed application manifest. It reports missing/extra routes and owner drift,
then independently reports metadata, search and sitemap evidence. A complete
route set is not treated as SEO or page-content parity.

The observed manifest is an input from an authorized local probe; this module
does not render Next pages, call HTTP, inspect RSC, query search indexes or read
sitemaps. Boolean consumer fields must be backed by separate evidence. No
fallback route is inferred, and no extra route is silently ignored.

The result remains non-publishable and release-incompatible. It is intended to
be composed into a future typed snapshot only after page content, media, links,
metadata, search and sitemap probes are independently reproducible.
