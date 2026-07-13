# 8. Migration and Schema Lifecycle

## Tooling

Use Alembic with SQLAlchemy metadata.

## Connection rule

Run migrations through:

- Direct connection, or
- Session pooler

Do not run migrations through transaction pooling.

## Source of truth

Git migration files are the schema source of truth.

Avoid undocumented production changes through the Supabase dashboard.

## Workflow

1. Update conceptual model.
2. Create migration.
3. Review generated operations.
4. Test against a clean database.
5. Test upgrade from previous version.
6. Test downgrade when supported.
7. Apply to staging.
8. Verify application behavior.
9. Apply to production.
10. Record migration version.

## Safe deployment ordering

1. Add compatible structures.
2. Deploy compatible code.
3. Backfill in batches.
4. Enable new behavior.
5. Remove obsolete structures later.

## Dedicated schema

Consider a schema named:

```text
loadflow
```

Benefits:

- Clear ownership
- Easier privilege control
- Less conflict with Supabase-managed schemas
- Easier inspection

The later SQL design will decide between `public` and a dedicated schema.
