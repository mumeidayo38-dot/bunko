import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';

export default function SeriesTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    password: ''
  });
  const [editingTag, setEditingTag] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const router = useRouter();

  useEffect(() => {
    loadTags();
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

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/series-tags?admin=true');
      if (response.ok) {
        const data = await response.json();
        setTags(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('連載タグ取得エラー:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      showMessage('タグ名は必須です', 'error');
      return;
    }

    const action = editingTag ? 'update' : 'create';
    const requestData = {
      action,
      name: formData.name,
      description: formData.description,
      password: formData.password,
      ...(editingTag && { id: editingTag.id })
    };

    try {
      const response = await fetch('/api/admin/series-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(editingTag ? '連載タグを更新しました' : '連載タグを作成しました', 'success');
        setFormData({ name: '', description: '', password: '' });
        setEditingTag(null);
        loadTags();
      } else {
        showMessage(data.error || 'エラーが発生しました', 'error');
      }
    } catch (error) {
      console.error('連載タグ操作エラー:', error);
      showMessage('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      password: tag.password || ''
    });
  };

  const handleDelete = async (tagId) => {
    if (!confirm('この連載タグを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/series-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete', id: tagId })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('連載タグを削除しました', 'success');
        loadTags();
      } else {
        showMessage(data.error || '削除に失敗しました', 'error');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      showMessage('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleCancel = () => {
    setEditingTag(null);
    setFormData({ name: '', description: '', password: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <>
      <Head>
        <title>連載タグ管理 - おぜう文庫 web 管理者</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className={styles.container}>
        <button 
          className={styles.darkModeToggle}
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {isDarkMode ? '☀' : '☾'}
        </button>
        <h1 className={styles.title}>連載タグ管理</h1>
        
        <nav className={styles.nav}>
          <a onClick={() => router.push('/')}>ホーム</a>
          <a onClick={() => router.push('/admin')}>管理メニュー</a>
          <a className={styles.active}>連載タグ管理</a>
        </nav>

        <div className={styles.adminView}>
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.adminSection}>
            <h2 className={styles.sectionTitle}>
              {editingTag ? '連載タグ編集' : '新規連載タグ作成'}
            </h2>
            
            <form onSubmit={handleSubmit} className={styles.adminForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">タグ名 *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength={100}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength={500}
                  rows={3}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="password">パスワード</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  maxLength={100}
                />
                <small>空白の場合、パスワード保護はされません</small>
              </div>
              
              <div className={styles.adminButtonGroup}>
                <button type="submit" className={styles.submitBtn}>
                  {editingTag ? '更新' : '作成'}
                </button>
                {editingTag && (
                  <button 
                    type="button" 
                    className={styles.cancelBtn}
                    onClick={handleCancel}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className={styles.adminSection}>
            <h2 className={styles.sectionTitle}>連載タグ一覧</h2>
            
            {loading ? (
              <div className={styles.loading}>読み込み中...</div>
            ) : tags.length === 0 ? (
              <div className={styles.emptyState}>まだ連載タグがありません</div>
            ) : (
              <div className={styles.tagsList}>
                {tags.map((tag) => (
                  <div key={tag.id} className={styles.tagItem}>
                    <div className={styles.tagInfo}>
                      <div className={styles.tagName}>
                        {tag.name}
                        {tag.password && (
                          <span className={styles.lockIcon}>🔒</span>
                        )}
                      </div>
                      {tag.description && (
                        <div className={styles.tagDescription}>
                          {tag.description}
                        </div>
                      )}
                      <div className={styles.tagDate}>
                        作成日: {new Date(tag.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <div className={styles.tagActions}>
                      <button 
                        className={styles.editBtn}
                        onClick={() => handleEdit(tag)}
                      >
                        編集
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(tag.id)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
