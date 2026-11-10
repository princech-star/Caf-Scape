# CaféScape — GitHub starter

A responsive React café discovery and café-management portal starter.

## Run locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env`.
3. Keep `VITE_DEMO_MODE=true` for the sample experience, or configure Supabase.
4. Run:

```bash
npm install
npm run dev
```

## Publish on GitHub

1. Create a new GitHub repository.
2. Upload the contents of this folder (not the ZIP file itself).
3. In the repository, open **Settings → Pages** only if you configure a static build workflow, or connect the repo to Vercel/Netlify for easiest deployment.
4. Add your Supabase URL and anon key as deployment environment variables. Never put a Supabase service-role key in frontend code.

## Demo walkthrough

- Discover a sample café and open its customer page.
- Save cafés.
- Sign in with demo email `demo@example.com` and OTP `123456`.
- Open **Café portal**, change a café profile, crowd estimate, vacant seats and menu.
- Open **Admin review** to see the sample manager-invite workflow.
- The café page uses the same in-memory demo data, so changes appear immediately during the session.

All sample names, ratings, menus, crowd values, reviews, bookings and admin actions are illustrative. Demo mode does not create real accounts, store data, send email, upload photos, reserve seats or process payments.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
4. Set `VITE_DEMO_MODE=false`.
5. Configure Supabase Auth email OTP templates and redirect URLs.
6. Create the private `cafe-media` Storage bucket and write/test Storage RLS policies.
7. Implement trusted Supabase Edge Functions for manager invitations, admin role assignment, ownership claim review, booking availability/price validation, payment order creation and payment webhooks.

## Important production work still required

This is a starter/demo, not a production booking or payment platform. The visible demo is interactive, but the complete backend workflows still need to be implemented and tested:

- **Roles:** assign `admin` and `cafe_manager` only from trusted server-side code. Never accept a role from a browser form.
- **Manager credentials:** use Supabase Admin invite/password-reset flows from an Edge Function. Do not email permanent passwords or store readable passwords. A show/hide control is appropriate only for a password the user is entering.
- **Permissions:** refine the sample RLS policies for owner, manager and staff-level permissions. The sample helper permits accepted location invitations to manage a location; production should enforce invitation permission values explicitly.
- **Bookings:** implement atomic time-slot availability checks to prevent double booking, expiry/hold logic, cancellation/refunds and timezone handling.
- **Payments:** integrate a supported payment provider for India (for example, Razorpay) using server-created orders and verified webhooks. Direct settlement to each café requires provider-supported connected-account/marketplace onboarding and compliance; it is not achieved by a browser redirect.
- **Photos:** implement authenticated Storage upload, file size/type checks, consent/ownership declarations, moderation and deletion.
- **Notifications:** add push/email notification preferences and a trusted notification delivery service.
- **Reviews/VibeScore:** keep customer reviews and score calculation separate from café-managed content; do not allow café accounts to edit or delete reviews.
- **Audit/moderation:** add immutable or append-only audit events and admin workflows for disputes and content reports.

## Security

The browser uses only the Supabase anon key. Never expose `service_role`, payment secret keys, email provider secrets or webhook secrets in Vite variables prefixed with `VITE_`. Review SQL policies and test access using separate customer, manager and admin accounts before launch.
