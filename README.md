# Muscle Arena – Gym Website & Membership Management System

Full-stack gym website and membership/UPI payment verification platform built for **Muscle Arena** (Near Gopalmath Water Tank, Durgapur, West Bengal, 713217).

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, jsPDF
- **Backend**: Node.js, Express (`server/app.ts` + `server.ts`), Helmet, CORS, Express Rate Limit, Multer, QRCode, bcryptjs, JWT
- **Database**: SQLite (`better-sqlite3`, stored in `data/buildbody.db` locally/Cloud Run or `/tmp/muscle-arena-data/buildbody.db` in serverless functions)

## Quick Start (Local Development)

1. Copy `.env.example` to `.env` and set strong secrets:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (Express API + Vite frontend on port `3000`):
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Deploy to Netlify

This project includes `netlify.toml`, `public/_redirects`, and `netlify/functions/api.ts`:

1. **Build Settings** (auto-detected from `netlify.toml`):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
2. **Environment Variables** (set in Netlify Site Settings -> Environment variables):
   - `JWT_SECRET`: Strong random 64+ character string for admin authentication.
   - `ADMIN_DEFAULT_PASSWORD` / `ADMIN_STAFF_PASSWORD` (optional): Override initial seeded admin passwords.
3. **Database Persistence Note**:
   - Out of the box on Netlify, `/api/*` runs via Netlify Functions (`netlify/functions/api.ts`) using `/tmp` SQLite storage, which is ephemeral across serverless cold starts.
   - For permanent member/payment storage across restarts, either host the Node backend (`npm start`) on a persistent server (e.g., Cloud Run / Render / Railway with a persistent volume) and set `VITE_API_BASE_URL` in Netlify to that backend URL, or deploy the full container with `npm run build && npm start`.

## Production Build & Deploy (Node / Cloud Run)

```bash
npm run build
NODE_ENV=production node server.ts
```

## Admin Portal (`/admin`)

### Default First-Run Credentials
- **Owner Login**: username `owner` (or `owner@buildbody-demo.com`) · initial password from `ADMIN_DEFAULT_PASSWORD` (default `BuildBody@2026`).
  - On first sign-in, the Owner is **forced to change the password** before accessing the dashboard.
- **Staff Login** (limited role: view members, approve/reject payments, update enquiries): username `staff` · initial password from `ADMIN_STAFF_PASSWORD` (default `Staff@2026`).

### Changing Admin Password Later
1. Sign in at `/admin` as Owner.
2. Create additional Staff or Owner accounts under **Staff Roles**, or change `ADMIN_DEFAULT_PASSWORD` before first database initialization.
