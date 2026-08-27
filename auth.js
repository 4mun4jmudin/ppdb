// GANTI DENGAN URL APPS SCRIPT ANDA
export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRsXTvkeMYX3ITVxLpXP-5Xd_JdzT8s7hnQFGk9EL4d7FSRUt-0PLchTqyYZGxjcE/exec";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");

function showError(msg) {
  if(errorMsg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = "block";
  }
}

// LOGIKA REGISTRASI
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("regBtn");
    btn.textContent = "Mendaftar...";
    btn.disabled = true;

    const nama = document.getElementById("nama").value;
    const jenjang = document.getElementById("jenjang").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm_password") ? document.getElementById("confirm_password").value : password;
    const no_hp = document.getElementById("no_hp") ? document.getElementById("no_hp").value : "";

    if (password !== confirmPassword) {
      showError("Konfirmasi password tidak cocok!");
      btn.textContent = "Daftar Akun";
      btn.disabled = false;
      return;
    }

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "register", nama, jenjang, email, password, no_hp })
      });
      const data = await response.json();

      if (data.success) {
        // Simpan sesi ke localStorage lengkap dengan hp
        const userObj = Object.assign({}, data.user, { no_hp: no_hp, telp: no_hp });
        localStorage.setItem("user", JSON.stringify(userObj));
        window.location.href = "dashboard-siswa.html";
      } else {
        showError(data.message);
        btn.textContent = "Daftar Sekarang";
        btn.disabled = false;
      }
    } catch (error) {
      console.error(error);
      showError("Gagal menghubungi server");
      btn.textContent = "Daftar Sekarang";
      btn.disabled = false;
    }
  });
}

// LOGIKA LOGIN
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("loginBtn");
    btn.textContent = "Masuk...";
    btn.disabled = true;

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "login", email, password })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.user.role === "admin") {
          window.location.href = "dashboard-admin.html";
        } else {
          window.location.href = "dashboard-siswa.html";
        }
      } else {
        showError(data.message);
        btn.textContent = "Masuk";
        btn.disabled = false;
      }
    } catch (error) {
      console.error(error);
      showError("Gagal menghubungi server");
      btn.textContent = "Masuk";
      btn.disabled = false;
    }
  });
}

// PROTEKSI HALAMAN
export function checkAuth(requiredRole = null) {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    window.location.href = "login.html";
    return null;
  }
  
  const user = JSON.parse(userStr);
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === "admin" ? "dashboard-admin.html" : "dashboard-siswa.html";
    return null;
  }
  
  return user;
}

// FUNGSI LOGOUT (dipanggil dari dashboard)
export function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
