import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StickyReserveBarProps {
  reserveHref: string;
  callHref: string;
}

const StickyReserveBar = ({ reserveHref, callHref }: StickyReserveBarProps) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-border/70 bg-surface/95 p-3 shadow-float backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Foodbrite weekly drop</p>
          <p className="truncate text-sm font-semibold text-foreground">Reserve before the batch closes</p>
        </div>
        <Button asChild size="sm" variant="warmOutline" className="shrink-0">
          <a href={callHref} aria-label="Call Foodbrite now">
            <Phone />
            Call
          </a>
        </Button>
        <Button asChild size="sm" variant="hero" className="shrink-0">
          <a href={reserveHref} target="_blank" rel="noreferrer" aria-label="Reserve meals on WhatsApp">
            <MessageCircle />
            Reserve Now
          </a>
        </Button>
      </div>
    </div>
  );
};

export default StickyReserveBar;