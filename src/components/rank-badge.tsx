import { RANK_COLORS, RANK_LABELS } from "@/lib/rank-core";
import type { RankName } from "@/types";

export function RankBadge({
  rank,
  className = "",
}: {
  rank: RankName;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#14100A] ${className}`}
      style={{ backgroundColor: RANK_COLORS[rank] }}
    >
      <span aria-hidden="true">♛</span>
      {RANK_LABELS[rank]}
    </span>
  );
}
