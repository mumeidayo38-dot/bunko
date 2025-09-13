import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Updates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUpdates();
  }, []);

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
        <title>むめーのアップデート一覧 - おぜう文庫 web</title>
      </Head>
      <div className={styles.container}>
        <h1 className={styles.title}>むめーのアップデート一覧</h1>
        
        <nav className={styles.nav}>
          <a onClick={() => router.push('/')}>ホーム</a>
          <a onClick={() => router.push('/post')}>投稿</a>
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
