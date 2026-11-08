import type { ConsultationSpecialty } from "@/lib/consultation-core";

/** Stroke icons for the six consultation specialties — inline SVG, currentColor. */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function Dumbbell({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4M20 10v4M7 8v8M17 8v8M7 12h10" />
    </svg>
  );
}

function Cutlery({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 3v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3" />
      <path d="M8 3v18" />
      <path d="M19 14V3a4 4 0 0 0-4 4v5a2 2 0 0 0 2 2h2" />
      <path d="M19 14v7" />
    </svg>
  );
}

function Apple({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 8.4c-1-1.7-3.2-2.2-5-1C4.9 8.8 5.3 13.3 7.2 16.7c1.2 2.2 2.5 3.4 3.9 3.4.8 0 1.5-.4 2.4-.4s1.6.4 2.4.4c1.4 0 2.7-1.2 3.9-3.4 1.9-3.4 2.3-7.9-.2-9.3-1.8-1.2-4-.7-5 1" />
      <path d="M12 8.4c-.3-2.1 1-3.9 2.9-4.4.3 2-1 3.8-2.9 4.4Z" />
    </svg>
  );
}

function HeartPulse({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20.2S5.6 15.9 2.9 12C1.1 9.3 3 6 6.3 6c1.9 0 4 1.1 5.7 3.2C13.7 7.1 15.8 6 17.7 6 21 6 22.9 9.3 21.1 12c-2.7 3.9-9.1 8.2-9.1 8.2Z" />
      <path d="M6 12h3.4l1.4-2.8 1.9 4.9 1.5-2.1H17" />
    </svg>
  );
}

function GlucoseMeterWithFruit({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* meter body */}
      <rect x="2" y="3" width="11" height="18" rx="2.2" />
      {/* screen */}
      <rect x="4.5" y="6" width="6" height="4.6" rx="1" />
      {/* buttons */}
      <path d="M5.6 14.2h1.2M9.3 14.2h1.2" />
      {/* test strip tip */}
      <path d="M6.5 21v1.4M8.5 21v1.4" />
      {/* the fruit — a citrus */}
      <circle cx="17.6" cy="16" r="4.1" />
      <path d="M17.6 11.9c.2-1.5 1.4-2.5 3-2.6.2 1.6-1.2 2.8-3 2.6Z" />
      <path d="M15.6 16h4" />
    </svg>
  );
}

function Brain({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

/** Short tone key for plain-CSS theming (landing section). */
export function specialtyTone(
  specialty: ConsultationSpecialty,
): "gold" | "rose" | "amber" | "violet" {
  switch (specialty) {
    case "FITNESS_COACH":
    case "DIETICIAN":
    case "NUTRITIONIST":
      return "gold";
    case "CARDIOLOGIST":
      return "rose";
    case "DIABETOLOGIST_ENDOCRINOLOGIST":
      return "amber";
    case "NEUROLOGIST":
      return "violet";
  }
}

export function SpecialtyIcon({
  specialty,
  className,
}: {
  specialty: ConsultationSpecialty;
  className?: string;
}) {
  switch (specialty) {
    case "FITNESS_COACH":
      return <Dumbbell className={className} />;
    case "DIETICIAN":
      return <Cutlery className={className} />;
    case "NUTRITIONIST":
      return <Apple className={className} />;
    case "CARDIOLOGIST":
      return <HeartPulse className={className} />;
    case "DIABETOLOGIST_ENDOCRINOLOGIST":
      return <GlucoseMeterWithFruit className={className} />;
    case "NEUROLOGIST":
      return <Brain className={className} />;
  }
}

/** Accent colour used for the specialty's icon chip (landing + book-visit page). */
export function specialtyAccent(specialty: ConsultationSpecialty): {
  chip: string;
  icon: string;
} {
  switch (specialty) {
    case "FITNESS_COACH":
    case "DIETICIAN":
    case "NUTRITIONIST":
      return { chip: "bg-[#F5B301]/10 border-[#F5B301]/30", icon: "text-[#F5B301]" };
    case "CARDIOLOGIST":
      return { chip: "bg-[#FB7185]/10 border-[#FB7185]/30", icon: "text-[#FB7185]" };
    case "DIABETOLOGIST_ENDOCRINOLOGIST":
      return { chip: "bg-[#FBBF24]/10 border-[#FBBF24]/30", icon: "text-[#FBBF24]" };
    case "NEUROLOGIST":
      return { chip: "bg-[#A78BFA]/10 border-[#A78BFA]/30", icon: "text-[#A78BFA]" };
  }
}
