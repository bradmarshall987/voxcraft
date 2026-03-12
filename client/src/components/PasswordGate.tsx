import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock } from "lucide-react";

const APP_PASSWORD = "mustang105";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [input, setValue] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (unlocked) return <>{children}</>;

  const attempt = () => {
    if (input === APP_PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none" aria-label="VoxCraft" className="text-primary">
            <rect x="2" y="10" width="3" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="7" y="6" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.7" />
            <rect x="12" y="2" width="3" height="24" rx="1.5" fill="currentColor" />
            <rect x="17" y="6" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.7" />
            <rect x="22" y="10" width="3" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
          </svg>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">VoxCraft</h1>
            <p className="text-sm text-muted-foreground">Enter password to continue</p>
          </div>
        </div>

        {/* Password card */}
        <div className="w-full rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Private access only</span>
          </div>

          <div className="relative">
            <input
              data-testid="input-password"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={input}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") attempt(); }}
              autoFocus
              className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm bg-background text-foreground focus:outline-none focus:ring-2 transition-colors ${
                error
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-border focus:ring-primary/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p data-testid="text-pw-error" className="text-xs text-destructive -mt-2">
              Incorrect password. Try again.
            </p>
          )}

          <Button
            data-testid="button-unlock"
            className="w-full"
            disabled={!input.trim()}
            onClick={attempt}
          >
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
