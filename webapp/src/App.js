import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [wallet, setWallet] = useState(null);

  return wallet
    ? <Dashboard wallet={wallet} onLogout={() => setWallet(null)} />
    : <Login onLogin={setWallet} />;
}