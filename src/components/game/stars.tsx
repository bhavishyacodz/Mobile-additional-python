import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRow({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-5" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(cls, n <= value ? "fill-accent text-accent" : "text-lock")}
        />
      ))}
    </span>
  );
}
