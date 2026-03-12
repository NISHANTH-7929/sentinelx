import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchIncidents } from '../services/incidentsApi';
import { createIncidentSocket } from '../services/incidentsSocket';

const dedupeById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

export const useIncidentStream = ({ simulationMode, onVerifiedIncident }) => {
  const [allIncidents, setAllIncidents] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const modeRef = useRef(simulationMode);

  useEffect(() => {
    modeRef.current = simulationMode;
  }, [simulationMode]);

  useEffect(() => {
    let mounted = true;

    fetchIncidents()
      .then((incidents) => {
        if (mounted && Array.isArray(incidents)) {
          const sorted = incidents.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
          setAllIncidents(dedupeById(sorted));
        }
      })
      .catch(() => {
        // Ignore initial fetch failures; websocket can still stream live updates.
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = createIncidentSocket({
      onOpen: () => setIsSocketConnected(true),
      onClose: () => setIsSocketConnected(false),
      onIncident: (incident) => {
        setAllIncidents((previous) => {
          const merged = dedupeById([incident, ...previous]);
          return merged.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        });

        const modeMatch = modeRef.current ? incident.source === 'simulator' : incident.source !== 'simulator';
        if (incident.status === 'verified' && modeMatch) {
          onVerifiedIncident?.(incident);
        }
      }
    });

    return () => socket.close();
  }, [onVerifiedIncident]);

  const incidents = useMemo(() => {
    return allIncidents.filter((incident) =>
      simulationMode ? incident.source === 'simulator' : incident.source !== 'simulator'
    );
  }, [allIncidents, simulationMode]);

  return {
    incidents,
    isSocketConnected
  };
};
