import type { AnalysisResult } from '../types';

const SESSIONS_KEY = 'sales-coach-sessions';

export function getSessions(): AnalysisResult[] {
  try {
    const sessionsJson = localStorage.getItem(SESSIONS_KEY);
    if (sessionsJson) {
      return JSON.parse(sessionsJson);
    }
  } catch (error) {
    console.error('Failed to load sessions from localStorage', error);
  }
  return [];
}

export function saveSession(session: AnalysisResult): void {
  try {
    const sessions = getSessions();
    // Prevent duplicates by checking ID, then add or update
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex > -1) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session); // Add new sessions to the top
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save session to localStorage', error);
  }
}

export function getSession(id: string): AnalysisResult | undefined {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
}

export function deleteSession(id: string): void {
  try {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to delete session from localStorage', error);
  }
}