import React from 'react';
import { V } from '../utils/design-system.jsx';

export default function AuthLayout({ dark, children }) {
  return (
    <div className="min-h-screen relative overflow-hidden font-sans"
      style={{ background: dark ? '#0B1020' : '#F8FAFC', color: dark ? '#F8FAFC' : '#0F1226' }}>
      {children}
    </div>
  );
}
