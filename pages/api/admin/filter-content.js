import { sql } from '@vercel/postgres';
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, keyword, target = 'all' } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'キーワードが必要です' });
    }

    const searchKeyword = `%${keyword.trim()}%`;

    if (action === 'search') {
      // キーワードを含むコンテンツを検索
      let bunkoResults = [];
      let commentResults = [];

      if (target === 'all' || target === 'bunko') {
        const bunkoQuery = await sql`
          SELECT id, title, author, content, ip_address, created_at
          FROM bunko 
          WHERE title ILIKE ${searchKeyword} 
             OR author ILIKE ${searchKeyword} 
             OR content ILIKE ${searchKeyword}
          ORDER BY created_at DESC
          LIMIT 100
        `;
        bunkoResults = bunkoQuery.rows;
      }

      if (target === 'all' || target === 'comments') {
        const commentQuery = await sql`
          SELECT c.id, c.bunko_id, c.author, c.content, c.ip_address, c.created_at,
                 b.title as bunko_title
          FROM comments c
          LEFT JOIN bunko b ON c.bunko_id = b.id
          WHERE c.author ILIKE ${searchKeyword} 
             OR c.content ILIKE ${searchKeyword}
          ORDER BY c.created_at DESC
          LIMIT 100
        `;
        commentResults = commentQuery.rows;
      }

      return res.status(200).json({
        bunko: bunkoResults,
        comments: commentResults,
        total: bunkoResults.length + commentResults.length
      });

    } else if (action === 'delete') {
      // キーワードを含むコンテンツを削除
      let deletedBunko = 0;
      let deletedComments = 0;
      let deletedLikes = 0;

      if (target === 'all' || target === 'bunko') {
        // 文庫投稿を削除
        const bunkoResult = await sql`
          DELETE FROM bunko 
          WHERE title ILIKE ${searchKeyword} 
             OR author ILIKE ${searchKeyword} 
             OR content ILIKE ${searchKeyword}
        `;
        deletedBunko = bunkoResult.rowCount;

        // 削除された文庫に関連するコメントといいねも削除
        const relatedComments = await sql`
          DELETE FROM comments 
          WHERE bunko_id NOT IN (SELECT id FROM bunko)
        `;
        const relatedLikes = await sql`
          DELETE FROM likes 
          WHERE bunko_id NOT IN (SELECT id FROM bunko)
        `;
      }

      if (target === 'all' || target === 'comments') {
        // コメントを削除
        const commentResult = await sql`
          DELETE FROM comments 
          WHERE author ILIKE ${searchKeyword} 
             OR content ILIKE ${searchKeyword}
        `;
        deletedComments = commentResult.rowCount;
      }

      return res.status(200).json({
        message: '削除が完了しました',
        deleted: {
          bunko: deletedBunko,
          comments: deletedComments,
          likes: deletedLikes
        }
      });

    } else {
      return res.status(400).json({ error: '無効なアクションです' });
    }

  } catch (error) {
    console.error('Filter content error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export default withMasterKey(handler);