import { sql } from '@vercel/postgres';
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  try {
    // POST メソッドのみ許可
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { bunko_id, comments_enabled } = req.body;

    // 入力検証
    if (!bunko_id || typeof comments_enabled !== 'boolean') {
      return res.status(400).json({ error: 'bunko_idとcomments_enabledが必要です' });
    }

    try {
      // データベースでコメント設定を更新
      const { rows } = await sql`
        UPDATE bunko 
        SET comments_enabled = ${comments_enabled}
        WHERE id = ${bunko_id}
        RETURNING id, comments_enabled
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: '投稿が見つかりません' });
      }

      return res.status(200).json({
        message: 'コメント設定を更新しました',
        bunko: rows[0]
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        error: 'データベースエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withMasterKey(handler);