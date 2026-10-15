// File: app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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

let currentUser = null;
let isAdmin = false;
let isSignUpMode = false;
let globalAllItems = [];
let currentCategoryFilter = 'Semua';
let currentSearchQuery = '';

let localImageBase64 = null;
let localFileBase64 = null;
let currentRejectItem = null;

// ================= CUSTOM MODALS =================
window.showModalAlert = (msg) => {
  document.getElementById('modal-title').innerText = "Informasi";
  document.getElementById('modal-msg').innerText = msg;
  document.getElementById('modal-actions').innerHTML = `<button class="btn btn-primary" onclick="document.getElementById('custom-modal').classList.remove('active')">Oke</button>`;
  document.getElementById('custom-modal').classList.add('active');
};

window.showModalConfirm = (msg, onConfirmCallback) => {
  document.getElementById('modal-title').innerText = "Konfirmasi";
  document.getElementById('modal-msg').innerText = msg;
  document.getElementById('modal-actions').innerHTML = `
    <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('custom-modal').classList.remove('active')">Batal</button>
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
};

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
  document.getElementById('auth-title-text').innerText = isSignUpMode ? "Daftar Akun Baru" : "Masuk ke Akun";
  document.getElementById('auth-subtitle-text').innerText = isSignUpMode ? "Sudah punya akun?" : "Belum punya akun?";
  document.getElementById('auth-switch-text').innerText = isSignUpMode ? "Masuk di sini" : "Daftar di sini";
  document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Daftar Sekarang" : "Masuk";
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
    btn.disabled = false; btn.innerText = isSignUpMode ? "Daftar Sekarang" : "Masuk";
  }
};

window.loginGoogle = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e){}
};

window.customLogout = () => {
  window.closeAllDrawers();
  window.showModalConfirm("Yakin ingin keluar dari akun?", () => {
    signOut(auth).then(() => { isAdmin = false; currentUser = null; window.switchScreen('screen-login'); });
  });
};

// ================= PENGUNCIAN SESI =================
setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists() && snap.val().username) {
         document.getElementById('profile-name').innerText = snap.val().username;
         document.getElementById('sidebar-name').innerText = snap.val().username;
         const dp = snap.val().photoURL || user.photoURL || 'https://via.placeholder.com/150';
         document.getElementById('profile-img').src = dp;
         document.getElementById('sidebar-profile-img').src = dp;
         checkAdminStatus();
         listenNotifications();
      } else {
         window.switchScreen('screen-username');
      }
    } else {
      window.switchScreen('screen-login');
    }
  });
}).catch(() => { window.switchScreen('screen-login'); });

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { document.getElementById('username-error').innerText = "Format salah (3-16 char)"; return; }
  try {
    const unSnap = await get(ref(db, `usernames/${username}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { document.getElementById('username-error').innerText = "Username terpakai!"; return; }
    await set(ref(db, `usernames/${username}`), currentUser.uid);
    await set(ref(db, `users/${currentUser.uid}/username`), username);
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
  onValue(ref(db, `notifications/${currentUser.uid}`), (snapshot) => {
    const notifContainer = document.getElementById('notif-container');
    const badge = document.getElementById('notif-badge');
    notifContainer.innerHTML = '';
    let unreadCount = 0;

    if (!snapshot.exists()) {
      notifContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:20px;">Belum ada notifikasi.</p>';
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
  await set(ref(db, `notifications/${currentUser.uid}/${notifId}/read`), true);
};

// ================= UPLOAD FOTO PROFIL =================
window.handleProfileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    window.showModalAlert("Gagal: Ukuran foto profil maksimal 10 MB!");
    event.target.value = ''; return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      const targetSize = Math.min(size, 800); 
      
      canvas.width = targetSize; canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.8); 
      
      updateProfile(currentUser, { photoURL: base64Image }).then(() => {
        document.getElementById('profile-img').src = base64Image;
        document.getElementById('sidebar-profile-img').src = base64Image;
        set(ref(db, `users/${currentUser.uid}/photoURL`), base64Image);
        window.showModalAlert("Foto profil berhasil dikompresi dan diperbarui!");
      }).catch(err => window.showModalAlert("Gagal menyimpan foto."));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
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

  // Pisahkan Host dan Port (default port PMMP adalah 19132)
  const [host, portRaw] = target.split(':');
  const port = portRaw || '19132';

  // Memanggil API Vercel Serverless internal milik StecyMaster
  fetch(`/api/server?host=${host}&port=${port}`)
    .then(res => res.json())
    .then(data => {
      if (data.online) {
         // Server benar-benar ONLINE
         el.innerHTML = `
           <span class="status-indicator status-online"></span> 
           <span class="text-success" style="margin-right:5px; font-weight:bold;">Online</span> 
           <span style="color:var(--text-muted);">|</span> 
           <b style="margin-left:5px; color:var(--text-main);">${data.players.online}/${data.players.max}</b> 
           <span style="color:var(--text-muted); font-weight:normal; margin-left:4px;">Players</span>`; 
      } else {
         // Membedakan antara server offline dengan koneksi timeout/jaringan
         if (data.error === 'Timeout') {
            el.innerHTML = `<span class="status-indicator" style="background:#555;"></span> <span style="color:#aaa; margin-right:5px; font-weight:bold;">Tidak Merespons</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Timeout / Sedang RTO)</span>`;
         } else {
            el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Offline</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Server Mati)</span>`;
         }
      }
    })
    .catch(() => {
      // Jika API Vercel StecyMaster sendiri yang down/error
      el.innerHTML = `<span class="status-indicator status-offline"></span> <span class="text-danger" style="margin-right:5px; font-weight:bold;">Error</span> <span style="color:#777; font-weight:normal; font-size:11px;">(Gagal memanggil API Internal)</span>`;
    });
}

// Auto-Refresh Status Server setiap 30 detik (Interval aman tanpa spam)
setInterval(() => {
  if (!document.getElementById('screen-home').classList.contains('hidden')) {
      if (currentCategoryFilter === 'Semua' || currentCategoryFilter === 'Server') {
          const serverElements = document.querySelectorAll('.server-status');
          serverElements.forEach(el => {
              const target = el.getAttribute('data-target');
              const id = el.id.replace('status-', '');
              // Fetch ulang untuk update UI, data akan pakai cache 15 detik jika terlalu cepat
              if (target) fetchServerStatus(id, target);
          });
      }
  }
}, 30000);


// Auto-Refresh Status Server setiap 60 detik
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
}, 60000);

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

    let btnAdmin = (isAdmin && item.source === 'firebase') ? `<button class="btn btn-secondary" style="border:1px solid red; color:red; flex:none; padding:8px;" onclick="window.deletePublicItem('${item.id}', '${item.title}')">Hapus</button>` : '';
    
    let actionBtnHTML = '';
    let serverStatusHTML = '';

    if (item.category.toLowerCase() === 'server') {
      const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version; 
      serverStatusHTML = `<div id="status-${item.id}" class="server-status" data-target="${ipTarget}"><span class="loader-inline"></span><span style="color:var(--text-muted); margin-left:8px; font-weight:normal;">Mengecek server...</span></div>`;
      actionBtnHTML = `<button class="btn btn-secondary" style="flex:1; border-color:var(--primary); color:var(--primary);" onclick="window.copyText('${ipTarget}')">Salin IP Server</button>`;
      fetchServerStatus(item.id, ipTarget);
    } else {
      actionBtnHTML = `<a href="${item.url_file}" target="_blank" class="btn btn-primary" style="flex:1; text-align:center; padding:10px; text-decoration:none;">Download</a>`;
    }

    container.innerHTML += `
      <div class="${cardClass}" style="margin-bottom:15px;">
        <img src="${item.url_img}" class="card-img" onerror="this.src='https://via.placeholder.com/300'">
        <div class="card-body">
          <h3 class="font-bold" style="font-size:16px; margin-bottom:4px;">${item.title}</h3>
          
          <div style="font-size:11px; margin-bottom:8px; color:var(--text-muted);">
             Oleh: <span class="text-main">${item.username || 'StecyMaster'}</span> ${userRoleBadge}
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
    uid: currentUser.uid, username: document.getElementById('sidebar-name').innerText,
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
