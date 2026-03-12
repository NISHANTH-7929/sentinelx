import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:8088';

async function jsonFetch(path, options) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
}

export default function App() {
  const [pending, setPending] = useState([]);
  const [simulatorState, setSimulatorState] = useState({ running: false, replay_speed: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [pendingData, stateData] = await Promise.all([
        jsonFetch('/admin/incidents/pending'),
        jsonFetch('/api/simulate/state')
      ]);
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setSimulatorState(stateData || { running: false });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, []);

  const pendingCount = pending.length;
  const highRiskCount = useMemo(() => pending.filter((item) => item.severity >= 3).length, [pending]);

  const moderate = async (id, action) => {
    try {
      await jsonFetch(`/admin/incidents/${id}/${action}`, { method: 'POST' });
      await load();
    } catch (moderationError) {
      alert(moderationError.message);
    }
  };

  const startSim = async () => {
    try {
      await jsonFetch('/api/simulate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset: 'chennai_crimes.json',
          replay_speed: 5,
          loop: true
        })
      });
      await load();
    } catch (simError) {
      alert(simError.message);
    }
  };

  const stopSim = async () => {
    try {
      await jsonFetch('/api/simulate/stop', { method: 'POST' });
      await load();
    } catch (simError) {
      alert(simError.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>SentinelX Moderation Command</h1>
          <div className="muted">Review pending incidents before user broadcast.</div>
        </div>
        <div className="muted">{loading ? 'Refreshing...' : 'Live view'}</div>
      </header>

      {error ? <div className="card" style={{ borderColor: '#5b1f1f', color: '#fca5a5' }}>{error}</div> : null}

      <section className="stats">
        <div className="card">
          <div className="muted">Pending reports</div>
          <div className="big">{pendingCount}</div>
        </div>
        <div className="card">
          <div className="muted">High severity (3)</div>
          <div className="big">{highRiskCount}</div>
        </div>
        <div className="card">
          <div className="muted">Simulator</div>
          <div className="big">{simulatorState.running ? 'ON' : 'OFF'}</div>
          <div className="muted">Speed: {simulatorState.replay_speed || 0}x</div>
        </div>
        <div className="card">
          <div className="muted">Controls</div>
          <div className="controls" style={{ marginTop: 8 }}>
            <button className="success" onClick={startSim}>Start 5x stream</button>
            <button className="danger" onClick={stopSim}>Stop stream</button>
          </div>
        </div>
      </section>

      <section className="tableWrap">
        {pending.length === 0 ? (
          <div className="empty">No pending incidents in queue.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Confidence</th>
                <th>Source</th>
                <th>Media</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((incident) => (
                <tr key={incident.id}>
                  <td><span className="badge">{incident.type}</span></td>
                  <td>{incident.description || 'No description'}</td>
                  <td>{Math.round((incident.confidence || 0) * 100)}%</td>
                  <td>{incident.source}</td>
                  <td>
                    {incident.media_urls?.[0] ? (
                      <img className="thumb" src={incident.media_urls[0]} alt="incident" />
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                  <td>{new Date(incident.datetime).toLocaleString()}</td>
                  <td>
                    <div className="controls">
                      <button className="success" onClick={() => moderate(incident.id, 'approve')}>Approve</button>
                      <button className="danger" onClick={() => moderate(incident.id, 'reject')}>Reject</button>
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
