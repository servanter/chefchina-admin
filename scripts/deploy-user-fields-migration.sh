#!/bin/bash
set -e

echo "🔍 Deploying user location and gender migration..."

# 从 .env 文件加载 DATABASE_URL
if [ -f .env ]; then
  export $(cat .env | grep -E '^DATABASE_URL=' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

echo "✅ DATABASE_URL loaded"

# 部署 migration
echo "📦 Running prisma migrate deploy..."
npx prisma migrate deploy

echo "✅ Migration deployed successfully!"
