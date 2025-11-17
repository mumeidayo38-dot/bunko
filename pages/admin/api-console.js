import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';

export default function ApiConsole() {
  const [masterKey, setMasterKey] = useState('');
  const [endpoint, setEndpoint] = useState('/api/bunko');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  const commonEndpoints = [
    { value: '/api/bunko', label: '文庫一覧取得', method: 'GET' },
    { value: '/api/bunko', label: '文庫投稿', method: 'POST' },
    { value: '/api/bunko/[id]', label: '文庫削除', method: 'DELETE' },
    { value: '/api/admin/delete', label: '管理者削除', method: 'POST' },
    { value: '/api/admin/ban', label: 'IP BAN', method: 'POST' },
    { value: '/api/admin/banned-list', label: 'BAN一覧', method: 'GET' },
    { value: '/api/admin/filter-content', label: 'フィルター管理', method: 'POST' },
    { value: '/api/admin/toggle-comments', label: 'コメント切替', method: 'POST' },
    { value: '/api/updates', label: 'アップデート一覧', method: 'GET' },
    { value: '/api/comments', label: 'コメント操作', method: 'GET/POST/DELETE' },
    { value: '/api/likes', label: 'いいね操作', method: 'POST' },
  ];

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAuthenticated) {
      router.push('/admin');
      return;
    }

    const savedKey = localStorage.getItem('adminMasterKey');
    if (savedKey) {
      setMasterKey(savedKey);
    }

    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark-mode');
    }
  }, [router]);

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

  const saveMasterKey = () => {
    localStorage.setItem('adminMasterKey', masterKey);
    alert('マスターキーを保存しました');
  };

  const executeRequest = async () => {
    if (!masterKey) {
      alert('マスターキーを入力してください');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${masterKey}`
        }
      };

      if (method !== 'GET' && requestBody) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody));
        } catch (e) {
          setResponse({
            error: 'JSONパースエラー',
            message: e.message
          });
          setLoading(false);
          return;
        }
      }

      const res = await fetch(endpoint, options);
      const data = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data
      });
    } catch (error) {
      setResponse({
        error: 'リクエストエラー',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const selectEndpoint = (ep) => {
    setEndpoint(ep.value);
    setMethod(ep.method.split('/')[0]);
  };

  const logout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminMasterKey');
    router.push('/admin');
  };

  return (
    <>
      <Head>
        <title>API コンソール - おぜう文庫 Admin</title>
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

        <h1 className={styles.title}>API コンソール</h1>

        <nav className={styles.nav}>
          <a onClick={() => router.push('/admin/dashboard')}>ダッシュボード</a>
          <a onClick={() => router.push('/admin/updates')}>アップデート管理</a>
          <a className={styles.active}>API コンソール</a>
          <a onClick={logout}>ログアウト</a>
        </nav>

        <div className={styles.homeView}>
          <div className={styles.apiConsole}>
            {/* マスターキー設定 */}
            <div className={styles.section}>
              <h2>マスターキー設定</h2>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder="マスターキーを入力"
                  className={styles.input}
                />
                <button onClick={saveMasterKey} className={styles.button}>
                  保存
                </button>
              </div>
              <p className={styles.hint}>
                マスターキーは環境変数 ADMIN_MASTER_KEY に設定された値です
              </p>
            </div>

            {/* よく使うエンドポイント */}
            <div className={styles.section}>
              <h2>よく使うエンドポイント</h2>
              <div className={styles.endpointList}>
                {commonEndpoints.map((ep, index) => (
                  <button
                    key={index}
                    onClick={() => selectEndpoint(ep)}
                    className={styles.endpointButton}
                  >
                    <strong>{ep.label}</strong>
                    <br />
                    <small>{ep.method} {ep.value}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* リクエスト設定 */}
            <div className={styles.section}>
              <h2>リクエスト設定</h2>
              <div className={styles.inputGroup}>
                <label>HTTPメソッド:</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={styles.select}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>エンドポイント:</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/..."
                  className={styles.input}
                />
              </div>

              {method !== 'GET' && (
                <div className={styles.inputGroup}>
                  <label>リクエストボディ (JSON):</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className={styles.textarea}
                    rows={6}
                  />
                </div>
              )}

              <button
                onClick={executeRequest}
                disabled={loading}
                className={styles.button}
              >
                {loading ? '実行中...' : 'リクエスト実行'}
              </button>
            </div>

            {/* レスポンス */}
            {response && (
              <div className={styles.section}>
                <h2>レスポンス</h2>
                <div className={styles.response}>
                  {response.error ? (
                    <div className={styles.error}>
                      <strong>{response.error}:</strong> {response.message}
                    </div>
                  ) : (
                    <>
                      <div className={styles.statusBadge}>
                        <strong>ステータス:</strong> {response.status} {response.statusText}
                      </div>
                      <pre className={styles.jsonOutput}>
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
