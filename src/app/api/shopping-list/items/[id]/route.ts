/**
 * PATCH /api/shopping-list/items/:id
 * 更新食材（勾选/修改数量）
 * 
 * DELETE /api/shopping-list/items/:id
 * 删除单个食材
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;
    const userId = auth.sub;
    const { id } = await params;
    const body = await req.json();

    // 验证该食材是否属于当前用户
    const existing = await prisma.shoppingListItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 更新字段
    const updateData: any = {};
    if (body.checked !== undefined) {
      updateData.checked = body.checked;
    }
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
    }
    if (body.unit !== undefined) {
      updateData.unit = body.unit;
    }

    const item = await prisma.shoppingListItem.update({
      where: { id },
      data: updateData,
    });

    console.log(`✏️ 更新食材：${item.name} ${item.amount}${item.unit} (checked: ${item.checked})`);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error('❌ PATCH /api/shopping-list/items/:id 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;
    const userId = auth.sub;
    const { id } = await params;

    // 验证该食材是否属于当前用户
    const existing = await prisma.shoppingListItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 删除食材
    await prisma.shoppingListItem.delete({
      where: { id },
    });

    console.log(`🗑️ 删除食材：${existing.name}`);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/shopping-list/items/:id 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
