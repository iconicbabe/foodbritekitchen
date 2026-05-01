import { supabase } from "@/integrations/supabase/client";

export type WeeklyDropConfig = {
  cookWeekday: number;
  deadlineHour: number;
  deadlineWeekday: number;
  id: string;
  mealName: string;
  pickupWindow: string;
  platesLeft: number;
  portion: string;
  price: number;
  totalPlates: number;
};

export type FoodbriteSettings = {
  callPhone: string;
  deliveryBadgeText: string;
  deliveryFeeNote: string;
  instagramUrl: string;
  pickupNote: string;
  tiktokUrl: string;
  whatsappPhone: string;
};

export type FoodbriteContent = {
  settings: FoodbriteSettings;
  weeklyDrops: WeeklyDropConfig[];
};

export const FOODBRITE_CONTENT_UPDATED_EVENT = "foodbrite-content-updated";

export const weekdayOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export const createDropId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createEmptyWeeklyDrop = (): WeeklyDropConfig => ({
  cookWeekday: 3,
  deadlineHour: 20,
  deadlineWeekday: 2,
  id: createDropId(),
  mealName: "New weekly meal",
  pickupWindow: "Ready Wednesday from 12:30PM in Ruiru",
  platesLeft: 12,
  portion: "Balanced home-style plate ready for pre-order.",
  price: 450,
  totalPlates: 24,
});

export const defaultFoodbriteContent: FoodbriteContent = {
  settings: {
    callPhone: "0748801610",
    deliveryBadgeText: "Delivery from KES 50 • varies by distance",
    deliveryFeeNote:
      "Delivery starts from KES 50 and may go higher depending on distance from the pickup point in Ruiru.",
    instagramUrl: "https://www.instagram.com/foodbrite.ke",
    pickupNote:
      "Pick up in Ruiru or request delivery around Ruiru and nearby estates.",
    tiktokUrl: "https://www.tiktok.com/@foodbrite.ke",
    whatsappPhone: "254748801610",
  },
  weeklyDrops: [
    {
      id: "wednesday-drop",
      mealName: "Chicken Stew + Rice",
      price: 420,
      portion:
        "Full plate, balanced portion with sukuma wiki and chapati add-on option.",
      deadlineWeekday: 2,
      deadlineHour: 20,
      cookWeekday: 3,
      platesLeft: 10,
      totalPlates: 24,
      pickupWindow: "Ready Wednesday from 12:30PM in Ruiru",
    },
    {
      id: "friday-drop",
      mealName: "Beef Stew + Ugali",
      price: 450,
      portion: "Hearty home-style plate built for lunch or early dinner.",
      deadlineWeekday: 4,
      deadlineHour: 20,
      cookWeekday: 5,
      platesLeft: 7,
      totalPlates: 20,
      pickupWindow: "Ready Friday from 1:00PM with delivery slots after 2PM",
    },
    {
      id: "sunday-drop",
      mealName: "Pilau + Kachumbari",
      price: 480,
      portion:
        "Weekend special plate with fragrant spices and generous serving.",
      deadlineWeekday: 6,
      deadlineHour: 20,
      cookWeekday: 0,
      platesLeft: 5,
      totalPlates: 18,
      pickupWindow: "Ready Sunday from 12:00PM, ideal for family lunch",
    },
  ],
};

// ─── Supabase read ────────────────────────────────────────────────────────────

export const loadFoodbriteContent = async (): Promise<FoodbriteContent> => {
  try {
    const [{ data: settingsRow }, { data: dropRows }] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).single(),
      supabase
        .from("weekly_drops")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    const settings: FoodbriteSettings = settingsRow
      ? {
          callPhone: settingsRow.call_phone,
          deliveryBadgeText: settingsRow.delivery_badge_text,
          deliveryFeeNote: settingsRow.delivery_fee_note,
          instagramUrl: settingsRow.instagram_url,
          pickupNote: settingsRow.pickup_note,
          tiktokUrl: settingsRow.tiktok_url,
          whatsappPhone: settingsRow.whatsapp_phone,
        }
      : defaultFoodbriteContent.settings;

    const weeklyDrops: WeeklyDropConfig[] =
      dropRows && dropRows.length > 0
        ? dropRows.map((row) => ({
            id: row.id,
            mealName: row.meal_name,
            price: row.price,
            portion: row.portion,
            deadlineWeekday: row.deadline_weekday,
            deadlineHour: row.deadline_hour,
            cookWeekday: row.cook_weekday,
            platesLeft: row.plates_left,
            totalPlates: row.total_plates,
            pickupWindow: row.pickup_window,
          }))
        : defaultFoodbriteContent.weeklyDrops;

    return { settings, weeklyDrops };
  } catch {
    return { ...defaultFoodbriteContent };
  }
};

export const fetchFoodbriteContent = loadFoodbriteContent;

// ─── Realtime subscription ───────────────────────────────────────────────────

export const subscribeFoodbriteContent = (onChange: () => void) => {
  const channel = supabase
    .channel("foodbrite-content")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "weekly_drops" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

// ─── Admin API (calls the admin-manage edge function) ────────────────────────

const invokeAdmin = async <T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("admin-manage", {
    body: { action, ...payload },
  });
  if (error) {
    const msg = (data as any)?.error || error.message || "Admin request failed.";
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
};

export const adminApi = {
  status: () => invokeAdmin<{ isSetup: boolean }>("status"),
  setup: (passcode: string) => invokeAdmin<{ ok: true }>("setup", { passcode }),
  verify: (passcode: string) => invokeAdmin<{ ok: boolean; isSetup: boolean }>("verify", { passcode }),
  changePasscode: (current: string, next: string) =>
    invokeAdmin<{ ok: true }>("change-passcode", { current, next }),
  saveSettings: (passcode: string, settings: FoodbriteSettings) =>
    invokeAdmin<{ ok: true }>("save-settings", { passcode, settings }),
  saveDrops: (passcode: string, drops: WeeklyDropConfig[]) =>
    invokeAdmin<{ ok: true }>("save-drops", { passcode, drops }),
};

// ─── Supabase write (legacy direct write — kept for reset only) ──────────────

export const saveFoodbriteContent = async (content: FoodbriteContent) => {
  const { settings, weeklyDrops } = content;

  await supabase.from("site_settings").upsert({
    id: 1,
    call_phone: settings.callPhone,
    delivery_badge_text: settings.deliveryBadgeText,
    delivery_fee_note: settings.deliveryFeeNote,
    instagram_url: settings.instagramUrl,
    pickup_note: settings.pickupNote,
    tiktok_url: settings.tiktokUrl,
    whatsapp_phone: settings.whatsappPhone,
  });

  // Replace all drops atomically
  await supabase
    .from("weekly_drops")
    .delete()
    .neq("id", "__placeholder__");

  await supabase.from("weekly_drops").insert(
    weeklyDrops.map((drop, index) => ({
      id: drop.id,
      meal_name: drop.mealName,
      price: drop.price,
      portion: drop.portion,
      deadline_weekday: drop.deadlineWeekday,
      deadline_hour: drop.deadlineHour,
      cook_weekday: drop.cookWeekday,
      plates_left: drop.platesLeft,
      total_plates: drop.totalPlates,
      pickup_window: drop.pickupWindow,
      sort_order: index,
    }))
  );

  window.dispatchEvent(new Event(FOODBRITE_CONTENT_UPDATED_EVENT));
};

export const resetFoodbriteContent = async () => {
  await saveFoodbriteContent(defaultFoodbriteContent);
  return { ...defaultFoodbriteContent };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const buildWhatsAppUrl = (phone: string, message: string) => {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const formatHourLabel = (hour: number) => {
  const normalizedHour = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}${suffix}`;
};
