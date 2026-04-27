#!/bin/bash

echo "========================================"
echo "ChefChina Admin 登录系统修复验证"
echo "========================================"
echo ""

cd /root/.openclaw/workspace/chefchina/chefchina-admin

echo "✓ 1. 检查 Prisma Schema"
if grep -q "model AdminUser" prisma/schema.prisma; then
  echo "   ✅ AdminUser 模型已添加"
else
  echo "   ❌ AdminUser 模型缺失"
fi

echo ""
echo "✓ 2. 检查 Migration SQL"
if [ -f "prisma/migrations/20260426211906_add_admin_users/migration.sql" ]; then
  echo "   ✅ Migration 文件已创建"
  if grep -q "CREATE TABLE \"admin_users\"" prisma/migrations/20260426211906_add_admin_users/migration.sql; then
    echo "   ✅ 包含创建表语句"
  fi
  if grep -q "INSERT INTO \"admin_users\"" prisma/migrations/20260426211906_add_admin_users/migration.sql; then
    echo "   ✅ 包含初始管理员账号"
  fi
else
  echo "   ❌ Migration 文件不存在"
fi

echo ""
echo "✓ 3. 检查登录 API"
if [ -f "src/app/api/auth/admin/login/route.ts" ]; then
  echo "   ✅ 登录 API 已创建"
  if grep -q "bcryptjs" src/app/api/auth/admin/login/route.ts; then
    echo "   ✅ 使用 bcrypt 验证密码"
  fi
  if grep -q "jsonwebtoken" src/app/api/auth/admin/login/route.ts; then
    echo "   ✅ 使用 JWT 生成 token"
  fi
else
  echo "   ❌ 登录 API 不存在"
fi

echo ""
echo "✓ 4. 检查独立登录页面"
if [ -f "src/app/login/layout.tsx" ]; then
  echo "   ✅ 独立 layout 已创建"
else
  echo "   ❌ 独立 layout 不存在"
fi

if [ -f "src/app/login/page.tsx" ]; then
  echo "   ✅ 登录页面已创建"
  if grep -q "/api/auth/admin/login" src/app/login/page.tsx; then
    echo "   ✅ 调用正确的 API"
  fi
  if grep -q "/dashboard" src/app/login/page.tsx; then
    echo "   ✅ 登录后跳转到 dashboard"
  fi
else
  echo "   ❌ 登录页面不存在"
fi

echo ""
echo "✓ 5. 检查 AuthContext"
if grep -q "/api/auth/admin/login" src/contexts/AuthContext.tsx; then
  echo "   ✅ AuthContext 调用真实 API"
else
  echo "   ❌ AuthContext 仍然使用硬编码"
fi

echo ""
echo "✓ 6. 检查 Prisma Client"
if grep -q "AdminUser" src/generated/prisma/index.d.ts; then
  echo "   ✅ Prisma Client 已生成 AdminUser 类型"
else
  echo "   ❌ Prisma Client 缺少 AdminUser 类型"
fi

echo ""
echo "✓ 7. 检查 Git 提交"
if git log -1 --oneline | grep -q "重新设计登录系统"; then
  echo "   ✅ 已提交到 Git"
  git log -1 --oneline
else
  echo "   ❌ 未提交到 Git"
fi

echo ""
echo "========================================"
echo "验证完成！"
echo "========================================"
echo ""
echo "📝 下一步："
echo "1. 执行 migration: npx prisma migrate deploy"
echo "2. 或手动执行 SQL 文件"
echo "3. 访问 /login 测试登录"
echo "   用户名: admin"
echo "   密码: 123456"
echo ""
