import { sql } from '@vercel/postgres';
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ip_address, reason } = req.body;

    if (!ip_address) {
      return res.status(400).json({ error: 'IPアドレスが必要です' });
    }

    // BANテーブル作成
    await sql`
      CREATE TABLE IF NOT EXISTS banned_users (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason TEXT,
        banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        banned_by VARCHAR(50) DEFAULT 'admin'
      )
    `;

    if (action === 'ban') {
      // ユーザーをBAN
      try {
        await sql`
          INSERT INTO banned_users (ip_address, reason)
          VALUES (${ip_address}, ${reason || 'ルール違反'})
          ON CONFLICT (ip_address) DO UPDATE SET
            reason = ${reason || 'ルール違反'},
            banned_at = CURRENT_TIMESTAMP
        `;

        // BANされたユーザーの全コンテンツを削除
        await sql`DELETE FROM comments WHERE ip_address = ${ip_address}`;
        await sql`DELETE FROM likes WHERE ip_address = ${ip_address}`;
        await sql`DELETE FROM bunko WHERE ip_address = ${ip_address}`;

        return res.status(200).json({ 
          message: 'ユーザーをBANし、関連コンテンツを削除しました',
          ip_address 
        });

      } catch (error) {
        console.error('Ban error:', error);
        return res.status(500).json({ error: 'BANに失敗しました' });
      }

    } else if (action === 'unban') {
      // BAN解除
      try {
        const result = await sql`
          DELETE FROM banned_users 
          WHERE ip_address = ${ip_address}
        `;

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'BANされていないユーザーです' });
        }

        return res.status(200).json({ 
          message: 'BAN解除しました',
          ip_address 
        });

      } catch (error) {
        console.error('Unban error:', error);
        return res.status(500).json({ error: 'BAN解除に失敗しました' });
      }

    } else {
      return res.status(400).json({ error: '無効なアクションです' });
    }

  } catch (error) {
    console.error('Ban API error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export default withMasterKey(handler);