# PostgreSQL Conventions

Guidelines for schema design and migrations in slopcollector, based on "Mastering PostgreSQL" (Supabase/Manning).

## Timestamps

- Use `TIMESTAMPTZ` (timestamp with time zone) for all timestamp columns.
- Avoid `TIMESTAMP WITHOUT TIME ZONE` — it causes time arithmetic errors across time zones and DST.
- Examples: `created_at`, `updated_at`, `applied_at`, `last_synced_at`.

## Text Types

- Use `TEXT` for string columns. Do not use `VARCHAR(n)` or `CHAR(n)`.
- `TEXT` has no storage penalty and avoids length-limit pitfalls.
- If you need to enforce length, use a `CHECK` constraint or `CREATE DOMAIN`.

## Numeric / Money

- Use `NUMERIC` (or `DECIMAL`) for monetary values. Store currency in a separate column.
- Avoid `MONEY` — it does not store currency and has rounding/accuracy issues.
- Never use `REAL` or `DOUBLE PRECISION` for money.

## Identity / Serial

- Use `GENERATED ALWAYS AS IDENTITY` instead of `SERIAL` or `BIGSERIAL`.
- Identity columns avoid sequence permission issues and `CREATE TABLE ... LIKE` pitfalls.

## Time-Only

- Avoid `TIME WITH TIME ZONE` (TIMETZ). Use `TIMESTAMPTZ` and extract time if needed.
- Time without date has no meaning for time zone handling.

## Full-Text Search

- Use `tsvector` for searchable text columns.
- Store lexemes with `to_tsvector('english', coalesce(col, ''))`.
- Prefer GIN indexes for full-text search.
- Use `plainto_tsquery` for user input; `to_tsquery` for advanced filters (AND/OR/NOT).

## Indexes

- B-tree: equality, ordering, range queries.
- GIN: full-text search, JSONB containment.
- GiST: geometric, range types, lossy full-text when index size matters.
- BRIN: very large tables with ordered data (e.g. timestamps).

## Partitioning

- Use declarative partitioning for large tables.
- Prefer partitioning by time (RANGE) or list (LIST).
- Sub-partitioning: partition by month, then partition each month by branch_id.
