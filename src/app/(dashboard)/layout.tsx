import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentUser } from "@/lib/api";
import type { RankName } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fdashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav initialRank={(user.rank as RankName) ?? "BRONZE"} />
      <main className="container-page flex-1 py-8">{children}</main>
      <footer className="border-t border-line py-5">
        <div className="container-page text-xs text-muted">
          Kings Body Empire · Lagos, Nigeria
        </div>
      </footer>
    </div>
  );
}
