import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/Home.module.css';

export default function AdminUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('adminAuth');
      if (!isAuth) {
        router.push('/admin');
        return;
      }
    }
    
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      alert('タイトルと内容を入力してください');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ title: '', content: '' });
        loadUpdates();
        alert('アップデート情報を投稿しました');
      } else {
        const data = await response.json();
        alert(data.error || '投稿に失敗しました');
      }
    } catch (error) {
      console.error('Error posting update:', error);
      alert('ネットワークエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUpdate = async (id) => {
    if (!confirm('このアップデート情報を削除しますか？')) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch('/api/updates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setUpdates(updates.filter(update => update.id !== id));
        alert('削除しました');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const logout = () => {
    localStorage.removeItem('adminAuth');
    router.push('/admin');
  };

  return (
    <>
      <Head>
        <title>アップデート管理 - おぜう文庫 web</title>
      </Head>
      <div className={styles.container}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '1rem'
        }}>
          <h1 className={styles.title} style={{ margin: 0 }}>アップデート管理</h1>
          <div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9em',
                marginRight: '10px'
              }}
            >
              ダッシュボード
            </button>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* 投稿フォーム */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '30px', 
          borderRadius: '8px',
          marginBottom: '40px'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>新しいアップデート情報</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">タイトル</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="アップデートのタイトルを入力"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="content">内容</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="アップデートの詳細を入力"
                style={{ minHeight: '200px' }}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={submitting}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              {submitting ? '投稿中...' : 'アップデート投稿'}
            </button>
          </form>
        </div>

        {/* アップデート一覧 */}
        <div>
          <h2>アップデート一覧 ({updates.length}件)</h2>
          {loading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : updates.length === 0 ? (
            <div className={styles.emptyState}>まだアップデート情報がありません</div>
          ) : (
            <div className={styles.updatesList}>
              {updates.map((update) => (
                <div key={update.id} className={styles.updateItem}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.updateDate}>
                        {new Date(update.created_at).toLocaleDateString('ja-JP')}
                      </div>
                      <div className={styles.updateTitle}>{update.title}</div>
                      <div className={styles.updateContent}>{update.content}</div>
                    </div>
                    <button
                      onClick={() => deleteUpdate(update.id)}
                      disabled={deleting === update.id}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: deleting === update.id ? 'not-allowed' : 'pointer',
                        opacity: deleting === update.id ? 0.6 : 1,
                        fontSize: '0.85em',
                        marginLeft: '15px'
                      }}
                    >
                      {deleting === update.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
