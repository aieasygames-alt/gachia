#!/bin/sh
set -eu
# Runs only on a new volume. The application never receives the superuser secret.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_password="$CMS_DB_PASSWORD" <<'SQL'
CREATE ROLE cms_editor WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
ALTER DATABASE cms_editor OWNER TO cms_editor;
ALTER SCHEMA public OWNER TO cms_editor;
SQL
