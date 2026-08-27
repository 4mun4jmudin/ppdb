// ============================================================
//  PPDB Online - SMP IT Al-Hawari
//  api-ppdb-smp.js — Google Apps Script Backend (KHUSUS SMP)
//  Versi: 1.0 (JSON + File Upload via Base64)
// ============================================================
//
//  CARA PAKAI:
//  1. Buka script.google.com → Buat project BARU (terpisah dari SMK)
//  2. Paste SELURUH isi file ini ke editor Apps Script
//  3. Ganti DRIVE_FOLDER_ID dengan ID folder Drive tujuan SMP
//  4. Klik Deploy → New Deployment → Web App
//  5. Execute as: Me | Who has access: Anyone
//  6. Salin URL deployment → paste ke script-smp.js (variabel scriptURL_SMP)
// ============================================================

// ===================== KONFIGURASI =====================

// 1. ID Google Sheet tujuan penyimpanan data SMP.
//    Buka Google Sheet → lihat URL → salin ID di antara /d/ dan /edit
//    Contoh: https://docs.google.com/spreadsheets/d/[ID_INI]/edit
var SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_SMP';

// 2. ID folder Google Drive tujuan penyimpanan lampiran SMP.
var DRIVE_FOLDER_ID = '1PFQ54zcMk2kTS9SUsC1pWHfuzASmo8eU'; // Folder: Lampiran PPDB SMP 2026

// ===================== FUNGSI UTAMA =====================

/**
 * Fungsi utama yang dipanggil saat form SMP dikirim (HTTP POST).
 * Frontend mengirimkan payload JSON (bukan URLSearchParams).
 * @param {Object} e - Event object dari Google Apps Script
 */
function doPost(e) {
  try {
    // -------------------------------------------------------
    // 1. Parse JSON payload dari body request
    //    Frontend mengirim dengan Content-Type: text/plain
    //    sehingga data ada di e.postData.contents
    // -------------------------------------------------------
    var payload = JSON.parse(e.postData.contents);

    // -------------------------------------------------------
    // 2. Akses Google Sheet target menggunakan ID spreadsheet.
    //    PENTING: Script standalone HARUS pakai openById(), bukan getActiveSpreadsheet().
    //    Pastikan nama tab sheet persis: "Data_Pendaftar_SMP"
    // -------------------------------------------------------
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Data_Pendaftar_SMP');

    // Jika sheet tidak ditemukan, lempar error agar mudah dideteksi
    if (!sheet) {
      throw new Error('Sheet "Data_Pendaftar_SMP" tidak ditemukan! Pastikan nama tab sheet sudah benar.');
    }

    // -------------------------------------------------------
    // 3. Catat timestamp submit
    // -------------------------------------------------------
    var timestamp = new Date();

    // -------------------------------------------------------
    // 4. Upload file lampiran ke Google Drive
    //    Setiap file dikirim sebagai objek { base64, name, mimeType }
    //    Fungsi uploadToDrive() mengembalikan URL akses publik.
    // -------------------------------------------------------
    var urlIjazah = uploadToDrive(payload.fileIjazah, 'Ijazah_SMP_'  + (payload.nisn || 'unknown'));
    var urlSHUSM  = uploadToDrive(payload.fileSHUSM,  'SHUSM_SMP_'   + (payload.nisn || 'unknown'));
    var urlPhoto  = uploadToDrive(payload.filePhoto,  'Photo_SMP_'   + (payload.nisn || 'unknown'));
    var urlKK     = uploadToDrive(payload.fileKK,     'KK_SMP_'      + (payload.nisn || 'unknown'));
    var urlKTP    = uploadToDrive(payload.fileKTP,    'KTP_SMP_'     + (payload.nisn || 'unknown'));
    var urlAkta   = uploadToDrive(payload.fileAkta,   'Akta_SMP_'    + (payload.nisn || 'unknown'));
    var urlKIP    = uploadToDrive(payload.fileKIP,    'KIP_SMP_'     + (payload.nisn || 'unknown'));

    // -------------------------------------------------------
    // 5. Susun baris data sesuai urutan kolom di Google Sheet
    //    PENTING: Pastikan header Google Sheet SMP sama persis
    //    dengan urutan kolom di bawah ini.
    // -------------------------------------------------------
    var rowData = [
      timestamp,                          // 1  (A)  Waktu Submit

      // DATA PRIBADI SISWA (dari formulir SMP - sesuai foto formulir)
      payload.nama_lengkap,               // 2  (B)  Nama Lengkap
      payload.jenis_kelamin,              // 3  (C)  Jenis Kelamin
      payload.nisn,                       // 4  (D)  NISN (10 digit)
      payload.nik,                        // 5  (E)  NIK (16 digit)
      payload.no_kk,                      // 6  (F)  No. KK (16 digit)
      payload.tempat_lahir,               // 7  (G)  Tempat Lahir
      payload.tanggal_lahir,              // 8  (H)  Tanggal Lahir
      payload.agama,                      // 9  (I)  Agama
      payload.anak_ke,                    // 10 (J)  Anak Ke-
      payload.jml_saudara,                // 11 (K)  Jumlah Saudara
      payload.jml_kakak,                  // 12 (L)  Jumlah Kakak
      payload.jml_adik,                   // 13 (M)  Jumlah Adik
      payload.no_hp_siswa,                // 14 (N)  No. HP Siswa
      payload.email_siswa,                // 15 (O)  Email Siswa
      payload.no_kps,                     // 16 (P)  No. KPS / KKS
      payload.alamat_rumah,               // 17 (Q)  Alamat Lengkap
      payload.rt,                         // 18 (R)  RT
      payload.rw,                         // 19 (S)  RW
      payload.desa,                       // 20 (T)  Desa/Kelurahan
      payload.dusun,                      // 21 (U)  Dusun/Kampung
      payload.kecamatan,                  // 22 (V)  Kecamatan
      payload.kabupaten,                  // 23 (W)  Kabupaten
      payload.provinsi,                   // 24 (X)  Provinsi
      payload.jenis_tinggal,              // 25 (Y)  Jenis Tempat Tinggal
      payload.transportasi,               // 26 (Z)  Transportasi ke Sekolah
      payload.asal_sekolah,               // 27 (AA) Sekolah / Madrasah Asal
      payload.npsn_asal,                  // 28 (AB) NPSN Sekolah Asal
      payload.tahun_lulus,                // 29 (AC) Tahun Lulus SD/MI
      payload.prestasi,                   // 30 (AD) Prestasi
      payload.koordinat,                  // 31 (AE) Koordinat GPS
      payload.jarak_sekolah,              // 32 (AF) Jarak ke Sekolah
      payload.waktu_tempuh,               // 33 (AG) Waktu Tempuh

      // DATA AYAH KANDUNG
      payload.nama_ayah,                  // 34 (AH) Nama Ayah
      payload.nik_ayah,                   // 35 (AI) NIK Ayah
      payload.tahun_lahir_ayah,           // 36 (AJ) Tahun Lahir Ayah
      payload.pendidikan_ayah,            // 37 (AK) Pendidikan Ayah
      payload.pekerjaan_ayah,             // 38 (AL) Pekerjaan Ayah
      payload.penghasilan_ayah,           // 39 (AM) Penghasilan Ayah
      payload.no_hp_ayah,                 // 40 (AN) No HP Ayah
      payload.status_ayah,                // 41 (AO) Status Ayah (Hidup/Meninggal)
      payload.tahun_meninggal_ayah,       // 42 (AP) Tahun Meninggal Ayah

      // DATA IBU KANDUNG
      payload.nama_ibu,                   // 43 (AQ) Nama Ibu
      payload.nik_ibu,                    // 44 (AR) NIK Ibu
      payload.tahun_lahir_ibu,            // 45 (AS) Tahun Lahir Ibu
      payload.pendidikan_ibu,             // 46 (AT) Pendidikan Ibu
      payload.pekerjaan_ibu,              // 47 (AU) Pekerjaan Ibu
      payload.penghasilan_ibu,            // 48 (AV) Penghasilan Ibu
      payload.no_hp_ibu,                  // 49 (AW) No HP Ibu
      payload.status_ibu,                 // 50 (AX) Status Ibu (Hidup/Meninggal)
      payload.tahun_meninggal_ibu,        // 51 (AY) Tahun Meninggal Ibu

      // ALAMAT ORANG TUA
      payload.alamat_ortu_sama,           // 52 (AZ) Alamat sama dengan siswa?
      payload.alamat_ortu,                // 53 (BA) Alamat Orang Tua (jika beda)

      // DATA WALI (Opsional)
      payload.nama_wali,                  // 54 (BB) Nama Wali
      payload.nik_wali,                   // 55 (BC) NIK Wali
      payload.tahun_lahir_wali,           // 56 (BD) Tahun Lahir Wali
      payload.pendidikan_wali,            // 57 (BE) Pendidikan Wali
      payload.pekerjaan_wali,             // 58 (BF) Pekerjaan Wali
      payload.penghasilan_wali,           // 59 (BG) Penghasilan Wali
      payload.no_hp_wali,                 // 60 (BH) No HP Wali

      // DATA FISIK (Opsional)
      payload.tinggi_badan,               // 61 (BI) Tinggi Badan
      payload.berat_badan,                // 62 (BJ) Berat Badan
      payload.gol_darah,                  // 63 (BK) Golongan Darah
      payload.riwayat_penyakit,           // 64 (BL) Riwayat Penyakit

      // INFORMASI TAMBAHAN
      payload.alasan_memilih,             // 65 (BM) Alasan Memilih SMP IT Al-Hawari

      // URL LAMPIRAN GOOGLE DRIVE
      urlIjazah,                          // 66 (BN) URL Ijazah SD/MI
      urlSHUSM,                           // 67 (BO) URL SHUS/M (Surat Hasil US/M)
      urlPhoto,                           // 68 (BP) URL Pas Photo 3x4
      urlKK,                              // 69 (BQ) URL Kartu Keluarga
      urlKTP,                             // 70 (BR) URL KTP Orang Tua
      urlAkta,                            // 71 (BS) URL Akta Kelahiran/Komsen
      urlKIP                              // 72 (BT) URL KIP/KIS/KPS/KKS (jika ada)
    ];

    // -------------------------------------------------------
    // 6. Tambahkan baris baru ke Google Sheet
    // -------------------------------------------------------
    sheet.appendRow(rowData);

    // -------------------------------------------------------
    // 7. Kembalikan response sukses
    // -------------------------------------------------------
    return ContentService
      .createTextOutput(JSON.stringify({
        "result": "success",
        "row": sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Kembalikan response error agar mudah dideteksi saat debugging
    return ContentService
      .createTextOutput(JSON.stringify({
        "result": "error",
        "error": error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===================== HELPER: UPLOAD FILE KE DRIVE =====================

/**
 * Mengupload satu file ke Google Drive dari data Base64.
 *
 * @param {Object|null} fileObj - Objek file dari frontend:
 *   { base64: string, name: string, mimeType: string }
 *   Bisa null / undefined jika user tidak memilih file (opsional).
 * @param {string} prefixName - Prefix nama file di Drive
 * @returns {string} URL file di Google Drive, atau string kosong jika tidak ada file.
 */
function uploadToDrive(fileObj, prefixName) {
  if (!fileObj || !fileObj.base64) {
    return '';
  }

  try {
    var decodedBytes = Utilities.base64Decode(fileObj.base64);
    var blob = Utilities.newBlob(decodedBytes, fileObj.mimeType, prefixName + '_' + fileObj.name);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log('Error uploading file "' + prefixName + '": ' + err.message);
    return 'ERROR_UPLOAD: ' + err.message;
  }
}

// ===================== TRIGGER OTORISASI (JALANKAN SEKALI MANUAL) =====================

/**
 * FUNGSI INI DIJALANKAN SEKALI SAJA SECARA MANUAL dari editor Apps Script.
 * Tujuannya adalah memancing munculnya layar OAuth consent Google agar
 * script mendapat izin untuk mengakses DriveApp (Google Drive).
 *
 * CARA PAKAI:
 *  1. Buka Google Apps Script Editor (script.google.com)
 *  2. Pilih fungsi ini dari dropdown di toolbar (nama: "beriIzinDrive")
 *  3. Klik tombol ▶ "Jalankan"
 *  4. Ikuti semua langkah izin yang muncul
 */
function beriIzinDrive() {
  DriveApp.getRootFolder();
  Logger.log("✅ Izin Google Drive berhasil diberikan! Script SMP siap mengupload file.");
}
