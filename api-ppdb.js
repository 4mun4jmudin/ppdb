// ============================================================
//  PPDB Online - SMK IT Al-Hawari
//  api-ppdb.js — Google Apps Script Backend
//  Versi: 2.0 (JSON + File Upload via Base64)
// ============================================================

// ===================== KONFIGURASI =====================
// GANTI dengan ID folder Google Drive tujuan penyimpanan lampiran.
// Cara mendapatkan ID folder: buka folder Drive -> lihat URL -> salin string panjang setelah /folders/
var DRIVE_FOLDER_ID = '1xpMIWKjwe-vICxZD5TWTeoUzVvS3LQ11';

// ===================== FUNGSI UTAMA =====================

/**
 * Fungsi utama yang dipanggil saat form dikirim (HTTP POST).
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
    // 2. Akses Google Sheet target
    // -------------------------------------------------------
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data_Pendaftar");

    // -------------------------------------------------------
    // 3. Catat timestamp submit
    // -------------------------------------------------------
    var timestamp = new Date();

    // -------------------------------------------------------
    // 4. Upload 6 file lampiran ke Google Drive
    //    Setiap file dikirim sebagai objek { base64, name, mimeType }
    //    Fungsi uploadToDrive() akan mengembalikan URL akses publik.
    // -------------------------------------------------------
    var urlIjazah = uploadToDrive(payload.fileIjazah, 'Ijazah_' + (payload.nisn || 'unknown'));
    var urlKK     = uploadToDrive(payload.fileKK,     'KK_'     + (payload.nisn || 'unknown'));
    var urlKTP    = uploadToDrive(payload.fileKTP,    'KTP_'    + (payload.nisn || 'unknown'));
    var urlAkta   = uploadToDrive(payload.fileAkta,   'Akta_'   + (payload.nisn || 'unknown'));
    var urlKIP    = uploadToDrive(payload.fileKIP,    'KIP_'    + (payload.nisn || 'unknown'));
    var urlPhoto  = uploadToDrive(payload.filePhoto,  'Photo_'  + (payload.nisn || 'unknown'));

    // -------------------------------------------------------
    // 5. Susun baris data sesuai urutan kolom di Google Sheet
    //    PENTING: Urutan ini HARUS sama persis dengan header
    //    kolom (A, B, C, ...) di dalam Google Sheets.
    // -------------------------------------------------------
    var rowData = [
      timestamp,                          // 1  (A)  Waktu Submit

      // DATA PENDAFTARAN
      payload.jurusan_1,                  // 2  (B)
      payload.jurusan_2,                  // 3  (C)
      payload.asal_sekolah,               // 4  (D)
      payload.npsn_asal,                  // 5  (E)
      payload.tahun_lulus,                // 6  (F)
      payload.prestasi,                   // 7  (G)

      // DATA PRIBADI SISWA
      payload.nama_lengkap,               // 8  (H)
      payload.jenis_kelamin,              // 9  (I)
      payload.nisn,                       // 10 (J)
      payload.nik,                        // 11 (K)
      payload.no_kk,                      // 12 (L)
      payload.tempat_lahir,               // 13 (M)
      payload.tanggal_lahir,              // 14 (N)
      payload.agama,                      // 15 (O)
      payload.anak_ke,                    // 16 (P)
      payload.jml_saudara,                // 17 (Q)
      payload.jml_kakak,                  // 18 (R)
      payload.jml_adik,                   // 19 (S)
      payload.no_hp_siswa,                // 20 (T)
      payload.email_siswa,                // 21 (U)
      payload.no_kps,                     // 22 (V)

      // DATA ALAMAT & DOMISILI
      payload.koordinat,                  // 23 (W)
      payload.alamat_rumah,               // 24 (X)
      payload.rt,                         // 25 (Y)
      payload.rw,                         // 26 (Z)
      payload.dusun,                      // 27 (AA)
      payload.desa,                       // 28 (AB)
      payload.kecamatan,                  // 29 (AC)
      payload.kabupaten,                  // 30 (AD)
      payload.provinsi,                   // 31 (AE)
      payload.kode_pos,                   // 32 (AF)
      payload.jenis_tinggal,              // 33 (AG)
      payload.transportasi,               // 34 (AH)
      payload.jarak_sekolah,              // 35 (AI)
      payload.waktu_tempuh,               // 36 (AJ)

      // DATA AYAH
      payload.nama_ayah,                  // 37 (AK)
      payload.status_ayah,                // 38 (AL)
      payload.tahun_meninggal_ayah,       // 39 (AM)
      payload.nik_ayah,                   // 40 (AN)
      payload.tahun_lahir_ayah,           // 41 (AO)
      payload.pendidikan_ayah,            // 42 (AP)
      payload.pekerjaan_ayah,             // 43 (AQ)
      payload.penghasilan_ayah,           // 44 (AR)
      payload.no_hp_ayah,                 // 45 (AS)

      // DATA IBU
      payload.nama_ibu,                   // 46 (AT)
      payload.status_ibu,                 // 47 (AU)
      payload.tahun_meninggal_ibu,        // 48 (AV)
      payload.nik_ibu,                    // 49 (AW)
      payload.tahun_lahir_ibu,            // 50 (AX)
      payload.pendidikan_ibu,             // 51 (AY)
      payload.pekerjaan_ibu,              // 52 (AZ)
      payload.penghasilan_ibu,            // 53 (BA)
      payload.no_hp_ibu,                  // 54 (BB)

      // ALAMAT ORANG TUA
      payload.alamat_ortu_sama,           // 55 (BC)
      payload.alamat_ortu,                // 56 (BD)

      // DATA WALI
      payload.nama_wali,                  // 57 (BE)
      payload.nik_wali,                   // 58 (BF)
      payload.tahun_lahir_wali,           // 59 (BG)
      payload.pendidikan_wali,            // 60 (BH)
      payload.pekerjaan_wali,             // 61 (BI)
      payload.penghasilan_wali,           // 62 (BJ)
      payload.no_hp_wali,                 // 63 (BK)

      // DATA FISIK & LAINNYA
      payload.tinggi_badan,               // 64 (BL)
      payload.berat_badan,                // 65 (BM)
      payload.gol_darah,                  // 66 (BN)
      payload.riwayat_penyakit,           // 67 (BO)

      // INFORMASI TAMBAHAN
      payload.yang_membiayai || payload.alasan_memilih || "Orang Tua", // 68 (BP) Yang Membiayai Sekolah
      payload.kebutuhan_khusus || "Tidak Ada", // 69 (BQ) Kebutuhan Khusus

      // URL LAMPIRAN GOOGLE DRIVE
      urlKK,                              // 70 (BR) Upload KK (Google Drive Link)
      urlAkta,                            // 71 (BS) Upload Akta Kelahiran (Google Drive Link)
      urlIjazah,                          // 72 (BT) Upload Ijazah / SKL (Google Drive Link)
      urlPhoto,                           // 73 (BU) Upload Pas Foto (Google Drive Link)
      urlKIP,                             // 74 (BV) Upload Dokumen Lain (Google Drive Link)

      // KELOLA
      payload.uid || "",                  // 75 (BW) ID Pendaftaran
      payload.status || "Menunggu Verifikasi" // 76 (BX) Status Verifikasi
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
 *   (misal 'Ijazah_1234567890')
 * @returns {string} URL file di Google Drive, atau string kosong jika tidak ada file.
 */
function uploadToDrive(fileObj, prefixName) {
  // Jika fileObj kosong / null / tidak ada field base64, skip upload
  if (!fileObj || !fileObj.base64) {
    return ''; // Kembalikan string kosong (kolom akan kosong di Sheet)
  }

  try {
    var base64Data = fileObj.base64;
    var contentType = fileObj.mimeType || '';
    
    // Deteksi jika input merupakan Base64 Data URL (berawalan 'data:')
    if (base64Data.indexOf(',') !== -1) {
      var splitBase = base64Data.split(',');
      if (splitBase[0].indexOf(';') !== -1) {
        contentType = splitBase[0].split(';')[0].split(':')[1];
      }
      base64Data = splitBase[1];
    }

    // 1. Decode Base64 string menjadi byte array
    var decodedBytes = Utilities.base64Decode(base64Data);
    if (decodedBytes.length > 10 * 1024 * 1024) {
      throw new Error('Ukuran file "' + prefixName + '" melebihi batas maksimal 10 MB.');
    }

    // 2. Buat Blob (representasi file binary di GAS)
    var blob = Utilities.newBlob(decodedBytes, contentType, prefixName + '_' + fileObj.name);

    // 3. Akses folder Drive target menggunakan ID folder
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // 4. Simpan file ke dalam folder
    var file = folder.createFile(blob);

    // 5. Set permission: siapa saja yang punya link bisa melihat
    //    (Agar URL bisa diakses admin tanpa login)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 6. Kembalikan URL akses file
    return file.getUrl();

  } catch (err) {
    // Log error ke Apps Script console dan kembalikan pesan error
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
 *  4. Ikuti semua langkah izin yang muncul (lihat panduan di bawah)
 *
 * Setelah izin diberikan, fungsi ini TIDAK perlu dijalankan lagi.
 */
function beriIzinDrive() {
  // Akses root folder Drive — ini cukup untuk memancing OAuth consent
  DriveApp.getRootFolder();
  Logger.log("✅ Izin Google Drive berhasil diberikan! Script siap mengupload file.");
}