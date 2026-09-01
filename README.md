# Gamia23 — Player Rewards

A loyalty-reward web app for longtime players. Players **sign up**, an admin is
**notified**, the admin checks their points in the game backend and **enters a
coin total** in a protected admin panel, and the player sees their **balance
converted to dollars** at `1000 coins = $1`.

**The app never collects card, bank, or crypto details.** It only shows a
balance you (the admin) set. That's what keeps it a legitimate rewards page and
not a payment-collection flow.

Built with Next.js 14 (App Router), Prisma + Postgres, and Resend for email.
Designed to deploy on Vercel.

---

## What's inside

| Page | Path | Who |
|------|------|-----|
| Landing page (Log in / Account balance / Sign up on top) | `/` | Everyone |
| Sign up | `/signup` | Players |
| Log in | `/login` | Players |
| Balance dashboard | `/dashboard` | Logged-in players |
| Admin sign in | `/admin/login` | You |
| Admin panel (set each player's coins) | `/admin` | You |

---

## Deploy to Vercel (step by step)

### 1. Get a Postgres database (free)
Easiest option is **Vercel Postgres** (or **Neon**, https://neon.tech — free tier).
Create a database and copy its connection string. It looks like:
```
postgresql://user:password@host/dbname?sslmode=require
```

### 2. Push the project to GitHub
Create a new GitHub repo and push these files to it.

### 3. Import into Vercel
- Go to https://vercel.com → **Add New… → Project** → import your repo.
- Framework preset: **Next.js** (auto-detected).
- Before deploying, add the **Environment Variables** below.

### 4. Environment variables
In Vercel → your project → **Settings → Environment Variables**, add:

| Name | Required | Value |
|------|----------|-------|
| `DATABASE_URL` | ✅ | your Postgres connection string |
| `SESSION_SECRET` | ✅ | a long random string — run `openssl rand -base64 32` |
| `ADMIN_EMAIL` | ✅ | the email you'll use to log into `/admin` |
| `ADMIN_PASSWORD` | ✅ | a strong password for the admin panel |
| `COINS_PER_DOLLAR` | optional | defaults to `1000` |
| `RESEND_API_KEY` | optional | from https://resend.com — enables signup emails |
| `NOTIFY_EMAIL` | optional | **the email that gets signup alerts — fill this in here** |
| `EMAIL_FROM` | optional | e.g. `Gamia23 <onboarding@resend.dev>` |

> If you skip `RESEND_API_KEY` / `NOTIFY_EMAIL`, the app still works — signups
> are logged to the Vercel function logs instead of emailed. You can add email
> anytime later.

### 5. Create the database tables
After the first deploy, run this once from your own machine (with `DATABASE_URL`
set to the same Postgres string) to create the tables:
```bash
npm install
npx prisma db push
```
(You can also run `npx prisma db push` locally against the production database,
or add it as a one-off command — the schema is in `prisma/schema.prisma`.)

### 6. Done
- Players use the site at your Vercel URL.
- You manage coins at `https://your-app.vercel.app/admin`.

---

## Run it locally
```bash
npm install
cp .env.example .env      # then fill in the values
npx prisma db push        # create tables
npm run dev               # http://localhost:3000
```

---

## Day-to-day: how you award coins
1. A player signs up → you get an email (or see it in the logs).
2. Look up their points in your game backend.
3. Go to `/admin`, find the player, type their coin total, click **Save**.
4. The player logs in and sees their balance and its dollar value.

Paying the reward out (gift card, transfer, credit, etc.) happens however you
already handle it — this app is the record and the display, and deliberately
does not touch anyone's payment information.

---

## Changing the conversion rate
Set `COINS_PER_DOLLAR` (e.g. `500` for 500 coins = $1). No code changes needed.
