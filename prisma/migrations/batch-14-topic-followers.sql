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
