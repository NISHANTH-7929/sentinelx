import React, { useState, useEffect } from 'react';

function App() {
    const [incidents, setIncidents] = useState([]);
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        fetch('http://localhost:8088/admin/incidents/pending')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setIncidents(data);
                }
            })
            .catch(err => console.error(err));
    }, [trigger]);

    const handleAction = async (id, action) => {
        try {
            await fetch(`http://localhost:8088/admin/incidents/${id}/${action}`, {
                method: 'PATCH'
            });
            setTrigger(t => t + 1);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-icon">S</div>
                    <h1>SentinelX</h1>
                </div>

                <nav>
                    <div className="nav-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        Overview
                    </div>
                    <div className="nav-item active">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Moderation Queue
                    </div>
                    <div className="nav-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Live Map Monitor
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="header">
                    <div>
                        <h2>Moderation Command Center</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Review and approve submitted ground alerts before broadcasting.</p>
                    </div>
                </header>

                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>PENDING REPORTS</h3>
                        <div className="value">{incidents.length}</div>
                    </div>
                    <div className="stat-card">
                        <h3>SIMULATION ENGINE</h3>
                        <div style={{ marginTop: '12px' }}>
                            <button
                                onClick={async () => {
                                    try {
                                        await fetch('http://localhost:8088/api/simulate/start', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ replay_speed: 5, loop: true })
                                        });
                                        alert('Global Simulation Engine Activated! WebSockets are now streaming.');
                                    } catch (err) {
                                        alert('Error starting engine.');
                                    }
                                }}
                                style={{ background: 'var(--accent)', color: '#fff', width: '100%', padding: '12px', fontSize: '14px' }}>
                                ▶ START REAL-TIME STREAM
                            </button>
                        </div>
                    </div>
                </div>

                <section className="table-section">
                    <div className="table-header">
                        <h3>Incoming Feed Pipeline</h3>
                    </div>

                    {incidents.length === 0 ? (
                        <div className="empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <p>All clear! Intercepted pipeline is empty.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Incident Type</th>
                                    <th>Description</th>
                                    <th>Timestamp</th>
                                    <th>AI Confidence</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(inc => (
                                    <tr key={inc.id}>
                                        <td>
                                            <span className={`badge type-${inc.type.toLowerCase()}`}>
                                                {inc.type}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            {inc.description || 'No context supplied'}
                                        </td>
                                        <td>
                                            {new Date(inc.datetime).toLocaleTimeString()}
                                        </td>
                                        <td>
                                            <strong>{((inc.confidence || 0.5) * 100).toFixed(0)}%</strong>
                                            <div className="confidence-bar">
                                                <div className="confidence-fill" style={{ width: `${(inc.confidence || 0.5) * 100}%` }}></div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button className="btn-approve" onClick={() => handleAction(inc.id, 'approve')}>Approve</button>
                                                <button className="btn-reject" onClick={() => handleAction(inc.id, 'reject')}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
