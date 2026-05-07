import { NextResponse } from 'next/server';

/**
 * Image Proxy API
 * 
 * 解决外部图片 CORS 跨域问题（pravatar.cc, Unsplash 等）
 * 
 * Usage:
 *   /api/image/proxy?url=https://i.pravatar.cc/150?u=guest
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 安全检查：只允许 HTTPS 和特定域名
    const allowedDomains = [
      'i.pravatar.cc',
      'images.unsplash.com',
      'source.unsplash.com',
      'picsum.photos',
    ];

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
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

    // 获取图片
    const response = await fetch(url, {
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

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 返回图片
    return new NextResponse(buffer, {
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
