import knex, { Knex } from 'knex';
import config from '../knexfile';

// Get the appropriate configuration based on environment
const getConfig = (): Knex.Config => {
  const env = process.env.NODE_ENV || 'development';
  
  // For Supabase, we can use the supabase config or fall back to environment-based config
  if (process.env.SUPABASE_URL) {
    return config.supabase;
  }
  
  return config[env] || config.development;
};

// Create Knex instance
const db: Knex = knex(getConfig());

// Export the Knex instance
export default db;

// Export types for use in other files
export type { Knex };

// Utility functions for migrations
export const runMigrations = async (): Promise<void> => {
  try {
    await db.migrate.latest();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const rollbackMigrations = async (): Promise<void> => {
  try {
    await db.migrate.rollback();
    console.log('✅ Database rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

export const getMigrationStatus = async (): Promise<number> => {
  try {
    const status = await db.migrate.status();
    return status;
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

