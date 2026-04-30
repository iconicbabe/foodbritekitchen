import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PASSCODE_STORAGE_KEY = "foodbrite-admin-passcode-v1";
const SESSION_STORAGE_KEY = "foodbrite-admin-unlocked-v1";

type Mode = "setup" | "locked" | "unlocked";

const readPasscode = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PASSCODE_STORAGE_KEY);
};

const isUnlocked = () => {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";
};

type AdminGateProps = {
  children: (lock: () => void) => ReactNode;
};

const AdminGate = ({ children }: AdminGateProps) => {
  const [mode, setMode] = useState<Mode>("locked");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readPasscode();
    if (!stored) {
      setMode("setup");
    } else if (isUnlocked()) {
      setMode("unlocked");
    } else {
      setMode("locked");
    }
  }, []);

  const handleSetup = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (passcode.trim().length < 4) {
      setError("Use at least 4 characters for the passcode.");
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("The two passcodes do not match.");
      return;
    }

    window.localStorage.setItem(PASSCODE_STORAGE_KEY, passcode);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
    setPasscode("");
    setConfirmPasscode("");
    setMode("unlocked");
  };

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const stored = readPasscode();
    if (stored && passcode === stored) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
      setPasscode("");
      setMode("unlocked");
    } else {
      setError("Wrong passcode. Try again.");
    }
  };

  const lock = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setMode("locked");
  };

  const handleResetPasscode = () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Reset the admin passcode? You will set a new one on the next screen. Menu data is not affected.",
    );
    if (!confirmed) return;
    window.localStorage.removeItem(PASSCODE_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setPasscode("");
    setConfirmPasscode("");
    setError(null);
    setMode("setup");
  };

  if (mode === "unlocked") {
    return <>{children(lock)}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === "setup" ? "Set admin passcode" : "Admin access"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "setup"
                ? "Create a passcode for this browser. You will need it to open /admin again."
                : "Enter the passcode to manage the weekly menu."}
            </p>
          </div>
        </div>

        <form
          onSubmit={mode === "setup" ? handleSetup : handleUnlock}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="admin-passcode">Passcode</Label>
            <Input
              id="admin-passcode"
              type="password"
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
              autoFocus
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
            />
          </div>

          {mode === "setup" && (
            <div className="space-y-2">
              <Label htmlFor="admin-passcode-confirm">Confirm passcode</Label>
              <Input
                id="admin-passcode-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPasscode}
                onChange={(event) => setConfirmPasscode(event.target.value)}
                placeholder="Repeat passcode"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            {mode === "setup" ? "Save passcode & continue" : "Unlock admin"}
          </Button>
        </form>

        {mode === "locked" && (
          <button
            type="button"
            onClick={handleResetPasscode}
            className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Forgot passcode? Reset on this browser.
          </button>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          The passcode is stored only in this browser. Anyone with access to this device or who clears
          storage can reset it. For stronger protection, use Lovable Cloud authentication.
        </p>
      </div>
    </div>
  );
};

export default AdminGate;
