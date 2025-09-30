#!/bin/sh

# Migration runner script for Docker
# This script runs database migrations before starting the application

set -e

echo "Starting Vezlo Server with Database Migrations..."

# Wait for database to be ready (optional)
echo "Waiting for database connection..."
sleep 2

# Run migrations
echo "Running database migrations..."
npm run migrate:latest

# Start the application
echo "Starting Vezlo Server..."
exec "$@"

