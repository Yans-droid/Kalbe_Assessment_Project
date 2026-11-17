# Implementation Plan: TRACKLAB Mini Project (Kalbe Biopharma)

Deadline: **18 Nov 2026**. Stack: **.NET (backend/BFF)** + **Next.js (frontend)**.
Scoring priority: Functional > UI/UX > Security > Tests > Logging > QoL.

---

## 1. Scope

| # | Fitur | Status target |
|---|-------|---------------|
| 1 | Auth (two-step login, logout, refresh token) | WAJIB |
| 2 | CRUD Master Trackers (`m_trackers`) | WAJIB |
| 3 | CRUD Transaction Requests (`t_request_headers`) | WAJIB |
| 4 | Logging (backend .NET sendiri ke file + SQLite) | WAJIB |
| 5 | Audit Trail (`audit_trails` di SQLite), bonus BE | Bonus |
| 6 | CRUD Transaction Trackings (`t_trackings`), bonus FE | Bonus |

Aturan main: fitur 1-4 harus solid dulu sebelum menyentuh bonus. Jangan mengorbankan stabilitas dan security demi bonus FE.

---

## 2. Arsitektur

```
Browser (Next.js)
   |  same-origin /api/*  (Next rewrites)
   v
.NET Web API (BFF)  --->  Kalbe API (api-assessment-biopharma.kalbe.co.id)
   |
   +--> Serilog (file/console)
   +--> SQLite (tracklab.db: request_logs + audit_trails, auto-create saat startup)
```

Alasan BFF:
- `app_id` / `app_key` tidak pernah sampai ke browser.
- Token disimpan di **httpOnly cookie**, bukan localStorage.
- Tempat natural untuk two-step auth, logging, dan audit trail.
- Header pagination (`X-Paging-*` + Base64 filter) dirakit di server, FE cukup kirim query biasa.
- Pakai **SQLite** dengan `EnsureCreated()` agar penilai cukup `dotnet run` tanpa setup DB eksternal.

---

## 3. Struktur Project

```
tracklab/
├── backend/
│   ├── Tracklab.sln
│   ├── src/Tracklab.Api/
│   │   ├── Controllers/        AuthController, TrackersController, RequestsController, TrackingsController, LogsController
│   │   ├── Services/           KalbeApiClient, AuthService, AuditService
│   │   ├── Models/             DTOs + KalbeWrapper + request/response
│   │   ├── Middleware/         ExceptionHandling, RequestLogging
│   │   ├── Infrastructure/     PagingHeaderBuilder, TokenCookieHelper
│   │   ├── Data/               AppDbContext (request_logs, audit_trails)
│   │   ├── appsettings.json    (tanpa secret)
│   │   ├── appsettings.Example.json
│   │   └── Program.cs
│   └── tests/Tracklab.Tests/
├── frontend/
│   ├── src/app/
│   │   ├── login/
│   │   ├── (protected)/trackers/
│   │   ├── (protected)/requests/
│   │   └── (protected)/trackings/      (bonus)
│   ├── src/components/         DataTable, FormDialog, ConfirmDialog, Toast
│   ├── src/lib/                api client, formatters, zod schemas
│   ├── src/middleware.ts       route protection
│   └── .env.example
├── README.md
└── implementation.md
```

---

## 4. Langkah 0: Eksplorasi API (SELESAI & TERVERIFIKASI)

### Hasil Verifikasi Langsung via cURL & Postman

**Keputusan: endpoint CRUD tersedia lengkap untuk ketiga entity. Pakai BFF proxy tipis + logging + audit. Tidak perlu DB untuk data utama.**

Base: `{BASE_URL}/api/v1/feature` (variabel: `BASE_URL`, `PATH_FEATURE`, `PATH_AUTHENTICATION`, `APP_ID`, `APP_KEY`).

Pola endpoint sama untuk `/trackers`, `/requests`, `/trackings`:

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/{entity}` | list semua (tanpa paging) |
| GET | `/{entity}/paging` | list + simple pagination (header `X-Paging-*`) |
| GET | `/{entity}/paging/advance` | list + advance pagination (Include/Exclude Base64) |
| GET | `/{entity}/{id}` | detail |
| POST | `/{entity}` | create (JSON body) |
| PUT | `/{entity}` | update (JSON body, `id` di body) |
| DELETE | `/{entity}` | delete (JSON body: `id`, `deletedBy`, `doHardDelete`) |

Endpoint tambahan: `GET /trackers/code/{code}` dan `GET /trackings/request-id/{requestId}`.

Body (`camelCase`):
- **Tracker**: `code, parentCode, description, actionType, moduleFlow, isUsingNotification, isPublic, icon, order, mandays, isParallel, id, createdBy` (PUT: `updatedBy`, `isActive`)
- **Request**: `partnerId, projectCode, totalFee, lastStatus, receivingStatus, leadTime, receivedDate, analysisWipDate, analysisCompletedDate, id, createdBy` (PUT: `updatedBy`, `isActive`)
- **Tracking**: `trackerCode, value, trackerId, requestId, partnerId, id, createdBy` (PUT: `updatedBy`, `isActive`)

Struktur Response Kalbe (terverifikasi):
- **Login (`POST /auth/login`)**: `{ "data": { "token": { "access": "...", "refresh": "...", "expiresIn": 3600 }, "user": "assessment.it", "username": "assessment.it" }, "success": true, "code": 200 }`
- **Refresh (`GET /auth/token/refresh?refreshAuthorization=true`)**: `{ "data": { "access": "...", "refresh": "...", "expiresIn": 3600 }, "success": true, "code": 200 }`
- **Paging List (`GET /{entity}/paging`)**: `{ "data": { "items": [...], "pageCurrent": 1, "pagePrevious": 0, "pageNext": 2, "offset": 0, "limit": 10, "sortBy": "code", "sortOrder": "ASC", "totalItems": 34, "totalPages": 4 }, "success": true, "code": 200 }`

### Implikasi desain
1. **Two-Step Auth wajib saat login.** Token dari `POST /auth/login` (`data.token.access`) belum memiliki izin akses modul dan akan dibalas `401` oleh `/api/v1/feature/*`. BFF wajib langsung menukarnya lewat `GET /auth/token/refresh?refreshAuthorization=true` (dengan membawa session cookie dari login) untuk mendapatkan `data.access` final.
2. **`createdBy` / `updatedBy` / `deletedBy` diisi BFF dari user di token, bukan dari FE.** Mencegah spoofing dari client (poin Security).
3. **`doHardDelete` selalu `false` dari BFF.** Jangan ekspos hard delete ke FE.
4. **`id` dikirim di body saat POST/PUT/DELETE.** Generate GUID di BFF saat POST.
5. **Kolom "Company Name" di UI Requests:** Jika GET `/requests/paging` hanya mengembalikan `partnerId` tanpa nama perusahaan, tampilkan badge UUID ringkas + tombol copy, lalu catat di bagian "API Findings" pada README.
6. **Selalu kirim `app_id` & `app_key` di setiap request upstream dari BFF.**

---

## 5. Konfigurasi dan Secret

Jangan hardcode dan jangan commit. Kredensial ditaruh di user-secrets / env var:

**Backend** (`dotnet user-secrets` / env var):
```
Kalbe__BaseUrl=https://api-assessment-biopharma.kalbe.co.id
Kalbe__AppId=<dari slide>
Kalbe__AppKey=<dari slide>
Cors__AllowedOrigins=http://localhost:3000
ConnectionStrings__DefaultConnection=Data Source=tracklab.db
```

**Frontend** (`.env.local`):
```
BACKEND_URL=http://localhost:5000
```

Sediakan `.env.example` dan `appsettings.Example.json` tanpa nilai asli. Tambahkan `.env*`, `secrets.json`, `*.db`, `logs/` ke `.gitignore`.

---

## 6. Auth Flow

1. FE `POST /api/auth/login` (user, password) ke BFF.
2. BFF memakai `HttpClient` + `CookieContainer` untuk memanggil `POST /auth/login` (`appCode: "ASSESSMENT"`, `moduleCode: "ALL"`), menangkap session cookie, lalu langsung memanggil `GET /auth/token/refresh?refreshAuthorization=true` untuk mendapatkan `data.access` final.
3. BFF menyimpan ke cookie browser:
   - access token final: cookie `httpOnly; SameSite=Lax` (`Secure = !env.IsDevelopment()` agar jalan di localhost)
   - upstream session cookie: cookie `httpOnly; SameSite=Strict`
4. Request berikutnya: BFF baca cookie, kirim `Authorization: Bearer ...` + `app_id` + `app_key` ke Kalbe.
5. Kalau Kalbe balas **401**: BFF panggil `GET /auth/token/refresh?refreshAuthorization=true` dengan session cookie, update cookie, **retry sekali**. Jika gagal, hapus cookie dan balas 401 ke FE agar redirect ke `/login`.
6. Logout: `POST /auth/logout` (kirim `user` di body), hapus cookie.
7. Next.js `middleware.ts`: redirect ke `/login` kalau cookie tidak ada.

Catatan: pakai `rewrites` di `next.config.ts` supaya `/api/*` diteruskan ke .NET (same-origin).

---

## 7. Pagination Header Builder (backend)

FE kirim query (`page`, `pageSize`, `sortBy`, `sortOrder`, `search`, `filters`). BFF mengubahnya jadi header Kalbe.

```csharp
public static class PagingHeaderBuilder
{
    public static void Apply(HttpRequestMessage req, PagingQuery q, IReadOnlySet<string> allowedSortFields)
    {
        var page = Math.Max(1, q.Page);
        var limit = Math.Clamp(q.PageSize, 1, 100);
        req.Headers.Add("X-Paging-Offset", ((page - 1) * limit).ToString());
        req.Headers.Add("X-Paging-Limit", limit.ToString());

        if (!string.IsNullOrWhiteSpace(q.SortBy) && allowedSortFields.Contains(q.SortBy))
        {
            req.Headers.Add("X-Paging-SortBy", q.SortBy);
            req.Headers.Add("X-Paging-SortOrder", q.SortOrder?.ToUpper() == "DESC" ? "DESC" : "ASC");
        }

        // Default wildcard '%' sesuai perilaku terverifikasi pada API Kalbe
        req.Headers.Add("X-Paging-Search", string.IsNullOrWhiteSpace(q.Search) ? "%" : q.Search.Trim());

        if (q.Include is { Count: > 0 })
        {
            var json = JsonSerializer.Serialize(q.Include);
            req.Headers.Add("X-Paging-Include", Convert.ToBase64String(Encoding.UTF8.GetBytes(json)));
            req.Headers.Add("X-Paging-Operator", q.Operator == "AND" ? "AND" : "OR");
            req.Headers.Add("X-Paging-IgnoreCase", "true");
        }
    }
}
```

Penting:
- Whitelist `sortBy` ke daftar kolom yang diizinkan (cegah input liar).
- Batasi `pageSize` (maks 100).
- Encode Base64 sendiri dari JSON valid (contoh di slide 13 memakai kutip lengkung yang tidak valid).

---

## 8. Fitur Backend

### 8.1 Master Trackers
Field: `code`, `parentCode`, `description`, `actionType` (`none`/`text`/`file`/`date`), `moduleFlow`, `isUsingNotification`, `isPublic`, `icon`, `order`, `mandays`, `isParallel`.

Validasi:
- `code` wajib, format `^[A-Z0-9-]+$`.
- `actionType` hanya nilai yang diizinkan (`none`, `text`, `file`, `date`).
- `order` dan `mandays` boleh `>= -1` (data riil server Kalbe menggunakan `-1` untuk item tanpa SLA).

Delete: gunakan **soft delete** (`doHardDelete = false`, `deletedBy` dari sesi user).

### 8.2 Transaction Requests
Field: `projectCode`, `receivingStatus`, `totalFee`, `receivedDate`, `partnerId`, `lastStatus`, `analysisWipDate`, `analysisCompletedDate`, `leadTime`.

Validasi:
- `projectCode` wajib.
- `totalFee >= 0`.
- `analysisCompletedDate >= analysisWipDate` (jika keduanya diisi).
- `leadTime` dihitung otomatis dari selisih tanggal jika tidak diisi.

List: kolom Request ID, Company Name (`partnerId`), Project Code, Request Date, Last Status, Receiving Status, Total Fee. Filter by status dan tanggal.

### 8.3 Trackings (bonus FE)
Relasi `trackerId` dan `requestId`. Form pilih tracker dan request dari dropdown, isi `value` sesuai `actionType` tracker.

### 8.4 Error handling
Satu `ExceptionHandlingMiddleware` yang mengubah error jadi format konsisten (RFC 7807 `ProblemDetails`) tanpa membocorkan stack trace. Set `HttpClient` timeout (15 detik) dan balas `502 Bad Gateway` jika upstream Kalbe timeout/down.

---

## 9. Logging (wajib)

- **Serilog**: sink Console + File (`logs/log-.txt`, rolling harian) + tabel `request_logs` di SQLite.
- Middleware `RequestLogging`: `CorrelationId` (`X-Correlation-Id`), method, path, status, durasi (ms), user.
- Log event aplikasi: login sukses/gagal, two-step refresh token, CRUD action, error upstream.
- **Jangan pernah log**: password, token, `app_key`, isi cookie (`***REDACTED***`).
- Endpoint `GET /api/logs` (read-only) untuk memudahkan penilai memverifikasi logging.

---

## 10. Audit Trail (bonus BE)

Tabel `audit_trails` di SQLite (`tracklab.db`):

| kolom | isi |
|-------|-----|
| id | PK |
| timestamp | UTC |
| user | dari sesi/claim |
| entity | `Tracker` / `Request` / `Tracking` |
| entity_id | id record |
| action | CREATE / UPDATE / DELETE |
| old_value | JSON sebelum (null untuk create) |
| new_value | JSON sesudah (null untuk delete) |
| correlation_id | untuk hubungkan dengan log |

Implementasi: `AuditService.RecordAsync(...)` dipanggil dari controller setelah operasi sukses. Untuk UPDATE, ambil data lama (`GET /{entity}/{id}`) sebelum `PUT`. Endpoint `GET /api/audit-trails` untuk inspeksi.

---

## 11. Frontend

Stack: Next.js (App Router) + TypeScript + Tailwind + react-hook-form + zod.

Tema: hijau korporat Kalbe (`#0a7a3c`) seperti desain TRACKLAB, sidebar kiri, header tabel hijau.

Halaman:
- `/login`
- `/trackers`: tabel (search, sort, show 10/25/50, pagination), tombol Add, menu aksi (Edit, Delete) per baris, ikon centang/silang untuk boolean.
- `/requests`: tabel + Filter By + Add, format `Total Fee` ke Rupiah, tanggal `20 Jun 2025`.
- `/trackings` (bonus).

UX wajib:
- Loading skeleton, empty state, error state dengan tombol retry.
- Form validasi inline (zod), tombol submit disabled saat loading.
- Konfirmasi sebelum delete.
- Toast sukses/gagal.
- Debounce search (300 ms).
- Responsif minimal untuk lebar laptop dan tablet.

---

## 12. Security Checklist

- [ ] Secret tidak ada di repo (cek `git log` sebelum submit).
- [ ] Token di httpOnly cookie, `Secure` menyesuaikan environment, `SameSite` diatur.
- [ ] CORS dibatasi ke origin FE saja.
- [ ] Semua endpoint BFF terproteksi sesi kecuali `/api/auth/login`.
- [ ] `createdBy`, `updatedBy`, `deletedBy` diisi BFF, bukan dari FE.
- [ ] Whitelist kolom sort/filter, batasi page size (`<= 100`).
- [ ] Rate limit endpoint login (`AddRateLimiter`).
- [ ] Security headers (`X-Content-Type-Options`, `X-Frame-Options`) di Next.js.
- [ ] Pesan error login generik (tidak membedakan user salah vs password salah).
- [ ] Tidak ada secret/token di log.

---

## 13. Testing (6-10 test bermakna, bukan kejar coverage)

Backend (xUnit + Moq):
- `PagingHeaderBuilder`: offset benar, default search `%`, Base64 valid, sort di-whitelist.
- `Validator`: Tracker (`code` kosong/format salah, `actionType` invalid, `mandays >= -1`) dan Request (`totalFee` negatif, tanggal selesai < tanggal mulai).
- `AuthService`: two-step login (`/login` lalu `/refresh?refreshAuthorization=true`), auto-retry sekali saat 401.
- Integration: `WebApplicationFactory` dengan upstream di-mock; endpoint tanpa cookie sesi harus 401.

Frontend (Vitest + Testing Library):
- Helper formatter Rupiah & tanggal.
- Form tracker menampilkan error validasi saat field wajib kosong.

---

## 14. Jadwal (Malam 17 Nov s/d Sore 18 Nov)

**17 Nov (Malam Ini, target selesai ~01.00 WIB)**
1. Setup solution .NET 8 (Serilog + SQLite `EnsureCreated`) + Next.js (`rewrites` `/api`), `.gitignore`, `.env.example`.
2. Two-Step Auth end-to-end (login, logout, auto-refresh on 401, Next.js `middleware.ts`).
3. `RequestLoggingMiddleware` + `ExceptionHandlingMiddleware` aktif.

**18 Nov (Deadline — Pagi s/d Sore)**
1. **08.00 – 10.00**: Master Trackers E2E (list, search, sort, create, edit, soft delete + Audit Trail).
2. **10.00 – 12.00**: Transaction Requests E2E (list, Filter By Base64, create, edit, delete + Audit Trail).
3. **13.00 – 14.30**: Bonus FE Transaction Trackings (jika waktu cukup), lalu polish UI/UX.
4. **14.30 – 16.00**: Security checklist, 6-10 unit/integration test (`dotnet test`, `npm test`), README + API Findings, fresh clone test, lalu **submit sebelum sore**.

Aturan potong scope kalau telat: buang Trackings FE dulu, lalu batasi Audit Trail ke Trackers saja, jangan korbankan Requests dan Security dasar.

---

## 15. Definition of Done (sebelum submit)

- [ ] Clone bersih, ikuti README, app jalan tanpa langkah tersembunyi (`dotnet run` + `npm run dev`).
- [ ] Two-step login, logout, dan auto-refresh token berfungsi.
- [ ] CRUD Trackers dan Requests jalan end-to-end dengan data asli dari API Kalbe.
- [ ] Log tertulis ke file dan SQLite tanpa berisi secret.
- [ ] Test lulus (`dotnet test`, `npm test`).
- [ ] Tidak ada secret di commit history.
- [ ] README berisi: cara run, env var, keputusan arsitektur, API findings, dan fitur bonus/keterbatasan.

---

## 16. Risiko dan Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Token login ditolak endpoint fitur (`401`) | Jalankan two-step auth (`/login` + `/refresh?refreshAuthorization=true`) di BFF |
| API Kalbe lambat/down saat dinilai | Timeout 15 detik, retry on 401, error state + tombol retry jelas di UI |
| Waktu habis besok siang | Potong scope sesuai urutan di bagian 14 |
| Secret ikut ke-commit | `.gitignore` dari commit pertama, cek `git log` |
| Cookie ditolak browser di `http://localhost` | Pakai Next `rewrites` (same-origin) dan `Secure = !env.IsDevelopment()` |
| Penilai kesulitan setup DB lokal | Pakai SQLite (`tracklab.db`) dengan `Database.EnsureCreated()` saat startup |