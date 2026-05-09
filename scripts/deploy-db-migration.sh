#!/bin/bash

# Premium 订阅功能数据库迁移脚本
# 用于将本地 Prisma 迁移同步到云端数据库

set -e  # 遇到错误立即退出

echo "🚀 开始数据库迁移..."
echo "================================"

# 检查是否在正确的目录
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ 错误：未找到 prisma/schema.prisma"
    echo "请在 chefchina-admin 根目录下运行此脚本"
    exit 1
fi

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  警告：未找到 DATABASE_URL 环境变量"
    echo "从 .env 文件加载..."
    
    if [ -f ".env" ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
    else
        echo "❌ 错误：未找到 .env 文件"
        exit 1
    fi
fi

echo "📦 数据库连接：${DATABASE_URL:0:50}..."
echo ""

# 显示待执行的迁移
echo "📋 待执行的迁移："
npx prisma migrate status
echo ""

# 确认执行
read -p "❓ 是否继续执行迁移？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 0
fi

# 执行迁移
echo "🔄 执行 Prisma 迁移..."
npx prisma migrate deploy

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 验证迁移结果
echo ""
echo "✅ 迁移完成！"
echo "================================"
echo ""
echo "📊 验证数据库表："
npx prisma db execute --stdin <<SQL
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'payment_transactions')
ORDER BY table_name;
SQL

echo ""
echo "🎉 数据库迁移成功完成！"
