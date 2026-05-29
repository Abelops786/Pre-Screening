# TalentScreen — Developer Handoff Document

---

## 1. PROJECT OVERVIEW

TalentScreen is a containerized recruitment automation platform that eliminates manual recruiter screening. Candidates apply via a public URL, pass automated system checks, record a voice sample analyzed by OpenAI Whisper, and are auto-qualified or rejected. Recruiters manage everything through a role-based admin dashboard.

**Stage 1 is fully coded and deployed on Railway.app.**
**Stage 2 (Microsoft Teams scheduling) is pre-architected — DB tables and API stubs exist, just needs MS API keys.**

---

## 2. GIT REPOSITORIES

| Repo | URL | Purpose |
|------|-----|---------|
| Primary | https://github.com/Asherssajjad/Pre-screening | Main source of truth |
| Mirror | https://github.com/Abelops786/Pre-Screening | Railway deployment watches this |

**Branch:** `main`
**Railway is connected to:** `Abelops786/Pre-Screening` — every push to `main` on this repo triggers an auto-deploy.

**Clone:**
```bash
git clone https://github.com/Abelops786/Pre-Screening.git
cd Pre-Screening
```

---

## 3. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Frontend | Next.js 14 (App Router) |
| Database | PostgreSQL (via Prisma ORM) |
| AI | OpenAI Whisper API |
| Storage | Local (dev) / Cloudinary or S3 (prod) |
| Email | Nodemailer + custom SMTP |
| Deployment | Railway.app + Docker |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| RBAC | Custom middleware (SUPER_ADMIN / ADMIN / RECRUITER) |

---

## 4. PROJECT STRUCTURE

```
Pre-Screening/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express entry point
│   │   ├── routes/                 # All API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── candidate.routes.js
│   │   │   ├── upload.routes.js
│   │   │   ├── audio.routes.js
│   │   │   ├── admin.routes.js
│   │   │   └── stage2.routes.js    # Stage 2 stubs (not active)
│   │   ├── controllers/            # Business logic
│   │   ├── middleware/             # Auth, RBAC, upload, error handler
│   │   ├── services/               # Whisper, storage, email, filter
│   │   ├── config/                 # DB (Prisma), storage config
│   │   └── utils/                  # Logger, response helper, seed
│   ├── prisma/
│   │   ├── schema.prisma           # Full DB schema (Stage 1 + Stage 2 pre-built)
│   │   └── migrations/             # DB migration files
│   ├── Dockerfile
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx            # Redirects to /apply or /admin
    │   │   ├── login/page.tsx      # Admin login
    │   │   ├── apply/page.tsx      # Candidate application form
    │   │   ├── apply/system-check/ # Speed test + mic check
    │   │   ├── apply/audio/        # Voice recording page
    │   │   ├── apply/complete/     # Completion page
    │   │   └── admin/              # Dashboard (protected)
    │   │       ├── page.tsx        # Overview + KPIs
    │   │       ├── candidates/     # Candidate table + profile drawer
    │   │       └── users/          # User management (SUPER_ADMIN only)
    │   ├── lib/
    │   │   ├── api.ts              # Axios instance with JWT interceptor
    │   │   └── auth.ts             # Token storage helpers
    │   └── hooks/useAuth.ts        # Auth state hook
    ├── Dockerfile
    └── package.json
```

---

## 5. RAILWAY DEPLOYMENT

### Services

| Service | URL | Port |
|---------|-----|------|
| Backend (alert-light) | https://alert-light-production-a757.up.railway.app | 4000 |
| Frontend (Pre-Screening) | https://pre-screening-production-6604.up.railway.app | 8080 |
| Custom domain | https://pre-screening.abelops.com | 8080 |
| Database | postgres.railway.internal:5432 | internal only |

### Railway Project
- **Project name:** Pre-Screening (check Railway dashboard)
- **Backend service name:** alert-light
- **Frontend service name:** Pre-Screening
- **Database service:** Postgres (internal Railway Postgres)

---

## 6. ENVIRONMENT VARIABLES

### Backend (alert-light) — paste into Railway Raw Editor

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://pre-screening.abelops.com
DATABASE_URL=postgresql://postgres:wCDkxPgHubQfdCsYlXYZEDvYnjGZwZRQ@postgres.railway.internal:5432/railway
STORAGE_PROVIDER=local
JWT_SECRET=55b396fd4eba9d6748773051f0abebf5279e55a3fe789ed394fc8127e18a8660
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-key-here
MIN_DOWNLOAD_SPEED_MBPS=5
MIN_UPLOAD_SPEED_MBPS=2
MIN_FLUENCY_SCORE=60
MS_REDIRECT_URI=https://alert-light-production-a757.up.railway.app/api/v1/auth/ms/callback

# SMTP — add when client provides
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Stage 2 — add when client pays next tranche
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=
```

### Frontend (Pre-Screening) — paste into Railway Raw Editor

```env
NEXT_PUBLIC_API_URL=https://alert-light-production-a757.up.railway.app/api/v1
NEXT_PUBLIC_APP_NAME=TalentScreen
PORT=8080
```

---

## 7. DATABASE SCHEMA SUMMARY

### Stage 1 Tables (Active)
| Table | Purpose |
|-------|---------|
| users | Admin / Recruiter accounts with RBAC roles |
| candidates | All candidate application data |
| system_checks | Internet speed, device, mic test results |
| audio_recordings | Audio URL, Whisper transcript, fluency score |
| filter_results | Auto-qualify/reject decision + reasons |
| email_logs | Track all sent emails |
| recruiter_candidate_assignments | Which recruiter handles which candidate |
| internal_notes | Recruiter notes on candidate profiles |

### Stage 2 Tables (Pre-built, not active)
| Table | Purpose |
|-------|---------|
| recruiter_availability | Recruiter calendar slots |
| interviews | MS Teams meeting data, attendance tracking |

---

## 8. API ROUTES

### Auth
```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/users        (SUPER_ADMIN only)
GET    /api/v1/auth/users        (SUPER_ADMIN only)
PATCH  /api/v1/auth/users/:id    (SUPER_ADMIN only)
DELETE /api/v1/auth/users/:id    (SUPER_ADMIN only)
```

### Candidates (public)
```
POST   /api/v1/candidates        (public — submit application)
GET    /api/v1/candidates        (admin — list all)
GET    /api/v1/candidates/:id    (admin — get one)
PATCH  /api/v1/candidates/:id/status
POST   /api/v1/candidates/:id/assign
POST   /api/v1/candidates/:id/notes
```

### Upload
```
POST   /api/v1/upload/cv
POST   /api/v1/upload/certificate
```

### Audio
```
POST   /api/v1/audio/:candidateId    (submit audio → Whisper → filter)
```

### Admin
```
GET    /api/v1/admin/stats           (KPI counts)
GET    /api/v1/admin/export          (CSV export)
```

### Stage 2 Stubs (return 503 until activated)
```
GET    /api/v1/recruiter/availability
POST   /api/v1/recruiter/availability
POST   /api/v1/interviews/book
POST   /api/v1/webhooks/ms-graph
```

### Health
```
GET    /health
```

---

## 9. DEFAULT ADMIN CREDENTIALS

```
Email:    admin@company.com
Password: Admin@1234!
Role:     SUPER_ADMIN
```

**Change this password immediately after first login.**

The seed runs automatically on every container start (idempotent — skips if user exists).

---

## 10. CURRENT DEPLOYMENT STATUS

### What is Working
- Backend code complete (all Stage 1 features)
- Frontend code complete
- Database schema migrated
- Admin seed user created
- Both repos pushed and up to date

### Active Issue Being Fixed
CORS error between frontend and backend on Railway.
**Root cause:** PORT mismatch between Railway proxy routing and the Express app.
**Fix in progress:** Manual CORS headers added to app.js, PORT env vars being corrected.

### Immediate To-Do for New Developer
1. Paste env vars into Railway Raw Editor for both services (Section 6)
2. Ensure backend PORT=4000 and Railway domain routes to 4000
3. Ensure frontend PORT=8080 and Railway domain routes to 8080
4. Trigger redeploy on both services
5. Test login at https://pre-screening-production-6604.up.railway.app/login
6. Add SMTP credentials once client provides them
7. Switch STORAGE_PROVIDER to cloudinary and add Cloudinary keys for production file persistence

---

## 11. LOCAL DEVELOPMENT SETUP

```bash
# Clone
git clone https://github.com/Abelops786/Pre-Screening.git
cd Pre-Screening

# Backend
cd backend
cp .env.example .env        # fill in values
npm install
npx prisma migrate dev
npm run seed
npm run dev                 # runs on :4000

# Frontend (new terminal)
cd frontend
npm install
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm run dev                 # runs on :3000
```

---

## 12. STAGE 2 ACTIVATION CHECKLIST

When client provides Microsoft API keys:

1. Add to backend env vars:
   ```
   MS_CLIENT_ID=xxx
   MS_CLIENT_SECRET=xxx
   MS_TENANT_ID=xxx
   ```
2. Remove `STAGE2_DISABLED` guard in `stage2.routes.js`
3. Implement Microsoft Graph API calls in controllers
4. Build recruiter availability calendar UI in frontend
5. Build interview booking flow

DB tables and API route stubs are already in place — no schema changes needed.

---

## 13. KEY FILES TO KNOW

| File | What it does |
|------|-------------|
| `backend/src/app.js` | Express setup, CORS, middleware order |
| `backend/src/services/whisper.service.js` | OpenAI Whisper integration |
| `backend/src/services/filter.service.js` | Auto-qualify/reject logic |
| `backend/src/services/email.service.js` | Email templates + SMTP |
| `backend/src/services/storage.service.js` | File upload (local/S3/Cloudinary) |
| `backend/prisma/schema.prisma` | Full database schema |
| `backend/src/utils/seed.js` | Creates default SUPER_ADMIN |
| `backend/Dockerfile` | Container build + migrate + seed + start |
| `frontend/src/lib/api.ts` | Axios with JWT auto-attach |
| `frontend/src/app/apply/` | Full candidate journey pages |
| `frontend/src/app/admin/` | Full admin dashboard |

---

*Last updated: May 21, 2026*
*Built by: Claude (Anthropic) + Asher*
