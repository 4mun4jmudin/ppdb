# Requirements — PPDB SMP Bugfix

## Overview
Perbaikan bug dan masalah yang ditemukan dari analisa proyek PPDB SMP IT Al-Hawari. Bukan fitur baru.

---

## Requirement 1 — Koordinat GPS Bisa Diisi Manual
**User Story:** Sebagai pendaftar yang menolak izin GPS, saya ingin tetap bisa mengisi koordinat secara manual agar form bisa dilanjutkan.

### Acceptance Criteria
- 1.1 Field `koordinat` tidak lagi `readonly` — user bisa mengetik langsung
- 1.2 Placeholder diperbarui untuk memberi petunjuk format manual (`-6.123456, 106.123456`)
- 1.3 Jika GPS berhasil, nilai tetap terisi otomatis seperti sebelumnya
- 1.4 Validasi `required` tetap berlaku — field tidak boleh kosong saat submit

---

## Requirement 2 — Field `kode_pos` Tersimpan ke Spreadsheet
**User Story:** Sebagai admin, saya ingin kode pos pendaftar tersimpan di spreadsheet agar data alamat lengkap.

### Acceptance Criteria
- 2.1 `payload.kode_pos` ditambahkan ke `rowData` di `api-ppdb-smp.js`
- 2.2 Posisi kolom kode pos konsisten dengan urutan kolom yang sudah ada (setelah `provinsi`)

---

## Requirement 3 — Validasi Format Email (Client-side)
**User Story:** Sebagai pendaftar, saya ingin mendapat pesan error jika email yang saya isi formatnya salah.

### Acceptance Criteria
- 3.1 Validasi format email dilakukan saat step yang mengandung field email divalidasi
- 3.2 Pesan error ditampilkan via toast jika format email tidak valid
- 3.3 Field email diberi class `invalid` jika format salah

---

## Requirement 4 — Validasi Tanggal Lahir Tidak Boleh Masa Depan
**User Story:** Sebagai sistem, saya ingin mencegah input tanggal lahir yang tidak masuk akal (masa depan atau terlalu jauh ke belakang).

### Acceptance Criteria
- 4.1 Tanggal lahir tidak boleh lebih dari hari ini
- 4.2 Tanggal lahir tidak boleh sebelum tahun 1990 (untuk siswa SD/SMP)
- 4.3 Atribut `max` dan `min` di-set secara dinamis via JavaScript saat halaman dimuat

---

## Requirement 5 — Kompresi Gambar Sebelum Upload
**User Story:** Sebagai pendaftar dengan koneksi lambat, saya ingin file yang dikirim lebih kecil agar tidak timeout.

### Acceptance Criteria
- 5.1 File gambar (JPEG/PNG) dikompres menggunakan canvas resize sebelum dikonversi ke Base64
- 5.2 Dimensi maksimal hasil kompres: 1200px (lebar atau tinggi, mana yang lebih besar)
- 5.3 Kualitas JPEG output: 0.75
- 5.4 File non-gambar (PDF) tidak dikompres, langsung dikonversi ke Base64
- 5.5 Batas ukuran file tetap 5MB (sebelum kompres)

---

## Requirement 6 — Aksesibilitas Toast/Notifikasi
**User Story:** Sebagai pengguna dengan screen reader, saya ingin notifikasi error/sukses dapat dibaca oleh assistive technology.

### Acceptance Criteria
- 6.1 Elemen toast memiliki atribut `role="alert"` dan `aria-live="assertive"`
- 6.2 Elemen toast memiliki `aria-atomic="true"`
