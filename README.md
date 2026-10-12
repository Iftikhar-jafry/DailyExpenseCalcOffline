# Daily Expense Tracker

A responsive personal expense tracker built with HTML, CSS, vanilla JavaScript, and Supabase. It supports a monthly budget, daily expenses, monthly expenses, spending history, and automatic cloud synchronization across devices.

## Features

- Email/password sign-in and account creation through Supabase Auth.
- Automatic cloud loading and saving for the signed-in user.
- Row Level Security (RLS) so authenticated users can only access their own expense record.
- Daily expenses, monthly expenses, budget, remaining balance, daily allowance, and spending history.
- Works on desktop and mobile browsers.
- No JSON import/export buttons. Changes are saved automatically.

## 1. Configure Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run:

```sql
CREATE TABLE IF NOT EXISTS public.expense_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expense_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their own expenses"
ON public.expense_data;

CREATE POLICY "Users can access their own expenses"
ON public.expense_data
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

3. In Supabase **Project Settings → API Keys** (or the **Connect** dialog), copy the **Project URL** and **Publishable key**. Older projects may call the browser-safe key the `anon` key.
4. Edit `supabase-config.js` and replace `YOUR_PROJECT_URL` and `YOUR_PUBLISHABLE_KEY` with those two values.
5. Do **not** use a `service_role` or secret key in frontend files. The publishable key is intended for browser apps; RLS is what protects user data.
6. In **Authentication → URL Configuration**, add your deployed GitHub Pages address to the allowed Site URL / Redirect URLs. For this repository, the URL will normally be `https://<your-github-username>.github.io/DailyExpenseCalcOffline/`.
7. Ensure Email is enabled under **Authentication → Sign In / Providers**. If email confirmation is enabled, confirm the message sent to your inbox before signing in.

## 2. Publish with GitHub Pages

1. Open this repository on GitHub and go to **Settings → Pages**.
2. Under build and deployment, choose **Deploy from a branch**.
3. Choose the `main` branch and `/(root)`, then save.
4. Merge the cloud-sync changes into `main` after reviewing the pull request.
5. Visit `https://<your-github-username>.github.io/DailyExpenseCalcOffline/`.

GitHub Pages hosts the static frontend. Supabase provides authentication and database storage.

## 3. Use the tracker

1. Open the published site and create an account using your email and a strong password.
2. Confirm your email if prompted, then sign in.
3. Set your budget and add daily or monthly expenses. The tracker saves changes to Supabase automatically.
4. Sign in with the same account on your other device to see the same data.

## Privacy and limitations

- The website files themselves are publicly served by GitHub Pages. The expense data is protected by Supabase authentication and the RLS policy above.
- Anyone with repository write access can change the frontend. Keep repository access restricted if desired.
- Use only your Supabase Project URL and browser-safe publishable/anon key in `supabase-config.js`; never expose a service-role or secret key.
- This version starts with a fresh cloud record. It does not import any prior JSON expenses.
- If Supabase email confirmation is enabled, a newly created account must confirm its email before signing in.
