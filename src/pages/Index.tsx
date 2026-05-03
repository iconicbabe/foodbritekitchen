import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "react-router-dom";

import StickyReserveBar from "@/components/foodbrite/StickyReserveBar";
import WeeklyDropCard from "@/components/foodbrite/WeeklyDropCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/foodbrite-hero-clean.jpg";
import foodbriteLogo from "@/assets/foodbrite-logo.jpg";
import {
  FOODBRITE_CONTENT_UPDATED_EVENT,
  adminApi,
  buildWhatsAppUrl,
  defaultFoodbriteContent,
  fetchFoodbriteContent,
  formatHourLabel,
  loadFoodbriteContent,
  subscribeFoodbriteContent,
  type FoodbriteContent,
} from "@/lib/foodbrite-content";

const testimonials = [
  {
    name: "Sharon, Ruiru",
    quote: "Foodbrite is the only meal drop I trust when I need consistency. Portions are always worth it.",
  },
  {
    name: "Dennis, Membley",
    quote: "The WhatsApp ordering is simple, and the food actually arrives tasting homemade — not rushed.",
  },
  {
    name: "Faith, Kimbo",
    quote: "Affordable, reliable, and the batch system means I never wonder whether they can handle my order.",
  },
];

const formatCountdown = (milliseconds: number) => {
  if (milliseconds <= 0) return "Batch closed";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h ${minutes}m left`;
};

const getNextWeekdayAt = (weekday: number, hour: number) => {
  const now = new Date();
  const target = new Date(now);
  const daysUntil = (weekday - now.getDay() + 7) % 7;

  target.setDate(now.getDate() + daysUntil);
  target.setHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 7);
  }

  return target;
};

const Index = () => {
  const [now, setNow] = useState(Date.now());
  const [content, setContent] = useState<FoodbriteContent>(defaultFoodbriteContent);
  const [selectedDropId, setSelectedDropId] = useState(defaultFoodbriteContent.weeklyDrops[0].id);
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [fulfillment, setFulfillment] = useState("Pickup");

  const settings = content.settings;
  const weeklyDropConfigs = content.weeklyDrops;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

useEffect(() => {
  const syncContent = async () => {
    const loaded = await loadFoodbriteContent();
    setContent(loaded);
  };

  syncContent();
  window.addEventListener(FOODBRITE_CONTENT_UPDATED_EVENT, syncContent);

  return () => {
    window.removeEventListener(FOODBRITE_CONTENT_UPDATED_EVENT, syncContent);
  };
}, []);
  useEffect(() => {
    if (!weeklyDropConfigs.some((drop) => drop.id === selectedDropId)) {
      setSelectedDropId(weeklyDropConfigs[0].id);
    }
  }, [selectedDropId, weeklyDropConfigs]);

  const drops = useMemo(() => {
    return weeklyDropConfigs.map((drop) => {
      const deadlineDate = getNextWeekdayAt(drop.deadlineWeekday, drop.deadlineHour);
      const cookDate = getNextWeekdayAt(drop.cookWeekday, 12);
      const remainingTime = deadlineDate.getTime() - now;
      const reservedPercentage = ((drop.totalPlates - drop.platesLeft) / drop.totalPlates) * 100;

      return {
        ...drop,
        cookLabel: cookDate.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" }),
        countdownLabel: formatCountdown(remainingTime),
        deadlineText: `Order before ${deadlineDate.toLocaleDateString("en-KE", {
          weekday: "long",
        })} ${formatHourLabel(drop.deadlineHour)}`,
        remainingTime,
        reserveMessage: `Hi Foodbrite, I'd like to reserve ${drop.mealName} for ${cookDate.toLocaleDateString("en-KE", { weekday: "long" })}.`,
        reservedPercentage,
      };
    });
  }, [now]);

  const featuredDrop = drops.reduce((lowest, current) => {
    return current.remainingTime < lowest.remainingTime ? current : lowest;
  }, drops[0]);

  const selectedDrop = drops.find((drop) => drop.id === selectedDropId) ?? drops[0];

  const quickReserveUrl = buildWhatsAppUrl(
    settings.whatsappPhone,
    `Hi Foodbrite, I'm ${customerName || "a customer"} and I'd like to reserve ${quantity} ${quantity === "1" ? "plate" : "plates"} of ${selectedDrop.mealName} for ${selectedDrop.cookLabel}. ${fulfillment} please.`,
  );

  return (
    <div className="relative overflow-x-hidden pb-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] hero-glow animate-heat-pulse blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 texture-grid opacity-70" />

      <header className="section-shell pt-4 sm:pt-6">
        <div className="panel-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <img
              src={foodbriteLogo}
              alt="Foodbrite Kitchen KE logo"
              className="h-14 w-14 rounded-full border border-border/70 object-cover shadow-soft"
              width={96}
              height={96}
            />
            <div>
              <p className="text-xl font-black uppercase tracking-[0.18em] text-brand">Foodbrite Kitchen KE</p>
              <p className="text-sm text-muted-foreground">Crafted with Culture. Served with Soul.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="eyebrow">
              <MapPin className="size-4" />
              Ruiru, Kenya
            </span>
            <span className="eyebrow">
              <Truck className="size-4" />
                {settings.deliveryBadgeText}
            </span>
          </div>
        </div>
      </header>

      <main>
        <section className="section-shell grid gap-10 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:pt-12">
          <div className="relative z-10 space-y-6">
            <span className="eyebrow">Weekly batch pre-orders</span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-5xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
                Fresh Home-Cooked Meals — Limited Weekly Drops in Ruiru
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Reserve your meals in advance. We cook in batches to ensure quality, affordability, and consistency.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="hero" size="xl">
                <a href={buildWhatsAppUrl(settings.whatsappPhone, featuredDrop.reserveMessage)} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  Reserve This Week&apos;s Meal
                </a>
              </Button>
              <Button asChild variant="warmOutline" size="xl">
                <a href="#weekly-drop">
                  <CalendarDays />
                  View This Week&apos;s Menu
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Cooking days", value: "3 curated drops" },
                { label: "Ordering flow", value: "WhatsApp in 1 tap" },
                { label: "Best for", value: "Busy homes & offices" },
              ].map((item) => (
                <div key={item.label} className="panel-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-4 bottom-10 h-28 w-28 rounded-full bg-highlight/30 blur-3xl" />
            <div className="panel-surface relative overflow-hidden p-3 sm:p-4">
              <div className="absolute inset-0 bg-gradient-surface opacity-80" />
              <img
                src={heroImage}
                alt="Home-cooked Kenyan meal with chicken stew, rice, ugali and chapati on a rustic table"
                width={1920}
                height={1080}
                className="relative z-10 aspect-[4/5] w-full rounded-[1.5rem] object-cover shadow-float sm:aspect-[16/14]"
              />
              <div className="absolute bottom-6 left-6 right-6 z-20 max-w-sm rounded-[1.5rem] border border-border/70 bg-surface/90 p-4 shadow-soft backdrop-blur-md animate-float">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Next batch closes in</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-black text-foreground">{featuredDrop.countdownLabel}</p>
                    <p className="text-sm text-muted-foreground">{featuredDrop.mealName}</p>
                  </div>
                  <Button asChild size="sm" variant="reserve">
                    <a href="#quick-reserve">Quick reserve</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="quick-reserve" className="section-shell scroll-mt-24 py-8">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="panel-surface p-6 sm:p-8">
              <span className="eyebrow">Quick pre-order</span>
              <h2 className="mt-4 text-3xl font-semibold text-foreground">Build your reservation in seconds</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                This pre-order helper keeps the flow focused: choose the batch, add quantity, and finish on WhatsApp for confirmation.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="customer-name">
                    Your name
                  </label>
                  <Input
                    id="customer-name"
                    placeholder="e.g. Brian"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="meal-drop">
                    Pick this week&apos;s batch
                  </label>
                  <select
                    id="meal-drop"
                    value={selectedDropId}
                    onChange={(event) => setSelectedDropId(event.target.value)}
                    className="flex h-12 w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {drops.map((drop) => (
                      <option key={drop.id} value={drop.id}>
                        {drop.cookLabel} — {drop.mealName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="quantity">
                    Quantity
                  </label>
                  <Input id="quantity" type="number" min="1" max="10" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="fulfillment">
                    Fulfillment
                  </label>
                  <select
                    id="fulfillment"
                    value={fulfillment}
                    onChange={(event) => setFulfillment(event.target.value)}
                    className="flex h-12 w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option>Pickup</option>
                    <option>Delivery</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="hero"
                  size="xl"
                  onClick={async () => {
                    try {
                      await adminApi.placeOrder({
                        customerName: customerName || "Anonymous",
                        dropId: selectedDrop.id,
                        mealName: selectedDrop.mealName,
                        quantity: Number(quantity) || 1,
                        fulfillment: fulfillment === "Delivery" ? "Delivery" : "Pickup",
                      });
                    } catch (err) {
                      console.warn("Order save failed:", err);
                    }
                    window.open(quickReserveUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MessageCircle />
                  Send on WhatsApp
                </Button>
                <Button asChild variant="warmOutline" size="xl">
                  <a href={`tel:${settings.callPhone}`}>
                    <Phone />
                    Call Now
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="panel-surface p-6">
                <span className="eyebrow">Delivery & location</span>
                <div className="mt-4 grid gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-primary" />
                    <p>{settings.pickupNote}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="text-primary" />
                    <p>{settings.deliveryFeeNote}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="text-primary" />
                    <p>Direct line: {settings.callPhone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="weekly-drop" className="section-shell scroll-mt-24 py-6 sm:py-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">This week&apos;s food drop</span>
              <h2 className="text-4xl font-semibold text-foreground">Reserve only what&apos;s cooking this week</h2>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                No giant menu. No endless browsing. Just this week&apos;s 2–3 drop windows with hard deadlines and controlled portions.
              </p>
            </div>
            <div className="panel-surface px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{featuredDrop.platesLeft} plates left on the fastest-moving batch</p>
              <p>Reserve early to avoid missing the cutoff.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {drops.map((drop) => (
              <WeeklyDropCard
                key={drop.id}
                countdownLabel={drop.countdownLabel}
                dayLabel={drop.cookLabel}
                deadlineText={drop.deadlineText}
                mealName={drop.mealName}
                pickupWindow={drop.pickupWindow}
                platesLeft={drop.platesLeft}
                portion={drop.portion}
                price={drop.price}
                progressValue={drop.reservedPercentage}
                totalPlates={drop.totalPlates}
                onReserve={() => window.open(buildWhatsAppUrl(settings.whatsappPhone, drop.reserveMessage), "_blank", "noopener,noreferrer")}
              />
            ))}
          </div>
        </section>

        <section className="section-shell py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarDays, title: "Check the weekly menu", text: "Browse this week's curated drops." },
              { icon: MessageCircle, title: "Reserve on WhatsApp", text: "Confirm before the batch deadline." },
              { icon: UtensilsCrossed, title: "Cooked fresh in batches", text: "Home-style flavor, consistent quality." },
              { icon: Truck, title: "Pickup or delivery", text: "Smooth fulfillment around Ruiru." },
            ].map((item) => (
              <div key={item.title} className="panel-surface flex flex-col gap-2 p-4">
                <item.icon className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>


        <section className="section-shell py-8">
          <div className="panel-surface p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">Social proof</span>
                <h2 className="mt-4 text-3xl font-semibold text-foreground">Trusted for consistency, taste, affordability, and reliability</h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Foodbrite&apos;s batch model is built to make every meal predictable for customers and manageable for the kitchen.
              </p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="rounded-[1.5rem] bg-secondary/55 p-5">
                  <Quote className="text-primary" />
                  <p className="mt-4 text-base leading-relaxed text-foreground">“{testimonial.quote}”</p>
                  <p className="mt-5 text-sm font-semibold text-muted-foreground">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-8">
          <div className="rounded-[2rem] bg-brand px-6 py-8 text-brand-foreground shadow-float sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-foreground/70">Final call</p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight">Next batch closes soon — don&apos;t miss out</h2>
                <p className="mt-4 max-w-2xl text-brand-foreground/80">
                  Reserve today, confirm on WhatsApp, and let Foodbrite handle the fresh batch prep without over-ordering or uncertainty.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="hero" size="xl" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <a href={buildWhatsAppUrl(settings.whatsappPhone, featuredDrop.reserveMessage)} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    Reserve via WhatsApp
                  </a>
                </Button>
                <Button asChild variant="warmOutline" size="xl" className="border-brand-foreground/20 bg-brand-foreground/10 text-brand-foreground hover:bg-brand-foreground/15 hover:text-brand-foreground">
                  <a href={`tel:${settings.callPhone}`}>
                    <Phone />
                    Call Now
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="section-shell py-10">
        <div className="panel-surface flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={foodbriteLogo}
              alt="Foodbrite Kitchen KE logo"
              className="h-16 w-16 rounded-full border border-border/70 object-cover shadow-soft"
              width={96}
              height={96}
              loading="lazy"
            />
            <div>
              <p className="text-xl font-black uppercase tracking-[0.18em] text-brand">Foodbrite Kitchen KE</p>
              <p className="mt-2 text-sm text-muted-foreground">Taste • Culture • Power</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <a className="eyebrow" href={buildWhatsAppUrl(settings.whatsappPhone, "Hi Foodbrite, I would like to place an order.")} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <a className="eyebrow" href={settings.instagramUrl} target="_blank" rel="noreferrer">
              Instagram
              <ArrowRight className="size-4" />
            </a>
            <a className="eyebrow" href={settings.tiktokUrl} target="_blank" rel="noreferrer">
              TikTok
              <ArrowRight className="size-4" />
            </a>
            <Link className="eyebrow" to="/admin">
              Admin editor
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </footer>

      <a
        href="#weekly-drop"
        className="mx-auto mt-2 flex w-fit items-center gap-2 pb-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Scroll the weekly drop
        <ChevronDown className="size-4" />
      </a>

      <StickyReserveBar reserveHref={buildWhatsAppUrl(settings.whatsappPhone, featuredDrop.reserveMessage)} callHref={`tel:${settings.callPhone}`} />
    </div>
  );
};

export default Index;
