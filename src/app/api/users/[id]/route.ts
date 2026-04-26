import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireSelfOrAdmin } from '@/lib/auth-guard'
import { getUserLevelInfo } from '@/lib/exp'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional(),
  cover: z.string().url().optional().nullable(),  // REQ-12.4
  specialties: z.array(z.string()).optional(),     // REQ-12.4
  locale: z.string().optional(),
  // role 字段已从此接口移除，角色变更须走专用的 admin 接口
})

// GET /api/users/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { 
          select: { 
            recipes: true, 
            comments: true, 
            favorites: true,
            followers: true,
            following: true,
            likes: true,
          } 
        },
      },
    })
    if (!user) return errorResponse('User not found', 404)
    
    // REQ-12.9: 添加等级信息
    const levelInfo = await getUserLevelInfo(id)
    
    return successResponse({ ...user, levelInfo })
  } catch (error) {
    return handleError(error)
  }
}

// PATCH /api/users/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 鉴权：必须是本人或 ADMIN
    const auth = requireSelfOrAdmin(req, id)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const data = UpdateSchema.parse(body)

    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        _count: { 
          select: { 
            recipes: true, 
            comments: true, 
            favorites: true,
            followers: true,
            following: true,
          } 
        },
      },
    })
    return successResponse(user)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 鉴权：必须是本人或 ADMIN
    const auth = requireSelfOrAdmin(req, id)
    if (auth instanceof Response) return auth

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!user) return errorResponse('User not found', 404)
    await prisma.user.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
