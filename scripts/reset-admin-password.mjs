import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const username = 'admin';
  const newPassword = 'admin123'; // 新密码
  
  try {
    // 生成密码哈希
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // 查找或创建 admin 用户
    const admin = await prisma.adminUser.upsert({
      where: { username },
      update: { 
        passwordHash,
        updatedAt: new Date()
      },
      create: {
        username,
        passwordHash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin 密码重置成功！');
    console.log('用户名:', username);
    console.log('新密码:', newPassword);
    console.log('Admin ID:', admin.id);
    
  } catch (error) {
    console.error('❌ 重置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
