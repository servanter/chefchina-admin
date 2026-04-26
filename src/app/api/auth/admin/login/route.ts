import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 查询管理员用户
    const adminUser = await prisma.adminUser.findUnique({
      where: { username },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
