/**
 * Shared catalogue for the "Book a Home Visit" consultations.
 * Pure module — safe to import from client components and API routes.
 */

export const CONSULTATION_FEE_KOBO = 2_000_000; // ₦20,000 flat
export const CONSULTATION_FEE_LABEL = "₦20,000";

export const CONSULTATION_SPECIALTIES = [
  "FITNESS_COACH",
  "DIETICIAN",
  "NUTRITIONIST",
  "CARDIOLOGIST",
  "DIABETOLOGIST_ENDOCRINOLOGIST",
  "NEUROLOGIST",
] as const;

export type ConsultationSpecialty = (typeof CONSULTATION_SPECIALTIES)[number];

export const CONSULTATION_MODES = ["VIDEO", "HOME_VISIT"] as const;
export type ConsultationMode = (typeof CONSULTATION_MODES)[number];

export type SpecialtyGroup = "Fitness" | "Health";

export type SpecialtyDetail = {
  label: string;
  short: string;
  blurb: string;
  group: SpecialtyGroup;
};

export const SPECIALTY_DETAILS: Record<ConsultationSpecialty, SpecialtyDetail> = {
  FITNESS_COACH: {
    label: "Fitness Coach",
    short: "Fitness Coach",
    blurb: "1-on-1 coaching, training blocks, form checks — on video or at your home.",
    group: "Fitness",
  },
  DIETICIAN: {
    label: "Dietician",
    short: "Dietician",
    blurb: "Clinical nutrition therapy for diabetes, obesity, gut and weight goals.",
    group: "Fitness",
  },
  NUTRITIONIST: {
    label: "Nutritionist",
    short: "Nutritionist",
    blurb: "Practical everyday nutrition — what to eat, when and how much, for energy and results.",
    group: "Fitness",
  },
  CARDIOLOGIST: {
    label: "Cardiologist",
    short: "Cardiologist",
    blurb: "Blood pressure, chest pain, palpitations, cholesterol — a proper heart check.",
    group: "Health",
  },
  DIABETOLOGIST_ENDOCRINOLOGIST: {
    label: "Diabetologist / Endocrinologist",
    short: "Diabetologist / Endocrinologist",
    blurb: "Diabetes, thyroid and hormones — glucose review, diet and dosing support.",
    group: "Health",
  },
  NEUROLOGIST: {
    label: "Neurologist",
    short: "Neurologist",
    blurb: "Headaches, migraines, seizures, stroke follow-up and nerve concerns.",
    group: "Health",
  },
};

/** Grouped for rendering: Fitness first, then Health — both in catalogue order. */
export const SPECIALTY_GROUPS: SpecialtyGroup[] = ["Fitness", "Health"];

export function specialtiesInGroup(group: SpecialtyGroup): ConsultationSpecialty[] {
  return CONSULTATION_SPECIALTIES.filter(
    (key) => SPECIALTY_DETAILS[key].group === group,
  );
}

export function isConsultationSpecialty(value: unknown): value is ConsultationSpecialty {
  return (
    typeof value === "string" &&
    (CONSULTATION_SPECIALTIES as readonly string[]).includes(value)
  );
}

export function isConsultationMode(value: unknown): value is ConsultationMode {
  return value === "VIDEO" || value === "HOME_VISIT";
}

export function modeLabel(mode: ConsultationMode): string {
  return mode === "VIDEO" ? "Video / phone call from home" : "Home visit";
}
