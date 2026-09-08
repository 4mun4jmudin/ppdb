# Dokumen Pengujian Black Box - Sistem PPDB

Dokumen ini berisi skenario pengujian Black Box untuk sistem PPDB, disusun secara mendetail berdasarkan setiap halaman yang ada di dalam sistem.

## 1. Halaman Login

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 1.1 | Form Login - Input Kosong | Mengosongkan form NISN dan Password lalu klik 'Masuk' | NISN: [kosong], Password: [kosong] | Sistem menampilkan pesan peringatan wajib isi pada field NISN dan Password. | |
| 1.2 | Form Login - NISN Kosong | Mengisi Password tanpa mengisi NISN lalu klik 'Masuk' | NISN: [kosong], Password: password123 | Sistem menampilkan peringatan bahwa NISN harus diisi. | |
| 1.3 | Form Login - Password Kosong | Mengisi NISN tanpa mengisi Password lalu klik 'Masuk' | NISN: 1234567890, Password: [kosong] | Sistem menampilkan peringatan bahwa Password harus diisi. | |
| 1.4 | Form Login - Kredensial Salah | Memasukkan NISN atau Password yang tidak terdaftar/salah | NISN: 1111111111, Password: salah | Sistem menampilkan pesan error "Kredensial tidak valid" atau "Gagal login". | |
| 1.5 | Form Login - Akses Admin | Memasukkan kredensial khusus Admin | Username/NISN: Admin, Password: Password Admin yang benar | Sistem berhasil login dan mengarahkan pengguna ke Halaman Dashboard Admin. | |
| 1.6 | Form Login - Akses Siswa | Memasukkan kredensial Siswa yang valid | NISN: 1234567890, Password: Password yang benar | Sistem berhasil login dan menyimpan sesi, lalu mengarahkan ke Halaman Dashboard Siswa. | |
| 1.7 | Navigasi ke Registrasi | Mengklik tautan "Daftar di sini" | N/A | Sistem mengarahkan pengguna ke Halaman Registrasi. | |
| 1.8 | Keamanan - Tampil/Sembunyikan Password | Mengklik ikon mata (jika ada) pada field password | Password: textrahasia | Teks password berubah menjadi karakter yang bisa dibaca, dan sebaliknya saat diklik lagi. | |

## 2. Halaman Registrasi

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 2.1 | Form Registrasi - Input Kosong | Mengosongkan semua field lalu klik 'Daftar' | NISN: [kosong], Nama: [kosong], dll | Sistem menampilkan pesan peringatan bahwa field wajib harus diisi. | |
| 2.2 | Form Registrasi - NISN Tidak Valid | Memasukkan format NISN yang salah (misal kurang dari 10 digit atau mengandung huruf) | NISN: 12345ABC | Sistem menolak input dan menampilkan pesan format NISN tidak valid. | |
| 2.3 | Form Registrasi - NISN Sudah Terdaftar | Mendaftar menggunakan NISN yang sudah ada di database | NISN: [NISN yang sudah ada] | Sistem menampilkan pesan error bahwa NISN sudah terdaftar. | |
| 2.4 | Form Registrasi - Konfirmasi Password Salah | Memasukkan Password dan Konfirmasi Password yang berbeda | Password: pass123, Konfirmasi: pass456 | Sistem menampilkan peringatan bahwa konfirmasi password tidak cocok. | |
| 2.5 | Form Registrasi - Pendaftaran Berhasil | Mengisi semua data dengan format yang benar dan belum terdaftar | Data Registrasi Valid Lengkap | Sistem berhasil mendaftarkan akun, menampilkan pesan sukses, dan mengarahkan ke Halaman Login. | |
| 2.6 | Navigasi ke Login | Mengklik tautan "Masuk di sini" | N/A | Sistem mengarahkan pengguna kembali ke Halaman Login. | |

## 3. Halaman Dashboard Siswa

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 3.1 | Akses Tanpa Login | Mengakses halaman langsung via URL tanpa sesi aktif | N/A | Sistem memblokir akses dan mengarahkan pengguna kembali ke Halaman Login. | |
| 3.2 | Tampilan Data Pengguna | Login sebagai siswa dan melihat dashboard | Sesi Siswa Valid | Sistem menampilkan Nama, NISN, dan Status Pendaftaran siswa yang sedang login. | |
| 3.3 | Navigasi Menu - Biodata | Mengklik menu "Isi Formulir Biodata" | N/A | Sistem memuat antarmuka Halaman Biodata. | |
| 3.4 | Navigasi Menu - Unggah Dokumen | Mengklik menu "Unggah Dokumen" | N/A | Sistem memuat antarmuka Halaman Unggah Dokumen. | |
| 3.5 | Navigasi Menu - Cetak Kartu | Mengklik menu "Cetak Kartu Ujian" | Status Pendaftaran: Terverifikasi | Sistem membuka tab baru/mengarahkan ke Halaman Cetak Kartu dengan data siswa. | |
| 3.6 | Tombol Logout | Mengklik tombol "Keluar" atau "Logout" | N/A | Sistem menghapus sesi aktif dan mengarahkan pengguna kembali ke Halaman Login. | |

## 4. Halaman Biodata (Formulir Pendaftaran)

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 4.1 | Form Biodata - Load Data Awal | Membuka halaman biodata | Sesi Siswa Valid | Field NISN dan Nama terisi otomatis (readonly) berdasarkan data registrasi. | |
| 4.2 | Form Biodata - Input Wajib Kosong | Mengosongkan field wajib (misal: Alamat, Tempat Lahir) lalu Submit | Beberapa field wajib dikosongkan | Sistem menampilkan pesan peringatan bahwa field tersebut wajib diisi. | |
| 4.3 | Form Biodata - Format Tanggal | Memasukkan tanggal lahir dengan format yang salah atau tanggal tidak logis | Tanggal Lahir: 31-02-2005 | Sistem menolak input atau memaksa menggunakan pemilih tanggal (date picker) yang valid. | |
| 4.4 | Form Biodata - Simpan Berhasil | Mengisi seluruh form dengan data valid lalu klik 'Simpan' | Semua Data Biodata Valid | Sistem mengirim data ke backend, menampilkan notifikasi sukses, dan menyimpan kemajuan (progress). | |

## 5. Halaman Unggah Dokumen

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 5.1 | Form Unggah - Tanpa File | Mengklik 'Unggah' tanpa memilih file satupun | File: [kosong] | Sistem menampilkan peringatan bahwa file harus dipilih. | |
| 5.2 | Form Unggah - Format Salah | Memilih file dengan ekstensi selain yang diizinkan (selain JPG, PNG, PDF) | File: dokumen.docx | Sistem menolak file dan menampilkan pesan bahwa format tidak didukung. | |
| 5.3 | Form Unggah - Ukuran Terlalu Besar | Memilih file yang ukurannya melebihi batas maksimal | File: gambar_5MB.jpg | Sistem menolak file dan menampilkan pesan batas ukuran file terlampaui. | |
| 5.4 | Proses OCR (Gemini AI) | Mengunggah dokumen yang valid dan mendukung pembacaan OCR | File Kartu Keluarga (KK) valid | Sistem mengekstrak teks menggunakan AI (terlihat animasi loading) dan mengisi field data yang relevan secara otomatis. | |
| 5.5 | Fallback Model OCR | Mematikan koneksi ke model utama (simulasi) lalu mengunggah file | File KK valid, Model Utama Error | Sistem secara otomatis mencoba model fallback (gemini-flash lainnya) dan memproses dokumen tanpa putus. | |
| 5.6 | Unggah Dokumen Berhasil | Mengunggah semua dokumen wajib dengan format dan ukuran valid | File KK, Ijazah, Foto valid | Sistem memproses konversi ke base64, mengirim ke backend, dan menampilkan notifikasi sukses. | |

## 6. Halaman Cetak Kartu

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 6.1 | Akses Tanpa Verifikasi | Siswa dengan status 'Belum Verifikasi' mencoba mencetak kartu | Status: Belum Verifikasi | Sistem menampilkan pesan penolakan atau menonaktifkan/menyembunyikan tombol cetak. | |
| 6.2 | Tampilan Data Kartu | Siswa yang sudah terverifikasi membuka halaman cetak | Status: Terverifikasi | Data yang tampil di kartu (Nama, NISN, Pas Foto) sesuai dengan data profil siswa dari backend. | |
| 6.3 | Tombol Print (Cetak) | Mengklik tombol 'Cetak' di halaman kartu | N/A | Sistem memunculkan dialog pencetakan bawaan browser (`window.print()`). | |

## 7. Halaman Dashboard Admin

| No | Fungsi yang Diuji | Skenario Pengujian | Data Uji | Hasil yang Diharapkan | Status (Pass/Fail) |
|---|---|---|---|---|---|
| 7.1 | Akses Non-Admin | Siswa biasa mencoba mengakses URL halaman admin | Sesi Siswa Aktif | Sistem menolak akses dan mengarahkan kembali ke dashboard siswa atau halaman login. | |
| 7.2 | Tampil Tabel Data Siswa | Admin membuka halaman admin | Data Pendaftar di Database | Tabel menampilkan daftar siswa yang mendaftar secara dinamis dengan kolom lengkap dan pagination (jika ada). | |
| 7.3 | Fitur Pencarian/Filter | Mencari nama siswa tertentu pada kolom pencarian tabel | Kata Kunci: "Budi" | Tabel otomatis menyaring dan hanya menampilkan baris yang mengandung kata "Budi". | |
| 7.4 | Aksi Verifikasi Data | Admin mengklik tombol "Verifikasi" pada salah satu pendaftar | Siswa belum diverifikasi | Status pendaftar berubah menjadi terverifikasi dan notifikasi sukses (alert/toast) muncul. | |
| 7.5 | Ekspor Data Dapodik | Mengklik tombol Ekspor ke format Dapodik | N/A | Sistem mengunduh file CSV dengan format kolom yang sesuai dengan standar integrasi Dapodik. | |
| 7.6 | Ekspor Data Nilai | Mengklik tombol Ekspor ke format Data Nilai | N/A | Sistem mengunduh file CSV dengan format daftar rekap nilai. | |
| 7.7 | Ekspor Arsip (Archive) | Mengklik tombol Ekspor ke format Arsip | N/A | Sistem mengunduh file CSV berisi seluruh raw data pendaftaran lengkap (backup). | |
