// ===== Konfigurasi game =====
const TOTAL_SOAL = 10;          // jumlah soal dibatasi 10
const POIN_PER_SOAL = 10;       // 10 soal x 10 poin = skor maksimal 100
const DWELL_MS = 1000;          // menahan telunjuk di tombol (Mulai / Main Lagi)
const PINCH_GRAB = 0.30;        // rasio jarak jempol-telunjuk / ukuran telapak -> mulai mencubit
const PINCH_RELEASE = 0.50;     // di atas ini dianggap lepas (hysteresis agar stabil)

// ===== Elemen =====
const $ = (id) => document.getElementById(id);
const video = $("video"), canvas = $("overlay"), ctx = canvas.getContext("2d");
const elScore = $("score"), elProgress = $("progress"), elQText = $("q-text"), elDrop = $("dropzone");
const elOptions = $("options"), elFeedback = $("feedback"), elCursor = $("cursor");

// ===== State game =====
let soal = [], idx = 0, skor = 0, locked = false;

function acak(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function kocok(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = acak(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

function buatSoal() {
  const dipakai = new Set(), hasil = [];
  while (hasil.length < TOTAL_SOAL) {
    const a = acak(1, 10), b = acak(1, 10), key = a + "+" + b;
    if (dipakai.has(key)) continue;
    dipakai.add(key);
    const benar = a + b, pilihan = new Set([benar]);
    while (pilihan.size < 4) { const p = benar + acak(-4, 4); if (p > 0) pilihan.add(p); }
    hasil.push({ a, b, benar, pilihan: kocok([...pilihan]) });
  }
  return hasil;
}

function mulai() {
  soal = buatSoal(); idx = 0; skor = 0; locked = false;
  $("screen-start").classList.add("hidden");
  $("screen-end").classList.add("hidden");
  ["hud", "question", "options", "hint"].forEach((id) => $(id).classList.remove("hidden"));
  tampilSoal();
}

function tampilSoal() {
  const s = soal[idx];
  elScore.textContent = "Skor: " + skor;
  elProgress.textContent = `Soal ${idx + 1}/${TOTAL_SOAL}`;
  elQText.textContent = `${s.a} + ${s.b} = `;
  elDrop.textContent = "?"; elDrop.className = "";
  elFeedback.textContent = "";
  elOptions.innerHTML = "";
  s.pilihan.forEach((p) => {
    const b = document.createElement("div");
    b.className = "opt glass";
    b.textContent = p; b.dataset.nilai = p;
    elOptions.appendChild(b);
  });
  locked = false;
}

// Jawaban dijatuhkan ke kotak "?"
function jawab(kartu) {
  if (locked) return;
  locked = true;
  const s = soal[idx], nilai = +kartu.dataset.nilai, benar = nilai === s.benar;
  elDrop.textContent = nilai;
  if (benar) {
    skor += POIN_PER_SOAL; kartu.classList.add("correct"); elDrop.className = "correct"; elFeedback.textContent = "Benar! +10";
  } else {
    kartu.classList.add("wrong"); elDrop.className = "wrong"; elFeedback.textContent = `Salah! Jawabannya ${s.benar}`;
    [...elOptions.children].forEach((o) => { if (+o.dataset.nilai === s.benar) o.classList.add("correct"); });
  }
  elScore.textContent = "Skor: " + skor;
  setTimeout(() => { idx++; idx < TOTAL_SOAL ? tampilSoal() : selesai(); }, 1400);
}

function selesai() {
  ["hud", "question", "options", "hint"].forEach((id) => $(id).classList.add("hidden"));
  elFeedback.textContent = "";
  $("final-score").textContent = skor + " / " + TOTAL_SOAL * POIN_PER_SOAL;
  $("final-msg").textContent = skor === 100 ? "Sempurna! 🎉" : skor >= 70 ? "Bagus sekali!" : skor >= 50 ? "Lumayan, coba lagi!" : "Ayo berlatih lagi!";
  $("screen-end").classList.remove("hidden");
}

$("btn-start").onclick = mulai;
$("btn-restart").onclick = mulai;

// ===== Kursor, cubit (pinch), dan seret =====
let cx = -100, cy = -100, lastSeen = 0, mouseAktif = false, pinching = false;
let hoverEl = null, hoverStart = 0, cooldownUntil = 0;
let drag = null; // { el, ox, oy } : kartu yang sedang diseret

const dalam = (x, y, r, pad = 0) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

function cariKartu() {
  if (locked) return null;
  let found = null;
  [...elOptions.children].forEach((e) => { if (dalam(cx, cy, e.getBoundingClientRect(), 14)) found = e; });
  return found;
}
function cariTombol() {
  let found = null;
  document.querySelectorAll(".target").forEach((e) => {
    if (e.offsetParent === null) return;
    if (dalam(cx, cy, e.getBoundingClientRect())) found = e;
  });
  return found;
}

function mulaiCubit() {            // jari baru saja mencubit
  const tombol = cariTombol();
  if (tombol) { tombol.click(); return; }
  const k = cariKartu();
  if (!k) return;
  const r = k.getBoundingClientRect();
  drag = { el: k, ox: r.left + r.width / 2, oy: r.top + r.height / 2 };
  k.classList.add("dragging");
  elDrop.classList.add("ready");
}
function geserKartu() {
  if (!drag) return;
  drag.el.style.transform = `translate(${cx - drag.ox}px, ${cy - drag.oy}px) scale(1.1)`;
  elDrop.classList.toggle("over", dalam(cx, cy, elDrop.getBoundingClientRect(), 30));
}
function lepasCubit(batal) {       // cubitan dilepas
  if (!drag) return;
  const k = drag.el;
  const kena = !batal && dalam(cx, cy, elDrop.getBoundingClientRect(), 30);
  k.classList.remove("dragging");
  elDrop.classList.remove("ready", "over");
  drag = null;
  if (kena) { k.classList.add("used"); k.style.transform = ""; jawab(k); }
  else k.style.transform = "";      // kembali ke posisi semula (ada animasi transisi)
}
function aturCubit(sekarang) {
  if (sekarang && !pinching) { pinching = true; mulaiCubit(); }
  else if (!sekarang && pinching) { pinching = false; lepasCubit(false); }
}

function setProgress(p) { elCursor.style.setProperty("--p", Math.min(1, Math.max(0, p))); }

function perbarui(now) {
  const aktif = mouseAktif || now - lastSeen < 400;
  if (!aktif) {
    elCursor.style.display = "none";
    if (drag) { pinching = false; lepasCubit(true); }
    if (hoverEl) hoverEl.classList.remove("hover"); hoverEl = null;
    return;
  }
  elCursor.style.display = "block";
  elCursor.style.left = cx + "px"; elCursor.style.top = cy + "px";
  elCursor.classList.toggle("pinch", pinching);
  geserKartu();

  // Tombol Mulai / Main Lagi: tahan jari ~1 detik (selain cubit)
  const hit = drag ? null : cariTombol();
  if (hit !== hoverEl) {
    if (hoverEl) hoverEl.classList.remove("hover");
    hoverEl = hit; hoverStart = Math.max(now, cooldownUntil);
    if (hit) hit.classList.add("hover");
  }
  if (hit && now >= cooldownUntil) {
    const p = (now - hoverStart) / DWELL_MS;
    setProgress(p);
    if (p >= 1) { hit.click(); hit.classList.remove("hover"); hoverEl = null; cooldownUntil = now + 800; setProgress(0); }
  } else setProgress(0);
}

// Mouse = cadangan bila kamera tidak tersedia (tekan & seret)
window.addEventListener("mousemove", (e) => { cx = e.clientX; cy = e.clientY; lastSeen = performance.now(); mouseAktif = true; });
window.addEventListener("mousedown", (e) => { cx = e.clientX; cy = e.clientY; mouseAktif = true; e.preventDefault(); aturCubit(true); });
window.addEventListener("mouseup", () => aturCubit(false));

// ===== Deteksi tangan: MediaPipe Hands (berbasis CNN) =====
// (1) Palm Detector (CNN) menemukan telapak tangan, (2) Hand Landmark Model (CNN) memprediksi 21 titik sendi.
const SAMBUNGAN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

function petakan(lm) {
  // Video di-mirror & object-fit: cover -> sesuaikan koordinat ke layar
  const cw = window.innerWidth, ch = window.innerHeight;
  const vw = video.videoWidth, vh = video.videoHeight;
  const skala = Math.max(cw / vw, ch / vh);
  const offX = (vw * skala - cw) / 2, offY = (vh * skala - ch) / 2;
  return { x: cw - (lm.x * vw * skala - offX), y: lm.y * vh * skala - offY };
}
const jarak = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function onResults(res) {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) { if (pinching && !mouseAktif) { /* ditangani perbarui() */ } return; }
  mouseAktif = false;

  const pts = res.multiHandLandmarks[0].map(petakan);
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2;
  SAMBUNGAN.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); });
  ctx.fillStyle = "rgba(255,255,255,.95)";
  pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
  [4, 8].forEach((i) => { ctx.fillStyle = "#4da3ff"; ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 7, 0, Math.PI * 2); ctx.fill(); });

  // Titik pegangan = tengah antara ujung jempol (4) dan ujung telunjuk (8), dihaluskan
  const tx = (pts[4].x + pts[8].x) / 2, ty = (pts[4].y + pts[8].y) / 2;
  if (performance.now() - lastSeen > 400) { cx = tx; cy = ty; }
  cx += (tx - cx) * 0.55; cy += (ty - cy) * 0.55;
  lastSeen = performance.now();

  // Cubit: jarak jempol-telunjuk relatif terhadap ukuran telapak (pergelangan -> pangkal jari tengah)
  const rasio = jarak(pts[4], pts[8]) / Math.max(1, jarak(pts[0], pts[9]));
  if (!pinching && rasio < PINCH_GRAB) aturCubit(true);
  else if (pinching && rasio > PINCH_RELEASE) aturCubit(false);
}

async function mulaiKamera() {
  const status = $("status");
  let loopJalan = false;
  const jalankan = (fn) => {
    if (loopJalan) return; loopJalan = true;
    const l = async () => { await fn(); perbarui(performance.now()); requestAnimationFrame(l); };
    l();
  };
  // 1) Kamera dulu, supaya gambar kamera langsung terlihat
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    console.error(err);
    status.textContent = "Kamera tidak bisa dipakai (" + (err.message || err) + "). Izinkan akses kamera. Sementara bisa main dengan mouse (tekan & seret).";
    jalankan(async () => {});
    return;
  }
  // 2) Muat model CNN deteksi tangan (file lokal di folder mediapipe/)
  try {
    status.textContent = "Memuat model deteksi tangan (CNN)...";
    const hands = new Hands({ locateFile: (f) => `mediapipe/${f}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
    hands.onResults(onResults);
    await hands.initialize();
    status.textContent = "Siap! Tunjukkan tangan ke kamera.";
    let sibuk = false;
    jalankan(async () => {
      if (!sibuk && video.readyState >= 2) { sibuk = true; try { await hands.send({ image: video }); } catch (e) {} sibuk = false; }
    });
  } catch (err) {
    console.error(err);
    status.textContent = "Model tangan gagal dimuat (" + (err.message || err) + "). Jalankan lewat localhost (python3 -m http.server). Sementara bisa pakai mouse.";
    jalankan(async () => {});
  }
}
mulaiKamera();
