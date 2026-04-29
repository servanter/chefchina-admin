import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// REQ-18.1: POST /api/users/me/avatar - 上传头像
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const userId = auth.sub

    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return errorResponse('请选择要上传的头像', 400)
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('仅支持 JPG, PNG, WebP, GIF 格式', 400)
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('头像大小不能超过 5MB', 400)
    }

    // 生成文件名
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${userId}-${timestamp}.${extension}`

    // 保存到本地 public/uploads/avatars 目录
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // 生成访问 URL
    const avatarUrl = `/uploads/avatars/${filename}`

    // 更新用户头像
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        cover: true,
        specialties: true,
        locale: true,
      },
    })

    return successResponse({ 
      avatar: avatarUrl,
      user 
    })
  } catch (error) {
    return handleError(error)
  }
}
