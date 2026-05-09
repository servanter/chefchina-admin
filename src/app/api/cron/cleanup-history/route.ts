import { NextRequest, NextResponse } from 'next/server';
import { cleanupFreeUserHistory } from '@/lib/permissions';

/**
 * 定时任务：清理免费用户 30 天外的历史数据
 * 建议使用 Vercel Cron Job 或其他调度器每日执行
 */
export async function GET(request: NextRequest) {
  try {
    // 简单的授权检查（建议使用更安全的方式，如 API Key）
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-cron-secret';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupFreeUserHistory();

    return NextResponse.json({
      success: true,
      deleted: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error cleaning up free user history:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup history' },
      { status: 500 }
    );
  }
}
