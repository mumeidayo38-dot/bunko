import { useEffect } from 'react';
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // ページ読み込み前にダークモード状態を即座に適用
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      if (savedDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, []);

  return <Component {...pageProps} />
}
