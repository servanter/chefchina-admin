import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleError } from '@/lib/api'
import { Prisma } from '@/generated/prisma'

// Helper function to escape CSV fields
function escapeCSV(field: any): string {
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

// GET /api/admin/users/export — Export users to CSV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Filter parameters (same as list API)
    const search = searchParams.get('search')?.trim()
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
      ]
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      where.role = role
    }

    if (status === 'banned') {
      where.isBanned = true
    } else if (status === 'active') {
      where.isBanned = false
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

    // Fetch all matching users (with limits to prevent timeout)
    const users = await prisma.user.findMany({
      where,
      take: 10000, // Limit to prevent timeout
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            recipes: true,
            comments: true,
            favorites: true,
            following: true,
            followers: true,
          },
        },
      },
    })

    // CSV Headers
    const headers = [
      'ID',
      'Email',
      'Name',
      'Role',
      'Status',
      'Banned At',
      'Banned Reason',
      'Locale',
      'Recipes Count',
      'Comments Count',
      'Favorites Count',
      'Following Count',
      'Followers Count',
      'Created At',
      'Updated At',
    ]

    // Build CSV content
    const csvRows = [headers.join(',')]
    
    for (const user of users) {
      const row = [
        escapeCSV(user.id),
        escapeCSV(user.email),
        escapeCSV(user.name),
        escapeCSV(user.role),
        escapeCSV(user.isBanned ? 'Banned' : 'Active'),
        escapeCSV(formatDate(user.bannedAt)),
        escapeCSV(user.bannedReason),
        escapeCSV(user.locale),
        escapeCSV(user._count.recipes),
        escapeCSV(user._count.comments),
        escapeCSV(user._count.favorites),
        escapeCSV(user._count.following),
        escapeCSV(user._count.followers),
        escapeCSV(formatDate(user.createdAt)),
        escapeCSV(formatDate(user.updatedAt)),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
