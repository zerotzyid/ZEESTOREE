# PRD Website Store

Versi 1.0 · Status: Draft · 15 November 2026

## 1. Ringkasan

Website store untuk menjual layanan digital: panel server Pterodactyl, VPS trial, source code, dan saldo akun. Pembayaran otomatis memakai QRIS lewat Pixpayz. Seluruh konten situs, termasuk nama toko dan logo, dikelola dari halaman admin dan disimpan di Firebase Realtime Database (RTDB). Tampilan modern bergaya glassmorphism, mode gelap sebagai default, terinspirasi dari onepay.web.id.

**Stack:** Next.js (App Router, TypeScript), Firebase RTDB lewat REST API, Vercel, Tailwind CSS, shadcn/ui.

## 2. Tujuan dan Non-Tujuan

### Tujuan

- Pelanggan dapat mendaftar, deposit saldo via QRIS, dan membeli produk tanpa campur tangan admin.
- Akun panel Pterodactyl dibuat otomatis setelah pembayaran lunas.
- Admin dapat mengelola produk, panel, pengguna, pesanan, dan seluruh tampilan situs tanpa deploy ulang.
- Tampilan rapi, konsisten, dan profesional di mobile maupun desktop.

### Non-Tujuan (di luar lingkup versi ini)

- Fitur nokos (nomor virtual) Axmisu. Hanya disiapkan menu "Segera hadir" dan node `nokos_orders` kosong.
- Metode pembayaran selain QRIS Pixpayz dan saldo.
- Aplikasi mobile native.
- Marketplace multi-penjual.

## 3. Prinsip Produk (Wajib)

1. **Nol data dummy.** Tidak ada produk, harga, testimoni, statistik, atau status server karangan. Data kosong tampil sebagai empty state yang rapi.
2. **Semua data di RTDB.** Tidak ada teks, nama, warna, kontak, atau gambar yang di-hardcode di kode.
3. **Semua bisa diubah dari admin.** Perubahan tampil tanpa deploy ulang.
4. **Tidak ada klaim palsu.** Tidak ada klaim marketing yang tidak diberikan pemilik (uptime, jumlah pelanggan, dan sejenisnya).
5. **Tidak mengarang spesifikasi API.** Pixpayz mengikuti dokumentasi resmi, Pterodactyl mengikuti dokumentasi resmi, dan hal yang belum pasti ditandai untuk diverifikasi.

## 4. Pengguna

| Peran | Deskripsi | Kebutuhan utama |
| --- | --- | --- |
| Pengunjung | Belum login | Melihat katalog, mendaftar |
| Pelanggan | Pengguna terdaftar | Deposit, beli, kelola pesanan dan perpanjangan |
| Admin | Pemilik/pengelola toko | Mengelola semua data dan pengaturan |

## 5. Ruang Lingkup Fitur

### 5.1 Autentikasi dan Akun

- FR-A1: Pelanggan mendaftar dan login dengan username/email dan password.
- FR-A2: Password disimpan sebagai hash (bcrypt). Sesi memakai JWT di cookie httpOnly.
- FR-A3: Role `user` dan `admin`. Rute `/admin` hanya untuk admin.
- FR-A4: Admin pertama dibuat dari variabel env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`), bukan seed data.
- FR-A5: Admin dapat memblokir (ban) pengguna.
- FR-A6: Rate limit pada login dan pendaftaran.

### 5.2 Beranda dan Katalog (Publik)

- FR-B1: Struktur beranda: header (logo/nama + toggle tema), eyebrow berlabel, headline dua baris (baris kedua berwarna aksen), subteks, dua tombol aksi, tiga chip fitur, visual hero kartu kaca miring, katalog produk, FAQ, footer.
- FR-B2: Tombol bantuan melayang (FAB) dengan bubble yang bisa ditutup, mengarah ke kontak dari pengaturan.
- FR-B3: Katalog dikelompokkan per kategori dan seluruhnya dibaca dari RTDB.
- FR-B4: Visual hero hanya menampilkan angka nyata dari database. Bila belum ada data, elemen disembunyikan atau tampil non-numerik tanpa klaim.
- FR-B5: Toggle tema terang/gelap, default gelap.
- FR-B6: Teks awal (nilai default) hanya yang disediakan pemilik: eyebrow "LAYANAN HOSTING", headline "Layanan server." / "Tanpa alur ribet.", subteks "Panel server, VPS trial, source code, dan saldo akun dalam satu tempat.", tombol "Lihat produk" dan "Buat akun", chip "Checkout saldo", "Riwayat pesanan", "Dashboard akun", bubble "Ada kendala? Kami siap bantu". Nilai ini disimpan ke RTDB saat setup awal dan bisa diubah.

### 5.3 Dashboard Pelanggan

- FR-D1: Menampilkan saldo, pesanan aktif, riwayat transaksi, dan profil.
- FR-D2: Riwayat pesanan dan transaksi dapat difilter berdasarkan status.
- FR-D3: Pelanggan dapat mengganti password dan data profil.

### 5.4 Deposit Saldo (QRIS Pixpayz)

- FR-P1: Pelanggan memasukkan nominal, server membuat invoice di Pixpayz, lalu halaman menampilkan QRIS, total bayar (sudah termasuk fee), dan hitung mundur kedaluwarsa.
- FR-P2: Saldo bertambah otomatis setelah pembayaran terkonfirmasi.
- FR-P3: Webhook `POST /api/webhook/pixpayz` memproses event pembayaran lunas.
- FR-P4: Fallback polling status invoice dari halaman pembayaran, dan Vercel Cron untuk menandai invoice kedaluwarsa.
- FR-P5: Setiap invoice hanya diproses sekali (idempoten).

**Kontrak Pixpayz (sesuai dokumentasi https://pixpayz.com/docs):**

| Tujuan | Endpoint | Catatan |
| --- | --- | --- |
| Buat invoice | `GET /api/createinvoice?apikey=&amount=` | Respons: invoice\_id, amount, fee, total, qris\_image, payment\_link, expired\_at |
| Cek status | `GET /api/checkinvoice?apikey=&id=` | Status "paid" bila lunas |
| Profil/saldo | `GET /api/profile?apikey=` | Opsional untuk admin |

**Keamanan webhook:** dokumentasi tidak menyebut signature. Maka (1) URL webhook membawa token rahasia dan permintaan tanpa token yang cocok ditolak, (2) payload tidak dipercaya, server memanggil `checkinvoice` dan hanya memproses bila status "paid", (3) balas HTTP 2xx dengan cepat (batas waktu mereka 15 detik, retry hingga 5 kali) dan kerjakan proses berat di belakang.

### 5.5 Produk Panel Pterodactyl

- FR-T1: Pelanggan memilih paket, mengisi username, membayar dengan saldo atau QRIS langsung.
- FR-T2: Setelah lunas, sistem membuat user dan server di panel terpilih, lalu menampilkan kredensial di dashboard.
- FR-T3: Admin dapat menambah banyak panel. Per panel admin hanya mengisi: nama, link panel, Application API key, dan Client API key (CAPI).
- FR-T4: Tombol tes koneksi per panel.
- FR-T5: Paket per panel dapat diatur (RAM, disk, CPU, egg, nest, location).
- FR-T6: Saat order, sistem memilih panel aktif yang tersedia. Bila tidak ada, order ditolak dengan pesan jelas dan tidak ada saldo terpotong.
- FR-T7: Perpanjangan server (paket Plus) dari dashboard dan menambah masa aktif.
- FR-T8: Bila pembuatan akun gagal setelah pembayaran, saldo dikembalikan otomatis dan kejadian dicatat di log.
- Catatan: seluruh panggilan ke Pterodactyl memakai endpoint resmi dan diverifikasi dari dokumentasinya. API key disimpan terenkripsi (AES-256) dan tidak pernah dikirim ke browser.

### 5.6 VPS Trial dan Produk Digital

- FR-V1: Produk digital (source code) dibeli dengan saldo atau QRIS, lalu tersedia untuk diunduh dari dashboard.
- FR-V2: VPS trial tampil sebagai produk di katalog. Mekanisme pengirimannya perlu ditentukan (lihat Pertanyaan Terbuka).

### 5.7 Nomor Virtual (Ditunda)

- FR-N1: Menu "Nomor Virtual" tampil sebagai "Segera hadir".
- FR-N2: Node `nokos_orders` disiapkan kosong. Integrasi Axmisu dikerjakan setelah dokumentasinya tersedia.

### 5.8 Halaman Admin (/admin)

- FR-M1: Statistik dari data nyata: omzet, jumlah order, pengguna baru, grafik harian/bulanan. Data kosong tampil sebagai empty state.
- FR-M2: CRUD produk dan kategori (termasuk gambar produk).
- FR-M3: Manajemen multi panel Pterodactyl (lihat 5.5).
- FR-M4: Pengaturan Pixpayz: API key, URL webhook, token rahasia webhook.
- FR-M5: Manajemen pengguna: lihat, ban, ubah saldo manual.
- FR-M6: Manajemen order dan transaksi: ubah status, refund.
- FR-M7: Log aktivitas admin dan transaksi.
- FR-M8: Pengaturan Situs (5.9).
- FR-M9: Tabel admin dilengkapi pencarian, filter, pagination, dan tampilan kartu di mobile.

### 5.9 Pengaturan Situs (Semua Bisa Diubah dari Admin)

Halaman berisi tab-tab berikut, seluruhnya tersimpan di RTDB:

| Tab | Isi yang dapat diubah |
| --- | --- |
| Identitas | Nama toko, tagline, title dan meta description SEO, logo, favicon |
| Beranda | Eyebrow, headline baris 1 dan 2, subteks, teks tombol, tiga chip, teks bubble bantuan, banner |
| Tampilan | Warna aksen, aktif/nonaktif toggle tema, teks footer |
| Kontak | WhatsApp, Telegram, email |
| FAQ | Tambah, ubah, hapus, urutkan |
| Operasional | Maintenance mode dan pesannya |
| Teks sistem | Nama/label menu, judul halaman, pesan yang tampil ke pengguna |

- FR-S1: Perubahan tampil di situs dalam hitungan detik tanpa deploy ulang, dan tersedia pratinjau sebelum disimpan.
- FR-S2: Setiap penyimpanan divalidasi dan dicatat di `logs`.
- FR-S3: Nama toko dan logo awalnya kosong. Bila logo belum diunggah, situs menampilkan nama toko sebagai teks.

### 5.10 Logo dan Gambar Kustom (Base64)

- FR-G1: Admin mengunggah logo, favicon, dan banner. Browser mengonversi ke base64 (data URL) dan server menyimpannya di RTDB pada node `assets` yang terpisah dari teks pengaturan.
- FR-G2: Format yang diizinkan hanya PNG, JPG, dan WEBP. SVG ditolak karena risiko XSS.
- FR-G3: Kompresi otomatis di browser: logo maks 512px sisi terpanjang dan di bawah 200 KB, banner maks 1600px dan di bawah 500 KB, dikonversi ke WEBP. File yang masih melebihi batas ditolak dengan pesan jelas.
- FR-G4: Server memvalidasi ulang prefix data URL, tipe MIME, ukuran, dan keabsahan base64 sebelum menulis.
- FR-G5: Gambar disajikan lewat route `/api/asset/[nama]` dengan header cache agar base64 tidak diunduh berulang. Favicon juga disajikan lewat route ini.
- FR-G6: Tersedia tombol ganti dan hapus, serta pratinjau di tema gelap dan terang.

## 6. Arsitektur dan Data

### 6.1 Akses Database: REST API RTDB (Tanpa Firebase Admin SDK)

- Seluruh akses RTDB dilakukan lewat REST API (`https://<db>.firebaseio.com/<path>.json`) dari server Next.js. Firebase Admin SDK tidak dipakai sama sekali.
- Operasi yang dipakai: GET, PUT, PATCH, POST, DELETE, serta query parameter (orderBy, limitToFirst, dan sejenisnya) sesuai dokumentasi REST RTDB.
- Operasi yang butuh konsistensi (potong saldo, tandai invoice diproses) memakai penulisan bersyarat dengan ETag atau teknik setara yang didukung REST API. Detail teknisnya wajib diverifikasi dari dokumentasi resmi.
- Satu modul tunggal `lib/rtdb` membungkus semua panggilan (get/set/update/push/remove/transaksi) agar logika bisnis tidak memanggil fetch langsung.
- Kredensial akses server disimpan di env Vercel dan tidak pernah dikirim ke browser. Metode autentikasi REST (token OAuth2 dari service account atau alternatif lain) harus diputuskan dan diverifikasi dari dokumentasi Firebase sebelum implementasi (lihat Pertanyaan Terbuka).
- Realtime di sisi pengguna (mis. status pembayaran) memakai polling ringan atau server-sent events dari REST RTDB bila didukung.

### 6.2 Struktur Node RTDB

| Node | Isi |
| --- | --- |
| `users` | Akun, hash password, role, saldo, status ban |
| `products`, `categories` | Katalog |
| `panels` | Data panel Pterodactyl (key terenkripsi) |
| `orders` | Pesanan dan statusnya |
| `transactions` | Mutasi saldo |
| `invoices` | Invoice Pixpayz dan status pemrosesan |
| `settings` | Identitas, beranda, tampilan, kontak, FAQ, operasional |
| `assets` | Gambar base64 (logo, favicon, banner, gambar produk) |
| `logs` | Log aktivitas |
| `nokos_orders` | Disiapkan kosong |

### 6.3 Aturan Keamanan Database

- Klien (browser) tidak menulis langsung ke RTDB. Semua penulisan lewat API route server.
- Node `settings` bagian teks boleh dibaca publik. Node `assets` dan data sensitif dibaca lewat route server.
- Security Rules RTDB disertakan dalam dokumen rilis dan ditinjau sebelum produksi.

### 6.4 Alur Order

1. Pelanggan memilih produk, lalu memilih bayar saldo atau QRIS.
2. Saldo: server memotong saldo secara aman (penulisan bersyarat), membuat order, mengeksekusi fulfillment.
3. QRIS: server membuat invoice Pixpayz dan menyimpannya di `invoices`. Setelah lunas (webhook atau polling terverifikasi), order dieksekusi.
4. Gagal eksekusi: refund otomatis ke saldo dan tercatat di log.

## 7. Persyaratan Non-Fungsional

- **Tampilan:** satu design system (token warna, spasi skala 4/8 px, radius, shadow, tipografi). Warna aksen dari pengaturan admin lewat CSS variable. Glassmorphism: blur latar, border tipis semi-transparan, radius 16-24 px.
- **Responsif:** nyaman dari lebar 360 px hingga desktop, tanpa scroll horizontal, target sentuh minimal 44 px.
- **State lengkap:** loading (skeleton), kosong, error dengan tombol coba lagi, sukses, dan disabled di semua halaman.
- **Bahasa dan format:** seluruh antarmuka berbahasa Indonesia baku, mata uang Rupiah, tanggal dan jam WIB.
- **Aksesibilitas:** kontras memadai di kedua tema, fokus keyboard terlihat, aria-label, dan menghormati prefers-reduced-motion.
- **Kinerja:** gambar base64 dikompresi dan di-cache, pengaturan teks dibaca ringan terpisah dari aset.
- **Keamanan:** semua key di env atau terenkripsi, validasi input (zod), rate limit pada login dan order, middleware role admin, perlindungan CSRF, log audit.
- **Kualitas:** tanpa tombol mati, tautan rusak, atau error di console.

## 8. Rencana Rilis (4 Fase)

Pembagian fase dibuat agar tiap fase mandiri dan dapat dilanjutkan oleh sesi atau akun lain tanpa kehilangan konteks. Setiap fase diakhiri ringkasan: sudah dikerjakan, belum dikerjakan, dan asumsi.

| Fase | Cakupan | Hasil yang dapat diuji |
| --- | --- | --- |
| 1. Fondasi | Setup Next.js, modul `lib/rtdb` (REST), autentikasi, role, design system, sistem pengaturan situs, upload logo base64 | Login admin, ubah nama dan logo, tema berjalan |
| 2. Tampilan dan Katalog | Beranda sesuai struktur, katalog, FAQ, footer, empty state, halaman auth, dashboard pelanggan dasar | Beranda penuh dari data RTDB |
| 3. Pembayaran | Integrasi Pixpayz (invoice, webhook, polling, cron kedaluwarsa), deposit saldo, mutasi saldo, riwayat transaksi | Deposit QRIS sampai saldo bertambah |
| 4. Layanan dan Admin Lengkap | Multi panel Pterodactyl, pembuatan akun otomatis, perpanjangan, produk digital dan VPS trial, manajemen user dan order, statistik, log, refund | Order panel dari bayar sampai akun jadi |

## 9. Kriteria Penerimaan (Ringkas)

- Tidak ada data dummy di kode, database awal, maupun tampilan.
- Admin dapat mengubah seluruh teks di beranda, nama toko, kontak, FAQ, dan warna aksen, dan perubahan tampil tanpa deploy.
- Logo base64 diunggah dari admin, tersimpan di RTDB, tampil di header dan sebagai favicon, serta ditolak bila format atau ukurannya tidak sesuai.
- Deposit QRIS menambah saldo satu kali saja, termasuk bila webhook dikirim berulang atau dipalsukan.
- Order panel membuat akun di panel yang dipilih, dan gagal-bayar atau gagal-buat akun tidak membuat saldo hilang.
- Tidak ada pemanggilan Firebase Admin SDK di kode.
- Semua halaman lolos pemeriksaan responsif di 360 px dan tidak ada error console.

## 10. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Webhook Pixpayz tanpa signature dapat dipalsukan | Token rahasia di URL dan verifikasi ulang lewat `checkinvoice` |
| Pemrosesan ganda invoice atau saldo | Penulisan bersyarat di REST RTDB dan flag `processed` |
| Race condition potong saldo tanpa transaksi bawaan SDK | Penulisan bersyarat ETag atau teknik setara dan pengujian konkurensi |
| Base64 membengkakkan bandwidth RTDB | Kompresi WEBP, batas ukuran, route cache, node `assets` terpisah |
| SVG berisi skrip berbahaya | SVG ditolak |
| API key panel bocor | Enkripsi AES-256, tidak pernah dikirim ke browser |
| Panel mati saat order | Tes koneksi, pilih panel aktif, refund otomatis |
| Halusinasi saat pengembangan berbantuan AI | Aturan anti halusinasi pada prompt dan verifikasi dokumentasi |

## 11. Pertanyaan Terbuka

1. Metode autentikasi REST RTDB dari server yang dipakai (token OAuth2 dari service account atau alternatif lain), sesuai dokumentasi Firebase terbaru.
2. Mekanisme pengiriman VPS trial: dibuat otomatis lewat penyedia tertentu, atau diproses manual oleh admin?
3. Daftar paket panel (nama, spesifikasi, harga, masa aktif) yang akan diisi admin. Tidak ditentukan di PRD ini agar tidak ada data karangan.
4. Kebijakan refund dan masa aktif perpanjangan paket Plus.
5. Batas nominal minimum dan maksimum deposit, serta masa berlaku invoice, dari kebijakan Pixpayz.
6. Saluran kontak bantuan utama (WhatsApp atau Telegram) untuk FAB.
7. Jadwal integrasi nokos Axmisu dan ketersediaan dokumentasinya.
