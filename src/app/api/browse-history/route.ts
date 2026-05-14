import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { requireAuth, extractAuth } from '@/lib/auth-guard'

// POST /api/browse-history - 记录浏览历史
export async function POST(request: NextRequest) {
  try {
    // 鉴权：从 JWT token 获取 userId
    const auth = requireAuth(request)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { recipeId } = await request.json()

    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: 'recipeId is required' },
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
export async function GET(request: NextRequest) {
  try {
    // 鉴权：从 JWT token 获取 userId
    const auth = requireAuth(request)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

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
