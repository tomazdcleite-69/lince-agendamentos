import type { AssessmentModality } from "@/types";

export function normalizeAssessmentModality(
  value: string | string[] | undefined,
): AssessmentModality {
  const parsed = Array.isArray(value) ? value[0] : value;

  return parsed === "online" ? "online" : "presencial";
}

export function getAssessmentModalityLabel(value: AssessmentModality) {
  return value === "online" ? "Avaliação Online" : "Avaliação Presencial";
}
