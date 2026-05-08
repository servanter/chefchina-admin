#!/usr/bin/env node
/**
 * 测试健康档案 API
 * 
 * 使用方法：
 * 1. 先启动 dev server: npm run dev
 * 2. 运行测试: node scripts/test-health-api.mjs
 */

const BASE_URL = 'http://localhost:3001'

// 测试用 token（需要替换为真实的）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJpYXQiOjE3MTU2NTY4MDB9.test'

async function testHealthProfile() {
  console.log('📊 测试健康档案 API\n')

  try {
    // 1. 保存健康档案
    console.log('1️⃣ POST /api/health/profile')
    const saveRes = await fetch(`${BASE_URL}/api/health/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        goal: 'weight_loss',
        dailyCalories: 1500,
        proteinPercent: 30,
        fatPercent: 25,
        carbsPercent: 45,
        sodiumLimit: 2000,
        restrictions: ['low_sodium'],
      }),
    })
    const saveData = await saveRes.json()
    console.log('   ✅ Response:', JSON.stringify(saveData, null, 2))
    console.log()

    // 2. 获取健康档案
    console.log('2️⃣ GET /api/health/profile')
    const getRes = await fetch(`${BASE_URL}/api/health/profile`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    })
    const getData = await getRes.json()
    console.log('   ✅ Response:', JSON.stringify(getData, null, 2))
    console.log()

    // 3. 记录摄入（需要一个真实的 recipeId）
    console.log('3️⃣ POST /api/health/intake (需要真实 recipeId)')
    console.log('   ⚠️ 跳过测试（需要数据库中的真实菜谱）')
    console.log()

    // 4. 获取每日统计
    console.log('4️⃣ GET /api/health/daily')
    const dailyRes = await fetch(`${BASE_URL}/api/health/daily`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    })
    const dailyData = await dailyRes.json()
    console.log('   ✅ Response:', JSON.stringify(dailyData, null, 2))
    console.log()

    // 5. 获取周报告
    console.log('5️⃣ GET /api/health/report')
    const reportRes = await fetch(`${BASE_URL}/api/health/report`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    })
    const reportData = await reportRes.json()
    console.log('   ✅ Response:', JSON.stringify(reportData, null, 2))
    console.log()

    console.log('✅ 所有测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testHealthProfile()
