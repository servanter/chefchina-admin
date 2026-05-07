import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API
 * 
 * 解决外部图片 CORS 跨域问题
 * 支持：pravatar.cc, Unsplash, picsum 等
 * 
 * Usage:
 *   /api/image/proxy?url=https://images.unsplash.com/photo-xxx
 *   /api/image/proxy?url=https://i.pravatar.cc/150?u=guest
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 安全检查：只允许 HTTPS 和特定域名
    const allowedDomains = [
      'i.pravatar.cc',
      'images.unsplash.com',
      'unsplash.com',
      'source.unsplash.com',
      'picsum.photos',
    ];

    let targetUrl: URL;
    try {
      targetUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // 只允许 HTTPS
    if (targetUrl.protocol !== 'https:') {
      return NextResponse.json(
        { success: false, error: 'Only HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // 检查域名白名单
    const isAllowed = allowedDomains.some(domain => 
      targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Domain not allowed' },
        { status: 403 }
      );
    }

    // 代理请求
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefChina/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取图片内容
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 返回图片
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Image Proxy Error]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 请求（CORS 预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
