# Rooted Estimates MVP

This project is a lightweight Next.js MVP for a service business that wants to:

- show estimate availability on a public website
- collect customer information up front
- turn estimate requests into quotes
- convert approved quotes into jobs
- generate invoices from job data
- track payments and simple tax-season reporting

## Current state

The current app now has:

- public estimate request page
- local browser storage for persistence during prototyping
- internal dashboard for leads, quotes, jobs, invoices, and payments
- Supabase-backed admin authentication for the dashboard
- CSV exports for customers, invoices, and payments
- free-tier-friendly architecture for later migration to Supabase and Vercel

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

## Important note

This version still uses `localStorage` for business data, which is good for prototyping but not for production. The current secure setup is:

1. Supabase for dashboard sign-in
2. local browser storage for app records while prototyping

The next upgrades should be:

1. move business data into Supabase
2. send real email confirmations and reminders
3. deploy to Vercel and connect the domain
4. move uploads into cloud storage
5. add richer reporting and backups
