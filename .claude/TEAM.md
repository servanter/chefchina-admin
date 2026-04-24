# ChefChina 四角铁三角团队协作流程

这个项目用 4 个项目级 subagent 模拟敏捷团队，由**老板（你）拍板决策**，其他角色并行协作。

## 👥 团队成员

| Agent | 角色 | 何时用 |
|---|---|---|
| `chefchina-pm` | 产品经理 | 出基础功能需求池，供老板挑选 |
| `chefchina-dev` | 研发（新功能） | 按确认的需求清单落盘代码 |
| `chefchina-qa` | 测试 | 预备用例 / 研发交付后出 Bug 清单 |
| `chefchina-bugfixer` | 研发 2（Bug修） | 按 QA 清单修 Bug，不做新功能 |

## 🔁 标准流水线

```
① PM 出需求池（8-12 个）
     ↓
② 老板拍板（挑几个做）
     ↓
③ 研发 + 测试并行：
   - dev 开发中
   - qa 同时出用例+验收清单+风险预警
     ↓
④ 研发交付 → qa 对照用例跑回归，输出 Bug 清单（P0/P1/P2）
     ↓
⑤ 产品决策项（如"ADMIN 是否能跨用户访问"）→ 老板拍板
     ↓
⑥ bugfixer 按清单修复（不做新功能）
     ↓
⑦ qa 二次回归验证（只验修复点，不全量重测）
     ↓
⑧ 如全通过 → 等老板验收；否则回到 ⑥ 返工
```

## 💬 典型召唤用语

- "让 PM 出一轮基础功能需求" → 召唤 `chefchina-pm`
- "做 N+M+K" → 召唤 `chefchina-dev`（开发）+ `chefchina-qa`（并行预备用例）
- "跑回归" → 召唤 `chefchina-qa`
- "按 Bug 清单修" → 召唤 `chefchina-bugfixer`

## 🧑 老板的职责

**只做决策，不做执行**：
1. 选需求做什么（PM 出池子后）
2. 产品决策项拍板（如 ADMIN 特权、功能取舍）
3. 最终验收放行
4. DB migration / npm install 等运维命令的执行授权

## ⚙️ 项目权限配置

`.claude/settings.local.json` 已配置：
- `permissions.allow: ["Write", "Edit", "MultiEdit", ...]`（工具级全局允许）
- `permissions.defaultMode: "acceptEdits"`

**注意**：如果克隆到新电脑后子 Agent 仍被权限拦住，检查这两个配置是否跟着仓库迁移过来。

## 📂 项目架构速查

- **chefchina-admin**: Next.js 16 + Prisma + PostgreSQL（Supabase pooler）+ Redis（Upstash）
- **chefchina-app**: React Native + Expo SDK 54 + expo-router + React Query + i18next
- 数据模型：User / Recipe / Category / Tag / Comment / Like / Favorite / Notification / ShareLog / SearchLog / BrowseHistory
- API 响应统一格式：`{ success, data }` / `{ success: false, error }`
- 双语字段：`xxxEn` / `xxxZh`；i18n 键分布在 `src/locales/{en,zh}.json`

## 📜 已完成的需求

**第 1 批** ✅ 需求 1/3/9：通知鉴权 + 24h 去重 / 全局搜索+历史+热词 / 设置页（主题/字体/缓存/版本）
**第 2 批** ✅ 需求 11/12/15：图片懒加载+全屏查看器 / 下拉刷新+上拉加载+骨架屏 / 菜谱 meta 字段+相关推荐

完整需求池参考 PM Agent 历史输出或让 PM 出新一轮即可。
