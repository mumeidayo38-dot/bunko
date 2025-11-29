/**
 * マスターキー認証ミドルウェア
 * Admin専用のAPIエンドポイントを保護します
 */

export function verifyMasterKey(req, res) {
  const masterKey = process.env.ADMIN_MASTER_KEY;

  if (!masterKey) {
    console.error('ADMIN_MASTER_KEY not set in environment variables');
    return {
      authorized: false,
      error: { status: 500, message: 'サーバー設定エラー' }
    };
  }

  // Authorization ヘッダーから取得: "Bearer YOUR_KEY"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return {
      authorized: false,
      error: { status: 401, message: '認証が必要です' }
    };
  }

  // Bearer トークンの形式をチェック
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      authorized: false,
      error: { status: 401, message: '無効な認証形式です' }
    };
  }

  const providedKey = parts[1];

  // マスターキーを検証
  if (providedKey !== masterKey) {
    return {
      authorized: false,
      error: { status: 403, message: '認証に失敗しました' }
    };
  }

  return { authorized: true };
}

/**
 * API ハンドラーをラップして認証を追加
 * マスターキー または 同一オリジンからのリクエストを許可
 */
export function withMasterKey(handler) {
  return async (req, res) => {
    const auth = verifyMasterKey(req, res);

    // マスターキーがあればOK
    if (auth.authorized) {
      return handler(req, res);
    }

    // マスターキーがない場合、同一オリジン（Web管理画面）からのリクエストか確認
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';
    const allowedHosts = ['localhost:3000', 'bunko.ozetudo.blog', '.vercel.app'];

    const isFromAllowedHost = allowedHosts.some(host =>
      referer.includes(host) || origin.includes(host)
    );

    if (isFromAllowedHost) {
      return handler(req, res);
    }

    // どちらでもない場合はエラー
    return res.status(auth.error.status).json({ error: auth.error.message });
  };
}
