import React, { useState } from 'react';
import JSZip from 'jszip';
import type { AnalysisResult } from '../types';
import TranscriptView from './TranscriptView';
import SentimentChart from './SentimentChart';
import CoachingCard from './CoachingCard';
import { DownloadIcon } from './icons';
import { getTextToSpeech } from '../services/geminiService';
import { decode } from '../utils/audio';

interface DashboardProps {
  analysisResult: AnalysisResult;
  onBack: () => void;
  onUpdateSession: (updatedSession: AnalysisResult) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ analysisResult, onBack, onUpdateSession }) => {
  const { transcript, highlights, sentimentData, coachingTips, summary, date } = analysisResult;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadSession = async () => {
    setIsDownloading(true);
    try {
      let sessionToDownload = { ...analysisResult };

      // 1. Generate audio if it doesn't exist
      if (!sessionToDownload.audioFeedbackBase64) {
        const feedbackText = coachingTips.map(tip => `${tip.title}. ${tip.suggestion}`).join('\n\n');
        if (feedbackText) {
          const audioBase64 = await getTextToSpeech(`Here are your key areas for improvement: ${feedbackText}`);
          sessionToDownload.audioFeedbackBase64 = audioBase64;
          onUpdateSession(sessionToDownload); // Save the updated session with audio
        }
      }

      // 2. Create the ZIP file
      const zip = new JSZip();

      // 3. Add audio file
      if (sessionToDownload.audioFeedbackBase64) {
        const audioBytes = decode(sessionToDownload.audioFeedbackBase64);
        zip.file('feedback.wav', audioBytes);
      }

      // 4. Create and add text report
      let report = `DealMentor AI - Analysis Report\n`;
      report += `=====================================\n\n`;
      report += `Session Date: ${new Date(date).toLocaleString()}\n\n`;
      report += `--- SUMMARY ---\n${summary}\n\n`;
      report += `--- COACHING TIPS ---\n`;
      coachingTips.forEach(tip => {
        report += `* ${tip.title}:\n  ${tip.suggestion}\n\n`;
      });
      report += `--- FULL TRANSCRIPT WITH NOTES ---\n`;
      const highlightsMap = new Map(highlights.map(h => [h.lineIndex, h.comment]));
      transcript.forEach((line, index) => {
        report += `${line.speaker}: ${line.line}\n`;
        if (highlightsMap.has(index)) {
          report += `  >> COACH'S NOTE: ${highlightsMap.get(index)}\n`;
        }
      });

      zip.file('analysis_report.txt', report);

      // 5. Trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dealmentor-ai-analysis-${new Date(date).toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error("Failed to create session download:", error);
      alert("Could not create the session download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-cyan-400">Analysis Dashboard</h1>
            <p className="text-slate-400">Session from {new Date(date).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleDownloadSession} 
              disabled={isDownloading}
              className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-5 h-5" />
              )}
              <span>{isDownloading ? 'Packaging...' : 'Download Session'}</span>
            </button>
            <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">
              Back to Home
            </button>
        </div>
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-2 text-cyan-400">Summary</h2>
        <p className="text-slate-300">{summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '400px' }}>
        <SentimentChart data={sentimentData} />
        <TranscriptView transcript={transcript} highlights={highlights} />
      </div>

      <CoachingCard analysisResult={analysisResult} onUpdateSession={onUpdateSession} />
    </div>
  );
};

export default Dashboard;