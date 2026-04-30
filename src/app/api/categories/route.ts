import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/redis'
import { successResponse, handleError } from '@/lib/api'
import { z } from 'zod'

const CategorySchema = z.object({
  nameEn: z.string().min(1),
  nameZh: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  image: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
})

// GET /api/categories
export async function GET() {
  try {
    const categories = await withCache('categories:all', CACHE_TTL.categories, () =>
      prisma.category.findMany({
        orderBy: [
          { recipes: { _count: 'desc' } },
          { sortOrder: 'asc' },
          { nameEn: 'asc' },
        ],
        include: { _count: { select: { recipes: true } } },
      })
    )

    return successResponse({
      data: categories.map((category) => ({
        id: category.id,
        name: category.nameEn,
        nameZh: category.nameZh,
        icon: category.image,
        recipeCount: category._count.recipes,
        slug: category.slug,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CategorySchema.parse(body)
    const category = await prisma.category.create({ data })
    await invalidateCache(['categories:all'])
    return successResponse(category, 201)
  } catch (error) {
    return handleError(error)
  }
}
