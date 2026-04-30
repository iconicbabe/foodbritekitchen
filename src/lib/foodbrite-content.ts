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

export const FOODBRITE_CONTENT_CACHE_KEY = "foodbrite-content-cache-v2";
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

const cloneContent = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const defaultFoodbriteContent: FoodbriteContent = {
  settings: {
    callPhone: "0748801610",
    deliveryBadgeText: "Delivery from KES 50 • varies by distance",
    deliveryFeeNote:
      "Delivery starts from KES 50 and may go higher depending on distance from the pickup point in Ruiru.",
    instagramUrl: "https://www.instagram.com/foodbrite.ke",
    pickupNote: "Pick up in Ruiru or request delivery around Ruiru and nearby estates.",
    tiktokUrl: "https://www.tiktok.com/@foodbrite.ke",
    whatsappPhone: "254748801610",
  },
  weeklyDrops: [
    {
      id: "wednesday-drop",
      mealName: "Chicken Stew + Rice",
      price: 420,
      portion: "Full plate, balanced portion with sukuma wiki and chapati add-on option.",
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
      portion: "Weekend special plate with fragrant spices and generous serving.",
      deadlineWeekday: 6,
      deadlineHour: 20,
      cookWeekday: 0,
      platesLeft: 5,
      totalPlates: 18,
      pickupWindow: "Ready Sunday from 12:00PM, ideal for family lunch",
    },
  ],
};

const readCache = (): FoodbriteContent => {
  if (typeof window === "undefined") return cloneContent(defaultFoodbriteContent);
  try {
    const raw = window.localStorage.getItem(FOODBRITE_CONTENT_CACHE_KEY);
    if (!raw) return cloneContent(defaultFoodbriteContent);
    return JSON.parse(raw) as FoodbriteContent;
  } catch {
    return cloneContent(defaultFoodbriteContent);
  }
};

const writeCache = (content: FoodbriteContent) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FOODBRITE_CONTENT_CACHE_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event(FOODBRITE_CONTENT_UPDATED_EVENT));
};

/** Synchronous cached content — for first paint. */
export const loadFoodbriteContent = (): FoodbriteContent => readCache();

/** Fetch fresh content from Lovable Cloud and update cache. */
export const fetchFoodbriteContent = async (): Promise<FoodbriteContent> => {
  const [settingsRes, dropsRes] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("weekly_drops").select("*").order("sort_order", { ascending: true }),
  ]);

  const s = settingsRes.data;
  const settings: FoodbriteSettings = s
    ? {
        callPhone: s.call_phone,
        whatsappPhone: s.whatsapp_phone,
        deliveryBadgeText: s.delivery_badge_text,
        deliveryFeeNote: s.delivery_fee_note,
        pickupNote: s.pickup_note,
        instagramUrl: s.instagram_url,
        tiktokUrl: s.tiktok_url,
      }
    : cloneContent(defaultFoodbriteContent.settings);

  const drops: WeeklyDropConfig[] = (dropsRes.data ?? []).map((d) => ({
    id: d.id,
    mealName: d.meal_name,
    price: Number(d.price),
    portion: d.portion,
    deadlineWeekday: d.deadline_weekday,
    deadlineHour: d.deadline_hour,
    cookWeekday: d.cook_weekday,
    platesLeft: d.plates_left,
    totalPlates: d.total_plates,
    pickupWindow: d.pickup_window,
  }));

  const content: FoodbriteContent = {
    settings,
    weeklyDrops: drops.length > 0 ? drops : cloneContent(defaultFoodbriteContent.weeklyDrops),
  };
  writeCache(content);
  return content;
};

/** Subscribe to live updates from other devices. */
export const subscribeFoodbriteContent = (onChange: () => void) => {
  const channel = supabase
    .channel("foodbrite-content")
    .on("postgres_changes", { event: "*", schema: "public", table: "weekly_drops" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

const invokeAdmin = async <T = unknown>(payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("admin-manage", { body: payload });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
};

export const adminApi = {
  status: () => invokeAdmin<{ isSetup: boolean }>({ action: "status" }),
  setup: (passcode: string) => invokeAdmin<{ ok: true }>({ action: "setup", passcode }),
  verify: (passcode: string) => invokeAdmin<{ ok: boolean; isSetup: boolean }>({ action: "verify", passcode }),
  changePasscode: (current: string, next: string) =>
    invokeAdmin<{ ok: true }>({ action: "change-passcode", current, next }),
  saveSettings: (passcode: string, settings: FoodbriteSettings) =>
    invokeAdmin<{ ok: true }>({ action: "save-settings", passcode, settings }),
  saveDrops: (passcode: string, drops: WeeklyDropConfig[]) =>
    invokeAdmin<{ ok: true }>({ action: "save-drops", passcode, drops }),
};

export const buildWhatsAppUrl = (phone: string, message: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

export const formatHourLabel = (hour: number) => {
  const normalizedHour = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}${suffix}`;
};
