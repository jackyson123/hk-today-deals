/**
 * 每日更新資料（保留最近 7 日）
 * 抓取：消委會格價資訊通 + Jetso Club RSS
 * 輸出：
 *   public/data/history.json  （最近 7 日）
 *   public/data/latest.json   （今日，方便相容）
 */

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');

const PRICE_WATCH_URL = 'https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json';
const JETSO_RSS = 'https://feeds2.feedburner.com/jetsoclub';
const MAX_DAYS = 7;

function getHKTDateString(d = new Date()) {
  // 回傳 YYYY-MM-DD（香港時間）
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'HK-Today-Deals/1.0' },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
  return res.json();
}

async function fetchJetso() {
  const parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'HK-Today-Deals/1.0' },
  });
  try {
    const feed = await parser.parseURL(JETSO_RSS);
    return (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || '',
      content: (item.contentSnippet || item.content || '').slice(0, 300),
    }));
  } catch (err) {
    console.warn('Jetso RSS error:', err.message);
    return [];
  }
}

async function main() {
  console.log('開始更新資料（保留最近 7 日）...');

  const today = getHKTDateString();
  console.log(`今日（HKT）：${today}`);

  // 1. 格價資訊通
  let priceWatch = [];
  try {
    const raw = await fetchJson(PRICE_WATCH_URL);
    priceWatch = (Array.isArray(raw) ? raw : []).slice(0, 3000).map((p) => ({
      code: p.code,
      brand: p.brand?.['zh-Hant'] || p.brand?.en || '',
      name: p.name?.['zh-Hant'] || p.name?.en || '',
      category: p.cat1Name?.['zh-Hant'] || p.cat1Name?.en || '',
      prices: (p.prices || []).map((pr) => ({
        store: pr.supermarketCode,
        price: pr.price,
      })),
      offers: (p.offers || []).map((o) => ({
        store: o.supermarketCode,
        text: o['zh-Hant'] || o.en || '',
      })),
    }));
    console.log(`格價資訊通：${priceWatch.length} 件貨品`);
  } catch (err) {
    console.error('格價資訊通錯誤:', err.message);
  }

  // 2. Jetso Club
  const jetso = await fetchJetso();
  console.log(`Jetso Club：${jetso.length} 則優惠`);

  // 3. 今日資料
  const todayData = {
    date: today,
    updatedAt: new Date().toISOString(),
    updatedAtHKT: new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }),
    priceWatchCount: priceWatch.length,
    jetsoCount: jetso.length,
    priceWatch,
    jetso,
  };

  // 4. 讀取現有 history，合併，只保留最近 7 日
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const historyPath = path.join(dataDir, 'history.json');
  const latestPath = path.join(dataDir, 'latest.json');

  let days = [];
  if (fs.existsSync(historyPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      days = Array.isArray(existing.days) ? existing.days : [];
    } catch (e) {
      console.warn('讀取 history.json 失敗，重新開始');
    }
  }

  // 移除同日舊資料，再加入今日
  days = days.filter((d) => d.date !== today);
  days.unshift(todayData);

  // 只保留最近 MAX_DAYS 日（按日期排序）
  days.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新 → 舊
  days = days.slice(0, MAX_DAYS);

  const history = {
    updatedAt: new Date().toISOString(),
    updatedAtHKT: new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }),
    days,
  };

  fs.writeFileSync(historyPath, JSON.stringify(history), 'utf8'); // 唔 indent 以慳位
  fs.writeFileSync(latestPath, JSON.stringify(todayData, null, 2), 'utf8');

  console.log(`已寫入 history.json（${days.length} 日）同 latest.json`);
  console.log(`日期：${days.map((d) => d.date).join(', ')}`);
  console.log(`更新時間：${todayData.updatedAtHKT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
