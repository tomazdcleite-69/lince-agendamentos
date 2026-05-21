import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  resendClient ??= new Resend(apiKey);

  return resendClient;
}

export function getEmailConfig() {
  const linceNotificationEmails = (process.env.LINCE_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return {
    from: process.env.EMAIL_FROM,
    linceNotificationEmails,
  };
}
