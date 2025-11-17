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

    // アップデートテーブル作成（初回のみ実行される）
    await sql`
      CREATE TABLE IF NOT EXISTS updates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 初期データ挿入（テーブルが空の場合のみ）
    const existingUpdates = await sql`SELECT COUNT(*) FROM updates`;
    if (existingUpdates.rows[0].count === '0') {
      await sql`
        INSERT INTO updates (title, content, created_at) VALUES 
        ('おぜう文庫 web がオープンしました！', 'みなさん、こんにちは！

ついにおぜう文庫のweb版がリリースされました。
文庫の投稿や閲覧、コメント機能などを楽しんでください。

今後も機能追加を予定していますので、お楽しみに！', NOW()),
        ('検索機能を追加しました', '作者名、タイトル、本文での検索機能を追加しました。
トップページの検索ボックスから利用できます。', NOW() - INTERVAL '1 day')
      `;
    }

    if (req.method === 'GET') {
      // アップデート一覧取得
      const { rows } = await sql`
        SELECT id, title, content, created_at FROM updates 
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      return res.status(200).json(rows);
      
    } else if (req.method === 'POST') {
      // アップデート投稿（管理者のみ）
      const { title, content } = req.body;
      
      // 入力検証
      if (!title || !content) {
        return res.status(400).json({ error: '必須項目を入力してください' });
      }
      
      // 文字数制限
      if (title.length > 200) {
        return res.status(400).json({ error: 'タイトルは200文字以内にしてください' });
      }
      if (content.length > 2000) {
        return res.status(400).json({ error: '内容は2000文字以内にしてください' });
      }
      
      // データベースに保存
      try {
        const { rows } = await sql`
          INSERT INTO updates (title, content)
          VALUES (${title.trim()}, ${content.trim()})
          RETURNING *
        `;
        
        return res.status(200).json(rows[0]);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
    } else if (req.method === 'DELETE') {
      // アップデート削除（管理者のみ）
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'IDが必要です' });
      }
      
      try {
        const { rows } = await sql`
          DELETE FROM updates WHERE id = ${id}
          RETURNING *
        `;
        
        if (rows.length === 0) {
          return res.status(404).json({ error: 'アップデートが見つかりません' });
        }
        
        return res.status(200).json({ message: '削除しました' });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}