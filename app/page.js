'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

const FAV_KEY = 'hk-deals-favorites';

function loadFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
}

export default function Home() {
  const [history, setHistory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('offers'); // offers | jetso | price | fav
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [favorites, setFavorites] = useState([]);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    fetch('/data/history.json')
      .then((r) => r.json())
      .then((h) => {
        setHistory(h);
        if (h?.days?.length) {
          setSelectedDate(h.days[0].date);
        }
        setLoading(false);
      })
      .catch(() => {
        fetch('/data/latest.json')
          .then((r) => r.json())
          .then((d) => {
            if (d && (d.priceWatch || d.jetso)) {
              const day = { date: d.date || '今日', ...d };
              setHistory({ days: [day] });
              setSelectedDate(day.date);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  const data = useMemo(() => {
    if (!history?.days?.length || !selectedDate) return null;
    return history.days.find((d) => d.date === selectedDate) || history.days[0];
  }, [history, selectedDate]);

  // 前一日資料（用作比較價格）
  const prevData = useMemo(() => {
    if (!history?.days?.length || !selectedDate) return null;
    const idx = history.days.findIndex((d) => d.date === selectedDate);
    if (idx < 0 || idx >= history.days.length - 1) return null;
    return history.days[idx + 1]; // days 已按新→舊排序
  }, [history, selectedDate]);

  // 建立前一日價格 map：code -> { store -> price }
  const prevPriceMap = useMemo(() => {
    const map = {};
    if (!prevData?.priceWatch) return map;
    for (const p of prevData.priceWatch) {
      map[p.code] = {};
      for (const pr of p.prices || []) {
        map[p.code][pr.store] = parseFloat(pr.price);
      }
    }
    return map;
  }, [prevData]);

  const toggleFavorite = useCallback((code) => {
    setFavorites((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `香港今日著數 · ${selectedDate || ''}`;
    const text = `睇下香港超市特價同著數！${selectedDate ? `（${selectedDate}）` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // user cancelled or failed
      }
    }
    // fallback: copy link
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('連結已複製！');
      setTimeout(() => setShareMsg(''), 2000);
    } catch {
      setShareMsg(url);
      setTimeout(() => setShareMsg(''), 4000);
    }
  }, [selectedDate]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>載入中...</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>暫時未有資料</h2>
        <p>
          請先執行 <code>npm run update-data</code> 或等 GitHub Actions 更新
        </p>
      </div>
    );
  }

  const stores = [
    'ALL',
    'WELLCOME',
    'PARKNSHOP',
    'AEON',
    'JASONS',
    'WATSONS',
    'MANNINGS',
    'SASA',
    'LUNGFUNG',
  ];
  const availableDates = (history?.days || []).map((d) => d.date);

  // 有特價
  let offerItems = (data.priceWatch || []).filter(
    (p) => Array.isArray(p.offers) && p.offers.length > 0
  );
  if (search) {
    const q = search.toLowerCase();
    offerItems = offerItems.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.offers || []).some((o) => (o.text || '').toLowerCase().includes(q))
    );
  }
  if (storeFilter !== 'ALL') {
    offerItems = offerItems.filter((p) =>
      (p.offers || []).some((o) => o.store === storeFilter)
    );
  }

  // 全部格價
  let filteredPrice = data.priceWatch || [];
  if (search) {
    const q = search.toLowerCase();
    filteredPrice = filteredPrice.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }
  if (storeFilter !== 'ALL') {
    filteredPrice = filteredPrice.filter((p) =>
      (p.prices || []).some((pr) => pr.store === storeFilter)
    );
  }

  // Jetso
  let filteredJetso = data.jetso || [];
  if (search) {
    const q = search.toLowerCase();
    filteredJetso = filteredJetso.filter(
      (j) =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.content || '').toLowerCase().includes(q)
    );
  }

  // 收藏
  const favItems = (data.priceWatch || []).filter((p) =>
    favorites.includes(p.code)
  );

  const getPriceChange = (code, store, currentPrice) => {
    const prev = prevPriceMap[code]?.[store];
    if (prev == null || isNaN(prev)) return null;
    const cur = parseFloat(currentPrice);
    if (isNaN(cur)) return null;
    const diff = cur - prev;
    if (Math.abs(diff) < 0.01) return { type: 'same', diff: 0 };
    if (diff < 0) return { type: 'down', diff };
    return { type: 'up', diff };
  };

  const renderProductCard = (p, highlightOffer = false) => {
    const isFav = favorites.includes(p.code);
    return (
      <div
        key={p.code}
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderLeft: highlightOffer ? '4px solid #e53935' : 'none',
          position: 'relative',
        }}
      >
        {/* 收藏按鈕 */}
        <button
          onClick={() => toggleFavorite(p.code)}
          title={isFav ? '取消收藏' : '加入收藏'}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          {isFav ? '⭐' : '☆'}
        </button>

        <div style={{ fontWeight: 600, paddingRight: 32 }}>{p.name}</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          {p.brand} · {p.category}
        </div>

        {/* 價格 + 升跌 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {(p.prices || []).map((pr, i) => {
            const change = getPriceChange(p.code, pr.store, pr.price);
            return (
              <span
                key={i}
                style={{
                  background: '#f0f7ff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {pr.store}: <strong>${pr.price}</strong>
                {change && change.type === 'down' && (
                  <span style={{ color: '#2e7d32', marginLeft: 4, fontSize: 12 }}>
                    ↓{Math.abs(change.diff).toFixed(1)}
                  </span>
                )}
                {change && change.type === 'up' && (
                  <span style={{ color: '#c62828', marginLeft: 4, fontSize: 12 }}>
                    ↑{change.diff.toFixed(1)}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* 特價 */}
        {(p.offers || []).length > 0 && (
          <div style={{ marginTop: 6 }}>
            {(p.offers || []).map((o, i) => (
              <div
                key={i}
                style={{
                  fontSize: 14,
                  color: '#c62828',
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                🔥 {o.store}: {o.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>🇭🇰 香港今日著數</h1>
            <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
              更新時間：{data.updatedAtHKT || data.updatedAt}
              <br />
              格價資訊通 {data.priceWatchCount ?? (data.priceWatch || []).length} 件 ·
              有特價約 {offerItems.length} 件 · Jetso Club{' '}
              {data.jetsoCount ?? (data.jetso || []).length} 則
              <br />
              <span style={{ fontSize: 12, color: '#888' }}>
                資料來源：消委會格價資訊通 + Jetso Club · 保留最近 7 日
              </span>
            </p>
          </div>
          <button
            onClick={handleShare}
            style={{
              padding: '8px 14px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            分享
          </button>
        </div>
        {shareMsg && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: '#e8f5e9',
              borderRadius: 6,
              fontSize: 13,
              color: '#2e7d32',
              wordBreak: 'break-all',
            }}
          >
            {shareMsg}
          </div>
        )}
      </header>

      {/* 日期選擇 */}
      {availableDates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>選擇日期</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowX: 'auto' }}>
            {availableDates.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDate(d);
                  setSearch('');
                }}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: 20,
                  background: selectedDate === d ? '#111' : '#eee',
                  color: selectedDate === d ? '#fff' : '#333',
                  fontSize: 13,
                  fontWeight: selectedDate === d ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {d}
              </button>
            ))}
          </div>
          {prevData && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
              與 {prevData.date} 比較：綠色 ↓ 跌價 · 紅色 ↑ 升價
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="搜尋貨品 / 優惠..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 16,
            border: '1px solid #ddd',
            borderRadius: 8,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'offers', label: `今日特價 (${offerItems.length})`, color: '#e53935' },
          { id: 'jetso', label: `最新優惠 (${filteredJetso.length})`, color: '#0070f3' },
          { id: 'price', label: `全部格價 (${filteredPrice.length})`, color: '#0070f3' },
          { id: 'fav', label: `收藏 (${favItems.length})`, color: '#f9a825' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '10px 6px',
              border: 'none',
              borderRadius: 8,
              background: tab === t.id ? t.color : '#e0e0e0',
              color: tab === t.id ? '#fff' : '#333',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Store filter */}
      {(tab === 'offers' || tab === 'price' || tab === 'fav') && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: 20,
                background:
                  storeFilter === s
                    ? tab === 'offers'
                      ? '#e53935'
                      : tab === 'fav'
                        ? '#f9a825'
                        : '#0070f3'
                    : '#fff',
                color: storeFilter === s ? '#fff' : '#333',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {s === 'ALL' ? '全部' : s}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === 'offers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {offerItems.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>
              暫時冇特價資料
            </p>
          )}
          {offerItems.map((p) => renderProductCard(p, true))}
        </div>
      )}

      {tab === 'jetso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredJetso.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>
              冇搵到相關優惠
            </p>
          )}
          {filteredJetso.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: '#fff',
                padding: 16,
                borderRadius: 10,
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                {item.content}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#999',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{item.pubDate}</span>
                <span style={{ color: '#888' }}>來源：Jetso Club</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {tab === 'price' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPrice.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>
              冇搵到相關貨品
            </p>
          )}
          {filteredPrice.slice(0, 200).map((p) => renderProductCard(p))}
          {filteredPrice.length > 200 && (
            <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>
              只顯示前 200 件，請用搜尋收窄結果
            </p>
          )}
        </div>
      )}

      {tab === 'fav' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {favItems.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>
              尚未收藏任何貨品
              <br />
              <span style={{ fontSize: 13 }}>撳 ☆ 就可以加入收藏</span>
            </p>
          )}
          {favItems.map((p) => renderProductCard(p, (p.offers || []).length > 0))}
        </div>
      )}

      <footer
        style={{
          marginTop: 40,
          padding: 20,
          textAlign: 'center',
          color: '#666',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600 }}>資料來源</div>
        <div>
          超市格價及特價：消費者委員會「格價資訊通」
          <br />
          <a
            href="https://online-price-watch.consumer.org.hk/opw"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0070f3' }}
          >
            online-price-watch.consumer.org.hk
          </a>
        </div>
        <div style={{ marginTop: 8 }}>
          最新優惠：Jetso Club 著數俱樂部
          <br />
          <a
            href="https://www.jetsoclub.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0070f3' }}
          >
            jetsoclub.com
          </a>
        </div>
        <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
          保留最近 7 日資料 · 收藏儲存於本機 · 僅作資訊參考
        </div>
      </footer>
    </div>
  );
}
