import React, { useState } from 'react';
import type { CoachingTip, AnalysisResult } from '../types';
import { SparklesIcon, SpeakerWaveIcon, PlayIcon } from './icons';
import { getTextToSpeech } from '../services/geminiService';
import { playAudioFromBase64 } from '../utils/audio';

interface CoachingCardProps {
  analysisResult: AnalysisResult;
  onUpdateSession: (updatedSession: AnalysisResult) => void;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ analysisResult, onUpdateSession }) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { coachingTips, audioFeedbackBase64 } = analysisResult;

  const handleListenToFeedback = async () => {
    if (audioFeedbackBase64) {
      playAudioFromBase64(audioFeedbackBase64);
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const feedbackText = coachingTips.map(tip => `${tip.title}. ${tip.suggestion}`).join('\n\n');
      if (!feedbackText) {
        alert("No feedback available to read.");
        return;
      }
      
      const audioBase64 = await getTextToSpeech(`Here are your key areas for improvement: ${feedbackText}`);
      const updatedSession = { ...analysisResult, audioFeedbackBase64: audioBase64 };
      onUpdateSession(updatedSession);
      playAudioFromBase64(audioBase64);

    } catch (error) {
      console.error("Failed to generate or play audio feedback", error);
      alert("Sorry, we couldn't generate the audio feedback at this time.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          AI Coaching Tips
        </h2>
        <button
          onClick={handleListenToFeedback}
          disabled={isGeneratingAudio || coachingTips.length === 0}
          className="flex items-center gap-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors"
          title="Listen to AI feedback"
        >
          {isGeneratingAudio ? (
            <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
          ) : audioFeedbackBase64 ? (
            <PlayIcon className="w-5 h-5" />
          ) : (
            <SpeakerWaveIcon className="w-5 h-5" />
          )}
          <span>{isGeneratingAudio ? 'Generating...' : 'Listen'}</span>
        </button>
      </div>
      <div className="overflow-y-auto pr-2 flex-grow custom-scrollbar">
        {coachingTips.length > 0 ? (
            <ul className="space-y-4">
            {coachingTips.map((tip, index) => (
                <li key={index} className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-sky-400">
                <h3 className="font-bold text-sky-300 mb-1">{tip.title}</h3>
                <p className="text-slate-300 text-sm">{tip.suggestion}</p>
                </li>
            ))}
            </ul>
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">No coaching tips available.</p>
            </div>
        )}
      </div>
       <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default CoachingCard;
