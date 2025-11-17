// Vercel環境でクライアントの実際のIPアドレスを取得する関数
export function getClientIP(req) {
  // Vercel特有のヘッダーを優先的にチェック
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'];
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  const realIP = req.headers['x-real-ip'];
  const forwardedFor = req.headers['x-forwarded-for'];
  
  // 複数のIPが含まれている場合は最初（クライアント）のIPを取得
  const extractFirstIP = (ipHeader) => {
    if (!ipHeader) return null;
    const ips = ipHeader.split(',').map(ip => ip.trim());
    return ips[0] || null;
  };

  // 優先順位で実際のクライアントIPを取得
  const clientIP = 
    extractFirstIP(vercelForwardedFor) ||
    extractFirstIP(cfConnectingIP) ||
    extractFirstIP(realIP) ||
    extractFirstIP(forwardedFor) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  // IPv6の::ffff:プレフィックスを除去
  if (clientIP && clientIP.startsWith('::ffff:')) {
    return clientIP.substring(7);
  }

  return clientIP;
}