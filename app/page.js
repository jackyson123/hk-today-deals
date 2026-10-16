'use client';

import { useEffect, useState, useMemo } from 'react';

export default function Home() {
  const [history, setHistory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('offers'); // offers | jetso | price
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('ALL');

  useEffect(() => {
    fetch('/data/history.json')
      .then((r) => r.json())
      .then((h) => {
        setHistory(h);
        if (h?.days?.length) {
          setSelectedDate(h.days[0].date); // 預設最新一日
        }
        setLoading(false);
      })
      .catch(() => {
        // fallback 到 latest.json
        fetch('/data/latest.json')
          .then((r) => r.json())
          .then((d) => {
            if (d && (d.priceWatch || d.jetso)) {
              const day = {
                date: d.date || '今日',
                ...d,
              };
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
        <p>請先執行 <code>npm run update-data</code> 或等 GitHub Actions 更新</p>
      </div>
    );
  }

  const stores = ['ALL', 'WELLCOME', 'PARKNSHOP', 'AEON', 'JASONS', 'WATSONS', 'MANNINGS', 'SASA', 'LUNGFUNG'];
  const availableDates = (history?.days || []).map((d) => d.date);

  // 有特價嘅貨品
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

  let filteredJetso = data.jetso || [];
  if (search) {
    const q = search.toLowerCase();
    filteredJetso = filteredJetso.filter(
      (j) =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.content || '').toLowerCase().includes(q)
    );
  }

  const renderProductCard = (p, highlightOffer = false) => (
    <div
      key={p.code}
      style={{
        background: '#fff',
        padding: 16,
        borderRadius: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderLeft: highlightOffer ? '4px solid #e53935' : 'none',
      }}
    >
      <div style={{ fontWeight: 600 }}>{p.name}</div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
        {p.brand} · {p.category}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {(p.prices || []).map((pr, i) => (
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
          </span>
        ))}
      </div>

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

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>🇭🇰 香港今日著數</h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
          更新時間：{data.updatedAtHKT || data.updatedAt}
          <br />
          格價資訊通 {data.priceWatchCount ?? (data.priceWatch || []).length} 件 ·
          有特價約 {offerItems.length} 件 · Jetso Club {data.jetsoCount ?? (data.jetso || []).length} 則
          <br />
          <span style={{ fontSize: 12, color: '#888' }}>
            資料來源：消委會格價資訊通 + Jetso Club · 保留最近 7 日
          </span>
        </p>
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab('offers')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            borderRadius: 8,
            background: tab === 'offers' ? '#e53935' : '#e0e0e0',
            color: tab === 'offers' ? '#fff' : '#333',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          今日特價 ({offerItems.length})
        </button>
        <button
          onClick={() => setTab('jetso')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            borderRadius: 8,
            background: tab === 'jetso' ? '#0070f3' : '#e0e0e0',
            color: tab === 'jetso' ? '#fff' : '#333',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          最新優惠 ({filteredJetso.length})
        </button>
        <button
          onClick={() => setTab('price')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            borderRadius: 8,
            background: tab === 'price' ? '#0070f3' : '#e0e0e0',
            color: tab === 'price' ? '#fff' : '#333',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          全部格價 ({filteredPrice.length})
        </button>
      </div>

      {/* Store filter */}
      {(tab === 'offers' || tab === 'price') && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: 20,
                background: storeFilter === s ? (tab === 'offers' ? '#e53935' : '#0070f3') : '#fff',
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
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>冇搵到相關優惠</p>
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
            <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>冇搵到相關貨品</p>
          )}
          {filteredPrice.slice(0, 200).map((p) => renderProductCard(p))}
          {filteredPrice.length > 200 && (
            <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>
              只顯示前 200 件，請用搜尋收窄結果
            </p>
          )}
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
          保留最近 7 日資料 · 僅作資訊參考 · 全免費開放數據
        </div>
      </footer>
    </div>
  );
}
