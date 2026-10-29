import Link from "next/link";
import { getServerSession } from "next-auth";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/caveat/600.css";
import { authOptions } from "@/lib/auth";
import { FAQ, FEATURED_PROGRAMS } from "@/lib/content";
import { formatNaira } from "@/lib/money";
import "./landing.css";

/* ---------- small helpers ---------- */
function Icon({ d, w = 2 }: { d: string; w?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
function FillIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
/* ---------- icon paths ---------- */
const P = {
  dumbbell: "M4 10v4M20 10v4M7 8v8M17 8v8M7 12h10",
  fork: "M6 3v8a3 3 0 006 0V3M18 3v18M6 3v18",
  measure: "M4 9h16v8H4zM8 9v8M12 9v8M16 9v8",
  star: "M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.3-.6z",
  calendar: "M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM3 10h18M8 3v4M16 3v4",
  check: "M4 12l5 5L20 6",
  user: "M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
  doc: "M6 3h9l3 3v15H6zM9 10h6M9 14h6",
  trend: "M3 17l6-6 4 4 8-9M15 6h6v6",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3",
  bar: "M4 12h16M7 9v6M17 9v6",
  flame: "M12 3c4 4 6 8 6 11a6 6 0 01-12 0c0-1.6.6-3 1.8-4.4C9 11 10 9 9.5 6.5 10.6 7.6 12 5.5 12 3z",
  bulk: "M6 15V6M6 9c2-2 8-2 8 1s-6 3-8 1",
  pulse: "M3 12h4l2 6 4-14 2 8h6",
  dots: "M5 11a1 1 0 100 2 1 1 0 000-2zM12 11a1 1 0 100 2 1 1 0 000-2zM19 11a1 1 0 100 2 1 1 0 000-2z",
  facebook: "M22 12a10 10 0 10-11.5 9.9v-7H8v-3h2.5V9.5A3.5 3.5 0 0114 6h2v3h-2a1 1 0 00-1 1v2h3l-.5 3H13v7A10 10 0 0022 12z",
  x: "M20 3l-7 8 8 10h-6l-5-6.3L4.5 21H2l7.5-8.7L2 3h6l4.6 5.7z",
};

/* ---------- content ---------- */
const FEATURES = [
  { t: "Track Workouts", p: "Log your workouts and see your progress.", d: P.dumbbell },
  { t: "Log Your Food", p: "Keep track of what you eat with automatic date & time.", d: P.fork },
  { t: "Body Measurements", p: "Record weight, height & more to track your progress.", d: P.measure },
  { t: "Consistency Rating", p: "Get rated (Diamond, Gold, Silver, Bronze) on consistency.", d: P.star },
  { t: "Book a Fitness Call", p: "Schedule a call with our team at your convenience.", d: P.calendar },
];

const EDU_CATS = [
  { label: "Diet", d: P.clock },
  { label: "Workout", d: P.bar },
  { label: "Fat Loss", d: P.flame },
  { label: "Bulking", d: P.bulk },
  { label: "Rest & Recovery", d: P.pulse },
  { label: "More", d: P.dots },
];

const STEPS = [
  { t: "1. Sign Up / Log In", p: "Create your account and get started.", d: P.user },
  { t: "2. Track & Log", p: "Log your workouts, meals, measurements and more.", d: P.doc },
  { t: "3. Get Rated", p: "Stay consistent and earn your rating.", d: P.star },
  { t: "4. Achieve Your Goals", p: "See your progress, get support, and level up.", d: P.trend },
];

/**
 * Reading the session needs NEXTAUTH_SECRET to be set. On a fresh deploy where
 * the variable is still missing, NextAuth throws — and that would take the
 * public landing page down with it. Fall back to "signed out" so the front
 * door always renders and only the auth routes report the misconfiguration.
 */
async function readSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const session = await readSession();
  const loggedIn = !!session?.user;

  return (
    <div className="kbe">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">TRAIN · EAT · TRACK · TRANSFORM</div>
            <h1>
              Welcome to<br />
              <span className="gold">Kings Body Empire</span>
            </h1>
            <p className="lead">Your complete fitness and nutrition platform for a healthier, stronger and more confident you.</p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href={loggedIn ? "/workouts" : "/signup"}>Get Started</Link>
              <span className="play"><i>&#9654;</i> Watch Our Intro Video</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-script script">
              Discipline<br />Builds<br />Freedom
              <svg className="crown-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M2 8l4 3 6-7 6 7 4-3-2 11H4L2 8z" />
              </svg>
            </div>
            <svg viewBox="0 0 200 260" fill="none" stroke="currentColor" strokeWidth="4" style={{ color: "var(--gold)" }} aria-hidden="true">
              <path d="M70 40c0-16 14-28 30-28s30 12 30 28-14 26-30 26-30-10-30-26z" />
              <path d="M45 90c10-14 30-20 55-20s45 6 55 20c8 12 10 30 6 46l-8 30c-3 12-2 26 4 40l6 14H37l6-14c6-14 7-28 4-40l-8-30c-4-16-2-34 6-46z" />
              <path d="M45 92c-14 4-24 16-26 34M155 92c14 4 24 16 26 34" />
            </svg>
          </div>
        </div>
      </section>

      <div className="feat-strip">
        <div className="wrap feat-grid">
          {FEATURES.map((f) => (
            <div className="feat" key={f.t}>
              <Icon d={f.d} />
              <h4>{f.t}</h4>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>

      <section id="programs">
        <div className="wrap">
          <div className="programs-top">
            <div className="sec-head">
              <h2>Our Programs <span style={{ color: "var(--gold)" }}>(Work With Us)</span></h2>
              <p>Choose a program that fits your goal. Get expert coaching, structured plans, and full support to achieve real results.</p>
            </div>
            <Link className="btn btn-dark" href="/pricing">View All Programs &nbsp;&rarr;</Link>
          </div>
          <div className="pkg-grid">
            {FEATURED_PROGRAMS.map((program) => (
              <div className="pkg" key={program.slug}>
                <div className="pkg-art">
                  <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
                    <circle cx="50" cy="30" r="14" />
                    <path d="M20 95c0-25 13-40 30-40s30 15 30 40z" />
                  </svg>
                </div>
                <div className="pkg-body">
                  <h3>{program.title}</h3>
                  <p className="pkg-price">
                    {formatNaira(program.priceKobo)}<span>/month</span>
                  </p>
                  <ul>
                    <li><Icon d={P.check} w={3} />{program.description}</li>
                    <li><Icon d={P.check} w={3} />{program.durationWeeks}-week coached block, billed monthly</li>
                  </ul>
                  <Link className="btn btn-dark" href="/pricing">View details</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="split">
        <div className="books" id="books">
          <h2>Fitness &amp; Diet Books</h2>
          <p>Get our e-books and guides to help you learn, stay consistent, and achieve your goals.</p>
          <div className="book-covers">
            <div className="cover"><b>THE ULTIMATE FITNESS GUIDE</b></div>
            <div className="cover"><b>THE COMPLETE DIET GUIDE</b></div>
          </div>
          <Link className="btn btn-gold" href="/books">Browse Books &nbsp;&rarr;</Link>
        </div>
        <div className="edu" id="education">
          <h2>Education Section</h2>
          <p>Watch expert videos and learn about diet, workout, fat loss, bulking, rest and more.</p>
          <Link className="btn btn-dark" href="/education">Explore Videos &nbsp;&rarr;</Link>
          <div className="edu-cats">
            {EDU_CATS.map((c) => (
              <div className="cat-tile" key={c.label}>
                <Icon d={c.d} />
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="how" id="how-it-works">
        <div className="wrap">
          <h2>How It Works</h2>
          <p className="sub">Get started in 4 simple steps</p>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.t}>
                <i><Icon d={s.d} /></i>
                <h4>{s.t}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>

      <section className="faq" id="faq">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "center", margin: "0 auto" }}>
            <h2>Questions, answered</h2>
            <p>Still unsure? Book a free call from your dashboard once you sign up.</p>
          </div>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      </section>

    </div>
  );
}
