import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { Prisma } from '../../../../../generated/prisma'

// Helper function to escape CSV fields
function escapeCSV(field: unknown): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper function to format date
function formatDate(date: Date | null): string {
  if (!date) return ''
  return date.toISOString()
}

// GET /api/admin/recipes/export — Export recipes to CSV
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)

    // Filter parameters
    const category = searchParams.get('category')?.trim()
    const status = searchParams.get('status')?.trim() // published | draft
    const startDate = searchParams.get('startDate')?.trim()
    const endDate = searchParams.get('endDate')?.trim()

    // Build where clause
    const where: Prisma.RecipeWhereInput = {}

    if (category) {
      where.categoryId = category
    }

    if (status === 'published') {
      where.isPublished = true
    } else if (status === 'draft') {
      where.isPublished = false
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch all matching recipes (with limit to prevent timeout)
    const recipes = await prisma.recipe.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        titleEn: true,
        titleZh: true,
        isPublished: true,
        viewCount: true,
        createdAt: true,
        calories: true,
        difficulty: true,
        author: {
          select: { name: true, email: true },
        },
        category: {
          select: { nameZh: true, nameEn: true },
        },
        _count: {
          select: {
            favorites: true,
            comments: true,
            likes: true,
          },
        },
      },
    })

    // Calculate avg rating per recipe (from comments with rating)
    const recipeIds = recipes.map((r) => r.id)
    const ratings = await prisma.comment.groupBy({
      by: ['recipeId'],
      where: {
        recipeId: { in: recipeIds },
        rating: { not: null },
      },
      _avg: { rating: true },
    })
    const ratingMap = new Map(ratings.map((r) => [r.recipeId, r._avg.rating ?? 0]))

    // CSV Headers
    const headers = [
      'ID',
      'Title (EN)',
      'Title (ZH)',
      'Category',
      'Author',
      'Status',
      'Difficulty',
      'Calories',
      'Created At',
      'View Count',
      'Favorites',
      'Likes',
      'Comments',
      'Avg Rating',
    ]

    // Build CSV content
    const csvRows = [headers.join(',')]

    for (const recipe of recipes) {
      const row = [
        escapeCSV(recipe.id),
        escapeCSV(recipe.titleEn),
        escapeCSV(recipe.titleZh),
        escapeCSV(recipe.category.nameZh || recipe.category.nameEn),
        escapeCSV(recipe.author.name || recipe.author.email),
        escapeCSV(recipe.isPublished ? 'Published' : 'Draft'),
        escapeCSV(recipe.difficulty ?? ''),
        escapeCSV(recipe.calories ?? ''),
        escapeCSV(formatDate(recipe.createdAt)),
        escapeCSV(recipe.viewCount),
        escapeCSV(recipe._count.favorites),
        escapeCSV(recipe._count.likes),
        escapeCSV(recipe._count.comments),
        escapeCSV((ratingMap.get(recipe.id) ?? 0).toFixed(1)),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="recipes-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
