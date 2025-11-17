# マスターキー認証ガイド

## 概要

おぜう文庫に**マスターキー認証**機能が追加されました。マスターキーを使用することで:

- **Admin API**を直接操作できます
- **一般API**（投稿、コメント、いいね）でhCaptcha認証をバイパスできます
- リファラーチェックやUser-Agentチェックをスキップできます

これにより、管理者は自動化スクリプトやAPIクライアントから直接操作が可能になります。

## セットアップ

### 1. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加してください:

```env
# Admin設定
ADMIN_PASSWORD=your_admin_password_here
ADMIN_MASTER_KEY=your_master_key_here
```

- `ADMIN_PASSWORD`: 管理画面へのログインパスワード
- `ADMIN_MASTER_KEY`: API認証用のマスターキー（長く複雑な文字列を推奨）

### 2. マスターキーの生成例

安全なマスターキーを生成するには、以下のようなコマンドを使用できます:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# または単純にランダムな長い文字列
```

## 使い方

### Web UI（APIコンソール）

1. 管理画面にログイン: `/admin`
2. ナビゲーションから「APIコンソール」を選択
3. マスターキーを入力して保存
4. よく使うエンドポイントから選択、またはカスタムリクエストを作成
5. 「リクエスト実行」ボタンをクリック

### cURL / HTTPクライアントでの利用

すべてのAdmin APIエンドポイントは、`Authorization`ヘッダーにマスターキーを含める必要があります。

#### 基本的な使い方

```bash
# Authorization ヘッダーの形式
Authorization: Bearer YOUR_MASTER_KEY_HERE
```

#### 例: 投稿を削除

```bash
curl -X POST https://bunko.ozetudo.blog/api/admin/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{"id": 123}'
```

#### 例: IP BAN

```bash
curl -X POST https://bunko.ozetudo.blog/api/admin/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "action": "ban",
    "ip_address": "192.168.1.1",
    "reason": "スパム行為"
  }'
```

#### 例: BAN一覧取得

```bash
curl -X GET https://bunko.ozetudo.blog/api/admin/banned-list \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE"
```

#### 例: コンテンツフィルター（検索）

```bash
curl -X POST https://bunko.ozetudo.blog/api/admin/filter-content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "action": "search",
    "keyword": "不適切な言葉",
    "target": "all"
  }'
```

#### 例: コメント無効化

```bash
curl -X POST https://bunko.ozetudo.blog/api/admin/toggle-comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "bunko_id": 123,
    "comments_enabled": false
  }'
```

### 一般APIでの利用（hCaptchaバイパス）

マスターキーを使用することで、投稿・コメント・いいねAPIでhCaptcha認証をスキップできます。

#### 例: 投稿（hCaptcha不要）

```bash
curl -X POST https://bunko.ozetudo.blog/api/bunko \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "title": "テスト投稿",
    "author": "管理者",
    "content": "これはマスターキーを使った投稿です",
    "commentsEnabled": true
  }'
```

**注意**: `captchaToken`は不要です。マスターキーがあれば自動的にhCaptcha検証がスキップされます。

#### 例: コメント投稿（hCaptcha不要）

```bash
curl -X POST https://bunko.ozetudo.blog/api/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "bunko_id": 123,
    "author": "管理者",
    "content": "マスターキーを使ったコメントです"
  }'
```

#### 例: いいね（BANチェックスキップ）

```bash
curl -X POST https://bunko.ozetudo.blog/api/likes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY_HERE" \
  -d '{
    "bunko_id": 123
  }'
```

## エンドポイント一覧

### Admin API（マスターキー必須）

以下のエンドポイントはマスターキー認証が**必須**です:

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/admin/delete` | POST | 投稿の削除 |
| `/api/admin/ban` | POST | ユーザーのBAN/BAN解除 |
| `/api/admin/banned-list` | GET | BAN済みユーザー一覧 |
| `/api/admin/filter-content` | POST | コンテンツの検索・削除 |
| `/api/admin/toggle-comments` | POST | コメントの有効/無効切替 |

### 一般API（マスターキー任意）

以下のエンドポイントはマスターキーを使用することでhCaptcha検証をスキップできます:

| エンドポイント | メソッド | マスターキーなし | マスターキーあり |
|---------------|---------|----------------|----------------|
| `/api/bunko` | POST | hCaptcha必須 | hCaptchaスキップ |
| `/api/comments` | POST | hCaptcha必須 | hCaptchaスキップ |
| `/api/likes` | POST | BANチェックあり | BANチェックスキップ |

## エラーレスポンス

### 認証エラー

```json
{
  "error": "認証が必要です"
}
// ステータス: 401 Unauthorized
```

### 認証失敗

```json
{
  "error": "認証に失敗しました"
}
// ステータス: 403 Forbidden
```

### サーバー設定エラー

```json
{
  "error": "サーバー設定エラー"
}
// ステータス: 500 Internal Server Error
```

## セキュリティのベストプラクティス

1. **マスターキーの管理**
   - マスターキーは絶対に公開しない
   - 定期的にマスターキーをローテーション
   - `.env.local`はGitにコミットしない（`.gitignore`に含める）

2. **HTTPSの使用**
   - 本番環境では必ずHTTPSを使用
   - マスターキーが平文で送信されないようにする

3. **アクセスログの監視**
   - 不正なアクセスがないか定期的に確認
   - 異常なアクセスパターンを検出

4. **環境変数の保護**
   - Vercelなどのホスティングサービスでは、環境変数を安全に管理
   - ローカル開発環境でも`.env.local`のパーミッションを制限

## トラブルシューティング

### Q: マスターキーが認識されない

A: 以下を確認してください:
- `.env.local`に`ADMIN_MASTER_KEY`が正しく設定されているか
- サーバーを再起動したか（環境変数の変更後は再起動が必要）
- Authorizationヘッダーの形式が`Bearer YOUR_KEY`になっているか

### Q: 401エラーが発生する

A: Authorizationヘッダーが送信されていません。ヘッダーを確認してください。

### Q: 403エラーが発生する

A: マスターキーが間違っています。環境変数と送信しているキーが一致しているか確認してください。

## 開発情報

### 認証ミドルウェアの場所

- ファイル: `lib/authMiddleware.js`
- 関数: `withMasterKey()`, `verifyMasterKey()`

### カスタマイズ

#### Admin API（マスターキー必須）

独自のAPIエンドポイントにマスターキー認証を追加する場合:

```javascript
import { withMasterKey } from '../../../lib/authMiddleware';

async function handler(req, res) {
  // あなたのAPIロジック
}

export default withMasterKey(handler);
```

#### 一般API（マスターキーで機能拡張）

既存のAPIにマスターキー認証の選択肢を追加する場合:

```javascript
import { verifyMasterKey } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  // マスターキー認証チェック
  const masterKeyAuth = verifyMasterKey(req, res);
  const hasMasterKey = masterKeyAuth.authorized;

  // マスターキーがあればセキュリティチェックをスキップ
  if (!hasMasterKey) {
    // hCaptcha検証などの通常のセキュリティチェック
    if (!captchaToken) {
      return res.status(400).json({ error: '認証が必要です' });
    }
    // hCaptcha検証処理...
  }

  // APIロジック
}
```

## サポート

問題が発生した場合は、プロジェクトのIssueトラッカーに報告してください。
