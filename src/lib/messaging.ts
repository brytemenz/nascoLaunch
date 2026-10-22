import "server-only";
import { normalisePhone } from "./format";

export type Channel = "WHATSAPP" | "SMS";
export type SendResult = { status: "SENT" | "FAILED" | "SIMULATED"; detail: string };

const SMS_LIMIT = 1500; // Twilio rejects bodies over 1600 chars

function twilioReady(channel: Channel) {
  const base = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
  if (!base) return false;
  return channel === "SMS" ? !!process.env.TWILIO_SMS_FROM : !!process.env.TWILIO_WHATSAPP_FROM;
}

function arkeselReady() {
  return !!process.env.ARKESEL_API_KEY;
}

/** Which provider will deliver this channel, or null when messages are only simulated. */
export function providerFor(channel: Channel): "Arkesel" | "Twilio" | null {
  if (channel === "SMS" && arkeselReady()) return "Arkesel";
  if (twilioReady(channel)) return "Twilio";
  return null;
}

/** Kept for existing callers: true when the channel really sends. */
export function twilioConfigured(channel: Channel) {
  return providerFor(channel) !== null;
}

/** Arkesel SMS (Ghana). Docs: https://developers.arkesel.com — SMS V2 "Send SMS". */
async function sendArkeselSms(phone: string, body: string): Promise<SendResult> {
  const sender = (process.env.ARKESEL_SENDER_ID || "Nasco Lunch").slice(0, 11);
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": process.env.ARKESEL_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender,
        message: body.length > SMS_LIMIT ? `${body.slice(0, SMS_LIMIT - 1)}…` : body,
        recipients: [phone.replace(/^\+/, "")], // Arkesel wants 233XXXXXXXXX
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
    if (!res.ok || data.status !== "success") {
      return { status: "FAILED", detail: `Arkesel: ${data.message ?? `HTTP ${res.status}`}` };
    }
    return { status: "SENT", detail: `Arkesel: ${data.message ?? "sent"}` };
  } catch (err) {
    return { status: "FAILED", detail: `Arkesel: ${err instanceof Error ? err.message : "network error"}` };
  }
}

/**
 * Sends a message through Twilio's REST API.
 * Without Twilio credentials it runs in simulation mode: nothing is sent,
 * the message is logged so the flow still works in development.
 */
export async function sendMessage(channel: Channel, to: string, body: string): Promise<SendResult> {
  const phone = normalisePhone(to);
  if (!phone) return { status: "FAILED", detail: "No phone number configured" };

  const provider = providerFor(channel);
  if (!provider) {
    console.log(`[messaging:simulated] ${channel} → ${phone}\n${body}\n`);
    return { status: "SIMULATED", detail: `No ${channel === "SMS" ? "SMS" : "WhatsApp"} provider set up — message logged only` };
  }
  if (provider === "Arkesel") return sendArkeselSms(phone, body);

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from =
    channel === "WHATSAPP"
      ? `whatsapp:${normalisePhone(process.env.TWILIO_WHATSAPP_FROM!)}`
      : normalisePhone(process.env.TWILIO_SMS_FROM!);

  const params = new URLSearchParams({
    From: from,
    To: channel === "WHATSAPP" ? `whatsapp:${phone}` : phone,
    Body: channel === "SMS" && body.length > SMS_LIMIT ? `${body.slice(0, SMS_LIMIT - 1)}…` : body,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { status: "FAILED", detail: data.message ?? `HTTP ${res.status}` };
    return { status: "SENT", detail: `Twilio SID ${data.sid}` };
  } catch (err) {
    return { status: "FAILED", detail: err instanceof Error ? err.message : "Network error" };
  }
}
