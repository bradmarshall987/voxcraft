import type { Express } from "express";
import type { Server } from "http";
import { generationSchema } from "@shared/schema";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// Built-in voice list (ElevenLabs default voices)
const DEFAULT_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "Female", accent: "American", description: "Calm, narration" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "Female", accent: "American", description: "Strong, expressive" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "Female", accent: "American", description: "Soft, narrative" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "Male", accent: "American", description: "Well-rounded" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "Female", accent: "American", description: "Emotional, young" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "Male", accent: "American", description: "Deep, narrative" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "Male", accent: "American", description: "Crisp, authoritative" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "Male", accent: "American", description: "Deep, narrative" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "Male", accent: "American", description: "Raspy, strong" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "Male", accent: "British", description: "Deep, authoritative" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", gender: "Male", accent: "American", description: "Whisper, ASMR" },
  { id: "piTKgcLEGmPE4e6mEKli", name: "Nicole", gender: "Female", accent: "American", description: "Whisper, audiobook" },
];

export function registerRoutes(httpServer: Server, app: Express) {
  // List available voices (combines defaults + any user voices if API key provided)
  app.get("/api/voices", async (req, res) => {
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) {
      return res.json({ voices: DEFAULT_VOICES });
    }

    try {
      const response = await fetch(`${ELEVENLABS_API}/voices`, {
        headers: { "xi-api-key": apiKey },
      });
      if (!response.ok) {
        return res.json({ voices: DEFAULT_VOICES });
      }
      const data = await response.json() as any;
      const voices = (data.voices || []).map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender || "Unknown",
        accent: v.labels?.accent || "Unknown",
        description: v.labels?.description || v.labels?.use_case || "",
      }));
      return res.json({ voices: voices.length > 0 ? voices : DEFAULT_VOICES });
    } catch {
      return res.json({ voices: DEFAULT_VOICES });
    }
  });

  // Generate speech
  app.post("/api/generate", async (req, res) => {
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "ElevenLabs API key required. Add it in Settings." });
    }

    const parsed = generationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { text, voiceId, stability, similarityBoost, style, useSpeakerBoost } = parsed.data;

    try {
      const response = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let message = "ElevenLabs API error";
        try {
          const errJson = JSON.parse(errText);
          message = errJson?.detail?.message || errJson?.detail || message;
        } catch {}
        return res.status(response.status).json({ error: message });
      }

      const audioBuffer = await response.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.set("Content-Disposition", "attachment; filename=speech.mp3");
      res.send(Buffer.from(audioBuffer));
    } catch (err: any) {
      console.error("TTS error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
}
