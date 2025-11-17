import { sql } from '@vercel/postgres';
import { verifyMasterKey } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  const { id } = req.query;

  // マスターキー認証チェック
  const masterKeyAuth = verifyMasterKey(req, res);
  const hasMasterKey = masterKeyAuth.authorized;

  if (req.method === 'GET') {
    try {
      // 特定の文庫を取得
      const { rows } = await sql`
        SELECT * FROM bunko 
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '文庫が見つかりません' });
      }
      
      return res.status(200).json(rows[0]);
      
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  } else if (req.method === 'DELETE') {
    // DELETEメソッド - マスターキー必須
    if (!hasMasterKey) {
      return res.status(403).json({ error: '認証が必要です' });
    }

    try {
      // 投稿を削除
      const { rowCount } = await sql`
        DELETE FROM bunko
        WHERE id = ${id}
      `;

      if (rowCount === 0) {
        return res.status(404).json({ error: '投稿が見つかりません' });
      }

      // 関連するコメントといいねも削除
      await sql`DELETE FROM comments WHERE bunko_id = ${id}`;
      await sql`DELETE FROM likes WHERE bunko_id = ${id}`;

      return res.status(200).json({ message: '投稿を削除しました', id });

    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({
        error: 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
