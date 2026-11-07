# R76 Resident CMS Upgrade

Objective: install the R74 scalar JSON editorial fix while preserving the R75
resident database (2,880 content records), versions, media and published state.

This checkpoint contains the reviewed R74 code and R74/R75 documentation.
Installation requires exact-commit verification CI, an isolated built application,
a disposable PostgreSQL copy with full-row preservation checks and authenticated
scalar edit/review checks, and a cold backup before switching the resident app.

No new public content publication, automatic approval of imported drafts, cloud
deployment, or expanded production qualification is part of this upgrade.

Actual CI, staged application, isolated verification, installation and final
backup results will be recorded separately in this directory. This document
does not assert installation success in advance.
