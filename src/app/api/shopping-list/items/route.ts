/**
 * POST /api/shopping-list/items
 * 手动添加食材
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { name, amount, unit } = body;

    // 验证必填字段
    if (!name || amount === undefined || !unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, amount, unit' },
        { status: 400 }
      );
    }

    // 创建手动添加的食材
    const item = await prisma.shoppingListItem.create({
      data: {
        userId,
        name,
        amount: parseFloat(amount),
        unit,
        recipeIds: [], // 手动添加的食材没有关联菜谱
        checked: false,
        isManual: true,
      },
    });

    console.log(`➕ 手动添加食材：${name} ${amount}${unit}`);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error('❌ POST /api/shopping-list/items 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add item' },
      { status: 500 }
    );
  }
}
