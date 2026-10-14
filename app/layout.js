export const metadata = {
  title: '香港今日著數 | HK Today Deals',
  description: '每日免費更新香港超市價格 + 最新優惠（格價資訊通 + Jetso Club）',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-HK">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  );
}
