import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* フォント読み込み */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        
        {/* SEO向けメタタグ */}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta n
        ame="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* PWA対応 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* DNS prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* 検索エンジン向け */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedDarkMode = localStorage.getItem('darkMode') === 'true';
                  if (savedDarkMode) {
                    document.documentElement.classList.add('dark-mode');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
