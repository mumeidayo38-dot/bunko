import { sql } from '@vercel/postgres';

// 連載タグテーブルの初期化
async function initSeriesTagsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS series_tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export default async function handler(req, res) {
  await initSeriesTagsTable();

  if (req.method === 'GET') {
    try {
      // パスワード保護された連載タグの一覧取得（管理者用）
      const { admin } = req.query;
      
      if (admin === 'true') {
        // 管理者用：すべての情報を含む
        const { rows } = await sql`
          SELECT id, name, description, password, created_at 
          FROM series_tags 
          ORDER BY created_at DESC
        `;
        res.status(200).json(rows);
      } else {
        // 一般用：パスワードを除いた基本情報のみ
        const { rows } = await sql`
          SELECT id, name, description 
          FROM series_tags 
          ORDER BY created_at DESC
        `;
        res.status(200).json(rows);
      }
    } catch (error) {
      console.error('連載タグ取得エラー:', error);
      res.status(500).json({ error: '連載タグの取得に失敗しました' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action, name, description, password, id } = req.body;

      if (action === 'create') {
        // 新しい連載タグを作成
        if (!name) {
          return res.status(400).json({ error: 'タグ名は必須です' });
        }

        const { rows } = await sql`
          INSERT INTO series_tags (name, description, password) 
          VALUES (${name}, ${description || ''}, ${password || ''})
          RETURNING id, name, description, password, created_at
        `;

        res.status(201).json(rows[0]);
      } else if (action === 'update') {
        // 既存の連載タグを更新
        if (!id || !name) {
          return res.status(400).json({ error: 'IDとタグ名は必須です' });
        }

        await sql`
          UPDATE series_tags 
          SET name = ${name}, description = ${description || ''}, password = ${password || ''}
          WHERE id = ${id}
        `;

        const { rows } = await sql`
          SELECT id, name, description, password, created_at 
          FROM series_tags 
          WHERE id = ${id}
        `;

        res.status(200).json(rows[0]);
      } else if (action === 'delete') {
        // 連載タグを削除
        if (!id) {
          return res.status(400).json({ error: 'IDは必須です' });
        }

        await sql`DELETE FROM series_tags WHERE id = ${id}`;
        res.status(200).json({ message: '連載タグを削除しました' });
      } else if (action === 'verify') {
        // パスワード認証
        if (!id || !password) {
          return res.status(400).json({ error: 'IDとパスワードは必須です' });
        }

        const { rows } = await sql`
          SELECT id, name, description 
          FROM series_tags 
          WHERE id = ${id} AND password = ${password}
        `;

        if (rows.length > 0) {
          res.status(200).json({ verified: true, tag: rows[0] });
        } else {
          res.status(401).json({ verified: false, error: 'パスワードが正しくありません' });
        }
      } else {
        res.status(400).json({ error: '無効なアクションです' });
      }
    } catch (error) {
      console.error('連載タグ操作エラー:', error);
      if (error.code === '23505') { // PostgreSQL unique violation
        res.status(400).json({ error: 'このタグ名は既に存在します' });
      } else {
        res.status(500).json({ error: '連載タグの操作に失敗しました' });
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }

}
