import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
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
let currentDetailItemId = null; 
let lastCommentTime = 0; 
let autoTranslateEnabled = localStorage.getItem('autoTranslate') === 'true';
let currentLang = localStorage.getItem('lang') || 'id';

// ================= DICTIONARY TRANSLATE =================
const dict = {
  'id': {
    verifying_session: "Memverifikasi sesi...", login_title: "Masuk ke Akun", login_subtitle: "Belum punya akun?", login_switch: "Daftar di sini", login_btn: "Masuk", or_via: "atau via", login_google: "Masuk dengan Google",
    create_username_title: "Buat Username", create_username_desc: "Hanya huruf, angka, dan underscore (3-16 karakter).", save_username: "Simpan Username",
    my_profile: "Profil Saya", change_photo: "UBAH FOTO", logout: "Keluar Akun", submit_new_item: "Kirim Baru", cancel: "Batal",
    category_label: "Kategori*", title_label: "Judul Item*", version_label: "Versi MCPE*", server_name_label: "Nama Server*", server_ip_label: "IP Server*", server_port_label: "Port*", supported_version_label: "Versi yang Didukung*", desc_label: "Deskripsi*", img_preview_label: "Gambar Preview*", choose_file: "Pilih File", file_download_label: "File Download / Mod*", upload_now: "Upload Sekarang",
    admin_panel: "Panel Admin", queue: "Antrean", no_queue: "Tidak ada antrean.", nav_home: "Beranda", nav_upload: "Upload", nav_profile: "Profil", cat_all: "Semua", translate_ui: "Translate UI (ID/EN)", support: "Layanan / Bantuan", notifications: "Notifikasi", no_notifications: "Belum ada notifikasi.", search_placeholder: "Cari item, mod, atau server...", description: "Deskripsi", translate: "Terjemahkan", show_original: "Lihat asli", comments: "Komentar", post_comment: "Kirim Komentar", login_to_comment: "Silakan masuk untuk memberikan komentar.", loading_comments: "Memuat komentar...", reply: "Balas", delete: "Hapus", post_reply: "Kirim", cancel_reply: "Batal", show_replies: "Lihat {count} balasan", hide_replies: "Sembunyikan balasan", replying_to: "Membalas", info: "Informasi", ok: "Oke", confirm_title: "Konfirmasi",
    error_file_type: "File yang dipilih bukan gambar!", error_file_size: "Ukuran foto maksimal 5 MB!", error_save: "Gagal menyimpan: ", error_offline: "Periksa koneksi internet.", auto_translate: "Auto-Translate: ", already_in_lang: "Sudah dalam bahasa ini", edit_bio: "Edit Bio (Maks 80 kar):", save_bio: "Simpan Bio", joined: "Bergabung", items_published: "Item Publik", email_placeholder: "Alamat Email", password_placeholder: "Password (Min 6)", write_comment_placeholder: "Tulis komentar..."
  },
  'en': {
    verifying_session: "Verifying session...", login_title: "Sign In", login_subtitle: "Don't have an account?", login_switch: "Sign up here", login_btn: "Sign In", or_via: "or via", login_google: "Sign in with Google",
    create_username_title: "Create Username", create_username_desc: "Letters, numbers, and underscores only (3-16 chars).", save_username: "Save Username",
    my_profile: "My Profile", change_photo: "CHANGE PHOTO", logout: "Logout", submit_new_item: "Submit New", cancel: "Cancel",
    category_label: "Category*", title_label: "Item Title*", version_label: "MCPE Version*", server_name_label: "Server Name*", server_ip_label: "Server IP*", server_port_label: "Port*", supported_version_label: "Supported Version*", desc_label: "Description*", img_preview_label: "Preview Image*", choose_file: "Choose File", file_download_label: "Download File / Mod*", upload_now: "Upload Now",
    admin_panel: "Admin Panel", queue: "Queue", no_queue: "No queue.", nav_home: "Home", nav_upload: "Upload", nav_profile: "Profile", cat_all: "All", translate_ui: "Translate UI (ID/EN)", support: "Support / Help", notifications: "Notifications", no_notifications: "No notifications yet.", search_placeholder: "Search items, mods, or servers...", description: "Description", translate: "Translate", show_original: "Show original", comments: "Comments", post_comment: "Post Comment", login_to_comment: "Please sign in to post a comment.", loading_comments: "Loading comments...", reply: "Reply", delete: "Delete", post_reply: "Send", cancel_reply: "Cancel", show_replies: "View {count} replies", hide_replies: "Hide replies", replying_to: "Replying to", info: "Information", ok: "OK", confirm_title: "Confirm",
    error_file_type: "Selected file is not an image!", error_file_size: "Photo size max 5 MB!", error_save: "Failed to save: ", error_offline: "Check internet connection.", auto_translate: "Auto-Translate: ", already_in_lang: "Already in this language", edit_bio: "Edit Bio (Max 80 chars):", save_bio: "Save Bio", joined: "Joined", items_published: "Public Items", email_placeholder: "Email Address", password_placeholder: "Password (Min 6)", write_comment_placeholder: "Write a comment..."
  }
};

function t(key, params = {}) {
    let text = dict[currentLang][key] || key;
    for (let p in params) text = text.replace(`{${p}}`, params[p]);
    return text;
}

function formatDate(timestamp) {
    if(!timestamp) return '';
    const locale = currentLang === 'id' ? 'id-ID' : 'en-US';
    return new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(timestamp));
}

window.applyLanguage = () => {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  const autoEl = document.getElementById('auto-translate-status');
  if(autoEl) { autoEl.innerText = autoTranslateEnabled ? "ON" : "OFF"; autoEl.className = autoTranslateEnabled ? "text-success" : "text-danger"; }

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
    if(currentDetailItemId) loadComments(currentDetailItemId);
};

const hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);

async function translateText(text, targetLang) {
    if(!text || text.trim() === '') return text;
    const safeText = text.length > 490 ? text.substring(0, 490) + "..." : text;
    const cacheKey = `trans_${hashCode(safeText)}_${targetLang}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(safeText)}&langpair=Autodetect|${targetLang}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            if(data.responseData.translatedText === safeText) return "ALREADY_SAME";
            if(!data.responseData.translatedText.includes('MYMEMORY WARNING')){
                localStorage.setItem(cacheKey, data.responseData.translatedText);
                return data.responseData.translatedText;
            }
        }
    } catch (e) {}
    
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(safeText)}`;
        const response = await fetch(url);
        const data = await response.json();
        if(data && data[0] && data[0][0]){
             const translated = data[0].map(item => item[0]).join('');
             if(translated === safeText) return "ALREADY_SAME";
             localStorage.setItem(cacheKey, translated);
             return translated;
        }
    } catch (e) {}
    throw new Error("Translation failed");
}

// ================= GLOBAL DIALOGS =================
let activeDialogs = [];
window.openDialog = (id) => {
    document.getElementById('dialogLayer').classList.remove('hidden');
    document.getElementById('dialogLayer').classList.add('active');
    document.getElementById(id).classList.add('active');
    activeDialogs.push(id);
    document.body.style.overflow = 'hidden';
};
window.closeDialog = (id) => {
    document.getElementById(id).classList.remove('active');
    activeDialogs = activeDialogs.filter(d => d !== id);
    if(activeDialogs.length === 0) {
        document.getElementById('dialogLayer').classList.remove('active');
        setTimeout(() => document.getElementById('dialogLayer').classList.add('hidden'), 300);
        document.body.style.overflow = '';
    }
};
window.closeTopDialog = () => {
    if(activeDialogs.length > 0) window.closeDialog(activeDialogs[activeDialogs.length - 1]);
};
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') window.closeTopDialog(); });

window.showModalAlert = (msg) => {
  document.getElementById('dialog-alert-msg').innerText = msg;
  window.openDialog('dialog-alert');
};

window.showModalConfirm = (msg, onConfirmCallback) => {
  document.getElementById('dialog-confirm-msg').innerText = msg;
  document.getElementById('btn-dialog-confirm').onclick = () => { window.closeDialog('dialog-confirm'); onConfirmCallback(); };
  window.openDialog('dialog-confirm');
};

window.copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => { window.showModalAlert(`Berhasil menyalin IP: ${text}`); });
};

// ================= BOTTOM SHEETS & DRAWERS =================
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

window.selectVersionForm = (ver) => { document.getElementById('selected-version-text').innerText = ver; window.closeBottomSheet(); };
window.closeBottomSheet = () => { document.getElementById('bottom-sheet-overlay').classList.remove('active'); };

window.switchScreen = (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); window.scrollTo(0, 0); };
window.requireLoginAndSwitch = (id) => { if(currentUser) window.switchScreen(id); else { window.showModalAlert(t('login_to_comment')); window.switchScreen('screen-login'); } };
window.toggleDrawer = (id) => { const isAct = document.getElementById(id).classList.contains('active'); window.closeAllDrawers(); if(!isAct) { document.getElementById(id).classList.add('active'); document.getElementById('drawer-overlay').classList.add('active'); } };
window.closeAllDrawers = () => { document.querySelectorAll('.side-drawer').forEach(el => el.classList.remove('active')); document.getElementById('drawer-overlay').classList.remove('active'); };

function getRoleBadge(role) {
    if (role === 'admin' || role === 'dev') return `<span class="badge-role badge-dev"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Dev</span>`;
    if (role === 'user' || role === 'member') return `<span class="badge-role badge-verified">Member</span>`;
    return '';
}

function generateDefaultAvatar(name) {
    const c = document.createElement('canvas'); c.width = 100; c.height = 100; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff8c00'; ctx.fillRect(0,0,100,100); ctx.fillStyle = '#000000'; ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?').charAt(0).toUpperCase(), 50, 50);
    return c.toDataURL('image/jpeg', 0.8);
}

// ================= AUTHENTICATION & PROFILES =================
window.toggleAuthMode = () => {
  isSignUpMode = !isSignUpMode;
  window.applyLanguage();
  document.getElementById('login-error').innerText = '';
};

window.processEmailAuth = async () => {
  const email = document.getElementById('auth-email').value.trim(); const password = document.getElementById('auth-password').value;
  if (!email || !password) { document.getElementById('login-error').innerText = 'Isi form dengan lengkap.'; return; }
  document.getElementById('auth-submit-btn').disabled = true;
  try {
    if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById('login-error').innerText = err.message;
    document.getElementById('auth-submit-btn').disabled = false;
  }
};
window.loginGoogle = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e){} };
window.customLogout = () => { window.closeAllDrawers(); window.showModalConfirm(t('logout'), () => { signOut(auth).then(() => { isAdmin = false; currentUser = null; currentUsername = null; window.switchScreen('screen-login'); updateHeaderAuthUI();}); }); };

function updateHeaderAuthUI() {
    if(currentUser) {
        document.getElementById('btn-notif-header').classList.remove('hidden'); document.getElementById('btn-login-header').classList.add('hidden');
        document.getElementById('sidebar-auth-section').innerHTML = `<button class="btn btn-secondary" onclick="window.customLogout()" style="width:100%; border-color:var(--danger); color:var(--danger);">${t('logout')}</button>`;
    } else {
        document.getElementById('btn-notif-header').classList.add('hidden'); document.getElementById('btn-login-header').classList.remove('hidden'); document.getElementById('btn-open-admin').classList.add('hidden');
        document.getElementById('sidebar-profile-img').src = "https://via.placeholder.com/60"; document.getElementById('sidebar-name').innerText = "Tamu"; document.getElementById('sidebar-role').innerHTML = "";
        document.getElementById('sidebar-auth-section').innerHTML = `<button class="btn btn-primary" onclick="window.switchScreen('screen-login'); window.closeAllDrawers();" style="width:100%;">${t('login_btn')}</button>`;
    }
}

// Proceed to Home logic
function proceedToHome(user, pData) {
     currentUsername = pData.username;
     isAdmin = pData.role === 'admin' || pData.role === 'dev';
     
     document.getElementById('profile-name').innerText = currentUsername; document.getElementById('sidebar-name').innerText = currentUsername;
     const dp = pData.avatar || user.photoURL || generateDefaultAvatar(currentUsername);
     document.getElementById('profile-img').src = dp; document.getElementById('sidebar-profile-img').src = dp;
     
     const rBadge = getRoleBadge(isAdmin ? 'admin' : 'user');
     document.getElementById('profile-role-badge').innerHTML = rBadge; document.getElementById('sidebar-role').innerHTML = rBadge;
     if(isAdmin) document.getElementById('btn-open-admin').classList.remove('hidden'); else document.getElementById('btn-open-admin').classList.add('hidden');
     
     if(isAdmin) loadPendingItems();
     listenNotifications();
     window.switchScreen('screen-home');
     fetchAllItemsAndRender();
}

setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user; updateHeaderAuthUI();
      try {
          const pSnap = await get(ref(db, `profiles/${user.uid}`));
          if (pSnap.exists() && pSnap.val().username) {
             proceedToHome(user, pSnap.val());
          } else {
             // Cek jika butuh migrasi dari users
             const oldUserSnap = await get(ref(db, `users/${user.uid}/username`));
             if (oldUserSnap.exists() && oldUserSnap.val()) {
                 const oldUsername = oldUserSnap.val();
                 const oldUserLower = oldUsername.toLowerCase();
                 const isAdm = (await get(ref(db, `admins/${user.uid}`))).val() === true;
                 
                 const updates = {};
                 updates[`profiles/${user.uid}`] = {
                     username: oldUsername,
                     role: isAdm ? 'admin' : 'user',
                     joinedAt: serverTimestamp(),
                     avatar: user.photoURL || '',
                     itemCount: 0
                 };
                 updates[`usernames/${oldUserLower}`] = user.uid;
                 await update(ref(db), updates);
                 proceedToHome(user, updates[`profiles/${user.uid}`]);
             } else {
                 window.switchScreen('screen-username');
             }
          }
      } catch (err) {
          console.error(err);
          document.getElementById('screen-error-msg').innerText = "Gagal memuat akun: " + err.message;
          window.switchScreen('screen-error');
      }
    } else {
      currentUser = null; currentUsername = null; isAdmin = false; updateHeaderAuthUI();
      window.switchScreen('screen-home');
      fetchAllItemsAndRender();
    }
    window.applyLanguage();
  });
}).catch(() => { 
    window.switchScreen('screen-home'); fetchAllItemsAndRender(); 
});

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim();
  const usernameLower = username.toLowerCase();
  const errEl = document.getElementById('username-error');
  const btn = document.getElementById('btn-save-username');
  
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { errEl.innerText = t('create_username_desc'); return; }
  
  btn.disabled = true; btn.innerText = "Menyimpan..."; errEl.innerText = "";
  try {
    const unSnap = await get(ref(db, `usernames/${usernameLower}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { 
        errEl.innerText = "Username terpakai!"; btn.disabled = false; btn.innerText = t('save_username'); return; 
    }
    
    const isAdm = (await get(ref(db, `admins/${currentUser.uid}`))).val() === true;
    const dp = currentUser.photoURL || generateDefaultAvatar(username);

    const updates = {};
    updates[`usernames/${usernameLower}`] = currentUser.uid;
    updates[`profiles/${currentUser.uid}`] = { 
        username: username, avatar: dp, role: isAdm ? 'admin' : 'user', joinedAt: serverTimestamp(), itemCount: 0 
    };
    
    await update(ref(db), updates);
    proceedToHome(currentUser, updates[`profiles/${currentUser.uid}`]);
    
  } catch (e) { 
      errEl.innerText = "Akses ditolak, hubungi admin. " + e.message;
      btn.disabled = false; btn.innerText = t('save_username');
  }
};

// ================= UPLOAD FOTO PROFIL KE RTDB (/profiles) =================
window.handleProfileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { window.showModalAlert(t('error_file_type')); event.target.value = ''; return; }
  if (file.size > 5 * 1024 * 1024) { window.showModalAlert(t('error_file_size')); event.target.value = ''; return; }

  document.getElementById('profile-upload-loading').classList.remove('hidden');
  try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
              const canvas = document.createElement('canvas');
              const size = Math.min(img.width, img.height);
              const targetSize = 256; canvas.width = targetSize; canvas.height = targetSize;
              const ctx = canvas.getContext('2d');
              const offsetX = (img.width - size) / 2; const offsetY = (img.height - size) / 2;
              ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
              
              let quality = 0.8;
              let base64Image = canvas.toDataURL('image/jpeg', quality); 
              
              while (base64Image.length > 40000 && quality > 0.4) {
                  quality -= 0.1; base64Image = canvas.toDataURL('image/jpeg', quality);
              }
              if (base64Image.length > 40000) {
                  canvas.width = 192; canvas.height = 192;
                  ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 192, 192);
                  base64Image = canvas.toDataURL('image/jpeg', 0.6);
                  if (base64Image.length > 40000) throw new Error("Gambar terlalu kompleks.");
              }

              // Hanya simpan ke /profiles/{uid}/avatar. JANGAN KE AUTH.
              await update(ref(db, `profiles/${currentUser.uid}`), { avatar: base64Image });
              
              document.getElementById('profile-img').src = base64Image; document.getElementById('sidebar-profile-img').src = base64Image;
              document.getElementById('profile-upload-loading').classList.add('hidden');
              window.showModalAlert("Foto profil berhasil diperbarui!");
          } catch(err) {
              document.getElementById('profile-upload-loading').classList.add('hidden'); window.showModalAlert(t('error_save') + err.message);
          }
        };
        img.onerror = () => { document.getElementById('profile-upload-loading').classList.add('hidden'); window.showModalAlert("File gambar korup."); }
        img.src = e.target.result;
      };
      reader.onerror = () => { document.getElementById('profile-upload-loading').classList.add('hidden'); window.showModalAlert("Gagal membaca file."); }
      reader.readAsDataURL(file);
  } catch (error) { document.getElementById('profile-upload-loading').classList.add('hidden'); window.showModalAlert(t('error_save') + error.message); }
};

// ================= USER PUBLIC PROFILE =================
window.openUserProfile = async (uid) => {
    if(!currentUser) { window.showModalAlert(t('login_to_comment')); return; }
    const pSnap = await get(ref(db, `profiles/${uid}`));
    if(!pSnap.exists()) return;
    const p = pSnap.val();
    
    document.getElementById('pub-profile-img').src = p.avatar || generateDefaultAvatar(p.username);
    document.getElementById('pub-profile-name').innerText = p.username;
    document.getElementById('pub-profile-role').innerHTML = getRoleBadge(p.role);
    document.getElementById('pub-profile-bio').innerText = p.bio || (uid === currentUser.uid ? 'Belum ada bio.' : '');
    document.getElementById('pub-profile-joined').innerText = formatDate(p.joinedAt);
    document.getElementById('pub-profile-items').innerText = p.itemCount || 0;
    
    if(uid === currentUser.uid) {
        document.getElementById('pub-profile-edit-section').classList.remove('hidden');
        document.getElementById('input-pub-bio').value = p.bio || '';
    } else {
        document.getElementById('pub-profile-edit-section').classList.add('hidden');
    }
    
    window.openDialog('dialog-user-profile');
};

window.saveBio = async () => {
    const bio = document.getElementById('input-pub-bio').value.trim();
    if(bio.length > 80) return;
    try {
        await update(ref(db, `profiles/${currentUser.uid}`), {bio: bio});
        document.getElementById('pub-profile-bio').innerText = bio;
        window.showModalAlert("Bio disimpan.");
    } catch(e) { window.showModalAlert(t('error_save')); }
};

// ================= NOTIFIKASI =================
function listenNotifications() {
  if(!currentUser) return;
  onValue(ref(db, `notifications/${currentUser.uid}`), (snapshot) => {
    const notifContainer = document.getElementById('notif-container'); const badge = document.getElementById('notif-badge');
    notifContainer.innerHTML = ''; let unreadCount = 0;
    if (!snapshot.exists()) { notifContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:20px;">${t('no_notifications')}</p>`; badge.classList.add('hidden'); return; }
    const notifs = []; snapshot.forEach(child => { notifs.push({ id: child.key, ...child.val() }); });
    notifs.sort((a, b) => (b.time || 0) - (a.time || 0));
    notifs.forEach(notif => {
      if (!notif.read) unreadCount++;
      const color = notif.type === 'accepted' ? 'var(--success)' : 'var(--danger)'; const statusText = notif.type === 'accepted' ? 'Diterima & Dipublikasikan' : 'Ditolak';
      notifContainer.innerHTML += `
        <div class="notif-card ${!notif.read ? 'unread' : ''}" onclick="window.markNotifRead('${notif.id}')">
          <div class="font-bold" style="color:${color}; margin-bottom:5px;">Item ${statusText}</div>
          <p style="color:var(--text-main); margin-bottom:5px;">"${notif.title}"</p>
          ${notif.reason ? `<p style="color:var(--text-muted); font-size:11px;">Alasan: ${notif.reason}</p>` : ''}
        </div>`;
    });
    if (unreadCount > 0) { badge.innerText = unreadCount; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
  });
}
window.markNotifRead = async (notifId) => { if(!currentUser) return; await update(ref(db, `notifications/${currentUser.uid}/${notifId}`), {read: true}); };

// ================= SEARCH, FILTER & LAYOUT =================
window.handleSearch = (query) => { currentSearchQuery = query.toLowerCase(); renderItemsToUI(); };
window.setCategoryFilter = (category, btnElement) => { currentCategoryFilter = category; document.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); btnElement.classList.add('active'); renderItemsToUI(); };

function fetchAllItemsAndRender() {
  onValue(ref(db, 'items_public'), (snapshot) => {
    let dynamicItems = [];
    if (snapshot.exists()) { snapshot.forEach(child => { dynamicItems.push({ id: child.key, source: 'firebase', ...child.val() }); }); dynamicItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)); }
    globalAllItems = [...staticItems, ...dynamicItems]; renderItemsToUI(); 
  });
}

function fetchServerStatus(id, target) {
  const el = document.getElementById(`status-${id}`); if (!el) return;
  const [host, portRaw] = target.split(':'); const port = portRaw || '19132';
  fetch(`/api/server?host=${host}&port=${port}`).then(res => res.json()).then(data => {
      if (data.online) { el.innerHTML = `<span class="status-indicator status-online"></span> <span class="text-success" style="margin-right:5px; font-weight:bold;">Online</span> <span style="color:var(--text-muted);">|</span> <b style="margin-left:5px; color:var(--text-main);">${data.players.online}/${data.players.max}</b> <span style="color:var(--text-muted); font-weight:normal; margin-left:4px;">Players</span>`; } 
      else {
         if (data.error === 'Timeout') el.innerHTML = `<span class="status-indicator" style="background:#555;"></span> <span style="color:#aaa; margin-right:5px; font-weight:bold;">Timeout</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Sedang RTO)</span>`;
         else el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Offline</span>`;
      }
    }).catch(() => { el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Error API</span>`; });
}
setInterval(() => {
  if (!document.getElementById('screen-home').classList.contains('hidden')) {
      if (currentCategoryFilter === 'Semua' || currentCategoryFilter === 'Server') {
          document.querySelectorAll('.server-status').forEach(el => { const t = el.getAttribute('data-target'); const id = el.id.replace('status-', ''); if (t) fetchServerStatus(id, t); });
      }
  }
}, 30000);

// ================= MODAL DETAIL ITEM =================
window.openDetail = async (itemId) => {
    const item = globalAllItems.find(i => i.id === itemId); if(!item) return;
    currentDetailItemId = itemId;
    document.getElementById('detail-img').src = item.url_img;
    document.getElementById('detail-title').innerText = item.title;
    document.getElementById('detail-uploader-name').innerText = item.username || 'System';
    
    let uploaderRole = 'member'; let avatarUrl = generateDefaultAvatar(item.username);
    if(item.uid) {
         const pSnap = await get(ref(db, `profiles/${item.uid}`));
         if(pSnap.exists()) { const p = pSnap.val(); uploaderRole = p.role; avatarUrl = p.avatar; }
    } else if (item.source === 'github') uploaderRole = 'dev';
    
    document.getElementById('detail-uploader-badge').innerHTML = getRoleBadge(uploaderRole);
    document.getElementById('detail-uploader-avatar').src = avatarUrl;
    document.getElementById('detail-uploader-avatar').onclick = () => { if(item.uid) window.openUserProfile(item.uid); };
    document.getElementById('detail-uploader-name').onclick = () => { if(item.uid) window.openUserProfile(item.uid); };

    document.getElementById('detail-category').innerText = item.category;
    document.getElementById('detail-version').innerText = item.version || 'All Vers.';
    document.getElementById('detail-desc').innerText = item.desc_id || item.desc || '-';
    
    document.getElementById('text-translate-desc').innerText = t('translate');
    document.getElementById('detail-desc').dataset.originalText = item.desc_id || item.desc || '';
    document.getElementById('detail-desc').dataset.translated = "false";
    document.getElementById('btn-translate-desc').disabled = false;

    const actionContainer = document.getElementById('detail-action-container'); const statusContainer = document.getElementById('detail-server-status-container');
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

    loadComments(itemId);
    if(currentUser){ document.getElementById('comment-form-container').classList.remove('hidden'); document.getElementById('comment-login-prompt').classList.add('hidden'); } 
    else { document.getElementById('comment-form-container').classList.add('hidden'); document.getElementById('comment-login-prompt').classList.remove('hidden'); }
    document.getElementById('screen-detail-container').classList.add('active');
    document.body.style.overflow = 'hidden';
}
window.closeDetailAndLogin = () => { document.getElementById('screen-detail-container').classList.remove('active'); document.body.style.overflow=''; window.switchScreen('screen-login'); }

let globalProfilesCache = {};
function renderItemsToUI() {
  const container = document.getElementById('public-items-container'); container.innerHTML = '';
  let displayItems = globalAllItems;
  if (currentCategoryFilter !== 'Semua') displayItems = displayItems.filter(item => item.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  if (currentSearchQuery.trim() !== '') displayItems = displayItems.filter(item => item.title.toLowerCase().includes(currentSearchQuery) || item.category.toLowerCase().includes(currentSearchQuery) || (item.desc_id && item.desc_id.toLowerCase().includes(currentSearchQuery)));
  if (displayItems.length === 0) { container.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding:20px;">Tidak ditemukan.</p>`; return; }

  const isSpecific = currentCategoryFilter !== 'Semua'; const cardClass = isSpecific ? 'card-vertical' : 'card-horizontal';

  let htmlBuf = '';
  displayItems.forEach(item => {
      const userRoleBadge = item.source === 'github' ? getRoleBadge('dev') : `<span id="badge-${item.id}"></span>`;
      if(item.uid) { get(ref(db, `profiles/${item.uid}`)).then(s=>{ if(s.exists()){ const el=document.getElementById(`badge-${item.id}`); if(el) el.innerHTML = getRoleBadge(s.val().role); } }); }

      let btnAdmin = (isAdmin && item.source === 'firebase') ? `<button class="btn btn-secondary" style="border:1px solid red; color:red; flex:none; padding:8px;" onclick="event.stopPropagation(); window.deletePublicItem('${item.id}', '${item.title}')"><svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : '';
      let actionBtnHTML = ''; let serverStatusHTML = '';

      if (item.category.toLowerCase() === 'server') {
        const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version; 
        serverStatusHTML = `<div id="status-${item.id}" class="server-status" data-target="${ipTarget}"><span class="loader-inline"></span><span style="color:var(--text-muted); margin-left:8px; font-weight:normal;">Mengecek server...</span></div>`;
        actionBtnHTML = `<button class="btn btn-secondary" style="flex:1; border-color:var(--primary); color:var(--primary);" onclick="event.stopPropagation(); window.copyText('${ipTarget}')">Salin IP</button>`;
        setTimeout(()=>fetchServerStatus(item.id, ipTarget), 100);
      } else {
        actionBtnHTML = `<a href="${item.url_file}" target="_blank" onclick="event.stopPropagation();" class="btn btn-primary" style="flex:1; text-align:center; padding:10px; text-decoration:none;">Download</a>`;
      }

      htmlBuf += `
      <div class="${cardClass}" style="margin-bottom:15px;" onclick="window.openDetail('${item.id}')">
        <div class="card-img-wrapper"><img src="${item.url_img}" class="card-img" onerror="this.src='https://via.placeholder.com/300'"></div>
        <div class="card-body">
          <h3 class="font-bold" style="font-size:16px; margin-bottom:4px;">${item.title}</h3>
          <div style="font-size:11px; margin-bottom:8px; color:var(--text-muted); display:flex; align-items:center;" onclick="event.stopPropagation(); window.openUserProfile('${item.uid}')">
             Oleh: <span class="text-main" style="margin-left:4px; margin-right:4px;">${item.username || 'System'}</span> ${userRoleBadge}
          </div>
          <div class="card-meta">${item.category} ${item.version && item.category.toLowerCase() !== 'server' ? '• '+item.version : ''}</div>
          ${serverStatusHTML}
          <p class="card-desc">${item.desc_id || item.desc || ''}</p>
          <div class="flex" style="gap:10px;">${actionBtnHTML} ${btnAdmin}</div>
        </div>
      </div>`;
  });
  container.innerHTML = htmlBuf;
}

// ================= HANDLER UPLOAD FILE LOKAL ITEM =================
window.handleLocalImage = (e) => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { window.showModalAlert("Max 5MB"); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => { localImageBase64 = e.target.result; document.getElementById('img-status').innerText = `✓ Gambar siap`; document.getElementById('add-img').value = ""; };
  reader.readAsDataURL(file);
};
window.handleLocalFile = (e) => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { window.showModalAlert("Max 5MB"); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => { localFileBase64 = e.target.result; document.getElementById('file-status').innerText = `✓ File siap`; document.getElementById('add-file').value = ""; };
  reader.readAsDataURL(file);
};

window.submitItem = async () => {
  if (!currentUser) return;
  const cat = document.getElementById('selected-category-text').innerText;
  const desc_id = document.getElementById('add-desc').value.trim();
  const finalImg = localImageBase64 || document.getElementById('add-img').value.trim();
  let title, version, finalFile, serverIp, serverPort;

  if (cat === 'Server') {
    title = document.getElementById('add-server-name').value.trim(); serverIp = document.getElementById('add-server-ip').value.trim();
    serverPort = document.getElementById('add-server-port').value.trim() || "19132"; version = document.getElementById('selected-version-text').innerText; finalFile = '#'; 
    if (!title || !serverIp || !desc_id || !finalImg) { window.showModalAlert("Form tidak lengkap!"); return; }
  } else {
    title = document.getElementById('add-title').value.trim(); version = document.getElementById('add-version').value.trim();
    finalFile = localFileBase64 || document.getElementById('add-file').value.trim();
    if (!title || !version || !desc_id || !finalImg || !finalFile) { window.showModalAlert("Form tidak lengkap!"); return; }
  }

  document.getElementById('btn-submit-item').disabled = true;
  const data = { title, category: cat, version, desc_id, url_img: finalImg, url_file: finalFile, uid: currentUser.uid, username: currentUsername, createdAt: serverTimestamp() };
  if(cat === 'Server') { data.server_ip = serverIp; data.server_port = serverPort; }

  try {
    if (isAdmin) { await push(ref(db, 'items_public'), data); window.showModalAlert("Dipublikasikan!"); } 
    else { await push(ref(db, 'items_pending'), data); window.showModalAlert("Terkirim ke antrean!"); }
    
    get(ref(db, `profiles/${currentUser.uid}/itemCount`)).then(s=>{ update(ref(db, `profiles/${currentUser.uid}`), {itemCount: (s.val()||0)+1}); });
    window.switchScreen('screen-home');
  } catch (e) { window.showModalAlert(t('error_save')); }
  document.getElementById('btn-submit-item').disabled = false;
};

// ================= ADMIN PANEL (SELEKSI & TEST) =================
function loadPendingItems() {
  if(!isAdmin) return;
  onValue(ref(db, 'items_pending'), (snapshot) => {
    const container = document.getElementById('pending-items-container'); const badgeCount = document.getElementById('pending-count');
    container.innerHTML = ''; let count = 0;
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        count++; const item = child.val();
        let testBtnHTML = item.category === 'Server' ? `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.copyText('${item.server_ip}:${item.server_port}')">Salin IP</button>` : `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.open('${item.url_file}', '_blank')">Download Test</button>`;
        container.innerHTML += `
          <div class="card-vertical" style="border-color:var(--primary); margin-bottom:20px;">
            <div class="card-body">
              <h4 class="font-bold text-main" style="margin-bottom:5px;">${item.title}</h4>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Pengirim: ${item.username} | Kat: ${item.category}</p>
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
    } else { container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">${t('no_queue')}</p>`; }
    if(badgeCount) badgeCount.innerText = count;
  });
}

window.approveItem = async (id, uid, title) => {
  const snap = await get(ref(db, `items_pending/${id}`));
  if(snap.exists()){ await set(ref(db, `items_public/${id}`), snap.val()); await remove(ref(db, `items_pending/${id}`)); await push(ref(db, `notifications/${uid}`), { type: 'accepted', title: title, time: serverTimestamp(), read: false }); window.showModalAlert("Disetujui!"); }
};
window.promptReject = (id, uid, title) => { currentRejectItem = { id, uid, title }; document.getElementById('reject-reason').value = ''; window.openDialog('dialog-reject-admin'); };
window.submitReject = async () => {
  if (!currentRejectItem) return;
  await remove(ref(db, `items_pending/${currentRejectItem.id}`));
  await push(ref(db, `notifications/${currentRejectItem.uid}`), { type: 'rejected', title: currentRejectItem.title, reason: document.getElementById('reject-reason').value.trim() || '-', time: serverTimestamp(), read: false });
  window.closeDialog('dialog-reject-admin'); window.showModalAlert("Ditolak."); currentRejectItem = null;
};
window.deletePublicItem = (id, title) => { window.showModalConfirm(`Hapus permanen: "${title}"?`, async () => { await remove(ref(db, `items_public/${id}`)); }); };

// ================= KOMENTAR & BALASAN =================
window.updateCommentCounter = (inputId, counterId) => { document.getElementById(counterId).innerText = `${document.getElementById(inputId).value.length}/200`; };

function loadComments(itemId) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">${t('loading_comments')}</p>`;
    
    onValue(ref(db, `comments/${itemId}`), async (snapshot) => {
        commentsList.innerHTML = '';
        if (!snapshot.exists()) { commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`; return; }
        
        const allComments = []; snapshot.forEach(child => { allComments.push({ id: child.key, ...child.val() }); });
        const mainComments = allComments.filter(c => !c.parentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const replies = allComments.filter(c => c.parentId);

        if (mainComments.length === 0) { commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`; return; }

        for (const comment of mainComments) {
            let avatarUrl = generateDefaultAvatar(comment.username); let roleBadge = getRoleBadge('member');
            if(globalProfilesCache[comment.uid]) { avatarUrl=globalProfilesCache[comment.uid].avatar; roleBadge=getRoleBadge(globalProfilesCache[comment.uid].role); }
            else { const pSnap = await get(ref(db, `profiles/${comment.uid}`)); if(pSnap.exists()){ globalProfilesCache[comment.uid]=pSnap.val(); avatarUrl=pSnap.val().avatar; roleBadge=getRoleBadge(pSnap.val().role); }}
            
            const commentReplies = replies.filter(r => r.parentId === comment.id).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            let repliesHTML = '';
            if (commentReplies.length > 0) {
                const replyItemsHTML = await Promise.all(commentReplies.map(async (reply) => {
                    let rAvatar = generateDefaultAvatar(reply.username); let rBadge = getRoleBadge('member');
                    if(globalProfilesCache[reply.uid]) { rAvatar=globalProfilesCache[reply.uid].avatar; rBadge=getRoleBadge(globalProfilesCache[reply.uid].role); }
                    else { const pSnap = await get(ref(db, `profiles/${reply.uid}`)); if(pSnap.exists()){ globalProfilesCache[reply.uid]=pSnap.val(); rAvatar=pSnap.val().avatar; rBadge=getRoleBadge(pSnap.val().role); }}
                    const isReplyOwner = currentUser && (currentUser.uid === reply.uid || isAdmin);
                    return `
                    <div class="reply-item">
                        <div class="comment-header" style="margin-bottom:2px;">
                            <div class="comment-author-info" onclick="window.openUserProfile('${reply.uid}')">
                                <img src="${rAvatar}" class="comment-avatar" style="width:24px; height:24px;">
                                <span class="comment-author" style="font-size:12px;">${reply.username}</span> ${rBadge}
                            </div>
                            <span class="comment-date" style="font-size:10px;">${formatDate(reply.createdAt)}</span>
                        </div>
                        <div class="reply-to-text">${t('replying_to')} @${reply.replyToUsername}</div>
                        <p class="comment-text text-selectable" id="text-${reply.id}" data-translated="false" data-original="${escapeHtml(reply.text)}" style="font-size:12px; margin-bottom:4px;">${escapeHtml(reply.text)}</p>
                        <div class="comment-actions" style="gap:10px;">
                            <button class="comment-action-btn" onclick="window.translateComment('${reply.id}')"><svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg> <span id="btn-text-${reply.id}">${t('translate')}</span></button>
                            <button class="comment-action-btn" onclick="window.showReplyBox('${comment.id}', '${reply.username}')"><svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg> ${t('reply')}</button>
                            ${isReplyOwner ? `<button class="comment-action-btn danger" onclick="window.deleteComment('${itemId}', '${reply.id}')">${t('delete')}</button>` : ''}
                        </div>
                    </div>`;
                }));
                repliesHTML = `
                <div style="margin-top:8px;">
                    <button class="comment-action-btn" onclick="document.getElementById('replies-${comment.id}').classList.toggle('hidden'); const isHid = document.getElementById('replies-${comment.id}').classList.contains('hidden'); this.innerHTML = isHid ? '<svg class=\\'icon\\' style=\\'width:12px; height:12px;\\' viewBox=\\'0 0 24 24\\'><polyline points=\\'6 9 12 15 18 9\\'/></svg> ${t('show_replies',{count:commentReplies.length})}' : '<svg class=\\'icon\\' style=\\'width:12px; height:12px;\\' viewBox=\\'0 0 24 24\\'><polyline points=\\'18 15 12 9 6 15\\'/></svg> ${t('hide_replies')}';" style="font-weight:bold; color:var(--primary);">
                        <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg> ${t('show_replies',{count:commentReplies.length})}
                    </button>
                    <div id="replies-${comment.id}" class="reply-list hidden">${replyItemsHTML.join('')}</div>
                </div>`;
            }

            const isOwner = currentUser && (currentUser.uid === comment.uid || isAdmin);
            commentsList.innerHTML += `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-author-info" onclick="window.openUserProfile('${comment.uid}')">
                        <img src="${avatarUrl}" class="comment-avatar">
                        <span class="comment-author">${comment.username}</span> ${roleBadge}
                    </div>
                    <span class="comment-date">${formatDate(comment.createdAt)}</span>
                </div>
                <p class="comment-text text-selectable" id="text-${comment.id}" data-translated="false" data-original="${escapeHtml(comment.text)}">${escapeHtml(comment.text)}</p>
                <div class="comment-actions">
                    <button class="comment-action-btn" onclick="window.translateComment('${comment.id}')"><svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg> <span id="btn-text-${comment.id}">${t('translate')}</span></button>
                    <button class="comment-action-btn" onclick="window.showReplyBox('${comment.id}', '${comment.username}')"><svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg> ${t('reply')}</button>
                    ${isOwner ? `<button class="comment-action-btn danger" onclick="window.deleteComment('${itemId}', '${comment.id}')">${t('delete')}</button>` : ''}
                </div>
                <div id="reply-box-${comment.id}" class="reply-input-area hidden">
                    <div class="reply-to-text">${t('replying_to')} @<span id="reply-target-${comment.id}">${comment.username}</span></div>
                    <textarea id="reply-text-${comment.id}" class="comment-textarea text-selectable" style="min-height:40px;" maxlength="200" oninput="window.updateCommentCounter('reply-text-${comment.id}', 'reply-counter-${comment.id}')"></textarea>
                    <div class="flex justify-between items-center">
                        <span id="reply-counter-${comment.id}" class="char-counter">0/200</span>
                        <div class="flex" style="gap:5px;">
                            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="document.getElementById('reply-box-${comment.id}').classList.add('hidden')">${t('cancel_reply')}</button>
                            <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.postReply('${itemId}', '${comment.id}')">${t('post_reply')}</button>
                        </div>
                    </div>
                </div>
                ${repliesHTML}
            </div>`;
        }
        if(autoTranslateEnabled) allComments.forEach(c => { const el = document.getElementById(`text-${c.id}`); if(el && el.dataset.translated === "false") window.translateComment(c.id, true); });
    });
}

window.showReplyBox = (mainId, user) => { if(!currentUser) { window.closeDetailAndLogin(); return; } const b = document.getElementById(`reply-box-${mainId}`); if(b){ b.classList.remove('hidden'); document.getElementById(`reply-target-${mainId}`).innerText = user; document.getElementById(`reply-text-${mainId}`).focus(); } }

window.postComment = async () => {
    if(!currentUser) return; const tEl = document.getElementById('new-comment-text'); const txt = tEl.value.trim(); if(!txt) return;
    const now = Date.now(); if(now - lastCommentTime < 30000) { window.showModalAlert(`Tunggu ${Math.ceil((30000 - (now - lastCommentTime)) / 1000)} detik.`); return; }
    try { const refC = push(ref(db, `comments/${currentDetailItemId}`)); await update(ref(db), { [`comments/${currentDetailItemId}/${refC.key}`]: { uid: currentUser.uid, username: currentUsername, text: txt, createdAt: serverTimestamp(), parentId: null } }); lastCommentTime = now; tEl.value = ''; window.updateCommentCounter('new-comment-text', 'new-comment-counter'); } catch(e) { window.showModalAlert("Error: "+e.message); }
}

window.postReply = async (itemId, mainId) => {
    if(!currentUser) return; const tEl = document.getElementById(`reply-text-${mainId}`); const txt = tEl.value.trim(); const tgt = document.getElementById(`reply-target-${mainId}`).innerText; if(!txt) return;
    const now = Date.now(); if(now - lastCommentTime < 30000) { window.showModalAlert(`Tunggu ${Math.ceil((30000 - (now - lastCommentTime)) / 1000)} detik.`); return; }
    try { const refR = push(ref(db, `comments/${itemId}`)); await update(ref(db), { [`comments/${itemId}/${refR.key}`]: { uid: currentUser.uid, username: currentUsername, text: txt, createdAt: serverTimestamp(), parentId: mainId, replyToUsername: tgt } }); lastCommentTime = now; tEl.value = ''; document.getElementById(`reply-box-${mainId}`).classList.add('hidden'); } catch(e) { window.showModalAlert("Error: "+e.message); }
}

window.deleteComment = async (itemId, commentId) => {
    window.showModalConfirm("Yakin menghapus komentar ini beserta balasannya?", async () => {
        try { const snap = await get(ref(db, `comments/${itemId}`)); const updates = {}; updates[`comments/${itemId}/${commentId}`] = null; if(snap.exists()) { snap.forEach(c => { if(c.val().parentId === commentId) updates[`comments/${itemId}/${c.key}`] = null; }); } await update(ref(db), updates); } catch(e) { window.showModalAlert("Gagal."); }
    });
}

function escapeHtml(u) { return (u||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

window.translateDesc = async () => {
    const el = document.getElementById('detail-desc'); const bEl = document.getElementById('text-translate-desc'); const isT = el.dataset.translated === "true"; const orig = el.dataset.originalText;
    if(isT) { el.innerText = orig; el.dataset.translated = "false"; bEl.innerText = t('translate'); } 
    else {
        bEl.innerText = "..."; document.getElementById('btn-translate-desc').disabled = true;
        try { const tgt = currentLang === 'id' ? 'id' : 'en'; const res = await translateText(orig, tgt); if(res === "ALREADY_SAME"){ window.showModalAlert(t('already_in_lang')); bEl.innerText = t('translate'); } else { el.innerText = res; el.dataset.translated = "true"; bEl.innerText = t('show_original'); } } catch(e) { window.showModalAlert("Gagal"); bEl.innerText = t('translate'); }
        setTimeout(() => { document.getElementById('btn-translate-desc').disabled = false; }, 2000);
    }
}

window.translateComment = async (id, isAuto = false) => {
    const el = document.getElementById(`text-${id}`); const bEl = document.getElementById(`btn-text-${id}`); if(!el || !bEl) return;
    const isT = el.dataset.translated === "true"; const orig = el.dataset.original;
    if(isT && !isAuto) { el.innerText = orig; el.dataset.translated = "false"; bEl.innerText = t('translate'); } 
    else if(!isT) {
        if(!isAuto) bEl.innerText = "...";
        try { const res = await translateText(orig, currentLang === 'id' ? 'id' : 'en'); if(res === "ALREADY_SAME"){ if(!isAuto){ window.showModalAlert(t('already_in_lang')); bEl.innerText = t('translate'); } } else { el.innerText = res; el.dataset.translated = "true"; bEl.innerText = t('show_original'); } } catch(e) { if(!isAuto) bEl.innerText = t('translate'); }
    }
}
