import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = "postgres://postgres.mlzyxmndtertlwqbqfjr:qAOZSvpOuLF08Er1@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

async function checkSchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // 查看表结构
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_users'
      ORDER BY ordinal_position;
    `);
    
    console.log('admin_users 表结构：');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
