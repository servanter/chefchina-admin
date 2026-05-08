import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function fullVerify() {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      titleZh: true,
      titleEn: true,
      calories: true,
      protein: true,
      fat: true,
      carbs: true,
    },
  })

  const total = recipes.length
  const complete = recipes.filter(r => 
    r.calories > 0 && r.protein > 0 && r.fat > 0 && r.carbs > 0
  )
  const incomplete = recipes.filter(r => 
    !r.calories || !r.protein || !r.fat || !r.carbs ||
    r.calories <= 0 || r.protein <= 0 || r.fat <= 0 || r.carbs <= 0
  )

  console.log(`\n📊 营养数据完整性统计:`)
  console.log(`总菜谱数: ${total}`)
  console.log(`营养数据完整: ${complete.length}/${total} (${(complete.length/total*100).toFixed(1)}%)`)
  console.log(`缺失数据: ${incomplete.length}\n`)

  if (incomplete.length > 0) {
    console.log('⚠️ 缺失营养数据的菜谱:')
    incomplete.forEach(r => {
      console.log(`  - ${r.titleZh || r.titleEn} (${r.id}): cal=${r.calories}, pro=${r.protein}, fat=${r.fat}, carb=${r.carbs}`)
    })
  } else {
    console.log('✅ 100% 完整!')
  }
}

fullVerify()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
