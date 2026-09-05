# Spoken English Course Manager — New Project

This is a fresh packaged copy of the project with the existing UI/backend structure
and the existing student seed data preserved.

- Existing student records preserved: 99 students
- Existing fee/payment/history seed data preserved
- MongoDB backend included
- Admin + branch-user access included
- 25% commission logic remains part of the application
- `.env` is intentionally NOT included; use `.env.example`
- For Vercel, add the environment variables in Project Settings

## Local setup

1. Install Node.js.
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Put your MongoDB connection string in `MONGODB_URI`
5. Run `npm start`
6. Open the local URL shown by the server.

## Important

Do not commit `.env` to GitHub. Use Vercel Environment Variables for deployment.
The seed data is kept so the 99 existing students can be restored when the target
MongoDB database is empty.


## Redesigned UI
A new professional responsive dashboard groups all 99 seed students by Velanja, Mota Varachha and Mission Road while keeping the MongoDB backend and seed data.
