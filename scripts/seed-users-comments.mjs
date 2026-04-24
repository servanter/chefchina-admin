/**
 * 种子脚本：插入测试用户 + 随机评论
 * 运行：node scripts/seed-users-comments.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

// ─── 测试用户 ──────────────────────────────────────────────────────────────────
const USERS = [
  { id: 'user_01', email: 'sarah.chen@example.com',   name: 'Sarah Chen',    avatar: 'https://i.pravatar.cc/150?img=1',  locale: 'en' },
  { id: 'user_02', email: 'mike.wang@example.com',    name: 'Mike Wang',     avatar: 'https://i.pravatar.cc/150?img=3',  locale: 'en' },
  { id: 'user_03', email: 'emma.liu@example.com',     name: 'Emma Liu',      avatar: 'https://i.pravatar.cc/150?img=5',  locale: 'zh' },
  { id: 'user_04', email: 'james.zhang@example.com',  name: 'James Zhang',   avatar: 'https://i.pravatar.cc/150?img=7',  locale: 'en' },
  { id: 'user_05', email: 'yuki.tanaka@example.com',  name: 'Yuki Tanaka',   avatar: 'https://i.pravatar.cc/150?img=9',  locale: 'en' },
  { id: 'user_06', email: 'li.mei@example.com',       name: '李梅',           avatar: 'https://i.pravatar.cc/150?img=11', locale: 'zh' },
  { id: 'user_07', email: 'david.kim@example.com',    name: 'David Kim',     avatar: 'https://i.pravatar.cc/150?img=13', locale: 'en' },
  { id: 'user_08', email: 'anna.petrov@example.com',  name: 'Anna Petrov',   avatar: 'https://i.pravatar.cc/150?img=15', locale: 'en' },
]

// ─── 每道菜的评论模版 ──────────────────────────────────────────────────────────
const COMMENT_POOL = {
  rec_01: [ // 宫保鸡丁
    { userId: 'user_01', content: 'Made this last night and it was incredible! The balance of spicy, sweet, and sour is perfect. I added extra peanuts.', rating: 5 },
    { userId: 'user_03', content: '正宗的宫保鸡丁味道！花椒的麻味恰到好处，下次我要多放点辣椒。', rating: 5 },
    { userId: 'user_05', content: 'This is my go-to Sichuan recipe now. The marinade step makes such a difference for the chicken texture.', rating: 4 },
    { userId: 'user_07', content: 'Great recipe! I substituted cashews for peanuts and it worked wonderfully.', rating: 4 },
  ],
  rec_02: [ // 红烧肉
    { userId: 'user_02', content: 'The melt-in-your-mouth texture is absolutely real. Took 90 mins but worth every second.', rating: 5 },
    { userId: 'user_06', content: '做出来的红烧肉色泽红亮，肥而不腻，比饭店的还好吃！冰糖炒糖色是关键。', rating: 5 },
    { userId: 'user_08', content: 'My whole family loved this. The rock sugar caramelization gives it such a deep flavor.', rating: 5 },
  ],
  rec_03: [ // 麻婆豆腐
    { userId: 'user_04', content: 'Authentic mapo tofu! The doubanjiang is key — don\'t skip it or substitute.', rating: 5 },
    { userId: 'user_06', content: '麻辣鲜烫，豆腐嫩滑，非常好吃！建议用郫县豆瓣酱，味道最正宗。', rating: 4 },
    { userId: 'user_01', content: 'I\'ve tried many versions and this is the most authentic. The blanching step keeps tofu perfectly tender.', rating: 4 },
  ],
  rec_05: [ // 小笼包
    { userId: 'user_05', content: 'The aspic jelly is the secret! First time making XLB at home and they came out with real soup inside.', rating: 5 },
    { userId: 'user_03', content: '小笼包包起来比想象中难，但蒸出来皮薄汤多，太有成就感了！', rating: 5 },
    { userId: 'user_02', content: 'Took me 2 tries to get the pleating right but totally worth it. Serve immediately!', rating: 4 },
  ],
  rec_06: [ // 回锅肉
    { userId: 'user_07', content: 'The double-cooking technique really works. Pork is perfectly tender with crispy edges.', rating: 4 },
    { userId: 'user_06', content: '回锅肉是我最爱的川菜之一，豆瓣酱炒出来的红油真的太香了！', rating: 5 },
  ],
  rec_07: [ // 鱼香肉丝
    { userId: 'user_08', content: 'No fish but all the fish flavor — so clever! The sauce combination is genius.', rating: 5 },
    { userId: 'user_04', content: 'Classic dish done perfectly. The wood ear mushrooms add great texture.', rating: 4 },
  ],
  rec_08: [ // 夫妻肺片
    { userId: 'user_01', content: 'The chili oil sauce is to die for. I put it on everything now.', rating: 5 },
    { userId: 'user_03', content: '红油调料太香了，牛肉和牛杂的搭配恰到好处，是道非常下饭的凉菜。', rating: 4 },
  ],
  rec_09: [ // 清蒸鱼
    { userId: 'user_02', content: 'So simple yet so elegant. The ginger and scallion oil finish is everything.', rating: 5 },
    { userId: 'user_05', content: 'Used sea bass and it was phenomenal. Light, fresh, and perfectly steamed.', rating: 5 },
  ],
  rec_10: [ // 叉烧肉
    { userId: 'user_07', content: 'Better than any Cantonese BBQ restaurant. The char siu marinade is spot on.', rating: 5 },
    { userId: 'user_06', content: '叉烧烤出来表皮焦糖化，里面嫩滑多汁，配白米饭太绝了！', rating: 5 },
  ],
  rec_11: [ // 广式云吞汤
    { userId: 'user_08', content: 'The shrimp and pork filling is perfectly seasoned. Clear soup is so comforting.', rating: 4 },
    { userId: 'user_03', content: '云吞皮薄馅足，汤头清甜鲜美，有种记忆中港式茶餐厅的味道。', rating: 5 },
  ],
  rec_12: [ // 蒸水蛋
    { userId: 'user_01', content: 'The silkiest egg dish I\'ve ever made. The water ratio tip is crucial!', rating: 5 },
    { userId: 'user_04', content: 'A childhood comfort food for me. This recipe nails the texture perfectly.', rating: 5 },
  ],
  rec_13: [ // 剁椒鱼头
    { userId: 'user_02', content: 'Incredibly flavorful. The fermented chili paste gives it a unique depth.', rating: 4 },
    { userId: 'user_06', content: '剁椒鱼头蒸出来的汤汁拌米饭太好吃了，辣度适中，鱼肉鲜嫩。', rating: 5 },
  ],
  rec_14: [ // 口水鸡
    { userId: 'user_05', content: 'The cold poaching technique keeps the chicken incredibly juicy. Sauce is addictive.', rating: 5 },
    { userId: 'user_07', content: 'Best cold chicken dish ever. I make the chili oil sauce extra for noodles too.', rating: 5 },
  ],
  rec_15: [ // 北京烤鸭
    { userId: 'user_08', content: 'An ambitious recipe but the result is stunning. Air-drying step makes the skin ultra-crispy.', rating: 5 },
    { userId: 'user_03', content: '在家做烤鸭比想象中难，但成品皮脆肉嫩，配荷叶饼真的太满足了！', rating: 4 },
  ],
  rec_16: [ // 猪肉白菜饺子
    { userId: 'user_01', content: 'Made 80 dumplings with family and froze half. Filling is perfectly balanced.', rating: 5 },
    { userId: 'user_04', content: '包饺子是最有年味的事，这个配方皮薄馅大，煮出来不破皮。', rating: 5 },
  ],
  rec_17: [ // 酸辣汤
    { userId: 'user_02', content: 'Perfect for cold days. The vinegar and pepper balance is exactly right.', rating: 4 },
    { userId: 'user_06', content: '酸辣开胃，暖胃又好喝，木耳和豆腐的搭配很经典。', rating: 4 },
  ],
  rec_18: [ // 葱油饼
    { userId: 'user_05', content: 'The laminating technique creates those amazing flaky layers. So satisfying to make.', rating: 5 },
    { userId: 'user_07', content: 'Crispy outside, chewy inside, loaded with scallion flavor. Addictive.', rating: 5 },
  ],
  rec_19: [ // 虾饺
    { userId: 'user_08', content: 'Crystal skin is tricky but achievable! The shrimp filling is sweet and snappy.', rating: 4 },
    { userId: 'user_03', content: '虾饺皮的透明度做出来很有成就感，虾馅弹牙鲜甜，比茶楼差一点但很接近了。', rating: 4 },
  ],
  rec_20: [ // 港式蛋挞
    { userId: 'user_01', content: 'The custard is silky smooth and the pastry is perfectly flaky. Better than bakery ones!', rating: 5 },
    { userId: 'user_04', content: '蛋挞皮酥脆，蛋液嫩滑，烤出来香味扑鼻，家里人抢着吃。', rating: 5 },
  ],
  rec_21: [ // 红烧牛肉面
    { userId: 'user_02', content: 'The broth is incredibly rich after 3 hours of simmering. This is serious comfort food.', rating: 5 },
    { userId: 'user_06', content: '红烧牛肉面的汤头浓郁鲜香，牛肉炖得软烂，冬天来一碗太满足了。', rating: 5 },
  ],
  rec_22: [ // 扬州炒饭
    { userId: 'user_05', content: 'Using day-old rice really makes the difference. Every grain is perfectly coated.', rating: 4 },
    { userId: 'user_07', content: 'Classic fried rice done right. The ham and egg combination is timeless.', rating: 4 },
  ],
  rec_23: [ // 担担面
    { userId: 'user_08', content: 'The sesame paste sauce is incredible. Spicy, nutty, and deeply satisfying.', rating: 5 },
    { userId: 'user_03', content: '担担面的芝麻酱香、麻辣烫，面条劲道，是我最喜欢的街头小吃之一。', rating: 5 },
  ],
  rec_24: [ // 过桥米线
    { userId: 'user_01', content: 'The tableside cooking experience is so fun. Broth needs to be boiling hot!', rating: 4 },
    { userId: 'user_04', content: '过桥米线的汤底鲜美，配料丰富，自己在家做有种仪式感。', rating: 4 },
  ],
  rec_25: [ // 莲藕排骨汤
    { userId: 'user_02', content: 'So nourishing and delicious. The lotus root gets perfectly tender after 2 hours.', rating: 5 },
    { userId: 'user_06', content: '莲藕排骨汤清甜滋润，莲藕粉糯，排骨鲜嫩，是最经典的家常靓汤。', rating: 5 },
  ],
}

async function main() {
  console.log('🌱 开始插入用户数据...')

  // 插入用户（upsert 避免重复）
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, avatar: user.avatar },
      create: user,
    })
    console.log(`  ✅ 用户: ${user.name}`)
  }

  console.log('\n🌱 开始插入评论数据...')

  let totalComments = 0
  for (const [recipeId, comments] of Object.entries(COMMENT_POOL)) {
    for (const comment of comments) {
      // 检查是否已存在（避免重复插入）
      const exists = await prisma.comment.findFirst({
        where: { recipeId, userId: comment.userId, content: comment.content },
      })
      if (exists) {
        console.log(`  ⏭️  已存在，跳过: ${recipeId} - ${comment.userId}`)
        continue
      }

      await prisma.comment.create({
        data: {
          recipeId,
          userId: comment.userId,
          content: comment.content,
          rating: comment.rating,
          isVisible: true,
        },
      })
      totalComments++
      console.log(`  ✅ 评论: ${recipeId} ← ${comment.userId} (${comment.rating}⭐)`)
    }
  }

  console.log(`\n✨ 完成！共插入 ${USERS.length} 个用户，${totalComments} 条评论`)
}

main()
  .catch((e) => { console.error('❌ 错误:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
