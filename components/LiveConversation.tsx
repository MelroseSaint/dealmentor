import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConversationLine } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { MicrophoneIcon, StopIcon } from './icons';

const LiveConversation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<ReturnType<GoogleGenAI['live']['connect']> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isStoppingRef = useRef(false);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopLiveSession = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    setIsRecording(false);
    setIsConnecting(false);

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session", e);
      } finally {
        sessionPromiseRef.current = null;
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting script processor", e);
      }
      scriptProcessorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting source node", e);
      }
      sourceNodeRef.current = null;
    }

    try {
      if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        await inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
      }
      
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        playingSourcesRef.current.forEach(source => {
          try {
            source.stop();
          } catch (e) {
            console.error("Error stopping audio source", e);
          }
        });
        playingSourcesRef.current.clear();
        await outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
      }
    } catch (e) {
      console.error("Error closing audio contexts", e);
    }

    isStoppingRef.current = false;
  }, []);

  const startLiveSession = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    setConversation([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        throw new Error('API key is missing. Please set VITE_API_KEY in your environment variables.');
      }
      const ai = new GoogleGenAI({ apiKey });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are an expert business advisor AI. Your purpose is to answer any questions related to business, including starting a new business, managing a non-profit organization, finance, marketing, strategy, and operations. Provide clear, actionable, and insightful advice. Start the conversation by saying: 'Hello! I'm here to help with any business questions you have. What's on your mind?'",
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsRecording(true);
            
            if (!inputAudioContextRef.current || !streamRef.current) return;

            sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer.slice(0))),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            sourceNodeRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setConversation(prev => {
                const newConv = [...prev];
                const lastLine = newConv[newConv.length - 1];
                if (lastLine?.speaker === 'user') {
                  lastLine.text = currentInputTranscriptionRef.current;
                } else {
                  newConv.push({ speaker: 'user', text: currentInputTranscriptionRef.current });
                }
                return newConv;
              });
            } else if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setConversation(prev => {
                const newConv = [...prev];
                const lastLine = newConv[newConv.length - 1];
                if (lastLine?.speaker === 'model') {
                  lastLine.text = currentOutputTranscriptionRef.current;
                } else {
                  newConv.push({ speaker: 'model', text: currentOutputTranscriptionRef.current });
                }
                return newConv;
              });
            }
            
            if (message.serverContent?.turnComplete) {
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            const parts = message.serverContent?.modelTurn?.parts;
            const base64Audio = parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              try {
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => {
                  playingSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                playingSourcesRef.current.add(source);
              } catch (e) {
                console.error("Failed to process or play audio chunk:", e);
              }
            }

            if (message.serverContent?.interrupted) {
              playingSourcesRef.current.forEach(s => s.stop());
              playingSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            setError('A connection error occurred. Please try again.');
            stopLiveSession();
          },
          onclose: (e: CloseEvent) => {
            console.debug('Live session closed');
            stopLiveSession();
          },
        },
      });

    } catch (err) {
      console.error('Failed to start live session:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if(errorMessage.includes('Permission denied')){
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Failed to start: ${errorMessage}`);
      }
      setIsConnecting(false);
    }
  }, [stopLiveSession]);

  useEffect(() => {
    // ComponentWillUnmount cleanup
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  return (
    <div className="flex flex-col h-[85vh]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-cyan-400">AI Advisor Session</h2>
        <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">
          Back to Home
        </button>
      </div>

      <div className="flex-grow bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-lg overflow-y-auto custom-scrollbar">
         {conversation.length === 0 && !isRecording && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MicrophoneIcon className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300">Ready to talk business?</h3>
            <p className="text-slate-400">Click "Start Session" to begin your live Q&A with the AI business advisor.</p>
          </div>
        )}
        <ul className="space-y-4">
          {conversation.map((item, index) => (
            <li key={index} className={`flex items-start gap-3 ${item.speaker === 'user' ? 'flex-row-reverse' : 'justify-start'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${item.speaker === 'user' ? 'bg-blue-500/80 border-blue-400' : 'bg-cyan-500/80 border-cyan-400 text-sm'}`}>
                {item.speaker === 'user' ? 'You' : 'AI'}
              </div>
              <div className={`p-3 rounded-lg max-w-xl ${item.speaker === 'user' ? 'bg-slate-700/80' : 'bg-sky-700/80'}`}>
                <p className="text-slate-200 whitespace-pre-wrap">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="pt-6 text-center">
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!isRecording ? (
          <button 
            onClick={startLiveSession}
            disabled={isConnecting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center justify-center mx-auto gap-3 transition-all duration-200"
          >
            <MicrophoneIcon className="w-6 h-6" />
            {isConnecting ? 'Connecting...' : 'Start Session'}
          </button>
        ) : (
          <button 
            onClick={stopLiveSession}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center justify-center mx-auto gap-3 transition-all duration-200"
          >
            <StopIcon className="w-6 h-6" />
            Stop Session
          </button>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
      `}</style>
    </div>
  );
};

export default LiveConversation;