import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import AdminGate from "@/components/foodbrite/AdminGate";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  adminApi,
  createEmptyWeeklyDrop,
  defaultFoodbriteContent,
  fetchFoodbriteContent,
  formatHourLabel,
  loadFoodbriteContent,
  weekdayOptions,
  type FoodbriteContent,
  type OrderRecord,
  type WeeklyDropConfig,
} from "@/lib/foodbrite-content";

const selectClassName =
  "flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClassName =
  "flex min-h-28 w-full rounded-[1.25rem] border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type AdminEditorProps = {
  lock: () => void;
  passcode: string;
};

type OrderStatus = "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled";

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "dispatched", "delivered"];

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-blue-500/15 text-blue-600 border border-blue-500/30";
    case "dispatched":
      return "bg-orange-500/15 text-orange-600 border border-orange-500/30";
    case "delivered":
      return "bg-green-500/15 text-green-600 border border-green-500/30";
    case "cancelled":
      return "bg-red-500/15 text-red-600 border border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};

const nextStatus = (current: string): OrderStatus | null => {
  const idx = STATUS_FLOW.indexOf(current as OrderStatus);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
};

const useOrders = (passcode: string) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listOrders(passcode);
      setOrders(res.orders);
    } catch (err) {
      toast({
        title: "Couldn't load orders",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = (id: string, status: OrderStatus) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  return { orders, loading, load, setStatus };
};

const OrdersPanel = ({
  passcode,
  orders,
  loading,
  reload,
  onStatusChange,
}: {
  passcode: string;
  orders: OrderRecord[];
  loading: boolean;
  reload: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) => {
  const { toast } = useToast();

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(passcode, id, status);
      onStatusChange(id, status);
      toast({ title: `Order ${status}` });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="panel-surface p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="eyebrow">Customer orders</span>
          <h2 className="text-3xl font-semibold text-foreground">Reservations from the storefront</h2>
          <p className="text-sm text-muted-foreground">
            Move each order through pending → confirmed → dispatched → delivered. Cancel any time if it falls through.
          </p>
        </div>
        <Button variant="warmOutline" onClick={reload} disabled={loading}>
          <RefreshCw />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {loading ? "Loading…" : "No orders yet."}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const next = nextStatus(o.status);
                const terminal = o.status === "delivered" || o.status === "cancelled";
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.customer_name}</TableCell>
                    <TableCell>
                      {o.phone ? (
                        <a
                          href={`tel:${o.phone.replace(/\s+/g, "")}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {o.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{o.meal_name || "—"}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>{o.fulfillment}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {next && !terminal && (
                          <Button size="sm" variant="warmOutline" onClick={() => updateStatus(o.id, next)}>
                            Mark {next}
                          </Button>
                        )}
                        {!terminal && (
                          <Button size="sm" variant="warmOutline" onClick={() => updateStatus(o.id, "cancelled")}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

type MealInsight = {
  mealName: string;
  totalOrders: number;
  totalQuantity: number;
  confirmedCount: number;
  confirmationRate: number;
};

const InsightsPanel = ({ orders, loading }: { orders: OrderRecord[]; loading: boolean }) => {
  const insights = useMemo<MealInsight[]>(() => {
    const map = new Map<string, MealInsight>();
    for (const o of orders) {
      const key = o.meal_name || "Unknown";
      const cur = map.get(key) ?? {
        mealName: key,
        totalOrders: 0,
        totalQuantity: 0,
        confirmedCount: 0,
        confirmationRate: 0,
      };
      cur.totalOrders += 1;
      cur.totalQuantity += o.quantity || 0;
      if (["confirmed", "dispatched", "delivered"].includes(o.status)) cur.confirmedCount += 1;
      map.set(key, cur);
    }
    const arr = Array.from(map.values()).map((m) => ({
      ...m,
      confirmationRate: m.totalOrders ? m.confirmedCount / m.totalOrders : 0,
    }));
    arr.sort((a, b) => b.totalOrders - a.totalOrders);
    return arr;
  }, [orders]);

  const bestSeller = insights[0]?.mealName;
  const slowest = insights.length > 1 ? insights[insights.length - 1].mealName : undefined;

  return (
    <section className="panel-surface p-5 sm:p-7">
      <div className="space-y-2">
        <span className="eyebrow">Meal insights</span>
        <h2 className="text-3xl font-semibold text-foreground">How each meal is performing</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated from every order placed through the storefront.
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{loading ? "Loading…" : "No orders yet."}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((m) => {
            const isBest = m.mealName === bestSeller;
            const isSlow = m.mealName === slowest && slowest !== bestSeller;
            return (
              <article
                key={m.mealName}
                className={`rounded-[1.5rem] border p-5 ${
                  isBest
                    ? "border-green-500/40 bg-green-500/5"
                    : isSlow
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-border bg-card/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{m.mealName}</h3>
                  {isBest && (
                    <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-600">
                      🔥 Best seller
                    </span>
                  )}
                  {isSlow && (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-600">
                      🐌 Slowest
                    </span>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Orders</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">{m.totalOrders}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plates</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">{m.totalQuantity}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">
                      {Math.round(m.confirmationRate * 100)}%
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.round(m.confirmationRate * 100)}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};


const AdminEditor = ({ lock, passcode }: AdminEditorProps) => {
  const { toast } = useToast();
  const ordersState = useOrders(passcode);
  const [draft, setDraft] = useState<FoodbriteContent>(() => ({ ...defaultFoodbriteContent }));
  const [saveMessage, setSaveMessage] = useState("Loading latest from Lovable Cloud…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFoodbriteContent()
      .then((content) => {
        setDraft(content);
        setSaveMessage("Loaded the latest menu from Lovable Cloud.");
      })
      .catch((err) => {
        setSaveMessage(err instanceof Error ? err.message : "Could not load from Cloud.");
      });
  }, []);

  const totalOpenPlates = useMemo(
    () => draft.weeklyDrops.reduce((sum, drop) => sum + Math.max(drop.platesLeft, 0), 0),
    [draft.weeklyDrops],
  );

  const updateSettings = (field: keyof FoodbriteContent["settings"], value: string) => {
    setDraft((current) => ({ ...current, settings: { ...current.settings, [field]: value } }));
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
    setDraft((current) => ({ ...current, weeklyDrops: [...current.weeklyDrops, createEmptyWeeklyDrop()] }));
    setSaveMessage("Unsaved changes.");
  };

  const removeDrop = (id: string) => {
    if (draft.weeklyDrops.length === 1) return;
    setDraft((current) => ({ ...current, weeklyDrops: current.weeklyDrops.filter((drop) => drop.id !== id) }));
    setSaveMessage("Unsaved changes.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings(passcode, draft.settings);
      await adminApi.saveDrops(passcode, draft.weeklyDrops);
      const fresh = await fetchFoodbriteContent();
      setDraft(fresh);
      setSaveMessage("Saved to Lovable Cloud — every device will see these updates.");
      toast({ title: "Saved", description: "Menu and settings are live for all visitors." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setSaveMessage(message);
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setSaveMessage("Reloading from Lovable Cloud…");
    try {
      const fresh = await fetchFoodbriteContent();
      setDraft(fresh);
      setSaveMessage("Reloaded the latest menu.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Reload failed.");
    }
  };

  return (
    <main className="section-shell py-6 sm:py-10">
      <div className="grid gap-6">
        <section className="panel-surface p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">Foodbrite admin</span>
              <h1 className="text-4xl font-semibold text-foreground">Update Foodbrite without touching code</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Changes are stored in Lovable Cloud, so any update here is instantly visible to every visitor and on
                every device you log in from.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="warmOutline">
                <Link to="/">
                  <ArrowLeft />
                  Back to storefront
                </Link>
              </Button>
              <Button variant="warmOutline" onClick={handleReload}>
                <RefreshCw />
                Reload
              </Button>
              <Button variant="warmOutline" onClick={lock}>
                <Lock />
                Lock admin
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                <Save />
                {saving ? "Saving…" : "Save to Cloud"}
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

        <Tabs defaultValue="menu" className="w-full">
          <TabsList>
            <TabsTrigger value="menu">Menu & Settings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="grid gap-6">
        <section className="panel-surface p-5 sm:p-7">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Business settings</span>
            <h2 className="text-3xl font-semibold text-foreground">Phones, delivery copy, and social links</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="whatsapp-phone">WhatsApp phone</Label>
              <Input id="whatsapp-phone" value={draft.settings.whatsappPhone} onChange={(e) => updateSettings("whatsappPhone", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="call-phone">Call phone</Label>
              <Input id="call-phone" value={draft.settings.callPhone} onChange={(e) => updateSettings("callPhone", e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="delivery-badge">Delivery badge text</Label>
              <Input id="delivery-badge" value={draft.settings.deliveryBadgeText} onChange={(e) => updateSettings("deliveryBadgeText", e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pickup-note">Pickup and delivery area note</Label>
              <textarea id="pickup-note" className={textareaClassName} value={draft.settings.pickupNote} onChange={(e) => updateSettings("pickupNote", e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="delivery-note">Delivery fee note</Label>
              <textarea id="delivery-note" className={textareaClassName} value={draft.settings.deliveryFeeNote} onChange={(e) => updateSettings("deliveryFeeNote", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instagram-url">Instagram URL</Label>
              <Input id="instagram-url" value={draft.settings.instagramUrl} onChange={(e) => updateSettings("instagramUrl", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tiktok-url">TikTok URL</Label>
              <Input id="tiktok-url" value={draft.settings.tiktokUrl} onChange={(e) => updateSettings("tiktokUrl", e.target.value)} />
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
                  <Button variant="warmOutline" size="sm" onClick={() => removeDrop(drop.id)} disabled={draft.weeklyDrops.length === 1}>
                    <Trash2 />
                    Remove
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="grid gap-2 xl:col-span-2">
                    <Label htmlFor={`meal-name-${drop.id}`}>Meal name</Label>
                    <Input id={`meal-name-${drop.id}`} value={drop.mealName} onChange={(e) => updateDrop(drop.id, "mealName", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`price-${drop.id}`}>Price (KES)</Label>
                    <Input id={`price-${drop.id}`} type="number" min="0" value={drop.price} onChange={(e) => updateDrop(drop.id, "price", Number(e.target.value) || 0)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`plates-left-${drop.id}`}>Plates left</Label>
                    <Input id={`plates-left-${drop.id}`} type="number" min="0" value={drop.platesLeft} onChange={(e) => updateDrop(drop.id, "platesLeft", Number(e.target.value) || 0)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`total-plates-${drop.id}`}>Total plates</Label>
                    <Input id={`total-plates-${drop.id}`} type="number" min="1" value={drop.totalPlates} onChange={(e) => updateDrop(drop.id, "totalPlates", Math.max(Number(e.target.value) || 1, 1))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`cook-weekday-${drop.id}`}>Cook day</Label>
                    <select id={`cook-weekday-${drop.id}`} className={selectClassName} value={drop.cookWeekday} onChange={(e) => updateDrop(drop.id, "cookWeekday", Number(e.target.value))}>
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`deadline-weekday-${drop.id}`}>Deadline day</Label>
                    <select id={`deadline-weekday-${drop.id}`} className={selectClassName} value={drop.deadlineWeekday} onChange={(e) => updateDrop(drop.id, "deadlineWeekday", Number(e.target.value))}>
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`deadline-hour-${drop.id}`}>Deadline hour (24h)</Label>
                    <Input id={`deadline-hour-${drop.id}`} type="number" min="0" max="23" value={drop.deadlineHour} onChange={(e) => updateDrop(drop.id, "deadlineHour", Math.min(Math.max(Number(e.target.value) || 0, 0), 23))} />
                  </div>
                  <div className="grid gap-2 md:col-span-2 xl:col-span-4">
                    <Label htmlFor={`pickup-window-${drop.id}`}>Pickup / delivery window</Label>
                    <Input id={`pickup-window-${drop.id}`} value={drop.pickupWindow} onChange={(e) => updateDrop(drop.id, "pickupWindow", e.target.value)} />
                  </div>
                  <div className="grid gap-2 md:col-span-2 xl:col-span-4">
                    <Label htmlFor={`portion-${drop.id}`}>Portion description</Label>
                    <textarea id={`portion-${drop.id}`} className={textareaClassName} value={drop.portion} onChange={(e) => updateDrop(drop.id, "portion", e.target.value)} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
          </TabsContent>

          <TabsContent value="orders">
            <OrdersPanel passcode={passcode} />
          </TabsContent>
        </Tabs>

        <section className="panel-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <span className="eyebrow">Reset options</span>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Reload the editor with the original Foodbrite starter content. Nothing is saved to Cloud until you press Save.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="warmOutline" onClick={() => setDraft(defaultFoodbriteContent)}>
              Reload defaults in editor
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};

const Admin = () => (
  <AdminGate>
    {({ lock, passcode }) => <AdminEditor lock={lock} passcode={passcode} />}
  </AdminGate>
);

export default Admin;
