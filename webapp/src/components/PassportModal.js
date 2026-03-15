import React, { useState, useEffect } from 'react';

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#1a1f2e', border: '1px solid #2d3748',
    borderRadius: 16, padding: '32px', width: '100%', maxWidth: 500,
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, color: '#fff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#718096',
    fontSize: 20, cursor: 'pointer',
  },
  scoreCircle: {
    width: 120, height: 120, borderRadius: '50%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 24px',
    border: '4px solid',
  },
  scoreNum: { fontSize: 32, fontWeight: 800 },
  scoreLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  grade: { fontSize: 14, color: '#a0aec0', textAlign: 'center', marginBottom: 24 },
  breakdown: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  item: {
    background: '#0f1117', borderRadius: 10, padding: '14px 16px',
    border: '1px solid #2d3748',
  },
  itemLabel: { fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  itemValue: { fontSize: 18, fontWeight: 700, color: '#fff' },
  itemSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  bar: { height: 4, borderRadius: 2, background: '#2d3748', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 2, transition: 'width 1s ease' },
  addr: {
    marginTop: 20, padding: '10px 14px', background: '#0f1117',
    border: '1px solid #2d3748', borderRadius: 8,
    fontSize: 12, color: '#a0aec0', fontFamily: 'monospace',
    wordBreak: 'break-all', textAlign: 'center',
  },
  shareBtn: {
    width: '100%', marginTop: 16, padding: '12px',
    background: 'linear-gradient(135deg, #f6a623, #e55a2b)',
    border: 'none', borderRadius: 8, color: '#fff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  loading: { textAlign: 'center', color: '#718096', padding: '40px 0' },
};

function getGrade(score) {
  if (score >= 800) return { label: 'Elite', color: '#f6ad55' };
  if (score >= 600) return { label: 'Advanced', color: '#68d391' };
  if (score >= 400) return { label: 'Intermediate', color: '#63b3ed' };
  if (score >= 200) return { label: 'Beginner', color: '#a0aec0' };
  return { label: 'New Wallet', color: '#718096' };
}

export default function PassportModal({ wallet, onClose, api }) {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPassport() {
      try {
        const res = await fetch(`${api}/api/passport/${wallet}`);
        const json = await res.json();
        setPassport(json);
      } catch (e) {
        console.error('Passport fetch error', e);
      }
      setLoading(false);
    }
    fetchPassport();
  }, [wallet, api]);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/passport/${wallet}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const grade = passport ? getGrade(passport.score) : null;

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.title}>🪪 Web3 Credit Passport</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={s.loading}>Analysing wallet activity...</div>
        ) : passport ? (
          <>
            <div style={{
              ...s.scoreCircle,
              borderColor: grade.color,
              color: grade.color,
            }}>
              <div style={s.scoreNum}>{passport.score}</div>
              <div style={s.scoreLabel}>/ 1000</div>
            </div>

            <div style={s.grade}>
              <strong style={{ color: grade.color }}>{grade.label}</strong> — {passport.summary}
            </div>

            <div style={s.breakdown}>
              {passport.breakdown.map(item => (
                <div key={item.label} style={s.item}>
                  <div style={s.itemLabel}>{item.label}</div>
                  <div style={s.itemValue}>{item.value}</div>
                  <div style={s.itemSub}>{item.detail}</div>
                  <div style={s.bar}>
                    <div style={{
                      ...s.barFill,
                      width: `${item.pct}%`,
                      background: grade.color,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={s.addr}>{wallet}</div>
            <button style={s.shareBtn} onClick={copyLink}>
              {copied ? '✓ Link copied!' : '🔗 Copy shareable passport link'}
            </button>
          </>
        ) : (
          <div style={s.loading}>Failed to load passport data.</div>
        )}
      </div>
    </div>
  );
}