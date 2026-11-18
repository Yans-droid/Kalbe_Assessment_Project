# Action Plan: Sisa Pekerjaan TRACKLAB (Deadline Hari Ini, 18 Nov 2026)

Status per **08:47 WIB**: **Two-Step Auth**, **BFF Proxy**, dan **List Master Trackers** sudah berjalan dengan data live API Kalbe. Dokumen ini hanya memuat item yang **belum selesai** dan harus dieksekusi hingga pengumpulan sore ini.

---

## 1. Daftar Sisa Pekerjaan (Berdasarkan Prioritas Penilaian)

| Prioritas | Modul / Task | Kategori | Status | Target Selesai |
|-----------|--------------|----------|--------|----------------|
| **P1** | Master Trackers: Modal CRUD (Add/Edit/Delete) & UI Polish | WAJIB | Belum / Perlu Cek 
| **P2** | Transaction Requests (`/requests`): Backend + Frontend Full CRUD & Filter | WAJIB | Belum 
| **P3** | Audit Trail (`audit_trails` SQLite) & Verifikasi Sanitasi Log | WAJIB + Bonus BE | Belum 
| **P4** | Responsive Web Design (RWD) Layout, Tabel & Modal | WAJIB (UI/UX) | Belum 
| **P5** | Transaction Trackings (`/trackings`): CRUD Relasi Request-Tracker | Bonus FE | Belum 
| **P6** | Unit/Integration Tests (`dotnet test` & `npm test`) + Security Check | WAJIB | Belum 
| **P7** | `README.md` & Uji Fresh Clone Sebelum Submit | WAJIB | Belum 

---

## 2. Detail Eksekusi P1 — Master Trackers (CRUD & UI Polish)

1. **Verifikasi Mutasi API:**
   - **Add (`POST /api/trackers`):** BFF otomatis mengisi `id` (GUID baru) dan `createdBy` (dari cookie sesi user).
   - **Edit (`PUT /api/trackers`):** BFF mengirim `id` di dalam JSON body dan mengisi `updatedBy` dari sesi user.
   - **Delete (`DELETE /api/trackers`):** BFF mengirim `{ id, deletedBy, doHardDelete: false }` di JSON body + dialog konfirmasi di UI.
2. **Polish UI `/trackers`:**
   - Pindahkan tombol `Logout` + info user ke header kanan atas agar tidak bertabrakan dengan badge Next.js di pojok kiri bawah.
   - Berikan `text-center` pada kolom `Order`, `Mandays`, `Notification`, `Public`, dan `Parallel`.
   - Tampilkan nilai `mandays < 0` (contoh `-1` bawaan server) sebagai `-` di tabel, namun tetap muat nilai aslinya di form Edit.

---

## 3. Detail Eksekusi P2 — Transaction Requests (`/requests`)

### 3.1 Backend (`RequestsController.cs`)
- **Endpoints:**
  - `GET /api/requests` $\rightarrow$ meneruskan ke `GET /api/v1/feature/requests/paging/advance` (mendukung `search`, `sortBy`, `sortOrder`, `page`, `pageSize`, dan `filters` Base64).
  - `GET /api/requests/{id}` $\rightarrow$ detail request.
  - `POST /api/requests` $\rightarrow$ payload `camelCase`: `id`, `partnerId`, `projectCode`, `totalFee`, `lastStatus`, `receivingStatus`, `leadTime`, `receivedDate`, `analysisWipDate`, `analysisCompletedDate`, `createdBy`.
  - `PUT /api/requests` $\rightarrow$ payload sama + `id`, `updatedBy`, `isActive`.
  - `DELETE /api/requests/{id}` $\rightarrow$ soft delete ke `DELETE /api/v1/feature/requests` dengan `{ id, deletedBy, doHardDelete: false }`.
- **Validasi Bisnis Backend:**
  - `projectCode` wajib diisi.
  - `totalFee >= 0`.
  - Jika `analysisWipDate` dan `analysisCompletedDate` diisi, wajib `analysisCompletedDate >= analysisWipDate`.
  - Hitung `leadTime` otomatis (selisih hari) jika tidak dikirim dari FE.

### 3.2 Frontend (`src/app/(protected)/requests/page.tsx`)
- **Kontrol Tabel:**
  - Kiri atas: Dropdown `Show [10 / 25 / 50]` + tombol hijau **`Filter By`** (filter `lastStatus` dan `receivingStatus` yang dikirim ke BFF untuk di-encode ke header `X-Paging-Include`).
  - Kanan atas: Tombol hijau **`+ Add`** untuk membuka modal *Create Request*.
- **Kolom Tabel (Sesuai Referensi UI):**
  1. `Action`: Tombol menu aksi (`Edit`, `Delete`, `View Trackings`).
  2. `Request ID`: `font-mono`, potong 20 karakter pertama + `...`, tampilkan full UUID saat *hover* (`title`).
  3. `Company Name`: Tampilkan `partnerId` (atau nama perusahaan jika ada di response; catat di `README.md`).
  4. `Project Code`: Teks kode proyek (misal `PRJ-250623`).
  5. `Request Date`: Format `dd MMM yyyy` (`20 Jun 2025`) dari `receivedDate`.
  6. `Last Status`: Status terakhir (misal `Not sent yet`, `RFA Project Code`).
  7. `Receiving Status`: Status penerimaan (misal `Not received yet`).
  8. `Total Fee`: Format Rupiah `Rp 400.000,00` (`Intl.NumberFormat('id-ID')`), rata kanan.

---

## 4. Detail Eksekusi P3 — Audit Trail (Bonus BE) & Logging Check

1. **Audit Trail (`AuditService.cs` + SQLite `tracklab.db`):**
   - Pastikan tabel `audit_trails` terbentuk otomatis via `db.Database.EnsureCreated()` di `Program.cs`.
   - Kolom: `Id`, `Timestamp` (UTC), `User`, `Entity` (`Tracker` / `Request` / `Tracking`), `EntityId`, `Action` (`CREATE` / `UPDATE` / `DELETE`), `OldValue` (JSON), `NewValue` (JSON), `CorrelationId`.
   - Panggil `AuditService.RecordAsync(...)` di `TrackersController` dan `RequestsController` setelah `POST`, `PUT` (didahului `GET` data lama), dan `DELETE` sukses.
   - Sediakan endpoint `GET /api/audit-trails` (read-only + paging) agar mudah diverifikasi penilai.
2. **Verifikasi Logging Wajib:**
   - Pastikan log di `logs/log-.txt` dan console **tidak** mencatat password, Bearer token, `app_key`, atau isi cookie.

---

## 5. Detail Eksekusi P4 — Responsive Web Design (RWD) Setting

Terapkan standar responsif lintas ukuran layar (*Mobile `< 768px`*, *Tablet `768px - 1024px`*, *Desktop `> 1024px`*) agar skor **UI & UX** maksimal:

1. **App Shell & Collapsible Sidebar (`(protected)/layout.tsx`):**
   - **Desktop (`lg:` / $\ge 1024\text{px}$):** Sidebar kiri hijau tetap (*fixed/sticky* `w-64`), konten utama menyesuaikan sisa lebar (`lg:pl-64`).
   - **Mobile & Tablet (`< 1024px`):** Sembunyikan sidebar default (`-translate-x-full lg:translate-x-0`), tampilkan tombol *hamburger* di top navbar kiri untuk membuka *slide-over drawer* dengan *backdrop* gelap (`bg-black/40`) yang otomatis menutup saat menu diklik.
2. **Top Header Bar Responsif:**
   - Tampilkan judul halaman di kiri, serta *badge* user (`assessment.it`) + tombol `Logout` di kanan atas (`px-4 sm:px-6`). Di layar kecil, sembunyikan teks panjang dan sisakan ikon + inisial user agar tidak *wrap* berantakan.
3. **Toolbar & Filter Responsif (`flex-col sm:flex-row`):**
   - Input `Search`, dropdown `Show`, tombol `Filter By`, dan tombol `+ Add` disusun vertikal penuh (`w-full`) di layar mobile (`< 640px`), lalu sejajar horizontal (`sm:w-auto sm:justify-between`) di tablet/desktop.
4. **Data Table & Pagination Responsif:**
   - Bungkus setiap `<table>` dengan kontainer `w-full overflow-x-auto` dan beri `whitespace-nowrap` pada kolom penting (`Code`, `Action Type`, `Request ID`, `Total Fee`) agar tidak gepeng saat layar menyempit.
   - Sticky kolom pertama (`Code` / `Action`) opsional pada mobile agar konteks baris tetap terlihat saat digeser horizontal.
   - Footer pagination disusun `flex-col sm:flex-row gap-3 items-center justify-between` supaya tombol `Prev / 1 2 3 / Next` tidak meluber keluar layar HP.
5. **Form Modal & Dialog Responsif:**
   - Gunakan kontainer modal `w-full max-w-lg sm:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto` dengan grid form `grid-cols-1 sm:grid-cols-2 gap-4` (2 kolom di desktop, otomatis menumpuk 1 kolom di mobile) serta tombol aksi `w-full sm:w-auto`.
6. **Verifikasi Viewport DevTools:**
   - Uji tampilan pada 3 *preset* Chrome DevTools sebelum submit: **iPhone 14 (`390x844`)**, **iPad Air (`820x1180`)**, dan **Desktop (`1440x900`)**.

---

## 6. Detail Eksekusi P5 — Transaction Trackings (`/trackings` — Bonus FE)

- Buat `TrackingsController.cs` (mengikuti pola yang sama ke `/api/v1/feature/trackings/...`, termasuk `GET /trackings/request-id/{requestId}`).
- Buat halaman `/trackings` (dan/atau drawer/modal dari tombol aksi di baris `/requests`):
  - Dropdown pilih **Request** (`projectCode`) dan **Tracker** (`code` - `description`).
  - Input `value` dinamis mengikuti `actionType` dari Tracker yang dipilih (`text`, `date`, `file`/URL, atau catatan `none`).
  - Mendukung Create, Edit, dan Soft Delete.

---

## 7. Detail Eksekusi P6 — Security Hardening & Unit Tests

### 7.1 Security Checklist Wajib
- [ ] Pastikan `createdBy`, `updatedBy`, `deletedBy` **selalu** diambil dari cookie sesi di BFF (abaikan nilai dari body FE).
- [ ] Pastikan `doHardDelete` selalu `false`.
- [ ] Pastikan `sortBy` divalidasi menggunakan `HashSet` *whitelist* per entity dan `pageSize` dibatasi maksimal `100`.
- [ ] Pastikan `ProblemDetails` di `ExceptionHandlingMiddleware` tidak membocorkan *stack trace* ke client.
- [ ] Cek `git status` dan `git log -p` untuk memastikan `app_id`, `app_key`, `.env.local`, dan `*.db` tidak ada di commit.

### 7.2 Minimum Test Suite (Hijau saat `dotnet test` & `npm test`)
- **Backend (`Tracklab.Tests` - xUnit):**
  1. `PagingHeaderBuilderTests`: uji offset `(page - 1) * limit`, default search `%`, dan Base64 `X-Paging-Include`.
  2. `ValidatorTests`: uji validasi `Tracker` (`code` regex, `mandays >= -1`) dan `Request` (`totalFee >= 0`, `completedDate >= wipDate`).
  3. `AuthServiceTests`: uji alur *two-step login* dan *auto-retry* saat `401`.
  4. `IntegrationTests`: uji endpoint `/api/trackers` dan `/api/requests` mengembalikan `401` jika tanpa cookie sesi.
- **Frontend (Vitest):**
  1. Uji formatter Rupiah (`Rp 400.000,00`) dan tanggal (`20 Jun 2025`).
  2. Uji validasi form modal Tracker/Request menampilkan error saat field wajib kosong.

---

## 8. Detail Eksekusi P7 — README & Final Submission (Maks 16:30 WIB)

1. Lengkapi `README.md` berisi:
   - Arsitektur BFF & keputusan teknis (*Two-Step Auth*, `httpOnly` cookie, SQLite auto-create).
   - Langkah menjalankan Backend (`dotnet user-secrets` + `dotnet run`) dan Frontend (`npm install` + `npm run dev`).
   - Daftar fitur wajib dan bonus yang sudah diimplementasikan (termasuk endpoint `/api/logs` dan `/api/audit-trails`).
   - Bagian **API Findings** (prefix `/api/v1/authentication` vs `/api/v1/feature`, `mandays: -1`, `partnerId` pada Requests).
2. Lakukan **uji clone bersih** di folder terpisah dan jalankan seluruh skenario (Login $\rightarrow$ CRUD Trackers $\rightarrow$ CRUD Requests $\rightarrow$ Filter $\rightarrow$ Logout) sebelum push/submit final.