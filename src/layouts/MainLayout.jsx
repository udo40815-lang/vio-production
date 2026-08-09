import React from 'react';
import { V } from '../utils/design-system.jsx';

export default function MainLayout({ ui, children }) {
  return (
    <div style={{ background: ui.dark ? V.dark : V.light, minHeight: '100vh', color: ui.textPrimary }} className="antialiased font-sans">
      {children}
    </div>
  );
}
