import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Plus, Save, Trash2 } from "lucide-react";
import AdminGate from "@/components/foodbrite/AdminGate";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmptyWeeklyDrop,
  defaultFoodbriteContent,
  formatHourLabel,
  loadFoodbriteContent,
  resetFoodbriteContent,
  saveFoodbriteContent,
  weekdayOptions,
  type FoodbriteContent,
  type WeeklyDropConfig,
} from "@/lib/foodbrite-content";

const selectClassName =
  "flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClassName =
  "flex min-h-28 w-full rounded-[1.25rem] border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const Admin = () => {
  const [draft, setDraft] = useState<FoodbriteContent>(() => loadFoodbriteContent());
  const [saveMessage, setSaveMessage] = useState("Loaded from this browser.");

  const totalOpenPlates = useMemo(
    () => draft.weeklyDrops.reduce((sum, drop) => sum + Math.max(drop.platesLeft, 0), 0),
    [draft.weeklyDrops],
  );

  const updateSettings = (field: keyof FoodbriteContent["settings"], value: string) => {
    setDraft((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value,
      },
    }));
    setSaveMessage("Unsaved changes.");
  };

  const updateDrop = <K extends keyof WeeklyDropConfig>(id: string, field: K, value: WeeklyDropConfig[K]) => {
    setDraft((current) => ({
      ...current,
      weeklyDrops: current.weeklyDrops.map((drop) => (drop.id === id ? { ...drop, [field]: value } : drop)),
    }));
    setSaveMessage("Unsaved changes.");
  };

  const addDrop = () => {
    setDraft((current) => ({
      ...current,
      weeklyDrops: [...current.weeklyDrops, createEmptyWeeklyDrop()],
    }));
    setSaveMessage("Unsaved changes.");
  };

  const removeDrop = (id: string) => {
    if (draft.weeklyDrops.length === 1) return;

    setDraft((current) => ({
      ...current,
      weeklyDrops: current.weeklyDrops.filter((drop) => drop.id !== id),
    }));
    setSaveMessage("Unsaved changes.");
  };

  const handleSave = () => {
    saveFoodbriteContent(draft);
    setSaveMessage("Saved locally — the live preview now uses these values on this device.");
  };

  const handleReset = () => {
    const resetContent = resetFoodbriteContent();
    setDraft(resetContent);
    setSaveMessage("Reset to the starter menu.");
  };

  return (
    <AdminGate>
      {(lock) => (
    <main className="section-shell py-6 sm:py-10">
      <div className="grid gap-6">
        <section className="panel-surface p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">Offline admin editor</span>
              <h1 className="text-4xl font-semibold text-foreground">Update Foodbrite without touching code</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                This editor stores changes in this browser only. Use it to update weekly meals, deadlines, prices, delivery copy,
                and social links for the current device preview.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="warmOutline">
                <Link to="/">
                  <ArrowLeft />
                  Back to storefront
                </Link>
              </Button>
              <Button variant="warmOutline" onClick={lock}>
                <Lock />
                Lock admin
              </Button>
              <Button variant="hero" onClick={handleSave}>
                <Save />
                Save locally
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Meals in rotation</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{draft.weeklyDrops.length}</p>
            </div>
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Open plates</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{totalOpenPlates}</p>
            </div>
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Editor status</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{saveMessage}</p>
            </div>
          </div>
        </section>

        <section className="panel-surface p-5 sm:p-7">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Business settings</span>
            <h2 className="text-3xl font-semibold text-foreground">Phones, delivery copy, and social links</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="whatsapp-phone">WhatsApp phone</Label>
              <Input id="whatsapp-phone" value={draft.settings.whatsappPhone} onChange={(event) => updateSettings("whatsappPhone", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="call-phone">Call phone</Label>
              <Input id="call-phone" value={draft.settings.callPhone} onChange={(event) => updateSettings("callPhone", event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="delivery-badge">Delivery badge text</Label>
              <Input
                id="delivery-badge"
                value={draft.settings.deliveryBadgeText}
                onChange={(event) => updateSettings("deliveryBadgeText", event.target.value)}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pickup-note">Pickup and delivery area note</Label>
              <textarea
                id="pickup-note"
                className={textareaClassName}
                value={draft.settings.pickupNote}
                onChange={(event) => updateSettings("pickupNote", event.target.value)}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="delivery-note">Delivery fee note</Label>
              <textarea
                id="delivery-note"
                className={textareaClassName}
                value={draft.settings.deliveryFeeNote}
                onChange={(event) => updateSettings("deliveryFeeNote", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instagram-url">Instagram URL</Label>
              <Input id="instagram-url" value={draft.settings.instagramUrl} onChange={(event) => updateSettings("instagramUrl", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tiktok-url">TikTok URL</Label>
              <Input id="tiktok-url" value={draft.settings.tiktokUrl} onChange={(event) => updateSettings("tiktokUrl", event.target.value)} />
            </div>
          </div>
        </section>

        <section className="panel-surface p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Weekly menu editor</span>
              <h2 className="text-3xl font-semibold text-foreground">Manage each batch drop</h2>
            </div>
            <Button variant="warmOutline" onClick={addDrop}>
              <Plus />
              Add weekly meal
            </Button>
          </div>

          <div className="mt-6 grid gap-5">
            {draft.weeklyDrops.map((drop, index) => (
              <article key={drop.id} className="rounded-[1.75rem] border border-border/70 bg-card/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Meal {index + 1}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-foreground">{drop.mealName}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Deadline currently shows as {formatHourLabel(drop.deadlineHour)}.</p>
                  </div>
                  <Button
                    variant="warmOutline"
                    size="sm"
                    onClick={() => removeDrop(drop.id)}
                    disabled={draft.weeklyDrops.length === 1}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="grid gap-2 xl:col-span-2">
                    <Label htmlFor={`meal-name-${drop.id}`}>Meal name</Label>
                    <Input id={`meal-name-${drop.id}`} value={drop.mealName} onChange={(event) => updateDrop(drop.id, "mealName", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`price-${drop.id}`}>Price (KES)</Label>
                    <Input
                      id={`price-${drop.id}`}
                      type="number"
                      min="0"
                      value={drop.price}
                      onChange={(event) => updateDrop(drop.id, "price", Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`plates-left-${drop.id}`}>Plates left</Label>
                    <Input
                      id={`plates-left-${drop.id}`}
                      type="number"
                      min="0"
                      value={drop.platesLeft}
                      onChange={(event) => updateDrop(drop.id, "platesLeft", Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`total-plates-${drop.id}`}>Total plates</Label>
                    <Input
                      id={`total-plates-${drop.id}`}
                      type="number"
                      min="1"
                      value={drop.totalPlates}
                      onChange={(event) => updateDrop(drop.id, "totalPlates", Math.max(Number(event.target.value) || 1, 1))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`cook-weekday-${drop.id}`}>Cook day</Label>
                    <select
                      id={`cook-weekday-${drop.id}`}
                      className={selectClassName}
                      value={drop.cookWeekday}
                      onChange={(event) => updateDrop(drop.id, "cookWeekday", Number(event.target.value))}
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`deadline-weekday-${drop.id}`}>Deadline day</Label>
                    <select
                      id={`deadline-weekday-${drop.id}`}
                      className={selectClassName}
                      value={drop.deadlineWeekday}
                      onChange={(event) => updateDrop(drop.id, "deadlineWeekday", Number(event.target.value))}
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`deadline-hour-${drop.id}`}>Deadline hour (24h)</Label>
                    <Input
                      id={`deadline-hour-${drop.id}`}
                      type="number"
                      min="0"
                      max="23"
                      value={drop.deadlineHour}
                      onChange={(event) => updateDrop(drop.id, "deadlineHour", Math.min(Math.max(Number(event.target.value) || 0, 0), 23))}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2 xl:col-span-4">
                    <Label htmlFor={`pickup-window-${drop.id}`}>Pickup / delivery window</Label>
                    <Input
                      id={`pickup-window-${drop.id}`}
                      value={drop.pickupWindow}
                      onChange={(event) => updateDrop(drop.id, "pickupWindow", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2 xl:col-span-4">
                    <Label htmlFor={`portion-${drop.id}`}>Portion description</Label>
                    <textarea
                      id={`portion-${drop.id}`}
                      className={textareaClassName}
                      value={drop.portion}
                      onChange={(event) => updateDrop(drop.id, "portion", event.target.value)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <span className="eyebrow">Reset options</span>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Reset clears this browser&apos;s saved version and restores the original Foodbrite starter content.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="warmOutline" onClick={() => setDraft(defaultFoodbriteContent)}>
              Reload defaults in editor
            </Button>
            <Button variant="hero" onClick={handleReset}>
              Reset browser data
            </Button>
          </div>
        </section>
      </div>
    </main>
      )}
    </AdminGate>
  );
};

export default Admin;