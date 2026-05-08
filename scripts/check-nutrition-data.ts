import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function checkNutritionData() {
  const total = await prisma.recipe.count()
  
  const incomplete = await prisma.recipe.count({
    where: {
      OR: [
        { calories: null },
        { protein: null },
        { fat: null },
        { carbs: null },
      ],
    },
  })

  console.log(`Total recipes: ${total}`)
  console.log(`Recipes with incomplete nutrition data: ${incomplete}`)
  console.log(`Completion rate: ${((total - incomplete) / total * 100).toFixed(1)}%`)
  
  // Sample some incomplete recipes
  const samples = await prisma.recipe.findMany({
    where: {
      OR: [
        { calories: null },
        { protein: null },
        { fat: null },
        { carbs: null },
      ],
    },
    take: 5,
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
  
  console.log('\nSample incomplete recipes:')
  samples.forEach(r => {
    console.log(`  ${r.titleZh || r.titleEn}: cal=${r.calories}, protein=${r.protein}, fat=${r.fat}, carbs=${r.carbs}`)
  })
}

checkNutritionData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
