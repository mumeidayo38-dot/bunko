// モックデータ（開発用）
let mockUpdates = [
  {
    id: 1,
    title: "おぜう文庫 web がオープンしました！",
    content: "みなさん、こんにちは！\n\nついにおぜう文庫のweb版がリリースされました。\n文庫の投稿や閲覧、コメント機能などを楽しんでください。\n\n今後も機能追加を予定していますので、お楽しみに！",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "検索機能を追加しました",
    content: "作者名、タイトル、本文での検索機能を追加しました。\nトップページの検索ボックスから利用できます。",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

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

    if (req.method === 'GET') {
      // アップデート一覧取得（モックデータ）
      const sortedUpdates = mockUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.status(200).json(sortedUpdates.slice(0, 50));
      
    } else if (req.method === 'POST') {
      // アップデート投稿（管理者のみ、モックデータ）
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
      
      // モックデータに追加
      const newUpdate = {
        id: Math.max(...mockUpdates.map(u => u.id), 0) + 1,
        title: title.trim(),
        content: content.trim(),
        created_at: new Date().toISOString()
      };
      
      mockUpdates.push(newUpdate);
      return res.status(200).json(newUpdate);
      
    } else if (req.method === 'DELETE') {
      // アップデート削除（管理者のみ、モックデータ）
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'IDが必要です' });
      }
      
      const updateIndex = mockUpdates.findIndex(u => u.id === parseInt(id));
      if (updateIndex === -1) {
        return res.status(404).json({ error: 'アップデートが見つかりません' });
      }
      
      mockUpdates.splice(updateIndex, 1);
      return res.status(200).json({ message: '削除しました' });
      
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
