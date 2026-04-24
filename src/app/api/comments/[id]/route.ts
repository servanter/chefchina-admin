import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { invalidateCache } from '@/lib/redis'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const UpdateSchema = z.object({
  isVisible: z.boolean().optional(),
  content: z.string().min(1).max(1000).optional(),
})

// GET /api/comments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    })
    if (!comment) return errorResponse('Comment not found', 404)
    return successResponse(comment)
  } catch (error) {
    return handleError(error)
  }
}

// PATCH /api/comments/[id]  — toggle visibility or edit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const { id } = await params

    // Verify the requester is the comment author or an ADMIN
    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existing) return errorResponse('Comment not found', 404)
    if (auth.sub !== existing.userId && auth.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const data = UpdateSchema.parse(body)

    const comment = await prisma.comment.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })

    await invalidateCache([`comments:${comment.recipeId}:*`])
    return successResponse(comment)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/comments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const { id } = await params
    const comment = await prisma.comment.findUnique({ where: { id }, select: { recipeId: true, userId: true } })
    if (!comment) return errorResponse('Comment not found', 404)

    // Verify the requester is the comment author or an ADMIN
    if (auth.sub !== comment.userId && auth.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    // Delete all child replies first to avoid foreign key constraint errors,
    // then delete the comment itself.
    await prisma.comment.deleteMany({ where: { parentId: id } })
    await prisma.comment.delete({ where: { id } })
    await invalidateCache([`comments:${comment.recipeId}:1`, `comments:${comment.recipeId}:2`, `comments:${comment.recipeId}:3`])
    return successResponse({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
