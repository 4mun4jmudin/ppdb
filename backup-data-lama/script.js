/* ============================================================
   PPDB Online - SMK IT Al-Hawari
   script.js — Multi-step Navigation, Validation, Geolocation, Submit
   ============================================================ */

// ===================== KONFIGURASI =====================

// TARUH URL GOOGLE APPS SCRIPT DI SINI
const scriptURL = 'https://script.google.com/macros/s/AKfycbwzjkZcq99PfxRNfDtKSZdy_FGNt-Q-ka3q2yTZmzNxxWga05TFgPA5vk1bwmFM7oZI/exec';
// Contoh: const scriptURL = 'https://script.google.com/macros/s/AKf.../exec';

// ===================== DOM ELEMENTS =====================
const form = document.getElementById('ppdbForm');
const steps = document.querySelectorAll('.form-step');
const stepItems = document.querySelectorAll('.step-item');
const progressFill = document.getElementById('progressFill');
const btnNextAll = document.querySelectorAll('.btn-next');
const btnPrevAll = document.querySelectorAll('.btn-prev');
const btnSubmit = document.getElementById('btnSubmit');
const btnGeo = document.getElementById('btnGeo');
const koordinatInput = document.getElementById('koordinat');
const geoStatus = document.getElementById('geoStatus');
const notifOverlay = document.getElementById('notifOverlay');
const btnNotifClose = document.getElementById('btnNotifClose');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Track current step (1-indexed)
let currentStep = 1;
const totalSteps = 4; // Diupdate dari 3 ke 4 (penambahan step Lampiran)

// ===================== MULTI-STEP NAVIGATION =====================

/**
 * Menampilkan step tertentu dan mengupdate progress bar + indikator.
 * @param {number} stepNumber - Nomor step yang akan ditampilkan (1-3)
 */
function goToStep(stepNumber) {
  // Sembunyikan semua steps
  steps.forEach(step => step.classList.remove('active'));

  // Tampilkan step yang dipilih
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
  }

  // Update indikator step
  stepItems.forEach((item, index) => {
    const itemStep = index + 1;
    item.classList.remove('active', 'completed');

    if (itemStep < stepNumber) {
      item.classList.add('completed');
    } else if (itemStep === stepNumber) {
      item.classList.add('active');
    }
  });

  // Update progress bar
  const progressPercent = (stepNumber / totalSteps) * 100;
  progressFill.style.width = `${progressPercent}%`;

  currentStep = stepNumber;

  // Simpan posisi step ke localStorage
  localStorage.setItem('ppdb_current_step', stepNumber);

  // Scroll ke atas form dengan smooth
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== VALIDASI FORM PER STEP =====================

/**
 * Memvalidasi semua field required pada step tertentu.
 * Menambahkan class 'invalid' pada field yang belum diisi.
 * @param {number} stepNumber - Nomor step yang akan divalidasi
 * @returns {boolean} - True jika semua required field terisi
 */
function validateStep(stepNumber) {
  const stepEl = document.getElementById(`step${stepNumber}`);
  const requiredFields = stepEl.querySelectorAll('[required]');
  let isValid = true;
  let firstInvalidField = null;

  requiredFields.forEach(field => {
    // Hapus state invalid sebelumnya
    field.classList.remove('invalid');

    // Cek apakah field kosong
    const value = field.value.trim();
    if (!value) {
      field.classList.add('invalid');
      isValid = false;

      // Simpan field pertama yang invalid untuk auto-scroll
      if (!firstInvalidField) {
        firstInvalidField = field;
      }
    }
  });

  // Validasi khusus panjang digit numerik
  const idRules = {
    npsn_asal: 8, nisn: 10, nik: 16, no_kk: 16,
    nik_ayah: 16, nik_ibu: 16, nik_wali: 16
  };

  Object.keys(idRules).forEach(id => {
    const field = document.getElementById(id);
    // Jika field tersebut ada dan bagian dari step saat ini
    if (field && stepEl.contains(field)) {
      const val = field.value.replace(/\D/g, '');
      // Jika field sedang diisi (tidak kosong) namun digitnya tidak tepat
      if (val.length > 0 && val.length !== idRules[id]) {
        field.classList.add('invalid');
        isValid = false;
        if (!firstInvalidField) {
          firstInvalidField = field;
        }
      }
    }
  });

  // Jika ada field invalid, scroll ke field pertama yang kosong / bermasalah
  if (!isValid && firstInvalidField) {
    firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalidField.focus();
    showToast('Mohon lengkapi seluruh field dengan benar (perhatikan jumlah digit).', 'error');
  }

  return isValid;
}

/**
 * Hapus class invalid saat user mulai mengisi field
 * + Auto-save draft ke localStorage
 */
document.addEventListener('input', (e) => {
  if (e.target.matches('input, select, textarea')) {
    e.target.classList.remove('invalid');
    saveDraft(); // Auto-save setiap ketikan
  }
});

document.addEventListener('change', (e) => {
  if (e.target.matches('select, input')) {
    e.target.classList.remove('invalid');
    saveDraft(); // Auto-save setiap perubahan dropdown
  }
});

// ===================== EVENT LISTENERS: NEXT & PREV =====================

// Tombol Next
btnNextAll.forEach(btn => {
  btn.addEventListener('click', () => {
    const nextStep = parseInt(btn.dataset.next);

    // Validasi step saat ini sebelum lanjut
    if (validateStep(currentStep)) {
      goToStep(nextStep);
    }
  });
});

// Tombol Previous
btnPrevAll.forEach(btn => {
  btn.addEventListener('click', () => {
    const prevStep = parseInt(btn.dataset.prev);
    goToStep(prevStep);
  });
});

// ===================== GEOLOCATION API =====================

/**
 * Mengambil titik koordinat (latitude, longitude) menggunakan
 * HTML5 Geolocation API. Data ini nantinya akan digunakan
 * untuk perhitungan akurasi zonasi dengan Algoritma Haversine.
 */
btnGeo.addEventListener('click', () => {
  // Cek apakah browser mendukung Geolocation
  if (!navigator.geolocation) {
    geoStatus.textContent = '❌ Browser Anda tidak mendukung Geolocation.';
    geoStatus.className = 'geo-status error';
    return;
  }

  // Tampilkan loading state
  const geoText = btnGeo.querySelector('.geo-text');
  const geoSpinner = btnGeo.querySelector('.geo-spinner');
  geoText.style.display = 'none';
  geoSpinner.style.display = 'flex';
  btnGeo.disabled = true;
  geoStatus.textContent = 'Mengambil lokasi... Mohon izinkan akses lokasi.';
  geoStatus.className = 'geo-status';

  // Request posisi user
  navigator.geolocation.getCurrentPosition(
    // ✅ Sukses
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Isi input koordinat dengan format "Latitude, Longitude"
      koordinatInput.value = `${lat}, ${lng}`;
      koordinatInput.classList.remove('invalid');
      
      // Update otomatis Jarak & Waktu Tempuh
      updateEstimasiJarakWaktu();

      geoStatus.textContent = `Memproses alamat otomatis...`;
      geoStatus.className = 'geo-status success';

      // Reverse geocoding otomatis dengan Nominatim (OpenStreetMap)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const addr = data.address;
            
            // Ekstrak nama wilayah
            const desa = addr.village || addr.suburb || addr.neighbourhood || '';
            const kec = addr.city_district || addr.county || '';
            let kab = addr.city || addr.town || addr.county || '';
            const prov = addr.state || '';
            const kodepos = addr.postcode || '';
            
            // Auto fill
            const elDesa = document.getElementById('desa');
            const elKec = document.getElementById('kecamatan');
            const elKab = document.getElementById('kabupaten');
            const elProv = document.getElementById('provinsi');
            const elPos = document.getElementById('kode_pos');
            
            if (elDesa && desa) { elDesa.value = desa; elDesa.classList.remove('invalid'); }
            if (elKec && kec) { elKec.value = kec; elKec.classList.remove('invalid'); }
            if (elKab && kab) { elKab.value = kab; elKab.classList.remove('invalid'); }
            if (elProv && prov) { elProv.value = prov; elProv.classList.remove('invalid'); }
            if (elPos && kodepos) { elPos.value = kodepos; elPos.classList.remove('invalid'); }
            
            // Trigger event change/input agar alamat_rumah.value ikut terupdate
            if (elDesa) elDesa.dispatchEvent(new Event('input'));
            
            // Notifikasi sukses ke user
            geoStatus.textContent = `✅ Alamat berhasil dilacak dari GPS! Harap cek ulang di form Alamat.`;
            showToast('Alamat otomatis terisi dari lokasi Anda. Mohon diperiksa kembali.', '');
          } else {
            geoStatus.textContent = `✅ Koordinat didapat. (Gagal melacak nama jalan otomatis)`;
          }
        })
        .catch(err => {
          console.error("Reverse Geocoding Error:", err);
          geoStatus.textContent = `✅ Koordinat didapat (±${Math.round(position.coords.accuracy)}m).`;
        })
        .finally(() => {
          // Reset tombol
          geoText.style.display = 'inline';
          geoSpinner.style.display = 'none';
          btnGeo.disabled = false;
        });
    },
    // ❌ Error
    (error) => {
      let errorMsg = '';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = '❌ Akses lokasi ditolak. Mohon izinkan akses lokasi di pengaturan browser.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = '❌ Informasi lokasi tidak tersedia.';
          break;
        case error.TIMEOUT:
          errorMsg = '❌ Permintaan lokasi timeout. Coba lagi.';
          break;
        default:
          errorMsg = '❌ Terjadi kesalahan saat mengambil lokasi.';
      }

      geoStatus.textContent = errorMsg;
      geoStatus.className = 'geo-status error';

      // Reset tombol
      geoText.style.display = 'inline';
      geoSpinner.style.display = 'none';
      btnGeo.disabled = false;
    },
    // Opsi
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
});

// ===================== KALKULASI JARAK & WAKTU =====================

const SCHOOL_LAT = -7.0826267221245915;
const SCHOOL_LNG = 107.95834980524963;

/**
 * Menghitung jarak menggunakan formula Haversine
 */
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Update field Jarak dan Waktu Tempuh otomatis
 */
function updateEstimasiJarakWaktu() {
  const coordInput = document.getElementById('koordinat')?.value;
  const transInput = document.getElementById('transportasi')?.value;
  const elJarak = document.getElementById('jarak_sekolah');
  const elWaktu = document.getElementById('waktu_tempuh');

  if (!coordInput) return;

  const parts = coordInput.split(',');
  if (parts.length !== 2) return;

  const userLat = parseFloat(parts[0].trim());
  const userLng = parseFloat(parts[1].trim());

  if (isNaN(userLat) || isNaN(userLng)) return;

  // 1. Hitung Jarak
  const distance = getHaversineDistance(SCHOOL_LAT, SCHOOL_LNG, userLat, userLng);

  // 2. Set opsi dropdown Jarak
  if (elJarak) {
    if (distance < 1) elJarak.value = "Kurang dari 1 KM";
    else if (distance <= 3) elJarak.value = "1-3 KM";
    else if (distance <= 5) elJarak.value = "3-5 KM";
    else elJarak.value = "Lebih dari 5 KM";
    elJarak.classList.remove('invalid');
  }

  // 3. Hitung Waktu Tempuh
  if (elWaktu) {
    // Estimasi Kecepatan (km/jam)
    let speed = 40; // Default (Motor/Mobil)
    if (transInput === 'Jalan Kaki') speed = 5;
    else if (transInput === 'Kendaraan Umum') speed = 20;
    else if (transInput === 'Jemputan') speed = 25;

    let timeHours = distance / speed;
    let timeMins = Math.round(timeHours * 60);

    // Hindari 0 menit jika asrama/sangat dekat
    if (timeMins < 1) timeMins = 1;

    let timeStr = "";
    if (timeMins < 60) {
      timeStr = `${timeMins} Menit`;
    } else {
      const h = Math.floor(timeMins / 60);
      const m = timeMins % 60;
      timeStr = m === 0 ? `${h} Jam` : `${h} Jam ${m} Menit`;
    }

    elWaktu.value = timeStr;
    elWaktu.classList.remove('invalid');
  }
}

// ===================== PEKERJAAN "LAINNYA" TOGGLE =====================

/**
 * Menampilkan / menyembunyikan input teks manual saat user memilih
 * "Lainnya (Sebutkan)" pada dropdown pekerjaan.
 */
document.addEventListener('change', function(e) {
  if (e.target && (e.target.classList.contains('select-pekerjaan') || e.target.classList.contains('select-lainnya'))) {
    const inputLainnya = e.target.parentElement.querySelector('.input-pekerjaan-lainnya, .input-lainnya-text');
    if (!inputLainnya) return;

    if (e.target.value === 'lainnya') {
      // Tampilkan input dan set required
      inputLainnya.style.display = 'block';
      inputLainnya.setAttribute('required', 'required');
      inputLainnya.focus();
    } else {
      // Sembunyikan, hapus required, dan kosongkan
      inputLainnya.style.display = 'none';
      inputLainnya.removeAttribute('required');
      inputLainnya.value = '';
    }
  }
});

// ===================== HELPER: BASE64 FILE READER =====================

/**
 * Membaca file dari sebuah input[type=file] dan mengkonversinya ke Base64.
 * Mengembalikan Promise yang resolve dengan objek { base64, name, mimeType }
 * atau null jika tidak ada file yang dipilih.
 *
 * @param {string} inputId - ID elemen <input type="file">
 * @returns {Promise<{base64: string, name: string, mimeType: string}|null>}
 */
function getFileBase64(inputId) {
  return new Promise((resolve, reject) => {
    const input = document.getElementById(inputId);

    // Jika input tidak ditemukan atau tidak ada file yang dipilih, kembalikan null
    if (!input || !input.files || input.files.length === 0) {
      resolve(null);
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    // Validasi ukuran file — maks 5MB
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      reject(new Error(`File "${file.name}" terlalu besar. Maksimal ${MAX_SIZE_MB}MB.`));
      return;
    }

    reader.onload = () => {
      // reader.result berformat: "data:image/jpeg;base64,/9j/4AAQ..."
      // Kita hanya butuh bagian Base64 sesudah koma.
      const base64String = reader.result.split(',')[1];
      resolve({
        base64: base64String,
        name: file.name,
        mimeType: file.type
      });
    };

    reader.onerror = (err) => reject(err);

    // Mulai membaca file sebagai Data URL (Base64)
    reader.readAsDataURL(file);
  });
}

// ===================== PREVIEW NAMA FILE YANG DIPILIH =====================

/**
 * Menampilkan nama file yang dipilih di bawah tombol upload
 * agar user tahu file mana yang sudah dipilih.
 */
(function initFilePreview() {
  const fileInputMap = [
    { inputId: 'fileIjazah', nameId: 'nameIjazah' },
    { inputId: 'fileKK',     nameId: 'nameKK' },
    { inputId: 'fileKTP',    nameId: 'nameKTP' },
    { inputId: 'fileAkta',   nameId: 'nameAkta' },
    { inputId: 'fileKIP',    nameId: 'nameKIP' },
    { inputId: 'filePhoto',  nameId: 'namePhoto' },
  ];

  fileInputMap.forEach(({ inputId, nameId }) => {
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    const label = input ? input.nextElementSibling : null;

    if (!input || !nameEl) return;

    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const sizeKB = (file.size / 1024).toFixed(1);
        nameEl.textContent = `✅ ${file.name} (${sizeKB} KB)`;
        nameEl.style.color = 'var(--success, #16a34a)';
        // Juga hapus class invalid jika ada
        input.classList.remove('invalid');
        if (label) label.style.borderColor = 'var(--success, #16a34a)';
      } else {
        nameEl.textContent = 'Belum ada file dipilih';
        nameEl.style.color = '';
        if (label) label.style.borderColor = '';
      }
    });
  });
})();

// ===================== FORM SUBMIT =====================

form.addEventListener('submit', async (e) => {
  // Cegah reload halaman
  e.preventDefault();

  // Validasi step terakhir (step 4: lampiran)
  if (!validateStep(currentStep)) {
    return;
  }

  // Cek apakah scriptURL sudah diisi
  if (!scriptURL) {
    showToast('URL Google Apps Script belum dikonfigurasi.', 'warning');
    console.warn('⚠️ scriptURL belum diisi. Buka script.js dan isi variabel scriptURL.');
    return;
  }

  // Ubah tampilan tombol menjadi loading
  setSubmitLoading(true);

  try {
    // -------------------------------------------------------
    // 1. Ambil semua data TEKS dari FormData
    // -------------------------------------------------------
    const formData = new FormData(form);

    // Override pekerjaan atau alasan jika user pilih "lainnya"
    document.querySelectorAll('.select-pekerjaan, .select-lainnya').forEach(select => {
      if (select.value === 'lainnya') {
        const inputLainnya = select.parentElement.querySelector('.input-pekerjaan-lainnya, .input-lainnya-text');
        if (inputLainnya && inputLainnya.value.trim()) {
          formData.set(select.name, inputLainnya.value.trim());
        }
      }
    });

    // Salin semua field teks dari FormData ke object JavaScript biasa.
    // Kita TIDAK menyertakan file di sini — file diproses terpisah via Base64.
    const dataToSend = {};
    formData.forEach((value, key) => {
      // Skip field file (tipe input file tidak perlu diambil dari FormData)
      if (!['fileIjazah', 'fileKK', 'fileKTP', 'fileAkta', 'fileKIP', 'filePhoto'].includes(key)) {
        dataToSend[key] = value;
      }
    });

    // -------------------------------------------------------
    // 2. Konversi 6 file lampiran ke Base64 secara paralel
    //    menggunakan Promise.all untuk efisiensi waktu.
    // -------------------------------------------------------
    showToast('⏳ Memproses file lampiran, harap tunggu...', '');

    const [fileIjazah, fileKK, fileKTP, fileAkta, fileKIP, filePhoto] = await Promise.all([
      getFileBase64('fileIjazah'),
      getFileBase64('fileKK'),
      getFileBase64('fileKTP'),
      getFileBase64('fileAkta'),
      getFileBase64('fileKIP'),   // Opsional — bisa null
      getFileBase64('filePhoto'),
    ]);

    // Lampirkan objek file ke payload utama
    dataToSend.fileIjazah = fileIjazah;
    dataToSend.fileKK     = fileKK;
    dataToSend.fileKTP    = fileKTP;
    dataToSend.fileAkta   = fileAkta;
    dataToSend.fileKIP    = fileKIP;    // Bisa null jika tidak diisi
    dataToSend.filePhoto  = filePhoto;

    // -------------------------------------------------------
    // 3. Kirim JSON ke Google Apps Script via fetch
    //    - Content-Type: text/plain  → menghindari CORS preflight
    //    - mode: no-cors             → request "opaque", data tetap terkirim
    // -------------------------------------------------------
    await fetch(scriptURL, {
      method: 'POST',
      headers: {
        // Gunakan 'text/plain' bukan 'application/json' agar tidak memicu
        // CORS preflight (OPTIONS request) yang akan diblokir oleh GAS.
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(dataToSend),
      mode: 'no-cors' // Response akan "opaque", tidak bisa dibaca — ini normal
    });

    // Jika tidak ada error thrown, berarti request berhasil terkirim
    // (dengan mode no-cors, kita tidak bisa membaca response body/status)
    showNotification();

    // Hapus draft dan posisi step dari localStorage
    localStorage.removeItem('ppdb_draft');
    localStorage.removeItem('ppdb_current_step');

    // Reset form ke kondisi awal
    form.reset();

    // Reset semua preview nama file
    document.querySelectorAll('.file-upload-name').forEach(el => {
      el.textContent = 'Belum ada file dipilih';
      el.style.color = '';
    });
    document.querySelectorAll('.file-upload-label').forEach(el => {
      el.style.borderColor = '';
    });

    goToStep(1);

  } catch (error) {
    console.error('Submit error:', error);
    // Tampilkan pesan error yang spesifik (misal file terlalu besar)
    showToast(error.message || 'Gagal mengirim data. Periksa koneksi internet Anda.', 'error');
  } finally {
    // Kembalikan tombol ke kondisi normal
    setSubmitLoading(false);
  }
});

// ===================== SUBMIT BUTTON STATE =====================

/**
 * Mengubah tampilan tombol submit antara normal dan loading.
 * @param {boolean} loading - true untuk tampilkan loading state
 */
function setSubmitLoading(loading) {
  const submitIcon = btnSubmit.querySelector('.submit-icon');
  const submitText = btnSubmit.querySelector('.submit-text');
  const submitLoading = btnSubmit.querySelector('.submit-loading');

  if (loading) {
    submitIcon.style.display = 'none';
    submitText.style.display = 'none';
    submitLoading.style.display = 'flex';
    btnSubmit.disabled = true;
  } else {
    submitIcon.style.display = 'block';
    submitText.style.display = 'inline';
    submitLoading.style.display = 'none';
    btnSubmit.disabled = false;
  }
}

// ===================== NOTIFICATION POPUP =====================

/**
 * Menampilkan notifikasi pop-up sukses (bukan alert browser bawaan).
 */
function showNotification() {
  notifOverlay.classList.add('show');
  document.body.style.overflow = 'hidden'; // Mencegah scroll di belakang overlay
}

/**
 * Menutup notifikasi pop-up.
 */
function closeNotification() {
  notifOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

// Tombol tutup notifikasi
btnNotifClose.addEventListener('click', closeNotification);

// Klik di luar card juga menutup notifikasi
notifOverlay.addEventListener('click', (e) => {
  if (e.target === notifOverlay) {
    closeNotification();
  }
});

// ===================== TOAST NOTIFICATION =====================

/**
 * Menampilkan toast notification sementara di bagian bawah layar.
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - Tipe toast: 'error', 'warning', atau default
 */
function showToast(message, type = '') {
  toastMessage.textContent = message;
  toast.className = `toast show ${type}`;

  // Auto-hide setelah 4 detik
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ===================== FORM PERSISTENCE (Auto-save Draft) =====================

const DRAFT_KEY = 'ppdb_draft';

/**
 * Menyimpan semua data form ke localStorage sebagai JSON.
 * Dipanggil otomatis setiap kali user mengetik atau mengubah field.
 */
function saveDraft() {
  try {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    // Simpan juga step terakhir yang aktif
    data._currentStep = currentStep;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (e) {
    // Abaikan error (misalnya localStorage penuh)
    console.warn('Gagal menyimpan draft:', e);
  }
}

/**
 * Memuat data draft dari localStorage dan mengisi field form.
 * Dipanggil saat halaman pertama kali dibuka (DOMContentLoaded).
 */
function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    // Populate semua field form
    Object.keys(data).forEach(key => {
      // Skip key internal
      if (key.startsWith('_')) return;

      const field = form.querySelector(`[name="${key}"]`);
      if (field) {
        field.value = data[key];
      }
    });

    // Restore step terakhir dari key terpisah ppdb_current_step
    const savedStep = parseInt(localStorage.getItem('ppdb_current_step'));
    if (savedStep && savedStep >= 1 && savedStep <= totalSteps) {
      goToStep(savedStep);
    }

    showToast('📝 Draft sebelumnya berhasil dimuat.', '');
  } catch (e) {
    console.warn('Gagal memuat draft:', e);
  }
}

// Load draft saat halaman dibuka
document.addEventListener('DOMContentLoaded', () => {
  loadDraft();
  initSmartSearch();
  initToggles();
  
  // Trigger update jika opsi transportasi diubah setelah titik didapat
  const transInput = document.getElementById('transportasi');
  if (transInput) {
    transInput.addEventListener('change', updateEstimasiJarakWaktu);
  }
});

// ===================== DATA SMART SEARCH =====================
const dataSekolah = [
  { nama: "SMP Negeri 1 Serang", npsn: "20605051" },
  { nama: "SMP Negeri 2 Serang", npsn: "20605052" },
  { nama: "SMP Negeri 3 Serang", npsn: "20605053" },
  { nama: "MTs Negeri 1 Serang", npsn: "20605151" },
  { nama: "SMP Islam Terpadu", npsn: "20612345" },
  { nama: "SMP Al-Azhar Serang", npsn: "20698765" },
  { nama: "SMP IT Bina Bangsa", npsn: "20654321" },
  { nama: "MTs Al-Khairiyah", npsn: "20600001" },
  { nama: "SMP Negeri 2 Cilegon", npsn: "20606060" },
  { nama: "SMP Negeri 3 Pandeglang", npsn: "20607070" },
];

const dataAlamat = [
  { desa: "Cipare", kecamatan: "Serang", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42117" },
  { desa: "Sumurpecung", kecamatan: "Serang", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42118" },
  { desa: "Kaligandu", kecamatan: "Serang", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42115" },
  { desa: "Terondol", kecamatan: "Serang", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42116" },
  { desa: "Banjarsari", kecamatan: "Cipocok Jaya", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42123" },
  { desa: "Sukajaya", kecamatan: "Curug", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42171" },
  { desa: "Kasemen", kecamatan: "Kasemen", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42191" },
  { desa: "Taktakan", kecamatan: "Taktakan", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42162" },
  { desa: "Walantaka", kecamatan: "Walantaka", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42183" },
];

/**
 * Inisialisasi Smart Search (Autocomplete & Autofill)
 */
function initSmartSearch() {
  const listSekolah = document.getElementById('list_sekolah');
  const inputSekolah = document.getElementById('asal_sekolah');
  const inputNpsn = document.getElementById('npsn_asal');

  const listDesa = document.getElementById('list_desa');
  const inputDesa = document.getElementById('desa');
  const inputKecamatan = document.getElementById('kecamatan');
  const inputKabupaten = document.getElementById('kabupaten');
  const inputProvinsi = document.getElementById('provinsi');
  const inputKodePos = document.getElementById('kode_pos');
  const inputDusun = document.getElementById('dusun');
  const inputRt = document.getElementById('rt');
  const inputRw = document.getElementById('rw');
  const inputAlamatRumah = document.getElementById('alamat_rumah');

  function updateAlamatRumah() {
    if (!inputAlamatRumah) return;
    const dsn = inputDusun?.value ? inputDusun.value + ", " : "";
    const rt = inputRt?.value ? "RT " + inputRt.value : "";
    const rw = inputRw?.value ? "RW " + inputRw.value : "";
    const rtrw = (rt || rw) ? `${rt}/${rw}, ` : "";
    const desa = inputDesa?.value ? "Desa/Kel. " + inputDesa.value + ", " : "";
    const kec = inputKecamatan?.value ? "Kec. " + inputKecamatan.value + ", " : "";
    const kab = inputKabupaten?.value ? "Kab/Kota " + inputKabupaten.value + ", " : "";
    const prov = inputProvinsi?.value ? "Prov. " + inputProvinsi.value + " " : "";
    const pos = inputKodePos?.value ? inputKodePos.value : "";
    
    inputAlamatRumah.value = `${dsn}${rtrw}${desa}${kec}${kab}${prov}${pos}`.trim().replace(/,\s*$/, "");
    inputAlamatRumah.classList.remove('invalid');
  }

  const alamatInputs = [inputDesa, inputKecamatan, inputKabupaten, inputProvinsi, inputKodePos, inputDusun, inputRt, inputRw];
  alamatInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', updateAlamatRumah);
      input.addEventListener('change', updateAlamatRumah);
    }
  });

  // Populate Datalist Sekolah
  if (listSekolah) {
    dataSekolah.forEach(sekolah => {
      const option = document.createElement('option');
      option.value = sekolah.nama;
      listSekolah.appendChild(option);
    });
  }

  // Auto-fill NPSN
  if (inputSekolah && inputNpsn) {
    inputSekolah.addEventListener('input', (e) => {
      const selected = dataSekolah.find(s => s.nama.toLowerCase() === e.target.value.toLowerCase());
      if (selected) {
        inputNpsn.value = selected.npsn;
        inputNpsn.classList.remove('invalid');
        saveDraft();
      }
    });
  }

  // Populate Datalist Desa
  if (listDesa) {
    dataAlamat.forEach(alamat => {
      const option = document.createElement('option');
      option.value = alamat.desa;
      listDesa.appendChild(option);
    });
  }

  // Auto-fill Kecamatan, Kabupaten, Kode Pos
  if (inputDesa && inputKecamatan && inputKabupaten && inputKodePos && inputProvinsi) {
    inputDesa.addEventListener('input', (e) => {
      const selected = dataAlamat.find(a => a.desa.toLowerCase() === e.target.value.toLowerCase());
      if (selected) {
        inputKecamatan.value = selected.kecamatan;
        inputKecamatan.classList.remove('invalid');
        inputKabupaten.value = selected.kabupaten;
        inputKabupaten.classList.remove('invalid');
        inputProvinsi.value = selected.provinsi;
        inputProvinsi.classList.remove('invalid');
        inputKodePos.value = selected.kodepos;
        inputKodePos.classList.remove('invalid');
        
        updateAlamatRumah();
        saveDraft();
      }
    });
  }
}

/**
 * Inisialisasi Toggle Fields (Ortu meninggal, Alamat Ortu)
 */
function initToggles() {
  const statusAyah = document.getElementById('status_ayah');
  const wrapTahunAyah = document.getElementById('wrap_tahun_meninggal_ayah');
  if (statusAyah && wrapTahunAyah) {
    statusAyah.addEventListener('change', (e) => {
      wrapTahunAyah.style.display = e.target.value === 'Meninggal' ? 'flex' : 'none';
      saveDraft();
    });
  }

  const statusIbu = document.getElementById('status_ibu');
  const wrapTahunIbu = document.getElementById('wrap_tahun_meninggal_ibu');
  if (statusIbu && wrapTahunIbu) {
    statusIbu.addEventListener('change', (e) => {
      wrapTahunIbu.style.display = e.target.value === 'Meninggal' ? 'flex' : 'none';
      saveDraft();
    });
  }

  const cekAlamatOrtu = document.getElementById('alamat_ortu_sama');
  const wrapAlamatOrtu = document.getElementById('wrap_alamat_ortu');
  const alamatOrtu = document.getElementById('alamat_ortu');
  if (cekAlamatOrtu && wrapAlamatOrtu && alamatOrtu) {
    cekAlamatOrtu.addEventListener('change', (e) => {
      if (e.target.checked) {
        wrapAlamatOrtu.style.display = 'none';
        alamatOrtu.removeAttribute('required');
        alamatOrtu.value = '';
      } else {
        wrapAlamatOrtu.style.display = 'flex';
        alamatOrtu.setAttribute('required', 'required');
      }
      saveDraft();
    });
  }

  // Opsi Salin Data Wali Cepat
  const opsiWali = document.getElementById('opsi_salin_wali');
  if (opsiWali) {
    opsiWali.addEventListener('change', (e) => {
      const source = e.target.value; // 'ayah' atau 'ibu' atau ''
      const fields = ['nama', 'nik', 'tahun_lahir', 'pendidikan', 'pekerjaan', 'penghasilan', 'no_hp'];
      
      if (source === 'ayah' || source === 'ibu') {
        fields.forEach(field => {
          const srcEl = document.getElementById(`${field}_${source}`);
          const targetEl = document.getElementById(`${field}_wali`);
          if (srcEl && targetEl) {
            targetEl.value = srcEl.value;
            // Panggil event change manual (misal kalau pekerjaan lainnya ikut pindah)
            targetEl.dispatchEvent(new Event('change'));
          }
        });
        showToast(`✅ Data Wali disalin dari Data ${source === 'ayah' ? 'Ayah' : 'Ibu'}`, '');
      } else {
        // Kosongkan form wali jika kembali ke mode manual
        fields.forEach(field => {
          const targetEl = document.getElementById(`${field}_wali`);
          if (targetEl) {
            targetEl.value = '';
            targetEl.dispatchEvent(new Event('change'));
          }
        });
        showToast('Form Wali dikosongkan. Silakan isi manual.', '');
      }
      saveDraft();
    });
  }
}

// ===================== DEV: DUMMY DATA (Hapus saat production) =====================

/**
 * Helper: pilih random dari array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper: generate angka random N digit sebagai string
 */
function randomDigits(n) {
  let result = '';
  for (let i = 0; i < n; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

/**
 * Helper: set value pada select element
 */
function setSelect(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

/**
 * Helper: set value pada input element
 */
function setInput(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

/**
 * Mengisi seluruh form dengan data dummy acak untuk testing cepat.
 * Klik tombol "🎲 Dummy" di pojok kanan bawah.
 */
function fillDummyData() {
  // -- Data nama-nama random --
  const namaDepan = ['Ahmad', 'Muhammad', 'Rizky', 'Fajar', 'Dimas', 'Putri', 'Siti', 'Ayu', 'Nadia', 'Aisyah', 'Budi', 'Raka', 'Dewi', 'Fitri', 'Hana'];
  const namaBelakang = ['Pratama', 'Hidayat', 'Saputra', 'Ramadhani', 'Nugraha', 'Permata', 'Wijaya', 'Kurniawan', 'Santoso', 'Maharani', 'Putra', 'Sari'];
  const namaSekolah = ['SMP Negeri 1 Serang', 'SMP Negeri 2 Cilegon', 'MTs Al-Khairiyah', 'SMP Islam Terpadu', 'SMP Negeri 3 Pandeglang', 'MTs Negeri 1 Serang'];
  const kotaList = ['Serang', 'Cilegon', 'Pandeglang', 'Rangkasbitung', 'Tangerang', 'Lebak'];
  const kecamatanList = ['Serang', 'Cipocok Jaya', 'Kasemen', 'Taktakan', 'Walantaka', 'Curug'];
  const desaList = ['Cipare', 'Sumurpecung', 'Kaligandu', 'Terondol', 'Banjarsari', 'Sukajaya'];

  const siswa = `${randomPick(namaDepan)} ${randomPick(namaBelakang)}`;

  // ===== STEP 1: Data Registrasi =====
  setSelect('jurusan_1', randomPick(['DPIB/Arsitek Bangunan', 'ATPH', 'DKV']));
  setSelect('jurusan_2', randomPick(['DPIB/Arsitek Bangunan', 'ATPH', 'DKV']));
  setInput('asal_sekolah', randomPick(namaSekolah));
  setInput('npsn_asal', randomDigits(8));
  setSelect('tahun_lulus', randomPick(['2026', '2025']));
  setSelect('prestasi', randomPick(['Tidak Ada', 'Juara 1/2/3 Tingkat Kabupaten/Kota', "Hafidz Qur'an"]));

  // ===== STEP 1: Data Pribadi =====
  setInput('nama_lengkap', siswa);
  setSelect('jenis_kelamin', randomPick(['Laki-laki', 'Perempuan']));
  setInput('nisn', randomDigits(10));
  setInput('nik', '3604' + randomDigits(12));
  setInput('no_kk', '3604' + randomDigits(12));
  setInput('tempat_lahir', randomPick(kotaList));
  setInput('tanggal_lahir', `20${randomPick(['08', '09', '10'])}-${randomPick(['01','03','05','07','09','11'])}-${randomPick(['05','12','18','23','28'])}`);
  setSelect('agama', 'Islam');
  setInput('anak_ke', String(Math.floor(Math.random() * 4) + 1));
  setInput('jml_saudara', String(Math.floor(Math.random() * 5)));
  setInput('jml_kakak', '1');
  setInput('jml_adik', '1');
  setInput('no_hp_siswa', '0812' + randomDigits(8));
  setInput('email_siswa', siswa.toLowerCase().replace(/\s+/g, '.') + '@gmail.com');
  setInput('no_kps', '');

  // ===== STEP 2: Alamat =====
  const randDusun = randomPick(['Kampung Baru', 'Jln. Melati', 'Kampung Melayu', 'Sukamaju', '']);
  const randRt = String(Math.floor(Math.random() * 15) + 1).padStart(3, '0');
  const randRw = String(Math.floor(Math.random() * 10) + 1).padStart(3, '0');
  const randDesa = randomPick(desaList);
  const randKec = randomPick(kecamatanList);
  const randKab = randomPick(['Kota Serang', 'Kab. Serang', 'Kota Cilegon']);
  const randProv = 'Banten';
  const randPos = '421' + randomDigits(2);

  setInput('dusun', randDusun);
  setInput('rt', randRt);
  setInput('rw', randRw);
  setInput('desa', randDesa);
  setInput('kecamatan', randKec);
  setInput('kabupaten', randKab);
  setInput('provinsi', randProv);
  setInput('kode_pos', randPos);

  const dsnStr = randDusun ? randDusun + ", " : "";
  const rtrwStr = `RT ${randRt}/RW ${randRw}, `;
  const desaStr = `Desa/Kel. ${randDesa}, `;
  const kecStr = `Kec. ${randKec}, `;
  const kabStr = `Kab/Kota ${randKab}, `;
  const provStr = `Prov. ${randProv} ${randPos}`;
  setInput('alamat_rumah', `${dsnStr}${rtrwStr}${desaStr}${kecStr}${kabStr}${provStr}`);

  // Koordinat dummy (area Serang, Banten)
  const lat = (-6.1 - Math.random() * 0.2).toFixed(6);
  const lng = (106.1 + Math.random() * 0.2).toFixed(6);
  setInput('koordinat', `${lat}, ${lng}`);

  setSelect('jenis_tinggal', randomPick(['Bersama Orang Tua', 'Wali']));
  setSelect('transportasi', randomPick(['Kendaraan Pribadi', 'Kendaraan Umum', 'Jalan Kaki']));
  setSelect('jarak_sekolah', randomPick(['Kurang dari 1 KM', '1-3 KM', '3-5 KM']));
  setInput('waktu_tempuh', randomPick(['15 Menit', '30 Menit', '45 Menit', '1 Jam']));

  // ===== STEP 3: Data Orang Tua =====
  setInput('nama_ayah', `${randomPick(namaDepan)} ${randomPick(namaBelakang)}`);
  setInput('nik_ayah', '3604' + randomDigits(12));
  setInput('tahun_lahir_ayah', String(1970 + Math.floor(Math.random() * 15)));
  setSelect('pendidikan_ayah', randomPick(['SMA', 'S1', 'SMP', 'D3']));
  setSelect('pekerjaan_ayah', randomPick(['Wiraswasta', 'Karyawan Swasta', 'PNS', 'Buruh', 'Pedagang']));
  setSelect('penghasilan_ayah', randomPick(['1-2 Juta', '2-5 Juta', 'Lebih dari 5 Juta']));
  setInput('no_hp_ayah', '0813' + randomDigits(8));

  setInput('nama_ibu', `${randomPick(['Siti', 'Dewi', 'Nining', 'Yanti', 'Sri', 'Rina'])} ${randomPick(namaBelakang)}`);
  setInput('nik_ibu', '3604' + randomDigits(12));
  setInput('tahun_lahir_ibu', String(1972 + Math.floor(Math.random() * 15)));
  setSelect('pendidikan_ibu', randomPick(['SMA', 'S1', 'SMP', 'D3']));
  setSelect('pekerjaan_ibu', randomPick(['Ibu Rumah Tangga', 'Wiraswasta', 'Karyawan Swasta']));
  setSelect('penghasilan_ibu', randomPick(['Kurang dari 1 Juta', '1-2 Juta', '2-5 Juta']));
  setInput('no_hp_ibu', '0857' + randomDigits(8));

  // Data Fisik
  setInput('tinggi_badan', String(150 + Math.floor(Math.random() * 30)));
  setInput('berat_badan', String(40 + Math.floor(Math.random() * 30)));
  setSelect('gol_darah', randomPick(['A', 'B', 'AB', 'O']));

  // Informasi Tambahan
  setSelect('alasan_memilih', randomPick(['Teman', 'Alumni', 'Kabar Berita', 'Tetangga', 'Saudara', 'Sosial Media']));

  showToast(`✅ Data dummy "${siswa}" berhasil diisi!`, '');
}

// ===================== DEV MODE ACTIVATION =====================
// Tombol dummy HANYA muncul untuk developer yang authorized.
// Cara aktifkan: buka halaman dengan parameter ?dev=tuancraf1@gmail.com
// Cara nonaktifkan: buka halaman dengan ?dev=off

const DEV_EMAIL = 'tuancraf1@gmail.com';
const DEV_KEY = 'ppdb_dev_mode';

function initDevMode() {
  const btnDummy = document.getElementById('btnDummy');
  if (!btnDummy) return;

  // Cek URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const devParam = urlParams.get('dev');

  // Aktivasi: ?dev=tuancraf1@gmail.com
  if (devParam === DEV_EMAIL) {
    localStorage.setItem(DEV_KEY, DEV_EMAIL);
    // Bersihkan URL agar param tidak terlihat
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Deaktivasi: ?dev=off
  if (devParam === 'off') {
    localStorage.removeItem(DEV_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Sembunyikan tombol dummy secara default
  btnDummy.style.display = 'none';
  btnDummy.addEventListener('click', fillDummyData);

  // Shortcut Alt + P (Hanya Desktop)
  document.addEventListener('keydown', (e) => {
    // Cek apakah perangkat adalah desktop (lebar >= 768px)
    if (window.innerWidth >= 768) {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault(); // Mencegah default browser hotkey
        
        // Toggle visibilitas tombol Dummy
        if (btnDummy.style.display === 'none' || btnDummy.style.display === '') {
          // Asumsi form awal .btn-dummy memakai style block atau flex, kita pakai flex untuk menyelaraskan icon dan teks
          btnDummy.style.display = 'flex';
          showToast('🛠️ Developer Mode: Tombol Dummy Aktif', '');
        } else {
          btnDummy.style.display = 'none';
          showToast('🔒 Developer Mode Dinonaktifkan', '');
        }
      }
    }
  });
}

initDevMode();

// ===================== INISIALISASI =====================

// Set initial state ke Step 1
goToStep(1);
initToggles();
initAutoCapitalize();
initNumericIDValidation();

// ===================== AUTO CAPITALIZE =====================
/**
 * Fitur untuk otomatis membuat huruf pertama pada setiap kata menjadi kapital
 * (Title Case / Capitalize Each Word) sebagaimana diminta.
 */
function initAutoCapitalize() {
  const fields = [
    'nama_lengkap', 'tempat_lahir', 'nama_ayah', 'nama_ibu', 'nama_wali',
    'alamat_rumah', 'dusun', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'alamat_ortu',
    'asal_sekolah'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.addEventListener('input', applyCapitalize);
    }
  });

  // Untuk form "Lainnya" yang diketik manual (karena dropdown tidak bisa diketik)
  // termasuk pekerjaan_ayah, jurusan, jenis_tinggal, transportasi jika user milih "Lainnya"
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('input-pekerjaan-lainnya') || e.target.classList.contains('input-lainnya-text')) {
      applyCapitalize(e);
    }
  });
}

function applyCapitalize(e) {
  const el = e.target;
  let start = el.selectionStart;
  let end = el.selectionEnd;
  
  let val = el.value;
  // Pisahkan string berdasarkan spasi
  let words = val.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 0) {
      // Huruf pertama kapital, sisa di belakang huruf kecil
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
    }
  }
  
  el.value = words.join(' ');
  
  // Kembalikan posisi kursor agar user merasa tidak terganggu / melompat
  if (el.type === 'text') {
    el.setSelectionRange(start, end);
  }
}

// ===================== VALIDASI NOMOR & DIGIT =====================
/**
 * Fitur untuk menyaring karakter huruf dari input ID numerik
 * dan memastikan jumlah digit dibatasi & divalidasi live.
 */
function initNumericIDValidation() {
  const idRules = {
    npsn_asal: 8, 
    nisn: 10, 
    nik: 16, 
    no_kk: 16,
    nik_ayah: 16, 
    nik_ibu: 16, 
    nik_wali: 16
  };

  Object.keys(idRules).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Pasang atribut HTML untuk keamanan tambahan user experience mobile
      el.setAttribute('maxlength', idRules[id]);
      el.setAttribute('inputmode', 'numeric');
      // el.setAttribute('pattern', '[0-9]*');
      
      el.addEventListener('input', function(e) {
        // Hapus karakter apa pun yang bukan angka 0-9
        let val = this.value.replace(/\D/g, '');
        
        // Potong jika kelebihan (redundant krn maxlength tapi sbg sekuritas tambahan saat copas)
        if (val.length > idRules[id]) {
          val = val.substring(0, idRules[id]);
        }
        
        // Terapkan value baru
        this.value = val;
        
        // Cek live feedback warna kolom (merah = tidak pas jumlah digitnya)
        if (val.length > 0 && val.length < idRules[id]) {
          this.classList.add('invalid'); // Bakal merah kalau belum 16 digit misal KK
        } else if (val.length === idRules[id]) {
          this.classList.remove('invalid'); // Normal jika pas 16
        }
      });
    }
  });
}

