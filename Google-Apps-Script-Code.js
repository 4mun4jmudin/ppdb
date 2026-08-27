// ============================================================
//  PPDB Online - Al-Hawari
//  FULL Google Apps Script Backend (SMP & SMK + Admin Kelola)
// ============================================================

var DRIVE_FOLDER_ID_SMP = '1PFQ54zcMk2kTS9SUsC1pWHfuzASmo8eU'; 
var DRIVE_FOLDER_ID_SMK = '1xpMIWKjwe-vICxZD5TWTeoUzVvS3LQ11';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    var response = {};

    if (action === "register") {
      response = handleRegister(payload);
    } else if (action === "login") {
      response = handleLogin(payload);
    } else if (action === "submit_form") {
      response = handleSubmitForm(payload);
    } else if (action === "get_data") {
      response = handleGetData(payload);
    } else if (action === "update_status") {
      response = handleUpdateStatus(payload);
    } else if (action === "get_user_status") {
      response = handleGetUserStatus(payload);
    } else {
      response = { success: false, message: "Action tidak valid" };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --------------------------------------------------
// 1. REGISTER
// --------------------------------------------------
function handleRegister(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return { success: false, message: "Sheet 'Users' tidak ditemukan" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === payload.email) {
      return { success: false, message: "Email sudah terdaftar" };
    }
  }

  var newId = Utilities.getUuid();
  sheet.appendRow([
    newId,
    payload.nama,
    payload.email,
    payload.password,
    "siswa",
    payload.jenjang
  ]);

  return { success: true, message: "Registrasi berhasil", user: { uid: newId, nama: payload.nama, email: payload.email, role: "siswa", jenjang: payload.jenjang } };
}

// --------------------------------------------------
// 2. LOGIN
// --------------------------------------------------
function handleLogin(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return { success: false, message: "Sheet 'Users' tidak ditemukan" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === payload.email && data[i][3] === payload.password) {
      return { 
        success: true, 
        message: "Login berhasil",
        user: { uid: data[i][0], nama: data[i][1], email: data[i][2], role: data[i][4], jenjang: data[i][5] }
      };
    }
  }
  return { success: false, message: "Email atau Password salah" };
}

// --------------------------------------------------
// 3. SUBMIT FORM (SMP & SMK)
// --------------------------------------------------
function handleSubmitForm(payload) {
  var jenjang = payload.jenjang || "SMK";
  var sheetName = (jenjang === "SMP") ? "Data_Pendaftar_SMP" : "Data_Pendaftar_SMK";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  // Fallback jika nama sheet belum dipisah
  if (!sheet) {
    sheet = ss.getSheetByName("Data_Pendaftar") || ss.getActiveSheet();
  }

  var timestamp = new Date();
  var folderId = (jenjang === "SMP") ? DRIVE_FOLDER_ID_SMP : DRIVE_FOLDER_ID_SMK;

  function findExistingDriveFileUrl(targetFolderId, prefix) {
    try {
      var folder = DriveApp.getFolderById(targetFolderId);
      var files = folder.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        var fName = f.getName();
        if (fName.indexOf(prefix) === 0 || fName.indexOf(prefix.replace(/_/g, " ")) === 0) {
          return f.getUrl();
        }
      }
    } catch(e) {
      Logger.log("Error find existing file (" + prefix + "): " + e.toString());
    }
    return "";
  }

  function uploadFile(fileObj, prefix) {
    if (!fileObj || !fileObj.base64) return "";
    try {
      var base64Str = fileObj.base64;
      var contentType = fileObj.mimeType || "image/jpeg";
      
      // Jika format Base64 Data URL (data:image/jpeg;base64,....)
      if (base64Str.indexOf(",") !== -1) {
        var parts = base64Str.split(",");
        var header = parts[0];
        base64Str = parts[1];
        if (header.indexOf(":") !== -1 && header.indexOf(";") !== -1) {
          contentType = header.split(":")[1].split(";")[0];
        }
      }
      
      // Bersihkan whitespace
      base64Str = base64Str.replace(/\s/g, '');
      
      var decoded = Utilities.base64Decode(base64Str);
      var rawExt = (fileObj.name && fileObj.name.lastIndexOf(".") !== -1) ? fileObj.name.substring(fileObj.name.lastIndexOf(".")) : ".jpg";
      var fileName = prefix + "_" + (fileObj.name || ("dokumen" + rawExt));
      var blob = Utilities.newBlob(decoded, contentType, fileName);
      
      var targetFolderId = folderId || DRIVE_FOLDER_ID_SMK;
      var folder = DriveApp.getFolderById(targetFolderId);
      var file = folder.createFile(blob);
      
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(shareErr) {
        Logger.log("Warning setSharing (" + prefix + "): " + shareErr.toString());
      }
      
      return file.getUrl();
    } catch(e) {
      Logger.log("Error upload file (" + prefix + "): " + e.toString());
      return "";
    }
  }

  // Upload Files ke Google Drive (mengembalikan link URL Drive)
  var nisnClean = payload.nisn || payload.nik || payload.uid || "siswa";
  var urlKK     = uploadFile(payload.fileKK,     "KK_"     + nisnClean) || findExistingDriveFileUrl(folderId, "KK_" + nisnClean);
  var urlAkta   = uploadFile(payload.fileAkta,   "Akta_"   + nisnClean) || findExistingDriveFileUrl(folderId, "Akta_" + nisnClean);
  var urlIjazah = uploadFile(payload.fileIjazah, "Ijazah_" + nisnClean) || findExistingDriveFileUrl(folderId, "Ijazah_" + nisnClean);
  var urlPhoto  = uploadFile(payload.filePhoto,  "Photo_"  + nisnClean) || findExistingDriveFileUrl(folderId, "Photo_" + nisnClean);
  var urlKIP    = uploadFile(payload.fileKIP || payload.fileLain, "KIP_" + nisnClean) || findExistingDriveFileUrl(folderId, "KIP_" + nisnClean);
  var urlKTP    = uploadFile(payload.fileKTP,    "KTP_"    + nisnClean) || findExistingDriveFileUrl(folderId, "KTP_" + nisnClean);
  var urlSHUSM  = (jenjang === "SMP") ? (uploadFile(payload.fileSHUSM, "SHUSM_" + nisnClean) || findExistingDriveFileUrl(folderId, "SHUSM_" + nisnClean)) : "";

  var rowData = [];
  
  if (jenjang === "SMP") {
    rowData = [
      timestamp,                          // 1  (A)  Waktu Submit
      payload.nama_lengkap,               // 2  (B)  Nama Lengkap
      payload.jenis_kelamin,              // 3  (C)  Jenis Kelamin
      payload.nisn,                       // 4  (D)  NISN
      payload.nik,                        // 5  (E)  NIK
      payload.no_kk,                      // 6  (F)  No. KK
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
      payload.nama_ayah,                  // 34 (AH) Nama Ayah
      payload.nik_ayah,                   // 35 (AI) NIK Ayah
      payload.tahun_lahir_ayah,           // 36 (AJ) Tahun Lahir Ayah
      payload.pendidikan_ayah,            // 37 (AK) Pendidikan Ayah
      payload.pekerjaan_ayah,             // 38 (AL) Pekerjaan Ayah
      payload.penghasilan_ayah,           // 39 (AM) Penghasilan Ayah
      payload.no_hp_ayah,                 // 40 (AN) No HP Ayah
      payload.status_ayah,                // 41 (AO) Status Ayah (Hidup/Meninggal)
      payload.tahun_meninggal_ayah,       // 42 (AP) Tahun Meninggal Ayah
      payload.nama_ibu,                   // 43 (AQ) Nama Ibu
      payload.nik_ibu,                    // 44 (AR) NIK Ibu
      payload.tahun_lahir_ibu,            // 45 (AS) Tahun Lahir Ibu
      payload.pendidikan_ibu,             // 46 (AT) Pendidikan Ibu
      payload.pekerjaan_ibu,              // 47 (AU) Pekerjaan Ibu
      payload.penghasilan_ibu,            // 48 (AV) Penghasilan Ibu
      payload.no_hp_ibu,                  // 49 (AW) No HP Ibu
      payload.status_ibu,                 // 50 (AX) Status Ibu (Hidup/Meninggal)
      payload.tahun_meninggal_ibu,        // 51 (AY) Tahun Meninggal Ibu
      payload.alamat_ortu_sama,           // 52 (AZ) Alamat sama dengan siswa?
      payload.alamat_ortu,                // 53 (BA) Alamat Orang Tua (jika beda)
      payload.nama_wali,                  // 54 (BB) Nama Wali
      payload.nik_wali,                   // 55 (BC) NIK Wali
      payload.tahun_lahir_wali,           // 56 (BD) Tahun Lahir Wali
      payload.pendidikan_wali,            // 57 (BE) Pendidikan Wali
      payload.pekerjaan_wali,             // 58 (BF) Pekerjaan Wali
      payload.penghasilan_wali,           // 59 (BG) Penghasilan Wali
      payload.no_hp_wali,                 // 60 (BH) No HP Wali
      payload.tinggi_badan,               // 61 (BI) Tinggi Badan
      payload.berat_badan,                // 62 (BJ) Berat Badan
      payload.gol_darah,                  // 63 (BK) Golongan Darah
      payload.riwayat_penyakit,           // 64 (BL) Riwayat Penyakit
      payload.alasan_memilih,             // 65 (BM) Alasan Memilih
      urlIjazah,                          // 66 (BN) URL Ijazah SD/MI
      urlSHUSM,                           // 67 (BO) URL SHUS/M
      urlPhoto,                           // 68 (BP) URL Pas Photo
      urlKK,                              // 69 (BQ) URL Kartu Keluarga
      urlKTP,                             // 70 (BR) URL KTP Orang Tua
      urlAkta,                            // 71 (BS) URL Akta Kelahiran
      urlKIP                              // 72 (BT) URL KIP
    ];
  } else {
    // Format SMK (Sesuai Persis Header Sheet: A - BX)
    rowData = [
      timestamp,                          // 1  (A)  Waktu Submit
      payload.jurusan_1 || payload.jurusan1 || "", // 2  (B) Pilihan Jurusan 1
      payload.jurusan_2 || payload.jurusan2 || "", // 3  (C) Pilihan Jurusan 2
      payload.asal_sekolah,               // 4  (D) Asal Sekolah
      payload.npsn_asal || payload.npsn || "", // 5  (E) NPSN
      payload.tahun_lulus,                // 6  (F) Tahun Lulus
      payload.prestasi || "",             // 7  (G) Prestasi
      payload.nama_lengkap,               // 8  (H) Nama Lengkap
      payload.jenis_kelamin,              // 9  (I) Jenis Kelamin
      payload.nisn,                       // 10 (J) NISN
      payload.nik,                        // 11 (K) NIK Siswa
      payload.no_kk,                      // 12 (L) No Kartu Keluarga
      payload.tempat_lahir,               // 13 (M) Tempat Lahir
      payload.tanggal_lahir,              // 14 (N) Tanggal Lahir
      payload.agama,                      // 15 (O) Agama
      payload.anak_ke,                    // 16 (P) Anak Ke-
      payload.jml_saudara,                // 17 (Q) Jumlah Saudara
      payload.jml_kakak || 0,             // 18 (R) Jumlah Kakak
      payload.jml_adik || 0,              // 19 (S) Jumlah Adik
      payload.no_hp_siswa,                // 20 (T) No HP Siswa
      payload.email_siswa,                // 21 (U) Email Siswa
      payload.no_kps || "",               // 22 (V) No KPS/KIP
      payload.koordinat || "",            // 23 (W) Koordinat GPS
      payload.alamat_rumah,               // 24 (X) Alamat Lengkap
      payload.rt || "",                   // 25 (Y) RT
      payload.rw || "",                   // 26 (Z) RW
      payload.dusun || "",                // 27 (AA) Dusun / Kampung
      payload.desa || "",                 // 28 (AB) Desa / Kelurahan
      payload.kecamatan || "",            // 29 (AC) Kecamatan
      payload.kabupaten || "",            // 30 (AD) Kabupaten / Kota
      payload.provinsi || "",             // 31 (AE) Provinsi
      payload.kode_pos || "",             // 32 (AF) Kode Pos
      payload.jenis_tinggal || "Orang Tua", // 33 (AG) Jenis Tinggal
      payload.transportasi || "Kendaraan Pribadi", // 34 (AH) Moda Transportasi
      payload.jarak_sekolah || "",        // 35 (AI) Jarak ke Sekolah
      payload.waktu_tempuh || "",         // 36 (AJ) Waktu Tempuh
      payload.nama_ayah,                  // 37 (AK) Nama Ayah
      payload.status_ayah || "Masih Hidup", // 38 (AL) Status Ayah
      payload.tahun_meninggal_ayah || "", // 39 (AM) Thn Meninggal Ayah
      payload.nik_ayah || "",             // 40 (AN) NIK Ayah
      payload.tahun_lahir_ayah || "",     // 41 (AO) Thn Lahir Ayah
      payload.pendidikan_ayah || "",      // 42 (AP) Pendidikan Ayah
      payload.pekerjaan_ayah || "",       // 43 (AQ) Pekerjaan Ayah
      payload.penghasilan_ayah || "",     // 44 (AR) Penghasilan Ayah
      payload.no_hp_ayah || "",           // 45 (AS) No HP Ayah
      payload.nama_ibu,                   // 46 (AT) Nama Ibu
      payload.status_ibu || "Masih Hidup", // 47 (AU) Status Ibu
      payload.tahun_meninggal_ibu || "",  // 48 (AV) Thn Meninggal Ibu
      payload.nik_ibu || "",              // 49 (AW) NIK Ibu
      payload.tahun_lahir_ibu || "",      // 50 (AX) Thn Lahir Ibu
      payload.pendidikan_ibu || "",       // 51 (AY) Pendidikan Ibu
      payload.pekerjaan_ibu || "",        // 52 (AZ) Pekerjaan Ibu
      payload.penghasilan_ibu || "",      // 53 (BA) Penghasilan Ibu
      payload.no_hp_ibu || "",            // 54 (BB) No HP Ibu
      payload.alamat_ortu_sama || "Ya",   // 55 (BC) Alamat Ortu Sama?
      payload.alamat_ortu || "",          // 56 (BD) Detail Alamat Ortu
      payload.nama_wali || "",            // 57 (BE) Nama Wali
      payload.nik_wali || "",             // 58 (BF) NIK Wali
      payload.tahun_lahir_wali || "",     // 59 (BG) Thn Lahir Wali
      payload.pendidikan_wali || "",      // 60 (BH) Pendidikan Wali
      payload.pekerjaan_wali || "",       // 61 (BI) Pekerjaan Wali
      payload.penghasilan_wali || "",     // 62 (BJ) Penghasilan Wali
      payload.no_hp_wali || "",           // 63 (BK) No HP Wali
      payload.tinggi_badan || "",         // 64 (BL) Tinggi Badan
      payload.berat_badan || "",          // 65 (BM) Berat Badan
      payload.gol_darah || "",            // 66 (BN) Golongan Darah
      payload.riwayat_penyakit || "",     // 67 (BO) Riwayat Penyakit
      payload.yang_membiayai || payload.alasan_memilih || "Orang Tua", // 68 (BP) Yang Membiayai Sekolah
      payload.kebutuhan_khusus || "Tidak Ada", // 69 (BQ) Kebutuhan Khusus
      urlKK,                              // 70 (BR) Upload KK (Google Drive Link)
      urlAkta,                            // 71 (BS) Upload Akta Kelahiran (Google Drive Link)
      urlIjazah,                          // 72 (BT) Upload Ijazah / SKL (Google Drive Link)
      urlPhoto,                           // 73 (BU) Upload Pas Foto (Google Drive Link)
      urlKIP                              // 74 (BV) Upload Dokumen Lain (Google Drive Link)
    ];
  }

  // TAMBAHAN DATA UNTUK KELOLA (Kolom BW, BX, BY, BZ)
  rowData.push(payload.uid || "");        // 75 (BW) ID Pendaftaran
  rowData.push(payload.status || "Menunggu Verifikasi"); // 76 (BX) Status Verifikasi
  rowData.push(payload.ocrKTP || "");     // 77 (BY) OCR KTP
  rowData.push(payload.ocrKK || "");      // 78 (BZ) OCR KK

  sheet.appendRow(rowData);
  return { success: true, message: "Pendaftaran berhasil dikirim", row: sheet.getLastRow() };
}

// --------------------------------------------------
// 4. GET ALL DATA (Untuk Admin)
// --------------------------------------------------
function handleGetData(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSMP = ss.getSheetByName("Data_Pendaftar_SMP");
  var sheetSMK = ss.getSheetByName("Data_Pendaftar_SMK");

  var result = [];

  function extractData(sheetObj, isSMP) {
    if (!sheetObj) return;
    var data = sheetObj.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1] && !row[7]) continue; // Lewati baris kosong
      
      var uidIdx = isSMP ? 72 : 74;      // 0-indexed (BW = index 74)
      var statusIdx = isSMP ? 73 : 75;   // 0-indexed (BX = index 75)
      var ocrKTPIdx = isSMP ? 74 : 76;
      var ocrKKIdx = isSMP ? 75 : 77;
      
      var namaLengkap = isSMP ? row[1] : row[7];
      var asalSekolah = isSMP ? row[26] : row[3];
      var nisn = isSMP ? row[3] : row[9];
      var nik = isSMP ? row[4] : row[10];

      var jenisKelamin = isSMP ? row[2] : row[8];
      var tempatLahir = isSMP ? row[6] : row[12];
      var tanggalLahir = isSMP ? row[7] : row[13];
      var agama = isSMP ? row[8] : row[14];
      var noHp = isSMP ? row[13] : row[19];
      var email = isSMP ? row[14] : row[20];
      var alamatRumah = isSMP ? row[16] : row[23];
      var namaAyah = isSMP ? row[33] : row[36];
      var namaIbu = isSMP ? row[42] : row[45];
      var jurusan1 = isSMP ? "Reguler / Tahfidz" : row[1];
      var jurusan2 = isSMP ? "" : row[2];

      // URLs dari Google Drive:
      // SMK: BR(69) = KK, BS(70) = Akta, BT(71) = Ijazah, BU(72) = Photo, BV(73) = KIP
      var urlKK = isSMP ? row[68] : row[69];
      var urlAkta = isSMP ? row[70] : row[70];
      var urlIjazah = isSMP ? row[65] : row[71];
      var urlPhoto = isSMP ? row[67] : row[72];
      var urlKIP = isSMP ? row[71] : row[73];
      var urlKTP = isSMP ? row[69] : "";

      result.push({
        sheetName: sheetObj.getName(),
        row: i + 1,
        timestamp: row[0],
        uid: row[uidIdx] || "-",
        jenjang: isSMP ? "SMP" : "SMK",
        asal_sekolah: asalSekolah,
        nama_lengkap: namaLengkap,
        jenis_kelamin: jenisKelamin,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir,
        agama: agama,
        no_hp: noHp,
        email: email,
        alamat_rumah: alamatRumah,
        nama_ayah: namaAyah,
        nama_ibu: namaIbu,
        jurusan1: jurusan1,
        jurusan2: jurusan2,
        nisn: nisn,
        nik: nik,
        status: row[statusIdx] || "Menunggu Verifikasi",
        urlIjazah: urlIjazah,
        urlPhoto: urlPhoto,
        urlKTP: urlKTP,
        urlKK: urlKK,
        urlAkta: urlAkta,
        urlKIP: urlKIP,
        ocrKTP: row[ocrKTPIdx] || "",
        ocrKK: row[ocrKKIdx] || ""
      });
    }
  }

  extractData(sheetSMP, true);
  extractData(sheetSMK, false);

  result.sort(function(a,b){ return new Date(b.timestamp) - new Date(a.timestamp); });

  return { success: true, data: result };
}

// --------------------------------------------------
// 5. UPDATE STATUS (Untuk Admin)
// --------------------------------------------------
function handleUpdateStatus(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(payload.sheetName) || ss.getActiveSheet();
  var row = payload.row;
  var status = payload.status;
  
  // Status kolom (1-indexed)
  var isSMP = (payload.sheetName === "Data_Pendaftar_SMP");
  var statusCol = isSMP ? 74 : 76; // Kolom BX = 76
  
  sheet.getRange(row, statusCol).setValue(status);
  
  return { success: true, message: "Status berhasil diupdate" };
}

// --------------------------------------------------
// 6. GET USER STATUS (Untuk Dashboard Siswa)
// --------------------------------------------------
function handleGetUserStatus(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ["Data_Pendaftar_SMP", "Data_Pendaftar_SMK"];
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = ss.getSheetByName(sheets[s]);
    if (!sheet) continue;

    var isSMP = (sheets[s] === "Data_Pendaftar_SMP");
    var uidIdx = isSMP ? 72 : 74;      // 0-indexed (BW = index 74)
    var statusIdx = isSMP ? 73 : 75;   // 0-indexed (BX = index 75)

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][uidIdx] === payload.uid) {
        return { success: true, status: data[i][statusIdx] || "Menunggu Verifikasi" };
      }
    }
  }
  return { success: true, status: "Belum Mengisi Formulir" };
}

// Helper: Backup if uploadFile fails, use older uploadToDrive
function uploadToDrive(fileObj, prefixName) {
  if (!fileObj || !fileObj.base64) return '';
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
    
    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, contentType, prefixName + '_' + fileObj.name);
    // Asumsi fallback ke SMK jika tidak tau
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID_SMK);
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    return file.getUrl();
  } catch (err) {
    return 'ERROR_UPLOAD: ' + err.message;
  }
}

function beriIzinDrive() {
  DriveApp.getRootFolder();
  Logger.log("✅ Izin Google Drive berhasil diberikan!");
}

// ===================== UTILITY: SINKRONISASI =====================
// Fungsi untuk mengisi kolom link file yang kosong di Google Sheets
// dengan mencari file yang cocok berdasarkan NISN/UID di Google Drive
function sinkronkanLinkDriveKeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ["Data_Pendaftar_SMK", "Data_Pendaftar_SMP"];
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = ss.getSheetByName(sheets[s]);
    if (!sheet) continue;
    
    var isSMP = (sheets[s] === "Data_Pendaftar_SMP");
    var folderId = isSMP ? DRIVE_FOLDER_ID_SMP : DRIVE_FOLDER_ID_SMK;
    var folder = DriveApp.getFolderById(folderId);
    
    // Kolom target (0-indexed array vs 1-indexed range)
    var colKK = isSMP ? 69 : 70;      // BR
    var colAkta = isSMP ? 71 : 71;    // BS
    var colIjazah = isSMP ? 66 : 72;  // BT
    var colPhoto = isSMP ? 68 : 73;   // BU
    var colKIP = isSMP ? 72 : 74;     // BV
    var colKTP = isSMP ? 70 : 0;      // KTP (hanya dicari jika ada kolomnya, di SMK tidak ada kolom khusus default di array tadi, opsional)
    
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var nisn = row[9]; // Kolom J (NISN)
      if (isSMP) nisn = row[3]; // Kolom D
      if (!nisn) nisn = row[isSMP ? 72 : 74]; // UID
      if (!nisn) continue;
      
      var nisnClean = String(nisn).trim();
      
      // Check & Update KK
      if (!row[colKK - 1]) {
        var url = findExistingDriveFileUrl(folderId, "KK_" + nisnClean);
        if (url) sheet.getRange(i + 1, colKK).setValue(url);
      }
      
      // Check & Update Akta
      if (!row[colAkta - 1]) {
        var url = findExistingDriveFileUrl(folderId, "Akta_" + nisnClean);
        if (url) sheet.getRange(i + 1, colAkta).setValue(url);
      }
      
      // Check & Update Ijazah
      if (!row[colIjazah - 1]) {
        var url = findExistingDriveFileUrl(folderId, "Ijazah_" + nisnClean);
        if (url) sheet.getRange(i + 1, colIjazah).setValue(url);
      }
      
      // Check & Update Photo
      if (!row[colPhoto - 1]) {
        var url = findExistingDriveFileUrl(folderId, "Photo_" + nisnClean);
        if (url) sheet.getRange(i + 1, colPhoto).setValue(url);
      }
      
      // Check & Update KIP
      if (!row[colKIP - 1]) {
        var url = findExistingDriveFileUrl(folderId, "KIP_" + nisnClean);
        if (url) sheet.getRange(i + 1, colKIP).setValue(url);
      }
    }
  }
  Logger.log("✅ Sinkronisasi link Drive ke Spreadsheet selesai.");
}
