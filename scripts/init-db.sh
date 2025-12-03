#!/bin/bash

# Initialize PostgreSQL database on Fly.io
# This script connects to the PostgreSQL database and creates the necessary database

set -e

echo "🔧 Initializing AI Governance Database..."

# Get database credentials from environment or command line
DB_HOST=${1:-"aigovernance-db.flycast"}
DB_PORT=${2:-"5432"}
DB_USER=${3:-"postgres"}
DB_PASSWORD=${4:-""}
DB_NAME="aigovernance_db"

echo "📍 Connecting to PostgreSQL at $DB_HOST:$DB_PORT..."

# Connect and create database
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "✅ Database '$DB_NAME' created successfully!"
echo "✅ Database initialization complete!"
