# RideLedger (Share Ride MVP)

## Local dev

1. Create a Supabase project.
2. In Supabase SQL editor, run:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
3. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run:

```bash
npm install
npm run dev
```

## How credits vs debit works

- Each ride creates a **charge** (`rides.amount`).
- Each payment creates a **credit** (`payments.amount`).
- Balance is computed as: `sum(payments) - sum(rides)`.
  - Positive = partner has credits (paid in advance)
  - Negative = partner is in debit (owes money)
