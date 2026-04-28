import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

const sql = `
-- REQ-14.6: 搜索历史记录
CREATE TABLE IF NOT EXISTS search_history (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  query VARCHAR(200) NOT NULL,
  result_count INT DEFAULT 0,
  clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);

-- REQ-14.7: 热门搜索词
CREATE TABLE IF NOT EXISTS search_trending (
  id VARCHAR(50) PRIMARY KEY,
  keyword VARCHAR(200) NOT NULL,
  search_count INT DEFAULT 0,
  click_rate DECIMAL(5, 2) DEFAULT 0,
  score DECIMAL(10, 2) DEFAULT 0,
  trending_type VARCHAR(20),
  hour_window TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trending_hour ON search_trending(hour_window, score DESC);

-- REQ-14.4: 话题关注表
CREATE TABLE IF NOT EXISTS topic_followers (
  topic_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (topic_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_topic_followers_topic ON topic_followers(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_followers_user ON topic_followers(user_id);
`;

async function migrate() {
  try {
    console.log('🚀 开始执行数据库迁移...');
    
    // 分别执行每条语句
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        await prisma.$executeRawUnsafe(stmt);
      }
    }
    
    console.log('✅ 数据库表创建成功！');
    
    // 验证表
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('search_history', 'search_trending', 'topic_followers')
    `;
    console.log('已创建的表:', result);
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
