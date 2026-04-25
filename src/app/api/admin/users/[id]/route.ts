import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/admin/users/[id] — Get user details with statistics
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        role: true,
        locale: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            recipes: true,
            comments: true,
            likes: true,
            favorites: true,
            following: true,
            followers: true,
          },
        },
      },
    })

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get recent activity
    const [recentRecipes, recentComments] = await Promise.all([
      prisma.recipe.findMany({
        where: { authorId: id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          titleEn: true,
          titleZh: true,
          coverImage: true,
          createdAt: true,
        },
      }),
      prisma.comment.findMany({
        where: { userId: id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          rating: true,
          createdAt: true,
          recipe: {
            select: {
              id: true,
              titleEn: true,
              titleZh: true,
            },
          },
        },
      }),
    ])

    return successResponse({
      user,
      recentRecipes,
      recentComments,
    })
  } catch (error) {
    return handleError(error)
  }
}
