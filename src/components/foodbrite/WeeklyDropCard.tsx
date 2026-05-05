import { Clock3, Flame, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WeeklyDropCardProps {
  countdownLabel: string;
  dayLabel: string;
  deadlineText: string;
  imageUrl?: string;
  mealName: string;
  pickupWindow: string;
  platesLeft: number;
  portion: string;
  price: number;
  progressValue: number;
  totalPlates: number;
  onReserve: () => void;
}

const WeeklyDropCard = ({
  countdownLabel,
  dayLabel,
  deadlineText,
  imageUrl,
  mealName,
  pickupWindow,
  platesLeft,
  portion,
  price,
  progressValue,
  totalPlates,
  onReserve,
}: WeeklyDropCardProps) => {
  return (
    <article className="panel-surface grid gap-5 p-5 md:p-6">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${mealName} plate`}
          loading="lazy"
          width={1024}
          height={768}
          className="aspect-[4/3] w-full rounded-[1.5rem] object-cover shadow-soft"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{dayLabel}</p>
          <h3 className="mt-3 text-2xl font-semibold text-foreground">{mealName}</h3>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-2 text-right">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-primary">Order countdown</p>
          <p className="text-sm font-semibold text-foreground">{countdownLabel}</p>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Flame className="text-primary" />
          <span className="text-3xl font-extrabold">KES {price.toLocaleString()}</span>
        </div>
        <p>{portion}</p>
        <div className="flex items-center gap-2">
          <Clock3 className="text-primary" />
          <span>{deadlineText}</span>
        </div>
        <div className="flex items-center gap-2">
          <PackageCheck className="text-highlight" />
          <span>{pickupWindow}</span>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">Only {platesLeft} plates available</span>
          <span className="text-muted-foreground">{totalPlates} total</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${progressValue}%` }} />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {platesLeft <= 4 ? "Closing fast" : "Fresh batch pre-order"}
        </p>
      </div>

      <Button onClick={onReserve} variant="hero" size="xl" className="w-full">
        Reserve on WhatsApp
      </Button>
    </article>
  );
};

export default WeeklyDropCard;