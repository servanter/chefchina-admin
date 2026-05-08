import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function verifyNutritionData() {
  const recipes = await prisma.recipe.findMany({
    take: 10,
    select: {
      id: true,
      titleZh: true,
      titleEn: true,
      calories: true,
      protein: true,
      fat: true,
      carbs: true,
      fiber: true,
      sodium: true,
      sugar: true,
    },
  })

  console.log('✅ 前10个菜谱的营养数据:\n')
  recipes.forEach(r => {
    console.log(`📋 ${r.titleZh || r.titleEn}`)
    console.log(`   热量: ${r.calories}kcal | 蛋白质: ${r.protein}g | 脂肪: ${r.fat}g | 碳水: ${r.carbs}g`)
    console.log(`   膳食纤维: ${r.fiber}g | 钠: ${r.sodium}mg | 糖: ${r.sugar}g\n`)
  })
}

verifyNutritionData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
