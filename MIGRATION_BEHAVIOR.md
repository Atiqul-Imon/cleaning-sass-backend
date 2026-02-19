# Database Migration Behavior in CI/CD

## Current Behavior

**Yes, migrations run on every push to `main` branch.**

However, this is **safe and recommended** for production deployments.

## How `prisma migrate deploy` Works

The command `npx prisma migrate deploy` is **idempotent**, meaning:

✅ **Safe to run multiple times** - It won't cause errors if run repeatedly  
✅ **Only applies new migrations** - It checks which migrations have already been applied  
✅ **No duplicate execution** - Already-applied migrations are skipped  
✅ **Production-ready** - This is the recommended approach for production

### What Happens:

1. **First deployment**: All pending migrations are applied
2. **Subsequent deployments with no new migrations**: Command succeeds, nothing changes
3. **Subsequent deployments with new migrations**: Only new migrations are applied

## Example Scenarios

### Scenario 1: No New Migrations

```bash
$ npx prisma migrate deploy
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
No pending migrations to apply.
```

✅ **Result**: No changes, deployment continues

### Scenario 2: New Migration Exists

```bash
$ npx prisma migrate deploy
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Applying migration `20240218_add_new_table`
Migration applied successfully.
```

✅ **Result**: New migration applied, deployment continues

### Scenario 3: Migration Already Applied

```bash
$ npx prisma migrate deploy
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Migration `20240218_add_new_table` already applied, skipping.
```

✅ **Result**: Migration skipped, deployment continues

## Why This Is Good Practice

1. **Automatic Updates**: New migrations are automatically applied
2. **No Manual Steps**: No need to remember to run migrations
3. **Consistency**: Database schema always matches code
4. **Safety**: Prisma tracks applied migrations, prevents duplicates
5. **Standard Practice**: This is how most production deployments work

## If You Want to Skip Migrations

If you want to skip migrations when there are no new ones (optional optimization), you could modify the workflow:

```yaml
# Check if there are pending migrations
PENDING_MIGRATIONS=$(docker run --rm \
  -e DATABASE_URL="$DATABASE_URL_VALUE" \
  -v $(pwd)/prisma:/app/prisma \
  -w /app \
  ${{ env.REGISTRY }}/$DOCKER_IMAGE_NAME:latest \
  sh -c "npx prisma migrate status" | grep -q "following migrations have not yet been applied" && echo "yes" || echo "no")

if [ "$PENDING_MIGRATIONS" == "yes" ]; then
  echo "🔄 Running database migrations..."
  # ... run migrations
else
  echo "✅ No pending migrations, skipping..."
fi
```

**However, this is NOT recommended** because:

- Adds complexity
- `migrate deploy` is already fast when there are no changes
- Risk of missing migrations if check fails
- Standard practice is to always run `migrate deploy`

## Best Practices

✅ **DO**: Always run `migrate deploy` in production deployments  
✅ **DO**: Use `migrate deploy` (not `migrate dev`) in production  
✅ **DO**: Test migrations locally before pushing  
✅ **DON'T**: Skip migrations to "save time"  
✅ **DON'T**: Run `migrate dev` in production (it can cause issues)

## Current Workflow

Your current workflow is **correct and follows best practices**:

```yaml
npx prisma migrate deploy
```

This will:

- ✅ Apply new migrations automatically
- ✅ Skip already-applied migrations
- ✅ Fail safely if there's an issue (deployment stops)
- ✅ Keep database schema in sync with code

## Summary

**Yes, migrations run on every push, and that's exactly what you want!**

The `prisma migrate deploy` command is designed to be safe to run repeatedly. It's the standard practice for production deployments and ensures your database schema always matches your code.
