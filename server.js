require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

function secondsToSRT(secs) {
  const ms = Math.round((secs % 1) * 1000);
  const total = Math.floor(secs);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(n, len = 2) {
  return String(n).padStart(len, "0");
}

function splitToLines(text, maxChars) {
  if (text.length <= maxChars) return text;
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
      if (lines.length === 2) break;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2).join("\n");
}

async function transliterateToTanglish(text) {
  const chat = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are a Tamil transliterator. Convert Tamil script text into Tanglish (Tamil words written using English/Roman letters). Keep the pronunciation accurate. Do NOT translate to English meaning — only transliterate the sounds. Return ONLY the transliterated text, nothing else. No explanation, no extra lines.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });
  return chat.choices[0]?.message?.content?.trim() || text;
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded." });
  }

  const language = req.body.language || "auto";
  const maxChars = parseInt(req.body.maxChars) || 42;
  const tanglish = req.body.tanglish === "true";
  const tempPath = req.file.path;

  const ext = path.extname(req.file.originalname) || ".mp3";
  const renamedPath = tempPath + ext;
  fs.renameSync(tempPath, renamedPath);

  try {
    const transcriptionOptions = {
      file: fs.createReadStream(renamedPath),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    };

    if (language !== "auto") {
      const langMap = {
        English: "en", Tamil: "ta", Hindi: "hi", Telugu: "te",
        Kannada: "kn", Malayalam: "ml", Spanish: "es", French: "fr",
        German: "de", Japanese: "ja", Chinese: "zh", Arabic: "ar",
        Portuguese: "pt", Korean: "ko",
      };
      const code = langMap[language];
      if (code) transcriptionOptions.language = code;
    }

    const transcription = await groq.audio.transcriptions.create(transcriptionOptions);
    const segments = transcription.segments || [];

    if (!segments.length) {
      let text = transcription.text.trim();
      if (tanglish && language === "Tamil") {
        text = await transliterateToTanglish(text);
      }
      const srt = `1\n00:00:00,000 --> 00:00:05,000\n${text}\n`;
      return res.json({ srt, filename: req.file.originalname });
    }

    let segmentTexts = segments.map((s) => s.text.trim());

    if (tanglish && language === "Tamil") {
      const joined = segmentTexts.join("\n||||\n");
      const transliterated = await transliterateToTanglish(joined);
      const parts = transliterated.split("\n||||\n").map((t) => t.trim());
      if (parts.length === segments.length) {
        segmentTexts = parts;
      } else {
        segmentTexts = await Promise.all(
          segments.map((s) => transliterateToTanglish(s.text.trim()))
        );
      }
    }

    let srt = "";
    let index = 1;

    segments.forEach((seg, i) => {
      const start = secondsToSRT(seg.start);
      const end = secondsToSRT(seg.end);
      const text = segmentTexts[i] || seg.text.trim();
      if (!text) return;
      const lines = splitToLines(text, maxChars);
      srt += `${index}\n${start} --> ${end}\n${lines}\n\n`;
      index++;
    });

    res.json({ srt: srt.trim(), filename: req.file.originalname });
  } catch (err) {
    console.error("Groq API error:", err);
    const msg = err?.error?.message || err?.message || "Transcription failed.";
    res.status(500).json({ error: msg });
  } finally {
    try { fs.unlinkSync(renamedPath); } catch (_) {}
  }
});

app.listen(PORT, () => {
  console.log(`\n🎙  Audio → SRT server running at http://localhost:${PORT}\n`);
});