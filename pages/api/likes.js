import { sql } from '@vercel/postgres';
import { getClientIP } from '../../lib/getClientIP';
import { verifyMasterKey } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  try {
    // マスターキー認証チェック（あればセキュリティチェックをバイパス）
    const masterKeyAuth = verifyMasterKey(req, res);
    const hasMasterKey = masterKeyAuth.authorized;

    // CORS制限
    const allowedOrigins = [
      'http://localhost:3000',
      'https://bunko.ozetudo.blog',
      /^https:\/\/.*\.vercel\.app$/
    ];
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => allowed instanceof RegExp && allowed.test(origin)))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // テーブル作成
    await sql`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        bunko_id INTEGER NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bunko_id, ip_address)
      )
    `;

    if (req.method === 'POST') {
      // いいねの追加/削除
      const { bunko_id } = req.body;
      const ip = getClientIP(req);

      // BANチェック - マスターキーがあればスキップ
      if (!hasMasterKey) {
        try {
          const banCheck = await sql`
            SELECT id FROM banned_users WHERE ip_address = ${ip}
          `;
          if (banCheck.rows.length > 0) {
            return res.status(403).json({ error: 'アクセスが制限されています' });
          }
        } catch (error) {
          console.error('Ban check error:', error);
        }
      }

      if (!bunko_id) {
        return res.status(400).json({ error: '文庫IDが必要です' });
      }

      try {
        // 既存のいいねをチェック
        const existing = await sql`
          SELECT id FROM likes 
          WHERE bunko_id = ${bunko_id} AND ip_address = ${ip}
        `;

        if (existing.rows.length > 0) {
          // いいねを削除
          await sql`
            DELETE FROM likes 
            WHERE bunko_id = ${bunko_id} AND ip_address = ${ip}
          `;
          
          // 現在のいいね数を取得
          const { rows } = await sql`
            SELECT COUNT(*) as count FROM likes WHERE bunko_id = ${bunko_id}
          `;
          
          return res.status(200).json({ 
            liked: false, 
            count: parseInt(rows[0].count) 
          });
        } else {
          // いいねを追加
          await sql`
            INSERT INTO likes (bunko_id, ip_address)
            VALUES (${bunko_id}, ${ip})
          `;
          
          // 現在のいいね数を取得
          const { rows } = await sql`
            SELECT COUNT(*) as count FROM likes WHERE bunko_id = ${bunko_id}
          `;
          
          return res.status(200).json({ 
            liked: true, 
            count: parseInt(rows[0].count) 
          });
        }
      } catch (error) {
        console.error('Like operation error:', error);
        return res.status(500).json({ error: 'サーバーエラーが発生しました' });
      }

    } else if (req.method === 'GET') {
      // いいね数の取得
      const { bunko_id } = req.query;
      const ip = getClientIP(req);

      if (!bunko_id) {
        return res.status(400).json({ error: '文庫IDが必要です' });
      }

      try {
        // いいね数を取得
        const countResult = await sql`
          SELECT COUNT(*) as count FROM likes WHERE bunko_id = ${bunko_id}
        `;

        // ユーザーがいいね済みかチェック
        const userLiked = await sql`
          SELECT id FROM likes 
          WHERE bunko_id = ${bunko_id} AND ip_address = ${ip}
        `;

        return res.status(200).json({
          count: parseInt(countResult.rows[0].count),
          liked: userLiked.rows.length > 0
        });
      } catch (error) {
        console.error('Get likes error:', error);
        return res.status(500).json({ error: 'サーバーエラーが発生しました' });
      }

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Likes API error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}