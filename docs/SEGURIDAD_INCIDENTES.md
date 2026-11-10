# Security incident log

> Never write passwords, keys or tokens in this file. Only what happened, where, and the status.

## INC-001 — Postgres passwords exposed in a public repository

- **Detected**: 2026-09-16
- **Severity**: 🔴 Critical (the repo `SMurciaSanchez/open-pay-mvp` was public on GitHub)
- **Status**: ✅ Closed — 2026-09-16 (projects taken offline, repo made private, new project and new repo)

### Affected credentials

| # | Supabase project | Credential | Where it was | Commits in history | Removed from code | Rotated |
|---|---|---|---|---|---|---|
| 1 | `bmfiotbutuslsaxeumik` | Postgres password (user `postgres.bmfiotbutuslsaxeumik`, pooler `aws-1-us-east-2`) | `packages/web/test-p1.mjs`, `packages/web/test-p2.mjs` | `c502e5e`, `6c1ffff` | ✅ `6f4505e` | ⬜ |
| 2 | `garzwhnenhtmpfvfntmk` | Postgres password (user `postgres`, host `db.garzwhnenhtmpfvfntmk.supabase.co`) | `packages/web/VERCEL_DEPLOYMENT.md` (line 67) | see `git log -S garzwhnenhtmpfvfntmk` | ✅ `6f4505e` | ⬜ |

### Steps

The incident was closed by taking both projects offline and starting over with a
new Supabase project and a new repository with clean history, instead of
rotating in place. The original checklist is kept for the record:

- [ ] Rotate password 1: Supabase → project `bmfiotbutuslsaxeumik` → Project Settings → Database → Reset database password.
- [ ] Rotate password 2: same, in project `garzwhnenhtmpfvfntmk`.
- [ ] Store the new passwords **only** in a password manager (Bitwarden, 1Password) and in local `.env` files (git-ignored).
- [ ] Update the `DATABASE_URL` / `DB_URL` variable in Vercel if either project uses it.
- [ ] Review Supabase logs (Logs → Postgres) for unknown connections since the date of the first commit.
- [x] Make the repository private.
- [ ] (Optional) Clean the history with `git filter-repo` and force-push. It does not replace rotation: clones and forks may already have the keys.
- [ ] Mark this incident as ✅ Closed.

### Lessons

- Never write credentials in scripts or documentation; use environment variables and an `.env.example` with empty values.
- The root `.gitignore` was encoded in UTF-16 and git was not reading it: check the encoding of configuration files.
- Pending: add secret scanning (e.g. `gitleaks` as a pre-commit hook, or GitHub secret scanning).

## INC-002 — A user's email and password in test scripts

- **Detected**: 2026-09-16
- **Severity**: 🟢 Low (confirmed: it was a test password, not reused; public since 2025-04-20)
- **Status**: ✅ Closed — 2026-09-16

### What happened

`packages/web/test-supabase.js` and `packages/web/test-supabase-queries.js` (commit `fdf3667`, first commit of `open-pay-mvp`) contained a founder's email together with a test password, used to sign in from the script. They also contained the `anon` key of project `garzwhnenhtmpfvfntmk` (public by design; it was replaced in the documentation anyway).

### Steps

- [x] Files excluded from the new `open-pay` repository; `anon` key replaced by `<TU_ANON_KEY>` in `INSTRUCCIONES_VERCEL.md` and `VERCEL_DEPLOYMENT.md`.
- [x] Confirmed by the account holder: the password was a test password and is not used on other services.
- [x] Make `open-pay-mvp` private.

### Lessons

- Test scripts sign in with test users created for that purpose, never with personal accounts, and read credentials from the environment.
- Before publishing a repository, scan the whole tree (not only the `.env` files).
