# ReviewGuard Setup Guide

To run ReviewGuard locally or deploy it to production, you need to configure several environment variables. Copy `.env.example` to `.env.local` and fill in the values according to this guide.

## Environment Variables

### `DATABASE_URL`
- **Description:** The connection string for your PostgreSQL database. ReviewGuard uses Drizzle ORM to manage data.
- **How to get it:**
  1. Go to [Supabase](https://supabase.com/).
  2. Create a new project.
  3. Go to Project Settings -> Database.
  4. Under Connection string, select URI and copy it. Make sure to replace `[YOUR-PASSWORD]` with your actual database password.
- **Example:** `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

### `RESEND_API_KEY`
- **Description:** The API key for Resend, used to send email alerts to business owners.
- **How to get it:**
  1. Go to [Resend](https://resend.com/).
  2. Create an account and add your domain if necessary (for testing, you can use the default testing domain).
  3. Go to API Keys and click "Create API Key".
  4. Copy the generated key.
- **Example:** `re_123456789`

### `GEMINI_API_KEY`
- **Description:** The Google Gemini API key used by the ReviewGuard AI to parse reviews and generate reply drafts.
- **How to get it:**
  1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
  2. Click "Create API Key".
  3. Copy the generated key.
- **Example:** `AIzaSyB...`

### `WEBHOOK_SECRET`
- **Description:** A custom string used to verify incoming webhook requests (from Zapier/Make or your email parsing service).
- **How to get it:** You can invent any secure random string. It just needs to match the secret configured in your webhook sender to ensure the requests are authorized.
- **Example:** `my_super_secret_webhook_token_2024`

## Starting the App

Once your `.env.local` is fully configured, you can push the schema and start the app:

```bash
npm run db:push
npm run dev
```
