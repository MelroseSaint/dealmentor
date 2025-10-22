import React, { useState } from 'react';
import { getAnalysisForTranscript, transcribeAudioFile } from '../services/geminiService';
import type { AnalysisResult, TranscriptLine, GeminiAudio } from '../types';
import { UploadIcon, SparklesIcon } from './icons';

interface AnalyzeFileViewProps {
  onAnalysisComplete: (promise: Promise<Omit<AnalysisResult, 'id' | 'date'>>) => void;
  onBack: () => void;
}

const supportedAudioTypes = [
    'audio/mpeg', // .mp3
    'audio/wav',  // .wav
    'audio/webm',
    'audio/ogg',
    'audio/m4a',  // .m4a
    'audio/flac',
];

const AnalyzeFileView: React.FC<AnalyzeFileViewProps> = ({ onAnalysisComplete, onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (selectedFile: File | null) => {
        if (!selectedFile) return;

        if (!supportedAudioTypes.includes(selectedFile.type)) {
            setError('Unsupported file type. Please upload a valid audio file (MP3, WAV, M4A, etc.).');
            setFile(null);
            return;
        }
        if (selectedFile.size > 25 * 1024 * 1024) { // 25MB limit
             setError('File is too large. Please upload an audio file under 25MB.');
             setFile(null);
             return;
        }
        setError(null);
        setFile(selectedFile);
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };
    
    const handleSubmit = () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }
        const analysisPromise = (async () => {
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onload = (event) => {
                    if (event.target?.result && typeof event.target.result === 'string') {
                        resolve(event.target.result.split(',')[1]);
                    } else {
                        reject(new Error('Failed to read file.'));
                    }
                };
                reader.onerror = () => reject(new Error('Error reading file.'));
                reader.readAsDataURL(file);
            });
            
            const audio: GeminiAudio = { mimeType: file.type, data: base64Data };
            const transcribedText = await transcribeAudioFile(audio);
            
            // Assuming the transcript is from a single speaker for simplicity in this flow
            const transcriptLines: TranscriptLine[] = transcribedText.split('\n').filter(line => line.trim()).map(line => ({
                speaker: 'A',
                line: line.trim()
            }));
            
            return getAnalysisForTranscript(transcriptLines);
        })();

        onAnalysisComplete(analysisPromise);
    };
    
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-xl h-full text-center">
            <h2 className="text-3xl font-bold mb-4 text-cyan-400">Analyze Audio File</h2>
            <p className="text-slate-400 mb-8 max-w-lg">Upload a pre-recorded sales pitch or business call to get a detailed AI-powered analysis and coaching.</p>

            <div 
                className={`w-full max-w-lg p-10 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-sky-400 bg-sky-900/20' : 'border-slate-600 hover:border-sky-500'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept={supportedAudioTypes.join(',')}
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <UploadIcon className="w-12 h-12 text-slate-500 mb-4" />
                    {file ? (
                        <p className="text-slate-300 font-semibold">{file.name}</p>
                    ) : (
                        <>
                            <p className="text-slate-300 font-semibold">Drag & drop an audio file here</p>
                            <p className="text-slate-500">or click to browse</p>
                        </>
                    )}
                </label>
            </div>
            
            {error && <p className="text-red-400 mt-4">{error}</p>}
            
            <div className="mt-8 flex gap-4">
                 <button 
                    onClick={handleSubmit}
                    disabled={!file}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full text-lg flex items-center gap-3 transition-colors"
                 >
                    <SparklesIcon className="w-6 h-6" />
                    Analyze
                </button>
            </div>
            <button onClick={onBack} className="mt-8 text-slate-400 hover:text-slate-200">
                Back to Home
            </button>
        </div>
    );
};

export default AnalyzeFileView;
