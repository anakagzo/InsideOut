import { Star } from "lucide-react";

export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`text-star ${i <= Math.round(rating) ? "fill-star" : "fill-none opacity-30"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
