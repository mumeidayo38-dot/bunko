import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Updates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUpdates();
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

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/updates');
      if (response.ok) {
        const data = await response.json();
        setUpdates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading updates:', error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>サイトアップデート情報 - おぜう文庫 web</title>
        <meta name="description" content="おぜう文庫の最新アップデート情報をご確認いただけます。新機能追加やサイト改善の情報をお知らせします。" />
        <meta name="keywords" content="おぜう文庫,ozeu bunko,ozeu文庫,アップデート,更新情報,新機能,サイト改善,updates,news,features" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bunko.ozetudo.blog/updates" />
        <meta property="og:title" content="サイトアップデート情報 - おぜう文庫 web" />
        <meta property="og:description" content="おぜう文庫の最新アップデート情報をご確認いただけます。" />
        <meta property="og:site_name" content="おぜう文庫" />
        
        <link rel="canonical" href="https://bunko.ozetudo.blog/updates" />
      </Head>
      <div className={styles.container}>
        <button 
          className={styles.darkModeToggle}
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
{isDarkMode ? '☀' : '☾'}
        </button>
        <h1 className={styles.title}>むめーのアップデート一覧</h1>
        
        <nav className={styles.nav}>
          <a onClick={() => router.push('/')}>ホーム</a>
          <a onClick={() => router.push('/post')}>投稿</a>
          <a className={styles.active}>アップデート</a>
        </nav>

        <div className={styles.homeView}>
          {loading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : updates.length === 0 ? (
            <div className={styles.emptyState}>まだアップデート情報がありません</div>
          ) : (
            <div className={styles.updatesList}>
              {updates.map((update) => (
                <div key={update.id} className={styles.updateItem}>
                  <div className={styles.updateDate}>
                    {new Date(update.created_at).toLocaleDateString('ja-JP')}
                  </div>
                  <div className={styles.updateTitle}>{update.title}</div>
                  <div className={styles.updateContent}>{update.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}