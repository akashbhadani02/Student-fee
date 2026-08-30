# Student Fee Management - Branch Login Persistence

## Branch Login behaviour
- Main Admin can create/edit each branch Login ID and Password from **Branches & Access**.
- Clicking **Save Branch** sends the credentials to `PUT /api/branches`.
- The API stores the password as a secure scrypt hash in `BranchUser.passwordHash` and an encrypted copy in `BranchUser.passwordEncrypted`.
- Changing the Login ID or Password updates the existing `BranchUser` document in MongoDB.
- Leaving Password blank keeps the existing password.
- A missing login is created when the admin saves a username + password for that branch.
- Duplicate Login IDs are rejected with a clear error.
- After saving, the branch can immediately log in with the new credentials.

## Run
1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. Run `npm install`.
3. Run `npm start`.

Do not commit `.env` or expose `BRANCH_CREDENTIAL_KEY` in client-side code.
