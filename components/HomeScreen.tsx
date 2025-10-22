import React, { useState } from 'react';
import JSZip from 'jszip';
import { MicrophoneIcon, UploadIcon, DownloadIcon, LiveChatIcon } from './icons';
import Navigation from './Navigation';
import type { AnalysisResult } from '../types';
import { getSessions } from '../utils/storage';
import { decode } from '../utils/audio';

interface HomeScreenProps {
  onStartRecording: () => void;
  onStartLive: () => void;
  onStartAnalysis: () => void;
  onViewSession: (session: AnalysisResult) => void;
  sessions: AnalysisResult[];
  onDeleteSession: (id: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStartRecording, onStartLive, onStartAnalysis, onViewSession, sessions, onDeleteSession }) => {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadAllSessions = async () => {
    setIsDownloadingAll(true);
    try {
      const allSessions = getSessions();
      if (allSessions.length === 0) {
        alert("No sessions to download.");
        return;
      }

      const zip = new JSZip();

      for (const session of allSessions) {
        const folderName = `session_${new Date(session.date).toISOString().replace(/[:.]/g, '-')}`;
        const sessionFolder = zip.folder(folderName);
        if (!sessionFolder) continue;

        // Create text report
        let report = `DealMentor AI - Analysis Report\n`;
        report += `=====================================\n\n`;
        report += `Session Date: ${new Date(session.date).toLocaleString()}\n\n`;
        report += `--- SUMMARY ---\n${session.summary}\n\n`;
        report += `--- COACHING TIPS ---\n`;
        session.coachingTips.forEach(tip => {
          report += `* ${tip.title}:\n  ${tip.suggestion}\n\n`;
        });
        report += `--- FULL TRANSCRIPT WITH NOTES ---\n`;
        const highlightsMap = new Map(session.highlights.map(h => [h.lineIndex, h.comment]));
        session.transcript.forEach((line, index) => {
          report += `${line.speaker}: ${line.line}\n`;
          if (highlightsMap.has(index)) {
            report += `  >> COACH'S NOTE: ${highlightsMap.get(index)}\n`;
          }
        });
        sessionFolder.file('analysis_report.txt', report);

        // Add audio file if it exists
        if (session.audioFeedbackBase64) {
          const audioBytes = decode(session.audioFeedbackBase64);
          sessionFolder.file('feedback.wav', audioBytes);
        }
      }

      // Trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dealmentor-ai-all-sessions-export.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error("Failed to create bulk session download:", error);
      alert("Could not create the session download. Please try again.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[85vh]">
      <div className="md:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2">DealMentor AI</h1>
        <p className="text-slate-300 mb-8 max-w-xl">
          Get instant, AI-powered feedback. Record a pitch, analyze an existing audio file, or ask any business question to our live AI advisor.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onStartRecording}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-3 transition-colors"
          >
            <MicrophoneIcon className="w-6 h-6" />
            Record & Analyze
          </button>
          <button
            onClick={onStartAnalysis}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-3 transition-colors"
          >
            <UploadIcon className="w-6 h-6" />
            Analyze Audio File
          </button>
          <button
            onClick={onStartLive}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-3 transition-colors"
          >
             <LiveChatIcon className="w-6 h-6" />
            Live Q&A with AI
          </button>
        </div>
        
        <div className="mt-10 w-full max-w-md border-t border-slate-700 pt-6">
          <button
            onClick={handleDownloadAllSessions}
            disabled={isDownloadingAll || sessions.length === 0}
            className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors mx-auto"
            title={sessions.length === 0 ? "No sessions to download" : "Download all sessions as a ZIP file"}
          >
            {isDownloadingAll ? (
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
            ) : (
              <DownloadIcon className="w-5 h-5" />
            )}
            <span>{isDownloadingAll ? 'Packaging...' : 'Download All Sessions'}</span>
          </button>
        </div>

      </div>
      <Navigation sessions={sessions} onViewSession={onViewSession} onDeleteSession={onDeleteSession} />
    </div>
  );
};

export default HomeScreen;