import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import {
  Sun, Moon, Volume2, Download, Loader2, Settings, X,
  ChevronDown, Mic, MicOff, Play, Pause, RotateCcw,
  FileAudio, Copy, Check, Square, Upload
} from "lucide-react";

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  description: string;
}

type Tab = "tts" | "stt";
type RecordState = "idle" | "recording" | "recorded";

const CHAR_LIMIT = 5000;

const DEFAULT_VOICES: Voice[] = [
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

// ─── API Key Modal ────────────────────────────────────────────────────────────
function ApiKeyModal({ onClose, onSave }: { onClose: () => void; onSave: (key: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">ElevenLabs API Key</h2>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="close-modal"><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your key is used only for this session and never stored on any server. Get one at{" "}
          <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">elevenlabs.io</a>.
        </p>
        <input
          data-testid="input-apikey"
          type="password"
          placeholder="sk-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onSave(value.trim()); }}
        />
        <Button
          data-testid="button-save-apikey"
          className="w-full"
          disabled={!value.trim()}
          onClick={() => onSave(value.trim())}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}

// ─── Waveform (TTS playback) ──────────────────────────────────────────────────
function WaveformAnimation({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full bg-primary transition-all ${isPlaying ? "animate-waveform" : "h-[3px] opacity-40"}`}
          style={isPlaying ? { animationDelay: `${(i * 0.07).toFixed(2)}s`, height: `${6 + Math.sin(i * 0.8) * 8 + 6}px` } : {}}
        />
      ))}
    </div>
  );
}

// ─── Recording pulse ──────────────────────────────────────────────────────────
function RecordingPulse() {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full bg-destructive animate-waveform"
          style={{ animationDelay: `${(i * 0.07).toFixed(2)}s`, height: `${6 + Math.sin(i * 0.8) * 8 + 6}px` }}
        />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TTSApp() {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();

  // Shared state
  const [activeTab, setActiveTab] = useState<Tab>("tts");
  const [apiKey, setApiKey] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);

  // ── TTS state ──
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<Voice[]>(DEFAULT_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(DEFAULT_VOICES[0]);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [style, setStyle] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── STT state ──
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Fetch custom voices when API key saved ──
  const fetchCustomVoices = async (key: string) => {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fetched: Voice[] = (data.voices || []).map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender || "Unknown",
        accent: v.labels?.accent || "Unknown",
        description: v.labels?.description || v.labels?.use_case || "",
      }));
      if (fetched.length > 0) {
        setVoices(fetched);
        setSelectedVoice(fetched[0]);
      }
    } catch {}
  };

  // ── Close voice dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  // ── Cleanup recording timer on unmount ──
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ════════════════════════════════════════
  // TTS handlers
  // ════════════════════════════════════════
  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({ title: "No text entered", description: "Type something to convert.", variant: "destructive" });
      return;
    }
    if (!apiKey) { setShowApiModal(true); return; }

    setIsGenerating(true);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    setProgress(0);

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id}`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({
            text: text.trim(),
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability, similarity_boost: similarity, style, use_speaker_boost: true },
          }),
        }
      );
      if (!res.ok) {
        let message = "ElevenLabs API error";
        try { const j = await res.json(); message = j?.detail?.message || j?.detail || message; } catch {}
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.load(); }
      toast({ title: "Audio ready", description: "Hit play or download below." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
    setProgress(ratio * duration);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
    setIsPlaying(false);
  };

  const handleDownloadTTS = () => {
    if (!audioBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(audioBlob);
    a.download = `speech-${Date.now()}.mp3`;
    a.click();
  };

  // ════════════════════════════════════════
  // STT handlers
  // ════════════════════════════════════════
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setUploadedFile(null);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordState("recording");
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Allow microphone access in your browser to record.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordState("recorded");
  };

  const resetRecording = () => {
    setRecordState("idle");
    setRecordedBlob(null);
    setUploadedFile(null);
    setTranscript("");
    setRecordSeconds(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setRecordedBlob(null);
    setRecordState("recorded");
    setTranscript("");
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleTranscribe = async () => {
    if (!apiKey) { setShowApiModal(true); return; }

    const source = recordedBlob || uploadedFile;
    if (!source) return;

    setIsTranscribing(true);
    setTranscript("");

    try {
      const formData = new FormData();
      const ext = source instanceof File ? source.name.split(".").pop() || "mp3" : "webm";
      const filename = `audio.${ext}`;
      formData.append("audio", source, filename);
      formData.append("model_id", "scribe_v1");

      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
      });

      if (!res.ok) {
        let message = "Transcription failed";
        try { const j = await res.json(); message = j?.detail?.message || j?.detail || message; } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      const text = data.text || data.transcript || "";
      if (!text) throw new Error("No transcript returned");
      setTranscript(text);
    } catch (err: any) {
      toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendToTTS = () => {
    setText(transcript);
    setActiveTab("tts");
  };

  const audioInput = recordedBlob || uploadedFile;
  const charCount = text.length;
  const charWarning = charCount > CHAR_LIMIT * 0.9;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <audio ref={audioRef} />
      <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleFileUpload} />

      {showApiModal && (
        <ApiKeyModal
          onClose={() => setShowApiModal(false)}
          onSave={(key) => { setApiKey(key); setShowApiModal(false); fetchCustomVoices(key); }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="VoxCraft logo" className="text-primary shrink-0">
              <rect x="2" y="10" width="3" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
              <rect x="7" y="6" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="12" y="2" width="3" height="24" rx="1.5" fill="currentColor" />
              <rect x="17" y="6" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="22" y="10" width="3" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
            </svg>
            <span className="font-semibold text-foreground tracking-tight">VoxCraft</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-api-settings"
              size="sm"
              variant={apiKey ? "outline" : "default"}
              onClick={() => setShowApiModal(true)}
              className="gap-1.5 text-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              {apiKey ? "API Key ✓" : "Set API Key"}
            </Button>
            <Button
              data-testid="button-theme-toggle"
              size="icon"
              variant="ghost"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
          <button
            data-testid="tab-tts"
            onClick={() => setActiveTab("tts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "tts"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Text → Speech
          </button>
          <button
            data-testid="tab-stt"
            onClick={() => setActiveTab("stt")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "stt"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Speech → Text
          </button>
        </div>

        {/* ── TTS Panel ── */}
        {activeTab === "tts" && (
          <>
            <div>
              <h1 className="text-xl font-semibold text-foreground leading-tight">Text to Speech</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Powered by ElevenLabs — professional AI voices.</p>
            </div>

            {/* Text input */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Text</label>
                <span
                  data-testid="text-charcount"
                  className={`text-xs tabular-nums ${charWarning ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
                </span>
              </div>
              <Textarea
                data-testid="input-text"
                placeholder="Type or paste your text here…"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAR_LIMIT))}
                className="min-h-[160px] resize-y border-0 bg-transparent p-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Voice + Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</label>
                <div ref={dropdownRef} className="relative">
                  <button
                    data-testid="button-voice-dropdown"
                    onClick={() => setVoiceDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{selectedVoice.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{selectedVoice.accent}</Badge>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${voiceDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {voiceDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
                      {voices.map((v) => (
                        <button
                          data-testid={`voice-option-${v.id}`}
                          key={v.id}
                          onClick={() => { setSelectedVoice(v); setVoiceDropdownOpen(false); }}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors ${selectedVoice.id === v.id ? "bg-primary/10" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{v.name}</span>
                              <Badge variant="outline" className="text-xs">{v.gender}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{v.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{v.accent}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedVoice.description && (
                  <p className="text-xs text-muted-foreground">{selectedVoice.description}</p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stability</label>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={1} step={0.01} value={[stability]} onValueChange={([v]) => setStability(v)} className="flex-1" />
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(stability * 100)}%</span>
                </div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clarity</label>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={1} step={0.01} value={[similarity]} onValueChange={([v]) => setSimilarity(v)} className="flex-1" />
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(similarity * 100)}%</span>
                </div>
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs text-primary underline underline-offset-2 text-left w-fit"
                >
                  {showAdvanced ? "Hide" : "Show"} advanced settings
                </button>
                {showAdvanced && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-border">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Style Exaggeration</label>
                    <div className="flex items-center gap-3">
                      <Slider min={0} max={1} step={0.01} value={[style]} onValueChange={([v]) => setStyle(v)} className="flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(style * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              data-testid="button-generate"
              size="lg"
              className="w-full gap-2 font-medium"
              disabled={isGenerating || !text.trim()}
              onClick={handleGenerate}
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Volume2 className="w-4 h-4" /> Generate Speech</>}
            </Button>

            {audioUrl && (
              <div data-testid="audio-player" className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Button data-testid="button-play-pause" size="icon" onClick={togglePlay} className="shrink-0">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <WaveformAnimation isPlaying={isPlaying} />
                    <div className="h-1.5 rounded-full bg-border cursor-pointer overflow-hidden" onClick={handleSeek}>
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }} />
                    </div>
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatTime(progress)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={handleRestart} title="Restart"><RotateCcw className="w-4 h-4" /></Button>
                    <Button data-testid="button-download" size="icon" variant="outline" onClick={handleDownloadTTS} title="Download MP3"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Voice: <span className="text-foreground">{selectedVoice.name}</span> · Model: eleven_multilingual_v2 · MP3
                </p>
              </div>
            )}
          </>
        )}

        {/* ── STT Panel ── */}
        {activeTab === "stt" && (
          <>
            <div>
              <h1 className="text-xl font-semibold text-foreground leading-tight">Speech to Text</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Record your voice or upload an audio file — transcribed by ElevenLabs Scribe.</p>
            </div>

            {/* Record / Upload card */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-5">

              {/* Big record button */}
              <div className="flex flex-col items-center gap-3">
                {recordState === "idle" && (
                  <button
                    data-testid="button-start-record"
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    title="Start recording"
                  >
                    <Mic className="w-8 h-8 text-primary-foreground" />
                  </button>
                )}
                {recordState === "recording" && (
                  <button
                    data-testid="button-stop-record"
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    title="Stop recording"
                  >
                    <Square className="w-7 h-7 text-white fill-white" />
                  </button>
                )}
                {recordState === "recorded" && (
                  <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center">
                    <FileAudio className="w-8 h-8 text-primary" />
                  </div>
                )}

                {/* Status label */}
                <div className="flex flex-col items-center gap-1">
                  {recordState === "idle" && (
                    <p className="text-sm text-muted-foreground">Tap to record</p>
                  )}
                  {recordState === "recording" && (
                    <div className="flex flex-col items-center gap-2">
                      <RecordingPulse />
                      <p className="text-sm text-destructive font-medium tabular-nums">
                        Recording · {formatTime(recordSeconds)}
                      </p>
                    </div>
                  )}
                  {recordState === "recorded" && !uploadedFile && (
                    <p className="text-sm text-foreground font-medium">
                      Recording ready · {formatTime(recordSeconds)}
                    </p>
                  )}
                  {recordState === "recorded" && uploadedFile && (
                    <p className="text-sm text-foreground font-medium truncate max-w-[200px]">
                      {uploadedFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Divider + Upload */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                data-testid="button-upload"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload audio file
              </Button>
              <p className="text-xs text-muted-foreground -mt-2">MP3, WAV, M4A, WEBM, OGG, FLAC · max 1 hour</p>

              {/* Action buttons */}
              {recordState !== "idle" && (
                <div className="flex gap-2 w-full max-w-xs pt-2 border-t border-border">
                  <Button
                    data-testid="button-reset-record"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={resetRecording}
                    disabled={isTranscribing}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                  <Button
                    data-testid="button-transcribe"
                    size="sm"
                    className="flex-1 gap-2"
                    disabled={isTranscribing || !audioInput || recordState === "recording"}
                    onClick={handleTranscribe}
                  >
                    {isTranscribing
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing…</>
                      : <><Mic className="w-3.5 h-3.5" /> Transcribe</>
                    }
                  </Button>
                </div>
              )}
            </div>

            {/* Transcript output */}
            {(transcript || isTranscribing) && (
              <div data-testid="transcript-card" className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transcript</label>
                  <div className="flex items-center gap-1">
                    {transcript && (
                      <>
                        <Button
                          data-testid="button-copy"
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs h-7 px-2"
                          onClick={handleCopy}
                        >
                          {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </Button>
                        <Button
                          data-testid="button-send-to-tts"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7 px-2"
                          onClick={handleSendToTTS}
                        >
                          <Volume2 className="w-3 h-3" />
                          Use in TTS
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isTranscribing && !transcript ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transcribing your audio…
                  </div>
                ) : (
                  <p data-testid="text-transcript" className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {transcript}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
