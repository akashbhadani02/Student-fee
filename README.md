# Student Fee Management – Updated

This version keeps the existing MongoDB/branch architecture and adds a proper per-student fee collection workflow.

## Main improvements
- Per-student payment collection with date, amount, method and note.
- Automatic update of Paid Fee and Remaining Fee.
- Payment history inside each student's collection window.
- Printable fee receipt for the latest payment/student balance.
- Existing branch-based access control is preserved.
- Existing admin action-password and branch permissions are preserved.
- Existing Excel import/export remains compatible.
- MongoDB stores payment history with each student.
- Existing students and their paid-fee values remain backward compatible.

## Run
1. Install Node.js 18+.
2. Run `npm install`.
3. Create `.env` with `MONGODB_URI` and the required admin/secret values.
4. Run `npm start`.
5. Open the shown local URL.

The app still uses the existing `seed-data.json` only when the database has no student records.
