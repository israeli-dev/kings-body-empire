"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CONSULTATION_FEE_LABEL,
  SPECIALTY_DETAILS,
  SPECIALTY_GROUPS,
  isConsultationSpecialty,
  modeLabel,
  specialtiesInGroup,
  type ConsultationMode,
  type ConsultationSpecialty,
} from "@/lib/consultation-core";
import { SpecialtyIcon, specialtyAccent } from "@/components/consultation-icons";
import { specialistWhatsappUrl } from "@/lib/env";

type RequestRow = {
  id: string;
  specialty: ConsultationSpecialty;
  mode: ConsultationMode;
  preferredAt: string;
  address: string | null;
  notes: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
};

const STATUS_META: Record<RequestRow["status"], { label: string; className: string }> = {
  PENDING: {
    label: "Pending — the team will confirm",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  },
};

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="2" y="6" width="13" height="12" rx="2.5" />
      <path d="M15 10.5 22 7v10l-7-3.5" />
    </svg>
  );
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Latest possible local value for the datetime-local min attribute, in WAT wall time. */
function watNowInputValue(): string {
  const shifted = new Date(Date.now() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

function BookVisitContent() {
  const searchParams = useSearchParams();
  const preset = searchParams.get("specialty");
  const [specialty, setSpecialty] = useState<ConsultationSpecialty | null>(
    isConsultationSpecialty(preset) ? preset : null,
  );
  const [mode, setMode] = useState<ConsultationMode>("HOME_VISIT");
  const [preferredAt, setPreferredAt] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<RequestRow | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/consultations", { cache: "no-store" });
      if (res.ok) setRequests((await res.json()) as RequestRow[]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const minInputValue = useMemo(() => watNowInputValue(), []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!specialty) {
      setError("Pick the specialist you would like to see.");
      return;
    }
    if (!preferredAt) {
      setError("Choose the date and time that suits you.");
      return;
    }
    if (!phone.trim()) {
      setError("Add your phone number so the team can reach you.");
      return;
    }
    if (mode === "HOME_VISIT" && address.trim().length < 8) {
      setError("Enter the full address for the home visit.");
      return;
    }

    setSubmitting(true);
    // datetime-local carries no zone — the studio runs on West Africa Time.
    const instant = new Date(`${preferredAt}:00+01:00`);

    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialty,
        mode,
        phone: phone.trim(),
        address: mode === "HOME_VISIT" ? address.trim() : undefined,
        preferredAt: instant.toISOString(),
        notes: notes.trim() || undefined,
      }),
    });
    setSubmitting(false);

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      specialty?: ConsultationSpecialty;
      mode?: ConsultationMode;
      preferredAt?: string;
      address?: string | null;
      amountKobo?: number;
      status?: RequestRow["status"];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error || "Could not send your request. Please try again.");
      return;
    }

    setDone({
      id: data.id ?? "",
      specialty: data.specialty ?? specialty,
      mode: data.mode ?? mode,
      preferredAt: data.preferredAt ?? instant.toISOString(),
      address: data.address ?? (mode === "HOME_VISIT" ? address.trim() : null),
      notes: null,
      status: data.status ?? "PENDING",
      createdAt: new Date().toISOString(),
    });
    void loadRequests();
  }

  if (done) {
    const detail = SPECIALTY_DETAILS[done.specialty];
    const preferredLabel = new Date(done.preferredAt).toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    });
    const notifyText = `Hi Kings Body Empire! I just requested a ${detail.label} session (${modeLabel(
      done.mode,
    )}) for ${preferredLabel}. My name is on the request — reference ${done.id.slice(-6)}.`;
    const notifyHref = `${specialistWhatsappUrl}${
      specialistWhatsappUrl.includes("?") ? "&" : "?"
    }text=${encodeURIComponent(notifyText)}`;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <CheckIcon className="h-7 w-7 text-emerald-400" />
          </span>
          <h1 className="text-2xl font-semibold">Request received</h1>
          <p className="text-sm text-muted">
            The team will confirm your {modeLabel(done.mode).toLowerCase()} for{" "}
            <span className="text-ink">{preferredLabel}</span> — you&rsquo;ll get a call or WhatsApp message to lock it in.
          </p>
          <div className="rounded-xl border border-line bg-black/20 p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Specialist</span>
              <span className="text-right text-ink">{detail.label}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted">Mode</span>
              <span className="text-right text-ink">{modeLabel(done.mode)}</span>
            </div>
            {done.address && (
              <div className="mt-2 flex items-start justify-between gap-3">
                <span className="text-muted">Address</span>
                <span className="text-right text-ink">{done.address}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted">Fee</span>
              <span className="text-right text-ink">{CONSULTATION_FEE_LABEL} — on the call / at the visit</span>
            </div>
          </div>
          <p className="text-xs text-muted">
            Nothing is charged online. You pay {CONSULTATION_FEE_LABEL} when the session happens.
          </p>
          {notifyHref && (
            <a className="btn-primary w-full" href={notifyHref} target="_blank" rel="noreferrer">
              Notify the clinic on WhatsApp
            </a>
          )}
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setDone(null);
              setSpecialty(null);
              setPreferredAt("");
              setNotes("");
              setAddress("");
              setError("");
            }}
          >
            Book another session
          </button>
        </div>

        <YourRequests requests={requests} loading={loadingRequests} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Home Visit · {CONSULTATION_FEE_LABEL} flat</p>
        <h1 className="mt-2 text-3xl font-semibold">Consult a doctor — at your place or on a call</h1>
        <p className="mt-2 text-sm text-muted">
          Our physician comes to you anywhere in Nigeria, or consults you over video/phone from home.
          One flat fee, paid on the call or at the visit — never online. Available for fitness, nutrition and specialist medical reviews.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1 — specialty */}
        <section className="card space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">1 · Choose your specialist</h2>
            <span className="text-xs text-muted">Tap a card</span>
          </div>
          {SPECIALTY_GROUPS.map((group) => (
            <div key={group}>
              <p className="label">{group}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {specialtiesInGroup(group).map((key) => {
                  const detail = SPECIALTY_DETAILS[key];
                  const accent = specialtyAccent(key);
                  const active = specialty === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSpecialty(key)}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[#F5B301]/70 bg-[#F5B301]/10 shadow-[0_0_0_1px_#F5B30166]"
                          : "border-line bg-black/20 hover:border-[#F5B301]/40"
                      }`}
                    >
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accent.chip}`}>
                        <SpecialtyIcon specialty={key} className={`h-5 w-5 ${accent.icon}`} />
                      </span>
                      <span className="mt-2 block text-[13px] font-semibold leading-snug text-ink">{detail.label}</span>
                      <span className="mt-1 block text-[10px] leading-snug text-muted">{detail.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Step 2 — mode */}
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">2 · How should the consultation happen?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: "VIDEO" as const,
                  title: "Video / phone call",
                  hint: "From anywhere in Nigeria — we ring you at the chosen time.",
                  Icon: VideoIcon,
                },
                {
                  value: "HOME_VISIT" as const,
                  title: "Home visit",
                  hint: "A doctor comes to your house, office or hotel — anywhere in Nigeria.",
                  Icon: HouseIcon,
                },
              ] as const
            ).map(({ value, title, hint, Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={active}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[#F5B301]/70 bg-[#F5B301]/10 shadow-[0_0_0_1px_#F5B30166]"
                      : "border-line bg-black/20 hover:border-[#F5B301]/40"
                  }`}
                >
                  <Icon className="mt-0.5 h-6 w-6 flex-none text-[#F5B301]" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-xs text-muted">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {mode === "HOME_VISIT" && (
            <div>
              <label className="label" htmlFor="address">Home address for the visit</label>
              <textarea
                id="address"
                className="input min-h-[72px]"
                placeholder="House number, street, area, city — plus a landmark to find you easily"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
          )}
        </section>

        {/* Step 3 — time + contact */}
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">3 · When &amp; how to reach you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="preferredAt">Preferred date &amp; time (WAT)</label>
              <input
                id="preferredAt"
                type="datetime-local"
                className="input"
                min={minInputValue}
                value={preferredAt}
                onChange={(event) => setPreferredAt(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                className="input"
                placeholder="e.g. 0803 123 4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="notes">Anything the doctor should know? (optional)</label>
            <textarea
              id="notes"
              className="input min-h-[72px]"
              placeholder="Symptoms, current meds, supplements, recent labs, what you want to achieve…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={600}
            />
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {/* Fee + submit */}
        <div className="card flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Flat fee</p>
            <p className="mt-1 text-3xl font-bold text-[#F5B301]">{CONSULTATION_FEE_LABEL}</p>
            <p className="mt-1 text-xs text-muted">Pay on the call or at the visit. No payment is taken now.</p>
          </div>
          <button type="submit" className="btn-primary px-8 py-3 text-base" disabled={submitting}>
            {submitting ? "Sending…" : "Request consultation"}
          </button>
        </div>
      </form>

      <YourRequests requests={requests} loading={loadingRequests} />
    </div>
  );
}

function YourRequests({ requests, loading }: { requests: RequestRow[]; loading: boolean }) {
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold">Your requests</h2>
      {loading ? (
        <p className="text-sm text-muted">Loading your requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet — your consultation requests will appear here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {requests.map((request) => {
            const detail = SPECIALTY_DETAILS[request.specialty];
            const meta = STATUS_META[request.status] ?? STATUS_META.PENDING;
            return (
              <li key={request.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{detail.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {modeLabel(request.mode)} ·{" "}
                    {new Date(request.preferredAt).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Lagos",
                    })}
                    {request.address ? ` · ${request.address}` : ""}
                  </p>
                </div>
                <span className={`inline-flex flex-none self-start whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium sm:self-auto ${meta.className}`}>
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function BookVisitPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-6 text-sm text-muted">Loading…</div>}>
      <BookVisitContent />
    </Suspense>
  );
}
