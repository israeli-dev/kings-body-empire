import Image from "next/image";
import Link from "next/link";
import { GymSlideshow } from "@/components/gym-slideshow";
import { FAQ, FEATURED_PROGRAMS } from "@/lib/content";
import { GYM_SLIDES, PROGRAM_IMAGES } from "@/lib/gym-slides";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/* ---------- small helpers ---------- */
function Icon({ d, w = 2 }: { d: string; w?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  video: "M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM15 10l6-3v10l-6-3z",
};

/* ---------- content ---------- */
const FEATURES = [
  { t: "Track Workouts", p: "Log your workouts and see your progress.", d: P.dumbbell },
  { t: "Log Your Food", p: "Keep track of what you eat with automatic date & time.", d: P.fork },
  { t: "Body Measurements", p: "Record weight, height & more to track your progress.", d: P.measure },
  { t: "Consistency Rating", p: "Get rated (Diamond, Gold, Silver, Bronze) on consistency.", d: P.star },
  { t: "Book a Fitness Call", p: "Schedule a call with our team at your convenience.", d: P.calendar },
];

/** Category tiles in the consultation panel — each links into the library. */
const EDU_TILES = [
  { label: "Diet", href: "/education?category=Diet", src: "/images/edu/diet.jpg", alt: "Illustration of a colourful Nigerian healthy meal spread" },
  { label: "Workout", href: "/education?category=Workout", src: "/images/edu/workout.jpg", alt: "Illustration of dumbbells, a kettlebell and a barbell" },
  { label: "Fat Loss", href: "/education?category=Fat%20Loss", src: "/images/edu/fat-loss.jpg", alt: "Illustration of a flame and a downward arrow over a measuring tape" },
  { label: "Bulking", href: "/education?category=Bulking", src: "/images/edu/bulking.jpg", alt: "Illustration of a flexed bicep arm holding a dumbbell" },
  { label: "Rest & Recovery", href: "/education?category=Rest", src: "/images/edu/rest.jpg", alt: "Illustration of a moon, pillow and calm heart-rate line" },
];

const STEPS = [
  { t: "1. Sign Up / Log In", p: "Create your account and get started.", d: P.user },
  { t: "2. Track & Log", p: "Log your workouts, meals, measurements and more.", d: P.doc },
  { t: "3. Get Rated", p: "Stay consistent and earn your rating.", d: P.star },
  { t: "4. Achieve Your Goals", p: "See your progress, get support, and level up.", d: P.trend },
];

/** Shown if the database is unreachable — the same three books the seed loads. */
const FALLBACK_BOOKS = [
  {
    slug: "bulk-up-10kg-nigerian-way",
    title: "How to Bulk-Up by 10kg in 8 Weeks — the Nigerian Way",
    priceKobo: 800_000,
    coverUrl: "/images/books/bulk-up-nigerian.jpg",
    fileUrl: null as string | null,
  },
  {
    slug: "super-bulk-up-diet",
    title: "Super Bulk-Up Diet (Full Recipe Included)",
    priceKobo: 200_000,
    coverUrl: "/images/books/bulk-up-diet.jpg",
    fileUrl: null as string | null,
  },
  {
    slug: "the-ultimate-skin-regiment",
    title: "The Ultimate Skin Regiment",
    priceKobo: 200_000,
    coverUrl: "/images/books/skin-regiment.jpg",
    fileUrl: null as string | null,
  },
];

type BookTile = {
  slug: string;
  title: string;
  priceKobo: number;
  coverUrl: string | null;
  fileUrl: string | null;
};

/** The e-book catalogue lives in Postgres (Supabase in production). */
async function loadBooks(): Promise<BookTile[]> {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true, priceKobo: true, coverUrl: true, fileUrl: true },
      take: 6,
    });
    return books.length > 0 ? books : FALLBACK_BOOKS;
  } catch (error) {
    console.error("[landing] Could not load e-books, using fallback:", error);
    return FALLBACK_BOOKS;
  }
}

export async function LandingPage({ loggedIn }: { loggedIn: boolean }) {
  const books = await loadBooks();

  return (
    <div className="kbe">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">
              {loggedIn ? "WELCOME BACK · TRAIN · EAT · TRACK · TRANSFORM" : "TRAIN · EAT · TRACK · TRANSFORM"}
            </div>
            <h1>
              Welcome to<br />
              <span className="gold">Kings Body Empire</span>
            </h1>
            <p className="lead">Your complete fitness and nutrition platform for a healthier, stronger and more confident you.</p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href={loggedIn ? "/dashboard" : "/signup"}>
                {loggedIn ? "Go to Your Dashboard" : "Get Started"}
              </Link>
              <Link className="btn btn-outline" href="/book-call">
                Book a Consultation
              </Link>
            </div>
          </div>
          <GymSlideshow slides={GYM_SLIDES} variant="hero" ariaLabel="Kings Body Empire training highlights" />
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
            {FEATURED_PROGRAMS.map((program) => {
              const image = PROGRAM_IMAGES[program.slug];
              return (
                <div className="pkg" key={program.slug}>
                  {image ? (
                    <div className="pkg-art-photo">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 760px) 33vw, 92vw"
                        loading="lazy"
                      />
                      {program.badge && <span className="pkg-badge">{program.badge}</span>}
                    </div>
                  ) : (
                    <div className="pkg-art">
                      <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
                        <circle cx="50" cy="30" r="14" />
                        <path d="M20 95c0-25 13-40 30-40s30 15 30 40z" />
                      </svg>
                    </div>
                  )}
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
              );
            })}
          </div>
        </div>
      </section>

      <section className="gallery" id="gallery">
        <div className="wrap">
          <div className="gallery-head">
            <div className="sec-head">
              <div className="eyebrow">INSIDE THE EMPIRE</div>
              <h2>Real People. <span style={{ color: "var(--gold)" }}>Real Work.</span></h2>
              <p>This is what training at Kings Body Empire looks like — strength, conditioning, community and coaching, in and out of the gym.</p>
            </div>
            <Link className="btn btn-gold" href={loggedIn ? "/workouts" : "/signup"}>
              {loggedIn ? "Log a Workout" : "Start Training"} &nbsp;&rarr;
            </Link>
          </div>
          <GymSlideshow slides={GYM_SLIDES} variant="wide" ariaLabel="Inside Kings Body Empire — gym photo gallery" />
        </div>
      </section>

      <div className="split">
        <div className="books" id="books">
          <h2>Fitness &amp; Diet Books</h2>
          <p>Get our e-books and guides to help you learn, stay consistent, and achieve your goals.</p>
          <div className="book-grid">
            {books.map((book) => (
              <Link className="book-card" key={book.slug} href={`/books/${book.slug}`}>
                <div className="book-card-cover">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt={`${book.title} — e-book cover`} loading="lazy" />
                  ) : (
                    <span className="book-card-fallback" aria-hidden="true">📕</span>
                  )}
                  {!book.fileUrl && <span className="tag book-soon">Link coming soon</span>}
                </div>
                <span className="book-card-title">{book.title}</span>
                <span className="book-card-price">{formatNaira(book.priceKobo)}</span>
              </Link>
            ))}
          </div>
          <Link className="btn btn-gold" href="/books">Browse Books &nbsp;&rarr;</Link>
        </div>

        <div className="consult" id="education">
          <div className="consult-grid">
            <div className="consult-copy">
              <div className="eyebrow" style={{ color: "#8A6607" }}>EDUCATION &amp; COACHING</div>
              <h2>Book a Consultation With a Fitness Coach</h2>
              <p>
                Stuck on diet, workouts, fat loss, bulking or recovery? Sit down 1-on-1 with our
                coach — video call available — and leave with a plan built around your body, your
                kitchen and your schedule.
              </p>
              <ul className="consult-points">
                <li><Icon d={P.check} w={3} />30-minute 1-on-1 video or phone call</li>
                <li><Icon d={P.check} w={3} />Personalised diet, workout and recovery direction</li>
                <li><Icon d={P.check} w={3} />Choose your matching program straight after the call</li>
              </ul>
              <Link className="btn btn-dark consult-cta" href="/book-call">
                <Icon d={P.video} w={2.4} /> Book Your Consultation
              </Link>
            </div>
            <div className="coach-art">
              <Image
                src="/images/coach-consultation.jpg"
                alt="Kings Body Empire coach consulting a client at a table with a laptop"
                fill
                sizes="(min-width: 880px) 20vw, 92vw"
                loading="lazy"
              />
            </div>
          </div>

          <div className="consult-tiles">
            <p className="consult-tiles-label">Prefer to start learning on your own? Pick a topic:</p>
            <div className="tile-grid">
              {EDU_TILES.map((tile) => (
                <Link className="cat-tile-img" key={tile.label} href={tile.href}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tile.src} alt={tile.alt} loading="lazy" />
                  <span>{tile.label}</span>
                </Link>
              ))}
            </div>
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
