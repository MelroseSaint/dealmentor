export interface GeminiAudio {
  mimeType: string;
  data: string; // base64 encoded
}

export interface TranscriptLine {
  speaker: 'A' | 'B' | string; // Speaker A is salesperson, B is client
  line: string;
}

export interface SentimentDataPoint {
  turn: number;
  sentiment: number;
  engagement: number;
}

export interface TranscriptHighlight {
  lineIndex: number;
  comment: string;
}

export interface CoachingTip {
  title: string;
  suggestion: string;
}

export interface AnalysisResult {
  id: string;
  date: string;
  summary: string;
  sentimentData: SentimentDataPoint[];
  highlights: TranscriptHighlight[];
  coachingTips: CoachingTip[];
  transcript: TranscriptLine[];
  audioFeedbackBase64?: string;
}

export interface ConversationLine {
    speaker: 'user' | 'model';
    text: string;
}
