// File: app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Import data statis dari GitHub
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
setPersistence(auth, browserLocalPersistence);

let currentUser = null;
let isAdmin = false;
let isSignUpMode = false;

// UI SWITCHER
window.switchScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
};

// ================= AUTHENTICATION FLOW =================
window.toggleAuthMode = () => {
  isSignUpMode = !isSignUpMode;
  document.getElementById('auth-title-text').innerHTML = isSignUpMode ? "Create Account" : "Welcome Back";
  document.getElementById('auth-subtitle-text').innerHTML = isSignUpMode ? "Already have an account?" : "New to StecyMaster?";
  document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Log In";
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
  btn.innerText = "Loading...";
  try {
    if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    errorMsg.innerText = "Gagal: " + error.message;
    btn.disabled = false;
    btn.innerText = isSignUpMode ? "Sign Up" : "Log In";
  }
};

window.loginGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); } 
  catch (error) { document.getElementById('login-error').innerText = error.message; }
};

window.confirmLogout = () => {
  signOut(auth).then(() => {
    isAdmin = false;
    currentUser = null;
    window.switchScreen('screen-login');
  });
};

// ================= CEK USERNAME & ADMIN =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Set profil foto (jika ada dari google)
    const profImg = document.getElementById('profile-img');
    if(profImg) profImg.src = user.photoURL || 'https://via.placeholder.com/80';
    
    const userRef = ref(db, `users/${user.uid}`);
    const snap = await get(userRef);
    
    if (snap.exists() && snap.val().username) {
       document.getElementById('profile-name').innerText = snap.val().username;
       checkAdminStatus();
    } else {
       window.switchScreen('screen-username');
       if (user.email === 'hamdisyarud@gmail.com') {
         document.getElementById('panel-admin-setup').classList.remove('hidden');
         document.getElementById('admin-uid-copy').value = user.uid;
       }
    }
  } else {
    window.switchScreen('screen-login');
  }
});

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim();
  const errEl = document.getElementById('username-error');
  const btnSave = document.getElementById('btn-save-username');
  
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { errEl.innerText = "Format salah (3-16 huruf/angka/_)"; return; }
  
  btnSave.disabled = true;
  btnSave.innerText = "Menyimpan...";
  try {
    const unSnap = await get(ref(db, `usernames/${username}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) {
       errEl.innerText = "Username sudah dipakai! Pilih yang lain."; 
       btnSave.disabled = false; btnSave.innerText = "Simpan Username"; return;
    }
    await set(ref(db, `usernames/${username}`), currentUser.uid);
    await set(ref(db, `users/${currentUser.uid}/username`), username);
    
    document.getElementById('profile-name').innerText = username;
    checkAdminStatus();
  } catch (e) {
    errEl.innerText = "Gagal menyimpan."; btnSave.disabled = false; btnSave.innerText = "Simpan Username";
  }
};

window.copyAdminUID = () => {
  const uidInput = document.getElementById('admin-uid-copy');
  uidInput.select(); document.execCommand('copy'); alert("UID disalin!");
};

function checkAdminStatus() {
  onValue(ref(db, `admins/${currentUser.uid}`), (snap) => {
    isAdmin = (snap.exists() && snap.val() === true);
    if (isAdmin) {
      document.getElementById('profile-role').innerHTML = '<span class="role-badge" style="background:var(--primary); color:black; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; display:inline-block; margin-top:8px;">Admin Utama</span>';
      document.getElementById('btn-open-admin').classList.remove('hidden');
      loadPendingItems();
    } else {
      document.getElementById('profile-role').innerHTML = '<span class="role-badge" style="background:var(--bg-elevated); color:white; padding:4px 10px; border-radius:12px; font-size:12px; display:inline-block; margin-top:8px;">Member</span>';
      document.getElementById('btn-open-admin').classList.add('hidden');
    }
  });
  
  window.switchScreen('screen-home');
  loadPublicItems();
}

// ================= LOAD DATA BERANDA (GABUNGAN FB + GITHUB) =================
function loadPublicItems() {
  onValue(ref(db, 'items_public'), (snapshot) => {
    const container = document.getElementById('public-items-container');
    container.innerHTML = '';
    
    let dynamicItems = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => { dynamicItems.push({ id: child.key, source: 'firebase', ...child.val() }); });
      dynamicItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    // GABUNGKAN DATA
    const allItems = [...staticItems, ...dynamicItems];

    if (allItems.length === 0) {
      container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Belum ada item yang dipublikasikan.</p>';
      return;
    }

    allItems.forEach(item => {
       const btnAdmin = (isAdmin && item.source === 'firebase') ? `<button class="btn" style="background:var(--bg-elevated); border:1px solid red; color:red; padding:6px; flex:1;" onclick="window.deletePublicItem('${item.id}', '${item.title}')">Hapus</button>` : '';
       const badgeType = item.source === 'github' ? `<div style="position:absolute; top:10px; left:10px; background:#333; color:white; font-size:10px; padding:3px 6px; border-radius:4px; border:1px solid #555;">Via Update Web</div>` : '';

       let html = `
        <div class="card" style="margin-bottom:15px;">
          ${badgeType}
          <img src="${item.url_img}" class="card-img" style="width:120px;" onerror="this.src='https://via.placeholder.com/120'">
          <div class="card-body">
            <h3 class="font-bold" style="font-size:16px; margin-bottom:4px;">${item.title}</h3>
            <div style="font-size:11px; color:var(--primary); background:rgba(255, 140, 0, 0.1); padding:2px 6px; border-radius:4px; display:inline-block; font-weight:bold; margin-bottom:8px;">${item.category} ${item.version ? '• '+item.version : ''}</div>
            <p style="font-size:13px; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:10px;">${item.desc_id || item.desc || ''}</p>
            <div class="flex" style="gap:8px;">
              <a href="${item.url_file}" target="_blank" class="btn btn-primary" style="flex:2; text-align:center; padding:6px; text-decoration:none;">Download</a>
              ${btnAdmin}
            </div>
          </div>
        </div>`;
       container.innerHTML += html;
    });
  });
}

// ================= KIRIM & SELEKSI ITEM =================
window.submitItem = async () => {
  if (!currentUser) return;
  const title = document.getElementById('add-title').value;
  const cat = document.getElementById('add-cat').value;
  const version = document.getElementById('add-version').value;
  const desc_id = document.getElementById('add-desc').value;
  const img = document.getElementById('add-img').value;
  const file = document.getElementById('add-file').value;

  if (!title || !img || !file) { alert("Judul, Gambar, dan File wajib diisi!"); return; }

  const data = {
    title: title, category: cat, version: version, desc_id: desc_id,
    url_img: img, url_file: file,
    uid: currentUser.uid, username: document.getElementById('profile-name').innerText,
    createdAt: serverTimestamp()
  };

  try {
    if (isAdmin) {
      await push(ref(db, 'items_public'), data);
      alert("Dipublikasikan langsung oleh Admin!");
    } else {
      await push(ref(db, 'items_pending'), data);
      alert("Item Anda sedang direview oleh admin.");
    }
    // Bersihkan form
    document.getElementById('add-title').value = ''; document.getElementById('add-desc').value = ''; document.getElementById('add-img').value = ''; document.getElementById('add-file').value = '';
    window.switchScreen('screen-home');
  } catch (e) { alert("Gagal mengirim."); }
};

// LOAD ITEM PENDING (KHUSUS ADMIN)
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
          <div class="card" style="border: 1px solid var(--primary); margin-bottom:15px; padding:15px; display:block;">
            <h4 class="font-bold">${item.title}</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Kategori: ${item.category} | Pengirim: ${item.username}</p>
            <div class="flex" style="gap:10px;">
              <button class="btn" style="background:#28a745; color:white;" onclick="window.approveItem('${child.key}')">Terima</button>
              <button class="btn" style="background:var(--danger); color:white;" onclick="window.rejectItem('${child.key}')">Tolak</button>
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
  }
};

window.rejectItem = async (id) => {
  if (confirm("Tolak item ini?")) await remove(ref(db, `items_pending/${id}`));
};

window.deletePublicItem = async (id, title) => {
  if(confirm(`Hapus Item Publik: "${title}"?`)) {
    await remove(ref(db, `items_public/${id}`));
  }
};
