# 🎙 Audio → SRT Converter

Convert any audio file into a timestamped `.srt` subtitle file using Claude AI.

---

## ✨ Features

- Drag & drop audio upload (MP3, WAV, M4A, FLAC, OGG, AAC, WebM)
- Multi-language support (English, Tamil, Hindi, Spanish, and more)
- Configurable subtitle line length
- Syntax-highlighted SRT preview
- One-click download & copy

---

## 🚀 Quick Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Anthropic API key

**Mac / Linux:**
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=your_api_key_here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="your_api_key_here"
```

> Get your API key at https://console.anthropic.com

### 3. Start the server

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
audio-srt-app/
├── server.js          # Express backend + Anthropic API
├── package.json
├── public/
│   └── index.html     # Frontend (HTML + CSS + JS)
└── README.md
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `ANTHROPIC_API_KEY` | — | Required — your Anthropic key |

---

## 📦 Deploy to Railway / Render / Fly.io

Set `ANTHROPIC_API_KEY` as an environment variable in your hosting dashboard, then deploy the folder.

---

## 📝 Notes

- Max upload size: **25 MB**
- Best results on audio under **10 minutes**
- Timestamps are AI-estimated based on speech pacing
