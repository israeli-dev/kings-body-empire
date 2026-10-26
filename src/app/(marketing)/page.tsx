import Image from "next/image";
import Link from "next/link";
import { RankBadge } from "@/components/rank-badge";
import { formatNaira } from "@/lib/money";
import {
  FAQ,
  FEATURED_PROGRAMS,
  FEATURES,
  HOW_IT_WORKS,
  TESTIMONIALS,
} from "@/lib/content";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-line">
        {/* Background photograph */}
        <Image
          src="/images/hero-gym.jpg"
          alt="Three athletes training in a dark gym lit by warm gold light"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[62%_center] sm:object-center"
        />
        {/* Readability overlays: strong on mobile, softer on large screens */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/95 to-bg/60 lg:via-bg/85 lg:to-bg/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/20 to-bg/50"
        />

        <div className="container-page grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="animate-rise">
            <p className="eyebrow">Coaching for the long game</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Build the body
              <span className="block text-gold">of a King.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              Log your training, food and measurements. Show up six days out of seven and
              climb from Bronze to Diamond. When you are ready for more, the coach is one
              call away.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3">
                Start free — no card
              </Link>
              <Link href="/pricing" className="btn-secondary px-6 py-3">
                See the programs
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Ranks</dt>
                <dd className="mt-1 text-2xl font-semibold">4</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Logged in 30s</dt>
                <dd className="mt-1 text-2xl font-semibold">Daily</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Coach calls</dt>
                <dd className="mt-1 text-2xl font-semibold">1:1</dd>
              </div>
            </dl>
          </div>

          {/* Dashboard preview card */}
          <div className="animate-rise rounded-3xl border border-white/10 bg-panel/90 p-6 shadow-glow backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">This week</p>
                <p className="mt-1 text-lg font-semibold">Your streak</p>
              </div>
              <RankBadge rank="GOLD" />
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <div key={`${day}-${index}`} className="text-center">
                  <div
                    className={`flex h-11 items-center justify-center rounded-lg border text-sm font-semibold ${
                      index < 5
                        ? "border-gold/40 bg-gold/15 text-goldSoft"
                        : "border-line bg-panel2 text-muted"
                    }`}
                  >
                    {index < 5 ? "✓" : "·"}
                  </div>
                  <span className="mt-1 block text-[10px] uppercase text-muted">{day}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: "Bench press", value: "4 × 8 · 70kg" },
                { label: "Jollof + grilled chicken", value: "≈ 620 kcal" },
                { label: "Waist", value: "84 cm" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-line bg-panel2 px-4 py-3 text-sm"
                >
                  <span className="text-muted">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-muted">
              Five active days this week — one more for Diamond.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line py-16 sm:py-20">
        <div className="container-page">
          <p className="eyebrow">The toolkit</p>
          <h2 className="section-title mt-3">Everything you need to stay honest</h2>
          <p className="mt-4 max-w-xl text-sm text-muted">
            All four are free and live in your dashboard. Log one thing today — the rank
            starts counting from that first entry.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="card group flex flex-col transition hover:border-gold/40 hover:bg-panel2"
              >
                <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
                <h3 className="mt-3 text-base font-semibold group-hover:text-goldSoft">
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted">{feature.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold">
                  {feature.cta}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="border-b border-line py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Programs</p>
              <h2 className="section-title mt-3">Pick the level you are at</h2>
            </div>
            <Link href="/pricing" className="text-sm text-gold hover:text-goldSoft">
              Compare all programs →
            </Link>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {FEATURED_PROGRAMS.map((program) => (
              <article key={program.slug} className="card flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{program.title}</h3>
                  <span className="tag">{program.durationWeeks}-week plan</span>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{program.description}</p>
                <p className="mt-6 text-2xl font-semibold text-gold">
                  {formatNaira(program.priceKobo)}
                  <span className="ml-1 text-sm font-normal text-muted">/month</span>
                </p>
                <Link href="/pricing" className="btn-secondary mt-4">
                  View details
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-line py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="section-title mt-3">Three steps, then repeat</h2>
            <p className="mt-4 text-sm text-muted">
              No crash diets, no 5am punishment. A system you can actually keep for twelve
              weeks — that is what changes a body.
            </p>
            <Link href="/signup" className="btn-primary mt-6">
              Create your account
            </Link>
          </div>

          <ol className="space-y-4">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="card-tight flex gap-4">
                <span className="text-sm font-bold text-gold">{item.step}</span>
                <div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Coach */}
      <section className="border-b border-line py-16 sm:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line">
              <Image
                src="/images/coaching.jpg"
                alt="A coach standing in the gym with a clipboard while a client trains behind him"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-bg/85 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-gold">Your coach</p>
              <p className="mt-1 text-sm text-ink">
                One plan, one person keeping you honest — not an app that forgets you.
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="eyebrow">The person behind the plan</p>
            <h2 className="section-title mt-3">Coaching that knows your name</h2>
            <p className="mt-4 text-sm text-muted">
              Programs are built around the food in your kitchen and the equipment in your
              gym — or your living room. You get feedback, not just a PDF, and a coach who
              notices when you go quiet.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Training blocks that progress every week, not random workouts",
                "Meal templates using Nigerian staples and real portions",
                "Form checks and adjustments on your lifts",
                "A real person on the other end of the WhatsApp message",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-muted">
                  <span className="text-gold" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-primary">Work with the coach</Link>
              <Link href="/signup" className="btn-secondary">Start free first</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Community band */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <Image
          src="/images/community.jpg"
          alt="A boxer resting against a heavy bag in a gym"
          fill
          sizes="100vw"
          className="-z-10 object-cover object-[35%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/90 to-bg/40"
        />
        <div className="container-page py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="eyebrow">Everything is welcome here</p>
            <h2 className="section-title mt-3">
              Beginners. Returners. Lifters. Fighters.
            </h2>
            <p className="mt-4 text-sm text-muted">
              Kings Body Empire is not a bodybuilding club. It is a place to log honest
              work — whether that is three sets in a home gym or a full session in the
              boxing gym. Your rank reflects showing up, not your starting point.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">
                Start logging free
              </Link>
              <Link href="/education" className="btn-secondary">
                Browse the library
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Education + books teaser */}
      <section className="border-b border-line py-16 sm:py-20">
        <div className="container-page grid gap-5 lg:grid-cols-2">
          <article className="card bg-panel-fade">
            <p className="eyebrow">Education library</p>
            <h3 className="mt-3 text-xl font-semibold">Short lessons, sorted by goal</h3>
            <p className="mt-2 text-sm text-muted">
              Diet, training, fat loss, bulking and rest — videos you can watch in the gym
              queue instead of doom-scrolling.
            </p>
            <Link href="/education" className="btn-secondary mt-5">
              Open the library
            </Link>
          </article>

          <article className="card bg-panel-fade">
            <p className="eyebrow">E-books</p>
            <h3 className="mt-3 text-xl font-semibold">The playbooks, in your pocket</h3>
            <p className="mt-2 text-sm text-muted">
              Nigerian-friendly meal plans and hypertrophy blueprints. Buy once, download
              from your account forever.
            </p>
            <Link href="/books" className="btn-secondary mt-5">
              Browse e-books
            </Link>
          </article>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-line py-16 sm:py-20">
        <div className="container-page">
          <p className="eyebrow">Results</p>
          <h2 className="section-title mt-3">People who kept showing up</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className="card">
                <blockquote className="text-sm leading-relaxed text-ink">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 text-xs text-muted">
                  <span className="font-semibold text-ink">{item.name}</span> · {item.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="section-title mt-3">Questions, answered</h2>
            <p className="mt-4 text-sm text-muted">
              Still unsure? Book a free call from your dashboard once you sign up.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card-tight group">
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  <span className="group-open:text-gold">{item.q}</span>
                </summary>
                <p className="mt-2 text-sm text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-panel-fade py-16">
        <div className="container-page flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold/25 bg-panel p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-semibold">Start with one honest week.</h2>
            <p className="mt-2 text-sm text-muted">
              Free account, no card. Log today, see where the week takes you.
            </p>
          </div>
          <Link href="/signup" className="btn-primary px-6 py-3">
            Create your free account
          </Link>
        </div>
      </section>
    </>
  );
}
