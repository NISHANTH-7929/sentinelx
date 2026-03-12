const WebSocket = require('ws');

let wss;

const isModeMatch = (socketMode, incidentSource) => {
  if (socketMode === 'simulator') {
    return incidentSource === 'simulator';
  }

  if (socketMode === 'live') {
    return incidentSource !== 'simulator';
  }

  return true;
};

const attachIncidentsWebsocket = (server) => {
  if (wss) {
    return wss;
  }

  wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', (socket) => {
    socket.mode = 'live';

    socket.send(
      JSON.stringify({
        op: 'connected',
        data: {
          channel: 'incidents'
        }
      })
    );

    socket.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload?.op === 'subscribe') {
          socket.mode = payload.mode || payload.topic || 'live';
          socket.send(
            JSON.stringify({
              op: 'subscribed',
              data: {
                topic: 'incidents',
                mode: socket.mode
              }
            })
          );
          return;
        }

        if (payload?.op === 'ping') {
          socket.send(JSON.stringify({ op: 'pong', data: { ts: Date.now() } }));
        }
      } catch (_error) {
        socket.send(JSON.stringify({ op: 'error', data: { message: 'Invalid websocket payload' } }));
      }
    });
  });

  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws/incidents') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  });

  return wss;
};

const broadcastIncident = (incident) => {
  if (!wss || incident.status !== 'verified') {
    return;
  }

  const payload = JSON.stringify({
    op: 'incident',
    data: {
      incident
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!isModeMatch(client.mode, incident.source)) {
      return;
    }

    client.send(payload);
  });
};

module.exports = {
  attachIncidentsWebsocket,
  broadcastIncident
};
