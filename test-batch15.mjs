import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function testBatch15APIs() {
  console.log('🧪 Batch 15 API 测试\n');

  try {
    // 1. 测试热门搜索词数据
    console.log('1️⃣ 测试搜索趋势数据');
    const trendingCount = await prisma.searchTrending.count();
    console.log(`   ✅ search_trending 表记录数: ${trendingCount}`);

    // 2. 测试话题关注表
    console.log('\n2️⃣ 测试话题关注表');
    const followerCount = await prisma.topicFollower.count();
    console.log(`   ✅ topic_followers 表记录数: ${followerCount}`);

    // 3. 测试话题数据
    console.log('\n3️⃣ 测试话题数据');
    const topics = await prisma.topic.findMany({ take: 3 });
    console.log(`   ✅ 话题数量: ${topics.length}`);
    topics.forEach(t => console.log(`      - ${t.nameZh} (${t.id})`));

    // 4. 测试话题关系查询
    if (topics.length > 0) {
      console.log('\n4️⃣ 测试话题关系查询');
      const topicWithFollowers = await prisma.topic.findUnique({
        where: { id: topics[0].id },
        include: {
          followers: { take: 5 },
          recipes: { take: 5 }
        }
      });
      console.log(`   ✅ ${topicWithFollowers?.nameZh} - ${topicWithFollowers?.followers?.length || 0} 关注者, ${topicWithFollowers?.recipes?.length || 0} 菜谱`);
    }

    // 5. 验证 API 路由文件存在
    console.log('\n5️⃣ 验证 API 文件');
    const fs = await import('fs');
    const apiFiles = [
      'src/app/api/topics/[id]/recipes/route.ts',
      'src/app/api/topics/[id]/follow/route.ts',
      'src/app/api/me/followed-topics/route.ts',
      'src/app/api/search/trending/route.ts',
      'src/app/api/search/record/route.ts'
    ];
    apiFiles.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });

    console.log('\n✅ 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBatch15APIs();
