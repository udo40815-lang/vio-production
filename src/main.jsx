// ============================================================================
// Vio v2.0 — Production Entry Point
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ---------------------------------------------------------------------------
// Production Error Boundary (catches top-level errors)
// ---------------------------------------------------------------------------
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[Vio Fatal]', error, info); }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#070A18', color:'#F8FAFC', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ textAlign:'center', maxWidth:380, padding:24 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠</div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0, marginBottom:8 }}>Something went wrong</h1>
            <p style={{ fontSize:14, color:'rgba(248,250,252,0.6)', lineHeight:1.6, marginBottom:20 }}>An unexpected error occurred. Please refresh the page.</p>
            <details style={{ textAlign:'left', marginBottom:20 }}>
              <summary style={{ fontSize:12, color:'rgba(248,250,252,0.4)', cursor:'pointer' }}>Error details</summary>
              <pre style={{ fontSize:11, color:'rgba(248,250,252,0.55)', background:'rgba(255,255,255,0.04)', padding:12, borderRadius:8, marginTop:8, overflow:'auto', maxHeight:200, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{this.state.error?.message || String(this.state.error)}</pre>
            </details>
            <button onClick={() => window.location.reload()} style={{ padding:'12px 28px', borderRadius:24, border:'none', background:'linear-gradient(135deg, #5B3DF5 0%, #7C3AED 100%)', color:'white', fontWeight:600, fontSize:14, cursor:'pointer' }}>Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Mount — wrap in try/catch so synchronous module import errors are caught
// and the error boundary can still render.
// ---------------------------------------------------------------------------
const rootEl = document.getElementById('root');
if (!rootEl) {
  // If root element is missing, render nothing — the HTML is broken.
  // This is an extremely rare edge case.
  console.error('[Vio] #root element not found in DOM');
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('[Vio] Bootstrap failed:', err);
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070A18;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
        <div style="text-align:center;max-width:380px;padding:24px">
          <div style="font-size:48px;margin-bottom:16px">⚠</div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Configuration Error</h1>
          <p style="font-size:14px;color:rgba(248,250,252,0.6);line-height:1.6;margin-bottom:12px">The application could not start due to a configuration issue.</p>
          <pre style="font-size:11px;color:rgba(248,250,252,0.55);background:rgba(255,255,255,0.04);padding:12px;border-radius:8px;overflow:auto;max-height:200px;white-space:pre-wrap;word-break:break-word;text-align:left">${err?.message || String(err)}</pre>
          <button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;border-radius:24px;border:none;background:linear-gradient(135deg,#5B3DF5 0%,#7C3AED 100%);color:white;font-weight:600;font-size:14px;cursor:pointer">Refresh</button>
        </div>
      </div>`;
  }
}
