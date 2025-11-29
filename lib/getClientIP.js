// Vercel環境でクライアントの実際のIPアドレスを取得する関数
export function getClientIP(req) {
  // Cloudflareのヘッダーを最優先（実際のクライアントIP）
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  const trueClientIP = req.headers['true-client-ip']; // Cloudflare Enterprise
  const xRealIP = req.headers['x-real-ip'];
  const forwardedFor = req.headers['x-forwarded-for'];
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'];

  // 複数のIPが含まれている場合は最初（クライアント）のIPを取得
  const extractFirstIP = (ipHeader) => {
    if (!ipHeader) return null;
    const ips = ipHeader.split(',').map(ip => ip.trim());
    return ips[0] || null;
  };

  // 優先順位: Cloudflare > True-Client-IP > X-Real-IP > X-Forwarded-For > Vercel
  const clientIP =
    cfConnectingIP ||  // Cloudflareが設定する実際のクライアントIP
    trueClientIP ||    // Cloudflare Enterprise
    xRealIP ||         // プロキシが設定するIP
    extractFirstIP(forwardedFor) ||  // プロキシチェーンの最初のIP
    extractFirstIP(vercelForwardedFor) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  // IPv6の::ffff:プレフィックスを除去
  if (clientIP && clientIP.startsWith('::ffff:')) {
    return clientIP.substring(7);
  }

  return clientIP;
}