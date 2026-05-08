import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';

const DATABASE_URL = "postgres://postgres.mlzyxmndtertlwqbqfjr:qAOZSvpOuLF08Er1@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

async function resetAdminPassword() {
  const username = 'admin';
  const newPassword = 'admin123';
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ 数据库连接成功');
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('✅ 密码哈希生成成功');
    
    // 执行 SQL
    const result = await client.query(`
      INSERT INTO admin_users (id, username, "passwordHash", role, "createdAt", "updatedAt")
      VALUES (
        'admin_' || gen_random_uuid()::text,
        $1,
        $2,
        'ADMIN',
        NOW(),
        NOW()
      )
      ON CONFLICT (username)
      DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "updatedAt" = NOW()
      RETURNING id, username, role, "createdAt";
    `, [username, passwordHash]);
    
    console.log('✅ Admin 密码重置成功！');
    console.log('');
    console.log('='.repeat(50));
    console.log('用户名:', username);
    console.log('新密码:', newPassword);
    console.log('Admin ID:', result.rows[0].id);
    console.log('创建时间:', result.rows[0].created_at);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 重置失败:', error.message);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
