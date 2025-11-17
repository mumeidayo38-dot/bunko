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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadBunkoList();
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
        <title>おぜう文庫(ozeu文庫)</title>
        <meta name="description" content="おぜうの集いの文庫集、狂ってる文集がたくさん！" />
        <meta name="keywords" content="おぜう,おぜう文庫,ozeu,ozeu文庫,ozeu bunko,文庫,小説,詩,エッセイ,文学,投稿,共有,コミュニティ,読書,novel,poetry,essay,literature" />
        <meta name="author" content="おぜう文庫" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bunko.ozetudo.blog/" />
        <meta property="og:title" content="おぜう文庫(ozeu文庫)" />
        <meta property="og:description" content="おぜうの集いの文庫集、狂ってる文集がたくさん！" />
        <meta property="og:site_name" content="おぜう文庫" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="おぜう文庫(ozeu文庫)" />
        <meta name="twitter:description" content="おぜうの集いの文庫集、狂ってる文集がたくさん！" />
        
        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "おぜう文庫",
              "alternateName": ["おぜう文庫 web", "ozeu bunko", "ozeu文庫"],
              "url": "https://bunko.ozetudo.blog/",
              "description": "おぜうの集いの文庫集、狂ってる文集がたくさん！",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://bunko.ozetudo.blog/?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://bunko.ozetudo.blog/" />
      </Head>
      
      <div className={styles.container}>
        <button 
          className={styles.darkModeToggle}
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
{isDarkMode ? '☀' : '☾'}
        </button>
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
              <div className={styles.likeSection}>
                <button
                  onClick={() => handleLike(selectedBunko.id)}
                  className={`${styles.likeButton} ${likes.liked ? styles.liked : ''}`}
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
              {selectedBunko.comments_enabled ? (
                <div className={styles.commentSection}>
                  <h3 style={{ marginBottom: '15px', fontSize: '1.1em' }}>
                    コメント ({comments.length})
                  </h3>
                
                {/* コメント一覧 */}
                {comments.length > 0 ? (
                  <div style={{ marginBottom: '20px' }}>
                    {comments.map((comment) => (
                      <div key={comment.id} className={styles.commentItem}>
                        <div className={styles.commentAuthor}>
                          {comment.author}
                        </div>
                        <div className={styles.commentContent}>
                          {comment.content}
                        </div>
                        <div className={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyComment}>
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
                      className={styles.commentFormInput}
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
                      className={styles.commentFormTextarea}
                      maxLength={1000}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <HCaptcha
                      sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || "10000000-ffff-ffff-ffff-000000000001"}
                      theme={isDarkMode ? "dark" : "light"}
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
                    className={styles.commentSubmitButton}
                  >
                    {commentLoading ? '投稿中...' : 'コメント投稿'}
                  </button>
                </form>
                </div>
              ) : (
                <div className={styles.disabledComments}>
                  この投稿はコメントが無効になっています
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
