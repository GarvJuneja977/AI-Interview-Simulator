# 🖥️ CodeScreen — AI Interview Simulator

A local AI-powered technical interview simulator with a real-time interviewer (Alex), camera/mic proctoring, face detection, speech synthesis, and speech recognition.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js |
| AI | Groq SDK (`llama-3.3-70b-versatile`) |
| Frontend | Vanilla HTML/CSS/JavaScript |
| Face Detection | face-api.js (TinyFaceDetector) |
| Speech | Web Speech API (SpeechSynthesis + SpeechRecognition) |
| Fonts | Space Mono + Syne (Google Fonts) |

---

## 📁 Project Structure

```
ai-interview-simulator/
├── server.js          # Express backend + Groq API routes
├── public/
│   ├── index.html     # Single-page app (all screens)
│   ├── style.css      # All styles
│   └── app.js         # All frontend logic
├── .env               # API keys (not committed)
├── package.json
└── README.md
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env` file
```
GROQ_API_KEY=your_groq_api_key_here
PORT=3000

Get your free Groq API key at: https://console.groq.com
```

### 3. Run the server
```bash
npm start
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 🎯 Features

### 22 Coding Problems
| Difficulty | Count | Problems |
|---|---|---|
| Easy | 9 | Two Sum, Palindrome Check, FizzBuzz, Reverse String, Max Subarray, Climb Stairs, Contains Duplicate, Best Time to Buy Stock, Valid Anagram |
| Medium | 8 | Longest Substring, Valid Parentheses, 3Sum, Product Except Self, Binary Search, Number of Islands, Coin Change, Group Anagrams |
| Hard | 5 | Merge K Sorted Lists, Trapping Rain Water, Median of Two Sorted Arrays, Word Break, Longest Palindromic Substring |

### 4 Languages Supported
- JavaScript
- Python
- Java
- C++ (with full class structure + `main()` driver)

### AI Interviewer (Alex)
- Explains the problem in 5 complete sentences at the start
- Speaks using Web Speech API (TTS)
- Listens to your voice using Web Speech Recognition
- Analyzes your code every 60 seconds if it changed
- Gives stuck hints if no code change for 2 minutes
- Asks follow-up questions about your approach
- Timer reminders at halfway, 3 min, 1 min, 30 sec

### Proctoring System
- Fullscreen enforced throughout interview
- Tab switch detection → violation
- Window/app switch detection → violation
- Fullscreen exit detection → violation
- Face detection via face-api.js (TinyFaceDetector)
- Multiple faces in frame → violation
- Face missing 8+ seconds → violation
- Right-click disabled
- Copy detection logged
- DevTools shortcut blocked (F12, Ctrl+Shift+I)
- 10 violations → interview terminated

### Results Screen
- Verdict: Accepted / Wrong Answer / Incomplete
- Score (0–100) with animated ring
- Correctness, Efficiency, Code Quality sub-scores
- Time & Space Complexity
- Strengths and Improvements lists
- Optimal approach description + sample code

---

## 🔧 API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/questions` | Returns all 22 questions |
| GET | `/api/questions/:id` | Returns single question by ID |
| POST | `/api/evaluate` | Evaluates submitted solution via Groq |
| POST | `/api/hint` | Returns 3-level hints via Groq |
| POST | `/api/interviewer` | AI interviewer responses (intro/analysis/chat) |

### Interviewer Trigger Types
- `question_intro` — 5-sentence problem explanation (max 400 tokens)
- `code_analysis` — Brief code observation (max 100 tokens)
- `stuck_hint` — Encouraging nudge when stuck (max 100 tokens)
- `user` — Response to candidate's spoken/typed message (max 100 tokens)

---

## 🎙️ Speech System

### Text-to-Speech (Alex speaking)
- Chunked by sentence for natural delivery
- Preferred voices: Google UK English Male → Google US English → Microsoft Ryan → Daniel → Alex
- Rate: 1.15x
- Speech queue prevents overlap — messages wait their turn
- Mic paused while Alex speaks to prevent feedback

### Speech Recognition (You speaking)
- Chrome Web Speech API (`webkitSpeechRecognition`)
- Continuous listening with interim results shown in text box
- Auto-sends after 2 seconds of silence
- Ignores input while Alex is speaking
- Auto-restarts after Alex finishes

---

## 🔒 Chrome Permissions Required

The app requires these permissions on `http://localhost:3000`:

1. **Camera** — for identity verification and face detection
2. **Microphone** — for voice responses and speech recognition

To grant permissions:
1. Click the 🔒 icon in Chrome's address bar
2. Set Camera → **Allow**
3. Set Microphone → **Allow**
4. Refresh the page

Or go to `chrome://settings/content/camera` and `chrome://settings/content/microphone` and ensure `localhost:3000` is in the **Allowed** list.

---

## 🖥️ Interview Flow

```
Landing Screen
↓
Question Select (filter by Easy/Medium/Hard)
↓
Setup Screen (click "Check Camera & Microphone")
↓ camera ✓, mic ✓
Begin Interview → Fullscreen
↓
Alex explains the problem (TTS)
↓
Timer starts + Mic turns on
↓
Code → Hints → Ask Alex → Voice chat
↓
Submit Solution
↓
Results Screen (score, feedback, optimal solution)
↓
Retry or Back to Questions

```

---

## 🐛 Known Issues & Notes

- **HTTP only** — Chrome may block mic/camera on HTTP. If issues persist, generate a local SSL cert with `npx mkcert localhost` and switch to HTTPS.
- **Close DevTools during interview** — DevTools open = page loses focus = speech recognition fails with `not-allowed` error.
- **face-api.js models** — Loaded from `justadudewhohacks.github.io`. If that CDN is down, face detection falls back to basic camera-active check (no violations triggered).
- **Groq rate limits** — Free tier has request limits. If evaluation fails, a fallback score of 70 is returned.

---

## 📦 Dependencies

```json
{
  "groq-sdk": "latest",
  "express": "latest",
  "cors": "latest",
  "dotenv": "latest"
}
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |
| `PORT` | Server port (default: 3000) |
