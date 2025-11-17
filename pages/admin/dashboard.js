import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/Home.module.css';

export default function AdminDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [banForm, setBanForm] = useState({ ip: '', reason: '' });
  const [activeTab, setActiveTab] = useState('messages');
  const [filterResults, setFilterResults] = useState({ bunko: [], comments: [], total: 0 });
  const [filterForm, setFilterForm] = useState({ keyword: '', target: 'all' });
  const [filterLoading, setFilterLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('adminAuth');
      if (!isAuth) {
        router.push('/admin');
        return;
      }
      
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setIsDarkMode(savedDarkMode);
      if (savedDarkMode) {
        document.documentElement.classList.add('dark-mode');
      }
    }
    
    fetchMessages();
    fetchBannedUsers();
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

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/bunko');
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm('この文章を削除しますか？')) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessages(messages.filter(msg => msg.id !== id));
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminAuth');
    router.push('/admin');
  };

  const fetchBannedUsers = async () => {
    try {
      const response = await fetch('/api/admin/banned-list');
      if (response.ok) {
        const data = await response.json();
        setBannedUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
      setBannedUsers([]);
    }
  };

  const handleBan = async (e) => {
    e.preventDefault();
    
    if (!banForm.ip) {
      alert('IPアドレスを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'ban',
          ip_address: banForm.ip,
          reason: banForm.reason || 'ルール違反'
        }),
      });

      if (response.ok) {
        setBanForm({ ip: '', reason: '' });
        fetchBannedUsers();
        fetchMessages(); // メッセージリストを更新
        alert('ユーザーをBANしました');
      } else {
        const data = await response.json();
        alert(data.error || 'BANに失敗しました');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('ネットワークエラーが発生しました');
    }
  };

  const handleUnban = async (ip) => {
    if (!confirm(`${ip}のBAN解除しますか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unban',
          ip_address: ip
        }),
      });

      if (response.ok) {
        fetchBannedUsers();
        alert('BAN解除しました');
      } else {
        const data = await response.json();
        alert(data.error || 'BAN解除に失敗しました');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('ネットワークエラーが発生しました');
    }
  };

  const handleFilterSearch = async (e) => {
    e.preventDefault();
    
    if (!filterForm.keyword.trim()) {
      alert('検索キーワードを入力してください');
      return;
    }

    setFilterLoading(true);

    try {
      const response = await fetch('/api/admin/filter-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          keyword: filterForm.keyword,
          target: filterForm.target
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFilterResults(data);
      } else {
        const data = await response.json();
        alert(data.error || '検索に失敗しました');
      }
    } catch (error) {
      console.error('Error searching content:', error);
      alert('ネットワークエラーが発生しました');
    } finally {
      setFilterLoading(false);
    }
  };

  const handleFilterDelete = async () => {
    if (!filterForm.keyword.trim()) {
      alert('検索キーワードを入力してください');
      return;
    }

    if (!confirm(`「${filterForm.keyword}」を含む全てのコンテンツを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setFilterLoading(true);

    try {
      const response = await fetch('/api/admin/filter-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          keyword: filterForm.keyword,
          target: filterForm.target
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`削除完了:\n文庫: ${data.deleted.bunko}件\nコメント: ${data.deleted.comments}件`);
        setFilterResults({ bunko: [], comments: [], total: 0 });
        setFilterForm({ keyword: '', target: 'all' });
        fetchMessages(); // メッセージリストを更新
      } else {
        const data = await response.json();
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('ネットワークエラーが発生しました');
    } finally {
      setFilterLoading(false);
    }
  };

  const toggleComments = async (bunkoId, enableComments) => {
    try {
      const response = await fetch('/api/admin/toggle-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bunko_id: bunkoId,
          comments_enabled: enableComments
        }),
      });

      if (response.ok) {
        // メッセージリストを更新
        fetchMessages();
        alert(`コメントを${enableComments ? '有効' : '無効'}にしました`);
      } else {
        const data = await response.json();
        alert(data.error || 'コメント設定の変更に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling comments:', error);
      alert('ネットワークエラーが発生しました');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

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
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          <h1 className={styles.title} style={{ margin: 0 }}>管理</h1>
          <div>
            <button
              onClick={() => router.push('/admin/updates')}
              className={styles.adminButton}
            >
              アップデート管理
            </button>
            <button
              onClick={logout}
              className={styles.adminButtonPrimary}
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* タブナビゲーション */}
        <div className={styles.adminTabContainer}>
          <button
            onClick={() => setActiveTab('messages')}
            className={`${styles.adminTab} ${activeTab === 'messages' ? styles.adminTabActive : ''}`}
          >
            投稿管理
          </button>
          <button
            onClick={() => setActiveTab('ban')}
            className={`${styles.adminTab} ${activeTab === 'ban' ? styles.adminTabActive : ''}`}
          >
            BAN管理
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            className={`${styles.adminTab} ${activeTab === 'filter' ? styles.adminTabActive : ''}`}
          >
            コンテンツフィルター
          </button>
        </div>

        {activeTab === 'messages' && (
          <div>
            <div className={styles.adminStatsText}>
              総数: {messages.length}件
            </div>

              <div className={styles.bunkoList}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={styles.bunkoItem}
                    style={{ cursor: 'default' }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div className={styles.bunkoTitle}>{message.title}</div>
                        <div className={styles.bunkoAuthor}>作成者: {message.author}</div>
                        <div className={styles.bunkoPreview} style={{ 
                          '-webkit-line-clamp': '3',
                          marginBottom: '10px'
                        }}>
                          {message.content}
                        </div>
                        <div className={styles.bunkoDate}>
                          {formatDate(message.created_at)}
                          {message.ip_address && (
                            <span style={{ color: '#999', marginLeft: '10px', fontSize: '0.8em' }}>
                              IP: {message.ip_address}
                            </span>
                          )}
                          <span style={{ 
                            marginLeft: '10px', 
                            fontSize: '0.8em',
                            color: message.comments_enabled ? '#28a745' : '#dc3545'
                          }}>
                            コメント: {message.comments_enabled ? '有効' : '無効'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexShrink: 0, marginLeft: '15px' }}>
                        <button
                          onClick={() => toggleComments(message.id, !message.comments_enabled)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: message.comments_enabled ? '#dc3545' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.75em'
                          }}
                        >
                          {message.comments_enabled ? 'コメント無効' : 'コメント有効'}
                        </button>
                        {message.ip_address && (
                          <button
                            onClick={() => setBanForm({...banForm, ip: message.ip_address})}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ffc107',
                              color: 'black',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.75em'
                            }}
                          >
                            BAN
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessage(message.id)}
                          disabled={deleting === message.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: deleting === message.id ? 'not-allowed' : 'pointer',
                            opacity: deleting === message.id ? 0.6 : 1,
                            fontSize: '0.85em'
                          }}
                        >
                          {deleting === message.id ? '削除中...' : '削除'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {messages.length === 0 && (
                <div className={styles.emptyState}>
                  文章がありません
                </div>
              )}
            </div>
          )}

          {activeTab === 'ban' && (
            <div>
              {/* BAN追加フォーム */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ marginTop: 0 }}>ユーザーBAN</h3>
                <form onSubmit={handleBan}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                        IPアドレス
                      </label>
                      <input
                        type="text"
                        value={banForm.ip}
                        onChange={(e) => setBanForm({...banForm, ip: e.target.value})}
                        placeholder="192.168.1.1"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                        required
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                        理由（任意）
                      </label>
                      <input
                        type="text"
                        value={banForm.reason}
                        onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
                        placeholder="ルール違反"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      BAN実行
                    </button>
                  </div>
                </form>
              </div>

              {/* BANリスト */}
              <h3>BANリスト ({bannedUsers.length}件)</h3>
              {bannedUsers.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {bannedUsers.map((user, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        padding: '15px',
                        borderRadius: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          IP: {user.ip_address}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          理由: {user.reason}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#999' }}>
                          BAN日時: {new Date(user.banned_at).toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnban(user.ip_address)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85em'
                        }}
                      >
                        BAN解除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  BANされたユーザーはいません
                </div>
              )}
            </div>
          )}

          {activeTab === 'filter' && (
            <div>
              {/* フィルター検索フォーム */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ marginTop: 0 }}>コンテンツフィルター</h3>
                <form onSubmit={handleFilterSearch}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'end', marginBottom: '15px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                        検索キーワード
                      </label>
                      <input
                        type="text"
                        value={filterForm.keyword}
                        onChange={(e) => setFilterForm({...filterForm, keyword: e.target.value})}
                        placeholder="削除したいキーワードを入力"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                        対象
                      </label>
                      <select
                        value={filterForm.target}
                        onChange={(e) => setFilterForm({...filterForm, target: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="all">すべて</option>
                        <option value="bunko">文庫投稿のみ</option>
                        <option value="comments">コメントのみ</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={filterLoading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: filterLoading ? 'not-allowed' : 'pointer',
                        opacity: filterLoading ? 0.6 : 1
                      }}
                    >
                      {filterLoading ? '検索中...' : '検索'}
                    </button>
                  </div>
                </form>
                
                {filterResults.total > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px'
                  }}>
                    <span>
                      {filterResults.total}件のコンテンツが見つかりました
                      (文庫: {filterResults.bunko.length}件, コメント: {filterResults.comments.length}件)
                    </span>
                    <button
                      onClick={handleFilterDelete}
                      disabled={filterLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: filterLoading ? 'not-allowed' : 'pointer',
                        opacity: filterLoading ? 0.6 : 1
                      }}
                    >
                      {filterLoading ? '削除中...' : '一括削除'}
                    </button>
                  </div>
                )}
              </div>

              {/* 検索結果 */}
              {filterResults.total > 0 && (
                <div>
                  {/* 文庫投稿結果 */}
                  {filterResults.bunko.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h4>文庫投稿 ({filterResults.bunko.length}件)</h4>
                      <div className={styles.bunkoList}>
                        {filterResults.bunko.map((item) => (
                          <div
                            key={`bunko-${item.id}`}
                            className={styles.bunkoItem}
                            style={{ cursor: 'default', backgroundColor: '#fff5f5' }}
                          >
                            <div className={styles.bunkoTitle} style={{ color: '#dc3545' }}>
                              {item.title}
                            </div>
                            <div className={styles.bunkoAuthor}>作成者: {item.author}</div>
                            <div className={styles.bunkoPreview} style={{ '-webkit-line-clamp': '2' }}>
                              {item.content}
                            </div>
                            <div className={styles.bunkoDate}>
                              {formatDate(item.created_at)}
                              {item.ip_address && (
                                <span style={{ marginLeft: '10px', fontSize: '0.8em' }}>
                                  IP: {item.ip_address}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* コメント結果 */}
                  {filterResults.comments.length > 0 && (
                    <div>
                      <h4>コメント ({filterResults.comments.length}件)</h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {filterResults.comments.map((item) => (
                          <div
                            key={`comment-${item.id}`}
                            style={{
                              backgroundColor: '#fff5f5',
                              border: '1px solid #f5c6cb',
                              padding: '15px',
                              borderRadius: '5px'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#dc3545' }}>
                              {item.author}
                            </div>
                            <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                              "{item.content}"
                            </div>
                            <div style={{ fontSize: '0.8em', color: '#666' }}>
                              投稿: {item.bunko_title} | {formatDate(item.created_at)}
                              {item.ip_address && ` | IP: ${item.ip_address}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
}