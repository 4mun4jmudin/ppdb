# Panduan Update Google Apps Script & Google Sheets PPDB

Karena kita telah menambahkan banyak fitur baru ke dalam formulir pendaftaran (seperti deteksi koordinat, informasi kakak/adik, data KPS, alamat orang tua, dan alasan memilih sekolah) serta **menghapus field Jalur Pendaftaran**, struktur database di Google Sheets dan script di Google Apps Script (GAS) harus diupdate ulang agar data tidak tertukar atau gagal masuk.

Kegagalan menyamakan urutan dapat menyebabkan:
1. Data meleset (misal: "Alamat Rumah" masuk ke kolom "Transportasi").
2. Error saat *submit* form karena variabel tidak ditemukan.
3. Sebagian data penting menghilang.

## Langkah 1: Update Struktur Kolom di Google Sheets

Buka file Google Sheets tempat Anda menampung pendaftaran PPDB. Hapus kolom "Jalur Pendaftaran". Pastikan baris pertama (Baris 1) memiliki urutan *Header Kolom* yang persis sama dengan urutan di bawah ini, dari kolom **A** sampai kolom **BP** (Total 68 Kolom).

> [!WARNING]
> Jangan sampai ada kolom yang tertinggal atau terbalik urutannya. Kolom-kolom yang ada tanda **[BARU]** atau **[HAPUS]** di bawah wajib Anda sesuaikan lokasinya.

| Kolom | Nama Field / Header | Keterangan |
| :---: | :--- | :--- |
| **A** | Waktu Submit | Dihasilkan otomatis oleh script |
| **B** | Pilihan Jurusan 1 | |
| **C** | Pilihan Jurusan 2 | |
| **D** | Asal Sekolah | |
| **E** | NPSN Sekolah Asal | |
| **F** | Tahun Lulus | |
| **G** | Prestasi | **[BARU]** |
| **H** | Nama Lengkap | |
| **I** | Jenis Kelamin | |
| **J** | NISN | |
| **K** | NIK Siswa | |
| **L** | No. Kartu Keluarga | |
| **M** | Tempat Lahir | |
| **N** | Tanggal Lahir | |
| **O** | Agama | |
| **P** | Anak Ke- | |
| **Q** | Jumlah Saudara | |
| **R** | Jumlah Kakak | **[BARU]** |
| **S** | Jumlah Adik | **[BARU]** |
| **T** | No. HP Siswa | |
| **U** | Email Siswa | |
| **V** | No KPS/KKS/PKH/KIP | **[BARU]** |
| **W** | Koordinat | **[UBAH]** Posisi digeser jadi di atas alamat |
| **X** | Alamat Lengkap Rumah | **[UBAH]** Tadi alamat_jalan |
| **Y** | RT | |
| **Z** | RW | |
| **AA** | Dusun | |
| **AB** | Desa / Kelurahan | |
| **AC** | Kecamatan | |
| **AD** | Kabupaten / Kota | |
| **AE** | Provinsi | **[BARU]** |
| **AF** | Kode Pos | |
| **AG** | Jenis Tempat Tinggal | |
| **AH** | Moda Transportasi | |
| **AI** | Jarak ke Sekolah | |
| **AJ** | Waktu Tempuh | **[BARU]** |
| **AK** | Nama Ayah | |
| **AL** | Status Ayah | **[BARU]** (Masih Hidup/Meninggal) |
| **AM** | Tahun Meninggal Ayah | **[BARU]** |
| **AN** | NIK Ayah | |
| **AO** | Tahun Lahir Ayah | |
| **AP** | Pendidikan Ayah | |
| **AQ** | Pekerjaan Ayah | |
| **AR** | Penghasilan Ayah | |
| **AS** | No. HP Ayah | |
| **AT** | Nama Ibu | |
| **AU** | Status Ibu | **[BARU]** (Masih Hidup/Meninggal) |
| **AV** | Tahun Meninggal Ibu | **[BARU]** |
| **AW** | NIK Ibu | |
| **AX** | Tahun Lahir Ibu | |
| **AY** | Pendidikan Ibu | |
| **AZ** | Pekerjaan Ibu | |
| **BA** | Penghasilan Ibu | |
| **BB** | No. HP Ibu | |
| **BC** | Alamat Ortu Sama | **[BARU]** |
| **BD** | Detail Alamat Ortu | **[BARU]** |
| **BE** | Nama Wali | |
| **BF** | NIK Wali | |
| **BG** | Tahun Lahir Wali | |
| **BH** | Pendidikan Wali | |
| **BI** | Pekerjaan Wali | |
| **BJ** | Penghasilan Wali | |
| **BK** | No. HP Wali | |
| **BL** | Tinggi Badan | |
| **BM** | Berat Badan | |
| **BN** | Golongan Darah | |
| **BO** | Riwayat Penyakit | |
| **BP** | Alasan Memilih YT Al-Hawari | **[BARU]** |

---

## Langkah 2: Deploy Ulang Google Apps Script

Setelah Anda mengatur kolom-kolom di Sheets, file `api-ppdb.js` pada repositori lokal ini sudah saya perbarui dengan urutan variabel (sampai variabel ke-68) yang sesuai tabel di atas. 

Lakukan *copy-paste* ke server Google dengan langkah berikut:

1. Buka kembali file Google Sheets Anda.
2. Klik **Ekstensi > Apps Script**.
3. Hapus seluruh kode `Code.gs` yang ada saat ini.
4. Buka file `api-ppdb.js` di project lokal Anda ini, lalu **Copy (Ctrl+C)** isinya.
5. **Paste (Ctrl+V)** isi file tersebut ke dalam `Code.gs` di layar Apps Script Anda.
6. Klik tombol 💾 **Save**.

> [!IMPORTANT]
> Meresave script saja **tidak cukup!!!** Karena kita mengubah struktur, kita wajib membuat URL API baru dari awal. URL yang lama masih menggunakan code yang lama! Ikuti Langkah 3 di bawah.

## Langkah 3: Membuat Deploy-an Baru (Wajib!)

Setiap ada perubahan kode di GAS, URL Web App harus di-*deploy* ulang agar efektif:

1. Klik tombol biru **Terapkan (Deploy)** di pojok kanan atas Apps Script.
2. Pilih **Deployment Baru (New Deployment)**.
3. Di sebelah "Pilih Jenis" pastikan bentuk roda gigi dicentang pada **Aplikasi Web (Web App)**.
4. Di bagian deskripsi, ketik (misalnya): `Update V3 (Hapus Jalur Pendaftaran)`.
5. Pastikan:
   * Execute As: **Me (Email Anda)**
   * Who has access: **Anyone (Siapa Saja)**
6. Klik **Terapkan (Deploy)**. *(Anda mungkin diminta melakukan otorisasi / Authorize akses Google Account lagi jika ada popup "Review Permissions").*
7. Selesai! Anda akan mendapatkan tautan Web URL yang baru. Copy link panjang tersebut yang diakhiri kata `.../exec`.

## Langkah 4: Hubungkan Frontend ke Backend Baru

1. Buka file `script.js` di komputer Anda.
2. Scroll ke bagian atas, temukan variabel konstan ini:
   ```javascript
   const scriptURL = '<URL_LAMA_ANDA_DISINI>';
   ```
3. Ganti `<URL_LAMA_ANDA_DISINI>` menjadi Web URL `/exec` baru yang Anda dapat dari Langkah 3.
4. Save file `script.js`.

> [!TIP]
> Jika semua langkah di atas dilakukan dengan tepat secara berurutan, form pendaftaran sudah sepenuhnya terintegrasi dengan Sheets baru dan tidak ada data yang *miss-placed*. Anda bisa mencoba dummy (Alt + P) lagi untuk ngetes *flow* datanya langsung ke Google Sheets!
