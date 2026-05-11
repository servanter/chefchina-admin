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
        // ✅ 使用 Supabase 的 PgBouncer 连接池（:6543 端口）
        // POSTGRES_PRISMA_URL 已包含 pgbouncer=true 和合理的 connection_limit
        // 不需要手动拼接参数，PgBouncer 会自动管理连接
        url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
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
