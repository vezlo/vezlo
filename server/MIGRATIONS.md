# Database Migrations with Knex.js

This project uses Knex.js for database migrations, providing version control for your database schema.

## Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Database Configuration for Knex.js Migrations
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password

# Alternative: Use connection string
# DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 2. Install Dependencies

```bash
npm install
```

## Migration Commands

### Create a New Migration

```bash
npm run migrate:make migration_name
```

This creates a new migration file in `src/migrations/` with timestamp prefix.

### Run Migrations

```bash
# Run all pending migrations
npm run migrate:latest

# Run migrations in production
npm run migrate:prod
```

### Rollback Migrations

```bash
# Rollback the last batch of migrations
npm run migrate:rollback

# Rollback in production
npm run migrate:rollback:prod
```

### Check Migration Status

```bash
npm run migrate:status
```

### Run Individual Migrations

```bash
# Run next pending migration
npm run migrate:up

# Rollback last migration
npm run migrate:down
```

## How Migrations Work

### Migration Table

Knex.js creates a `knex_migrations` table to track which migrations have been run:

```sql
CREATE TABLE knex_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  batch INTEGER NOT NULL,
  migration_time TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration Files

Migration files are stored in `src/migrations/` and follow this pattern:

```
001_initial_schema.ts
002_add_user_email_index.ts
003_create_audit_logs.ts
```

Each migration file exports two functions:

```typescript
export async function up(knex: Knex): Promise<void> {
  // Forward migration - apply changes
}

export async function down(knex: Knex): Promise<void> {
  // Rollback migration - undo changes
}
```

### Migration Batches

- Migrations run in batches
- Each batch gets a unique batch number
- Rollback affects the entire last batch
- This ensures data consistency

## Docker Integration

The Docker setup automatically runs migrations on startup:

1. **Entrypoint Script**: `scripts/entrypoint.sh` runs migrations before starting the app
2. **Dockerfile**: Copies migration files and runs the entrypoint script
3. **Automatic**: Migrations run every time the container starts

## Best Practices

### 1. Always Write Rollback Functions

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
```

### 2. Use Transactions for Complex Migrations

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    await trx.schema.createTable('users', (table) => {
      table.increments('id');
      table.string('email');
    });
    
    await trx.schema.createTable('profiles', (table) => {
      table.increments('id');
      table.integer('user_id').references('id').inTable('users');
    });
  });
}
```

### 3. Test Migrations

```bash
# Test rollback
npm run migrate:rollback
npm run migrate:latest

# Check status
npm run migrate:status
```

### 4. Never Edit Existing Migrations

- Once a migration is run in production, never modify it
- Create new migrations for changes
- This maintains migration history integrity

## Troubleshooting

### Connection Issues

```bash
# Check database connection
npm run migrate:status
```

### Migration Conflicts

```bash
# Check current status
npm run migrate:status

# Force rollback if needed
npm run migrate:rollback -- --all
```

### Reset Database (Development Only)

```bash
# Drop all tables and re-run migrations
npm run migrate:rollback -- --all
npm run migrate:latest
```

## Production Deployment

### 1. Pre-deployment

```bash
# Test migrations locally
npm run migrate:latest
npm run migrate:rollback
npm run migrate:latest
```

### 2. Deployment

```bash
# Run migrations in production
npm run migrate:prod
```

### 3. Rollback (if needed)

```bash
# Rollback in production
npm run migrate:rollback:prod
```

## Migration Examples

### Adding a Column

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.string('phone').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('phone');
  });
}
```

### Creating an Index

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropIndex('email');
  });
}
```

### Adding Foreign Key

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('posts', (table) => {
    table.integer('user_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('posts', (table) => {
    table.dropForeign('user_id');
    table.dropColumn('user_id');
  });
}
```


