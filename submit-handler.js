import { checkAuth, SCRIPT_URL } from "./auth.js";

// Helper to convert file to base64
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Setup OCR UI listener for KTP/KK
export function setupOCRListener(inputId, resultTextId, imagePreviewId, ocrFieldId) {
  const fileInput = document.getElementById(inputId);
  if(!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const imgPreview = document.getElementById(imagePreviewId);
    if(imgPreview) {
      imgPreview.src = URL.createObjectURL(file);
      imgPreview.style.display = 'block';
    }

    // Run Gemini AI
    const resultEl = document.getElementById(resultTextId);
    if(resultEl) resultEl.textContent = "Sedang membaca teks dengan AI...";

    const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 

    try {
      if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("API Key Gemini belum diatur.");
      }
      const base64Str = await getBase64(file);
      const base64Data = base64Str.split(',')[1];
      const mimeType = file.type;

      let response;
      let data;
      let success = false;
      const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.5-flash"];
      
      for (const model of modelsToTry) {
         try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: "Ekstrak semua teks penting dari gambar ini. Kembalikan teks biasa saja." },
                    { inline_data: { mime_type: mimeType, data: base64Data } }
                  ]
                }]
              })
            });
            data = await response.json();
            if (response.ok) {
               success = true;
               break; // Berhasil, keluar dari loop
            } else if (response.status === 503 || (data.error && data.error.message.includes("high demand"))) {
               console.warn(`Model ${model} sibuk, mencoba model lain...`);
               continue; // Coba model selanjutnya
            } else {
               throw new Error(data.error?.message || "Gagal menghubungi Gemini API");
            }
         } catch(e) {
            if (model === modelsToTry[modelsToTry.length - 1]) throw e;
         }
      }

      if (!success) throw new Error("Semua server AI sedang sibuk. Silakan coba beberapa saat lagi.");

      const text = data.candidates[0].content.parts[0].text;
      
      if(resultEl) resultEl.textContent = text;
      
      const ocrInput = document.getElementById(ocrFieldId);
      if(ocrInput) ocrInput.value = text;
      
    } catch (err) {
      if(resultEl) resultEl.textContent = "Gagal membaca gambar: " + err.message;
      console.error(err);
    }
  });
}

// Setup OCR Autofill untuk KK di Step 1
export function setupAutofillOCRListener(inputId, statusId, statusTextId, fileNameId) {
  const fileInput = document.getElementById(inputId);
  if(!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Ambil input NIK yang sudah diketik
    const inputNikVal = document.getElementById('autofillNIKInput')?.value;
    if(!inputNikVal || inputNikVal.length < 16) {
      alert("Mohon masukkan 16 digit NIK pendaftar terlebih dahulu sebelum memindai KK.");
      fileInput.value = ""; // Reset file
      return;
    }

    const fileNameEl = document.getElementById(fileNameId);
    if(fileNameEl) fileNameEl.textContent = file.name;

    const statusEl = document.getElementById(statusId);
    const statusText = document.getElementById(statusTextId);
    const progressBar = document.getElementById('ocrProgressBar');
    const progressText = document.getElementById('ocrProgressText');
    const spinner = document.getElementById('ocrSpinner');
    
    if(statusEl) statusEl.style.display = 'block';
    if(statusText) {
      statusText.textContent = "Mempersiapkan OCR...";
      statusText.style.color = "var(--primary)";
    }
    if(spinner) spinner.style.display = 'block';
    if(progressBar) progressBar.style.width = '0%';
    if(progressText) progressText.textContent = '0%';

    const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 

    try {
      if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
         throw new Error("API Key Gemini belum disetel di kode sistem. Silakan hubungi admin / edit script submit-handler.js.");
      }

      // Animasi progress bar palsu (karena fetch API tidak bisa stream upload progress dengan mudah)
      let progress = 0;
      const progressInterval = setInterval(() => {
         progress += 5;
         if (progress > 90) progress = 90; // Berhenti di 90% sampai response datang
         if(progressBar) progressBar.style.width = progress + '%';
         if(progressText) progressText.textContent = progress + '%';
         if(statusText) statusText.textContent = "Mengunggah ke AI... " + progress + "%";
      }, 300);

      const base64Str = await getBase64(file);
      const base64Data = base64Str.split(',')[1];
      const mimeType = file.type;

      if(statusText) statusText.textContent = "Menunggu analisa AI (bisa memakan waktu beberapa detik)...";

      const prompt = `Saya melampirkan foto dokumen (Kartu Keluarga atau KTP). Tolong cari anggota keluarga dengan NIK ${inputNikVal}. 
Ekstrak datanya dengan sangat presisi. Jika kosong, isi dengan "". 
Wajib mengembalikan dalam format JSON seperti struktur berikut:
{
  "no_kk": "16 digit angka no kk",
  "nik": "${inputNikVal}",
  "nama_lengkap": "Nama lengkap siswa",
  "jenis_kelamin": "Laki-laki atau Perempuan",
  "tempat_lahir": "Tempat lahir",
  "tanggal_lahir": "YYYY-MM-DD",
  "agama": "Islam/Protestan/Katolik/Hindu/Buddha/Konghucu",
  "nama_ayah": "Nama ayah kandung",
  "nama_ibu": "Nama ibu kandung",
  "pekerjaan_ayah": "Pekerjaan ayah",
  "alamat_rumah": "Alamat lengkap rt rw desa kecamatan"
}
Jika NIK ${inputNikVal} benar-benar tidak ditemukan dalam gambar, kembalikan JSON: { "error": "NIK tidak ditemukan." }`;

      let response;
      let errData;
      let success = false;
      const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];

      for (const model of modelsToTry) {
          if(statusText) statusText.textContent = `Menunggu analisa AI (${model})...`;
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } }
                ]
              }],
              generationConfig: {
                 temperature: 0.1, 
                 response_mime_type: "application/json"
              }
            })
          });

          if (response.ok) {
             success = true;
             break;
          }
          
          errData = await response.json();
          const errMsg = errData.error?.message || "";
          
          if (response.status === 503 || errMsg.includes("high demand") || errMsg.includes("overloaded")) {
             console.warn(`Model ${model} sibuk (High Demand). Coba model fallback...`);
             // Beri jeda 1 detik sebelum mencoba model berikutnya
             await new Promise(resolve => setTimeout(resolve, 1000));
             continue; 
          } else {
             // Jika error lain (misal API key salah, format salah), langsung lemparkan error
             clearInterval(progressInterval);
             throw new Error(errMsg || `HTTP Error: ${response.status}`);
          }
      }

      clearInterval(progressInterval);

      if (!success) {
        throw new Error(errData?.error?.message || `Semua server AI Google saat ini sedang sibuk (High Demand). Silakan coba lagi dalam beberapa menit.`);
      }

      const data = await response.json();
      
      if(statusText) statusText.textContent = "Mengekstrak data...";

      let resultText = data.candidates[0].content.parts[0].text;
      
      // Bersihkan teks dari markdown formatting jika AI masih membangkang (```json ... ```)
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

      const extractedData = JSON.parse(resultText);

      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      console.log("Data terekstrak dari AI:", extractedData);

      // 5. Autofill form
      // ============ DATA SISWA ============
      const inputNik = document.getElementById('nik');
      if(inputNik) inputNik.value = inputNikVal;
      
      const inputNoKK = document.getElementById('no_kk');
      if(inputNoKK && extractedData.no_kk) inputNoKK.value = extractedData.no_kk;
      
      const inputNama = document.getElementById('nama_lengkap');
      if(inputNama && extractedData.nama_lengkap) inputNama.value = extractedData.nama_lengkap;

      const inputJK = document.getElementById('jenis_kelamin');
      if(inputJK && extractedData.jenis_kelamin) inputJK.value = extractedData.jenis_kelamin;

      const inputAgama = document.getElementById('agama');
      if(inputAgama && extractedData.agama) {
         // Pencocokan ke dropdown
         const agamaVal = extractedData.agama.toLowerCase();
         if(agamaVal.includes('islam')) inputAgama.value = 'Islam';
         else if(agamaVal.includes('kristen') || agamaVal.includes('protestan')) inputAgama.value = 'Protestan';
         else if(agamaVal.includes('katolik') || agamaVal.includes('katholik')) inputAgama.value = 'Katolik';
         else if(agamaVal.includes('hindu')) inputAgama.value = 'Hindu';
         else if(agamaVal.includes('buddha') || agamaVal.includes('budha')) inputAgama.value = 'Buddha';
         else if(agamaVal.includes('konghucu')) inputAgama.value = 'Konghucu';
      }

      const inputTempatLahir = document.getElementById('tempat_lahir');
      if(inputTempatLahir && extractedData.tempat_lahir) inputTempatLahir.value = extractedData.tempat_lahir;

      const inputTglLahir = document.getElementById('tanggal_lahir');
      if(inputTglLahir && extractedData.tanggal_lahir) inputTglLahir.value = extractedData.tanggal_lahir;

      // ============ DATA ALAMAT ============
      const inputAlamat = document.getElementById('alamat_rumah');
      if(inputAlamat && extractedData.alamat_rumah) inputAlamat.value = extractedData.alamat_rumah;

      // ============ DATA ORANG TUA ============
      const inputAyah = document.getElementById('nama_ayah');
      if(inputAyah && extractedData.nama_ayah) inputAyah.value = extractedData.nama_ayah;
      
      const inputIbu = document.getElementById('nama_ibu');
      if(inputIbu && extractedData.nama_ibu) inputIbu.value = extractedData.nama_ibu;
      
      const inputPekerjaan = document.getElementById('pekerjaan_ayah');
      if(inputPekerjaan && extractedData.pekerjaan_ayah) inputPekerjaan.value = extractedData.pekerjaan_ayah;

      // Sukses Animasi
      if(spinner) spinner.style.display = 'none';
      if(statusText) {
        statusText.textContent = "Berhasil! Data telah diekstrak dengan Gemini AI.";
        statusText.style.color = "var(--secondary)"; // hijau
      }
      if(progressBar) {
         progressBar.style.width = '100%';
         progressBar.style.background = "var(--secondary)";
      }
      if(progressText) progressText.textContent = '100%';
      
      setTimeout(() => { if(statusEl) statusEl.style.display = 'none'; }, 5000);

    } catch (err) {
      if(spinner) spinner.style.display = 'none';
      if(statusText) {
        statusText.textContent = err.message || "Gagal membaca gambar (OCR Error).";
        statusText.style.color = "red";
      }
      if(progressBar) progressBar.style.background = "red";
      console.error(err);
    }
  });
}

export async function handleFormSubmit(formElement, jenjang) {
  const user = checkAuth();
  if (!user) return;

  const btn = formElement.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = "Mengirim Data & Mengunggah File...";
  btn.disabled = true;

  try {
    const formData = new FormData(formElement);
    const dataObj = { action: "submit_form", uid: user.uid, jenjang: jenjang };
    
    // Convert normal inputs
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) continue; // Skip files for now
      dataObj[key] = value;
    }

    // Convert files to base64
    const fileKeys = ['fileIjazah', 'fileSHUSM', 'fileKK', 'fileKTP', 'fileAkta', 'fileKIP', 'filePhoto'];
    for (let key of fileKeys) {
      const fileInput = document.getElementById(key);
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const base64 = await getBase64(file);
        dataObj[key] = {
          name: file.name,
          base64: base64
        };
      }
    }

    // Add OCR results
    const ocrKTP = document.getElementById("ocrKtpResult");
    const ocrKK = document.getElementById("ocrKkResult");
    if(ocrKTP) dataObj.ocrKTP = ocrKTP.value;
    if(ocrKK) dataObj.ocrKK = ocrKK.value;

    // Kirim ke Google Apps Script
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(dataObj)
    });
    const result = await response.json();

    if (result.success) {
      alert("Pendaftaran berhasil dikirim!");
      window.location.href = "dashboard-siswa.html";
    } else {
      alert("Terjadi kesalahan: " + result.message);
      btn.textContent = originalText;
      btn.disabled = false;
    }

  } catch (error) {
    console.error(error);
    alert("Gagal mengirim data: " + error.message);
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
