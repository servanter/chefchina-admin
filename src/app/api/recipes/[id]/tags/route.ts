import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidateCache } from '@/lib/redis'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const BodySchema = z.object({
  tags: z.array(z.string().trim().min(1)).max(10),
})

function normalizeTagName(value: string) {
  return value.trim().replace(/^#/, '').replace(/\s+/g, ' ')
}

function dedupeNames(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = normalizeTagName(raw)
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

// POST /api/recipes/[id]/tags
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    })

    if (!existing) return errorResponse('Recipe not found', 404)
    if (existing.authorId !== auth.sub && auth.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const parsed = BodySchema.parse(body)
    const tagNames = dedupeNames(parsed.tags)

    if (tagNames.length > 10) {
      return errorResponse('A recipe can have at most 10 tags', 422)
    }

    const recipe = await prisma.$transaction(async (tx) => {
      await tx.recipeTag.deleteMany({ where: { recipeId: id } })

      const tagIds: string[] = []
      for (const name of tagNames) {
        const tag = await tx.tag.upsert({
          where: { nameEn: name.toLowerCase() },
          update: { nameZh: name },
          create: { nameEn: name.toLowerCase(), nameZh: name },
          select: { id: true },
        })
        tagIds.push(tag.id)
      }

      if (tagIds.length) {
        await tx.recipeTag.createMany({
          data: tagIds.map((tagId) => ({ recipeId: id, tagId })),
          skipDuplicates: true,
        })
      }

      return tx.recipe.findUnique({
        where: { id },
        include: {
          category: true,
          author: { select: { id: true, name: true, avatar: true } },
          steps: { orderBy: { stepNumber: 'asc' } },
          ingredients: true,
          tags: { include: { tag: true } },
        },
      })
    })

    await invalidateCache([`recipe:${id}`, 'recipes:*'])
    return successResponse(recipe)
  } catch (error) {
    return handleError(error)
  }
}
