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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) return { success: false, message: "Sheet '" + sheetName + "' tidak ditemukan" };

  var timestamp = new Date();
  var folderId = (jenjang === "SMP") ? DRIVE_FOLDER_ID_SMP : DRIVE_FOLDER_ID_SMK;

  function uploadFile(fileObj, prefix) {
    if (!fileObj || !fileObj.base64) return "";
    try {
      var splitBase = fileObj.base64.split(',');
      var contentType = splitBase[0].split(';')[0].split(':')[1];
      var base64Data = splitBase[1];
      
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, prefix + "_" + fileObj.name);
      var folder = DriveApp.getFolderById(folderId);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    } catch(e) { return ""; }
  }

  // Upload Files
  var urlIjazah = uploadFile(payload.fileIjazah, 'Ijazah_' + (payload.nisn || 'x'));
  var urlKK     = uploadFile(payload.fileKK,     'KK_'     + (payload.nisn || 'x'));
  var urlKTP    = uploadFile(payload.fileKTP,    'KTP_'    + (payload.nisn || 'x'));
  var urlAkta   = uploadFile(payload.fileAkta,   'Akta_'   + (payload.nisn || 'x'));
  var urlKIP    = uploadToDrive(payload.fileKIP, 'KIP_'    + (payload.nisn || 'x'));
  var urlPhoto  = uploadFile(payload.filePhoto,  'Photo_'  + (payload.nisn || 'x'));
  var urlSHUSM  = (jenjang === "SMP") ? uploadFile(payload.fileSHUSM, 'SHUSM_' + (payload.nisn || 'x')) : "";

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
    // Format SMK (74 Kolom)
    rowData = [
      timestamp,                          // 1  (A)  Waktu Submit
      payload.jurusan_1,                  // 2  (B)
      payload.jurusan_2,                  // 3  (C)
      payload.asal_sekolah,               // 4  (D)
      payload.npsn_asal,                  // 5  (E)
      payload.tahun_lulus,                // 6  (F)
      payload.prestasi,                   // 7  (G)
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
      payload.nama_ayah,                  // 37 (AK)
      payload.status_ayah,                // 38 (AL)
      payload.tahun_meninggal_ayah,       // 39 (AM)
      payload.nik_ayah,                   // 40 (AN)
      payload.tahun_lahir_ayah,           // 41 (AO)
      payload.pendidikan_ayah,            // 42 (AP)
      payload.pekerjaan_ayah,             // 43 (AQ)
      payload.penghasilan_ayah,           // 44 (AR)
      payload.no_hp_ayah,                 // 45 (AS)
      payload.nama_ibu,                   // 46 (AT)
      payload.status_ibu,                 // 47 (AU)
      payload.tahun_meninggal_ibu,        // 48 (AV)
      payload.nik_ibu,                    // 49 (AW)
      payload.tahun_lahir_ibu,            // 50 (AX)
      payload.pendidikan_ibu,             // 51 (AY)
      payload.pekerjaan_ibu,              // 52 (AZ)
      payload.penghasilan_ibu,            // 53 (BA)
      payload.no_hp_ibu,                  // 54 (BB)
      payload.alamat_ortu_sama,           // 55 (BC)
      payload.alamat_ortu,                // 56 (BD)
      payload.nama_wali,                  // 57 (BE)
      payload.nik_wali,                   // 58 (BF)
      payload.tahun_lahir_wali,           // 59 (BG)
      payload.pendidikan_wali,            // 60 (BH)
      payload.pekerjaan_wali,             // 61 (BI)
      payload.penghasilan_wali,           // 62 (BJ)
      payload.no_hp_wali,                 // 63 (BK)
      payload.tinggi_badan,               // 64 (BL)
      payload.berat_badan,                // 65 (BM)
      payload.gol_darah,                  // 66 (BN)
      payload.riwayat_penyakit,           // 67 (BO)
      payload.alasan_memilih,             // 68 (BP)
      urlIjazah,                          // 69 (BQ)
      urlKK,                              // 70 (BR)
      urlKTP,                             // 71 (BS)
      urlAkta,                            // 72 (BT)
      urlKIP,                             // 73 (BU)
      urlPhoto                            // 74 (BV)
    ];
  }

  // TAMBAHAN DATA UNTUK KELOLA (Ditambah di ujung kolom)
  // Kolom ke +1 = UID Siswa
  // Kolom ke +2 = Status Pendaftaran
  // Kolom ke +3 = OCR KTP
  // Kolom ke +4 = OCR KK
  rowData.push(payload.uid); 
  rowData.push("Menunggu Verifikasi"); 
  rowData.push(payload.ocrKTP || "");
  rowData.push(payload.ocrKK || "");

  sheet.appendRow(rowData);
  return { success: true, message: "Pendaftaran berhasil dikirim" };
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
      // Index khusus Kelola berada di ujung row
      // SMP ada 72 kolom (index 0 - 71), maka UID = 72, Status = 73, OCR KTP = 74, OCR KK = 75
      // SMK ada 74 kolom (index 0 - 73), maka UID = 74, Status = 75, OCR KTP = 76, OCR KK = 77
      
      var uidIdx = isSMP ? 72 : 74;
      var statusIdx = isSMP ? 73 : 75;
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

      var urlIjazah = isSMP ? row[65] : row[68];
      var urlPhoto = isSMP ? row[67] : row[73];
      var urlKK = isSMP ? row[68] : row[69];
      var urlKTP = isSMP ? row[69] : row[70];
      var urlAkta = isSMP ? row[70] : row[71];
      var urlKIP = isSMP ? row[71] : row[72];

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

  // Urutkan berdasarkan timestamp terbaru
  result.sort(function(a,b){ return new Date(b.timestamp) - new Date(a.timestamp); });

  return { success: true, data: result };
}

// --------------------------------------------------
// 5. UPDATE STATUS (Untuk Admin)
// --------------------------------------------------
function handleUpdateStatus(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(payload.sheetName);
  var row = payload.row;
  var status = payload.status;
  
  // Status kolom
  var statusCol = (payload.sheetName === "Data_Pendaftar_SMP") ? 74 : 76; 
  // Penjelasan: array 0-indexed, SMP ada 72 items, jd UID=73, Status=74 (1-indexed col)
  
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
    var uidIdx = isSMP ? 72 : 74;
    var statusIdx = isSMP ? 73 : 75;

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
    var decodedBytes = Utilities.base64Decode(fileObj.base64);
    var blob = Utilities.newBlob(decodedBytes, fileObj.mimeType, prefixName + '_' + fileObj.name);
    // Asumsi fallback ke SMK jika tidak tau
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID_SMK);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return 'ERROR_UPLOAD: ' + err.message;
  }
}

function beriIzinDrive() {
  DriveApp.getRootFolder();
  Logger.log("✅ Izin Google Drive berhasil diberikan!");
}
