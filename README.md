# 🖥️ CodeScreen — AI Interview Simulator

A full-stack AI-powered technical interview simulator built with Node.js + Express + Claude AI.

---

## 🚀 Quick Setup (3 steps)

### Step 1 — Prerequisites
Make sure you have **Node.js** installed (v16+):
```
node --version
```
If not, download it from: https://nodejs.org

---

### Step 2 — Install Dependencies
Open a terminal inside this folder and run:
```bash
npm install
```

---

### Step 3 — Add Your API Key
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and replace `your_anthropic_api_key_here` with your real key:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx
   ```
   Get your key at: https://console.anthropic.com/

---

### Step 4 — Run the App
```bash
npm start
```
Then open your browser at: **http://localhost:3000**

For development with auto-restart:
```bash
npm run dev
```

---

## 📁 Project Structure

```
ai-interview-simulator/
├── server.js          ← Express backend + API routes + question bank
├── package.json       ← Dependencies
├── .env               ← Your API key (create from .env.example)
├── .env.example       ← Template for .env
└── public/
    ├── index.html     ← Full SPA frontend
    ├── style.css      ← All styles
    └── app.js         ← Frontend JavaScript logic
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 📋 Question Bank | 6 questions across Easy / Medium / Hard |
| ⏱️ Timed Sessions | Per-question time limits with live countdown |
| 🤖 AI Evaluation | Claude grades correctness, efficiency & code quality |
| 💡 AI Hints | 3-level hint system (subtle → detailed) |
| 📊 Score Breakdown | Animated score ring + sub-score bars |
| 🧩 Complexity Analysis | Time & space complexity from AI |
| 💡 Optimal Solutions | View the best approach after submitting |
| 🌐 Multi-language | JavaScript, Python, Java |

---

## 🔧 How to Add More Questions

Open `server.js` and find the `questionBank` object. Add a new entry under `easy`, `medium`, or `hard`:

```javascript
{
  id: 7,                          // unique number
  title: "Your Question Title",
  difficulty: "Easy",             // Easy | Medium | Hard
  category: "Arrays",
  timeLimit: 900,                 // seconds
  description: `Problem description here.`,
  examples: [
    { input: "nums = [1,2]", output: "3" }
  ],
  constraints: ["1 <= n <= 100"],
  starterCode: `function solution(input) {\n    \n}`
}
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) |
| `PORT` | Server port (default: 3000) |

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Frontend**: Vanilla HTML/CSS/JS (no build step needed)
- **Fonts**: Space Mono + Syne (Google Fonts)
