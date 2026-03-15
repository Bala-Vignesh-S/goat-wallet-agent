import React, { useState } from 'react';

const styles = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#0f1117',
  },
  card: {
    background: '#1a1f2e', border: '1px solid #2d3748',
    borderRadius: 16, padding: '48px 40px', width: 380,
    textAlign: 'center',
  },
  logo: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#718096', marginBottom: 36, lineHeight: 1.6 },
  btn: {
    width: '100%', padding: '14px 24px',
    background: 'linear-gradient(135deg, #f6a623, #e55a2b)',
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  error: {
    marginTop: 16, padding: '10px 16px', background: '#2d1515',
    border: '1px solid #e53e3e', borderRadius: 8,
    color: '#fc8181', fontSize: 13,
  },
  features: {
    marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 10, textAlign: 'left',
  },
  feature: {
    background: '#0f1117', borderRadius: 8, padding: '10px 12px',
    fontSize: 12, color: '#a0aec0',
  },
  featureTitle: { color: '#e2e8f0', fontWeight: 600, marginBottom: 2, fontSize: 13 },
};

export default function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    setError('');
    setLoading(true);
    try {
      if (!window.ethereum) {
        setError('MetaMask not found. Please install the MetaMask browser extension.');
        setLoading(false);
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        setError('No accounts found. Please unlock MetaMask.');
        setLoading(false);
        return;
      }
      onLogin(accounts[0]);
    } catch (e) {
      setError(e.message || 'Connection failed. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🐐</div>
        <div style={styles.title}>GOAT Wallet Agent</div>
        <div style={styles.sub}>
          AI-powered hot/cold wallet manager with live market intelligence and Web3 credit passport.
        </div>
        <button style={styles.btn} onClick={connectWallet} disabled={loading}>
          <span>🦊</span>
          {loading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.features}>
          {[
            ['📊', 'Live Dashboard', 'Real-time ETH prices'],
            ['🤖', 'AI Agent', 'Gemini-powered decisions'],
            ['🔄', 'Auto Rebalance', 'Smart fund management'],
            ['🪪', 'Credit Passport', 'Web3 credibility score'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={styles.feature}>
              <div style={styles.featureTitle}>{icon} {title}</div>
              {desc}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}