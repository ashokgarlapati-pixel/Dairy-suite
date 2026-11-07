# DairyReliability Suite — Production Deployment Guide

This guide covers production deployment for the **AI-Powered Smart Asset Reliability & Maintenance Suite** across Frontend (Vercel), Backend (Render), and Database (MongoDB Atlas).

---

## 1. Architecture Overview
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons → Deployed to **Vercel**
- **Backend:** Node.js (v18+), Express, Mongoose, Zod, JWT, Google Gemini AI SDK → Deployed to **Render** (Web Service)
- **Database:** MongoDB Atlas M0/Dedicated Cluster (13 Collections)

---

## 2. Database Setup (MongoDB Atlas)
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a Cluster (e.g. M0 Free Tier or Dedicated) in your region.
3. **Database Access:** Create a database user (e.g., `dairy_admin`) with read/write privileges.
4. **Network Access:** Add `0.0.0.0/0` (Allow access from anywhere) so that Render dynos can connect, or whitelist your specific cloud static IPs.
5. Get your connection string:
   ```text
   mongodb+srv://dairy_admin:<password>@cluster0.xxxxx.mongodb.net/dairy_reliability?retryWrites=true&w=majority
   ```

---

## 3. Backend Deployment (Render)
1. Push your repository to GitHub or GitLab.
2. Sign in to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
3. Connect your Git repository.
4. Configure service parameters:
   - **Name:** `dairy-reliability-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node server.js`)
5. Add the **Environment Variables** in Render's Environment tab:
   | Key | Value / Description |
   | --- | --- |
   | `PORT` | `5000` (or Render will bind to `$PORT`) |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your MongoDB Atlas connection URI string |
   | `JWT_SECRET` | Strong 64-character random string (e.g., `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `GEMINI_API_KEY` | Your Google Gemini API Key from Google AI Studio |
   | `CORS_ORIGIN` | Your production frontend URL (e.g., `https://dairy-reliability.vercel.app`) |

6. Deploy the web service. Note down your backend URL (e.g., `https://dairy-reliability-backend.onrender.com`).

---

## 4. Frontend Deployment (Vercel)
1. Sign in to [Vercel Dashboard](https://vercel.com/) and click **Add New... > Project**.
2. Import your Git repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add the **Environment Variable** in Vercel:
   | Key | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://dairy-reliability-backend.onrender.com/api/v1` |

   *(Ensure `VITE_API_BASE_URL` points to your Render backend API path without a trailing slash).*
5. Deploy. `vercel.json` already contains the SPA routing fallback to prevent 404s on browser reloads.

---

## 5. Pre-Seeded Demonstration Credentials
The backend automatically provisions default demo accounts with secure passwords if users collection is empty:
- **Maintenance Admin:** `admin@dairycoop.org` / `Admin@12345`
- **Technician:** `tech@dairycoop.org` / `Tech@12345`
- **Operations Manager:** `ops@dairycoop.org` / `Ops@12345`
- **Vendor Specialist:** `vendor@dairycoop.org` / `Vendor@12345`

---

## 6. Verification Checklist
- [x] **Module 01:** User Authentication with JWT rotation and role redirection
- [x] **Module 02:** Asset Registry with cold-chain dairy equipment cards & health indicators
- [x] **Module 03:** Asset Detail with sensor history, calibration timelines & work order trail
- [x] **Module 04:** Maintenance Calendar & Technician work-order execution queue
- [x] **Module 05:** Planning Board & Multi-stage Closure Verification (Draft → In Progress → Approved)
- [x] **Module 06:** Failure Risk & Remaining Useful Life (RUL) with sensor violation metrics
- [x] **Module 07:** AI Recommendations with Human-In-The-Loop (HITL) supervisor approval
- [x] **Module 08:** MLOps & Model Drift Dashboard with ground truth feedback tracking
- [x] **Module 09:** Visual Reports & Analytics Hub with MTBF/MTTR metrics, CSV/PDF export
- [x] **Module 10:** Real-time Notifications Center with severity filtering
- [x] **Module 11:** User & Role Administration with scope isolation
- [x] **Module 12:** Append-only Immutable Audit Logs & Master System Settings

