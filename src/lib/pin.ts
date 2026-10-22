import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { sendMessage, type SendResult } from "./messaging";
import { appUrl } from "./share";

export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
const LINK_VALID_DAYS = 30;

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

/**
 * Creates a fresh one-time setup link for a person and texts it to them.
 * Used for new staff, PIN resets and "Forgot PIN". Returns the link so an
 * admin can share it another way if the SMS doesn't arrive.
 */
export async function sendPinSetupLink(userId: string): Promise<{ link: string; result: SendResult }> {
  const token = randomBytes(24).toString("base64url");
  const user = await db.user.update({
    where: { id: userId },
    data: {
      setupToken: token,
      setupTokenExpires: new Date(Date.now() + LINK_VALID_DAYS * 86_400_000),
      setupSentAt: new Date(),
    },
  });
  const settings = await db.settings.findUnique({ where: { id: "app" } });
  const link = `${await appUrl()}/setup/${token}`;
  const company = settings?.companyName ?? "NASCO";
  const firstName = user.name.split(" ")[0];

  const body = user.pinHash
    ? `Hi ${firstName}, use this link to reset your ${company} Lunch PIN: ${link}`
    : `Hi ${firstName}, you've been added to ${company} Lunch. Set your PIN to start ordering: ${link}`;

  const result = user.phone
    ? await sendMessage("SMS", user.phone, body)
    : { status: "FAILED" as const, detail: "No phone number" };
  return { link, result };
}

/** Finds a person by a still-valid setup token. */
export async function findBySetupToken(token: string) {
  const user = await db.user.findUnique({ where: { setupToken: token } });
  if (!user || !user.active || !user.setupTokenExpires || user.setupTokenExpires < new Date()) return null;
  return user;
}
