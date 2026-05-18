import Groq from 'groq-sdk';
import multer from 'multer';
import { Readable } from 'stream';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use memory storage (no disk on Vercel)
const upload = multer({ storage: multer.memoryStorage() });

export const config = {
  api: { bodyParser: false }  // required for multer
};

export default function handler(req, res) {
  upload.single('audio')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const file = req.file;
      // Convert buffer to a File-like object for Groq
      const blob = new Blob([file.buffer], { type: file.mimetype });
      const audioFile = new File([blob], file.originalname, { type: file.mimetype });

      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
        // add your language/other options from req.body here
      });

      // your existing SRT formatting logic here
      res.json({ srt: transcription });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}