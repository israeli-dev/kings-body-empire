"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

const RANK_COLORS: Record<string, string> = {
  BRONZE: "#8B5E34",
  SILVER: "#C8C8C8",
  GOLD: "#F5B301",
  DIAMOND: "#B9E4EA",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [rank, setRank] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rank")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRank(data.rank));
  }, []);

  return (
    <div>
      <nav style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderBottom: "1px solid #333" }}>
        <Link href="/workouts">Workouts</Link>
        <Link href="/food">Food</Link>
        <Link href="/measurements">Measurements</Link>
        {rank && (
          <span
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              color: "#111",
              background: RANK_COLORS[rank] || "#999",
            }}
          >
            {rank}
          </span>
        )}
        <button onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
      </nav>
      {children}
    </div>
  );
}
