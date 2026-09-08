/* ============================================================
   PPDB Online - SMP IT Al-Hawari
   script-smp.js — Multi-step Navigation, Validation, Geolocation, Submit
   ============================================================ */

// ===================== KONFIGURASI API =====================
// GANTI dengan URL Google Apps Script BARU yang sudah di-deploy untuk SMP
const scriptURL_SMP = 'https://script.google.com/macros/s/AKfycbxRsXTvkeMYX3ITVxLpXP-5Xd_JdzT8s7hnQFGk9EL4d7FSRUt-0PLchTqyYZGxjcE/exec';

// ===================== DOM ELEMENTS =====================
const form         = document.getElementById('ppdbFormSMP');
const steps        = document.querySelectorAll('.form-step');
const stepItems    = document.querySelectorAll('.step-item');
const progressFill = document.getElementById('progressFill');
const btnNextAll   = document.querySelectorAll('.btn-next');
const btnPrevAll   = document.querySelectorAll('.btn-prev');
const btnSubmit    = document.getElementById('btnSubmit');
const btnGeo       = document.getElementById('btnGeo');
const koordinatInput = document.getElementById('koordinat');
const geoStatus    = document.getElementById('geoStatus');
const notifOverlay = document.getElementById('notifOverlay');
const btnNotifClose= document.getElementById('btnNotifClose');
const toast        = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

let currentStep = 1;
const totalSteps = 4;

// ===================== MULTI-STEP NAVIGATION =====================
function goToStep(stepNumber) {
  steps.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`step${stepNumber}`);
  if (target) target.classList.add('active');

  stepItems.forEach((item, idx) => {
    const n = idx + 1;
    item.classList.remove('active', 'completed');
    if (n < stepNumber) item.classList.add('completed');
    else if (n === stepNumber) item.classList.add('active');
  });

  progressFill.style.width = `${(stepNumber / totalSteps) * 100}%`;
  currentStep = stepNumber;
  localStorage.setItem('ppdb_smp_step', stepNumber);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== VALIDASI STEP =====================
function validateStep(stepNumber) {
  const stepEl = document.getElementById(`step${stepNumber}`);
  const requiredFields = stepEl.querySelectorAll('[required]');
  let isValid = true;
  let firstInvalid = null;

  requiredFields.forEach(field => {
    field.classList.remove('invalid');
    if (!field.value.trim()) {
      field.classList.add('invalid');
      isValid = false;
      if (!firstInvalid) firstInvalid = field;
    }
  });

  // Validasi panjang digit ID numerik
  const idRules = { nisn: 10, nik: 16, no_kk: 16, nik_ayah: 16, nik_ibu: 16, nik_wali: 16 };
  Object.keys(idRules).forEach(id => {
    const f = document.getElementById(id);
    if (f && stepEl.contains(f)) {
      const val = f.value.replace(/\D/g, '');
      if (val.length > 0 && val.length !== idRules[id]) {
        f.classList.add('invalid');
        isValid = false;
        if (!firstInvalid) firstInvalid = f;
      }
    }
  });

  // Validasi format email
  const emailField = document.getElementById('email_siswa');
  if (emailField && stepEl.contains(emailField) && emailField.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailField.value.trim())) {
      emailField.classList.add('invalid');
      isValid = false;
      if (!firstInvalid) firstInvalid = emailField;
    }
  }

  // Validasi tanggal lahir: tidak boleh masa depan, tidak sebelum 1990
  const tglLahirField = document.getElementById('tanggal_lahir');
  if (tglLahirField && stepEl.contains(tglLahirField) && tglLahirField.value) {
    const tglLahir = new Date(tglLahirField.value);
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate  = new Date('1990-01-01');
    if (tglLahir > today || tglLahir < minDate) {
      tglLahirField.classList.add('invalid');
      isValid = false;
      if (!firstInvalid) firstInvalid = tglLahirField;
    }
  }

  if (!isValid && firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus();
    showToast('Mohon lengkapi seluruh field dengan benar (perhatikan jumlah digit).', 'error');
  }
  return isValid;
}

// Auto clear invalid + autosave
document.addEventListener('input', e => {
  if (e.target.matches('input, select, textarea')) {
    e.target.classList.remove('invalid');
    saveDraft();
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('select, input')) {
    e.target.classList.remove('invalid');
    saveDraft();
  }
});

// ===================== NEXT & PREV =====================
btnNextAll.forEach(btn => {
  btn.addEventListener('click', () => {
    if (validateStep(currentStep)) goToStep(parseInt(btn.dataset.next));
  });
});
btnPrevAll.forEach(btn => {
  btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.prev)));
});

// ===================== GEOLOCATION =====================
const SCHOOL_LAT = -7.0826267221245915;
const SCHOOL_LNG =  107.95834980524963;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateEstimasi() {
  const coord = document.getElementById('koordinat')?.value;
  const trans = document.getElementById('transportasi')?.value;
  const elJarak = document.getElementById('jarak_sekolah');
  const elWaktu = document.getElementById('waktu_tempuh');
  if (!coord) return;
  const parts = coord.split(',');
  if (parts.length !== 2) return;
  const lat = parseFloat(parts[0].trim()), lng = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lng)) return;

  const dist = haversine(SCHOOL_LAT, SCHOOL_LNG, lat, lng);
  if (elJarak) {
    elJarak.value = dist < 1 ? 'Kurang dari 1 KM' : dist <= 3 ? '1-3 KM' : dist <= 5 ? '3-5 KM' : 'Lebih dari 5 KM';
    elJarak.classList.remove('invalid');
  }
  if (elWaktu) {
    let speed = trans === 'Jalan Kaki' ? 5 : trans === 'Kendaraan Umum' ? 20 : trans === 'Jemputan' ? 25 : trans === 'Diantar Orang Tua' ? 30 : 40;
    let mins = Math.max(1, Math.round(dist / speed * 60));
    elWaktu.value = mins < 60 ? `${mins} Menit` : `${Math.floor(mins/60)} Jam${mins%60 ? ' '+mins%60+' Menit' : ''}`;
    elWaktu.classList.remove('invalid');
  }
}

btnGeo.addEventListener('click', () => {
  if (!navigator.geolocation) {
    geoStatus.textContent = '❌ Browser tidak mendukung Geolocation.';
    return;
  }
  const geoText    = btnGeo.querySelector('.geo-text');
  const geoSpinner = btnGeo.querySelector('.geo-spinner');
  geoText.style.display = 'none';
  geoSpinner.style.display = 'flex';
  btnGeo.disabled = true;
  geoStatus.textContent = 'Mengambil lokasi... Mohon izinkan akses lokasi.';
  geoStatus.className = 'geo-status';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      koordinatInput.value = `${lat}, ${lng}`;
      koordinatInput.classList.remove('invalid');
      updateEstimasi();
      geoStatus.textContent = 'Memproses alamat otomatis...';
      geoStatus.className = 'geo-status success';

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(r => r.json())
        .then(data => {
          if (data?.address) {
            const a = data.address;
            const fill = {
              desa: a.village || a.suburb || a.neighbourhood || '',
              kecamatan: a.city_district || a.county || '',
              kabupaten: a.city || a.town || a.county || '',
              provinsi: a.state || '',
              kode_pos: a.postcode || ''
            };
            Object.entries(fill).forEach(([id, val]) => {
              const el = document.getElementById(id);
              if (el && val) { el.value = val; el.classList.remove('invalid'); }
            });
            document.getElementById('desa')?.dispatchEvent(new Event('input'));
            geoStatus.textContent = '✅ Alamat berhasil terisi dari GPS! Harap cek ulang.';
            showToast('Alamat otomatis terisi dari lokasi Anda. Mohon diperiksa kembali.', '');
          } else {
            geoStatus.textContent = '✅ Koordinat berhasil diambil.';
          }
        })
        .catch(() => { geoStatus.textContent = `✅ Koordinat didapat (±${Math.round(pos.coords.accuracy)}m).`; })
        .finally(() => {
          geoText.style.display = 'inline';
          geoSpinner.style.display = 'none';
          btnGeo.disabled = false;
        });
    },
    err => {
      const msgs = {1:'❌ Akses lokasi ditolak. Mohon izinkan di pengaturan browser.', 2:'❌ Informasi lokasi tidak tersedia.', 3:'❌ Permintaan lokasi timeout.'};
      geoStatus.textContent = msgs[err.code] || '❌ Gagal mengambil lokasi.';
      geoStatus.className = 'geo-status error';
      geoText.style.display = 'inline';
      geoSpinner.style.display = 'none';
      btnGeo.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

// ===================== TOGGLE FIELDS =====================
function initToggles() {
  // Status Ayah meninggal
  const statusAyah = document.getElementById('status_ayah');
  const wrapAyah   = document.getElementById('wrap_tahun_meninggal_ayah');
  if (statusAyah && wrapAyah) {
    statusAyah.addEventListener('change', e => {
      wrapAyah.style.display = e.target.value === 'Meninggal' ? 'flex' : 'none';
      saveDraft();
    });
  }

  // Status Ibu meninggal
  const statusIbu = document.getElementById('status_ibu');
  const wrapIbu   = document.getElementById('wrap_tahun_meninggal_ibu');
  if (statusIbu && wrapIbu) {
    statusIbu.addEventListener('change', e => {
      wrapIbu.style.display = e.target.value === 'Meninggal' ? 'flex' : 'none';
      saveDraft();
    });
  }

  // Checkbox alamat ortu sama dengan siswa
  const cekSama    = document.getElementById('alamat_ortu_sama');
  const wrapOrtu   = document.getElementById('wrap_alamat_ortu');
  const inputOrtu  = document.getElementById('alamat_ortu');
  if (cekSama && wrapOrtu && inputOrtu) {
    cekSama?.addEventListener('change', e => {
      if (e.target.checked) {
        wrapOrtu.style.display = 'none';
        inputOrtu.removeAttribute('required');
        inputOrtu.value = '';
      } else {
        wrapOrtu.style.display = 'flex';
        inputOrtu.setAttribute('required', 'required');
      }
      saveDraft();
    });
  }

  // Opsi Salin Data Wali dari Ayah / Ibu secara otomatis
  const opsiWali = document.getElementById('opsi_salin_wali');
  if (opsiWali) {
    opsiWali.addEventListener('change', e => {
      const source = e.target.value; // 'ayah', 'ibu', atau ''
      // Field yang namanya konsisten: nama_{source}, nik_{source}, dll.
      const fields = ['nama', 'nik', 'tahun_lahir', 'pendidikan', 'pekerjaan', 'penghasilan', 'no_hp'];

      if (source === 'ayah' || source === 'ibu') {
        fields.forEach(field => {
          const srcEl    = document.getElementById(`${field}_${source}`);
          const targetEl = document.getElementById(`${field}_wali`);
          if (srcEl && targetEl) {
            targetEl.value = srcEl.value;
            // Trigger change agar toggle pekerjaan "lainnya" juga ikut berubah jika perlu
            targetEl.dispatchEvent(new Event('change'));
          }
        });
        showToast(`✅ Data Wali disalin dari Data ${source === 'ayah' ? 'Ayah' : 'Ibu'}`, '');
      } else {
        // Kosongkan semua field wali jika kembali ke mode manual
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

  // Pekerjaan "lainnya" toggle
  document.addEventListener('change', function(e) {
    if (e.target?.classList.contains('select-pekerjaan') || e.target?.classList.contains('select-lainnya')) {
      const inputEl = e.target.parentElement.querySelector('.input-pekerjaan-lainnya, .input-lainnya-text');
      if (!inputEl) return;
      if (e.target.value === 'lainnya') {
        inputEl.style.display = 'block';
        inputEl.setAttribute('required', 'required');
        inputEl.focus();
      } else {
        inputEl.style.display = 'none';
        inputEl.removeAttribute('required');
        inputEl.value = '';
      }
    }
  });
}

// ===================== BASE64 FILE READER (dengan kompresi gambar) =====================

/**
 * Kompres gambar menggunakan canvas sebelum konversi ke Base64.
 * Dimensi maksimal: 1200px. Kualitas JPEG: 0.75.
 * File non-gambar (PDF, dll) langsung dikonversi tanpa kompresi.
 */
function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        else                 { width  = Math.round(width  * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Gagal mengompres gambar.')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve({
            base64:   reader.result.split(',')[1],
            name:     file.name.replace(/\.[^.]+$/, '.jpg'),
            mimeType: 'image/jpeg'
          });
          reader.onerror = err => reject(err);
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.75
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Gagal memuat gambar.')); };
    img.src = objectUrl;
  });
}

function getFileBase64(inputId) {
  return new Promise((resolve, reject) => {
    const input = document.getElementById(inputId);
    if (!input || !input.files?.length) { resolve(null); return; }
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error(`File "${file.name}" terlalu besar. Maksimal 10MB.`));
      return;
    }
    // Kompres jika gambar, langsung baca jika bukan (PDF, dll)
    if (file.type.startsWith('image/')) {
      compressImageToBase64(file).then(resolve).catch(reject);
    } else {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], name: file.name, mimeType: file.type });
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    }
  });
}

// ===================== PREVIEW NAMA FILE =====================
(function initFilePreview() {
  const map = [
    { inputId: 'fileIjazah', nameId: 'nameIjazah' },
    { inputId: 'fileSHUSM',  nameId: 'nameSHUSM'  },
    { inputId: 'filePhoto',  nameId: 'namePhoto'  },
    { inputId: 'fileKK',     nameId: 'nameKK'     },
    { inputId: 'fileKTP',    nameId: 'nameKTP'    },
    { inputId: 'fileAkta',   nameId: 'nameAkta'   },
    { inputId: 'fileKIP',    nameId: 'nameKIP'    },
  ];
  map.forEach(({ inputId, nameId }) => {
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    const label = input?.nextElementSibling;
    if (!input || !nameEl) return;
    input.addEventListener('change', () => {
      if (input.files?.length) {
        const f = input.files[0];
        if (f.size > 10 * 1024 * 1024) {
          alert(`File "${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 10 MB. File ditolak! Silakan pilih file yang lebih kecil.`);
          input.value = '';
          nameEl.textContent = '❌ Ukuran file melebihi 10 MB (Ditolak)';
          nameEl.style.color = '#dc2626';
          if (label) label.style.borderColor = '#dc2626';
          return;
        }
        nameEl.textContent = `✅ ${f.name} (${(f.size/1024).toFixed(1)} KB)`;
        nameEl.style.color = 'var(--success, #16a34a)';
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
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  if (window.handleFormSubmitAPI) {
    window.handleFormSubmitAPI(form);
  } else {
    console.error("handleFormSubmitAPI is not defined");
  }
});

// ===================== SUBMIT LOADING STATE =====================
function setSubmitLoading(loading) {
  const icon = btnSubmit.querySelector('.submit-icon');
  const text = btnSubmit.querySelector('.submit-text');
  const load = btnSubmit.querySelector('.submit-loading');
  if (loading) {
    icon.style.display = 'none'; text.style.display = 'none';
    load.style.display = 'flex'; btnSubmit.disabled = true;
  } else {
    icon.style.display = 'block'; text.style.display = 'inline';
    load.style.display = 'none'; btnSubmit.disabled = false;
  }
}

// ===================== NOTIFICATION =====================
function showNotification() {
  notifOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeNotification() {
  notifOverlay.classList.remove('show');
  document.body.style.overflow = '';
}
btnNotifClose.addEventListener('click', closeNotification);
notifOverlay.addEventListener('click', e => { if (e.target === notifOverlay) closeNotification(); });

// ===================== TOAST =====================
function showToast(message, type = '') {
  toastMessage.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===================== DRAFT (Auto-save) =====================
const DRAFT_KEY = 'ppdb_smp_draft';

function saveDraft() {
  try {
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });
    data._currentStep = currentStep;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (e) { console.warn('Gagal simpan draft:', e); }
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    Object.keys(data).forEach(key => {
      if (key.startsWith('_')) return;
      const field = form.querySelector(`[name="${key}"]`);
      if (field) field.value = data[key];
    });
    const savedStep = parseInt(localStorage.getItem('ppdb_smp_step'));
    if (savedStep >= 1 && savedStep <= totalSteps) goToStep(savedStep);
    showToast('📝 Draft sebelumnya berhasil dimuat.', '');
  } catch (e) { console.warn('Gagal muat draft:', e); }
}

// ===================== AUTO CAPITALIZE =====================
function initAutoCapitalize() {
  const fields = [
    'nama_lengkap', 'tempat_lahir', 'nama_ayah', 'nama_ibu', 'nama_wali',
    'alamat_rumah', 'dusun', 'desa', 'kecamatan', 'kabupaten', 'provinsi',
    'alamat_ortu', 'asal_sekolah', 'riwayat_penyakit'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.addEventListener('input', applyCapitalize);
    }
  });
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('input-pekerjaan-lainnya') || e.target.classList.contains('input-lainnya-text')) {
      applyCapitalize(e);
    }
  });
}

function applyCapitalize(e) {
  const el = e.target;
  const start = el.selectionStart, end = el.selectionEnd;
  el.value = el.value.split(' ').map(w => w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
  if (el.type === 'text') el.setSelectionRange(start, end);
}

// ===================== VALIDASI DIGIT NUMERIK =====================
function initNumericIDValidation() {
  const idRules = { npsn_asal: 8, nisn: 10, nik: 16, no_kk: 16, nik_ayah: 16, nik_ibu: 16, nik_wali: 16 };

  Object.keys(idRules).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('maxlength', idRules[id]);
      el.setAttribute('inputmode', 'numeric');
      el.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        if (val.length > idRules[id]) val = val.substring(0, idRules[id]);
        this.value = val;
        if (val.length > 0 && val.length < idRules[id]) {
          this.classList.add('invalid');
        } else if (val.length === idRules[id]) {
          this.classList.remove('invalid');
        }
      });
    }
  });
}

// ===================== SMART SEARCH (Autocomplete) =====================
const dataSekolahSD = [
  { nama: "SD Negeri 1 Serang",     npsn: "20605100" },
  { nama: "SD Negeri 2 Serang",     npsn: "20605101" },
  { nama: "SD Negeri 3 Serang",     npsn: "20605102" },
  { nama: "MI Negeri 1 Serang",     npsn: "20605200" },
  { nama: "MI Negeri 2 Serang",     npsn: "20605201" },
  { nama: "SD Islam Terpadu",       npsn: "20612400" },
  { nama: "SD IT Al-Hawari",        npsn: "20612401" },
  { nama: "SD Al-Azhar Serang",     npsn: "20698800" },
  { nama: "MI Al-Khairiyah",        npsn: "20600100" },
  { nama: "SD Negeri 1 Cilegon",    npsn: "20606100" },
  { nama: "SD Negeri 1 Pandeglang", npsn: "20607100" },
];

const dataAlamat = [
  { desa: "Cipare",       kecamatan: "Serang",       kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42117" },
  { desa: "Sumurpecung",  kecamatan: "Serang",       kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42118" },
  { desa: "Kaligandu",    kecamatan: "Serang",       kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42115" },
  { desa: "Terondol",     kecamatan: "Serang",       kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42116" },
  { desa: "Banjarsari",   kecamatan: "Cipocok Jaya", kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42123" },
  { desa: "Sukajaya",     kecamatan: "Curug",        kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42171" },
  { desa: "Kasemen",      kecamatan: "Kasemen",      kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42191" },
  { desa: "Taktakan",     kecamatan: "Taktakan",     kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42162" },
  { desa: "Walantaka",    kecamatan: "Walantaka",    kabupaten: "Kota Serang", provinsi: "Banten", kodepos: "42183" },
];

function initSmartSearch() {
  const listSekolah  = document.getElementById('list_sekolah_sd');
  const inputSekolah = document.getElementById('asal_sekolah');
  const inputNpsn    = document.getElementById('npsn_asal');
  const listDesa     = document.getElementById('list_desa');
  const inputDesa    = document.getElementById('desa');
  const inputKec     = document.getElementById('kecamatan');
  const inputKab     = document.getElementById('kabupaten');
  const inputProv    = document.getElementById('provinsi');
  const inputPos     = document.getElementById('kode_pos');
  const inputDusun   = document.getElementById('dusun');
  const inputRt      = document.getElementById('rt');
  const inputRw      = document.getElementById('rw');
  const inputAlamat  = document.getElementById('alamat_rumah');

  // Build alamat_rumah otomatis
  function updateAlamatRumah() {
    if (!inputAlamat) return;
    const dsn  = inputDusun?.value ? inputDusun.value + ', ' : '';
    const rt   = inputRt?.value  ? 'RT ' + inputRt.value  : '';
    const rw   = inputRw?.value  ? 'RW ' + inputRw.value  : '';
    const rtrw = (rt || rw) ? `${rt}/${rw}, ` : '';
    const dsa  = inputDesa?.value  ? 'Desa/Kel. ' + inputDesa.value + ', '   : '';
    const kec  = inputKec?.value   ? 'Kec. '      + inputKec.value  + ', '   : '';
    const kab  = inputKab?.value   ? 'Kab/Kota '  + inputKab.value  + ', '   : '';
    const prov = inputProv?.value  ? 'Prov. '     + inputProv.value + ' '    : '';
    const pos  = inputPos?.value   ? inputPos.value                           : '';
    inputAlamat.value = `${dsn}${rtrw}${dsa}${kec}${kab}${prov}${pos}`.trim().replace(/,\s*$/, '');
    inputAlamat.classList.remove('invalid');
  }

  // Listener auto-build alamat
  [inputDesa, inputKec, inputKab, inputProv, inputPos, inputDusun, inputRt, inputRw].forEach(el => {
    el?.addEventListener('input', updateAlamatRumah);
    el?.addEventListener('change', updateAlamatRumah);
  });

  // Populate datalist sekolah SD
  if (listSekolah) {
    dataSekolahSD.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nama;
      listSekolah.appendChild(opt);
    });
  }
  // Auto-fill NPSN saat nama sekolah cocok
  inputSekolah?.addEventListener('input', e => {
    const match = dataSekolahSD.find(s => s.nama.toLowerCase() === e.target.value.toLowerCase());
    if (match && inputNpsn) { inputNpsn.value = match.npsn; inputNpsn.classList.remove('invalid'); saveDraft(); }
  });

  // Populate datalist desa
  if (listDesa) {
    dataAlamat.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.desa;
      listDesa.appendChild(opt);
    });
  }
  // Auto-fill kecamatan/kab/prov/kodepos saat desa cocok
  inputDesa?.addEventListener('input', e => {
    const match = dataAlamat.find(d => d.desa.toLowerCase() === e.target.value.toLowerCase());
    if (match) {
      if (inputKec  && !inputKec.value)  { inputKec.value  = match.kecamatan; inputKec.classList.remove('invalid'); }
      if (inputKab  && !inputKab.value)  { inputKab.value  = match.kabupaten; inputKab.classList.remove('invalid'); }
      if (inputProv && !inputProv.value) { inputProv.value = match.provinsi;  inputProv.classList.remove('invalid'); }
      if (inputPos  && !inputPos.value)  { inputPos.value  = match.kodepos;   inputPos.classList.remove('invalid'); }
      updateAlamatRumah();
      saveDraft();
    }
  });
}

// ===================== DEV: DUMMY DATA =====================
function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDigits(n) { let r = ''; for(let i=0;i<n;i++) r += Math.floor(Math.random()*10); return r; }
function setSelect(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function setInput(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }

function fillDummyData() {
  const namaDepan    = ['Ahmad', 'Muhammad', 'Rizky', 'Fajar', 'Dimas', 'Putri', 'Siti', 'Ayu', 'Nadia', 'Aisyah', 'Budi', 'Raka'];
  const namaBelakang = ['Pratama', 'Hidayat', 'Saputra', 'Ramadhani', 'Nugraha', 'Permata', 'Wijaya', 'Kurniawan'];
  const namaSekolahSD= ['SD Negeri 1 Serang', 'SD Negeri 2 Serang', 'MI Negeri 1 Serang', 'SD IT Al-Hawari', 'MI Al-Khairiyah'];
  const kotaList     = ['Serang', 'Cilegon', 'Pandeglang', 'Rangkasbitung', 'Tangerang'];
  const kecList      = ['Serang', 'Cipocok Jaya', 'Kasemen', 'Taktakan', 'Walantaka'];
  const desaList     = ['Cipare', 'Sumurpecung', 'Kaligandu', 'Terondol', 'Banjarsari'];

  const siswa = `${randomPick(namaDepan)} ${randomPick(namaBelakang)}`;

  // Step 1 — Registrasi
  setInput('asal_sekolah', randomPick(namaSekolahSD));
  setInput('npsn_asal', randomDigits(8));
  setSelect('tahun_lulus', randomPick(['2026', '2025']));
  setSelect('prestasi', randomPick(['Tidak Ada', 'Juara 1/2/3 Tingkat Kecamatan', "Hafidz Qur'an"]));

  // Step 1 — Pribadi
  setInput('nama_lengkap', siswa);
  setSelect('jenis_kelamin', randomPick(['Laki-laki', 'Perempuan']));
  setInput('nisn', randomDigits(10));
  setInput('nik', '3604' + randomDigits(12));
  setInput('no_kk', '3604' + randomDigits(12));
  setInput('tempat_lahir', randomPick(kotaList));
  setInput('tanggal_lahir', `20${randomPick(['12','13','14'])}-${randomPick(['01','03','05','07'])}-${randomPick(['05','12','18','23'])}`);
  setSelect('agama', 'Islam');
  setInput('anak_ke', String(Math.floor(Math.random()*4)+1));
  setInput('jml_saudara', String(Math.floor(Math.random()*5)));
  setInput('jml_kakak', '1');
  setInput('jml_adik', '1');
  setInput('no_hp_siswa', '0812' + randomDigits(8));
  setInput('email_siswa', siswa.toLowerCase().replace(/\s+/g, '.') + '@gmail.com');

  // Step 2 — Alamat
  const randDusun = randomPick(['Kampung Baru', 'Jln. Melati', 'Sukamaju', '']);
  const randRt  = String(Math.floor(Math.random()*15)+1).padStart(3,'0');
  const randRw  = String(Math.floor(Math.random()*10)+1).padStart(3,'0');
  const randDesa = randomPick(desaList);
  const randKec  = randomPick(kecList);
  const randKab  = randomPick(['Kota Serang', 'Kab. Serang', 'Kota Cilegon']);
  const randProv = 'Banten';
  const randPos  = '421' + randomDigits(2);

  setInput('dusun', randDusun);
  setInput('rt', randRt); setInput('rw', randRw);
  setInput('desa', randDesa); setInput('kecamatan', randKec);
  setInput('kabupaten', randKab); setInput('provinsi', randProv);
  setInput('kode_pos', randPos);
  setInput('alamat_rumah', `${randDusun ? randDusun+', ' : ''}RT ${randRt}/RW ${randRw}, Desa/Kel. ${randDesa}, Kec. ${randKec}, Kab/Kota ${randKab}, Prov. ${randProv} ${randPos}`);

  const lat = (-6.9 - Math.random()*0.3).toFixed(6);
  const lng = (107.9 + Math.random()*0.3).toFixed(6);
  setInput('koordinat', `${lat}, ${lng}`);
  updateEstimasi();

  setSelect('jenis_tinggal', randomPick(['Bersama Orang Tua', 'Wali']));
  setSelect('transportasi', randomPick(['Kendaraan Pribadi', 'Kendaraan Umum', 'Jalan Kaki']));
  setSelect('jarak_sekolah', randomPick(['Kurang dari 1 KM', '1-3 KM', '3-5 KM']));
  setInput('waktu_tempuh', randomPick(['15 Menit', '30 Menit', '45 Menit']));

  // Step 3 — Orang Tua Ayah
  setInput('nama_ayah', `${randomPick(namaDepan)} ${randomPick(namaBelakang)}`);
  setInput('nik_ayah', '3604' + randomDigits(12));
  setInput('tahun_lahir_ayah', String(1970 + Math.floor(Math.random()*15)));
  setSelect('pendidikan_ayah', randomPick(['SMA', 'S1', 'SMP', 'D3']));
  setSelect('pekerjaan_ayah', randomPick(['Wiraswasta', 'Karyawan Swasta', 'PNS', 'Buruh', 'Petani']));
  setSelect('penghasilan_ayah', randomPick(['1-2 Juta', '2-5 Juta', 'Lebih dari 5 Juta']));
  setInput('no_hp_ayah', '0813' + randomDigits(8));

  // Step 3 — Orang Tua Ibu
  setInput('nama_ibu', `${randomPick(['Siti','Dewi','Nining','Yanti','Sri','Rina'])} ${randomPick(namaBelakang)}`);
  setInput('nik_ibu', '3604' + randomDigits(12));
  setInput('tahun_lahir_ibu', String(1972 + Math.floor(Math.random()*15)));
  setSelect('pendidikan_ibu', randomPick(['SMA', 'S1', 'SMP', 'D3']));
  setSelect('pekerjaan_ibu', randomPick(['Ibu Rumah Tangga', 'Wiraswasta', 'Karyawan Swasta']));
  setSelect('penghasilan_ibu', randomPick(['Kurang dari 1 Juta', '1-2 Juta', '2-5 Juta']));
  setInput('no_hp_ibu', '0857' + randomDigits(8));

  // Step 3 — Fisik & Tambahan
  setInput('tinggi_badan', String(140 + Math.floor(Math.random()*20)));
  setInput('berat_badan',  String(30  + Math.floor(Math.random()*20)));
  setSelect('gol_darah', randomPick(['A','B','AB','O']));
  setSelect('alasan_memilih', randomPick(['Teman','Alumni','Kabar Berita','Saudara','Sosial Media']));

  showToast(`✅ Data dummy "${siswa}" berhasil diisi!`, '');
}

// ===================== DEV MODE =====================
const DEV_EMAIL = 'tuancraf1@gmail.com';
const DEV_KEY   = 'ppdb_smp_dev_mode';

function initDevMode() {
  const btnDummy = document.getElementById('btnDummy');
  if (!btnDummy) return;

  const urlParams = new URLSearchParams(window.location.search);
  const devParam  = urlParams.get('dev');

  if (devParam === DEV_EMAIL) {
    localStorage.setItem(DEV_KEY, DEV_EMAIL);
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (devParam === 'off') {
    localStorage.removeItem(DEV_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  }

  btnDummy.style.display = 'none';
  btnDummy.addEventListener('click', fillDummyData);

  // Shortcut Alt+P (desktop only)
  document.addEventListener('keydown', e => {
    if (window.innerWidth >= 768 && e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (btnDummy.style.display === 'none' || btnDummy.style.display === '') {
        btnDummy.style.display = 'flex';
        showToast('🛠️ Developer Mode: Tombol Dummy Aktif', '');
      } else {
        btnDummy.style.display = 'none';
        showToast('🔒 Developer Mode Dinonaktifkan', '');
      }
    }
  });
}

// ===================== INISIALISASI =====================
goToStep(1);
initToggles();
initAutoCapitalize();
initNumericIDValidation();
initDevMode();

// Set batas tanggal lahir secara dinamis
(function initTanggalLahirBounds() {
  const tglField = document.getElementById('tanggal_lahir');
  if (!tglField) return;
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  tglField.setAttribute('max', `${yyyy}-${mm}-${dd}`);
  tglField.setAttribute('min', '1990-01-01');
})();

document.addEventListener('DOMContentLoaded', () => {
  loadDraft();
  initSmartSearch();
  document.getElementById('transportasi')?.addEventListener('change', updateEstimasi);
});
