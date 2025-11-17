import { sql } from '@vercel/postgres';
import { getClientIP } from '../../../lib/getClientIP';

// ログイン試行制限のメモリストレージ（本番では Redis 推奨）
const loginAttempts = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, captchaToken } = req.body;
    const ip = getClientIP(req);

    if (!password) {
      return res.status(400).json({ error: 'パスワードが必要です' });
    }

    if (!captchaToken) {
      return res.status(400).json({ error: '認証が必要です' });
    }

    // hCaptcha検証
    try {
      const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.HCAPTCHA_SECRET_KEY,
          response: captchaToken,
          remoteip: ip,
        }).toString(),
      });

      const captchaResult = await captchaResponse.json();
      
      if (!captchaResult.success) {
        return res.status(400).json({ error: '認証に失敗しました' });
      }
    } catch (error) {
      console.error('hCaptcha verification error:', error);
      return res.status(500).json({ error: '認証エラーが発生しました' });
    }

    // ログイン試行制限チェック
    const attemptKey = `login_${ip}`;
    const now = Date.now();
    const attempt = loginAttempts.get(attemptKey);
    
    if (attempt && now - attempt.lastAttempt < 5 * 60 * 1000) { // 5分
      const remainingTime = Math.ceil((5 * 60 * 1000 - (now - attempt.lastAttempt)) / 1000 / 60);
      return res.status(429).json({ 
        error: `ログイン試行が制限されています。あと${remainingTime}分後に再試行してください。` 
      });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not set in environment variables');
      return res.status(500).json({ error: 'サーバー設定エラー' });
    }

    if (password === adminPassword) {
      // 成功時は制限をクリア
      loginAttempts.delete(attemptKey);
      return res.status(200).json({ success: true });
    } else {
      // 失敗時は制限を設定
      loginAttempts.set(attemptKey, {
        lastAttempt: now,
        attempts: (attempt?.attempts || 0) + 1
      });
      
      // 古いエントリをクリーンアップ（メモリリーク防止）
      for (const [key, value] of loginAttempts.entries()) {
        if (now - value.lastAttempt > 6 * 60 * 1000) { // 6分後にクリーンアップ
          loginAttempts.delete(key);
        }
      }
      
      return res.status(401).json({ error: 'パスワードが正しくありません' });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}