#!/bin/bash
export $(cat .env | grep DATABASE_URL | xargs)
echo "📊 查询订阅数据："
psql "$DATABASE_URL" -c 'SELECT id, "planType", status, "stripeCustomerId" FROM subscriptions ORDER BY "updatedAt" DESC LIMIT 5;'
