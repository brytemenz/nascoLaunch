# NASCO Lunch

Office lunch ordering. Employees pick their meal before a cut-off; when ordering closes, the combined order is sent to the restaurant on WhatsApp and SMS.

Built with Next.js 15 (App Router), Tailwind CSS 4, Prisma and Twilio.

## Getting started

```bash
npm install
cp .env.example .env      # then set AUTH_SECRET to a long random string
npm run setup             # creates the database and adds sample data
npm run dev
```

Open http://localhost:3000.

- **Employees** don't sign in. They pick a dish and enter their name and phone number. The device remembers them after the first order.
- **Admins** sign in at `/login` (default: `admin@nasco.com` / `admin1234` — change it under Admin → People).

## How it works

1. **Admin opens a round** (Admin → Today) with a cut-off time.
2. **Employees order** from that day's menu. Rules:
   - one order per person (phone number) per day
   - you can order **for someone else** using their name and phone; it counts as their order for the day
   - you can change or cancel your own order, and cancel orders you placed for others, until the cut-off
3. **At the cut-off** the round closes and the combined order is sent to the restaurant by SMS, with a summary, each person's order and notes.
4. The admin can also **Close & send now**, add 15 minutes, **re-send**, or tap **Send on WhatsApp** to send the same message from their own WhatsApp.

### Weekly menu

Each dish is tagged with the weekdays it's served (Admin → Menu). Untagged dishes are served every day. The default menu (`prisma/menu-data.ts`) serves 12 dishes Monday, Tuesday, Thursday and Friday, and kenkey on Wednesday. Prices are hidden by default; turn them on in Admin → Settings.

Food photos live in `public/menu/` (from Wikimedia Commons, CC BY-SA 4.0 — see `public/menu/CREDITS.md`). Any dish can use a different photo link.

### Automatic closing

A round closes by itself the next time anyone opens the app after the cut-off. To close it exactly on time even when nobody is using the app, call the cron endpoint every few minutes:

```
GET /api/cron/close-rounds
Authorization: Bearer <CRON_SECRET>
```

On Vercel, add a Cron Job for that path. Elsewhere, use any scheduler (cron-job.org, GitHub Actions, crontab with curl).

## SMS and WhatsApp

**SMS goes through [Arkesel](https://sms.arkesel.com).** Set in `.env`:

```bash
ARKESEL_API_KEY="your key"        # sms.arkesel.com → SMS API
ARKESEL_SENDER_ID="Nasco Lunch"   # max 11 characters; Arkesel must approve it
```

**WhatsApp** has no API connected by default. Use the **Send on WhatsApp** button on a round, or add Twilio WhatsApp keys (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`) to send it automatically.

Without any provider, messages are simulated and printed in the server log. Every attempt is logged on the round's page.

Set the restaurant's numbers in Admin → Settings and use the **Send test** buttons. Local numbers like `0249297167` become `+233249297167` automatically.

## Database

Postgres on [Neon](https://neon.tech). Set both URLs in `.env`:

```bash
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require"   # pooled, used by the app
DIRECT_URL="postgresql://…/neondb?sslmode=require"             # direct, used for schema changes
```

After changing `prisma/schema.prisma`, run `npm run db:push` and restart `npm run dev`.

## Sharing the menu

While a round is open, **Admin → Today → Share menu** gives you the day's menu with an order link: share it on WhatsApp, copy it, or text it to every staff member with a phone number. Set `APP_URL` in `.env` to the app's public address so the link works for everyone.

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Production build                     |
| `npm run setup`     | Create database tables and seed data |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Project layout

```
src/
  actions/        server actions (auth, orders, admin)
  app/(auth)/     login and sign-up
  app/(app)/      employee pages (order, my orders) and /admin
  components/     UI components
  lib/            database, auth, messaging, round logic
prisma/           schema and seed data
```

Settings: `NEXT_PUBLIC_APP_TIMEZONE` (default `Africa/Accra`) controls how dates and times are shown.
