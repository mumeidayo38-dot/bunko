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

    // リファラーチェック（POST時）- マスターキーがあればスキップ
    if (req.method === 'POST' && !hasMasterKey) {
      const referer = req.headers.referer;
      if (!referer || (!referer.includes('localhost:3000') && !referer.includes('.vercel.app') && !referer.includes('bunko.ozetudo.blog'))) {
        return res.status(403).json({ error: 'アクセスが拒否されました' });
      }

      const userAgent = req.headers['user-agent'];
      if (!userAgent || userAgent.length < 10) {
        return res.status(403).json({ error: 'アクセスが拒否されました' });
      }
    }

    // テーブル作成
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        bunko_id INTEGER NOT NULL,
        author VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (req.method === 'POST') {
      // コメントの投稿
      const { bunko_id, author, content, captchaToken } = req.body;
      const ip = getClientIP(req);

      // BANチェック - マスターキーがあってもBANチェックは実行（安全のため）
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

      // 入力検証
      if (!bunko_id || !author || !content) {
        return res.status(400).json({ error: 'すべての項目を入力してください' });
      }

      // hCaptcha検証 - マスターキーがあればスキップ
      if (!hasMasterKey) {
        if (!captchaToken) {
          return res.status(400).json({ error: '認証が必要です' });
        }

        try {
          const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              secret: process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000',
              response: captchaToken,
              remoteip: getClientIP(req),
            }).toString(),
          });

          const captchaResult = await captchaResponse.json();

          if (!captchaResult.success) {
            console.log('hCaptcha verification failed:', captchaResult);
            return res.status(400).json({ error: '認証に失敗しました' });
          }
        } catch (error) {
          console.error('hCaptcha verification error:', error);
          return res.status(500).json({ error: '認証エラーが発生しました' });
        }
      } else {
        console.log('Master key detected - bypassing hCaptcha verification for comment');
      }

      // 文字数制限
      if (author.length > 50) {
        return res.status(400).json({ error: '名前は50文字以内にしてください' });
      }
      if (content.length > 1000) {
        return res.status(400).json({ error: 'コメントは1000文字以内にしてください' });
      }

      try {
        // コメントを保存
        const { rows } = await sql`
          INSERT INTO comments (bunko_id, author, content, ip_address)
          VALUES (${bunko_id}, ${author.trim()}, ${content.trim()}, ${ip})
          RETURNING *
        `;

        return res.status(200).json(rows[0]);
      } catch (error) {
        console.error('Comment save error:', error);
        return res.status(500).json({ error: 'コメントの保存に失敗しました' });
      }

    } else if (req.method === 'GET') {
      // コメント一覧の取得
      const { bunko_id } = req.query;

      if (!bunko_id) {
        return res.status(400).json({ error: '文庫IDが必要です' });
      }

      try {
        const { rows } = await sql`
          SELECT id, author, content, created_at
          FROM comments 
          WHERE bunko_id = ${bunko_id}
          ORDER BY created_at ASC
          LIMIT 100
        `;

        return res.status(200).json(rows);
      } catch (error) {
        console.error('Get comments error:', error);
        return res.status(500).json({ error: 'コメントの取得に失敗しました' });
      }

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Comments API error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}