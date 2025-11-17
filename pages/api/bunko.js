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
        comments_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 既存のレコードにcomments_enabledカラムがない場合は追加
    try {
      await sql`ALTER TABLE bunko ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT TRUE`;
    } catch (e) {
      // カラムが既に存在する場合のエラーは無視
    }


    // BANユーザーテーブル作成
    await sql`
      CREATE TABLE IF NOT EXISTS banned_users (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (req.method === 'GET') {
      // 文庫一覧取得
      const { rows } = await sql`
        SELECT id, title, author, content, ip_address, comments_enabled, created_at FROM bunko 
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      return res.status(200).json(rows);
      
    } else if (req.method === 'POST') {
      // 文庫投稿
      console.log('Received POST request:', {
        body: req.body,
        headers: req.headers,
        contentType: req.headers['content-type']
      });
      const { title, author, content, captchaToken, commentsEnabled } = req.body;
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

      // hCaptcha検証 - マスターキーがあればスキップ
      if (!hasMasterKey) {
        console.log('hCaptcha check:', {
          nodeEnv: process.env.NODE_ENV,
          hasSecret: !!process.env.HCAPTCHA_SECRET_KEY
        });

        if (process.env.NODE_ENV === 'production' && process.env.HCAPTCHA_SECRET_KEY && process.env.HCAPTCHA_SECRET_KEY !== '0x0000000000000000000000000000000000000000') {
          if (!captchaToken) {
            return res.status(400).json({ error: '認証が必要です' });
          }

          try {
            const remoteIp = getClientIP(req);

            console.log('hCaptcha request data:', {
              secret: process.env.HCAPTCHA_SECRET_KEY?.substring(0, 10) + '...',
              responseLength: captchaToken?.length,
              remoteIp: remoteIp
            });

            const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                secret: process.env.HCAPTCHA_SECRET_KEY,
                response: captchaToken,
                remoteip: remoteIp,
              }).toString(),
            });

            const captchaResult = await captchaResponse.json();

            console.log('hCaptcha verification result:', {
              success: captchaResult.success,
              errorCodes: captchaResult['error-codes'],
              hostname: captchaResult.hostname,
              challenge_ts: captchaResult.challenge_ts,
              hasSecretKey: !!process.env.HCAPTCHA_SECRET_KEY,
              captchaTokenLength: captchaToken?.length
            });

            if (!captchaResult.success) {
              console.log('hCaptcha verification failed:', captchaResult);
              return res.status(400).json({
                error: '認証に失敗しました',
                debug: process.env.NODE_ENV === 'development' ? captchaResult : undefined
              });
            }
          } catch (error) {
            console.error('hCaptcha verification error:', error);
            return res.status(500).json({ error: '認証エラーが発生しました' });
          }
        }
      } else {
        console.log('Master key detected - bypassing hCaptcha verification');
      }
      
      console.log('hCaptcha passed, proceeding with validation...');
      
      // 入力検証
      if (!title || !author || !content) {
        console.log('Validation failed - missing fields:', { title: !!title, author: !!author, content: !!content });
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
      console.log('Attempting database insert...');
      try {
        const { rows } = await sql`
          INSERT INTO bunko (title, author, content, ip_address, comments_enabled)
          VALUES (${title.trim()}, ${author.trim()}, ${content.trim()}, ${ip}, ${commentsEnabled !== false})
          RETURNING *
        `;
        
        console.log('Database insert successful:', rows[0]);
        return res.status(200).json(rows[0]);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
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
