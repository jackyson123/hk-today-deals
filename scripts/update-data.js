
/** * 每日更新即日資料 * 抓取：消委會格價資訊通 + Jetso Club RSS * 輸出：public/data/latest.json （只保留今日） */

const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");

const PRICE_WATCH_URL =
  "https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json";
const JETSO_RSS = "https://feeds2.feedburner.com/jetsoclub";

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "HK-Today-Deals/1.0" },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
  return res.json();
}

async function fetchJetso() {
  const parser = new Parser({
    timeout: 15000,
    headers: { "User-Agent": "HK-Today-Deals/1.0" },
  });
  try {
    const feed = await parser.parseURL(JETSO_RSS);
    return (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || item.isoDate || "",
      content: (item.contentSnippet || item.content || "").slice(0, 300),
    }));
  } catch (err) {
    console.warn("Jetso RSS error:", err.message);
    return [];
  }
}

async function main() {
  console.log("開始更新即日資料...");

  // 1. 格價資訊通
  let priceWatch = [];
  try {
    const raw = await fetchJson(PRICE_WATCH_URL);
    // 結構是 array of products
    priceWatch = (Array.isArray(raw) ? raw : []).slice(0, 3000).map((p) => ({
      code: p.code,
      brand: p.brand?.["zh-Hant"] || p.brand?.en || "",
      name: p.name?.["zh-Hant"] || p.name?.en || "",
      category: p.cat1Name?.["zh-Hant"] || p.cat1Name?.en || "",
      prices: (p.prices || []).map((pr) => ({
        store: pr.supermarketCode,
        price: pr.price,
      })),
      offers: (p.offers || []).map((o) => ({
        store: o.supermarketCode,
        text: o["zh-Hant"] || o.en || "",
      })),
    }));
    console.log(`格價資訊通：${priceWatch.length} 件貨品`);
  } catch (err) {
    console.error("格價資訊通錯誤:", err.message);
  }

  // 2. Jetso Club
  const jetso = await fetchJetso();
  console.log(`Jetso Club：${jetso.length} 則優惠`);

  // 3. 組合即日資料
  const data = {
    updatedAt: new Date().toISOString(),
    updatedAtHKT: new Date().toLocaleString("zh-HK", {
      timeZone: "Asia/Hong_Kong",
    }),
    priceWatchCount: priceWatch.length,
    jetsoCount: jetso.length,
    priceWatch,
    jetso,
  };

  const outPath = path.join(__dirname, "..", "public", "data", "latest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");

  console.log(`已寫入 ${outPath}`);
  console.log(`更新時間：${data.updatedAtHKT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
