import { WS_BASE_URL } from './config';

export class IncidentSocketClient {
  constructor({ mode = 'live', onIncident, onStatusChange }) {
    this.mode = mode;
    this.onIncident = onIncident;
    this.onStatusChange = onStatusChange;

    this.socket = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.manualClose = false;
    this.reconnectAttempt = 0;
    this.lastPongAt = 0;
  }

  connect() {
    this.manualClose = false;
    this.openSocket();
  }

  openSocket() {
    this.onStatusChange?.(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    this.socket = new WebSocket(`${WS_BASE_URL}/ws/incidents`);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.lastPongAt = Date.now();
      this.onStatusChange?.('connected');
      this.subscribe(this.mode);
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.op === 'pong') {
          this.lastPongAt = Date.now();
          return;
        }

        if (payload?.op === 'incident' && payload?.data?.incident) {
          this.onIncident?.(payload.data.incident);
        }
      } catch (_error) {
        // Ignore malformed payloads.
      }
    };

    this.socket.onerror = () => {
      this.onStatusChange?.('reconnecting');
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (this.manualClose) {
        this.onStatusChange?.('disconnected');
        return;
      }

      this.scheduleReconnect();
    };
  }

  subscribe(mode) {
    this.mode = mode;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ op: 'subscribe', mode }));
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.subscribe(mode);
  }

  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (Date.now() - this.lastPongAt > 30000) {
        this.socket.close();
        return;
      }

      this.socket.send(JSON.stringify({ op: 'ping', ts: Date.now() }));
    }, 10000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    this.stopHeartbeat();
    this.onStatusChange?.('reconnecting');

    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30000);
    this.reconnectAttempt += 1;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.manualClose) {
        this.openSocket();
      }
    }, delay);
  }

  disconnect() {
    this.manualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.onStatusChange?.('disconnected');
  }
}
