import type { ServiceCompany } from "@/types";

export const SERVICE_COMPANY_LABELS: Record<ServiceCompany, string> = {
  lince: "Lince",
  psicoespaco: "Psicoespaço",
};

export const SERVICE_COMPANY_PORTAL_NAMES: Record<ServiceCompany, string> = {
  lince: "Lince Humanização",
  psicoespaco: "Psicoespaço",
};

export function normalizeServiceCompany(value: unknown): ServiceCompany {
  const parsed = Array.isArray(value) ? value[0] : value;

  return parsed === "psicoespaco" ? "psicoespaco" : "lince";
}

export function getServiceCompanyLabel(value: string | null | undefined) {
  if (value === "psicoespaco") {
    return SERVICE_COMPANY_LABELS.psicoespaco;
  }

  if (value === "espaco_lince") {
    return "Espaço Lince";
  }

  return SERVICE_COMPANY_LABELS.lince;
}

export function getServiceCompanyPortalName(value: ServiceCompany) {
  return SERVICE_COMPANY_PORTAL_NAMES[value];
}

export function getServiceCompanyLogo(value: ServiceCompany) {
  return value === "psicoespaco"
    ? "/psicoespaco-logo.png"
    : "/lince-logo.png";
}
