# 📋 Panduan Setup PPDB Online — SMP IT Al-Hawari

> Dokumen ini menjelaskan langkah-langkah untuk menghubungkan form pendaftaran SMP
> (`smp.html`) ke **Google Sheets** (penyimpanan data) dan **Google Drive** (penyimpanan file lampiran).
>
> ⚠️ Form SMP **terpisah sepenuhnya** dari form SMK — gunakan Sheet, Drive Folder,
> dan Apps Script yang **berbeda** agar data tidak campur.

---

## 📁 Struktur File SMP

```
ppdb-web/
├── smp.html          → Halaman form pendaftaran SMP (4 langkah)
├── script-smp.js     → Logika form: navigasi, validasi, submit, geolokasi
├── api-ppdb-smp.js   → Kode Google Apps Script (backend/server)
├── style.css         → Stylesheet (dipakai bersama SMK & SMP)
└── panduan_setup_smp.md  → File ini
```

---

## 🗂️ STEP 1 — Buat Google Sheet Baru

1. Buka **[sheets.google.com](https://sheets.google.com)**
2. Klik tombol **"+" Buat Spreadsheet Baru** (kosong)
3. Beri nama file: **`PPDB SMP IT Al-Hawari 2026`**
4. Di bagian bawah, **klik kanan pada tab sheet** → pilih **Ganti Nama**
5. Ganti namanya menjadi persis: **`Data_Pendaftar_SMP`**

   > ⚠️ Nama sheet harus persis sama karena kode Apps Script menggunakan nama ini untuk menulis data.

6. Isi **baris pertama (header)** dengan kolom berikut (salin semua):

| Kolom | Isi Header |
|-------|-----------|
| A | Waktu Submit |
| B | Nama Lengkap |
| C | Jenis Kelamin |
| D | NISN |
| E | NIK |
| F | Tempat Lahir |
| G | Tanggal Lahir |
| H | Agama |
| I | Alamat Rumah |
| J | RT |
| K | RW |
| L | Desa/Kelurahan |
| M | Dusun |
| N | Kecamatan |
| O | Kabupaten |
| P | Provinsi |
| Q | Jenis Tinggal |
| R | Transportasi |
| S | No HP |
| T | No KPS/KIP |
| U | Asal Sekolah SD/MI |
| V | NPSN Asal |
| W | Tahun Lulus |
| X | Prestasi |
| Y | Koordinat GPS |
| Z | Jarak Sekolah |
| AA | Waktu Tempuh |
| AB | Nama Ayah |
| AC | Thn Lahir Ayah |
| AD | Pendidikan Ayah |
| AE | Pekerjaan Ayah |
| AF | Penghasilan Ayah |
| AG | Status Ayah |
| AH | Thn Meninggal Ayah |
| AI | Nama Ibu |
| AJ | Thn Lahir Ibu |
| AK | Pendidikan Ibu |
| AL | Pekerjaan Ibu |
| AM | Penghasilan Ibu |
| AN | Status Ibu |
| AO | Thn Meninggal Ibu |
| AP | Alamat Ortu Sama |
| AQ | Alamat Ortu |
| AR | Tinggi Badan |
| AS | Berat Badan |
| AT | Golongan Darah |
| AU | Riwayat Penyakit |
| AV | Alasan Memilih |
| AW | URL Ijazah SD/MI |
| AX | URL Kartu Keluarga |
| AY | URL KTP Orang Tua |
| AZ | URL Akta Kelahiran |
| BA | URL KIP |
| BB | URL Pas Photo |

---

## 🗄️ STEP 2 — Buat Folder Google Drive Khusus SMP

1. Buka **[drive.google.com](https://drive.google.com)**
2. Klik **"+ Baru"** → **Folder**
3. Beri nama: **`Lampiran PPDB SMP 2026`**
4. Buka folder tersebut → perhatikan **URL di address bar** browser:

   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                           ↑──────────────────────────
                                           Salin ID ini saja
   ```

5. **Simpan ID folder** tersebut — akan dipakai di STEP 3.

---

## ⚙️ STEP 3 — Buat Google Apps Script Baru

> Apps Script adalah "server" yang menerima data dari form dan menyimpannya ke Sheet & Drive.
> Untuk SMP harus **project baru** terpisah dari SMK.

### Opsi A — Dari Google Sheet (Direkomendasikan ✅)

1. Buka Google Sheet yang sudah dibuat di STEP 1
2. Klik menu **"Ekstensi"** → **"Apps Script"**
3. Editor akan terbuka — script otomatis terhubung ke Sheet tersebut

### Opsi B — Dari script.google.com

1. Buka **[script.google.com](https://script.google.com)**
2. Klik **"Proyek Baru"**
3. Sambungkan ke Sheet dengan: **Sumber Daya → Layanan Google yang Tertaut**

---

### Memasukkan Kode

1. Di editor Apps Script, **hapus semua kode** yang ada (`Ctrl+A` → `Delete`)
2. Buka file **`api-ppdb-smp.js`** di VS Code / text editor
3. **Salin semua isinya** (`Ctrl+A` → `Ctrl+C`)
4. **Paste** ke editor Apps Script (`Ctrl+V`)
5. **Ganti nilai `DRIVE_FOLDER_ID`** di baris paling atas:

   ```javascript
   // SEBELUM:
   var DRIVE_FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_DRIVE_SMP_ANDA';

   // SESUDAH (gunakan ID dari STEP 2):
   var DRIVE_FOLDER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz';
   ```

6. Tekan **`Ctrl+S`** untuk menyimpan — beri nama project: **`PPDB SMP Backend`**

---

## 🔑 STEP 4 — Beri Izin Akses Google Drive (Sekali Saja)

Ini wajib dilakukan agar script dapat menyimpan file ke Google Drive.

1. Di editor Apps Script, cari **dropdown nama fungsi** di toolbar atas (biasanya bertuliskan `doPost` atau `myFunction`)
2. Klik dropdown → pilih fungsi: **`beriIzinDrive`**
3. Klik tombol **▶ Jalankan**
4. Akan muncul popup **"Otorisasi Diperlukan"** → klik **"Tinjau izin"**
5. Pilih akun Google Anda
6. Klik **"Lanjutkan"** (mungkin ada peringatan "tidak diverifikasi" — pilih "Lanjutkan" juga)
7. Centang semua izin → klik **"Izinkan"**
8. Cek bagian **"Log Eksekusi"** di bawah — harus muncul:
   ```
   ✅ Izin Google Drive berhasil diberikan! Script SMP siap mengupload file.
   ```

---

## 🚀 STEP 5 — Deploy sebagai Web App

1. Di editor Apps Script → klik tombol **"Deploy"** (pojok kanan atas)
2. Pilih **"Deployment Baru"** / **"New Deployment"**
3. Klik ikon **⚙️** di samping "Pilih jenis" → pilih **"Aplikasi Web"** / **"Web App"**
4. Isi form deployment:

   | Field | Nilai |
   |-------|-------|
   | **Deskripsi** | `PPDB SMP IT Al-Hawari v1.0` |
   | **Jalankan sebagai** | `Saya (email kamu)` |
   | **Siapa yang dapat mengakses** | `Semua orang` / `Anyone` |

5. Klik **"Deploy"**
6. Izinkan akses jika diminta (sama seperti STEP 4)
7. **Salin URL Web App** yang muncul — formatnya:

   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

   > ⚠️ Simpan URL ini! Akan dipakai di STEP 6.

---

## 🔗 STEP 6 — Sambungkan URL ke Form SMP

1. Buka file **`script-smp.js`** di VS Code
2. Cari baris paling atas:

   ```javascript
   // SEBELUM:
   const scriptURL_SMP = 'GANTI_DENGAN_URL_GOOGLE_APPS_SCRIPT_SMP';
   ```

3. Ganti dengan URL dari STEP 5:

   ```javascript
   // SESUDAH:
   const scriptURL_SMP = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```

4. Simpan file (`Ctrl+S`)

---

## 🧪 STEP 7 — Test Pengiriman Data

1. Buka file **`smp.html`** di browser
2. Tekan **`Alt + P`** di keyboard → tombol 🎲 **Dummy** muncul di pojok kanan bawah
3. Klik tombol **🎲 Dummy** → semua field terisi otomatis dengan data acak
4. Klik **"Lanjut"** sampai Step 4 (Lampiran) → upload file contoh
5. Klik **"Kirim Pendaftaran"**
6. Tunggu hingga muncul popup **"Pendaftaran Berhasil!"**
7. Buka Google Sheet → cek apakah baris data baru muncul ✅
8. Buka Google Drive folder → cek apakah file lampiran tersimpan ✅

---

## 🔄 Update Kode Apps Script (Jika Ada Perubahan)

> Setiap kali isi `api-ppdb-smp.js` diubah, harus **deploy ulang** agar perubahan aktif.

1. Buka project Apps Script SMP
2. Update kode sesuai perubahan di `api-ppdb-smp.js`
3. Klik **"Deploy"** → **"Kelola Deployment"** / **"Manage Deployments"**
4. Klik ikon ✏️ **Edit** di deployment yang aktif
5. Ubah versi: **"Buat Versi Baru"**
6. Klik **"Deploy"**

> ✅ URL deployment **tidak berubah** saat menggunakan "Manage Deployments".
> Tidak perlu update `script-smp.js` lagi.

---

## ❗ Troubleshooting

### Data tidak masuk ke Sheet
- Pastikan nama sheet persis: **`Data_Pendaftar_SMP`** (huruf besar/kecil sensitif)
- Pastikan `scriptURL_SMP` di `script-smp.js` sudah diisi URL yang benar
- Cek **"Log Eksekusi"** di Apps Script untuk melihat pesan error

### File tidak tersimpan di Drive (ERROR_UPLOAD)
- Pastikan sudah menjalankan fungsi **`beriIzinDrive`** secara manual (STEP 4)
- Pastikan **`DRIVE_FOLDER_ID`** sudah diisi dengan benar
- Pastikan folder Drive **tidak dihapus** atau dipindahkan

### Error CORS / No Response
- Ini **normal** dengan konfigurasi `mode: 'no-cors'`
- Data tetap terkirim meski tidak ada response yang terbaca
- Verifikasi dengan cek langsung di Google Sheet

### Popup sukses muncul tapi data tidak ada di Sheet
- Coba tunggu 30 detik, kadang ada delay
- Cek Log Eksekusi di Apps Script
- Lakukan test ulang dari tombol 🎲 Dummy

---

## 📌 Catatan Penting

| Item | Nilai |
|------|-------|
| Nama Sheet | `Data_Pendaftar_SMP` |
| Nama Project Apps Script | `PPDB SMP Backend` |
| File Backend | `api-ppdb-smp.js` |
| File Frontend JS | `script-smp.js` |
| Variable URL di JS | `scriptURL_SMP` |
| Shortcut Dev Mode | **Alt + P** |
| Batas Ukuran File Upload | **5 MB per file** |

---

*Dibuat: April 2026 — PPDB Online SMP IT Al-Hawari*
