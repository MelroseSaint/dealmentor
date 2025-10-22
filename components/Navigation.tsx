import React from 'react';
import type { AnalysisResult } from '../types';
import { TrashIcon } from './icons';

interface NavigationProps {
  sessions: AnalysisResult[];
  onViewSession: (session: AnalysisResult) => void;
  onDeleteSession: (id: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ sessions, onViewSession, onDeleteSession }) => {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      onDeleteSession(id);
    }
  };
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Session History</h2>
      <div className="overflow-y-auto flex-grow custom-scrollbar-nav">
        {sessions.length > 0 ? (
          <ul className="space-y-3">
            {sessions.map(session => (
              <li key={session.id}>
                <button
                  onClick={() => onViewSession(session)}
                  className="w-full text-left bg-slate-700/50 hover:bg-slate-600/50 p-3 rounded-lg transition-colors group"
                >
                  <p className="font-semibold text-sky-300 truncate">{session.summary}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-400">
                      {new Date(session.date).toLocaleString()}
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"
                      title="Delete session"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-slate-400">No past sessions found.</p>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar-nav::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-nav::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-nav::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }
        .custom-scrollbar-nav::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
      `}</style>
    </div>
  );
};

export default Navigation;
