import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_SIZE = 200;

/**
 * POST /api/upload/avatar
 * 上传用户头像
 * 
 * 功能：
 * - 接收 multipart/form-data
 * - 验证文件格式和大小
 * - 压缩裁剪为 200x200
 * - 上传到 Vercel Blob Storage
 * - 更新 user.avatar 字段
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. 解析 multipart/form-data
    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // 3. 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Invalid file format. Only JPG, PNG, and WebP are allowed.', 400);
    }

    // 4. 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('File too large. Maximum size is 5MB.', 413);
    }

    // 5. 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. 使用 sharp 压缩和裁剪
    const processedBuffer = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    // 7. 上传到 Vercel Blob Storage
    const filename = `avatars/${userId}-${Date.now()}.jpg`;
    const blob = await put(filename, processedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    // 8. 更新数据库
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: blob.url },
    });

    // 9. 返回成功响应
    return successResponse({
      avatarUrl: blob.url,
    });
  } catch (error) {
    console.error('[Avatar Upload Error]', error);
    return handleError(error);
  }
}
