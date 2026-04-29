import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/search/suggest?q=keyword
 * 搜索建议（自动补全）
 * 
 * 功能：
 * - 根据用户输入返回搜索建议
 * - 搜索菜谱标题（中文+英文）
 * - 最多返回 5 条建议
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    // 输入长度不足 2 个字符时返回空
    if (q.length < 2) {
      return successResponse({ suggestions: [] });
    }

    // 搜索菜谱标题（中文或英文）
    const recipes = await prisma.recipe.findMany({
      where: {
        AND: [
          {
            OR: [
              { titleZh: { contains: q, mode: 'insensitive' } },
              { titleEn: { contains: q, mode: 'insensitive' } },
            ],
          },
          { isPublished: true },
        ],
      },
      select: {
        titleZh: true,
        titleEn: true,
      },
      take: 5,
      orderBy: {
        viewCount: 'desc', // 优先返回热门菜谱
      },
    });

    // 格式化建议列表
    const suggestions = recipes.map((r) => ({
      text: r.titleZh || r.titleEn || '',
      type: 'recipe',
    }));

    return successResponse({ suggestions });
  } catch (error) {
    console.error('[Search Suggest Error]', error);
    return handleError(error);
  }
}
