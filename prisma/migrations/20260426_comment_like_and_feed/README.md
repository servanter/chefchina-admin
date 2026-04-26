# Migration: Comment Like & Feed (Batch 11)

## 执行时间
2026-04-26

## 说明
本 migration 支持 Batch 11 的两个需求：
1. REQ-11.2: 评论点赞
2. REQ-11.5: 关注动态 Feed（依赖已有的 Follow 表，本次无需新表）

## 新增表
- `comment_likes`: 评论点赞关系表
  - `id`: 主键
  - `comment_id`: 评论 ID (外键 → comments)
  - `user_id`: 用户 ID (外键 → users)
  - `created_at`: 点赞时间
  - 唯一索引：`(user_id, comment_id)` 防止重复点赞

## 执行命令
```bash
cd /root/.openclaw/workspace/chefchina/chefchina-admin
npx prisma migrate dev --name comment_like_and_feed
npx prisma generate
```

## 注意事项
- Comment Like 表使用 SQLite 兼容的 TEXT 主键（生产环境用 cuid）
- Follow 表已在 Batch 5 创建，本次复用
- Feed API 通过 JOIN 查询 Recipe/Comment/Favorite 三张表合并返回
