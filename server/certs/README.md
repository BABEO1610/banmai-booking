# Supabase PostgreSQL CA certificates

`supabase-ca.pem` contains public production CA certificates obtained over HTTPS from the official Supabase CLI repository:

- [Production CA 2021](https://github.com/supabase/cli/blob/develop/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt)
- [Production CA 2025](https://github.com/supabase/cli/blob/develop/apps/cli-go/internal/gen/types/templates/prod-ca-2025.crt)

These are public trust certificates, not private keys or database credentials. The local database connection was checked with certificate and hostname verification enabled on 2026-09-16.

Use the Supabase Dashboard database certificate if the project's CA changes. Configure the PostgreSQL driver's root certificate explicitly; do not disable TLS verification. When using `pg` with a connection string, `sslrootcert` points to the PEM file and `sslmode=verify-full` enables verification. Encode reserved characters in URL parameters and passwords. If the workspace is moved, update the local environment's absolute certificate path.
