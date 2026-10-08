# Deployment And GitHub Actions Budget

GitHub Actions minutes are a limited deployment resource for this repository.
Before pushing or manually running a workflow, follow these rules:

1. Run applicable local type checks, tests, builds, and configuration validation first. Do not use Actions to discover routine code or configuration errors.
2. Batch related implementation changes into one reviewed push and deployment when practical. Avoid repeated production runs for incremental edits.
3. Do not trigger a production workflow for documentation, planning, or observation-record-only changes. Keep those changes local or include them with a necessary functional deployment.
4. Run manual workflows only when they require Cloudflare credentials, production-only validation, routing changes, or an approved traffic switch.
5. Prefer local scripts and read-only GitHub or Cloudflare API checks for routine status checks; do not start Actions merely to inspect state.
6. Do not reduce required production safeguards to save minutes. For game routing work, preserve verification of public routes, sitemaps, static assets, SEO boundaries, and rollback behavior.
7. When Actions usage is near its monthly allowance, explicitly report the expected workflow cost/risk before starting non-essential runs and defer them when possible.
