# TRACKLAB — Kalbe Biopharma Mini Project

Web application for tracking laboratory workflow, requests, and processes for Kalbe Biopharma.
Built using **.NET 8 Web API** as a Backend-For-Frontend (BFF) and **Next.js 15 (App Router)** with **Tailwind CSS** as the frontend client matching the official **TRACKLAB / PharmaMetricLabs** design system.

---

## Architecture Overview

```
Browser (Next.js Client)
   │   Same-origin /api/* (via Next.js rewrites)
   ▼
.NET 8 Web API (BFF on :5000)  ───►  Kalbe External API (api-assessment-biopharma.kalbe.co.id)
   │                                  ├─ Authentication: /api/v1/authentication/auth/*
   │                                  └─ Features (CRUD): /api/v1/feature/*
   ├── Serilog (Console + Rolling daily file logs: logs/log-.txt)
   └── SQLite (tracklab.db: request_logs + audit_trails, auto-created on startup)
```

### Key Architectural Decisions

1. **Backend-For-Frontend (BFF) Pattern**:
   - `app_id` and `app_key` are kept strictly server-side and never exposed to the client.
   - Authentication tokens are stored in `httpOnly`, `SameSite=Lax` cookies, preventing XSS-based token theft.
   - Upstream headers (`X-Paging-*`, Base64 filters) are constructed on the server via `PagingHeaderBuilder`.
2. **Two-Step Authentication**:
   - The upstream API requires a two-step handshake: `POST /api/v1/authentication/auth/login` returns an initial token which lacks feature permissions, followed immediately by `GET /api/v1/authentication/auth/token/refresh?refreshAuthorization=true` with session cookies to acquire the authorized access token.
   - The BFF transparently handles both steps during login and returns ready-to-use session cookies to the browser.
3. **Resilient Filter By & Search Architecture**:
   - **PostgreSQL JSON Object Format**: Upstream Kalbe database uses PostgreSQL `jsonb_each_text()`, which strictly requires a JSON Object (e.g. `{"actionType":"text"}`) rather than an array. The BFF normalizes all incoming filters into single JSON objects to prevent upstream `22023: cannot call jsonb_each_text on a non-object` errors.
   - **Wildcard Substring Search**: Keywords in `X-Paging-Search` are automatically formatted as `%{keyword}%` for SQL `LIKE` wildcard matching.
   - **Multi-Strategy Retry & BFF Post-Filtering**: If upstream returns 500 or ignores search/filter parameters, the BFF gracefully executes post-filtering in-memory (*case-insensitive*) with accurate pagination recalculation, ensuring zero UI crashes.
4. **Audit Trail & Logging**:
   - Every mutation (Create, Update, Delete) logs old and new states into SQLite `audit_trails`.
   - Incoming requests are logged with unique correlation IDs (`X-Correlation-Id`), elapsed milliseconds, and authenticated user IDs into `request_logs`.
   - Passwords, bearer tokens, and secret keys are strictly redacted from logs.
5. **Zero-Configuration Local Database**:
   - EF Core with SQLite automatically runs `Database.EnsureCreated()` on backend startup. No external database setup is required.

---

## Features

| # | Feature | Scope | Status |
|---|---------|-------|--------|
| 1 | Two-step Auth (Login, Logout, Cookie Session, Infinite-Loop Prevention) | Core | ✅ Done |
| 2 | CRUD Master Trackers (`m_trackers`) + Filter By (`code`, `actionType`, `moduleFlow`) | Core | ✅ Done |
| 3 | CRUD Transaction Requests (`t_request_headers`) + Filter By (`lastStatus`, `receivingStatus`) | Core | ✅ Done |
| 4 | Request Logging (File + SQLite + Correlation ID) | Core | ✅ Done |
| 5 | Audit Trail (`audit_trails` table + `GET /api/audit-trails`) | Bonus BE | ✅ Done |
| 6 | CRUD Transaction Trackings (`t_trackings` FE + BE) | Bonus FE | ✅ Done |
| 7 | Full Responsive Web Design (Desktop collapsible sidebar `w-64`→`w-20`, Mobile slide-over drawer) | Bonus UI | ✅ Done |

---

## UI / UX Design System

- **Color Palette**:
  - Primary Accent: `#008444` (hover `#006b37`).
  - Page Background: `#f8fafc` (neutral light gray).
  - Cards & Sidebar: Clean white `#ffffff` with subtle borders (`border-gray-200`).
- **Layout & Navigation**:
  - Sidebar: Desktop collapsible `w-64` to `w-20` via `«`/`»` toggle; mobile `< lg` slide-over drawer with backdrop.
  - Sidebar Navigation: Categories `MAIN MENU` (Dashboard, Request with sub-menu `Lab Analysis` → `/requests` + active dot, `BA/BE`), `Tracking Progress` (`/trackings`), `USER`, `MASTER` (`Customer`, `Tracker` → `/trackers`, `Document`, `Notification`, etc.), and `PharmaMetricLabs` footer.
  - Header Bar: Hamburger toggle (mobile), module title, user badge (`assessment.it`), green initial avatar, and dropdown menu with Logout.
- **Data Table**:
  - Emerald green table header (`#008444`) with white text and sort direction indicators.
  - Leftmost Action column (`•••`) with dropdown for Edit and Delete.
  - Top Toolbar: Show [10 / 25 / 50], solid green `Filter By` button with active count badge, search box with 400ms debounce + Enter trigger + instant clear `X`, and `+ Add` button.
  - Pagination: "Showing X to Y of Z entries" with active page pill and Prev/Next buttons.

---

## Project Structure

```
Kalbe_Project/
├── backend/
│   ├── Tracklab.sln
│   ├── src/Tracklab.Api/
│   │   ├── Controllers/         # Auth, Trackers, Requests, Trackings, Logs, AuditTrails
│   │   ├── Services/            # KalbeApiClient, AuthService, AuditService
│   │   ├── Models/              # DTOs, request/response models, Kalbe wrappers
│   │   ├── Middleware/          # RequestLoggingMiddleware, ExceptionHandlingMiddleware
│   │   ├── Infrastructure/      # PagingHeaderBuilder, TokenCookieHelper
│   │   ├── Data/                # AppDbContext, RequestLog, AuditTrail
│   │   ├── appsettings.json
│   │   ├── appsettings.Example.json
│   │   └── Program.cs
│   └── tests/Tracklab.Tests/    # 41 xUnit + Moq unit and validation tests
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/           # Login page with validation and Kalbe branding
│   │   │   ├── (protected)/     # Protected layout with Sidebar and Header
│   │   │   │   ├── trackers/    # Full CRUD Trackers DataTable + Filter By + modals
│   │   │   │   ├── requests/    # Full CRUD Requests DataTable + Filter By + modals
│   │   │   │   └── trackings/   # Full CRUD Trackings DataTable + modals
│   │   ├── components/          # DataTable, FormDialog, ConfirmDialog, Toast, Sidebar, Header
│   │   ├── lib/                 # api client, formatters (Rupiah, Date), Zod schemas
│   │   └── middleware.ts        # Route protection via session cookies
│   ├── package.json
│   └── vitest.config.ts         # 26 Vitest unit tests for schemas & formatters
└── README.md
```

---

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+ or 20+](https://nodejs.org/) (npm included)

---

## Getting Started

### 1. Backend Setup

1. Open a terminal in the `backend/src/Tracklab.Api` directory:
   ```bash
   cd backend/src/Tracklab.Api
   ```

2. Configure secrets using .NET User Secrets or update `appsettings.json`:
   ```bash
   dotnet user-secrets set "Kalbe:BaseUrl" "https://api-assessment-biopharma.kalbe.co.id"
   dotnet user-secrets set "Kalbe:AppId" "<YOUR_APP_ID>"
   dotnet user-secrets set "Kalbe:AppKey" "<YOUR_APP_KEY>"
   ```
   *Alternatively*, set environment variables:
   ```bash
   export Kalbe__BaseUrl="https://api-assessment-biopharma.kalbe.co.id"
   export Kalbe__AppId="<YOUR_APP_ID>"
   export Kalbe__AppKey="<YOUR_APP_KEY>"
   ```

3. Run the backend:
   ```bash
   dotnet run
   ```
   The backend will start at `http://localhost:5000` (and `https://localhost:5001`).
   SQLite database `tracklab.db` will be initialized automatically on startup.

---

### 2. Frontend Setup

1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Verify `.env.local` points to the backend:
   ```bash
   cp .env.example .env.local
   ```

4. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

5. Navigate to [http://localhost:3000](http://localhost:3000). You will be automatically redirected to `/login`. Sign in using your Kalbe assessment credentials (`assessment.it`).

---

## Running Automated Tests

### Backend Tests (.NET xUnit)
41 automated unit and validation tests verifying `PagingHeaderBuilder` (offset, clamping, Base64 filter normalization to JSON object, search wildcards, sort whitelist), `ValidationTests` (regex code format, action types, mandays >= -1, positive totalFee, date consistency), and `TokenCookieHelper`:

```bash
cd backend
dotnet test --verbosity normal
```

### Frontend Tests (Vitest)
26 automated tests covering Zod schemas (form validation, date comparisons, required fields) and formatters (Indonesian Rupiah formatting, dates, UUID truncation):

```bash
cd frontend
npm test
```

---

## API Findings & Design Notes

1. **Authentication Endpoint Prefix**:
   - The authentication endpoints on Kalbe API live under `/api/v1/authentication/auth/*` (`login`, `token/refresh`, `logout`), distinct from business feature endpoints under `/api/v1/feature/*`.
2. **Two-Step Authentication Requirement**:
   - Direct calls to `/api/v1/feature/*` using the initial access token from `POST /api/v1/authentication/auth/login` fail with `401 Unauthorized`.
   - The BFF automatically executes `GET /api/v1/authentication/auth/token/refresh?refreshAuthorization=true` with session cookies to acquire the feature-authorized bearer token.
3. **PostgreSQL JSON Object Requirement on Advance Paging**:
   - Upstream uses PostgreSQL `jsonb_each_text()`, which throws `22023: cannot call jsonb_each_text on a non-object` if `X-Paging-Include` is an array. The BFF normalizes any filter into a Base64-encoded JSON object `{"key":"value"}`.
4. **Wildcard Search Matching**:
   - Parameter `X-Paging-Search` requires `%...%` wrapper for substring matching. The BFF formats queries automatically and enforces BFF search post-filtering if upstream returns unfiltered rows.
5. **Mandays and Order Value `-1`**:
   - Live data contains `-1` for SLA mandays or order on items where SLA tracking does not apply. Validation rules were adjusted to allow `>= -1`.
6. **Soft Delete Enforcement**:
   - Upstream requires `doHardDelete: false` and the current username in `deletedBy`. The BFF enforces soft deletion and populates `deletedBy` automatically from the session cookie, preventing spoofing.
7. **Read-Only Inspection Endpoints**:
   - `GET /api/logs`: Returns recent 100 request logs from SQLite.
   - `GET /api/audit-trails`: Returns recent 100 audit trail entries from SQLite.

---

## Security Checklist

- [x] Zero hardcoded secrets in source code or git history (`.gitignore` configured).
- [x] Tokens stored in `httpOnly` cookies (`Secure` dynamically toggled for development vs production).
- [x] Same-Origin API proxying via Next.js rewrites to prevent cross-site token leakage.
- [x] CORS whitelist restricted to frontend origin (`http://localhost:3000`).
- [x] Rate limiting configured on `/api/auth/login` (10 attempts per minute per IP).
- [x] Server-side authorization check across all feature endpoints.
- [x] User identity (`createdBy`, `updatedBy`, `deletedBy`) populated server-side from session.
- [x] Sensitive parameters, bearer tokens, and passwords redacted from logs.
- [x] Standard HTTP security headers enabled (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`).
# Kalbe_Assessment_Project
