import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
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
    
    // リファラーチェック（POST時）
    if (req.method === 'POST') {
      const referer = req.headers.referer;
      if (!referer || (!referer.includes('localhost:3000') && !referer.includes('.vercel.app') && !referer.includes('bunko.ozetudo.blog'))) {
        return res.status(403).json({ error: 'アクセスが拒否されました' });
      }
      
      // User-Agentチェック
      const userAgent = req.headers['user-agent'];
      if (!userAgent || userAgent.length < 10) {
        return res.status(403).json({ error: 'アクセスが拒否されました' });
      }
    }

    // テーブル作成（初回のみ実行される）
    await sql`
      CREATE TABLE IF NOT EXISTS bunko (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (req.method === 'GET') {
      // 文庫一覧取得
      const { rows } = await sql`
        SELECT id, title, author, content, ip_address, created_at FROM bunko 
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      return res.status(200).json(rows);
      
    } else if (req.method === 'POST') {
      // 文庫投稿
      const { title, author, content, captchaToken } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

      // BANチェック
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
      
      // hCaptcha検証
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
            remoteip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
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
      
      // 入力検証
      if (!title || !author || !content) {
        return res.status(400).json({ error: '必須項目を入力してください' });
      }
      
      // 文字数制限
      if (title.length > 100) {
        return res.status(400).json({ error: 'タイトルは100文字以内にしてください' });
      }
      if (author.length > 50) {
        return res.status(400).json({ error: '作成者名は50文字以内にしてください' });
      }
      if (content.length > 10000) {
        return res.status(400).json({ error: '本文は10000文字以内にしてください' });
      }
      
      // データベースに保存
      const { rows } = await sql`
        INSERT INTO bunko (title, author, content, ip_address)
        VALUES (${title.trim()}, ${author.trim()}, ${content.trim()}, ${ip})
        RETURNING *
      `;
      
      return res.status(200).json(rows[0]);
      
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
