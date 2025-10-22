import React, { useState, useEffect, lazy, Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import HomeScreen from './HomeScreen';
import RecordingView from './RecordingView';
import AnalyzeFileView from './AnalyzeFileView';
import Dashboard from './Dashboard';
import LiveConversation from './LiveConversation';
import type { AnalysisResult } from '../types';
import { getSessions, saveSession, deleteSession } from '../utils/storage';

const LiquidEther = lazy(() => import('./LiquidEther.tsx'));

type View = 'home' | 'recording' | 'analysis' | 'live' | 'dashboard' | 'processing';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [sessions, setSessions] = useState<AnalysisResult[]>([]);
  const [activeSession, setActiveSession] = useState<AnalysisResult | null>(null);
  const [processingFromView, setProcessingFromView] = useState<View>('home');

  useEffect(() => {
    setSessions(getSessions());
  }, []);
  
  const handleUpdateSession = (updatedSession: AnalysisResult) => {
    saveSession(updatedSession);
    const newSessions = getSessions();
    setSessions(newSessions);
    // update active session if it's the one being updated
    if (activeSession && activeSession.id === updatedSession.id) {
        setActiveSession(updatedSession);
    }
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSessions(getSessions());
    if (activeSession?.id === id) {
      setActiveSession(null);
      setView('home');
    }
  };

  const handleAnalysisComplete = (analysisPromise: Promise<Omit<AnalysisResult, 'id' | 'date'>>) => {
    setProcessingFromView(view); // Keep track of where we came from
    setView('processing');
    analysisPromise
      .then(analysisData => {
        const newSession: AnalysisResult = {
          ...analysisData,
          id: `session_${Date.now()}`,
          date: new Date().toISOString(),
        };
        saveSession(newSession);
        setSessions(getSessions());
        setActiveSession(newSession);
        setView('dashboard');
      })
      .catch(error => {
        console.error("Analysis failed:", error);
        alert(`Analysis failed: ${error.message}`);
        setView(processingFromView === 'processing' ? 'home' : processingFromView); // Go back on failure
      });
  };

  const renderView = () => {
    switch (view) {
      case 'recording':
        return <RecordingView onAnalysisComplete={handleAnalysisComplete} onBack={() => setView('home')} />;
      case 'analysis':
        return <AnalyzeFileView onAnalysisComplete={handleAnalysisComplete} onBack={() => setView('home')} />;
      case 'live':
        return <LiveConversation onBack={() => setView('home')} />;
      case 'dashboard':
        if (activeSession) {
          return <Dashboard analysisResult={activeSession} onBack={() => { setActiveSession(null); setView('home'); }} onUpdateSession={handleUpdateSession} />;
        }
        setView('home'); // Redirect to home if no active session
        return null; 
      case 'processing':
        return (
            <div className="flex flex-col items-center justify-center h-[85vh] text-center">
                <div className="w-16 h-16 border-t-4 border-b-4 border-cyan-400 rounded-full animate-spin mb-4"></div>
                <h2 className="text-2xl font-bold text-cyan-400">Processing...</h2>
                <p className="text-slate-400">The AI is working its magic. This might take a moment.</p>
            </div>
        );
      case 'home':
      default:
        return (
          <HomeScreen
            onStartRecording={() => setView('recording')}
            onStartAnalysis={() => setView('analysis')}
            onStartLive={() => setView('live')}
            onViewSession={(session) => {
              setActiveSession(session);
              setView('dashboard');
            }}
            sessions={sessions}
            onDeleteSession={handleDeleteSession}
          />
        );
    }
  };

  return (
    <main className="relative z-10 min-h-screen text-slate-100 p-4 sm:p-8">
       <div 
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{
          background: 'radial-gradient(ellipse at top, #1e293b, #020617)',
        }}
       />
      <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
              <LiquidEther />
          </ErrorBoundary>
      </Suspense>
      <div className="relative max-w-7xl mx-auto">
          <ErrorBoundary fallback={<div>Something went wrong. Please refresh the page.</div>}>
              {renderView()}
          </ErrorBoundary>
      </div>
    </main>
  );
};

export default App;