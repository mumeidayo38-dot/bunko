import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import styles from '../../styles/Home.module.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      setError('認証を完了してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, captchaToken }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminAuth', 'true');
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'ログインに失敗しました');
        setCaptchaToken(''); // 失敗時にCaptchaをリセット
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('ネットワークエラーが発生しました');
      setCaptchaToken(''); // エラー時にCaptchaをリセット
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>管理 - おぜう文庫 web</title>
      </Head>
      <div className={styles.container}>
        <button 
          className={styles.darkModeToggle}
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {isDarkMode ? '☀' : '☾'}
        </button>
        <h1 className={styles.title}>管理</h1>
        
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label htmlFor="password">パスワード</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>認証</label>
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || "10000000-ffff-ffff-ffff-000000000001"}
                theme={isDarkMode ? "dark" : "light"}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken('')}
                onError={() => setCaptchaToken('')}
              />
            </div>
            
            {error && (
              <div className={`${styles.message} ${styles.error}`}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !captchaToken}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}