# DealMentor AI

An AI-powered sales and business coaching intelligence platform that provides real-time analysis and feedback on sales calls and business conversations.

## Features

- **Audio Recording & Analysis**: Record sales pitches and get instant AI-powered feedback
- **File Upload Analysis**: Upload existing audio files for analysis
- **Live AI Advisor**: Real-time conversation with an AI business advisor
- **Sentiment Analysis**: Track sentiment and engagement throughout conversations
- **Coaching Tips**: Get actionable suggestions for improvement
- **Session Management**: Save and review past analysis sessions
- **Audio Feedback**: Listen to AI-generated audio feedback
- **Export Functionality**: Download analysis reports and audio files

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: Google Gemini API
- **Audio Processing**: Web Audio API
- **File Handling**: JSZip

## Setup Instructions

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dealmentor-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Get your API key from: https://aistudio.google.com/app/apikey

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Recording a Sales Pitch

1. Click "Record & Analyze" on the home screen
2. Allow microphone permissions when prompted
3. Click "Start Recording" and speak your pitch
4. Click "Stop Recording" when finished
5. Click "Analyze Now" to get AI feedback

### Analyzing an Audio File

1. Click "Analyze Audio File" on the home screen
2. Upload an audio file (MP3, WAV, M4A, etc.)
3. Click "Analyze" to process the file
4. Review the analysis results

### Live AI Advisor

1. Click "Live Q&A with AI" on the home screen
2. Click "Start Session" to begin
3. Speak your business questions
4. Listen to the AI's responses
5. Click "Stop Session" when finished

### Viewing Analysis Results

- **Summary**: Overview of the conversation
- **Sentiment Chart**: Visual representation of sentiment and engagement over time
- **Transcript**: Full conversation with highlighted coaching notes
- **Coaching Tips**: Actionable suggestions for improvement
- **Audio Feedback**: Listen to AI-generated feedback

### Managing Sessions

- View past sessions in the sidebar
- Click on any session to review it
- Delete sessions you no longer need
- Download individual sessions or all sessions as ZIP files

## API Configuration

The application uses Google's Gemini API for:
- Audio transcription
- Sentiment analysis
- Coaching tip generation
- Text-to-speech conversion
- Live conversation processing

Make sure to set up your API key in the environment variables before running the application.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: Some features may require modern browser support for Web Audio API and MediaRecorder.

## Troubleshooting

### Common Issues

1. **Microphone not working**: Ensure you've granted microphone permissions
2. **API errors**: Check that your Gemini API key is correctly set
3. **Audio playback issues**: Try refreshing the page or using a different browser
4. **File upload errors**: Ensure the audio file is under 25MB and in a supported format

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key is correct
3. Ensure you have a stable internet connection
4. Try refreshing the page

## License

This project is licensed under the MIT License - see the LICENSE file for details.