import React from 'react';
import type { TranscriptLine, TranscriptHighlight } from '../types';
import { InfoIcon } from './icons';

interface TranscriptViewProps {
  transcript: TranscriptLine[];
  highlights?: TranscriptHighlight[];
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ transcript, highlights = [] }) => {
  const highlightsMap = new Map(highlights.map(h => [h.lineIndex, h.comment]));

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 text-cyan-400 flex-shrink-0">Call Transcript</h2>
      <div className="overflow-y-auto pr-4 flex-grow custom-scrollbar">
        <ul className="space-y-4">
          {transcript.map((item, index) => {
            const highlightComment = highlightsMap.get(index);
            const isHighlighted = !!highlightComment;

            return (
              <li key={index} className={`flex items-start gap-3 ${item.speaker === 'A' ? '' : 'justify-end'}`}>
                {item.speaker === 'A' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/80 flex items-center justify-center font-bold border-2 border-blue-400">A</div>
                )}
                <div className={`p-3 rounded-lg max-w-sm relative group ${item.speaker === 'A' ? 'bg-slate-700/80' : 'bg-sky-700/80'} ${isHighlighted ? 'ring-2 ring-amber-400/80' : ''}`}>
                  <p className="text-slate-200">{item.line}</p>
                  {isHighlighted && (
                    <>
                      <InfoIcon className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 bg-slate-800 rounded-full" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm bg-slate-900 text-slate-200 border border-slate-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <span className="font-bold text-amber-400">Coach's Note:</span> {highlightComment}
                      </div>
                    </>
                  )}
                </div>
                {item.speaker === 'B' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/80 flex items-center justify-center font-bold border-2 border-indigo-400">B</div>
                )}
              </li>
            );
          })}
        </ul>
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

export default TranscriptView;
