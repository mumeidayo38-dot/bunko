import { NextResponse } from 'next/server';

// レート制限のための簡易実装
const rateLimitMap = new Map();

export function middleware(request) {
  // API投稿エンドポイントのレート制限
  if (request.nextUrl.pathname === '/api/bunko' && request.method === 'POST') {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowSize = 60 * 1000; // 1分
    const maxRequests = 5; // 1分に5回まで

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip);
    const recentRequests = requests.filter(time => now - time < windowSize);
    
    if (recentRequests.length >= maxRequests) {
      return NextResponse.json(
        { error: 'レート制限に達しました。しばらくお待ちください。' },
        { status: 429 }
      );
    }

    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);

    // 古いエントリをクリーンアップ
    if (rateLimitMap.size > 1000) {
      const cutoff = now - windowSize;
      for (const [key, times] of rateLimitMap.entries()) {
        const filtered = times.filter(time => time > cutoff);
        if (filtered.length === 0) {
          rateLimitMap.delete(key);
        } else {
          rateLimitMap.set(key, filtered);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/bunko'],
};