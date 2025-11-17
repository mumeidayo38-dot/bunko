import { sql } from '@vercel/postgres';
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // BANリスト取得
    const { rows } = await sql`
      SELECT ip_address, reason, banned_at, banned_by
      FROM banned_users
      ORDER BY banned_at DESC
      LIMIT 100
    `;

    return res.status(200).json(rows);

  } catch (error) {
    console.error('Get banned list error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export default withMasterKey(handler);