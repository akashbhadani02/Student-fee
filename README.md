# Student Fee Management — Vercel Ready

## Vercel deployment
1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Framework Preset: **Other** (or leave auto-detected).
4. Build Command: **None** / leave empty.
5. Output Directory: **None** / leave empty.
6. Add these Environment Variables in Vercel for **Production, Preview and Development**:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `BRANCH_AUTH_SECRET` = a long random secret
   - `BRANCH_CREDENTIAL_KEY` = a different long random secret
   - `ADMIN_PASSWORD` = your main admin password (default is `1316618` only if omitted)
   - `PASSWORD_SETTINGS_MASTER` = master password for changing action passwords (default `Deoxy` only if omitted)
7. Redeploy after saving environment variables.
8. Open `/api/health` and confirm `{ "ok": true, "mongodb": true }`.

## Branch login
The login screen loads active branches from `/api/public-branches`. Passwords are never exposed by that endpoint.

On a fresh database these branch accounts are created automatically:
- Velanja — username `velanj_admin`, password `VELANJ@2026`
- Mota Varachha — username `motava_admin`, password `MOTAVA@2026`
- Mission Road — username `mission_admin`, password `MISSION@2026`

The Main Admin can change branch usernames/passwords from **Branches & Access**.

## Data and permissions
- Main Admin can manage branches, branch logins and permissions.
- Branch users see only their own students and collection history.
- Adding a student from a branch automatically assigns that branch.
- New branch student IDs are collision-resistant; existing IDs belonging to another branch cannot be overwritten.
- Collection entries are stored with `branchId` and are isolated by branch login.
- Existing legacy student and collection data are automatically mapped to real branches.
- Empty databases are restored from `seed-data.json`.
- API responses are configured with no-cache headers to avoid stale Vercel/browser data.

## Important
Do not commit a real `.env` file or MongoDB credentials to GitHub. Use Vercel Environment Variables instead.
