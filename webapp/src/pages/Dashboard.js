import React, { useState, useEffect, useCallback } from 'react';
import PassportModal from '../components/PassportModal';

const API = process.env.REACT_APP_API_URL || '';

const s = {
  wrap: { minHeight: '100vh', background: '#0f1117', padding: '0 0 40px' },
  nav: {
    background: '#1a1f2e', borderBottom: '1px solid #2d3748',
    padding: '0 32px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', height: 60,
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  navTitle: { fontSize: 18, fontWeight: 700, color: '#fff' },
  navAddr: {
    fontSize: 12, color: '#a0aec0', background: '#0f1117',
    padding: '4px 10px', borderRadius: 20, border: '1px solid #2d3748',
  },
  navRight: { display: 'flex', gap: 10 },
  btnOutline: {
    padding: '7px 14px', background: 'transparent',
    border: '1px solid #2d3748', borderRadius: 8,
    color: '#a0aec0', fontSize: 13, cursor: 'pointer',
  },
  btnPrimary: {
    padding: '7px 14px',
    background: 'linear-gradient(135deg, #f6a623, #e55a2b)',
    border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16, padding: '24px 32px 0',
  },
  statCard: {
    background: '#1a1f2e', border: '1px solid #2d3748',
    borderRadius: 12, padding: '20px 24px',
  },
  statLabel: { fontSize: 12, color: '#718096', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 26, fontWeight: 700, color: '#fff' },
  statSub: { fontSize: 12, color: '#718096', marginTop: 4 },
  positive: { color: '#68d391' },
  negative: { color: '#fc8181' },
  neutral: { color: '#f6ad55' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 32px 0' },
  card: {
    background: '#1a1f2e', border: '1px solid #2d3748',
    borderRadius: 12, padding: '20px 24px',
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 },
  aiBox: {
    background: '#0f1117', border: '1px solid #2d3748',
    borderRadius: 8, padding: '14px 16px',
    fontSize: 13, color: '#a0aec0', lineHeight: 1.7,
  },
  agentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  agentLabel: { fontSize: 13, color: '#a0aec0' },
  toggle: {
    position: 'relative', width: 40, height: 22,
    background: '#2d3748', borderRadius: 11, cursor: 'pointer',
    border: 'none', transition: 'background 0.2s',
  },
  toggleOn: { background: '#48bb78' },
  toggleKnob: {
    position: 'absolute', top: 3, left: 3,
    width: 16, height: 16, background: '#fff',
    borderRadius: '50%', transition: 'left 0.2s',
  },
  toggleKnobOn: { left: 21 },
  walletRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  walletLabel: { fontSize: 13, color: '#a0aec0', display: 'flex', alignItems: 'center', gap: 6 },
  walletBal: { fontSize: 15, fontWeight: 600, color: '#fff' },
  rebalInput: {
    width: '100%', background: '#0f1117', border: '1px solid #2d3748',
    borderRadius: 8, padding: '10px 12px', color: '#fff',
    fontSize: 14, marginBottom: 10, outline: 'none',
  },
  rebalBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btnHot: {
    padding: '10px', background: '#c05621', border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnCold: {
    padding: '10px', background: '#2b6cb0', border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  txItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #2d3748', fontSize: 13,
  },
  txHash: { color: '#63b3ed', fontFamily: 'monospace', fontSize: 12 },
  txVal: { fontWeight: 600, color: '#fff' },
  badge: {
    display: 'inline-block', padding: '2px 8px',
    borderRadius: 12, fontSize: 11, fontWeight: 600,
  },
  loading: { color: '#718096', fontSize: 13, textAlign: 'center', padding: 20 },
  alert: {
    margin: '16px 32px 0', padding: '12px 16px',
    background: '#1a2a1a', border: '1px solid #276749',
    borderRadius: 8, color: '#68d391', fontSize: 13,
  },
  alertInput: {
    display: 'flex', gap: 8, marginTop: 8,
  },
  smallInput: {
    flex: 1, background: '#0f1117', border: '1px solid #2d3748',
    borderRadius: 6, padding: '7px 10px', color: '#fff',
    fontSize: 13, outline: 'none',
  },
  smallBtn: {
    padding: '7px 14px', background: '#276749', border: 'none',
    borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer',
  },
};

export default function Dashboard({ wallet, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRebalance, setAutoRebalance] = useState(false);
  const [whaleAlert, setWhaleAlert] = useState(false);
  const [alertPct, setAlertPct] = useState('');
  const [alertSet, setAlertSet] = useState(false);
  const [rebalAmount, setRebalAmount] = useState('0.01');
  const [rebalMsg, setRebalMsg] = useState('');
  const [showPassport, setShowPassport] = useState(false);
  const [history, setHistory] = useState([]);

  const shortAddr = wallet ? wallet.slice(0, 6) + '...' + wallet.slice(-4) : '';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/status`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Status fetch error', e);
    }
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/history`);
      const json = await res.json();
      setHistory(json.transactions || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchHistory]);

  async function doRebalance(direction) {
    setRebalMsg('Processing...');
    try {
      const res = await fetch(`${API}/api/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, amount: parseFloat(rebalAmount) }),
      });
      const json = await res.json();
      setRebalMsg(json.message || 'Done!');
      setTimeout(fetchStatus, 3000);
    } catch (e) {
      setRebalMsg('Error: ' + e.message);
    }
  }

  async function toggleAgent(type) {
    if (type === 'auto') {
      const next = !autoRebalance;
      setAutoRebalance(next);
      await fetch(`${API}/api/agent/autobalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } else if (type === 'whale') {
      const next = !whaleAlert;
      setWhaleAlert(next);
      await fetch(`${API}/api/agent/whalealert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    }
  }

  async function setAlert() {
    if (!alertPct || isNaN(parseFloat(alertPct))) return;
    await fetch(`${API}/api/agent/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: parseFloat(alertPct) }),
    });
    setAlertSet(true);
  }

  const change = parseFloat(data?.change24h || 0);
  const changeColor = change > 0 ? s.positive : change < 0 ? s.negative : s.neutral;

  return (
    <div style={s.wrap}>
      {showPassport && (
        <PassportModal wallet={wallet} onClose={() => setShowPassport(false)} api={API} />
      )}

      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={{ fontSize: 24 }}>🐐</span>
          <span style={s.navTitle}>GOAT Wallet Agent</span>
          <span style={s.navAddr}>{shortAddr}</span>
        </div>
        <div style={s.navRight}>
          <button style={s.btnOutline} onClick={() => setShowPassport(true)}>🪪 Credit Passport</button>
          <button style={s.btnOutline} onClick={fetchStatus}>↻ Refresh</button>
          <button style={s.btnOutline} onClick={onLogout}>Disconnect</button>
        </div>
      </nav>

      {loading ? (
        <div style={s.loading}>Loading live data...</div>
      ) : (
        <>
          <div style={s.grid}>
            {[
              ['ETH Price', data?.price ? `$${Number(data.price).toLocaleString()}` : 'N/A', data?.source || '', null],
              ['24h Change', `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, 'vs yesterday', changeColor],
              ['Hot Wallet', data?.balances?.hot || '...', '🔥 Active', null],
              ['Cold Wallet', data?.balances?.cold || '...', '🧊 Vault', null],
              ['Demand Signal', data?.demand?.signal || '...', data?.demand?.action || '', null],
            ].map(([label, value, sub, color]) => (
              <div key={label} style={s.statCard}>
                <div style={s.statLabel}>{label}</div>
                <div style={{ ...s.statValue, ...(color || {}) }}>{value}</div>
                <div style={s.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={s.row}>
            <div style={s.card}>
              <div style={s.cardTitle}>🤖 AI Recommendation</div>
              <div style={s.aiBox}>{data?.recommendation || 'Loading AI analysis...'}</div>

              <div style={{ marginTop: 20 }}>
                <div style={s.cardTitle}>⚙️ Agent Controls</div>
                {[
                  ['Auto-rebalance', autoRebalance, () => toggleAgent('auto')],
                  ['Whale alerts', whaleAlert, () => toggleAgent('whale')],
                ].map(([label, on, toggle]) => (
                  <div key={label} style={s.agentRow}>
                    <span style={s.agentLabel}>{label}</span>
                    <button
                      style={{ ...s.toggle, ...(on ? s.toggleOn : {}) }}
                      onClick={toggle}
                    >
                      <span style={{ ...s.toggleKnob, ...(on ? s.toggleKnobOn : {}) }} />
                    </button>
                  </div>
                ))}
                <div style={s.agentRow}>
                  <span style={s.agentLabel}>Price alert {alertSet ? `(${alertPct}%)` : ''}</span>
                  <div style={s.alertInput}>
                    <input
                      style={s.smallInput}
                      placeholder="e.g. 5"
                      value={alertPct}
                      onChange={e => { setAlertPct(e.target.value); setAlertSet(false); }}
                    />
                    <button style={s.smallBtn} onClick={setAlert}>Set</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>💸 Rebalance Wallets</div>
              <div style={s.walletRow}>
                <span style={s.walletLabel}>🔥 Hot wallet</span>
                <span style={s.walletBal}>{data?.balances?.hot || '...'}</span>
              </div>
              <div style={s.walletRow}>
                <span style={s.walletLabel}>🧊 Cold wallet</span>
                <span style={s.walletBal}>{data?.balances?.cold || '...'}</span>
              </div>
              <div style={{ marginTop: 16, marginBottom: 6, fontSize: 12, color: '#718096' }}>Amount (ETH)</div>
              <input
                style={s.rebalInput}
                value={rebalAmount}
                onChange={e => setRebalAmount(e.target.value)}
                placeholder="0.01"
              />
              <div style={s.rebalBtns}>
                <button style={s.btnHot} onClick={() => doRebalance('hot')}>→ Hot wallet</button>
                <button style={s.btnCold} onClick={() => doRebalance('cold')}>→ Cold wallet</button>
              </div>
              {rebalMsg && <div style={{ marginTop: 10, fontSize: 13, color: '#68d391' }}>{rebalMsg}</div>}
            </div>
          </div>

          <div style={{ padding: '16px 32px 0' }}>
            <div style={s.card}>
              <div style={s.cardTitle}>📜 Recent Transactions</div>
              {history.length === 0 ? (
                <div style={s.loading}>No transactions found — add ETHERSCAN_API_KEY to enable history</div>
              ) : (
                history.slice(0, 6).map((tx, i) => (
                  <div key={i} style={s.txItem}>
                    <div>
                      <div style={s.txHash}>{tx.hash?.slice(0, 18)}...</div>
                      <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{tx.age}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={s.txVal}>{tx.value}</div>
                      <span style={{
                        ...s.badge,
                        background: tx.direction === 'IN' ? '#1a2a1a' : '#2a1a1a',
                        color: tx.direction === 'IN' ? '#68d391' : '#fc8181',
                      }}>{tx.direction}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}