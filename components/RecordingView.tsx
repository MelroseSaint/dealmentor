import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAnalysisForTranscript, transcribeAudioFile } from '../services/geminiService';
import type { AnalysisResult, TranscriptLine } from '../types';
import { MicrophoneIcon, StopIcon, RefreshIcon, SparklesIcon, DownloadIcon } from './icons';

interface RecordingViewProps {
  onAnalysisComplete: (promise: Promise<Omit<AnalysisResult, 'id' | 'date'>>) => void;
  onBack: () => void;
}

type RecordingStatus = 'idle' | 'recording' | 'recorded' | 'error';

const RecordingView: React.FC<RecordingViewProps> = ({ onAnalysisComplete, onBack }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const visualizerFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('recording');
      setError(null);
      setDuration(0);
      
      // Setup visualizer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      drawVisualizer();

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setStatus('recorded');
        stream.getTracks().forEach(track => track.stop());
        if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };
      
      mediaRecorderRef.current.start();
      
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (errorMessage.includes('Permission denied')) {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError('Could not start recording. Please ensure you have a connected microphone.');
      }
      setStatus('error');
    }
  };
  
  const drawVisualizer = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArrayRef.current.length) * 1.5;
    let x = 0;
    
    for (let i = 0; i < dataArrayRef.current.length; i++) {
        const barHeight = dataArrayRef.current[i] / 2;
        ctx.fillStyle = `rgba(56, 189, 248, ${barHeight / 100})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
    
    visualizerFrameRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    
    const analysisPromise = (async () => {
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result && typeof event.target.result === 'string') {
                    resolve(event.target.result.split(',')[1]);
                } else {
                    reject(new Error('Failed to read file.'));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file.'));
            reader.readAsDataURL(audioBlob);
        });

        const audio = { mimeType: audioBlob.type, data: base64Data };
        const transcribedText = await transcribeAudioFile(audio);
        const transcriptLines: TranscriptLine[] = transcribedText.split('\n').filter(line => line.trim() !== '').map(line => ({
            speaker: 'A',
            line: line.trim(),
        }));
        return getAnalysisForTranscript(transcriptLines);
    })();

    onAnalysisComplete(analysisPromise);
  };
  
  const handleDownload = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `sales-pitch-${new Date().toISOString()}.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleReset = () => {
    setStatus('idle');
    setError(null);
    setAudioBlob(null);
    setDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-xl h-full text-center">
      <h2 className="text-3xl font-bold mb-4 text-cyan-400">Recording Studio</h2>
      
      {status === 'idle' && <p className="text-slate-400 mb-8">Click the button below to start recording your pitch.</p>}
      {status === 'recording' && <p className="text-slate-400 mb-8">Your session is being recorded...</p>}
      {status === 'recorded' && <p className="text-slate-400 mb-8">Recording complete! What would you like to do next?</p>}
      
      <div className="bg-slate-900/50 w-full max-w-lg rounded-lg p-6 flex flex-col items-center">
        <div className="text-6xl font-mono mb-4 text-slate-100">{formatTime(duration)}</div>
        <canvas ref={canvasRef} width="300" height="50" className="mb-6"></canvas>
        
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {status === 'idle' || status === 'error' ? (
          <button onClick={startRecording} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center gap-3">
            <MicrophoneIcon className="w-6 h-6" /> Start Recording
          </button>
        ) : null}

        {status === 'recording' ? (
          <button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center gap-3 animate-pulse">
            <StopIcon className="w-6 h-6" /> Stop Recording
          </button>
        ) : null}
        
        {status === 'recorded' && (
          <div className="flex flex-col md:flex-row gap-4">
             <button onClick={handleAnalyze} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-full text-lg flex items-center gap-3">
                <SparklesIcon className="w-6 h-6" /> Analyze Now
            </button>
            <button onClick={handleDownload} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-full text-lg flex items-center gap-3">
                <DownloadIcon className="w-6 h-6" /> Download WAV
            </button>
             <button onClick={handleReset} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-full text-lg flex items-center gap-3">
                <RefreshIcon className="w-6 h-6" /> Record Again
            </button>
          </div>
        )}
      </div>
      <button onClick={onBack} className="mt-8 text-slate-400 hover:text-slate-200">
        Back to Home
      </button>
    </div>
  );
};

export default RecordingView;
