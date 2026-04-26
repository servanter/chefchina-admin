import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// POST /api/browse-history - 记录浏览历史
export async function POST(request: Request) {
  try {
    const { userId, recipeId } = await request.json()

    if (!userId || !recipeId) {
      return NextResponse.json(
        { success: false, error: 'userId and recipeId are required' },
        { status: 400 }
      )
    }

    // 使用 upsert 确保同一用户对同一菜谱只有一条记录（更新时间）
    const history = await prisma.browseHistory.upsert({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      },
      update: {
        createdAt: new Date()  // 更新浏览时间
      },
      create: {
        userId,
        recipeId
      }
    })

    return NextResponse.json(successResponse(history), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/browse-history - 获取用户浏览历史
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const history = await prisma.browseHistory.findMany({
      where: { userId },
      include: {
        recipe: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            category: {
              select: { id: true, nameEn: true, nameZh: true }
            },
            _count: {
              select: { likes: true, favorites: true, comments: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json(successResponse({ history }))
  } catch (error) {
    return handleError(error)
  }
}
