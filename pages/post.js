import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import styles from '../styles/Home.module.css';

export default function Post() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    content: '',
    commentsEnabled: true,
    isSeriesEnabled: false,
    seriesName: '',
    seriesDescription: '',
    seriesPassword: '',
    episodeTitle: ''
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.content) {
      showMessage('すべての項目を入力してください', 'error');
      return;
    }

    if (!captchaToken) {
      showMessage('認証を完了してください', 'error');
      return;
    }

    // 連載が有効な場合の処理
    let seriesTagId = null;
    if (formData.isSeriesEnabled) {
      if (!formData.seriesName || !formData.episodeTitle) {
        showMessage('連載タイトルと話数タイトルは必須です', 'error');
        return;
      }
      
      try {
        // 連載タグを作成または取得
        const seriesResponse = await fetch('/api/admin/series-tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            name: formData.seriesName,
            description: formData.seriesDescription,
            password: formData.seriesPassword
          })
        });

        const seriesData = await seriesResponse.json();
        if (!seriesResponse.ok) {
          if (seriesData.error === 'このタグ名は既に存在します') {
            // 既存の連載タグを取得してパスワード検証
            const existingResponse = await fetch('/api/admin/series-tags?admin=true');
            const existingTags = await existingResponse.json();
            const existingTag = existingTags.find(tag => tag.name === formData.seriesName);
            
            if (existingTag) {
              // パスワードが設定されている場合は検証
              if (existingTag.password) {
                if (!formData.seriesPassword) {
                  showMessage('この連載名は既に存在します。パスワードを入力してください', 'error');
                  return;
                }
                
                // パスワード検証
                const verifyResponse = await fetch('/api/admin/series-tags', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'verify',
                    id: existingTag.id,
                    password: formData.seriesPassword
                  })
                });

                const verifyData = await verifyResponse.json();
                if (!verifyData.verified) {
                  showMessage('連載のパスワードが正しくありません', 'error');
                  return;
                }
              } else {
                // パスワードが設定されていない連載に新しくパスワードを設定しようとしている場合
                if (formData.seriesPassword) {
                  showMessage('この連載名は既に存在し、パスワードが設定されていません', 'error');
                  return;
                }
              }
              
              seriesTagId = existingTag.id;
            } else {
              showMessage('連載タグの処理に失敗しました', 'error');
              return;
            }
          } else {
            showMessage(seriesData.error || '連載タグの作成に失敗しました', 'error');
            return;
          }
        } else {
          seriesTagId = seriesData.id;
        }
      } catch (error) {
        console.error('連載タグ処理エラー:', error);
        showMessage('連載タグの処理中にエラーが発生しました', 'error');
        return;
      }
    }
    
    setLoading(true);
    
    // タイトルの設定：連載の場合は「連載タイトル - 話数タイトル」、単発の場合は通常のタイトル
    const finalTitle = formData.isSeriesEnabled 
      ? `${formData.seriesName} - ${formData.episodeTitle}`
      : formData.title;

    const requestData = {
      title: finalTitle,
      author: formData.author,
      content: formData.content,
      commentsEnabled: formData.commentsEnabled,
      captchaToken,
      seriesTagId
    };
    console.log('Sending request:', requestData);
    
    try {
      const response = await fetch('/api/bunko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        data = { error: 'サーバーエラー: レスポンスの解析に失敗しました' };
      }
      console.log('API response:', { status: response.status, data, url: response.url });

      if (!response.ok) {
        const errorMsg = data.error || '投稿に失敗しました';
        const details = data.details ? ` (詳細: ${data.details})` : '';
        throw new Error(errorMsg + details);
      }

      showMessage('投稿が完了しました', 'success');
      setFormData({ 
        title: '', 
        author: '', 
        content: '', 
        commentsEnabled: true, 
        isSeriesEnabled: false,
        seriesName: '',
        seriesDescription: '',
        seriesPassword: '',
        episodeTitle: ''
      });
      setCaptchaToken('');
      
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Post submission error:', error);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <>
      <Head>
        <title>文学作品投稿 - おぜう文庫 web</title>
        <meta name="description" content="おぜう文庫で小説、詩、エッセイなどの文学作品を投稿しよう。あなたの創作を多くの読者と共有できます。" />
        <meta name="keywords" content="おぜう文庫,ozeu bunko,ozeu文庫,文学作品投稿,小説投稿,詩投稿,エッセイ投稿,創作,文学,novel post,poetry post,essay post,creative writing" />
        <meta name="robots" content="noindex, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bunko.ozetudo.blog/post" />
        <meta property="og:title" content="文学作品投稿 - おぜう文庫 web" />
        <meta property="og:description" content="おぜう文庫で小説、詩、エッセイなどの文学作品を投稿しよう。" />
        <meta property="og:site_name" content="おぜう文庫" />
        
        <link rel="canonical" href="https://bunko.ozetudo.blog/post" />
      </Head>
      <div className={styles.container}>
        <button 
          className={styles.darkModeToggle}
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
{isDarkMode ? '☀' : '☾'}
        </button>
        <h1 className={styles.title}>投稿</h1>
        
        <nav className={styles.nav}>
          <a onClick={() => router.push('/')}>ホーム</a>
          <a className={styles.active}>投稿</a>
          <a onClick={() => router.push('/updates')}>アップデート</a>
        </nav>

        <div className={styles.toukouView}>
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {!formData.isSeriesEnabled ? (
              <div className={styles.formGroup}>
                <label htmlFor="title">タイトル</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="seriesName">連載タイトル（主タイトル）*</label>
                  <input
                    type="text"
                    id="seriesName"
                    name="seriesName"
                    value={formData.seriesName}
                    onChange={handleInputChange}
                    placeholder="連載の主タイトルを入力"
                    required
                    maxLength={100}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="episodeTitle">話数タイトル *</label>
                  <input
                    type="text"
                    id="episodeTitle"
                    name="episodeTitle"
                    value={formData.episodeTitle}
                    onChange={handleInputChange}
                    placeholder="第1話、第2話などの各話タイトルを入力"
                    required
                    maxLength={100}
                  />
                </div>
              </>
            )}
            
            <div className={styles.formGroup}>
              <label htmlFor="author">作成者</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="content">本文</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <div className={styles.commentToggleWrapper}>
                <label className={styles.commentToggleLabel}>
                  <div 
                    className={styles.commentToggleSwitch}
                    style={{
                      backgroundColor: formData.isSeriesEnabled ? '#4a90e2' : '#ccc'
                    }}
                  >
                    <div 
                      className={styles.commentToggleSlider}
                      style={{
                        left: formData.isSeriesEnabled ? '24px' : '2px'
                      }}
                    ></div>
                  </div>
                  <input
                    type="checkbox"
                    name="isSeriesEnabled"
                    checked={formData.isSeriesEnabled}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />
                  <div>
                    <div className={styles.commentToggleText}>
                      連載機能
                    </div>
                    <div className={styles.commentToggleSubtext}>
                      {formData.isSeriesEnabled ? 
                        'この投稿を連載として投稿します' : 
                        '単発投稿として投稿します'
                      }
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {formData.isSeriesEnabled && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="seriesDescription">連載説明（任意）</label>
                  <textarea
                    id="seriesDescription"
                    name="seriesDescription"
                    value={formData.seriesDescription}
                    onChange={handleInputChange}
                    placeholder="連載の説明を入力"
                    maxLength={500}
                    rows={3}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="seriesPassword">連載パスワード（任意）</label>
                  <input
                    type="password"
                    id="seriesPassword"
                    name="seriesPassword"
                    value={formData.seriesPassword}
                    onChange={handleInputChange}
                    placeholder="連載を保護するパスワードを設定（空白の場合は保護なし）"
                    maxLength={100}
                  />
                </div>
              </>
            )}
            
            <div className={styles.formGroup}>
              <div className={styles.commentToggleWrapper}>
                <label className={styles.commentToggleLabel}>
                  <div 
                    className={styles.commentToggleSwitch}
                    style={{
                      backgroundColor: formData.commentsEnabled ? '#4a90e2' : '#ccc'
                    }}
                  >
                    <div 
                      className={styles.commentToggleSlider}
                      style={{
                        left: formData.commentsEnabled ? '24px' : '2px'
                      }}
                    ></div>
                  </div>
                  <input
                    type="checkbox"
                    name="commentsEnabled"
                    checked={formData.commentsEnabled}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />
                  <div>
                    <div className={styles.commentToggleText}>
                      コメント機能
                    </div>
                    <div className={styles.commentToggleSubtext}>
                      {formData.commentsEnabled ? 
                        '読者がコメントを投稿できます' : 
                        'コメント投稿は無効になります'
                      }
                    </div>
                  </div>
                </label>
              </div>
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
            
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading || !captchaToken}
            >
              {loading ? '投稿中...' : '投稿する'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
