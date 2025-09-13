import { useState, useEffect } from 'react';
import Head from 'next/head';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [bunkoList, setBunkoList] = useState([]);
  const [filteredBunkoList, setFilteredBunkoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBunko, setSelectedBunko] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [commentForm, setCommentForm] = useState({ author: '', content: '', captchaToken: '' });
  const [commentLoading, setCommentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBunkoList();
  }, []);

  const loadBunkoList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bunko');
      if (response.ok) {
        const data = await response.json();
        const bunkoData = Array.isArray(data) ? data : [];
        setBunkoList(bunkoData);
        setFilteredBunkoList(bunkoData);
      }
    } catch (error) {
      console.error('Error loading bunko list:', error);
      setBunkoList([]);
      setFilteredBunkoList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (bunkoId) => {
    try {
      const response = await fetch(`/api/comments?bunko_id=${bunkoId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    }
  };

  const loadLikes = async (bunkoId) => {
    try {
      const response = await fetch(`/api/likes?bunko_id=${bunkoId}`);
      if (response.ok) {
        const data = await response.json();
        setLikes(data);
      }
    } catch (error) {
      console.error('Error loading likes:', error);
      setLikes({ count: 0, liked: false });
    }
  };

  const handleLike = async (bunkoId) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bunko_id: bunkoId }),
      });

      if (response.ok) {
        const data = await response.json();
        setLikes(data);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!commentForm.author || !commentForm.content) {
      alert('名前とコメントを入力してください');
      return;
    }

    if (!commentForm.captchaToken) {
      alert('認証を完了してください');
      return;
    }

    setCommentLoading(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bunko_id: selectedBunko.id,
          author: commentForm.author,
          content: commentForm.content,
          captchaToken: commentForm.captchaToken,
        }),
      });

      if (response.ok) {
        setCommentForm({ author: '', content: '', captchaToken: '' });
        loadComments(selectedBunko.id);
      } else {
        const data = await response.json();
        alert(data.error || 'コメントの投稿に失敗しました');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('ネットワークエラーが発生しました');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleBunkoClick = (bunko) => {
    setSelectedBunko(bunko);
    setComments([]);
    setLikes({ count: 0, liked: false });
    setCommentForm({ author: '', content: '', captchaToken: '' });
    loadComments(bunko.id);
    loadLikes(bunko.id);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredBunkoList(bunkoList);
    } else {
      const filtered = bunkoList.filter(bunko => 
        bunko.author.toLowerCase().includes(query.toLowerCase()) ||
        bunko.title.toLowerCase().includes(query.toLowerCase()) ||
        bunko.content.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBunkoList(filtered);
    }
  };


  return (
    <>
      <Head>
        <title>おぜう文庫 web</title>
        <meta name="description" content="おぜう文庫 web" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.title}>おぜう文庫 web</h1>
        
        <nav className={styles.nav}>
          <a 
            className={styles.active}
          >
            ホーム
          </a>
          <a 
            onClick={() => window.location.href = '/post'}
          >
            投稿
          </a>
          <a 
            onClick={() => window.location.href = '/updates'}
          >
            アップデート
          </a>
        </nav>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="作者名、タイトル、内容で検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.homeView}>
          {loading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : filteredBunkoList.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? '検索結果が見つかりませんでした' : 'まだ投稿がありません'}
            </div>
          ) : (
            <div className={styles.bunkoList}>
              {filteredBunkoList.map((bunko) => (
                <div
                  key={bunko.id}
                  className={styles.bunkoItem}
                  onClick={() => handleBunkoClick(bunko)}
                >
                  <div className={styles.bunkoTitle}>{bunko.title}</div>
                  <div className={styles.bunkoAuthor}>作成者: {bunko.author}</div>
                  <div className={styles.bunkoPreview}>{bunko.content}</div>
                  <div className={styles.bunkoDate}>
                    {new Date(bunko.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedBunko && (
          <div 
            className={styles.bunkoDetail}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedBunko(null);
              }
            }}
          >
            <div className={styles.detailContent}>
              <span 
                className={styles.closeBtn}
                onClick={() => setSelectedBunko(null)}
              >
                &times;
              </span>
              <h2 className={styles.detailTitle}>{selectedBunko.title}</h2>
              <div className={styles.detailAuthor}>作成者: {selectedBunko.author}</div>
              <div className={styles.detailText}>{selectedBunko.content}</div>
              
              {/* いいねボタン */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0'
              }}>
                <button
                  onClick={() => handleLike(selectedBunko.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 16px',
                    backgroundColor: likes.liked ? '#ff4757' : '#f1f2f6',
                    color: likes.liked ? 'white' : '#2c3e50',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <span 
                    style={{ 
                      fontSize: '16px',
                      position: 'relative',
                      display: 'inline-block'
                    }}
                  >
                    <span style={{
                      color: '#333',
                      fontSize: '16px'
                    }}>♡</span>
                    <span style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      color: likes.liked ? '#ff4757' : 'transparent',
                      fontSize: '16px',
                      transition: 'color 0.3s ease'
                    }}>♥</span>
                  </span>
                  {likes.count}
                </button>
              </div>

              {/* コメントセクション */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '1.1em' }}>
                  コメント ({comments.length})
                </h3>
                
                {/* コメント一覧 */}
                {comments.length > 0 ? (
                  <div style={{ marginBottom: '20px' }}>
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          backgroundColor: '#f8f9fa',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ 
                          fontWeight: '500', 
                          fontSize: '0.9em',
                          marginBottom: '5px'
                        }}>
                          {comment.author}
                        </div>
                        <div style={{ 
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9em',
                          lineHeight: '1.4'
                        }}>
                          {comment.content}
                        </div>
                        <div style={{ 
                          fontSize: '0.8em', 
                          color: '#666', 
                          marginTop: '8px'
                        }}>
                          {new Date(comment.created_at).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    fontSize: '0.9em',
                    margin: '20px 0'
                  }}>
                    まだコメントがありません
                  </div>
                )}

                {/* コメント投稿フォーム */}
                <form onSubmit={handleCommentSubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="名前"
                      value={commentForm.author}
                      onChange={(e) => setCommentForm({
                        ...commentForm,
                        author: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                      }}
                      maxLength={50}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <textarea
                      placeholder="コメントを入力..."
                      value={commentForm.content}
                      onChange={(e) => setCommentForm({
                        ...commentForm,
                        content: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      maxLength={1000}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <HCaptcha
                      sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || "10000000-ffff-ffff-ffff-000000000001"}
                      onVerify={(token) => setCommentForm({
                        ...commentForm,
                        captchaToken: token
                      })}
                      onExpire={() => setCommentForm({
                        ...commentForm,
                        captchaToken: ''
                      })}
                      onError={() => setCommentForm({
                        ...commentForm,
                        captchaToken: ''
                      })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={commentLoading || !commentForm.captchaToken}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: commentLoading || !commentForm.captchaToken ? 'not-allowed' : 'pointer',
                      fontSize: '0.9em',
                      opacity: commentLoading || !commentForm.captchaToken ? 0.6 : 1
                    }}
                  >
                    {commentLoading ? '投稿中...' : 'コメント投稿'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
