import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function fillNutritionData() {
  console.log('开始填充营养数据...')

  // 查询营养数据为空的菜谱
  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { calories: null },
        { protein: null },
        { fat: null },
        { carbs: null },
      ],
    },
    select: {
      id: true,
      titleEn: true,
      titleZh: true,
      calories: true,
      protein: true,
      fat: true,
      carbs: true,
      fiber: true,
      sodium: true,
      sugar: true,
    },
  })

  console.log(`找到 ${recipes.length} 个需要填充的菜谱`)

  // 批量更新
  for (const recipe of recipes) {
    // 根据菜谱类型估算营养数据(这里使用简单的默认值)
    const defaultNutrition = estimateNutrition(recipe.titleZh || recipe.titleEn)

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        calories: recipe.calories ?? defaultNutrition.calories,
        protein: recipe.protein ?? defaultNutrition.protein,
        fat: recipe.fat ?? defaultNutrition.fat,
        carbs: recipe.carbs ?? defaultNutrition.carbs,
        fiber: recipe.fiber ?? defaultNutrition.fiber,
        sodium: recipe.sodium ?? defaultNutrition.sodium,
        sugar: recipe.sugar ?? defaultNutrition.sugar,
      },
    })

    console.log(`✅ 已更新: ${recipe.titleZh || recipe.titleEn}`)
  }

  console.log('✅ 营养数据填充完成!')
}

function estimateNutrition(title: string): {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
  sugar: number
} {
  // 根据关键词估算营养数据
  const keywords = {
    meat: ['鸡', '牛', '猪', '鱼', '虾', 'chicken', 'beef', 'pork', 'fish'],
    vegetable: ['菜', '豆', '蔬', 'vegetable', 'salad'],
    carb: ['饭', '面', '粥', 'rice', 'noodle', 'pasta'],
    soup: ['汤', 'soup'],
  }

  // 肉类 - 高蛋白
  if (keywords.meat.some(k => title.includes(k))) {
    return {
      calories: 200,
      protein: 25,
      fat: 8,
      carbs: 5,
      fiber: 1,
      sodium: 400,
      sugar: 2,
    }
  }

  // 蔬菜 - 低卡高纤维
  if (keywords.vegetable.some(k => title.includes(k))) {
    return {
      calories: 50,
      protein: 3,
      fat: 1,
      carbs: 10,
      fiber: 4,
      sodium: 150,
      sugar: 3,
    }
  }

  // 主食 - 高碳水
  if (keywords.carb.some(k => title.includes(k))) {
    return {
      calories: 150,
      protein: 4,
      fat: 1,
      carbs: 30,
      fiber: 2,
      sodium: 200,
      sugar: 1,
    }
  }

  // 汤类 - 低卡
  if (keywords.soup.some(k => title.includes(k))) {
    return {
      calories: 80,
      protein: 5,
      fat: 3,
      carbs: 8,
      fiber: 1,
      sodium: 600,
      sugar: 2,
    }
  }

  // 默认值(混合菜)
  return {
    calories: 150,
    protein: 10,
    fat: 5,
    carbs: 20,
    fiber: 2,
    sodium: 350,
    sugar: 3,
  }
}

fillNutritionData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
