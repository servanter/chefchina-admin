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
  trending_type VARCHAR(20), -- 'hot' | 'rising' | 'new'
  hour_window TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trending_hour ON search_trending(hour_window, score DESC);
