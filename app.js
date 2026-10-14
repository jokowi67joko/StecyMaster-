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

let localImageBase64 = null;
let localFileBase64 = null;

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

// ================= UI SWITCHER & SIDEBAR =================
window.switchScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
};

window.toggleSidebar = () => {
  document.getElementById('side-drawer').classList.toggle('active');
  document.getElementById('drawer-overlay').classList.toggle('active');
};

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
  const errorMsg = document.getElementById('login-error');
  const btn = document.getElementById('auth-submit-btn');
  
  errorMsg.innerText = '';
  if (!email || !password) { errorMsg.innerText = 'Email dan Password wajib diisi.'; return; }

  btn.disabled = true;
  btn.innerText = "Memproses...";
  try {
    if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    errorMsg.innerText = "Gagal: " + error.message;
    btn.disabled = false;
    btn.innerText = isSignUpMode ? "Daftar Sekarang" : "Masuk";
  }
};

window.loginGoogle = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
  catch (error) { document.getElementById('login-error').innerText = "Pastikan domain 'ecymaster.vercel.app' sudah di-Whitelist di Firebase Authorized Domains!"; }
};

window.customLogout = () => {
  if (document.getElementById('side-drawer').classList.contains('active')) {
     window.toggleSidebar();
  }
  window.showModalConfirm("Yakin ingin keluar dari akun?", () => {
    signOut(auth).then(() => {
      isAdmin = false;
      currentUser = null;
      window.switchScreen('screen-login');
    });
  });
};

// ================= PENGUNCIAN SESI & CEK LOGIN =================
// 1. Terapkan persistence (Sesi di-save di Local Storage)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // 2. Jika sukses, pantau status login user.
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        
        if (snap.exists() && snap.val().username) {
           document.getElementById('profile-name').innerText = snap.val().username;
           document.getElementById('sidebar-name').innerText = snap.val().username;
           const dp = snap.val().photoURL || user.photoURL || 'https://via.placeholder.com/150';
           document.getElementById('profile-img').src = dp;
           document.getElementById('sidebar-profile-img').src = dp;
           checkAdminStatus();
        } else {
           window.switchScreen('screen-username');
        }
      } else {
        // Jika belum login, buka menu login
        window.switchScreen('screen-login');
      }
    });
  })
  .catch((error) => {
    window.switchScreen('screen-login');
  });

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { document.getElementById('username-error').innerText = "Format salah (3-16 huruf/angka/_)"; return; }
  try {
    const unSnap = await get(ref(db, `usernames/${username}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { document.getElementById('username-error').innerText = "Username dipakai! Pilih lain."; return; }
    await set(ref(db, `usernames/${username}`), currentUser.uid);
    await set(ref(db, `users/${currentUser.uid}/username`), username);
    document.getElementById('profile-name').innerText = username;
    document.getElementById('sidebar-name').innerText = username;
    checkAdminStatus();
  } catch (e) { document.getElementById('username-error').innerText = "Gagal menyimpan."; }
};

function checkAdminStatus() {
  onValue(ref(db, `admins/${currentUser.uid}`), (snap) => {
    isAdmin = (snap.exists() && snap.val() === true);
    if (isAdmin) {
      const badgeHTML = '<span style="background:var(--primary); color:black; padding:4px 12px; border-radius:12px; font-size:11px; font-weight:bold; display:inline-block;">Admin Utama</span>';
      document.getElementById('profile-role-badge').innerHTML = badgeHTML;
      document.getElementById('sidebar-role').innerHTML = badgeHTML;
      document.getElementById('btn-open-admin').classList.remove('hidden');
      loadPendingItems();
    } else {
      const badgeHTML = '<span style="background:var(--bg-elevated); color:white; border:1px solid #555; padding:4px 12px; border-radius:12px; font-size:11px; display:inline-block;">Member</span>';
      document.getElementById('profile-role-badge').innerHTML = badgeHTML;
      document.getElementById('sidebar-role').innerHTML = badgeHTML;
      document.getElementById('btn-open-admin').classList.add('hidden');
    }
  });
  window.switchScreen('screen-home');
  fetchAllItemsAndRender();
}

// ================= UPLOAD FOTO PROFIL =================
window.handleProfileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const size1MB = 1024 * 1024;
  const size5MB = 5 * 1024 * 1024;

  if (file.size < size1MB || file.size > size5MB) {
    window.showModalAlert("Gagal: Ukuran foto profil harus di antara 1 MB hingga 5 MB!");
    event.target.value = ''; 
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 256, 256);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      
      updateProfile(currentUser, { photoURL: base64Image }).then(() => {
        document.getElementById('profile-img').src = base64Image;
        document.getElementById('sidebar-profile-img').src = base64Image;
        set(ref(db, `users/${currentUser.uid}/photoURL`), base64Image);
        window.showModalAlert("Foto profil berhasil diperbarui!");
      }).catch(err => window.showModalAlert("Gagal menyimpan foto."));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// ================= FILTER & DYNAMIC LAYOUT =================
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

function renderItemsToUI() {
  const container = document.getElementById('public-items-container');
  container.innerHTML = '';
  
  let displayItems = globalAllItems;
  if (currentCategoryFilter !== 'Semua') {
    displayItems = globalAllItems.filter(item => item.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }

  if (displayItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:20px;">Item di kategori ini belum tersedia.</p>';
    return;
  }

  const isSpecific = currentCategoryFilter !== 'Semua';
  const cardClass = isSpecific ? 'card-vertical' : 'card-horizontal';

  displayItems.forEach(item => {
    const btnAdmin = (isAdmin && item.source === 'firebase') ? `<button class="btn btn-secondary" style="border:1px solid red; color:red; flex:none; padding:8px;" onclick="window.deletePublicItem('${item.id}', '${item.title}')">Hapus</button>` : '';
    const badgeType = item.source === 'github' ? `<div class="badge-github">Via GitHub</div>` : '';

    container.innerHTML += `
      <div class="${cardClass}" style="margin-bottom:15px;">
        ${badgeType}
        <img src="${item.url_img}" class="card-img" onerror="this.src='https://via.placeholder.com/300'">
        <div class="card-body">
          <h3 class="font-bold" style="font-size:16px; margin-bottom:6px;">${item.title}</h3>
          <div class="card-meta">${item.category} ${item.version ? '• '+item.version : ''}</div>
          <p class="card-desc">${item.desc_id || item.desc || ''}</p>
          <div class="flex" style="gap:10px;">
            <a href="${item.url_file}" target="_blank" class="btn btn-primary" style="flex:1; text-align:center; padding:10px; text-decoration:none;">Download</a>
            ${btnAdmin}
          </div>
        </div>
      </div>`;
  });
}

// ================= HANDLER UPLOAD FILE LOKAL =================
window.handleLocalImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1 * 1024 * 1024) { window.showModalAlert("Max 1MB untuk gambar preview."); e.target.value = ''; return; }
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

// ================= KIRIM & SELEKSI =================
window.submitItem = async () => {
  if (!currentUser) return;
  
  const title = document.getElementById('add-title').value.trim();
  const cat = document.getElementById('add-cat').value;
  const version = document.getElementById('add-version').value.trim();
  const desc_id = document.getElementById('add-desc').value.trim();
  
  const finalImg = localImageBase64 || document.getElementById('add-img').value.trim();
  const finalFile = localFileBase64 || document.getElementById('add-file').value.trim();

  if (!title || !version || !desc_id || !finalImg || !finalFile) { 
    window.showModalAlert("Gagal: Semua field wajib diisi! Pastikan Anda sudah memberikan URL atau memilih File untuk Gambar dan Download."); 
    return; 
  }

  if (!finalImg.startsWith('data:') && !finalImg.startsWith('http')) {
     window.showModalAlert("Gagal: Format URL Gambar tidak valid (harus diawali http/https)."); return;
  }
  if (!finalFile.startsWith('data:') && !finalFile.startsWith('http')) {
     window.showModalAlert("Gagal: Format URL File Download tidak valid."); return;
  }

  const btnSubmit = document.getElementById('btn-submit-item');
  btnSubmit.disabled = true;
  btnSubmit.innerText = "Mengunggah... (Jangan tutup jendela ini)";

  const data = {
    title: title, category: cat, version: version, desc_id: desc_id,
    url_img: finalImg, url_file: finalFile,
    uid: currentUser.uid, username: document.getElementById('sidebar-name').innerText,
    createdAt: serverTimestamp()
  };

  try {
    if (isAdmin) {
      await push(ref(db, 'items_public'), data);
      window.showModalAlert("Berhasil! Telah dipublikasikan langsung oleh Admin!");
    } else {
      await push(ref(db, 'items_pending'), data);
      window.showModalAlert("Berhasil dikirim! Item Anda sedang direview oleh tim kami.");
    }
    
    document.getElementById('add-title').value = ''; document.getElementById('add-version').value = '';
    document.getElementById('add-desc').value = ''; document.getElementById('add-img').value = '';
    document.getElementById('add-file').value = ''; document.getElementById('file-img').value = '';
    document.getElementById('file-doc').value = ''; document.getElementById('img-status').innerText = '';
    document.getElementById('file-status').innerText = '';
    localImageBase64 = null; localFileBase64 = null;
    
    btnSubmit.disabled = false; btnSubmit.innerText = "Upload Sekarang";
    window.switchScreen('screen-home');
  } catch (e) { 
    window.showModalAlert("Gagal mengirim data. Payload mungkin terlalu besar (Max Firebase RTDB 10MB per request)."); 
    btnSubmit.disabled = false; btnSubmit.innerText = "Upload Sekarang";
  }
};

// ================= ADMIN PANEL =================
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
        container.innerHTML += `
          <div class="card-vertical" style="border-color:var(--primary); margin-bottom:15px; display:block;">
            <div class="card-body">
              <h4 class="font-bold text-main" style="margin-bottom:5px;">${item.title}</h4>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Kategori: ${item.category} <br> Pengirim: ${item.username}</p>
              <div class="flex" style="gap:10px;">
                <button class="btn" style="background:#28a745; color:white; flex:1;" onclick="window.approveItem('${child.key}')">Terima</button>
                <button class="btn btn-danger" style="flex:1;" onclick="window.rejectItem('${child.key}')">Tolak</button>
              </div>
            </div>
          </div>`;
      });
    } else {
      container.innerHTML = '<p style="color: var(--text-muted); text-align:center;">Tidak ada antrean.</p>';
    }
    if(badgeCount) badgeCount.innerText = count;
  });
}

window.approveItem = async (id) => {
  const snap = await get(ref(db, `items_pending/${id}`));
  if(snap.exists()){
     await set(ref(db, `items_public/${id}`), snap.val());
     await remove(ref(db, `items_pending/${id}`));
     window.showModalAlert("Item disetujui dan dipublikasikan!");
  }
};

window.rejectItem = (id) => {
  window.showModalConfirm("Tolak dan hapus kiriman item ini?", async () => {
    await remove(ref(db, `items_pending/${id}`));
  });
};

window.deletePublicItem = (id, title) => {
  window.showModalConfirm(`Hapus secara permanen item: "${title}" dari aplikasi?`, async () => {
    await remove(ref(db, `items_public/${id}`));
  });
};
