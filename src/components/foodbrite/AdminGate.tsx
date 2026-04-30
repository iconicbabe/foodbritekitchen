import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/foodbrite-content";

type Mode = "loading" | "setup" | "locked" | "unlocked";

type AdminGateProps = {
  children: (ctx: { lock: () => void; passcode: string }) => ReactNode;
};

const AdminGate = ({ children }: AdminGateProps) => {
  const [mode, setMode] = useState<Mode>("loading");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [sessionPasscode, setSessionPasscode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .status()
      .then((res) => {
        if (cancelled) return;
        setMode(res.isSetup ? "locked" : "setup");
      })
      .catch(() => {
        if (!cancelled) setMode("locked");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetup = async (event: FormEvent) => {
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
    setBusy(true);
    try {
      await adminApi.setup(passcode);
      setSessionPasscode(passcode);
      setPasscode("");
      setConfirmPasscode("");
      setMode("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set passcode.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await adminApi.verify(passcode);
      if (res.ok) {
        setSessionPasscode(passcode);
        setPasscode("");
        setMode("unlocked");
      } else {
        setError("Wrong passcode. Try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify passcode.");
    } finally {
      setBusy(false);
    }
  };

  const lock = () => {
    setSessionPasscode("");
    setMode("locked");
  };

  if (mode === "unlocked") {
    return <>{children({ lock, passcode: sessionPasscode })}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === "setup" ? "Set admin passcode" : mode === "loading" ? "Loading…" : "Admin access"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "setup"
                ? "Create a passcode for the Foodbrite admin. It is stored securely in Lovable Cloud and works on every device."
                : mode === "loading"
                  ? "Checking admin status…"
                  : "Enter the passcode to manage the weekly menu."}
            </p>
          </div>
        </div>

        {mode !== "loading" && (
          <form onSubmit={mode === "setup" ? handleSetup : handleUnlock} className="mt-6 space-y-4">
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

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Working…" : mode === "setup" ? "Save passcode & continue" : "Unlock admin"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Your passcode is stored as a salted hash in Lovable Cloud and never sent in plain text to the browser.
        </p>
      </div>
    </div>
  );
};

export default AdminGate;
