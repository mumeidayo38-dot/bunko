import { sql } from '@vercel/postgres';
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'IDが必要です' });
    }

    const { rowCount } = await sql`
      DELETE FROM bunko 
      WHERE id = ${id}
    `;

    if (rowCount === 0) {
      return res.status(404).json({ error: 'メッセージが見つかりません' });
    }

    return res.status(200).json({ message: 'メッセージを削除しました' });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withMasterKey(handler);