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

export const FOODBRITE_CONTENT_STORAGE_KEY = "foodbrite-content-v1";
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
    deliveryFeeNote: "Delivery starts from KES 50 and may go higher depending on distance from the pickup point in Ruiru.",
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

const sanitizeDrop = (drop: Partial<WeeklyDropConfig>): WeeklyDropConfig => ({
  ...createEmptyWeeklyDrop(),
  ...drop,
  cookWeekday: Number.isFinite(drop.cookWeekday) ? Number(drop.cookWeekday) : 3,
  deadlineHour: Number.isFinite(drop.deadlineHour) ? Number(drop.deadlineHour) : 20,
  deadlineWeekday: Number.isFinite(drop.deadlineWeekday) ? Number(drop.deadlineWeekday) : 2,
  id: drop.id || createDropId(),
  platesLeft: Number.isFinite(drop.platesLeft) ? Number(drop.platesLeft) : 12,
  price: Number.isFinite(drop.price) ? Number(drop.price) : 450,
  totalPlates: Number.isFinite(drop.totalPlates) ? Number(drop.totalPlates) : 24,
});

export const loadFoodbriteContent = (): FoodbriteContent => {
  if (typeof window === "undefined") {
    return cloneContent(defaultFoodbriteContent);
  }

  const raw = window.localStorage.getItem(FOODBRITE_CONTENT_STORAGE_KEY);
  if (!raw) {
    return cloneContent(defaultFoodbriteContent);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FoodbriteContent>;
    const weeklyDrops = Array.isArray(parsed.weeklyDrops)
      ? parsed.weeklyDrops.map((drop) => sanitizeDrop(drop))
      : cloneContent(defaultFoodbriteContent.weeklyDrops);

    return {
      settings: {
        ...defaultFoodbriteContent.settings,
        ...(parsed.settings ?? {}),
      },
      weeklyDrops: weeklyDrops.length > 0 ? weeklyDrops : cloneContent(defaultFoodbriteContent.weeklyDrops),
    };
  } catch {
    return cloneContent(defaultFoodbriteContent);
  }
};

export const saveFoodbriteContent = (content: FoodbriteContent) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FOODBRITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event(FOODBRITE_CONTENT_UPDATED_EVENT));
};

export const resetFoodbriteContent = () => {
  if (typeof window === "undefined") return cloneContent(defaultFoodbriteContent);

  window.localStorage.removeItem(FOODBRITE_CONTENT_STORAGE_KEY);
  const freshContent = cloneContent(defaultFoodbriteContent);
  window.dispatchEvent(new Event(FOODBRITE_CONTENT_UPDATED_EVENT));
  return freshContent;
};

export const buildWhatsAppUrl = (phone: string, message: string) => {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const formatHourLabel = (hour: number) => {
  const normalizedHour = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12;

  return `${displayHour}${suffix}`;
};