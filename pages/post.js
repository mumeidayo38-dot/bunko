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
    content: ''
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
    
    try {
      const response = await fetch('/api/bunko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          captchaToken
        })
      });

      const data = await response.json();
      console.log('API response:', { status: response.status, data });

      if (!response.ok) {
        const errorMsg = data.error || '投稿に失敗しました';
        const details = data.details ? ` (詳細: ${data.details})` : '';
        throw new Error(errorMsg + details);
      }

      showMessage('投稿が完了しました', 'success');
      setFormData({ title: '', author: '', content: '' });
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Head>
        <title>投稿 - 文庫</title>
      </Head>
      <div className={styles.container}>
        <h1 className={styles.title}>投稿</h1>
        
        <nav className={styles.nav}>
          <a onClick={() => router.push('/')}>ホーム</a>
          <a className={styles.active}>投稿</a>
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
              <label>認証</label>
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
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
