# Design — PPDB SMP Bugfix

## Affected Files
- `smp.html` — atribut HTML, aksesibilitas toast
- `script-smp.js` — validasi, kompresi gambar, logika GPS
- `api-ppdb-smp.js` — rowData kode_pos

---

## Fix 1: Koordinat Bisa Diisi Manual (`smp.html` + `script-smp.js`)

**smp.html:** Hapus atribut `readonly` dari input `koordinat`. Perbarui placeholder.

**script-smp.js:** Tidak ada perubahan logika — input sudah terhubung ke `koordinatInput` dan validasi `required` sudah ada di `validateStep()`.

---

## Fix 2: `kode_pos` ke Spreadsheet (`api-ppdb-smp.js`)

Tambahkan `payload.kode_pos` ke array `rowData` setelah `payload.provinsi` (posisi 25, geser kolom berikutnya).

---

## Fix 3 & 4: Validasi Email & Tanggal Lahir (`script-smp.js`)

Tambahkan ke fungsi `validateStep()`:
- Cek regex email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Cek `tanggal_lahir` tidak di masa depan dan tidak sebelum 1990-01-01

Tambahkan ke init: set `max` dan `min` pada input `tanggal_lahir` secara dinamis.

---

## Fix 5: Kompresi Gambar (`script-smp.js`)

Ganti fungsi `getFileBase64()` dengan versi yang:
1. Cek apakah file adalah gambar (`file.type.startsWith('image/')`)
2. Jika gambar: buat `Image` object → gambar ke `canvas` dengan max dimension 1200px → `canvas.toBlob()` dengan quality 0.75 → konversi blob ke Base64
3. Jika bukan gambar (PDF): langsung `FileReader.readAsDataURL()` seperti sebelumnya

---

## Fix 6: Aksesibilitas Toast (`smp.html`)

Tambahkan `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` ke elemen `#toast`.
