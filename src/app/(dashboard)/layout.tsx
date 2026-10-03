"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid #333" }}>
        <Link href="/workouts">Workouts</Link>
        <Link href="/food">Food</Link>
        <Link href="/measurements">Measurements</Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ marginLeft: "auto" }}>
          Log out
        </button>
      </nav>
      {children}
    </div>
  );
}
