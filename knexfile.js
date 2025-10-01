"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const config = {
    development: {
        client: 'postgresql',
        connection: {
            host: process.env.SUPABASE_DB_HOST || 'localhost',
            port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
            database: process.env.SUPABASE_DB_NAME || 'postgres',
            user: process.env.SUPABASE_DB_USER || 'postgres',
            password: process.env.SUPABASE_DB_PASSWORD || '',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations',
            extension: 'ts'
        },
        seeds: {
            directory: './src/seeds',
            extension: 'ts'
        }
    },
    production: {
        client: 'postgresql',
        connection: {
            host: process.env.SUPABASE_DB_HOST || 'localhost',
            port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
            database: process.env.SUPABASE_DB_NAME || 'postgres',
            user: process.env.SUPABASE_DB_USER || 'postgres',
            password: process.env.SUPABASE_DB_PASSWORD || '',
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 2,
            max: 20
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations',
            extension: 'ts'
        },
        seeds: {
            directory: './src/seeds',
            extension: 'ts'
        }
    },
    // For Supabase connection using connection string
    supabase: {
        client: 'postgresql',
        connection: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || {
            host: process.env.SUPABASE_DB_HOST || 'localhost',
            port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
            database: process.env.SUPABASE_DB_NAME || 'postgres',
            user: process.env.SUPABASE_DB_USER || 'postgres',
            password: process.env.SUPABASE_DB_PASSWORD || '',
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations',
            extension: 'ts'
        },
        seeds: {
            directory: './src/seeds',
            extension: 'ts'
        }
    }
};
exports.default = config;
//# sourceMappingURL=knexfile.js.map