import { describe, expect, it } from "vitest";
import {
  CONSULTATION_FEE_KOBO,
  CONSULTATION_FEE_LABEL,
  CONSULTATION_SPECIALTIES,
  CONSULTATION_MODES,
  SPECIALTY_DETAILS,
  SPECIALTY_GROUPS,
  isConsultationMode,
  isConsultationSpecialty,
  modeLabel,
  specialtiesInGroup,
} from "@/lib/consultation-core";

describe("consultation catalogue", () => {
  it("keeps the flat ₦20,000 fee consistent between kobo and label", () => {
    expect(CONSULTATION_FEE_KOBO).toBe(2_000_000);
    expect(CONSULTATION_FEE_LABEL).toBe("₦20,000");
  });

  it("covers every specialty with complete details", () => {
    for (const key of CONSULTATION_SPECIALTIES) {
      const detail = SPECIALTY_DETAILS[key];
      expect(detail.label.length).toBeGreaterThan(0);
      expect(detail.blurb.length).toBeGreaterThan(0);
      expect(SPECIALTY_GROUPS).toContain(detail.group);
    }
    expect(CONSULTATION_SPECIALTIES).toHaveLength(6);
  });

  it("splits fitness and health in catalogue order", () => {
    expect(specialtiesInGroup("Fitness")).toEqual([
      "FITNESS_COACH",
      "DIETICIAN",
      "NUTRITIONIST",
    ]);
    expect(specialtiesInGroup("Health")).toEqual([
      "CARDIOLOGIST",
      "DIABETOLOGIST_ENDOCRINOLOGIST",
      "NEUROLOGIST",
    ]);
  });

  it("guards specialty and mode inputs", () => {
    expect(isConsultationSpecialty("CARDIOLOGIST")).toBe(true);
    expect(isConsultationSpecialty("cardiologist")).toBe(false);
    expect(isConsultationSpecialty("CARDIOLOGIST ")).toBe(false);
    expect(isConsultationSpecialty("")).toBe(false);
    expect(isConsultationSpecialty(undefined)).toBe(false);
    expect(isConsultationMode("VIDEO")).toBe(true);
    expect(isConsultationMode("HOME_VISIT")).toBe(true);
    expect(isConsultationMode("IN_PERSON")).toBe(false);
    expect(CONSULTATION_MODES).toEqual(["VIDEO", "HOME_VISIT"]);
  });

  it("labels modes for humans", () => {
    expect(modeLabel("VIDEO").toLowerCase()).toContain("video");
    expect(modeLabel("HOME_VISIT").toLowerCase()).toContain("home");
  });

  it("keeps the diabetologist label as the user-approved wording", () => {
    expect(SPECIALTY_DETAILS.DIABETOLOGIST_ENDOCRINOLOGIST.label).toBe(
      "Diabetologist / Endocrinologist",
    );
  });
});
