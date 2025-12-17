import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { TranscriptLine, GeminiAudio, AnalysisResult } from '../types';

let activeRequests = new Set<Promise<any>>();
const MAX_CONCURRENT_REQUESTS = 3;

function getAiClient() {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error('API key is missing. Please set VITE_API_KEY in your environment variables.');
    }
    return new GoogleGenAI({ apiKey });
}

async function withRateLimit<T>(request: () => Promise<T>): Promise<T> {
    // Wait if too many active requests
    while (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const promise = request();
    activeRequests.add(promise);
    
    try {
        return await promise;
    } finally {
        activeRequests.delete(promise);
    }
}

export async function transcribeAudioFile(audio: GeminiAudio): Promise<string> {
    return withRateLimit(async () => {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';

        const audioPart = {
          inlineData: {
            mimeType: audio.mimeType,
            data: audio.data,
          },
        };
        const textPart = {
          text: "Transcribe this audio recording of a sales pitch. Provide only the text of the transcript."
        };

        const response = await ai.models.generateContent({
          model,
          contents: { parts: [audioPart, textPart] },
        });

        if (!response.text) {
            throw new Error('No text received from transcription service');
        }
        return response.text;
    });
}

export async function getAnalysisForTranscript(transcript: TranscriptLine[]): Promise<Omit<AnalysisResult, 'id' | 'date'>> {
    return withRateLimit(async () => {
        const ai = getAiClient();
        const model = 'gemini-2.5-pro'; // Use a more powerful model for complex analysis
    
    const transcriptText = transcript.map(t => `${t.speaker}: ${t.line}`).join('\n');

    const prompt = `
      Analyze the following sales pitch transcript. Provide the analysis in a JSON object format.

      Transcript:
      ---
      ${transcriptText}
      ---

      Based on the transcript, provide the following:
      1.  "summary": A concise one-paragraph summary of the conversation.
      2.  "sentimentData": An array of objects, one for each turn (line) of speaker A. Each object should have:
          -   "turn": The turn number (1-based index of speaker A's lines).
          -   "sentiment": A score from -1 (very negative) to 1 (very positive).
          -   "engagement": A score from 0 (not engaged) to 1 (very engaged), representing how engaged the speaker seems.
      3.  "highlights": An array of objects identifying key moments. Each object should have:
          -   "lineIndex": The 0-based index of the transcript line.
          -   "comment": A brief explanation of why this moment is significant (e.g., "Good use of open-ended question", "Missed a buying signal").
      4.  "coachingTips": An array of actionable coaching tips for the salesperson (Speaker A). Each object should have:
          -   "title": A short title for the tip (e.g., "Active Listening").
          -   "suggestion": A detailed suggestion for improvement.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    sentimentData: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                turn: { type: Type.INTEGER },
                                sentiment: { type: Type.NUMBER },
                                engagement: { type: Type.NUMBER },
                            },
                            required: ['turn', 'sentiment', 'engagement'],
                        },
                    },
                    highlights: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                lineIndex: { type: Type.INTEGER },
                                comment: { type: Type.STRING },
                            },
                            required: ['lineIndex', 'comment'],
                        },
                    },
                    coachingTips: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                suggestion: { type: Type.STRING },
                            },
                            required: ['title', 'suggestion'],
                        },
                    },
                },
                required: ['summary', 'sentimentData', 'highlights', 'coachingTips'],
            },
        },
    });

        try {
            if (!response.text) {
                throw new Error('No analysis received from AI service');
            }
            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText);
            // Add transcript to the result, as it's needed by Dashboard but not generated by Gemini
            return { ...result, transcript };
        } catch (e) {
            console.error("Failed to parse Gemini response as JSON", e, response.text);
            throw new Error("The analysis from the AI was in an incorrect format. Please try again.");
        }
    });
}

export async function getTextToSpeech(text: string): Promise<string> {
    return withRateLimit(async () => {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash-preview-tts';

        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts?.[0]?.inlineData?.data) {
            throw new Error("Failed to generate audio from text.");
        }
        return candidate.content.parts[0].inlineData.data;
    });
}

export function cancelAllRequests() {
    activeRequests.clear();
}
