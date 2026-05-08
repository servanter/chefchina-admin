#!/bin/bash

# 数据库连接字符串
DATABASE_URL="postgres://postgres.mlzyxmndtertlwqbqfjr:qAOZSvpOuLF08Er1@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 新密码
NEW_PASSWORD="admin123"

# 使用 Node.js 生成 bcrypt hash
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$NEW_PASSWORD', 10).then(h => console.log(h));")

echo "生成的密码哈希: $HASH"
echo ""
echo "执行 SQL..."

# 执行 SQL（使用 psql 或 Node.js）
cat << EOF | psql "$DATABASE_URL"
-- 重置或创建 admin 用户
INSERT INTO admin_users (id, username, password_hash, role, created_at, updated_at)
VALUES (
  'admin_' || gen_random_uuid()::text,
  'admin',
  '$HASH',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- 查询结果
SELECT id, username, role, created_at FROM admin_users WHERE username = 'admin';
EOF

echo ""
echo "✅ 完成！"
echo "用户名: admin"
echo "密码: $NEW_PASSWORD"
