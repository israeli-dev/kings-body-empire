"use client";

import { useState } from "react";
import type { ReferralOverview } from "@/lib/referrals";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  });
}

export function ReferralCard({ data }: { data: ReferralOverview }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  const shareText = `Train with me on Kings Body Empire. Use my code ${data.code} and we both get ${data.rewardDays} extra days when you start a program.`;

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Referrals</p>
          <h2 className="mt-2 text-lg font-semibold">
            Invite a friend — you both get {data.rewardDays} free days
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Share your link. When your friend starts a program, both of your subscriptions get{" "}
            {data.rewardDays} extra days added automatically.
          </p>
        </div>
        {data.stats.appliedDays > 0 && (
          <span className="tag border border-success/40 bg-success/10 text-success">
            {data.stats.appliedDays} days earned
          </span>
        )}
      </div>

      {data.code ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-panel2 px-4 py-3">
              <span className="font-mono text-xl font-semibold tracking-[0.18em] text-gold">
                {data.code}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => copy(data.code, "code")}
              >
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-line bg-panel2 px-4 py-3">
              <span className="truncate text-sm text-muted">{data.link}</span>
              <button
                type="button"
                className="btn-secondary btn-sm shrink-0"
                onClick={() => copy(data.link, "link")}
              >
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="btn-secondary btn-sm"
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${data.link}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
            <a
              className="btn-secondary btn-sm"
              href={`sms:?&body=${encodeURIComponent(`${shareText} ${data.link}`)}`}
            >
              Send by SMS
            </a>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Invited", value: data.stats.invited },
              { label: "Started a program", value: data.stats.qualified },
              { label: "Days earned", value: data.stats.appliedDays },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-line bg-panel2 px-4 py-3">
                <dt className="text-xs uppercase tracking-wider text-muted">{stat.label}</dt>
                <dd className="mt-1 text-xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {data.bankedDays > 0 && (
            <p className="alert-info mt-4">
              You have <span className="font-semibold">{data.bankedDays} bonus days</span> waiting.
              They will be added to your next program automatically.
            </p>
          )}

          {data.invites.length > 0 && (
            <ul className="mt-5 divide-y divide-line">
              {data.invites.map((invite) => (
                <li
                  key={`${invite.name}-${invite.joinedAt}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <span>{invite.name}</span>
                  <span className="text-xs text-muted">
                    joined {formatDay(invite.joinedAt)} · {invite.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data.invites.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              Nobody has used your code yet. Send it to one person who keeps saying they want to
              start.
            </p>
          )}
        </>
      ) : (
        <p className="alert-error mt-4">
          Your code could not be created. Refresh the page — if it keeps happening, contact
          support.
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted/80">
        A referral counts once your friend&apos;s first program payment succeeds. Referral days
        stack on top of the paid period and never shorten it.
      </p>
    </section>
  );
}
