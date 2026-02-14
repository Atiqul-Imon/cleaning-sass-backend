# Database Connection Pooling Optimization

## Overview
Prisma uses connection pooling to manage database connections efficiently. This document explains how to optimize connection pooling for better performance.

## Connection String Configuration

### For Supabase (Recommended)
If using Supabase, use the **pooler connection string** instead of the direct connection:

```
# Direct connection (NOT recommended for production)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Pooler connection (Recommended)
DATABASE_URL="postgresql://user:password@host:6543/dbname?pgbouncer=true"
```

### Connection Pool Parameters
Add these parameters to your connection string for optimal pooling:

```
DATABASE_URL="postgresql://user:password@host:6543/dbname?pgbouncer=true&connection_limit=10&pool_timeout=20"
```

### Parameters Explained:
- `connection_limit`: Maximum number of connections in the pool (default: 10)
  - For small apps: 5-10
  - For medium apps: 10-20
  - For large apps: 20-50
- `pool_timeout`: Timeout in seconds for getting a connection from the pool (default: 10)
- `pgbouncer=true`: Enable PgBouncer mode (required for Supabase pooler)

## Prisma Configuration

The PrismaService has been configured to:
- Use connection pooling automatically
- Log queries in development mode
- Handle connection lifecycle properly

## Monitoring

### Check Connection Pool Usage
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';
```

### Check Active Connections
```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

## Best Practices

1. **Use Pooler Connection**: Always use the pooler connection string in production
2. **Set Appropriate Limits**: Don't set connection_limit too high (wastes resources)
3. **Monitor Connections**: Regularly check connection pool usage
4. **Close Connections**: Prisma automatically manages connections, but ensure proper cleanup

## Supabase Specific

Supabase provides two connection strings:
1. **Direct Connection** (port 5432): For migrations and admin tasks
2. **Pooler Connection** (port 6543): For application use (recommended)

Always use the pooler connection (port 6543) for your application.


