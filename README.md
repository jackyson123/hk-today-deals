# 🇭🇰 香港今日著數 (HK Today Deals)

全免費、只顯示**即日**香港優惠 + 超市格價。

資料來源：
- 消費者委員會「格價資訊通」（每日價格 + 優惠）
- Jetso Club RSS（最新著數）

## 功能
- 最新優惠列表（Jetso Club）
- 超市／個人護理格價（約 2,800 件貨品）
- 搜尋 + 商店過濾
- 每日自動更新（只保留今日資料，用位極少）

## 快速開始

### 1. 安裝
```bash
npm install
```

### 2. 手動更新一次資料
```bash
npm run update-data
```

### 3. 本機預覽
```bash
npm run dev
```
打開 http://localhost:3000

### 4. 部署到 Vercel
1. 把整個資料夾 push 上 GitHub
2. 去 [vercel.com](https://vercel.com) → Import 呢個 repo
3. 直接 Deploy（唔使改設定）

### 5. 自動每日更新
GitHub Actions 已經設定好，每日會自動：
- 抓最新格價資訊通 + Jetso Club
- 覆蓋 `public/data/latest.json`
- commit 返 repo

Vercel 會自動偵測到更新再重新 deploy。

你也可以喺 GitHub repo 的 Actions 頁面手動跑「Daily Update」。

## 資料結構
`public/data/latest.json` 只會有今日最新一份，永遠覆蓋，所以 repo 幾乎唔會變大。

## 技術
- Next.js 14 (App Router)
- 全靜態 JSON 資料
- GitHub Actions 每日更新
- Vercel 免費部署
