// File: app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, update, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { staticItems } from "./data-static.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKAeiozNSKsrt2m91D0utim2VvddzE-cw",
  authDomain: "stetecymasterfire.firebaseapp.com",
  databaseURL: "https://stetecymasterfire-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stetecymasterfire",
  storageBucket: "stetecymasterfire.firebasestorage.app",
  messagingSenderId: "636144676167",
  appId: "1:636144676167:web:a4c658d64778d5323b3062"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global State
let currentUser = null;
let currentUsername = null;
let isAdmin = false;
let isSignUpMode = false;
let globalAllItems = [];
let currentCategoryFilter = 'Semua';
let currentSearchQuery = '';

let localImageBase64 = null;
let localFileBase64 = null;
let currentRejectItem = null;

let currentDetailItemId = null; // Menyimpan ID item yang sedang dibuka modal detailnya
let lastCommentTime = 0; // Untuk batasan 30 detik komentar client-side
let autoTranslateEnabled = localStorage.getItem('autoTranslate') === 'true';
let currentLang = localStorage.getItem('lang') || 'id';


// ================= DICTIONARY TRANSLATE =================
const dict = {
  'id': {
    verifying_session: "Memverifikasi sesi...",
    login_title: "Masuk ke Akun",
    login_subtitle: "Belum punya akun?",
    login_switch: "Daftar di sini",
    login_btn: "Masuk",
    or_via: "atau via",
    login_google: "Masuk dengan Google",
    create_username_title: "Buat Username",
    create_username_desc: "Hanya huruf, angka, dan underscore (3-16 karakter).",
    save_username: "Simpan Username",
    my_profile: "Profil Saya",
    change_photo: "UBAH FOTO",
    logout: "Keluar Akun",
    submit_new_item: "Kirim Baru",
    cancel: "Batal",
    category_label: "Kategori*",
    title_label: "Judul Item*",
    version_label: "Versi MCPE*",
    server_name_label: "Nama Server*",
    server_ip_label: "IP Server*",
    server_port_label: "Port*",
    supported_version_label: "Versi yang Didukung*",
    desc_label: "Deskripsi*",
    img_preview_label: "Gambar Preview*",
    choose_file: "Pilih File",
    file_download_label: "File Download / Mod*",
    upload_now: "Upload Sekarang",
    admin_panel: "Panel Admin",
    queue: "Antrean",
    no_queue: "Tidak ada antrean.",
    nav_home: "Beranda",
    nav_upload: "Upload",
    nav_profile: "Profil",
    cat_all: "Semua",
    translate_ui: "Translate UI (ID/EN)",
    support: "Layanan / Bantuan",
    notifications: "Notifikasi",
    no_notifications: "Belum ada notifikasi.",
    search_placeholder: "Cari item, mod, atau server...",
    description: "Deskripsi",
    translate: "Translate",
    show_original: "Lihat asli",
    comments: "Komentar",
    post_comment: "Kirim Komentar",
    login_to_comment: "Silakan masuk untuk memberikan komentar.",
    loading_comments: "Memuat komentar...",
    reply: "Balas",
    delete: "Hapus",
    post_reply: "Kirim",
    cancel_reply: "Batal",
    show_replies: "Lihat {count} balasan",
    hide_replies: "Sembunyikan balasan",
    replying_to: "Membalas"
  },
  'en': {
    verifying_session: "Verifying session...",
    login_title: "Sign In",
    login_subtitle: "Don't have an account?",
    login_switch: "Sign up here",
    login_btn: "Sign In",
    or_via: "or via",
    login_google: "Sign in with Google",
    create_username_title: "Create Username",
    create_username_desc: "Letters, numbers, and underscores only (3-16 chars).",
    save_username: "Save Username",
    my_profile: "My Profile",
    change_photo: "CHANGE PHOTO",
    logout: "Logout",
    submit_new_item: "Submit New",
    cancel: "Cancel",
    category_label: "Category*",
    title_label: "Item Title*",
    version_label: "MCPE Version*",
    server_name_label: "Server Name*",
    server_ip_label: "Server IP*",
    server_port_label: "Port*",
    supported_version_label: "Supported Version*",
    desc_label: "Description*",
    img_preview_label: "Preview Image*",
    choose_file: "Choose File",
    file_download_label: "Download File / Mod*",
    upload_now: "Upload Now",
    admin_panel: "Admin Panel",
    queue: "Queue",
    no_queue: "No queue.",
    nav_home: "Home",
    nav_upload: "Upload",
    nav_profile: "Profile",
    cat_all: "All",
    translate_ui: "Translate UI (ID/EN)",
    support: "Support / Help",
    notifications: "Notifications",
    no_notifications: "No notifications yet.",
    search_placeholder: "Search items, mods, or servers...",
    description: "Description",
    translate: "Translate",
    show_original: "Show original",
    comments: "Comments",
    post_comment: "Post Comment",
    login_to_comment: "Please sign in to post a comment.",
    loading_comments: "Loading comments...",
    reply: "Reply",
    delete: "Delete",
    post_reply: "Send",
    cancel_reply: "Cancel",
    show_replies: "View {count} replies",
    hide_replies: "Hide replies",
    replying_to: "Replying to"
  }
};

window.applyLanguage = () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[currentLang][key]) el.placeholder = dict[currentLang][key];
  });
  
  const autoTransStatusEl = document.getElementById('auto-translate-status');
  if(autoTransStatusEl){
      autoTransStatusEl.innerText = autoTranslateEnabled ? "ON" : "OFF";
      autoTransStatusEl.className = autoTranslateEnabled ? "text-success" : "text-danger";
  }

  // Update mode Auth dinamis jika sedang di layar login
  if(isSignUpMode) {
      document.getElementById('auth-title-text').innerText = currentLang === 'en' ? "Sign Up" : "Daftar Akun Baru";
      document.getElementById('auth-subtitle-text').innerText = currentLang === 'en' ? "Already have an account?" : "Sudah punya akun?";
      document.getElementById('auth-switch-text').innerText = currentLang === 'en' ? "Sign in here" : "Masuk di sini";
      document.getElementById('auth-submit-btn').innerText = currentLang === 'en' ? "Sign Up" : "Daftar Sekarang";
  }
};

window.switchLanguage = () => {
  currentLang = currentLang === 'id' ? 'en' : 'id';
  localStorage.setItem('lang', currentLang);
  window.applyLanguage();
  window.closeAllDrawers();
};

window.toggleAutoTranslate = () => {
    autoTranslateEnabled = !autoTranslateEnabled;
    localStorage.setItem('autoTranslate', autoTranslateEnabled);
    window.applyLanguage();
    // Refresh komentar yang ada jika detail modal sedang terbuka
    if(currentDetailItemId) {
        loadComments(currentDetailItemId);
    }
};

// Mencegah context menu (tekan lama/klik kanan) pada semua gambar
document.addEventListener('contextmenu', function(e) {
  if (e.target.tagName === 'IMG' || e.target.classList.contains('card-img') || e.target.classList.contains('detail-header-img')) {
    e.preventDefault();
  }
});
document.addEventListener('dragstart', function(e) {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
  }
});

// ================= TRANSLATION API (MyMemory / Google) =================
// Simple hash function for caching
const hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);

async function translateText(text, targetLang) {
    if(!text || text.trim() === '') return text;
    
    // Potong teks jika kepanjangan (batasan MyMemory gratis)
    const safeText = text.length > 490 ? text.substring(0, 490) + "..." : text;
    
    // Cek cache
    const cacheKey = `trans_${hashCode(safeText)}_${targetLang}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        // Coba MyMemory
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(safeText)}&langpair=Autodetect|${targetLang}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.responseData && data.responseData.translatedText) {
            // Jangan cache kalau hasil terjemahannya berisi error MyMemory
            if(!data.responseData.translatedText.includes('MYMEMORY WARNING')){
                localStorage.setItem(cacheKey, data.responseData.translatedText);
                return data.responseData.translatedText;
            }
        }
    } catch (e) {
        console.warn("MyMemory failed, trying Google GTX", e);
    }
    
    // Fallback ke Google Translate GTX (Tidak resmi, tapi public endpoint)
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(safeText)}`;
        const response = await fetch(url);
        const data = await response.json();
        if(data && data[0] && data[0][0] && data[0][0][0]){
             const translated = data[0].map(item => item[0]).join('');
             localStorage.setItem(cacheKey, translated);
             return translated;
        }
    } catch (e) {
        console.error("Translation failed entirely", e);
    }
    
    throw new Error("Translation failed");
}

// ================= CUSTOM MODALS =================
window.showModalAlert = (msg) => {
  document.getElementById('modal-title').innerText = "Informasi";
  document.getElementById('modal-msg').innerText = msg;
  document.getElementById('modal-actions').innerHTML = `<button class="btn btn-primary" onclick="document.getElementById('custom-modal').classList.remove('active')" style="width:100px;">Oke</button>`;
  document.getElementById('custom-modal').classList.add('active');
};

window.showModalConfirm = (msg, onConfirmCallback) => {
  document.getElementById('modal-title').innerText = "Konfirmasi";
  document.getElementById('modal-msg').innerText = msg;
  document.getElementById('modal-actions').innerHTML = `
    <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('custom-modal').classList.remove('active')" data-i18n="cancel">${dict[currentLang]['cancel']}</button>
    <button class="btn btn-danger" style="flex:1;" id="btn-modal-confirm">Yakin</button>
  `;
  document.getElementById('custom-modal').classList.add('active');
  document.getElementById('btn-modal-confirm').onclick = () => {
    document.getElementById('custom-modal').classList.remove('active');
    onConfirmCallback();
  };
};

window.copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
     window.showModalAlert(`Berhasil menyalin IP: ${text}`);
  });
};

// ================= CUSTOM BOTTOM SHEET =================
const categoryOptions = ['Mod', 'Texture', 'Map', 'Launcher', 'Plugin Server', 'MCPE and Craftman', 'Server'];
const versionOptions = ['0.15.10', '0.14.3', '0.14.3 - 0.15.10'];

window.openCategorySheet = () => {
   document.getElementById('sheet-title').innerText = "Pilih Kategori";
   const opts = document.getElementById('sheet-options');
   opts.innerHTML = '';
   const current = document.getElementById('selected-category-text').innerText;
   categoryOptions.forEach(cat => {
       const isSel = cat === current;
       opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectCategoryForm('${cat}')">${cat} ${isSel ? '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>`;
   });
   document.getElementById('bottom-sheet-overlay').classList.add('active');
};

window.selectCategoryForm = (cat) => {
   document.getElementById('selected-category-text').innerText = cat;
   window.closeBottomSheet();
   
   if(cat === 'Server') {
       document.getElementById('form-standard-container').classList.add('hidden');
       document.getElementById('form-file-container').classList.add('hidden');
       document.getElementById('form-server-container').classList.remove('hidden');
   } else {
       document.getElementById('form-standard-container').classList.remove('hidden');
       document.getElementById('form-file-container').classList.remove('hidden');
       document.getElementById('form-server-container').classList.add('hidden');
   }
};

window.openVersionSheet = () => {
   document.getElementById('sheet-title').innerText = "Versi yang Didukung";
   const opts = document.getElementById('sheet-options');
   opts.innerHTML = '';
   const current = document.getElementById('selected-version-text').innerText;
   versionOptions.forEach(ver => {
       const isSel = ver === current;
       opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectVersionForm('${ver}')">${ver} ${isSel ? '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>`;
   });
   document.getElementById('bottom-sheet-overlay').classList.add('active');
};

window.selectVersionForm = (ver) => {
   document.getElementById('selected-version-text').innerText = ver;
   window.closeBottomSheet();
};

window.closeBottomSheet = () => {
   document.getElementById('bottom-sheet-overlay').classList.remove('active');
};

// ================= UI SWITCHER & DRAWERS =================
window.switchScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0, 0);
};

window.requireLoginAndSwitch = (id) => {
    if(currentUser) {
        window.switchScreen(id);
    } else {
        // Simpan tujuan agar bisa dilanjutkan setelah login jika perlu (belum diimplementasikan full redirect flow)
        window.showModalAlert("Silakan masuk atau daftar terlebih dahulu untuk mengakses fitur ini.");
        window.switchScreen('screen-login');
    }
}

window.toggleDrawer = (id) => {
  const isDrawerActive = document.getElementById(id).classList.contains('active');
  window.closeAllDrawers();
  if(!isDrawerActive) {
    document.getElementById(id).classList.add('active');
    document.getElementById('drawer-overlay').classList.add('active');
  }
};

window.closeAllDrawers = () => {
  document.querySelectorAll('.side-drawer').forEach(el => el.classList.remove('active'));
  document.getElementById('drawer-overlay').classList.remove('active');
};

// ================= BADGE HELPER =================
function getRoleBadge(userIsAdmin) {
  if (userIsAdmin) {
    return `<span class="badge-role badge-dev" title="Developer"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Dev</span>`;
  }
  return `<span class="badge-role" style="background:transparent; color:var(--text-muted); border:1px solid var(--border-color); font-weight:normal;">Member</span>`;
}

// ================= AUTHENTICATION FLOW =================
window.toggleAuthMode = () => {
  isSignUpMode = !isSignUpMode;
  document.getElementById('auth-title-text').innerText = isSignUpMode ? (currentLang==='en'?"Sign Up":"Daftar Akun Baru") : (currentLang==='en'?"Sign In":"Masuk ke Akun");
  document.getElementById('auth-subtitle-text').innerText = isSignUpMode ? (currentLang==='en'?"Already have an account?":"Sudah punya akun?") : (currentLang==='en'?"Don't have an account?":"Belum punya akun?");
  document.getElementById('auth-switch-text').innerText = isSignUpMode ? (currentLang==='en'?"Sign in here":"Masuk di sini") : (currentLang==='en'?"Sign up here":"Daftar di sini");
  document.getElementById('auth-submit-btn').innerText = isSignUpMode ? (currentLang==='en'?"Sign Up":"Daftar Sekarang") : (currentLang==='en'?"Sign In":"Masuk");
  document.getElementById('login-error').innerText = '';
};

window.processEmailAuth = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-submit-btn');
  if (!email || !password) { document.getElementById('login-error').innerText = 'Isi form dengan lengkap.'; return; }
  btn.disabled = true; btn.innerText = "Memproses...";
  try {
    if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById('login-error').innerText = "Gagal: " + err.message;
    btn.disabled = false; btn.innerText = isSignUpMode ? (currentLang==='en'?"Sign Up":"Daftar Sekarang") : (currentLang==='en'?"Sign In":"Masuk");
  }
};

window.loginGoogle = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e){}
};

window.customLogout = () => {
  window.closeAllDrawers();
  window.showModalConfirm(dict[currentLang]['logout_title'] || "Yakin ingin keluar dari akun?", () => {
    signOut(auth).then(() => { isAdmin = false; currentUser = null; currentUsername = null; window.switchScreen('screen-login'); updateHeaderAuthUI();});
  });
};

function updateHeaderAuthUI() {
    if(currentUser) {
        document.getElementById('btn-notif-header').classList.remove('hidden');
        document.getElementById('btn-login-header').classList.add('hidden');
        document.getElementById('sidebar-auth-section').innerHTML = `<button class="btn btn-secondary" onclick="window.customLogout()" style="width:100%; border-color:var(--danger); color:var(--danger);" data-i18n="logout">${dict[currentLang]['logout']}</button>`;
    } else {
        document.getElementById('btn-notif-header').classList.add('hidden');
        document.getElementById('btn-login-header').classList.remove('hidden');
        document.getElementById('btn-open-admin').classList.add('hidden'); // Sembunyikan admin
        document.getElementById('sidebar-profile-img').src = "https://via.placeholder.com/60";
        document.getElementById('sidebar-name').innerText = "Tamu";
        document.getElementById('sidebar-role').innerHTML = "";
        document.getElementById('sidebar-auth-section').innerHTML = `<button class="btn btn-primary" onclick="window.switchScreen('screen-login'); window.closeAllDrawers();" style="width:100%;" data-i18n="login_btn">${dict[currentLang]['login_btn']}</button>`;
    }
}

// ================= PENGUNCIAN SESI =================
setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      updateHeaderAuthUI();

      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists() && snap.val().username) {
         currentUsername = snap.val().username;
         document.getElementById('profile-name').innerText = currentUsername;
         document.getElementById('sidebar-name').innerText = currentUsername;
         
         const dp = snap.val().photoURL || user.photoURL || 'https://via.placeholder.com/150';
         document.getElementById('profile-img').src = dp;
         document.getElementById('sidebar-profile-img').src = dp;
         checkAdminStatus();
         listenNotifications();
      } else {
         window.switchScreen('screen-username');
      }
    } else {
      // User tidak login
      currentUser = null;
      currentUsername = null;
      isAdmin = false;
      updateHeaderAuthUI();
      // Tetap load home (guest view)
      window.switchScreen('screen-home');
      fetchAllItemsAndRender();
    }
    // Set UI language di awal
    window.applyLanguage();
  });
}).catch(() => { 
    window.switchScreen('screen-home'); // Fallback guest
    fetchAllItemsAndRender();
});

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { document.getElementById('username-error').innerText = "Format salah (3-16 char)"; return; }
  try {
    const unSnap = await get(ref(db, `usernames/${username}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { document.getElementById('username-error').innerText = "Username terpakai!"; return; }
    await set(ref(db, `usernames/${username}`), currentUser.uid);
    await set(ref(db, `users/${currentUser.uid}/username`), username);
    currentUsername = username;
    document.getElementById('profile-name').innerText = username;
    document.getElementById('sidebar-name').innerText = username;
    checkAdminStatus();
    listenNotifications();
  } catch (e) { document.getElementById('username-error').innerText = "Gagal menyimpan."; }
};

function checkAdminStatus() {
  onValue(ref(db, `admins/${currentUser.uid}`), (snap) => {
    isAdmin = (snap.exists() && snap.val() === true);
    document.getElementById('profile-role-badge').innerHTML = getRoleBadge(isAdmin);
    document.getElementById('sidebar-role').innerHTML = getRoleBadge(isAdmin);
    if (isAdmin) {
      document.getElementById('btn-open-admin').classList.remove('hidden');
      loadPendingItems();
    } else {
      document.getElementById('btn-open-admin').classList.add('hidden');
    }
  });
  window.switchScreen('screen-home');
  fetchAllItemsAndRender();
}

// ================= NOTIFIKASI =================
function listenNotifications() {
  if(!currentUser) return;
  onValue(ref(db, `notifications/${currentUser.uid}`), (snapshot) => {
    const notifContainer = document.getElementById('notif-container');
    const badge = document.getElementById('notif-badge');
    notifContainer.innerHTML = '';
    let unreadCount = 0;

    if (!snapshot.exists()) {
      notifContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:20px;" data-i18n="no_notifications">${dict[currentLang]['no_notifications']}</p>`;
      badge.classList.add('hidden');
      return;
    }

    const notifs = [];
    snapshot.forEach(child => { notifs.push({ id: child.key, ...child.val() }); });
    notifs.sort((a, b) => (b.time || 0) - (a.time || 0));

    notifs.forEach(notif => {
      if (!notif.read) unreadCount++;
      const color = notif.type === 'accepted' ? 'var(--success)' : 'var(--danger)';
      const statusText = notif.type === 'accepted' ? 'Diterima & Dipublikasikan' : 'Ditolak';

      notifContainer.innerHTML += `
        <div class="notif-card ${!notif.read ? 'unread' : ''}" onclick="window.markNotifRead('${notif.id}')">
          <div class="font-bold" style="color:${color}; margin-bottom:5px;">Item ${statusText}</div>
          <p style="color:var(--text-main); margin-bottom:5px;">"${notif.title}"</p>
          ${notif.reason ? `<p style="color:var(--text-muted); font-size:11px;">Alasan: ${notif.reason}</p>` : ''}
        </div>
      `;
    });

    if (unreadCount > 0) { badge.innerText = unreadCount; badge.classList.remove('hidden'); } 
    else { badge.classList.add('hidden'); }
  });
}

window.markNotifRead = async (notifId) => {
  if(!currentUser) return;
  await set(ref(db, `notifications/${currentUser.uid}/${notifId}/read`), true);
};

// ================= UPLOAD FOTO PROFIL (PERBAIKAN ERROR & UI) =================
window.handleProfileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validasi tipe file
  if (!file.type.startsWith('image/')) {
      window.showModalAlert("File yang dipilih bukan gambar!");
      event.target.value = ''; return;
  }

  // Validasi ukuran (Max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    window.showModalAlert("Ukuran foto maksimal 5 MB!");
    event.target.value = ''; return;
  }

  // Tampilkan Loading di atas avatar
  const loadingOverlay = document.getElementById('profile-upload-loading');
  loadingOverlay.classList.remove('hidden');

  try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
              const canvas = document.createElement('canvas');
              // Crop ke persegi (tengah)
              const size = Math.min(img.width, img.height);
              // Resize maksimal ke 256x256 untuk avatar
              const targetSize = 256; 
              
              canvas.width = targetSize; canvas.height = targetSize;
              const ctx = canvas.getContext('2d');
              
              const offsetX = (img.width - size) / 2;
              const offsetY = (img.height - size) / 2;
              
              ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
              
              // Export dengan kualitas sedang (0.8)
              let base64Image = canvas.toDataURL('image/jpeg', 0.8); 
              
              // Pastikan ukuran string base64 tidak terlalu besar untuk Realtime DB
              if (base64Image.length > 40000) {
                  // Turunkan kualitas jika masih terlalu besar
                  base64Image = canvas.toDataURL('image/jpeg', 0.6);
                  if (base64Image.length > 40000) {
                      throw new Error("Gambar terlalu kompleks, tidak dapat dikompres sesuai batas.");
                  }
              }

              // Update Profil Auth
              await updateProfile(currentUser, { photoURL: base64Image });
              
              // Update Realtime DB
              await set(ref(db, `users/${currentUser.uid}/photoURL`), base64Image);
              
              // Update UI
              document.getElementById('profile-img').src = base64Image;
              document.getElementById('sidebar-profile-img').src = base64Image;
              
              loadingOverlay.classList.add('hidden');
              window.showModalAlert("Foto profil berhasil diperbarui!");
              
          } catch(err) {
              loadingOverlay.classList.add('hidden');
              window.showModalAlert("Gagal memproses gambar: " + err.message);
          }
        };
        img.onerror = () => {
            loadingOverlay.classList.add('hidden');
            window.showModalAlert("File gambar korup atau tidak dapat dibaca.");
        }
        img.src = e.target.result;
      };
      reader.onerror = () => {
          loadingOverlay.classList.add('hidden');
          window.showModalAlert("Gagal membaca file dari perangkat.");
      }
      reader.readAsDataURL(file);
  } catch (error) {
      loadingOverlay.classList.add('hidden');
      window.showModalAlert("Terjadi kesalahan: " + error.message);
  }
};

// ================= SEARCH, FILTER & DYNAMIC LAYOUT =================
window.handleSearch = (query) => {
  currentSearchQuery = query.toLowerCase();
  renderItemsToUI();
};

window.setCategoryFilter = (category, btnElement) => {
  currentCategoryFilter = category;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btnElement.classList.add('active');
  renderItemsToUI();
};

function fetchAllItemsAndRender() {
  onValue(ref(db, 'items_public'), (snapshot) => {
    let dynamicItems = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => { dynamicItems.push({ id: child.key, source: 'firebase', ...child.val() }); });
      dynamicItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    globalAllItems = [...staticItems, ...dynamicItems];
    renderItemsToUI(); 
  });
}

// ================= API STATUS SERVER (MCPE / POCKETMINE-MP) =================
function fetchServerStatus(id, target) {
  const el = document.getElementById(`status-${id}`);
  if (!el) return;

  const [host, portRaw] = target.split(':');
  const port = portRaw || '19132';

  fetch(`/api/server?host=${host}&port=${port}`)
    .then(res => res.json())
    .then(data => {
      if (data.online) {
         el.innerHTML = `
           <span class="status-indicator status-online"></span> 
           <span class="text-success" style="margin-right:5px; font-weight:bold;">Online</span> 
           <span style="color:var(--text-muted);">|</span> 
           <b style="margin-left:5px; color:var(--text-main);">${data.players.online}/${data.players.max}</b> 
           <span style="color:var(--text-muted); font-weight:normal; margin-left:4px;">Players</span>`; 
      } else {
         if (data.error === 'Timeout') {
            el.innerHTML = `<span class="status-indicator" style="background:#555;"></span> <span style="color:#aaa; margin-right:5px; font-weight:bold;">Tidak Merespons</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Timeout / Sedang RTO)</span>`;
         } else {
            el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Offline</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Server Mati)</span>`;
         }
      }
    })
    .catch(() => {
      el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Error</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Gagal memanggil API Internal)</span>`;
    });
}

setInterval(() => {
  if (!document.getElementById('screen-home').classList.contains('hidden')) {
      if (currentCategoryFilter === 'Semua' || currentCategoryFilter === 'Server') {
          const serverElements = document.querySelectorAll('.server-status');
          serverElements.forEach(el => {
              const target = el.getAttribute('data-target');
              const id = el.id.replace('status-', '');
              if (target) fetchServerStatus(id, target);
          });
      }
  }
}, 30000);

// Menampilkan modal detail
window.openDetail = (itemId) => {
    const item = globalAllItems.find(i => i.id === itemId);
    if(!item) return;

    currentDetailItemId = itemId;
    document.getElementById('detail-img').src = item.url_img;
    document.getElementById('detail-title').innerText = item.title;
    
    // Uploader Info
    document.getElementById('detail-uploader-name').innerText = item.username || 'System';
    const isUploaderAdmin = item.source === 'github' || (item.source === 'firebase' && isAdmin);
    document.getElementById('detail-uploader-badge').innerHTML = getRoleBadge(isUploaderAdmin);
    
    // Ambil avatar uploader jika ada (Untuk item Firebase)
    const avatarEl = document.getElementById('detail-uploader-avatar');
    if(item.uid) {
        get(ref(db, `users/${item.uid}/photoURL`)).then(snap => {
            avatarEl.src = snap.exists() ? snap.val() : 'https://via.placeholder.com/20';
        });
    } else {
        avatarEl.src = 'https://via.placeholder.com/20';
    }

    document.getElementById('detail-category').innerText = item.category;
    document.getElementById('detail-version').innerText = item.version || 'All Vers.';
    document.getElementById('detail-desc').innerText = item.desc_id || item.desc || 'Tidak ada deskripsi.';
    
    // Kembalikan tombol translate ke state awal
    document.getElementById('text-translate-desc').innerText = dict[currentLang]['translate'];
    document.getElementById('detail-desc').dataset.originalText = item.desc_id || item.desc || '';
    document.getElementById('detail-desc').dataset.translated = "false";
    document.getElementById('btn-translate-desc').disabled = false;

    // Server Status & Actions
    const actionContainer = document.getElementById('detail-action-container');
    const statusContainer = document.getElementById('detail-server-status-container');
    
    if (item.category.toLowerCase() === 'server') {
        const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version;
        statusContainer.classList.remove('hidden');
        statusContainer.innerHTML = `<div id="status-detail-${item.id}" class="server-status" data-target="${ipTarget}" style="display:inline-flex;"><span class="loader-inline"></span><span style="color:var(--text-muted); margin-left:8px; font-weight:normal;">Mengecek...</span></div>`;
        actionContainer.innerHTML = `<button class="btn btn-secondary" style="border-color:var(--primary); color:var(--primary);" onclick="window.copyText('${ipTarget}')">Salin IP Server</button>`;
        fetchServerStatus('detail-'+item.id, ipTarget);
    } else {
        statusContainer.classList.add('hidden');
        actionContainer.innerHTML = `<a href="${item.url_file}" target="_blank" class="btn btn-primary" style="text-decoration:none;">Download File</a>`;
    }

    // Load Comments
    loadComments(itemId);
    
    // Tampilkan auth prompt untuk komentar jika belum login
    if(currentUser){
        document.getElementById('comment-form-container').classList.remove('hidden');
        document.getElementById('comment-login-prompt').classList.add('hidden');
    } else {
        document.getElementById('comment-form-container').classList.add('hidden');
        document.getElementById('comment-login-prompt').classList.remove('hidden');
    }

    document.getElementById('detail-modal').classList.add('active');
}

// Redirect ke login dari detail (menyimpan niat user - simplified)
window.closeDetailAndLogin = () => {
    document.getElementById('detail-modal').classList.remove('active');
    window.switchScreen('screen-login');
}


function renderItemsToUI() {
  const container = document.getElementById('public-items-container');
  container.innerHTML = '';
  
  let displayItems = globalAllItems;
  if (currentCategoryFilter !== 'Semua') {
    displayItems = displayItems.filter(item => item.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }
  
  if (currentSearchQuery.trim() !== '') {
    displayItems = displayItems.filter(item => 
      item.title.toLowerCase().includes(currentSearchQuery) || 
      item.category.toLowerCase().includes(currentSearchQuery) || 
      (item.desc_id && item.desc_id.toLowerCase().includes(currentSearchQuery))
    );
  }

  if (displayItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:20px;">Tidak ditemukan item yang cocok.</p>';
    return;
  }

  const isSpecific = currentCategoryFilter !== 'Semua';
  const cardClass = isSpecific ? 'card-vertical' : 'card-horizontal';

  displayItems.forEach(item => {
    const isUploaderAdmin = item.source === 'github' || (item.source === 'firebase' && isAdmin); 
    const userRoleBadge = getRoleBadge(isUploaderAdmin); 

    let btnAdmin = (isAdmin && item.source === 'firebase') ? `<button class="btn btn-secondary" style="border:1px solid red; color:red; flex:none; padding:8px;" onclick="event.stopPropagation(); window.deletePublicItem('${item.id}', '${item.title}')"><svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : '';
    
    let actionBtnHTML = '';
    let serverStatusHTML = '';

    if (item.category.toLowerCase() === 'server') {
      const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version; 
      serverStatusHTML = `<div id="status-${item.id}" class="server-status" data-target="${ipTarget}"><span class="loader-inline"></span><span style="color:var(--text-muted); margin-left:8px; font-weight:normal;">Mengecek server...</span></div>`;
      actionBtnHTML = `<button class="btn btn-secondary" style="flex:1; border-color:var(--primary); color:var(--primary);" onclick="event.stopPropagation(); window.copyText('${ipTarget}')">Salin IP</button>`;
      fetchServerStatus(item.id, ipTarget);
    } else {
      actionBtnHTML = `<a href="${item.url_file}" target="_blank" onclick="event.stopPropagation();" class="btn btn-primary" style="flex:1; text-align:center; padding:10px; text-decoration:none;">Download</a>`;
    }

    // Bungkus seluruh card-img dengan wrapper agar klik memanggil openDetail
    container.innerHTML += `
      <div class="${cardClass}" style="margin-bottom:15px; cursor:pointer;" onclick="window.openDetail('${item.id}')">
        <div class="card-img-wrapper">
             <img src="${item.url_img}" class="card-img" onerror="this.src='https://via.placeholder.com/300'">
        </div>
        <div class="card-body">
          <h3 class="font-bold" style="font-size:16px; margin-bottom:4px;">${item.title}</h3>
          
          <div style="font-size:11px; margin-bottom:8px; color:var(--text-muted);">
             Oleh: <span class="text-main">${item.username || 'System'}</span> ${userRoleBadge}
          </div>

          <div class="card-meta">${item.category} ${item.version && item.category.toLowerCase() !== 'server' ? '• '+item.version : ''}</div>
          
          ${serverStatusHTML}
          
          <p class="card-desc">${item.desc_id || item.desc || ''}</p>
          <div class="flex" style="gap:10px;">
            ${actionBtnHTML}
            ${btnAdmin}
          </div>
        </div>
      </div>`;
  });
}


// ================= HANDLER UPLOAD FILE LOKAL ITEM =================
window.handleLocalImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { window.showModalAlert("Max 5MB untuk gambar preview."); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    localImageBase64 = e.target.result;
    document.getElementById('img-status').innerText = `✓ Gambar siap: ${file.name}`;
    document.getElementById('add-img').value = ""; 
  };
  reader.readAsDataURL(file);
};

window.handleLocalFile = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { window.showModalAlert("Max 5MB untuk file mod/download."); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    localFileBase64 = e.target.result;
    document.getElementById('file-status').innerText = `✓ File siap: ${file.name}`;
    document.getElementById('add-file').value = ""; 
  };
  reader.readAsDataURL(file);
};

// ================= KIRIM ITEM =================
window.submitItem = async () => {
  if (!currentUser) return;
  
  const cat = document.getElementById('selected-category-text').innerText;
  const desc_id = document.getElementById('add-desc').value.trim();
  const finalImg = localImageBase64 || document.getElementById('add-img').value.trim();
  
  let title, version, finalFile, serverIp, serverPort;

  if (cat === 'Server') {
    title = document.getElementById('add-server-name').value.trim();
    serverIp = document.getElementById('add-server-ip').value.trim();
    serverPort = document.getElementById('add-server-port').value.trim() || "19132";
    version = document.getElementById('selected-version-text').innerText;
    finalFile = '#'; 
    if (!title || !serverIp || !desc_id || !finalImg) { 
      window.showModalAlert("Gagal: Nama, IP Server, Deskripsi, dan Gambar wajib diisi!"); return; 
    }
  } else {
    title = document.getElementById('add-title').value.trim();
    version = document.getElementById('add-version').value.trim();
    finalFile = localFileBase64 || document.getElementById('add-file').value.trim();
    if (!title || !version || !desc_id || !finalImg || !finalFile) { 
      window.showModalAlert("Gagal: Semua field wajib diisi!"); return; 
    }
  }

  const btnSubmit = document.getElementById('btn-submit-item');
  btnSubmit.disabled = true; btnSubmit.innerText = "Mengunggah...";

  const data = {
    title: title, category: cat, version: version, desc_id: desc_id,
    url_img: finalImg, url_file: finalFile,
    uid: currentUser.uid, username: currentUsername,
    createdAt: serverTimestamp()
  };

  if(cat === 'Server') {
    data.server_ip = serverIp;
    data.server_port = serverPort;
  }

  try {
    if (isAdmin) {
      await push(ref(db, 'items_public'), data);
      window.showModalAlert("Telah dipublikasikan langsung oleh Admin!");
    } else {
      await push(ref(db, 'items_pending'), data);
      window.showModalAlert("Berhasil dikirim! Item Anda sedang direview.");
    }
    
    document.getElementById('add-title').value = ''; document.getElementById('add-version').value = '';
    document.getElementById('add-server-name').value = ''; document.getElementById('add-server-ip').value = '';
    document.getElementById('add-desc').value = ''; document.getElementById('add-img').value = '';
    document.getElementById('add-file').value = ''; document.getElementById('file-img').value = '';
    document.getElementById('file-doc').value = ''; document.getElementById('img-status').innerText = '';
    document.getElementById('file-status').innerText = '';
    localImageBase64 = null; localFileBase64 = null;
    
    btnSubmit.disabled = false; btnSubmit.innerText = "Upload Sekarang";
    window.switchScreen('screen-home');
  } catch (e) { 
    window.showModalAlert("Gagal mengirim data."); 
    btnSubmit.disabled = false; btnSubmit.innerText = "Upload Sekarang";
  }
};

// ================= ADMIN PANEL (SELEKSI & TEST) =================
function loadPendingItems() {
  if(!isAdmin) return;
  onValue(ref(db, 'items_pending'), (snapshot) => {
    const container = document.getElementById('pending-items-container');
    const badgeCount = document.getElementById('pending-count');
    container.innerHTML = '';
    let count = 0;
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        count++;
        const item = child.val();
        
        let testBtnHTML = '';
        if (item.category === 'Server') {
            const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port}` : item.version;
            testBtnHTML = `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.copyText('${ipTarget}')">Salin IP (Test)</button>`;
        } else {
            testBtnHTML = `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.open('${item.url_file}', '_blank')">Download Test</button>`;
        }

        container.innerHTML += `
          <div class="card-vertical" style="border-color:var(--primary); margin-bottom:20px; display:block;">
            <div class="card-body">
              <h4 class="font-bold text-main" style="margin-bottom:5px;">${item.title}</h4>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Pengirim: ${item.username} | Kategori: ${item.category}</p>
              
              <div class="flex" style="gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                <button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.open('${item.url_img}', '_blank')">Lihat Gambar</button>
                ${testBtnHTML}
              </div>

              <div class="flex" style="gap:10px;">
                <button class="btn btn-success" style="flex:1;" onclick="window.approveItem('${child.key}', '${item.uid}', '${item.title}')">Terima</button>
                <button class="btn btn-danger" style="flex:1;" onclick="window.promptReject('${child.key}', '${item.uid}', '${item.title}')">Tolak</button>
              </div>
            </div>
          </div>`;
      });
    } else {
      container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Tidak ada antrean.</p>';
    }
    if(badgeCount) badgeCount.innerText = count;
  });
}

window.approveItem = async (id, uid, title) => {
  const snap = await get(ref(db, `items_pending/${id}`));
  if(snap.exists()){
     await set(ref(db, `items_public/${id}`), snap.val());
     await remove(ref(db, `items_pending/${id}`));
     
     await push(ref(db, `notifications/${uid}`), {
        type: 'accepted', title: title, time: serverTimestamp(), read: false
     });
     
     window.showModalAlert("Item disetujui, dipublikasikan, dan notifikasi dikirim!");
  }
};

window.promptReject = (id, uid, title) => {
  currentRejectItem = { id, uid, title };
  document.getElementById('reject-reason').value = '';
  document.getElementById('reject-modal').classList.add('active');
};

window.submitReject = async () => {
  if (!currentRejectItem) return;
  const reason = document.getElementById('reject-reason').value.trim();
  const { id, uid, title } = currentRejectItem;
  
  await remove(ref(db, `items_pending/${id}`));
  
  await push(ref(db, `notifications/${uid}`), {
      type: 'rejected', title: title, reason: reason || 'Tidak ada alasan spesifik.', time: serverTimestamp(), read: false
  });
  
  document.getElementById('reject-modal').classList.remove('active');
  window.showModalAlert("Item ditolak dan notifikasi dikirim ke user.");
  currentRejectItem = null;
};

window.deletePublicItem = (id, title) => {
  window.showModalConfirm(`Hapus secara permanen item: "${title}" dari aplikasi?`, async () => {
    await remove(ref(db, `items_public/${id}`));
  });
};


// ================= SISTEM KOMENTAR & BALASAN =================

window.updateCommentCounter = (inputId, counterId) => {
    const el = document.getElementById(inputId);
    const count = el.value.length;
    document.getElementById(counterId).innerText = `${count}/200`;
};

// Ambil komentar untuk item tertentu
function loadComments(itemId) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">${dict[currentLang]['loading_comments']}</p>`;

    // Ambil data user cache (untuk avatar/role lebih cepat tanpa query per komen jika mungkin, tapi kita query langsung saja untuk simplicity & real-time)
    onValue(ref(db, `comments/${itemId}`), async (snapshot) => {
        commentsList.innerHTML = '';
        if (!snapshot.exists()) {
            commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`;
            return;
        }

        const allComments = [];
        snapshot.forEach(child => {
            allComments.push({ id: child.key, ...child.val() });
        });

        // Pisahkan komentar utama dan balasan
        const mainComments = allComments.filter(c => !c.parentId);
        const replies = allComments.filter(c => c.parentId);

        // Sort main comments: baru ke lama
        mainComments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (mainComments.length === 0) {
            commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`;
            return;
        }

        for (const comment of mainComments) {
            // Ambil info uploader (avatar & admin status realtime) - untuk optimize di prod, gunakan Cloud Functions/cache, tapi untuk sekarang OK
            let avatarUrl = 'https://via.placeholder.com/32';
            let isCommenterAdmin = false;
            try {
                const [userSnap, adminSnap] = await Promise.all([
                    get(ref(db, `users/${comment.uid}/photoURL`)),
                    get(ref(db, `admins/${comment.uid}`))
                ]);
                if(userSnap.exists()) avatarUrl = userSnap.val();
                if(adminSnap.exists() && adminSnap.val() === true) isCommenterAdmin = true;
            } catch(e){}

            const roleBadge = getRoleBadge(isCommenterAdmin);
            const dateStr = comment.createdAt ? new Date(comment.createdAt).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Baru saja';
            
            // Render Balasan untuk komentar ini
            const commentReplies = replies.filter(r => r.parentId === comment.id);
            commentReplies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // Lama ke baru
            
            let repliesHTML = '';
            if (commentReplies.length > 0) {
                const replyItemsHTML = await Promise.all(commentReplies.map(async (reply) => {
                    let rAvatar = 'https://via.placeholder.com/24';
                    let rAdmin = false;
                    try {
                        const [ruSnap, raSnap] = await Promise.all([get(ref(db, `users/${reply.uid}/photoURL`)), get(ref(db, `admins/${reply.uid}`))]);
                        if(ruSnap.exists()) rAvatar = ruSnap.val();
                        if(raSnap.exists() && raSnap.val()===true) rAdmin = true;
                    } catch(e){}

                    const rBadge = getRoleBadge(rAdmin);
                    const rDate = reply.createdAt ? new Date(reply.createdAt).toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '';
                    const isReplyOwner = currentUser && (currentUser.uid === reply.uid || isAdmin);

                    return `
                    <div class="reply-item">
                        <div class="comment-header" style="margin-bottom:2px;">
                            <div class="comment-author-info">
                                <img src="${rAvatar}" class="comment-avatar" style="width:24px; height:24px;">
                                <span class="comment-author" style="font-size:12px;">${reply.username}</span> ${rBadge}
                                <span class="comment-date" style="font-size:10px;">${rDate}</span>
                            </div>
                        </div>
                        <div class="reply-to-text">${dict[currentLang]['replying_to']} @${reply.replyToUsername}</div>
                        <div style="position:relative;">
                            <p class="comment-text text-selectable" id="text-${reply.id}" data-translated="false" data-original="${escapeHtml(reply.text)}" style="font-size:12px; margin-bottom:4px;">${escapeHtml(reply.text)}</p>
                        </div>
                        <div class="comment-actions" style="gap:10px;">
                            <button class="comment-action-btn" onclick="window.translateComment('${reply.id}')">
                                <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg> <span id="btn-text-${reply.id}">${dict[currentLang]['translate']}</span>
                            </button>
                            <button class="comment-action-btn" onclick="window.showReplyBox('${comment.id}', '${reply.username}')">
                                <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg> ${dict[currentLang]['reply']}
                            </button>
                            ${isReplyOwner ? `<button class="comment-action-btn danger" onclick="window.deleteComment('${itemId}', '${reply.id}')">${dict[currentLang]['delete']}</button>` : ''}
                        </div>
                    </div>`;
                }));
                
                const showText = dict[currentLang]['show_replies'].replace('{count}', commentReplies.length);
                repliesHTML = `
                <div style="margin-top:8px;">
                    <button class="comment-action-btn" onclick="document.getElementById('replies-${comment.id}').classList.toggle('hidden'); const isHid = document.getElementById('replies-${comment.id}').classList.contains('hidden'); this.innerHTML = isHid ? '<svg class=\\'icon\\' style=\\'width:12px; height:12px;\\' viewBox=\\'0 0 24 24\\'><polyline points=\\'6 9 12 15 18 9\\'/></svg> ${showText}' : '<svg class=\\'icon\\' style=\\'width:12px; height:12px;\\' viewBox=\\'0 0 24 24\\'><polyline points=\\'18 15 12 9 6 15\\'/></svg> ${dict[currentLang]['hide_replies']}';" style="font-weight:bold; color:var(--primary);">
                        <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg> ${showText}
                    </button>
                    <div id="replies-${comment.id}" class="reply-list hidden">
                        ${replyItemsHTML.join('')}
                    </div>
                </div>`;
            }

            const isOwner = currentUser && (currentUser.uid === comment.uid || isAdmin);

            const commentHTML = `
            <div class="comment-item" id="comment-wrap-${comment.id}">
                <div class="comment-header">
                    <div class="comment-author-info">
                        <img src="${avatarUrl}" class="comment-avatar">
                        <span class="comment-author">${comment.username}</span> ${roleBadge}
                    </div>
                    <span class="comment-date">${dateStr}</span>
                </div>
                <div style="position:relative;">
                    <p class="comment-text text-selectable" id="text-${comment.id}" data-translated="false" data-original="${escapeHtml(comment.text)}">${escapeHtml(comment.text)}</p>
                </div>
                
                <div class="comment-actions">
                    <button class="comment-action-btn" onclick="window.translateComment('${comment.id}')">
                        <svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg> <span id="btn-text-${comment.id}">${dict[currentLang]['translate']}</span>
                    </button>
                    <button class="comment-action-btn" onclick="window.showReplyBox('${comment.id}', '${comment.username}')">
                         <svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg> ${dict[currentLang]['reply']}
                    </button>
                    ${isOwner ? `<button class="comment-action-btn danger" onclick="window.deleteComment('${itemId}', '${comment.id}')"><svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> ${dict[currentLang]['delete']}</button>` : ''}
                </div>
                
                <!-- Kotak Input Balasan (Hidden by default) -->
                <div id="reply-box-${comment.id}" class="reply-input-area hidden">
                    <div class="reply-to-text">${dict[currentLang]['replying_to']} @<span id="reply-target-${comment.id}">${comment.username}</span></div>
                    <textarea id="reply-text-${comment.id}" class="comment-textarea text-selectable" style="min-height:40px;" placeholder="Tulis balasan..." maxlength="200" oninput="window.updateCommentCounter('reply-text-${comment.id}', 'reply-counter-${comment.id}')"></textarea>
                    <div class="flex justify-between items-center">
                        <span id="reply-counter-${comment.id}" class="char-counter">0/200</span>
                        <div class="flex" style="gap:5px;">
                            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="document.getElementById('reply-box-${comment.id}').classList.add('hidden')">${dict[currentLang]['cancel_reply']}</button>
                            <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.postReply('${itemId}', '${comment.id}')">${dict[currentLang]['post_reply']}</button>
                        </div>
                    </div>
                </div>

                ${repliesHTML}
            </div>
            `;
            commentsList.innerHTML += commentHTML;
        }

        // Jalankan auto-translate jika aktif
        if(autoTranslateEnabled) {
            allComments.forEach(c => {
                const el = document.getElementById(`text-${c.id}`);
                if(el && el.dataset.translated === "false") {
                     window.translateComment(c.id, true);
                }
            });
        }

    });
}

// Menampilkan input balasan
window.showReplyBox = (mainCommentId, targetUsername) => {
    if(!currentUser) {
        window.closeDetailAndLogin();
        return;
    }
    const box = document.getElementById(`reply-box-${mainCommentId}`);
    if(box) {
        box.classList.remove('hidden');
        document.getElementById(`reply-target-${mainCommentId}`).innerText = targetUsername;
        document.getElementById(`reply-text-${mainCommentId}`).focus();
    }
}

// Kirim Komentar Utama
window.postComment = async () => {
    if(!currentUser) return;
    const textEl = document.getElementById('new-comment-text');
    const text = textEl.value.trim();
    if(!text) return;
    if(text.length > 200) { window.showModalAlert("Komentar maksimal 200 karakter."); return; }

    const now = Date.now();
    if(now - lastCommentTime < 30000) {
        const sisa = Math.ceil((30000 - (now - lastCommentTime)) / 1000);
        window.showModalAlert(`Tunggu ${sisa} detik lagi sebelum mengirim komentar/balasan.`);
        return;
    }

    try {
        const commentRef = push(ref(db, `comments/${currentDetailItemId}`));
        const newComment = {
            uid: currentUser.uid,
            username: currentUsername,
            text: text,
            createdAt: serverTimestamp(),
            parentId: null
        };

        const updates = {};
        updates[`comments/${currentDetailItemId}/${commentRef.key}`] = newComment;
        updates[`users/${currentUser.uid}/lastCommentAt`] = serverTimestamp(); // Boleh dicatat di DB juga jika ada rule

        await update(ref(db), updates);
        
        lastCommentTime = now;
        textEl.value = '';
        window.updateCommentCounter('new-comment-text', 'new-comment-counter');
        
    } catch(err) {
        window.showModalAlert("Gagal mengirim komentar: " + err.message);
    }
}

// Kirim Balasan
window.postReply = async (itemId, mainCommentId) => {
    if(!currentUser) return;
    const textEl = document.getElementById(`reply-text-${mainCommentId}`);
    const text = textEl.value.trim();
    const targetUsername = document.getElementById(`reply-target-${mainCommentId}`).innerText;
    
    if(!text) return;
    if(text.length > 200) { window.showModalAlert("Balasan maksimal 200 karakter."); return; }

    const now = Date.now();
    if(now - lastCommentTime < 30000) {
        const sisa = Math.ceil((30000 - (now - lastCommentTime)) / 1000);
        window.showModalAlert(`Tunggu ${sisa} detik lagi.`);
        return;
    }

    try {
        const replyRef = push(ref(db, `comments/${itemId}`));
        const newReply = {
            uid: currentUser.uid,
            username: currentUsername,
            text: text,
            createdAt: serverTimestamp(),
            parentId: mainCommentId,
            replyToUsername: targetUsername
        };

        const updates = {};
        updates[`comments/${itemId}/${replyRef.key}`] = newReply;
        
        await update(ref(db), updates);
        
        lastCommentTime = now;
        textEl.value = '';
        document.getElementById(`reply-box-${mainCommentId}`).classList.add('hidden');
        
    } catch(err) {
        window.showModalAlert("Gagal mengirim balasan: " + err.message);
    }
}

// Hapus Komentar (Otomatis menghapus balasannya via Rules/Client jika admin, tapi client lebih mudah update multi-path)
window.deleteComment = async (itemId, commentId) => {
    window.showModalConfirm("Yakin ingin menghapus komentar ini? Balasan di dalamnya juga akan terhapus.", async () => {
        try {
            // Cari balasan yang terkait
            const snap = await get(ref(db, `comments/${itemId}`));
            const updates = {};
            updates[`comments/${itemId}/${commentId}`] = null;
            
            if(snap.exists()) {
                snap.forEach(child => {
                    const c = child.val();
                    if(c.parentId === commentId) {
                        updates[`comments/${itemId}/${child.key}`] = null;
                    }
                });
            }
            
            await update(ref(db), updates);
        } catch(e) {
            window.showModalAlert("Gagal menghapus komentar.");
        }
    });
}

// Fungsi Escape HTML Mencegah XSS
function escapeHtml(unsafe) {
    return (unsafe||"")
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// ================= TRANSLATE LOGIC =================
window.translateDesc = async () => {
    const descEl = document.getElementById('detail-desc');
    const btnTextEl = document.getElementById('text-translate-desc');
    const isTranslated = descEl.dataset.translated === "true";
    const originalText = descEl.dataset.originalText;

    if (isTranslated) {
        descEl.innerText = originalText;
        descEl.dataset.translated = "false";
        btnTextEl.innerText = dict[currentLang]['translate'];
    } else {
        btnTextEl.innerText = "...";
        document.getElementById('btn-translate-desc').disabled = true;
        try {
            const target = currentLang === 'id' ? 'id' : 'en';
            const res = await translateText(originalText, target);
            descEl.innerText = res;
            descEl.dataset.translated = "true";
            btnTextEl.innerText = dict[currentLang]['show_original'];
        } catch(e) {
            window.showModalAlert("Terjemahan gagal, periksa koneksi.");
            btnTextEl.innerText = dict[currentLang]['translate'];
        }
        setTimeout(() => { document.getElementById('btn-translate-desc').disabled = false; }, 2000);
    }
}

window.translateComment = async (id, isAuto = false) => {
    const textEl = document.getElementById(`text-${id}`);
    const btnTextEl = document.getElementById(`btn-text-${id}`);
    if(!textEl || !btnTextEl) return;

    const isTranslated = textEl.dataset.translated === "true";
    const originalText = textEl.dataset.original;

    if (isTranslated && !isAuto) {
        textEl.innerText = originalText;
        textEl.dataset.translated = "false";
        btnTextEl.innerText = dict[currentLang]['translate'];
    } else if (!isTranslated) {
        if(!isAuto) btnTextEl.innerText = "...";
        try {
            const target = currentLang === 'id' ? 'id' : 'en';
            const res = await translateText(originalText, target);
            textEl.innerText = res;
            textEl.dataset.translated = "true";
            btnTextEl.innerText = dict[currentLang]['show_original'];
        } catch(e) {
            if(!isAuto) btnTextEl.innerText = dict[currentLang]['translate'];
        }
    }
}

