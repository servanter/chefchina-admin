import { PrismaClient } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 连接池配置（修复 MaxClientsInSessionMode 错误）
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        // 设置连接池大小为 10（Vercel Serverless 默认也是 10）
        url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20',
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 在 Serverless 环境下，不需要手动 disconnect（Next.js 会自动管理）
// 但如果需要在长连接场景下使用，可以调用：
// await prisma.$disconnect()

// 导出一个带自动清理的 wrapper（可选）
export async function withPrisma<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    return await fn(prisma)
  } catch (error) {
    console.error('Prisma error:', error)
    throw error
  }
  // 注意：在 Serverless 环境下不要执行 $disconnect()
  // 因为会导致后续请求无法使用同一个实例
}
