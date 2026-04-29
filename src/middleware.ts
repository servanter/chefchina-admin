import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://chefchina-app.vercel.app', // 生产环境
  'http://localhost:8081',   // Expo web
  'http://localhost:19006',  // Expo 旧版 web
  'exp://localhost:8081',    // Expo Go
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin')

  // 预检请求直接返回 200
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
  }

  // 只处理 /api/* 路由
  const res = NextResponse.next()
  const headers = corsHeaders(origin)
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export const config = {
  matcher: '/api/:path*',
}
