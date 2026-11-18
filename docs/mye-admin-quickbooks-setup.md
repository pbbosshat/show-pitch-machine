# MYE Admin — connecting QuickBooks Online

This is a one-time setup so MYE Admin can send tagged Amex charges to QuickBooks
Online. Until it's done, MYE Admin still works (uploading statements, tagging);
the QuickBooks page just says **"QuickBooks isn't configured yet."**

Do it in **sandbox (a test company) first**, check a few charges land correctly,
then switch to production.

## What MYE Admin does and doesn't do in QuickBooks

- **Reads** the chart of accounts and the Class list (active ones only).
- **Creates** one credit-card expense per tagged charge, against the
  **2200 MCS Show AMEX** account (changeable on the QuickBooks page). Refunds and
  credits are created as **Credit Card Credits**. A receipt, if attached, is
  added to the transaction as an attachment.
- **Never edits or deletes** anything in QuickBooks. If a charge went in wrong,
  fix it in QuickBooks by hand.
- A charge is only ever sent once. Each one is marked with its QuickBooks
  transaction number, and the internal note on the QuickBooks transaction
  reads "… — MYE Admin charge #123" so you can trace it back.

## Step 1 — create the Intuit developer app

1. Go to <https://developer.intuit.com> and sign in with the Intuit login that
   has **admin rights on the MCS QuickBooks company** (or create a developer
   account with that email).
2. Go to **Dashboard → Create an app**, choose **QuickBooks Online and
   Payments**, name it **MYE Admin**.
3. When asked for scopes, tick **Accounting** only
   (`com.intuit.quickbooks.accounting`).
4. Intuit creates a sandbox test company for you automatically
   (**Dashboard → Sandbox**). That's what we test against first.

## Step 2 — add the Redirect URIs

In the app, open **Keys & credentials** (or **Settings → Redirect URIs**) and add,
exactly as written:

| Where | Redirect URI |
| --- | --- |
| Live site | `https://www.myentertainment.tv/api/fin/qbo/callback` |
| A developer's computer (sandbox only) | `http://localhost:3000/api/fin/qbo/callback` |

Intuit only accepts `localhost` URIs for development keys. The address must match
**character for character**, including `https`, the `www.` and no trailing slash.
Use `www.myentertainment.tv`: the bare `myentertainment.tv` redirects to `www`,
and Intuit won't follow a redirect.

## Step 3 — copy the keys

Still in **Keys & credentials**, there are two sets of keys:

- **Development** keys work only with the sandbox company.
- **Production** keys work with the real company. Intuit makes you fill in an
  app profile/questionnaire (privacy policy URL, end-user licence URL, etc.)
  before it shows them. For an internal-only app you can point both at the
  company website.

Copy the **Client ID** and **Client Secret** for the set you're using.

## Step 4 — set the variables on Railway

Railway → the show-pitch-machine service → **Variables** → add:

| Variable | Sandbox value | Production value |
| --- | --- | --- |
| `QBO_CLIENT_ID` | Development Client ID | Production Client ID |
| `QBO_CLIENT_SECRET` | Development Client Secret | Production Client Secret |
| `QBO_REDIRECT_URI` | `https://www.myentertainment.tv/api/fin/qbo/callback` | same |
| `QBO_ENVIRONMENT` | `sandbox` | `production` |

`QBO_ENVIRONMENT` defaults to `sandbox` if left out. Railway redeploys after
saving the variables.

Never set `QBO_API_BASE` or `QBO_OAUTH_BASE` on Railway. They exist only so
developers can test against a fake QuickBooks on their own computer, and the app
ignores them on the live site anyway.

## Step 5 — connect

1. Sign in to MYE Admin as an admin → **QuickBooks**.
2. Check that **Environment** shows the one you expect.
3. Click **Connect to QuickBooks**, sign in to Intuit, pick the company, and
   approve.
4. You come back to the QuickBooks page showing **Connected**. The account and
   Class lists load automatically. Check that **Card account** shows
   *2200 MCS Show AMEX*. If it doesn't, pick the Amex account from the list. Only
   accounts of type **Credit Card** can be chosen as the card account.

## Step 6 — test in sandbox, then go live

1. In the sandbox company, make sure there's an account called
   **2200 MCS Show AMEX** (type Credit Card), a few expense accounts, and the
   **ADMIN** Class plus a show Class. Click **Refresh lists** after adding them.
2. Upload a small statement, tag two charges (one normal, one credit), and click
   **Sync to QuickBooks** on the statement page.
3. In the sandbox company, check **Expenses**: one Credit Card Expense and one
   Credit Card Credit with the right account, Class, memo, date, amount and receipt.
4. To go live: on the QuickBooks page click **Disconnect**, change the four Railway
   variables to the production values, wait for the redeploy, then **Connect**
   again and choose the real company.
   - MYE Admin notices it is a **different company** from the sandbox. Every
     Account, Class and the card account picked from the sandbox only exist in
     the sandbox, so it automatically:
     - reloads the account and Class lists from the real company,
     - sets the card account back to the default (*2200 MCS Show AMEX*) — check it,
     - clears the Account and Class on every charge **not yet sent** to
       QuickBooks and puts it back to "new". Memos and receipts are kept. Those
       charges must be tagged again from the real company's lists.
   - The QuickBooks page says how many charges were cleared (shown once, right
     after connecting).
   - Charges already sent to the sandbox stay marked as synced and will **not**
     be sent to the real company. Test with a month you don't need in the real
     books, or ask a developer to reset those test charges first.
   - As a backstop, syncing refuses any charge whose Account or Class isn't in
     the current lists.

## Day to day

- **Refresh lists** after adding accounts or Classes in QuickBooks.
- Intuit makes you reconnect about every 100 days. The QuickBooks page shows the
  date as **Reconnect needed by**. If the connection lapses, syncing says so;
  click **Connect** again. Nothing is lost.
- The **Recent sync log** on the QuickBooks page lists every attempt. A failed
  charge stays "tagged". Fix what the message says (for example, a Class that
  was made inactive) and sync again.
- "Outcome unknown" means QuickBooks didn't answer in time. Syncing again is
  safe: each charge carries a request ID, and QuickBooks won't create the same
  charge twice for the same ID. If the charge was **re-tagged** in between, MYE
  Admin first looks in QuickBooks for the earlier attempt (by the
  "MYE Admin charge #…" note). If it is there, it is recorded as synced and
  nothing new is posted. The log then says QuickBooks has the **original** tags,
  so accounting must correct the Account/Class/Memo in QuickBooks by hand.
- "In QuickBooks, not saved here" means QuickBooks accepted the charge but MYE
  Admin couldn't save that. Don't enter it by hand. Sync again and it records
  the existing QuickBooks transaction.

## For developers

- Code: `lib/fin/qbo/*`, routes `app/api/fin/qbo/*`, page `app/admin/quickbooks`.
- The OAuth `state` is bound to the admin's session (HMAC with the client secret)
  and a short-lived httpOnly cookie. The callback rejects anything else.
- Refresh tokens rotate. The new one is saved in the same row-locked
  transaction as the new access token.
- Idempotency: each charge row is locked (`FOR UPDATE SKIP LOCKED`) while it posts,
  and Intuit's `requestid` = `mye-chg-<chargeId>-<payloadHash>-a<n>` is sent, where
  `payloadHash` is a short sha256 of the exact Purchase JSON and `n` counts definite
  QuickBooks rejections already logged for that charge. A changed payload after an
  outcome-unknown attempt triggers a read-only Purchase lookup by PrivateNote
  before posting. See the header comment in `lib/fin/qbo/sync.ts`.
- Company switch: `fin_qbo_connection.last_realm_id` survives Disconnect; a
  callback with a different realm clears the list cache, the card account and
  the Account/Class of unsynced charges (`saveNewConnection` in
  `lib/fin/qbo/connection.ts`).
- Local testing against a mock: set `QBO_API_BASE` / `QBO_OAUTH_BASE` to the mock's
  `http://127.0.0.1:<port>`. Both are ignored when `NODE_ENV=production`.
