/**
 * Photography for the Kings Body Empire landing-page slideshows.
 *
 * The originals were supplied by the site owner and live (web-optimised,
 * max ~1600px / q82, 2.3 MB total instead of ~28 MB) in
 * `public/images/gym/`. Captions are written per-photo so each slide
 * sells a different part of the coaching offer.
 *
 * Note: one uploaded photo (the 399×501 mirror selfie) was too small
 * for a full-bleed slide, so it was deliberately left out — it would
 * have pixelated next to the other high-resolution shots.
 */
export type GymSlide = {
  src: string;
  alt: string;
  tag: string;
  title: string;
  caption: string;
  /** CSS `object-position` so wide crops keep the athlete in frame. */
  position: string;
};

export const GYM_SLIDES: GymSlide[] = [
  {
    src: "/images/gym/explosive-power.jpg",
    alt: "Athlete mid-air performing an explosive medicine-ball slam in a dark gym",
    tag: "Explosive Power",
    title: "Power in every rep",
    caption:
      "Athletic, full-body power work — programmed, coached and progressed week after week.",
    position: "50% 32%",
  },
  {
    src: "/images/gym/queens-train-together.jpg",
    alt: "Three women in training gear holding medicine balls together in a gym",
    tag: "Stronger Together",
    title: "Queens who train together",
    caption:
      "You don't do this alone. Train alongside people who show up, push hard and hold you accountable.",
    position: "50% 28%",
  },
  {
    src: "/images/gym/iron-roots.jpg",
    alt: "Young athlete in black and white standing by a loaded barbell at an outdoor gym",
    tag: "Where It Starts",
    title: "No shortcuts. Just iron.",
    caption:
      "Every empire starts somewhere. Basic equipment, honest work and consistency beat fancy excuses.",
    position: "50% 30%",
  },
  {
    src: "/images/gym/sculpt-and-strength.jpg",
    alt: "Woman performing a cable kickback exercise under blue gym lighting",
    tag: "Sculpt & Tone",
    title: "Built with intention",
    caption:
      "Targeted glute, leg and core work with the form coaching to feel every single rep.",
    position: "50% 26%",
  },
  {
    src: "/images/gym/squat-strong.jpg",
    alt: "Woman holding a barbell across her shoulders ready to squat in a gym",
    tag: "Lower-Body Strength",
    title: "Squat strong, stand tall",
    caption:
      "Progressive strength blocks that build powerful legs and unshakeable confidence under the bar.",
    position: "50% 30%",
  },
  {
    src: "/images/gym/empire-push-ups.jpg",
    alt: "Three athletes doing push-ups together on an outdoor training floor",
    tag: "The Empire Community",
    title: "Nobody trains alone",
    caption:
      "Group conditioning, partner work and a community that drags you forward on the hard days.",
    position: "50% 42%",
  },
  {
    src: "/images/gym/mirror-work.jpg",
    alt: "Athlete performing a cable crossover while watching her form in the gym mirror",
    tag: "Mind–Muscle Connection",
    title: "Face the work",
    caption:
      "Learn to train muscles, not just move weight — form first, intensity always.",
    position: "50% 34%",
  },
  {
    src: "/images/gym/focused-rows.jpg",
    alt: "Woman holding a plank position while rowing a dumbbell in a bright gym",
    tag: "Core & Control",
    title: "Every rep with purpose",
    caption:
      "Core stability and unilateral strength woven into every program we write for you.",
    position: "50% 36%",
  },
  {
    src: "/images/gym/cardio-conditioning.jpg",
    alt: "Woman performing high-knees conditioning drills in a gym",
    tag: "Conditioning",
    title: "Move fast. Breathe deep.",
    caption:
      "Fat-burning conditioning finishers that build an engine to match your strength.",
    position: "50% 28%",
  },
  {
    src: "/images/gym/fight-fit.jpg",
    alt: "Lean athlete in a red cap leaning against a heavy punching bag in a boxing gym",
    tag: "Fight Fit",
    title: "Discipline builds freedom",
    caption:
      "The physique is the receipt. The discipline you build here pays out in every part of life.",
    position: "62% 32%",
  },
];

/** Photos used on the three featured-program cards (by program slug). */
export const PROGRAM_IMAGES: Record<string, { src: string; alt: string }> = {
  foundation: {
    src: "/images/gym/cardio-conditioning.jpg",
    alt: "Beginner-friendly conditioning training in a gym",
  },
  transformation: {
    src: "/images/gym/squat-strong.jpg",
    alt: "Woman strength training with a barbell",
  },
  "elite-1-on-1": {
    src: "/images/gym/mirror-work.jpg",
    alt: "Athlete training one-on-one style cable work in front of a mirror",
  },
};
