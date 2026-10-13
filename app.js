// ==========================================
// 1. DATA BAWAAN (HARDCODED) DARI WEB LAMA
// ==========================================
const dataLama = [
    {
        title: "Dynamic Lights PE",
        category: "mod",
        version: "0.14.3 - 0.15.10",
        image: "https://files.catbox.moe/09jgnr.webp",
        file: "https://files.catbox.moe/1a6t9e.js"
    },
    {
        title: "ZombieMutans mod",
        category: "mod",
        version: "0.14.3 - 0.15.10",
        image: "https://files.catbox.moe/hnxwuc.png",
        file: "https://files.catbox.moe/zl3fru.zip"
    },
    {
        title: "BareBones Texture",
        category: "texture",
        version: "0.15.10",
        image: "https://files.catbox.moe/2w0ta0.png",
        file: "https://files.catbox.moe/94n3na.zip"
    }
];

// ==========================================
// 2. KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBccm1pwtgsJp8AMnEeDCinoKf_304ymUY",
    authDomain: "stecy-1e3b1.firebaseapp.com",
    databaseURL: "https://stecy-1e3b1-default-rtdb.firebaseio.com",
    projectId: "stecy-1e3b1",
    storageBucket: "stecy-1e3b1.firebasestorage.app",
    messagingSenderId: "620748708577",
    appId: "1:620748708577:web:eb47be8734c5c618b375a0"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let isUserAdmin = false;
let currentTab = 'Semua';
let isLoginMode = true; // Mode UI Login/Register

// Set Persistence agar login tersimpan
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => console.error("Error set persistence:", error));

// ==========================================
// 3. LOGIKA FORM LOGIN MODERN
// ==========================================
function bukaLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }
function tutupLoginModal() { document.getElementById('loginModal').style.display = 'none'; }

function toggleLoginMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('loginTitleText');
    const subtitle = document.getElementById('loginSubtitleText');
    const btnSubmit = document.getElementById('btnSubmitAuth');
    
    if (isLoginMode) {
        title.innerHTML = "Welcome Back<br>to StecyMaster";
        subtitle.innerHTML = 'New to StecyMaster? <span onclick="toggleLoginMode()">Sign up</span>';
        btnSubmit.innerText = "Log in";
    } else {
        title.innerHTML = "Create an<br>account";
        subtitle.innerHTML = 'Already have an account? <span onclick="toggleLoginMode()">Log in</span>';
        btnSubmit.innerText = "Continue";
    }
}

function prosesEmailAuth() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if(!email || !password) return alert("Email dan Password wajib diisi!");

    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => { tutupLoginModal(); })
            .catch((error) => alert("Gagal Login: " + error.message));
    } else {
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => { alert("Akun berhasil dibuat!"); tutupLoginModal(); })
            .catch((error) => alert("Gagal Daftar: " + error.message));
    }
}

function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => { tutupLoginModal(); })
        .catch((error) => {
            console.error(error);
            alert("Login Google Gagal: " + error.message);
        });
}

function logout() {
    if(confirm("Yakin ingin logout?")) {
        auth.signOut().then(() => { window.location.reload(); });
    }
}

// ==========================================
// 4. DETEKSI LOGIN & UPDATE UI
// ==========================================
auth.onAuthStateChanged((user) => {
    const floatingBtn = document.getElementById('floatingBtn');
    const btnOpenLogin = document.getElementById('btnOpenLogin');
    const userProfilePic = document.getElementById('userProfilePic');

    if (user) {
        currentUser = user;
        if (btnOpenLogin) btnOpenLogin.style.display = 'none';
        if (userProfilePic) {
            userProfilePic.style.display = 'block';
            userProfilePic.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + (user.displayName || user.email) + '&background=ff9800&color=000';
            userProfilePic.title = `Halo, ${user.displayName || user.email} (Klik untuk Logout)`;
        }
        if (floatingBtn) floatingBtn.style.display = 'flex';
        
        db.ref('admins/' + user.uid).once('value').then((snapshot) => {
            isUserAdmin = (snapshot.exists() && snapshot.val() === true);
            if (document.getElementById('feedContainer')) loadPublicItems();
        });
    } else {
        currentUser = null;
        if (btnOpenLogin) btnOpenLogin.style.display = 'block';
        if (userProfilePic) userProfilePic.style.display = 'none';
        if (floatingBtn) floatingBtn.style.display = 'none';
        if (document.getElementById('feedContainer')) loadPublicItems();
    }
});

// ==========================================
// 5. FUNGSI HALAMAN BERANDA (GABUNGAN DATA)
// ==========================================
function loadPublicItems() {
    db.ref('public_items').on('value', (snapshot) => {
        const container = document.getElementById('feedContainer');
        if(!container) return;
        
        container.innerHTML = ''; 

        dataLama.forEach((item, index) => {
            if (currentTab === 'Semua' || item.category.toLowerCase() === currentTab.toLowerCase()) {
                container.innerHTML += renderItemHTML({
                    judul: item.title,
                    kategori: item.category,
                    versi: item.version,
                    urlGambar: item.image,
                    urlFile: item.file
                }, false, 'hardcoded_' + index);
            }
        });

        if (snapshot.exists()) {
            const dataFb = snapshot.val();
            Object.keys(dataFb).forEach(key => {
                const itemFb = dataFb[key];
                if (currentTab === 'Semua' || itemFb.kategori.toLowerCase() === currentTab.toLowerCase()) {
                    container.innerHTML += renderItemHTML(itemFb, false, key);
                }
            });
        }
        
        if (container.innerHTML === '') {
            container.innerHTML = '<p style="text-align:center; color:#888;">Belum ada item di kategori ini.</p>';
        }
    });
}

function filterKategori(kat) {
    currentTab = kat;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    loadPublicItems();
}

// ==========================================
// 6. FUNGSI UPLOAD FORM
// ==========================================
function bukaModal() { 
    const modal = document.getElementById('modalUpload');
    if(modal) modal.style.display = 'flex'; 
}

function tutupModal() { 
    const modal = document.getElementById('modalUpload');
    if(modal) modal.style.display = 'none'; 
}

function kirimItem() {
    if (!currentUser) return alert("Silakan login dahulu!");
    
    const dataItem = {
        judul: document.getElementById('judulItem').value,
        kategori: document.getElementById('kategoriItem').value,
        versi: document.getElementById('versiMcpe').value,
        deskripsi: document.getElementById('deskripsiItem').value,
        urlGambar: document.getElementById('urlGambar').value,
        urlFile: document.getElementById('urlFile').value,
        pengirimUID: currentUser.uid,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    if (!dataItem.judul || !dataItem.urlFile) return alert("Judul dan URL File wajib diisi!");

    const path = isUserAdmin ? 'public_items' : 'pending_items';
    
    db.ref(path).push(dataItem).then(() => {
        alert(isUserAdmin ? "Item dipublikasikan!" : "Terkirim! Menunggu ACC Admin.");
        tutupModal();
        document.getElementById('judulItem').value = '';
        document.getElementById('versiMcpe').value = '';
        document.getElementById('deskripsiItem').value = '';
        document.getElementById('urlGambar').value = '';
        document.getElementById('urlFile').value = '';
    }).catch(e => console.error(e));
}

// ==========================================
// 7. HELPER HTML & ADMIN ACTIONS
// ==========================================
function renderItemHTML(item, isAdminView, key) {
    let actionButtons = isAdminView 
        ? `<button class="btn-orange" onclick="terimaItem('${key}')">Setujui</button>
           <button class="btn-red" onclick="tolakItem('${key}')">Tolak</button>`
        : `<button class="btn-orange" onclick="window.open('${item.urlFile}', '_blank')">Download</button>
           <button class="btn-dark">Detail</button>`;

    return `
    <div class="list-item">
        <img src="${item.urlGambar || 'https://via.placeholder.com/80'}" alt="Thumb">
        <div class="list-info">
            <h3>${item.judul}</h3>
            <p>${(item.kategori || 'ALL').toUpperCase()} • MCPE ${item.versi || "0.15.10"}</p>
            <div class="list-actions">${actionButtons}</div>
        </div>
    </div>`;
}

function terimaItem(key) {
    db.ref('pending_items/' + key).once('value').then(snap => {
        const data = snap.val();
        db.ref('public_items').push(data).then(() => { db.ref('pending_items/' + key).remove(); });
    });
}
function tolakItem(key) {
    if(confirm("Yakin ingin menolak item ini?")) db.ref('pending_items/' + key).remove();
}
