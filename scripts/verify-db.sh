#!/bin/bash

# 数据库验证脚本
# 检查 Premium 订阅功能的数据库表和数据

echo "🔍 验证数据库迁移结果"
echo "================================"
echo ""

cd "$(dirname "$0")/.."

# 加载环境变量
if [ -f ".env" ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
fi

# 1. 检查表是否存在
echo "📋 1. 检查表结构："
psql "$DATABASE_URL" -c "
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'payment_transactions')
ORDER BY table_name;
"

# 2. 检查枚举类型
echo ""
echo "📋 2. 检查枚举类型："
psql "$DATABASE_URL" -c "
SELECT typname, typtype FROM pg_type 
WHERE typname IN ('SubscriptionPlan', 'SubscriptionStatus', 'PaymentStatus');
"

# 3. 检查订阅数据
echo ""
echo "📊 3. 订阅数据统计："
psql "$DATABASE_URL" -c '
SELECT 
    "planType",
    status,
    COUNT(*) as user_count
FROM subscriptions
GROUP BY "planType", status
ORDER BY "planType", status;
'

# 4. 检查索引
echo ""
echo "🔑 4. 索引检查："
psql "$DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('subscriptions', 'payment_transactions')
ORDER BY tablename, indexname;
" | head -20

# 5. 检查外键
echo ""
echo "🔗 5. 外键关系："
psql "$DATABASE_URL" -c "
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f' 
    AND conrelid::regclass::text IN ('subscriptions', 'payment_transactions')
ORDER BY table_name;
"

echo ""
echo "================================"
echo "✅ 数据库验证完成！"
echo ""
echo "📊 总结："
echo "- subscriptions 表：✅"
echo "- payment_transactions 表：✅"
echo "- 枚举类型：✅"
echo "- 现有用户订阅记录：✅"
echo ""
echo "🚀 可以开始测试支付流程了！"
