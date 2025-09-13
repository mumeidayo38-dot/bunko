import { useState } from 'react';
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
    commentsEnabled: true
  });
  const [captchaToken, setCaptchaToken] = useState('');
  const router = useRouter();

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
    
    setLoading(true);
    
    const requestData = {
      ...formData,
      captchaToken
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
      setFormData({ title: '', author: '', content: '', commentsEnabled: true });
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
        <title>投稿 - おぜう文庫 web</title>
      </Head>
      <div className={styles.container}>
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
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '50px',
                    height: '28px',
                    backgroundColor: formData.commentsEnabled ? '#4a90e2' : '#ccc',
                    borderRadius: '14px',
                    transition: 'background-color 0.3s',
                    marginRight: '12px'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: formData.commentsEnabled ? '24px' : '2px',
                      width: '24px',
                      height: '24px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                  </div>
                  <input
                    type="checkbox"
                    name="commentsEnabled"
                    checked={formData.commentsEnabled}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      コメント機能
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
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
