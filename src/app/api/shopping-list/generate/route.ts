/**
 * POST /api/shopping-list/generate
 * 重新生成购物清单
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { mergeIngredients } from '@/lib/shoppingListMerger';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { recipeIds, keepManual = true } = body;

    console.log('🔄 重新生成购物清单...');

    // 1. 如果需要保留手动添加的食材
    let manualItems: any[] = [];
    if (keepManual) {
      manualItems = await prisma.shoppingListItem.findMany({
        where: { userId, isManual: true },
      });
      console.log(`📌 保留 ${manualItems.length} 个手动添加的食材`);
    }

    // 2. 删除所有非手动添加的食材
    const deleteResult = await prisma.shoppingListItem.deleteMany({
      where: { userId, isManual: false },
    });
    console.log(`🗑️ 删除 ${deleteResult.count} 个旧食材`);

    // 3. 查询用户收藏的菜谱
    let favorites;
    if (recipeIds && recipeIds.length > 0) {
      // 指定菜谱
      favorites = await prisma.favorite.findMany({
        where: { userId, recipeId: { in: recipeIds } },
        include: {
          recipe: {
            include: {
              ingredients: true,
            },
          },
        },
      });
    } else {
      // 所有收藏的菜谱
      favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              ingredients: true,
            },
          },
        },
      });
    }

    if (favorites.length === 0) {
      // 如果没有收藏菜谱，只恢复手动添加的食材
      if (manualItems.length > 0) {
        await prisma.shoppingListItem.createMany({
          data: manualItems.map((item) => ({
            userId,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            recipeIds: item.recipeIds,
            checked: item.checked,
            isManual: true,
          })),
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          message: '没有收藏的菜谱',
          items: manualItems,
        },
      });
    }

    // 4. 提取菜谱和食材
    const recipes = favorites.map((fav) => ({
      id: fav.recipe.id,
      ingredients: fav.recipe.ingredients.map((ing) => ({
        name: ing.nameZh,
        amount: ing.amount,
        unit: ing.unit || '',
      })),
    }));

    // 5. 调用合并算法
    const merged = mergeIngredients(recipes);

    // 6. 批量插入新食材
    await prisma.shoppingListItem.createMany({
      data: merged.map((item) => ({
        userId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        recipeIds: item.recipeIds,
        checked: false,
        isManual: false,
      })),
    });

    // 7. 恢复手动添加的食材
    if (manualItems.length > 0) {
      await prisma.shoppingListItem.createMany({
        data: manualItems.map((item) => ({
          userId,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          recipeIds: item.recipeIds,
          checked: item.checked,
          isManual: true,
        })),
      });
    }

    // 8. 查询最新清单
    const items = await prisma.shoppingListItem.findMany({
      where: { userId },
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });

    console.log(`✅ 重新生成购物清单：${items.length} 项`);

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalItems: items.length,
        checkedItems: items.filter((item) => item.checked).length,
      },
    });
  } catch (error: any) {
    console.error('❌ POST /api/shopping-list/generate 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate shopping list' },
      { status: 500 }
    );
  }
}
