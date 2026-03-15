/**
 * AI Incident Store
 * Local reactive store for AI-verified incident reports.
 * Uses a simple event-emitter pattern so multiple screens stay in sync.
 */

import { useState, useEffect } from 'react';

let _incidents = [];
let _listeners = [];
let _nextId = 1;

const INCIDENT_TYPES = ['Accident', 'Fire', 'Robbery', 'Assault', 'Disaster'];

export { INCIDENT_TYPES };

const notify = () => {
  _listeners.forEach((fn) => fn([..._incidents]));
};

export const submitIncident = (formData) => {
  const id = `ai-inc-${_nextId++}-${Date.now()}`;
  const incident = {
    id,
    ...formData,
    status: 'PENDING_VERIFICATION',
    submittedAt: new Date().toISOString(),
    aiResult: null,
    locationSignals: null,
    verifiedAt: null
  };
  _incidents = [incident, ..._incidents];
  notify();
  return id;
};

export const updateIncident = (id, patch) => {
  _incidents = _incidents.map((item) => (item.id === id ? { ...item, ...patch } : item));
  notify();
};

export const getMyIncidents = () => [..._incidents];

export const getVerifiedIncidents = () =>
  _incidents.filter((item) => item.status === 'VERIFIED');

export const useAIIncidentStore = () => {
  const [incidents, setIncidents] = useState([..._incidents]);

  useEffect(() => {
    _listeners.push(setIncidents);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== setIncidents);
    };
  }, []);

  return incidents;
};
