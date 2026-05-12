/**
 * GET /api/shopping-list
 * 获取用户的购物清单
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { mergeIngredients } from '@/lib/shoppingListMerger';

export async function GET(req: NextRequest) {
  try {
    // 认证检查
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;
    const userId = auth.sub;

    // 查询用户的购物清单
    let items = await prisma.shoppingListItem.findMany({
      where: { userId },
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });

    // 如果清单为空，首次自动生成
    if (items.length === 0) {
      console.log('📝 购物清单为空，自动生成...');

      // 查询用户收藏的菜谱
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      if (favorites.length > 0) {
        // 提取菜谱和食材
        const recipes = favorites.map((fav) => ({
          id: fav.recipe.id,
          ingredients: fav.recipe.ingredients.map((ing) => ({
            name: ing.nameZh,
            amount: ing.amount,
            unit: ing.unit || '',
          })),
        }));

        // 合并食材
        const merged = mergeIngredients(recipes);

        // 批量插入
        await prisma.shoppingListItem.createMany({
          data: merged.map((item) => ({
            userId,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            recipeIds: item.recipeIds,
            checked: item.checked,
            isManual: item.isManual,
          })),
        });

        // 重新查询
        items = await prisma.shoppingListItem.findMany({
          where: { userId },
          orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
        });

        console.log(`✅ 自动生成购物清单：${items.length} 项`);
      }
    }

    // 统计信息
    const totalItems = items.length;
    const checkedItems = items.filter((item) => item.checked).length;
    const lastUpdated = items.length > 0 ? items[0].updatedAt : new Date();

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalItems,
        checkedItems,
        lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('❌ GET /api/shopping-list 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shopping-list
 * 批量清空购物清单
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { clearAll = false, keepManual = false } = body;

    let where: any = { userId };

    if (!clearAll) {
      // 只清空已勾选的
      where.checked = true;
    }

    if (keepManual && !clearAll) {
      // 保留手动添加的（只删除非手动的）
      where.isManual = false;
    }

    const result = await prisma.shoppingListItem.deleteMany({ where });

    console.log(`🗑️ 清空购物清单：删除 ${result.count} 项`);

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/shopping-list 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear shopping list' },
      { status: 500 }
    );
  }
}
