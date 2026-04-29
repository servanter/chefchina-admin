import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { getUserLevelInfo } from '@/lib/exp'
import { z } from 'zod'

const SENSITIVE_WORDS = ['admin', 'moderator', 'official', '管理员', '官方']

const ProfileUpdateSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PRIVATE']).optional(),
})

// REQ-18.1: GET /api/users/me/profile - 获取当前用户资料
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const userId = auth.sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        cover: true,
        specialties: true,
        locale: true,
        location: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        exp: true,
        level: true,
        _count: {
          select: {
            recipes: true,
            comments: true,
            favorites: true,
            followers: true,
            following: true,
            likes: true,
          },
        },
      },
    })

    if (!user) return errorResponse('User not found', 404)

    // 添加等级信息
    const levelInfo = await getUserLevelInfo(userId)

    return successResponse({ ...user, levelInfo })
  } catch (error) {
    return handleError(error)
  }
}

// REQ-18.1: PUT /api/users/me/profile - 更新当前用户资料
export async function PUT(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const userId = auth.sub
    const body = await req.json()
    const data = ProfileUpdateSchema.parse(body)

    // 昵称去重校验
    if (data.nickname) {
      // 检查敏感词
      const lowerNickname = data.nickname.toLowerCase()
      const hasSensitiveWord = SENSITIVE_WORDS.some((word) =>
        lowerNickname.includes(word.toLowerCase())
      )
      if (hasSensitiveWord) {
        return errorResponse('昵称包含敏感词，请修改', 400)
      }

      // 检查是否已被其他用户使用
      const existingUser = await prisma.user.findFirst({
        where: {
          name: data.nickname,
          id: { not: userId },
        },
      })
      if (existingUser) {
        return errorResponse('该昵称已被使用，请换一个', 400)
      }
    }

    // 更新用户资料
    const updateData: any = {}
    if (data.nickname !== undefined) updateData.name = data.nickname
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.location !== undefined) updateData.location = data.location
    if (data.gender !== undefined) updateData.gender = data.gender

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        cover: true,
        specialties: true,
        locale: true,
        location: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        exp: true,
        level: true,
      },
    })

    return successResponse(user)
  } catch (error) {
    return handleError(error)
  }
}
