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

// GET /api/admin/comments/export — Export comments to CSV
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)

    // Filter parameters
    const recipeId = searchParams.get('recipeId')?.trim()
    const startDate = searchParams.get('startDate')?.trim()
    const endDate = searchParams.get('endDate')?.trim()

    // Build where clause
    const where: Prisma.CommentWhereInput = {}

    if (recipeId) {
      where.recipeId = recipeId
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

    // Fetch all matching comments (with limit to prevent timeout)
    const comments = await prisma.comment.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        rating: true,
        isVisible: true,
        createdAt: true,
        recipeId: true,
        recipe: {
          select: {
            titleEn: true,
            titleZh: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // CSV Headers
    const headers = [
      'ID',
      'Recipe ID',
      'Recipe Title',
      'User',
      'Rating',
      'Content',
      'Visible',
      'Created At',
    ]

    // Build CSV content
    const csvRows = [headers.join(',')]

    for (const comment of comments) {
      const row = [
        escapeCSV(comment.id),
        escapeCSV(comment.recipeId),
        escapeCSV(comment.recipe.titleZh || comment.recipe.titleEn),
        escapeCSV(comment.user.name || comment.user.email),
        escapeCSV(comment.rating ?? ''),
        escapeCSV(comment.content),
        escapeCSV(comment.isVisible ? 'Yes' : 'No'),
        escapeCSV(formatDate(comment.createdAt)),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="comments-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
