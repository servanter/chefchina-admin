import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { invalidateCache } from '@/lib/redis'
import { z } from 'zod'

const UpdateSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  image: z.string().url().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

// GET /api/categories/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { recipes: true } } },
    })
    if (!category) return errorResponse('Category not found', 404)
    return successResponse(category)
  } catch (error) {
    return handleError(error)
  }
}

// PATCH /api/categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = UpdateSchema.parse(body)
    const category = await prisma.category.update({ where: { id }, data })
    await invalidateCache(['categories:all'])
    return successResponse(category)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if category has recipes
    const count = await prisma.recipe.count({ where: { categoryId: id } })
    if (count > 0) {
      return errorResponse(`该分类下有 ${count} 道菜谱，请先移动或删除这些菜谱`, 400)
    }
    await prisma.category.delete({ where: { id } })
    await invalidateCache(['categories:all'])
    return successResponse({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
