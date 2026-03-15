import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8088';
const POLL_INTERVAL = 3000;

const INCIDENT_TYPE_COLORS = {
  theft: '#f59e0b',
  robbery: '#ef4444',
  assault: '#dc2626',
  murder: '#7f1d1d',
  fire: '#f97316',
  accident: '#f59e0b',
  flood: '#3b82f6',
  medical: '#10b981',
  harassment: '#8b5cf6',
  'cyber fraud': '#6366f1',
  vandalism: '#a78bfa',
  default: '#64748b'
};

function getTypeColor(type = '') {
  return INCIDENT_TYPE_COLORS[type.toLowerCase()] || INCIDENT_TYPE_COLORS.default;
}

function PulsingDot({ color = '#22c55e' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        display: 'block', width: 10, height: 10, borderRadius: '50%',
        backgroundColor: color, animation: 'pulse 1.5s infinite'
      }} />
    </span>
  );
}

// ─── Tab: Incident Moderation ────────────────────────────────────────────────
function ModerationTab() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/admin/incidents/pending`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setIncidents(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trigger]);

  const handleAction = async (id, action) => {
    try {
      await fetch(`${API_BASE}/admin/incidents/${id}/${action}`, { method: 'PATCH' });
      setTrigger(t => t + 1);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>PENDING REPORTS</h3>
          <div className="value">{incidents.length}</div>
        </div>
        <div className="stat-card">
          <h3>QUEUE STATUS</h3>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulsingDot color={incidents.length > 0 ? '#f59e0b' : '#22c55e'} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {incidents.length > 0 ? 'Action Required' : 'All Clear'}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <h3>QUICK ACTIONS</h3>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-approve" onClick={() => setTrigger(t => t + 1)}>↻ Refresh</button>
            <button className="btn-reject" onClick={async () => {
              for (const inc of incidents) await handleAction(inc.id, 'reject');
            }}>✕ Reject All</button>
          </div>
        </div>
      </div>

      <section className="table-section">
        <div className="table-header">
          <h3>Incoming Incident Pipeline</h3>
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 16, opacity: 0.5 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>All clear — no pending incidents in queue.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Location</th>
                <th>Time</th>
                <th>AI Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} className="incident-row">
                  <td>
                    <span className="type-badge" style={{
                      background: `${getTypeColor(inc.type)}22`,
                      color: getTypeColor(inc.type),
                      border: `1px solid ${getTypeColor(inc.type)}44`
                    }}>
                      {inc.type || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 280 }}>{inc.description || 'No context supplied'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {inc.latitude ? `${Number(inc.latitude).toFixed(4)}, ${Number(inc.longitude).toFixed(4)}` : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {inc.datetime ? new Date(inc.datetime).toLocaleTimeString() : '—'}
                  </td>
                  <td>
                    <strong>{((inc.confidence || 0.5) * 100).toFixed(0)}%</strong>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${(inc.confidence || 0.5) * 100}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn-approve" onClick={() => handleAction(inc.id, 'approve')}>✔ Approve</button>
                      <button className="btn-reject" onClick={() => handleAction(inc.id, 'reject')}>✕ Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ─── Tab: Live Operations ────────────────────────────────────────────────────
function LiveOperationsTab() {
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [simRunning, setSimRunning] = useState(false);
  const [totalReceived, setTotalReceived] = useState(0);
  const [stats, setStats] = useState({ verified: 0, rejected: 0, pending: 0 });
  const feedRef = useRef(null);
  const pollingRef = useRef(null);
  const seenIds = useRef(new Set());

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents`);
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const newItems = data.filter(inc => !seenIds.current.has(inc.id));
      newItems.forEach(inc => seenIds.current.add(inc.id));

      if (newItems.length > 0) {
        setTotalReceived(n => n + newItems.length);
        setLiveIncidents(prev => [...newItems.reverse(), ...prev].slice(0, 60));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchLive();
    pollingRef.current = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
  }, [fetchLive]);

  // Auto-scroll feed to top on new items
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [liveIncidents.length]);

  const startSim = async () => {
    try {
      await fetch(`${API_BASE}/api/simulate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replay_speed: 5, loop: true })
      });
      setSimRunning(true);
    } catch (_) { alert('Could not connect to simulation engine. Is the server running?'); }
  };

  const stopSim = async () => {
    try {
      await fetch(`${API_BASE}/api/simulate/stop`, { method: 'POST' });
      setSimRunning(false);
    } catch (_) { setSimRunning(false); }
  };

  return (
    <div>
      {/* Controls row */}
      <div className="stats-grid">
        <div className="stat-card sim-control-card">
          <h3>SIMULATION ENGINE</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <PulsingDot color={simRunning ? '#22c55e' : '#64748b'} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{simRunning ? 'RUNNING' : 'STOPPED'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={startSim}
              disabled={simRunning}
              style={{ flex: 1, background: simRunning ? 'rgba(34,197,94,0.1)' : 'var(--accent)', color: '#fff', padding: '10px', fontSize: 13, opacity: simRunning ? 0.5 : 1 }}>
              ▶ Start
            </button>
            <button
              onClick={stopSim}
              disabled={!simRunning}
              style={{ flex: 1, background: !simRunning ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.8)', color: '#fff', padding: '10px', fontSize: 13, opacity: !simRunning ? 0.5 : 1 }}>
              ■ Stop
            </button>
          </div>
        </div>

        <div className="stat-card">
          <h3>TOTAL INTERCEPTED</h3>
          <div className="value" style={{ color: 'var(--accent)' }}>{totalReceived}</div>
        </div>

        <div className="stat-card">
          <h3>LIVE FEED REFRESH</h3>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulsingDot color="#3b82f6" />
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Every {POLL_INTERVAL / 1000}s auto-polling</span>
          </div>
          <button onClick={fetchLive} style={{ marginTop: 12, width: '100%', padding: '8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontSize: 13 }}>
            ↻ Force Refresh
          </button>
        </div>
      </div>

      {/* Live incident feed */}
      <section className="table-section">
        <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PulsingDot color="#22c55e" />
            <h3>Live Incident Stream</h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {liveIncidents.length} events captured
          </span>
        </div>

        {liveIncidents.length === 0 ? (
          <div className="empty-state">
            <p style={{ marginBottom: 12 }}>No live events yet.</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Start the simulation engine above, then wait for incoming incidents.</p>
          </div>
        ) : (
          <div ref={feedRef} className="live-feed">
            {liveIncidents.map((inc, idx) => (
              <div key={`${inc.id}-${idx}`} className="feed-item">
                <div className="feed-left">
                  <span className="type-badge" style={{
                    background: `${getTypeColor(inc.type)}22`,
                    color: getTypeColor(inc.type),
                    border: `1px solid ${getTypeColor(inc.type)}44`,
                    fontSize: 11
                  }}>
                    {inc.type || 'Unknown'}
                  </span>
                  <span className="feed-desc">{inc.description || 'No description'}</span>
                </div>
                <div className="feed-right">
                  {inc.latitude && (
                    <span className="feed-coords">
                      📍 {Number(inc.latitude).toFixed(3)}, {Number(inc.longitude).toFixed(3)}
                    </span>
                  )}
                  <span className="feed-time">
                    {inc.datetime ? new Date(inc.datetime).toLocaleTimeString() : '—'}
                  </span>
                  <span className="feed-conf" style={{ color: inc.confidence > 0.7 ? '#22c55e' : inc.confidence > 0.4 ? '#f59e0b' : '#ef4444' }}>
                    {((inc.confidence || 0.5) * 100).toFixed(0)}% conf
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Tab: System Status ──────────────────────────────────────────────────────
function SystemStatusTab() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const results = {};
    const endpoints = [
      { key: 'API Server', url: `${API_BASE}/admin/incidents/pending` },
      { key: 'Simulator', url: `${API_BASE}/api/simulate/status` },
    ];
    for (const ep of endpoints) {
      try {
        const t0 = performance.now();
        await fetch(ep.url, { signal: AbortSignal.timeout(3000) });
        results[ep.key] = { status: 'online', latency: Math.round(performance.now() - t0) };
      } catch (_) {
        results[ep.key] = { status: 'offline', latency: null };
      }
    }
    setHealth(results);
    setChecking(false);
  };

  useEffect(() => { checkHealth(); }, []);

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <h3>SERVER ENDPOINT</h3>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{API_BASE}</div>
        </div>
        <div className="stat-card">
          <h3>POLLING RATE</h3>
          <div className="value" style={{ fontSize: 24 }}>{POLL_INTERVAL / 1000}s</div>
        </div>
        <div className="stat-card">
          <h3>ENVIRONMENT</h3>
          <div style={{ marginTop: 10, fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>LOCAL DEV</div>
        </div>
      </div>

      <section className="table-section">
        <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Service Health Check</h3>
          <button onClick={checkHealth} disabled={checking} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 14px', fontSize: 13 }}>
            {checking ? 'Checking...' : '↻ Re-check'}
          </button>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {health ? Object.entries(health).map(([name, info]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PulsingDot color={info.status === 'online' ? '#22c55e' : '#ef4444'} />
                <span style={{ fontWeight: 600 }}>{name}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {info.latency && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.latency}ms</span>}
                <span style={{ fontWeight: 700, color: info.status === 'online' ? '#22c55e' : '#ef4444', textTransform: 'uppercase', fontSize: 12 }}>
                  {info.status}
                </span>
              </div>
            </div>
          )) : (
            <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>Checking services...</div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
const TABS = [
  {
    key: 'moderation',
    label: 'Incident Moderation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    )
  },
  {
    key: 'live',
    label: 'Live Operations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"></circle>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
      </svg>
    )
  },
  {
    key: 'status',
    label: 'System Status',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    )
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('moderation');

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h1>SentinelX</h1>
        </div>
        <nav>
          {TABS.map(tab => (
            <div
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>SENTINELX ADMIN</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>v2.0 · Operations Center</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h2>{TABS.find(t => t.key === activeTab)?.label}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              {activeTab === 'moderation' && 'Review and approve submitted ground alerts before broadcasting.'}
              {activeTab === 'live' && 'Monitor real-time incident stream and control simulation engine.'}
              {activeTab === 'status' && 'Check backend service health and system configuration.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Admin Online
          </div>
        </header>

        {/* Tab content */}
        {activeTab === 'moderation' && <ModerationTab />}
        {activeTab === 'live' && <LiveOperationsTab />}
        {activeTab === 'status' && <SystemStatusTab />}
      </main>
    </div>
  );
}

export default App;
