// ===== Gezi Galerim — 3B sanal müze motoru (gerçekçi hol sürümü) =====
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

// ---------- Yardımcılar ----------
const qs = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const GEZI = params.get("gezi") || "japonya";
const NOT_ANAHTARI = `galeriNotlar:${GEZI}`;
// Yayın modu: notlar salt okunur. Sahibi ?duzenle=1 ile düzenlemeyi açabilir.
const DUZENLE = params.get("duzenle") === "1";

function yerelNotlar() {
  try { return JSON.parse(localStorage.getItem(NOT_ANAHTARI)) || {}; }
  catch { return {}; }
}

function yerelNotKaydet(id, baslik, not) {
  const hepsi = yerelNotlar();
  hepsi[id] = { baslik, not };
  localStorage.setItem(NOT_ANAHTARI, JSON.stringify(hepsi));
}

// ---------- Sahne ----------
const canvas = qs("#sahne");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const MAKS_ANIZO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b09);

// Ortam haritası: metal/cila yüzeylere gerçekçi yansıma kazandırır
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

RectAreaLightUniformsLib.init();

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 300);

// Not: Bloom/EffectComposer bilinçli olarak YOK. Composer tüm kareyi topluca
// tone-mapping'den geçirdiği için fotoğrafların toneMapped=false koruması
// deviriliyor ve renkleri soluyordu. Doğrudan render = aslına sadık fotoğraf.

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Prosedürel dokular ----------
function mermerZeminDokusu() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d");
  x.fillStyle = "#cfc8bb";
  x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) {
    const px = Math.random() * 1024, py = Math.random() * 1024;
    const r = Math.random() * 22 + 3;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const ton = Math.random() * 26 - 13;
    g.addColorStop(0, `rgba(${170 + ton}, ${162 + ton}, ${148 + ton}, 0.05)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  x.strokeStyle = "rgba(120, 110, 96, 0.10)";
  for (let d = 0; d < 26; d++) {
    x.beginPath();
    let px = Math.random() * 1024, py = Math.random() * 1024;
    x.moveTo(px, py);
    for (let s = 0; s < 24; s++) {
      px += (Math.random() - 0.5) * 80;
      py += (Math.random() - 0.4) * 60;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.strokeStyle = "rgba(90, 82, 70, 0.35)";
  x.lineWidth = 3;
  for (let k = 0; k <= 1024; k += 256) {
    x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 1024); x.stroke();
    x.beginPath(); x.moveTo(0, k); x.lineTo(1024, k); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAKS_ANIZO;
  return t;
}

function sivaDokusu() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#e8e1d3";
  x.fillRect(0, 0, 512, 512);
  const veri = x.getImageData(0, 0, 512, 512);
  for (let i = 0; i < veri.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    veri.data[i] += n; veri.data[i + 1] += n; veri.data[i + 2] += n;
  }
  x.putImageData(veri, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cevizDokusu() {
  // Çerçeveler için koyu ceviz ahşap damarı
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#2b1c0e";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const y0 = Math.random() * 512;
    const koyu = Math.random() > 0.5;
    x.strokeStyle = koyu ? "rgba(12, 7, 3, 0.35)" : "rgba(92, 62, 32, 0.25)";
    x.lineWidth = Math.random() * 3 + 0.5;
    x.beginPath();
    x.moveTo(0, y0);
    for (let px = 0; px <= 512; px += 24) {
      x.lineTo(px, y0 + Math.sin(px * 0.012 + i) * 7 + (Math.random() - 0.5) * 3);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function golgeDokusu() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 118, 40, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.7, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function sakuraDokusu() {
  // Tek bir kiraz çiçeği yaprağı: uçta hafif çentikli, pembe degrade
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 40, 4, 32, 32, 30);
  g.addColorStop(0, "#fff0f4");
  g.addColorStop(0.55, "#ffd3df");
  g.addColorStop(1, "#f8a8bf");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(32, 6);            // uç (çentik yanı)
  x.quadraticCurveTo(20, 2, 14, 14);
  x.quadraticCurveTo(4, 30, 20, 48);
  x.quadraticCurveTo(30, 58, 32, 58);
  x.quadraticCurveTo(34, 58, 44, 48);
  x.quadraticCurveTo(60, 30, 50, 14);
  x.quadraticCurveTo(44, 2, 36, 8);
  x.quadraticCurveTo(34, 12, 32, 6); // uçtaki minik çentik
  x.closePath();
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tatamiDokusu() {
  // Çay odası zemini: hasır dokulu tatami, koyu kenar şeritleriyle
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#b7a469";
  x.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 3) {
    x.strokeStyle = `rgba(90, 75, 40, ${0.05 + Math.random() * 0.06})`;
    x.beginPath(); x.moveTo(0, y + Math.random()); x.lineTo(512, y); x.stroke();
  }
  x.strokeStyle = "#2e2418";
  x.lineWidth = 7;
  x.strokeRect(2, 2, 508, 508);
  x.beginPath(); x.moveTo(256, 0); x.lineTo(256, 512); x.stroke();
  x.beginPath(); x.moveTo(0, 256); x.lineTo(512, 256); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAKS_ANIZO;
  return t;
}

function shojiDokusu() {
  // İçten aydınlanan pirinç kâğıdı panel: sıcak beyaz + ahşap kafes
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#fff6e2");
  g.addColorStop(1, "#f5e5c8");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 512);
  x.strokeStyle = "#4a3826";
  x.lineWidth = 10;
  x.strokeRect(5, 5, 246, 502);
  x.lineWidth = 4;
  for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke(); }
  for (let j = 1; j < 8; j++) { x.beginPath(); x.moveTo(0, j * 64); x.lineTo(256, j * 64); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function acikAhsapDokusu() {
  // Çay odası duvarları: çerçevelerdeki koyu cevizden açık, hinoki tonunda
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#9c7a4f";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const y0 = Math.random() * 512;
    x.strokeStyle = Math.random() > 0.5 ? "rgba(64, 45, 24, 0.18)" : "rgba(158, 128, 86, 0.22)";
    x.lineWidth = Math.random() * 2.5 + 0.5;
    x.beginPath();
    x.moveTo(0, y0);
    for (let px = 0; px <= 512; px += 32) {
      x.lineTo(px, y0 + Math.sin(px * 0.01 + i * 2) * 5 + (Math.random() - 0.5) * 2);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function geceDokusu() {
  // Pencereden görünen gece: yıldızlar, dolunay ve çiçek açmış sakura dalı
  const c = document.createElement("canvas");
  c.width = 512; c.height = 384;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, "#0a1030");
  g.addColorStop(1, "#1c2650");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(255,255,240,${0.25 + Math.random() * 0.7})`;
    x.fillRect(Math.random() * 512, Math.random() * 300, 1.6, 1.6);
  }
  const ay = x.createRadialGradient(400, 90, 5, 400, 90, 46);
  ay.addColorStop(0, "#fffbe8");
  ay.addColorStop(0.8, "#f4ecc8");
  ay.addColorStop(1, "rgba(244,236,200,0)");
  x.fillStyle = ay;
  x.beginPath(); x.arc(400, 90, 46, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#05070f";
  x.lineWidth = 8;
  x.beginPath(); x.moveTo(0, 340); x.quadraticCurveTo(150, 240, 320, 258); x.stroke();
  x.lineWidth = 4;
  x.beginPath(); x.moveTo(170, 272); x.quadraticCurveTo(240, 200, 305, 182); x.stroke();
  for (let i = 0; i < 46; i++) {
    const t2 = Math.random();
    const bx = 175 + t2 * 140 + (Math.random() - 0.5) * 34;
    const by = 268 - t2 * 82 + (Math.random() - 0.5) * 28;
    x.fillStyle = `rgba(${240 + Math.random() * 15}, ${168 + Math.random() * 42}, ${192 + Math.random() * 34}, 0.92)`;
    x.beginPath(); x.arc(bx, by, 2.5 + Math.random() * 2.6, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function isikGoluDokusu() {
  // Çok eser olduğunda gerçek spot yerine kullanılan duvar ışık yıkaması
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 52, 10, 128, 96, 190);
  g.addColorStop(0, "rgba(255, 240, 214, 0.75)");
  g.addColorStop(0.45, "rgba(255, 236, 205, 0.28)");
  g.addColorStop(1, "rgba(255, 232, 200, 0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function metniSar(ctx, text, maxW) {
  const kelimeler = (text || "").split(/\s+/);
  const satirlar = [];
  let satir = "";
  for (const k of kelimeler) {
    const deneme = satir ? satir + " " + k : k;
    if (ctx.measureText(deneme).width > maxW && satir) {
      satirlar.push(satir);
      satir = k;
    } else satir = deneme;
  }
  if (satir) satirlar.push(satir);
  return satirlar;
}

function plaketDokusuCiz(baslik, not) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 320;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, "#f5f0e6");
  g.addColorStop(1, "#e4dccb");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 320);
  x.strokeStyle = "#a08e5e";
  x.lineWidth = 5;
  x.strokeRect(9, 9, 494, 302);

  x.fillStyle = "#2c261c";
  x.font = "600 34px Georgia, serif";
  const basSatirlar = metniSar(x, baslik || "İsimsiz", 440);
  let y = 64;
  for (const s of basSatirlar.slice(0, 2)) {
    x.fillText(s, 36, y);
    y += 40;
  }
  x.fillStyle = "#8a7a55";
  x.fillRect(36, y - 22, 120, 3);
  y += 8;

  x.fillStyle = "#4a4234";
  x.font = "italic 23px Georgia, serif";
  const notSatirlar = metniSar(x, not || "", 440);
  for (const s of notSatirlar.slice(0, 6)) {
    x.fillText(s, 36, y);
    y += 32;
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function baslikDuvariDokusu(baslik, aciklama, adet) {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 1024;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;

  function yaziCiz() {
    // Koyu overlay (resmin üstüne yarı saydam siyah)
    x.fillStyle = "rgba(13, 11, 9, 0.72)";
    x.fillRect(0, 0, 2048, 1024);
    // Yazılar
    x.textAlign = "center";
    x.fillStyle = "#c9a227";
    x.font = "italic 52px Georgia, serif";
    x.fillText("— SONSUZLUĞA ASILI ANILAR —", 1024, 300);
    x.font = "600 190px Georgia, serif";
    x.fillStyle = "#f2ede4";
    x.fillText(baslik, 1024, 520);
    x.fillStyle = "#c9a227";
    x.fillRect(724, 590, 600, 3);
    x.font = "italic 56px Georgia, serif";
    x.fillStyle = "#a89f90";
    const satirlar = metniSar(x, aciklama || "", 1500);
    let y = 710;
    for (const s of satirlar.slice(0, 3)) {
      x.fillText(s, 1024, y);
      y += 72;
    }
    x.font = "300 44px Georgia, serif";
    x.fillText(`${adet} eser`, 1024, y + 30);
    t.needsUpdate = true;
  }

  // Arka plan resmi yükle
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    // Resmi canvas'a sığdır (cover tarzı)
    const scale = Math.max(2048 / img.width, 1024 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    x.drawImage(img, (2048 - w) / 2, (1024 - h) / 2, w, h);
    yaziCiz();
  };
  img.onerror = () => {
    // Resim yüklenemezse sadece yazıları çiz
    x.clearRect(0, 0, 2048, 1024);
    yaziCiz();
  };
  img.src = `assets/${GEZI}/gp007.jpg`;

  return t;
}

function kapiDokusuCiz(baslik) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 1024, 512);
  x.textAlign = "center";
  x.fillStyle = "#c9a227";
  x.font = "italic 300 50px Georgia, serif";
  x.fillText("SERGİ", 512, 180);
  x.font = "600 130px Georgia, serif";
  x.fillText((baslik || "").toUpperCase(), 512, 320);
  x.fillStyle = "#8a7a55";
  x.fillRect(362, 380, 300, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- Hol kurulumu ----------
const eserler = [];
const plaketler = new Map();
const golgeDoku = golgeDokusu();
const cevizDoku = cevizDokusu();
const isikGolu = isikGoluDokusu();
let HOL = { W: 8, L: 40, H: 5.2 };
// Çay odası (lobinin arkasında, sürme kapıyla). "basi" evKur'da belirlenir;
// Infinity kaldıkça hareket sınırları ev yokmuş gibi davranır.
let EV = { W: 5.6, L: 7, H: 3.0, basi: Infinity };
let sakura = null; // havada süzülen kiraz çiçeği yaprakları

function holKur(fotoSayisi, baslik, aciklama) {
  const tarafBasina = Math.ceil(fotoSayisi / 2);
  // Döngülü tur orta hattan yürüdüğü için hol bir tık dar tutuldu:
  // eserler ~3.9 m bakış mesafesine gelir, plaketler yürürken okunur.
  const W = 7.8, H = 5.2;
  // Hol, eser sayısına göre uzar: her esere 3.7 m + giriş/çıkış payı
  const L = Math.max(26, tarafBasina * 3.7 + 12);
  HOL = { W, L, H };

  // --- Zemin: ayna yansıması + üstüne yarı saydam cilalı taş ---
  const yansima = new Reflector(new THREE.PlaneGeometry(W, L), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x828282,
  });
  yansima.rotation.x = -Math.PI / 2;
  scene.add(yansima);

  const zeminDoku = mermerZeminDokusu();
  zeminDoku.repeat.set(W / 4, L / 4);
  const zemin = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({
      map: zeminDoku,
      roughness: 0.32,
      metalness: 0.05,
      transparent: true,
      opacity: 0.86,
    })
  );
  zemin.rotation.x = -Math.PI / 2;
  zemin.position.y = 0.012;
  scene.add(zemin);

  // Duvar diplerinde koyu mermer bordür şeridi
  const bordurMat = new THREE.MeshStandardMaterial({ color: 0x4d4234, roughness: 0.25, metalness: 0.1 });
  for (const taraf of [-1, 1]) {
    const bordur = new THREE.Mesh(new THREE.PlaneGeometry(0.55, L), bordurMat);
    bordur.rotation.x = -Math.PI / 2;
    bordur.position.set(taraf * (W / 2 - 0.3), 0.013, 0);
    scene.add(bordur);
  }

  // --- Tavan ---
  const tavanMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const tavan = new THREE.Mesh(new THREE.PlaneGeometry(W, L), tavanMat);
  tavan.rotation.x = Math.PI / 2;
  tavan.position.y = H;
  scene.add(tavan);

  // Tavan ışıklığı (laylight)
  const isiklik = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.42, L - 8),
    new THREE.MeshBasicMaterial({ color: 0xfff7e8 })
  );
  isiklik.rotation.x = Math.PI / 2;
  isiklik.position.y = H - 0.02;
  scene.add(isiklik);

  const kasaMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.5, metalness: 0.4 });
  for (const sx of [-1, 1]) {
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, L - 8), kasaMat);
    kasa.position.set(sx * W * 0.21, H - 0.05, 0);
    scene.add(kasa);
  }
  for (const sz of [-1, 1]) {
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(W * 0.42, 0.1, 0.12), kasaMat);
    kasa.position.set(0, H - 0.05, sz * (L - 8) / 2);
    scene.add(kasa);
  }

  const alanIsigi = new THREE.RectAreaLight(0xfff3e0, 3.1, W * 0.42, L - 8);
  alanIsigi.position.set(0, H - 0.05, 0);
  alanIsigi.rotation.x = -Math.PI / 2;
  scene.add(alanIsigi);

  // --- Duvarlar ---
  const duvarDoku = sivaDokusu();
  duvarDoku.repeat.set(6, 3);
  const duvarMat = new THREE.MeshStandardMaterial({ map: duvarDoku, roughness: 0.92 });

  for (const taraf of [-1, 1]) {
    const duvar = new THREE.Mesh(new THREE.PlaneGeometry(L, H), duvarMat);
    duvar.position.set(taraf * W / 2, H / 2, 0);
    duvar.rotation.y = -taraf * Math.PI / 2;
    scene.add(duvar);
  }
  // Holün sonundaki (arka) duvar
  const duvarArka = new THREE.Mesh(new THREE.PlaneGeometry(W, H), duvarMat);
  duvarArka.position.set(0, H / 2, -L / 2);
  duvarArka.rotation.y = 0;
  scene.add(duvarArka);

  // --- Mimari ritim: pilastrlar (duvar) + kirişler (tavan) ---
  const pilastrMat = new THREE.MeshStandardMaterial({ color: 0xf0e9db, roughness: 0.85 });
  const kirisMat = new THREE.MeshStandardMaterial({ color: 0x261f16, roughness: 0.45, metalness: 0.3 });
  for (let s = 1.5; s * 3.7 < L - 13; s += 2) {
    const z = L / 2 - 6 - s * 3.7;

    for (const taraf of [-1, 1]) {
      const pilastr = new THREE.Mesh(new THREE.BoxGeometry(0.14, H - 0.3, 0.55), pilastrMat);
      pilastr.position.set(taraf * (W / 2 - 0.07), (H - 0.3) / 2 + 0.02, z);
      scene.add(pilastr);
      // pilastr başlığı ve kaidesi
      for (const [py, ph] of [[0.14, 0.22], [H - 0.42, 0.16]]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.2, ph, 0.68), pilastrMat);
        trim.position.set(taraf * (W / 2 - 0.1), py, z);
        scene.add(trim);
      }
    }

    // tavan kirişi (ışıklığın camekân çıtası gibi üzerinden geçer)
    const kiris = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, 0.26), kirisMat);
    kiris.position.set(0, H - 0.07, z);
    scene.add(kiris);
  }

  // --- Süpürgelik + korniş + duvar dibi sahte AO ---
  const supurgelikMat = new THREE.MeshStandardMaterial({ color: 0x241d15, roughness: 0.45, metalness: 0.15 });
  const aoDoku = new THREE.CanvasTexture((() => {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 64;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 64, 0, 0);
    g.addColorStop(0, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 64);
    return c;
  })());

  for (const taraf of [-1, 1]) {
    const sup = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 0.05), supurgelikMat);
    sup.position.set(taraf * (W / 2 - 0.028), 0.08, 0);
    sup.rotation.y = Math.PI / 2;
    scene.add(sup);

    const kornis = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.05), supurgelikMat);
    kornis.position.set(taraf * (W / 2 - 0.028), H - 0.06, 0);
    kornis.rotation.y = Math.PI / 2;
    scene.add(kornis);

    const ao = new THREE.Mesh(
      new THREE.PlaneGeometry(L, 0.7),
      new THREE.MeshBasicMaterial({ map: aoDoku, transparent: true, depthWrite: false })
    );
    ao.position.set(taraf * (W / 2 - 0.015), 0.35, 0);
    ao.rotation.y = -taraf * Math.PI / 2;
    scene.add(ao);
  }

  // --- Sergi tanıtım duvarı (holün sonunda) ---
  const tanitim = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({
      map: baslikDuvariDokusu(baslik, aciklama, fotoSayisi),
      transparent: true,
    })
  );
  tanitim.position.set(0, H / 2, -L / 2 + 0.03);
  scene.add(tanitim);

  const tanitimSpot = new THREE.SpotLight(0xfff0d8, 26, 12, 0.7, 0.7, 1.6);
  tanitimSpot.position.set(0, H - 0.4, -L / 2 + 4);
  tanitimSpot.target.position.set(0, 2.2, -L / 2);
  scene.add(tanitimSpot, tanitimSpot.target);

  // --- Lobi (Dış alan) ---
  const lobiL = 8;
  const lobiZ = L / 2 + lobiL / 2;
  
  const lobiZemin = new THREE.Mesh(new THREE.PlaneGeometry(W, lobiL), new THREE.MeshStandardMaterial({
    map: zeminDoku, roughness: 0.32, metalness: 0.05, transparent: true, opacity: 0.86
  }));
  lobiZemin.rotation.x = -Math.PI / 2;
  lobiZemin.position.set(0, 0.012, lobiZ);
  scene.add(lobiZemin);
  
  const lobiTavan = new THREE.Mesh(new THREE.PlaneGeometry(W, lobiL), tavanMat);
  lobiTavan.rotation.x = Math.PI / 2;
  lobiTavan.position.set(0, H, lobiZ);
  scene.add(lobiTavan);
  
  for (const taraf of [-1, 1]) {
    const lobiDuvar = new THREE.Mesh(new THREE.PlaneGeometry(lobiL, H), duvarMat);
    lobiDuvar.position.set(taraf * W / 2, H / 2, lobiZ);
    lobiDuvar.rotation.y = -taraf * Math.PI / 2;
    scene.add(lobiDuvar);
  }
  
  // Lobinin arka duvarı: ortasında çay odasına açılan sürme kapı boşluğu
  const arkaYanW = (W - 1.7) / 2;
  for (const taraf of [-1, 1]) {
    const parca = new THREE.Mesh(new THREE.PlaneGeometry(arkaYanW, H), duvarMat);
    parca.position.set(taraf * (0.85 + arkaYanW / 2), H / 2, L / 2 + lobiL);
    parca.rotation.y = Math.PI;
    scene.add(parca);
  }
  const arkaUst = new THREE.Mesh(new THREE.PlaneGeometry(1.7, H - 2.2), duvarMat);
  arkaUst.position.set(0, 2.2 + (H - 2.2) / 2, L / 2 + lobiL);
  arkaUst.rotation.y = Math.PI;
  scene.add(arkaUst);

  const lobiIsik = new THREE.PointLight(0xfff3e0, 25, 15);
  lobiIsik.position.set(0, H - 1, lobiZ);
  scene.add(lobiIsik);

  // --- Kapı etrafındaki ayırıcı duvar (Lobi ile Galeri arası) ---
  // Kapı boşluğu 2.9 m sabittir; yan paneller hol genişliğine uyarlanır
  const kapiDuvariGrup = new THREE.Group();
  const yanPanelW = (W - 2.9) / 2;
  const solDuvar = new THREE.Mesh(new THREE.PlaneGeometry(yanPanelW, H), duvarMat);
  solDuvar.position.set(-(1.45 + yanPanelW / 2), H / 2, 0);
  kapiDuvariGrup.add(solDuvar);
  const sagDuvar = new THREE.Mesh(new THREE.PlaneGeometry(yanPanelW, H), duvarMat);
  sagDuvar.position.set(1.45 + yanPanelW / 2, H / 2, 0);
  kapiDuvariGrup.add(sagDuvar);
  const ustDuvar = new THREE.Mesh(new THREE.PlaneGeometry(2.9, H - 3.45), duvarMat);
  ustDuvar.position.set(0, 3.45 + (H - 3.45) / 2, 0);
  kapiDuvariGrup.add(ustDuvar);

  const duvarLobi = kapiDuvariGrup.clone();
  duvarLobi.position.set(0, 0, L / 2);
  scene.add(duvarLobi); // Yüzü Lobiye (+Z) dönük
  
  const duvarGaleri = kapiDuvariGrup.clone();
  duvarGaleri.position.set(0, 0, L / 2);
  duvarGaleri.rotation.y = Math.PI;
  scene.add(duvarGaleri); // Yüzü Galeriye (-Z) dönük

  // Tabela (lobi tarafına, üst duvarın hemen önüne)
  const kapiTabela = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.2),
    new THREE.MeshBasicMaterial({ map: kapiDokusuCiz(baslik), transparent: true })
  );
  kapiTabela.position.set(0, 4.3, L / 2 + 0.02); // Üst duvarın biraz önü
  scene.add(kapiTabela);

  // Aynı tabela salonun içine de asılır: turun dönüş ayağında
  // boş gri duvar yerine sergi başlığı karşılar
  const kapiTabelaIc = kapiTabela.clone();
  kapiTabelaIc.position.set(0, 4.3, L / 2 - 0.02);
  kapiTabelaIc.rotation.y = Math.PI;
  scene.add(kapiTabelaIc);

  // --- Giriş kapısı (Lobi ile hol arası çift kanatlı kapı) ---
  const kapiGrubu = new THREE.Group();
  
  // Kapı kasası (Çerçeve) - Katı blok yerine 3 parça
  const kasaSol = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.45, 0.22), supurgelikMat);
  kasaSol.position.set(-1.375, 1.725, 0);
  kapiGrubu.add(kasaSol);
  
  const kasaSag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.45, 0.22), supurgelikMat);
  kasaSag.position.set(1.375, 1.725, 0);
  kapiGrubu.add(kasaSag);
  
  const kasaUst = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.15, 0.22), supurgelikMat);
  kasaUst.position.set(0, 3.375, 0);
  kapiGrubu.add(kasaUst);
  
  const kapiMat = new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.4, metalness: 0.1 });
  const kanatlar = [];
  
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 1.3, 1.66, 0.09); // Menteşe noktası
    
    const kanat = new THREE.Mesh(new THREE.BoxGeometry(1.30, 3.28, 0.08), kapiMat);
    kanat.position.set(-sx * 0.65, 0, 0); // Menteşeye göre kanat konumu
    pivot.add(kanat);
    
    const kol = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.2, metalness: 0.95 })
    );
    kol.position.set(-sx * 1.18, -0.11, 0.06); // Menteşeye göre kol konumu
    pivot.add(kol);
    
    kapiGrubu.add(pivot);
    kanatlar.push({ pivot, sx });
  }

  kapiGrubu.position.set(0, 0, L / 2);
  scene.add(kapiGrubu);

  // Not: Orta hattaki banklar kaldırıldı — döngülü tur tam o hattan
  // yürüyor, içlerinden geçmek yanılsamayı bozuyordu. Zemin artık
  // kesintisiz yaprak halısına kalıyor.

  // --- Havada süzülen kiraz çiçeği yaprakları ---
  const yaprakSayisi = Math.min(1200, Math.floor(L * 10));
  const yaprakGeo = new THREE.PlaneGeometry(0.085, 0.085);
  const yaprakMat = new THREE.MeshBasicMaterial({
    map: sakuraDokusu(),
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const yapraklar = new THREE.InstancedMesh(yaprakGeo, yaprakMat, yaprakSayisi);
  yapraklar.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // InstancedMesh'in kapsama küresi tek yaprağın geometrisinden hesaplanır;
  // origin görüş dışına çıkınca TÜM yapraklar birden yok oluyordu. Kapat.
  yapraklar.frustumCulled = false;
  const parcalar = [];
  for (let i = 0; i < yaprakSayisi; i++) {
    parcalar.push({
      x: (Math.random() - 0.5) * W * 0.9,
      y: Math.random() * H,
      z: (Math.random() - 0.5) * (L - 2),
      dusme: 0.12 + Math.random() * 0.22,     // düşüş hızı (m/sn)
      sallanma: 0.4 + Math.random() * 0.7,    // yatay salınım genliği
      faz: Math.random() * Math.PI * 2,
      donme: (Math.random() - 0.5) * 2.2,     // takla hızı
      egim: Math.random() * Math.PI * 2,
    });
  }
  scene.add(yapraklar);

  // --- Yere düşen yaprakların biriktiği katman ---
  // Zemin boş başlar: her yaprak tavandan doğar, süzülür ve yere değdiği
  // noktada bu katmana "yapışır" — kaybolmaz, salon zamanla çiçekle örtülür.
  // Kapasite dolunca en eski yaprağın yeri sessizce yeniden kullanılır.
  const YERDE_KAPASITE = 24000;
  const yerdeYapraklar = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.09, 0.09),
    new THREE.MeshBasicMaterial({
      map: sakuraDokusu(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    YERDE_KAPASITE
  );
  yerdeYapraklar.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  yerdeYapraklar.frustumCulled = false;
  yerdeYapraklar.count = 0; // boş başlar, düşen her yaprakla artar
  scene.add(yerdeYapraklar);

  sakura = { mesh: yapraklar, parcalar, yerde: yerdeYapraklar, yerdeSayi: 0 };

  // --- Genel ışık ve atmosfer ---
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.32));
  scene.add(new THREE.HemisphereLight(0xfff8ea, 0x35291d, 0.35));
  scene.fog = new THREE.Fog(0x151210, L * 0.55, L * 1.7);

  return { W, L, H, tarafBasina, kanatlar };
}

// ---------- Tablo + çerçeve + plaket ----------
const dokuYukleyici = new THREE.TextureLoader();
dokuYukleyici.setCrossOrigin("anonymous");

// Pahlı, kesitli çerçeve: iç boşluklu şekil + extrude
function cerceveGeometrisi(w, h) {
  const kalinlik = 0.095;
  const dis = new THREE.Shape();
  const W2 = w / 2 + kalinlik, H2 = h / 2 + kalinlik;
  dis.moveTo(-W2, -H2);
  dis.lineTo(W2, -H2);
  dis.lineTo(W2, H2);
  dis.lineTo(-W2, H2);
  dis.closePath();
  const ic = new THREE.Path();
  const w2 = w / 2 + 0.012, h2 = h / 2 + 0.012;
  ic.moveTo(-w2, -h2);
  ic.lineTo(w2, -h2);
  ic.lineTo(w2, h2);
  ic.lineTo(-w2, h2);
  ic.closePath();
  dis.holes.push(ic);
  return new THREE.ExtrudeGeometry(dis, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
}

function tabloOlustur(foto, index, taraf, z, gercekSpot) {
  dokuYukleyici.load(foto.src, (doku) => {
    doku.colorSpace = THREE.SRGBColorSpace;
    doku.anisotropy = MAKS_ANIZO;

    const oran = doku.image.width / doku.image.height;
    const h = Math.sqrt(2.15 / oran);
    const w = oran * h;

    const grup = new THREE.Group();

    // Duvara vuran ışık gölü — spot yoksa görüntüyü sahtesiyle tamamlar
    if (!gercekSpot) {
      const golPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 1.5, h + 2.0),
        new THREE.MeshBasicMaterial({
          map: isikGolu,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      golPlane.position.set(0, 0.45, 0.004);
      grup.add(golPlane);
    }

    // Sahte gölge: çerçevenin arkasında duvara vuran yumuşak leke
    const golge = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.62, h + 0.62),
      new THREE.MeshBasicMaterial({ map: golgeDoku, transparent: true, opacity: 0.65, depthWrite: false })
    );
    golge.position.set(0, -0.05, 0.006);
    grup.add(golge);

    // Kesitli ceviz çerçeve (pahlı extrude profil)
    const cerceve = new THREE.Mesh(
      cerceveGeometrisi(w, h),
      new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.32, metalness: 0.15 })
    );
    cerceve.position.z = 0.008;
    grup.add(cerceve);

    // İç pervaz: altın varak şeridi
    const varak = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xa8843c, roughness: 0.25, metalness: 0.9 })
    );
    varak.position.z = 0.02;
    grup.add(varak);

    // Paspartu + pah çizgisi (kesik kenar hissi)
    const paspartu = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.07, h + 0.07),
      new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.95 })
    );
    paspartu.position.z = 0.047;
    grup.add(paspartu);

    const pah = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.016, h + 0.016),
      new THREE.MeshBasicMaterial({ color: 0xd8cfb8 })
    );
    pah.position.z = 0.0475;
    grup.add(pah);

    // Fotoğraf
    const fotoMat = new THREE.MeshBasicMaterial({ map: doku });
    fotoMat.toneMapped = false;
    const fotoMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fotoMat);
    fotoMesh.position.z = 0.049;
    fotoMesh.userData = { index, foto };
    grup.add(fotoMesh);
    eserler.push(fotoMesh);

    // Cam yansıması
    const cam = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.06, h + 0.06),
      new THREE.MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.07,
        roughness: 0.04,
        metalness: 0,
        color: 0xffffff,
      })
    );
    cam.position.z = 0.055;
    grup.add(cam);

    // Plaket
    const plaket = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.3),
      new THREE.MeshBasicMaterial({ map: plaketDokusuCiz(foto.baslik, foto.not) })
    );
    plaket.position.set(w / 2 + 0.46, -h / 2 + 0.46, 0.03);
    grup.add(plaket);
    plaketler.set(foto.id, plaket);

    // Görünür ray spot armatürü
    const armatur = new THREE.Group();
    const govde = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.4, metalness: 0.7 })
    );
    armatur.add(govde);
    // armatür ağzında sıcak parıltı (bloom bunu hafifçe ışıldatır)
    const agiz = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9c4 })
    );
    agiz.position.y = -0.115;
    agiz.rotation.x = Math.PI / 2 - 0.2;
    armatur.add(agiz);
    armatur.position.set(0, HOL.H - 1.7 - 0.25, 1.15);
    armatur.rotation.x = 0.7;
    grup.add(armatur);

    if (gercekSpot) {
      const spot = new THREE.SpotLight(0xffedd2, 16, 8, 0.5, 0.7, 1.7);
      spot.position.set(0, HOL.H - 1.7 - 0.3, 1.1);
      spot.target = cerceve;
      grup.add(spot, spot.target);
    }

    // Duvara yerleştir
    grup.position.set(taraf * (HOL.W / 2 - 0.02), 1.72, z);
    grup.rotation.y = taraf === -1 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(grup);
  });
}

// ---------- Çay Odası (lobinin arkasında, sürme shoji kapılı) ----------
let surmePanel = null; // yaklaşınca yana kayan shoji kapı

function evKur(fotograflar) {
  const { W: EW, L: EL, H: EH } = EV;
  const basi = HOL.L / 2 + 8; // lobinin arka duvarı
  EV.basi = basi;
  const mz = basi + EL / 2;   // odanın merkezi
  const taban = 0.15;         // genkan basamağı: tatami hafif yüksekte

  const duvarAhsapMat = new THREE.MeshStandardMaterial({ map: acikAhsapDokusu(), roughness: 0.75 });
  const koyuAhsapMat = new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.5 });

  // --- Zemin: tatami + basamak ---
  const tatami = tatamiDokusu();
  tatami.repeat.set(EW / 1.8, EL / 1.8);
  const zeminEv = new THREE.Mesh(
    new THREE.PlaneGeometry(EW, EL),
    new THREE.MeshStandardMaterial({ map: tatami, roughness: 0.9 })
  );
  zeminEv.rotation.x = -Math.PI / 2;
  zeminEv.position.set(0, taban, mz);
  scene.add(zeminEv);

  const basamak = new THREE.Mesh(new THREE.BoxGeometry(1.7, taban, 0.5), koyuAhsapMat);
  basamak.position.set(0, taban / 2, basi + 0.25);
  scene.add(basamak);

  // --- Tavan + kirişler (alçak tavan: ev sıcaklığı) ---
  const tavanEv = new THREE.Mesh(new THREE.PlaneGeometry(EW, EL), duvarAhsapMat);
  tavanEv.rotation.x = Math.PI / 2;
  tavanEv.position.set(0, EH, mz);
  scene.add(tavanEv);
  for (let k = 1; k <= 3; k++) {
    const kiris = new THREE.Mesh(new THREE.BoxGeometry(EW, 0.12, 0.12), koyuAhsapMat);
    kiris.position.set(0, EH - 0.06, basi + (EL * k) / 4);
    scene.add(kiris);
  }

  // --- Duvarlar ---
  for (const taraf of [-1, 1]) {
    const duvar = new THREE.Mesh(new THREE.PlaneGeometry(EL, EH), duvarAhsapMat);
    duvar.position.set(taraf * EW / 2, EH / 2, mz);
    duvar.rotation.y = -taraf * Math.PI / 2;
    scene.add(duvar);
  }
  const arkaEv = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), duvarAhsapMat);
  arkaEv.position.set(0, EH / 2, basi + EL);
  arkaEv.rotation.y = Math.PI;
  scene.add(arkaEv);
  // Ön duvarın ev içi yüzü (kapı boşluklu)
  const onYanW = (EW - 1.7) / 2;
  for (const taraf of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(onYanW, EH), duvarAhsapMat);
    panel.position.set(taraf * (0.85 + onYanW / 2), EH / 2, basi + 0.01);
    scene.add(panel);
  }
  const onUst = new THREE.Mesh(new THREE.PlaneGeometry(1.7, EH - 2.2), duvarAhsapMat);
  onUst.position.set(0, 2.2 + (EH - 2.2) / 2, basi + 0.01);
  scene.add(onUst);

  // --- İçten aydınlanan shoji panelleri (yan duvarlarda) ---
  const shojiMat = new THREE.MeshBasicMaterial({ map: shojiDokusu() });
  for (const taraf of [-1, 1]) {
    for (const dz of [-1.4, 1.4]) {
      const shoji = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), shojiMat);
      shoji.position.set(taraf * (EW / 2 - 0.02), taban + 1.15, mz + dz);
      shoji.rotation.y = -taraf * Math.PI / 2;
      scene.add(shoji);
    }
  }

  // --- Gece penceresi (arka duvar): dolunay ve sakura dalı ---
  const pencere = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.15),
    new THREE.MeshBasicMaterial({ map: geceDokusu() })
  );
  pencere.position.set(-0.9, taban + 1.45, basi + EL - 0.02);
  pencere.rotation.y = Math.PI;
  scene.add(pencere);
  for (let i = -1; i <= 1; i++) {
    const dik = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.15, 0.045), koyuAhsapMat);
    dik.position.set(-0.9 + i * 0.63, taban + 1.45, basi + EL - 0.04);
    scene.add(dik);
  }
  const yatayCubuk = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.055, 0.045), koyuAhsapMat);
  yatayCubuk.position.set(-0.9, taban + 1.45, basi + EL - 0.04);
  scene.add(yatayCubuk);

  // --- Tokonoma: asılı rulo (kakemono) içinde ilk fotoğraf ---
  const rulo = new THREE.Group();
  const kagit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 1.65),
    new THREE.MeshStandardMaterial({ color: 0xf2e9d4, roughness: 0.95 })
  );
  rulo.add(kagit);
  for (const uy of [0.86, -0.86]) {
    const cubuk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 10), koyuAhsapMat);
    cubuk.rotation.z = Math.PI / 2;
    cubuk.position.y = uy;
    rulo.add(cubuk);
  }
  rulo.position.set(1.6, taban + 1.5, basi + EL - 0.06);
  rulo.rotation.y = Math.PI;
  scene.add(rulo);
  const ilk = fotograflar[0];
  if (ilk) {
    dokuYukleyici.load(ilk.src, (doku) => {
      doku.colorSpace = THREE.SRGBColorSpace;
      const oran = doku.image.width / doku.image.height;
      const fw = 0.56;
      const f = new THREE.Mesh(
        new THREE.PlaneGeometry(fw, Math.min(fw / oran, 1.3)),
        (() => { const m = new THREE.MeshBasicMaterial({ map: doku }); m.toneMapped = false; return m; })()
      );
      f.position.z = 0.006;
      f.userData = { index: 0, foto: ilk };
      rulo.add(f);
      eserler.push(f);
    });
  }

  // --- Alçak çay masası, minderler, demlik, fincanlar ---
  const masa = new THREE.Group();
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.055, 0.75), koyuAhsapMat);
  tabla.position.y = 0.33;
  masa.add(tabla);
  for (const mx of [-0.48, 0.48]) {
    for (const mk of [-0.28, 0.28]) {
      const bacak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.31, 0.06), koyuAhsapMat);
      bacak.position.set(mx, 0.155, mk);
      masa.add(bacak);
    }
  }
  const demlik = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.35, metalness: 0.3 })
  );
  demlik.scale.y = 0.72;
  demlik.position.set(0.2, 0.43, 0);
  masa.add(demlik);
  const topuz = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), koyuAhsapMat);
  topuz.position.set(0.2, 0.52, 0);
  masa.add(topuz);
  for (const fx of [-0.2, -0.02]) {
    const fincan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.032, 0.055, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.6 })
    );
    fincan.position.set(fx, 0.386, 0.12);
    masa.add(fincan);
  }
  for (const taraf of [-1, 1]) {
    const minder = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.09, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x31405e, roughness: 0.95 })
    );
    minder.position.set(0, 0.045, taraf * 0.78);
    masa.add(minder);
  }
  masa.position.set(-0.5, taban, mz + 0.3);
  scene.add(masa);

  // --- Kâğıt fener + sıcak oda ışığı ---
  const fener = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffdfae })
  );
  fener.scale.y = 1.25;
  fener.position.set(1.6, taban + 0.55, basi + EL - 0.85);
  scene.add(fener);
  const fenerIsik = new THREE.PointLight(0xffc37a, 5, 4, 1.8);
  fenerIsik.position.copy(fener.position);
  scene.add(fenerIsik);
  const evIsik = new THREE.PointLight(0xffd9a6, 14, 9, 1.8);
  evIsik.position.set(0, EH - 0.5, mz);
  scene.add(evIsik);

  // --- Duvarlarda evin çerçeveli anıları (son 4 fotoğraf) ---
  const secilen = fotograflar.slice(-4);
  secilen.forEach((foto, i) => {
    dokuYukleyici.load(foto.src, (doku) => {
      doku.colorSpace = THREE.SRGBColorSpace;
      doku.anisotropy = MAKS_ANIZO;
      const oran = doku.image.width / doku.image.height;
      const fw2 = 0.62, fh2 = fw2 / oran;
      const g2 = new THREE.Group();
      const cer = new THREE.Mesh(new THREE.BoxGeometry(fw2 + 0.07, fh2 + 0.07, 0.035), koyuAhsapMat);
      g2.add(cer);
      const fmat2 = new THREE.MeshBasicMaterial({ map: doku });
      fmat2.toneMapped = false;
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(fw2, fh2), fmat2);
      fm.position.z = 0.02;
      fm.userData = { index: fotograflar.length - secilen.length + i, foto };
      g2.add(fm);
      eserler.push(fm);
      const taraf = i < 2 ? -1 : 1;
      const dz2 = i % 2 === 0 ? -0.3 : 2.6; // shoji panelleriyle çakışmaz
      g2.position.set(taraf * (EW / 2 - 0.05), taban + 1.55, mz + dz2);
      g2.rotation.y = -taraf * Math.PI / 2;
      scene.add(g2);
    });
  });

  // --- Sürme shoji kapı + ray + lobi tarafında tabela ---
  surmePanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.18),
    new THREE.MeshBasicMaterial({ map: shojiDokusu(), side: THREE.DoubleSide })
  );
  surmePanel.position.set(0, 1.1, basi - 0.07);
  scene.add(surmePanel);
  const ray = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.09, 0.18), koyuAhsapMat);
  ray.position.set(0.9, 2.27, basi - 0.06);
  scene.add(ray);

  const yazi = document.createElement("canvas");
  yazi.width = 512; yazi.height = 128;
  const yx = yazi.getContext("2d");
  yx.textAlign = "center";
  yx.fillStyle = "#c9a227";
  yx.font = "600 58px Georgia, serif";
  yx.fillText("· ÇAY ODASI ·", 256, 82);
  const yaziDoku = new THREE.CanvasTexture(yazi);
  yaziDoku.colorSpace = THREE.SRGBColorSpace;
  const tabelaEv = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.375),
    new THREE.MeshBasicMaterial({ map: yaziDoku, transparent: true })
  );
  tabelaEv.position.set(0, 2.75, basi - 0.03);
  tabelaEv.rotation.y = Math.PI;
  scene.add(tabelaEv);
}

// ---------- Gezinti durumu ----------
// Fare kilidi (pointer lock) her ortamda çalışmaz (ör. gömülü paneller).
// Alınamazsa "sürükle-bak" moduna düşeriz.
let gezintiAktif = false;
// Dokunmatik cihazda fare kilidi (pointer lock) hiç denenmez: kimi mobil
// tarayıcı kilidi "başarıyla" alıp anında bırakıyor ve gezinti kilitleniyordu.
const DOKUNMATIK = matchMedia("(pointer: coarse)").matches;
let surukleModu = DOKUNMATIK;
let kilitCalisti = false;
let kapiAcik = false;
let kapiAcilmaOrani = 0;
let kanatNesneleri = [];
let kapi2Acik = false;      // çay odasının sürme kapısı
let kapi2AcilmaOrani = 0;
const fareNDC = new THREE.Vector2(0, 0);

// ---------- Ses ----------
// Sentetik ayak sesi / oda uğultusu / tık denendi, sinir bozucuydu — kaldırıldı.
// Şimdi: yalnızca hafif kapı gıcırtısı + kullanıcının kendi müziği.
let sesCtx = null;

function sesBaslat() {
  if (sesCtx) {
    if (sesCtx.state === "suspended") sesCtx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { sesCtx = new AC(); } catch { sesCtx = null; }
}

// ---------- Müzik (assets/<gezi>/muzik.mp3 veya manifestteki "muzik" alanı) ----------
let muzik = null;
let muzikAcik = true;

function muzikKur(veri) {
  const kaynak = veri.muzik || `assets/${GEZI}/muzik.mp3`;
  const a = new Audio(kaynak);
  a.loop = true;
  a.volume = 0.22;
  a.addEventListener("error", () => { muzik = null; }); // dosya yoksa sessizce vazgeç
  muzik = a;
}

function muzikOynat() {
  if (muzik && muzikAcik && muzik.paused) muzik.play().catch(() => {});
}

addEventListener("keydown", (e) => {
  if (e.code !== "KeyM" || !muzik) return;
  muzikAcik = !muzikAcik;
  if (muzikAcik) muzik.play().catch(() => {});
  else muzik.pause();
});

function gurultuTamponu(sure) {
  const sr = sesCtx.sampleRate;
  const buf = sesCtx.createBuffer(1, Math.max(1, Math.floor(sr * sure)), sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function kapiSesi(aciliyor) {
  if (!sesCtx) return;
  const t = sesCtx.currentTime;
  // menteşe gıcırtısı: dar bantlı, yavaş süpürülen gürültü
  const src = sesCtx.createBufferSource();
  src.buffer = gurultuTamponu(0.9);
  const f = sesCtx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 6;
  f.frequency.setValueAtTime(aciliyor ? 240 : 420, t);
  f.frequency.linearRampToValueAtTime(aciliyor ? 420 : 240, t + 0.8);
  const g = sesCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.028, t + 0.15);
  g.gain.linearRampToValueAtTime(0.0001, t + 0.85);
  src.connect(f).connect(g).connect(sesCtx.destination);
  src.start(t);
  // sonda alçak bir "gump"
  const osc = sesCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 90;
  const og = sesCtx.createGain();
  og.gain.setValueAtTime(0.0001, t + 0.72);
  og.gain.linearRampToValueAtTime(0.035, t + 0.76);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
  osc.connect(og).connect(sesCtx.destination);
  osc.start(t + 0.72);
  osc.stop(t + 1);
}

// ---------- Hareket ----------
const tuslar = new Set();
addEventListener("keydown", (e) => tuslar.add(e.code));
addEventListener("keyup", (e) => tuslar.delete(e.code));

const hiz = new THREE.Vector3();
const saat = new THREE.Clock();
let adimFazi = 0;
let zaman = 0;

function hareketGuncelle(dt) {
  if (gezintiAktif && !turModu) {
    const ivme = tuslar.has("ShiftLeft") ? 40 : 24;
    let kx = (tuslar.has("KeyD") || tuslar.has("ArrowRight") ? 1 : 0) -
             (tuslar.has("KeyA") || tuslar.has("ArrowLeft") ? 1 : 0);
    let kz = (tuslar.has("KeyS") || tuslar.has("ArrowDown") ? 1 : 0) -
             (tuslar.has("KeyW") || tuslar.has("ArrowUp") ? 1 : 0);

    // Joystick girdisi (klavye yoksa)
    if (kx === 0 && kz === 0 && joyAktif) {
      kx = joyX;
      kz = joyY;
    }

    const yon = new THREE.Vector3(kx, 0, kz);
    // Yalnızca 1'i aşan vektörü normalize et: klavyede çapraz gidiş
    // hızlanmaz, joystick'in kısmi itişi ise analog kalır.
    if (yon.lengthSq() > 1) yon.normalize();
    hiz.x += yon.x * ivme * dt;
    hiz.z += yon.z * ivme * dt;
  }

  // Tur modu: hol boyunca tek ve sabit tempoda, iki uç arasında mekik.
  // (Eser önünde yavaşlayıp arada hızlanma denendi; keyifli bulunmadı.)
  if (turModu && gezintiAktif) {
    hiz.x = 0;
    hiz.z = 1.15 * turYon; // turYon -1: salonun sonuna, +1: kapıya dönüş
  }

  hiz.multiplyScalar(Math.max(1 - 8 * dt, 0));

  const p = controls.getObject().position;
  const oncekiZ = p.z;

  controls.moveRight(hiz.x * dt);
  if (turModu && gezintiAktif) {
    // Tur, bakış yönünden bağımsız hol ekseninde ilerler: eserlere dönüp
    // bakmak yürüyüşü duvara saptırıp durdurmaz.
    p.z += hiz.z * dt;
    p.x = THREE.MathUtils.damp(p.x, 0, 1.5, dt); // yumuşakça orta hatta süzül
    // Döngü: iki uçta yön değiştir. Kapı tarafındaki dönüş noktası kapı
    // sensörünün (4.2 m) dışında — kapı her turda açılıp kapanmasın.
    if (turYon < 0 && p.z <= -(HOL.L / 2 - 1.6)) turCevir(1);
    else if (turYon > 0 && p.z >= HOL.L / 2 - 4.6) turCevir(-1);
  } else {
    controls.moveForward(-hiz.z * dt);
  }

  // Bölgeye göre yan duvar sınırı: çay odası holden dar
  const xSinir = p.z > EV.basi ? EV.W / 2 - 0.45 : HOL.W / 2 - 0.7;
  p.x = THREE.MathUtils.clamp(p.x, -xSinir, xSinir);

  // Lobi-galeri ayırıcı duvarı: kapı boşluğu (|x|<1.05) dışında her zaman katı;
  // boşluktan geçiş yalnızca kapı yeterince açıkken mümkün.
  // "Hangi taraftan geldiysen o tarafta kal" — itekleme yok, takılma yok.
  const esik = HOL.L / 2;
  const gecebilir = Math.abs(p.x) < 1.05 && kapiAcilmaOrani > 0.55;
  if (!gecebilir) {
    if (oncekiZ >= esik && p.z < esik + 0.35) { p.z = esik + 0.35; hiz.z = Math.max(hiz.z, 0); }
    else if (oncekiZ < esik && p.z > esik - 0.35) { p.z = esik - 0.35; hiz.z = Math.min(hiz.z, 0); }
  }
  // Kapı aralığından geçerken kasaya sürtme
  if (Math.abs(p.z - esik) < 0.35) p.x = THREE.MathUtils.clamp(p.x, -1.0, 1.0);

  // Çay odasının sürme kapısı (lobi arka duvarı): boşluk dışında katı,
  // boşluktan geçiş yalnızca panel yeterince kaymışken mümkün
  if (EV.basi !== Infinity) {
    const esik2 = EV.basi;
    const gecebilir2 = Math.abs(p.x) < 0.8 && kapi2AcilmaOrani > 0.55;
    if (!gecebilir2) {
      if (oncekiZ <= esik2 && p.z > esik2 - 0.35) { p.z = esik2 - 0.35; hiz.z = Math.min(hiz.z, 0); }
      else if (oncekiZ > esik2 && p.z < esik2 + 0.35) { p.z = esik2 + 0.35; hiz.z = Math.max(hiz.z, 0); }
    }
    if (Math.abs(p.z - esik2) < 0.35) p.x = THREE.MathUtils.clamp(p.x, -0.7, 0.7);
  }

  const zSon = EV.basi === Infinity ? HOL.L / 2 + 6.5 : EV.basi + EV.L - 0.55;
  p.z = THREE.MathUtils.clamp(p.z, -(HOL.L / 2 - 0.9), zSon);

  const tempo = Math.hypot(hiz.x, hiz.z);
  adimFazi += dt * tempo * 1.9;
  // Çay odasının tatami zemini basamakla yükselir; geçişte yumuşak rampa
  const zeminYuksekligi = 0.15 * THREE.MathUtils.smoothstep(p.z, EV.basi - 0.4, EV.basi + 0.5);
  p.y = 1.7 + zeminYuksekligi + Math.sin(adimFazi) * Math.min(tempo / 40, 1) * 0.045;
}

const _yaprakMatrisi = new THREE.Matrix4();
const _yaprakDonus = new THREE.Euler();
const _yaprakQ = new THREE.Quaternion();
const _yaprakOlcek = new THREE.Vector3(1, 1, 1);
const _yaprakPoz = new THREE.Vector3();

// Yere değen yaprağı, o an göründüğü noktada birikinti katmanına sabitler.
function yereBirak(p) {
  const yerde = sakura.yerde;
  const kapasite = yerde.instanceMatrix.count;
  const idx = sakura.yerdeSayi % kapasite;
  _yaprakPoz.set(
    THREE.MathUtils.clamp(
      p.x + Math.sin(zaman * p.sallanma + p.faz) * 0.35,
      -(HOL.W / 2 - 0.1), HOL.W / 2 - 0.1
    ),
    0.015 + Math.random() * 0.03, // hafif yükseklik farkı: üst üste binince titreşim olmasın
    p.z + Math.cos(zaman * p.sallanma * 0.8 + p.faz) * 0.2
  );
  _yaprakDonus.set(
    -Math.PI / 2 + (Math.random() - 0.5) * 0.22, // yere serili, ucu belli belirsiz kalkık
    Math.random() * Math.PI * 2,
    (Math.random() - 0.5) * 0.18
  );
  _yaprakQ.setFromEuler(_yaprakDonus);
  _yaprakOlcek.setScalar(0.85 + Math.random() * 0.35);
  _yaprakMatrisi.compose(_yaprakPoz, _yaprakQ, _yaprakOlcek);
  yerde.setMatrixAt(idx, _yaprakMatrisi);
  // Kısmi yükleme: her inişte 24k'lık buffer'ın tamamı değil,
  // yalnızca bu yaprağın 16 float'ı GPU'ya gitsin
  yerde.instanceMatrix.addUpdateRange(idx * 16, 16);
  sakura.yerdeSayi++;
  yerde.count = Math.min(sakura.yerdeSayi, kapasite);
  yerde.instanceMatrix.needsUpdate = true;
  _yaprakOlcek.setScalar(1); // havadaki yapraklar için ölçeği geri al
}

function sakuraGuncelle(dt) {
  if (!sakura) return;
  const { mesh, parcalar } = sakura;
  for (let i = 0; i < parcalar.length; i++) {
    const p = parcalar[i];
    p.y -= p.dusme * dt;
    if (p.y < 0.05) {
      // yere inen yaprak düştüğü yerde kalır, birikintiye eklenir…
      yereBirak(p);
      // …ve gökyüzünden yepyeni bir yaprak doğar
      p.y = HOL.H - 0.3;
      p.x = (Math.random() - 0.5) * HOL.W * 0.9;
      p.z = (Math.random() - 0.5) * (HOL.L - 2);
      p.faz = Math.random() * Math.PI * 2;
      p.dusme = 0.12 + Math.random() * 0.22;
    }
    _yaprakPoz.set(
      p.x + Math.sin(zaman * p.sallanma + p.faz) * 0.35,
      p.y,
      p.z + Math.cos(zaman * p.sallanma * 0.8 + p.faz) * 0.2
    );
    _yaprakDonus.set(
      zaman * p.donme + p.faz,
      p.egim + Math.sin(zaman * 0.6 + p.faz) * 0.6,
      p.faz
    );
    _yaprakQ.setFromEuler(_yaprakDonus);
    _yaprakMatrisi.compose(_yaprakPoz, _yaprakQ, _yaprakOlcek);
    mesh.setMatrixAt(i, _yaprakMatrisi);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

// ---------- Nişangâh & etkileşim ----------
const raycaster = new THREE.Raycaster();
const crosshair = qs("#crosshair");
let hedefEser = null;

const MERKEZ = new THREE.Vector2(0, 0);

function hedefGuncelle() {
  if (!gezintiAktif) {
    hedefEser = null;
    crosshair.classList.remove("aktif");
    return;
  }
  raycaster.setFromCamera(surukleModu ? fareNDC : MERKEZ, camera);
  const kesisimler = raycaster.intersectObjects(eserler, false);
  const yakin = kesisimler.find((k) => k.distance < 7);
  hedefEser = yakin ? yakin.object : null;

  // Eser hedefteyken yalnızca nişangâh belirginleşir + imleç değişir.
  // "İncelemek için tıkla" yazısı deneyimi bozduğu için kaldırıldı;
  // tıklayarak inceleme aynen çalışıyor.
  crosshair.classList.toggle("aktif", !!hedefEser);
  document.body.style.cursor = surukleModu && hedefEser ? "pointer" : "";
}

// ---------- Sürükle-bak modu ----------
let surukleniyor = false;
let sonFareX = 0, sonFareY = 0, surukleMesafe = 0;
const bakis = new THREE.Euler(0, 0, 0, "YXZ");

canvas.addEventListener("mousedown", (e) => {
  if (!surukleModu || !gezintiAktif) return;
  surukleniyor = true;
  surukleMesafe = 0;
  sonFareX = e.clientX;
  sonFareY = e.clientY;
});

addEventListener("mousemove", (e) => {
  fareNDC.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!surukleniyor) return;
  turDonus = null; // kullanıcı bakınıyor: turun otomatik kamera dönüşünü bırak
  const dx = e.clientX - sonFareX;
  const dy = e.clientY - sonFareY;
  surukleMesafe += Math.abs(dx) + Math.abs(dy);
  sonFareX = e.clientX;
  sonFareY = e.clientY;
  bakis.setFromQuaternion(camera.quaternion);
  bakis.y -= dx * 0.004;
  bakis.x -= dy * 0.004;
  bakis.x = THREE.MathUtils.clamp(bakis.x, -1.4, 1.4);
  camera.quaternion.setFromEuler(bakis);
});

addEventListener("mouseup", () => { surukleniyor = false; });

// ---------- Dokunmatik Bakış (Mobil) ----------
let dokunBakisId = null;

canvas.addEventListener("touchstart", (e) => {
  if (!gezintiAktif || lightboxAcik) return;
  const joyKutu = joyZone ? joyZone.getBoundingClientRect() : null;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    // Joystick'in üstüne veya hemen çevresine dokunulmadıysa bakış olarak al
    const joystikte = joyKutu &&
      t.clientX > joyKutu.left - 24 && t.clientX < joyKutu.right + 24 &&
      t.clientY > joyKutu.top - 24 && t.clientY < joyKutu.bottom + 24;
    if (!joystikte) {
      if (dokunBakisId !== null) continue; // zaten bir parmak bakıyor
      dokunBakisId = t.identifier;
      surukleModu = true;
      surukleniyor = true;
      surukleMesafe = 0;
      sonFareX = t.clientX;
      sonFareY = t.clientY;
      // Dokunulan noktayı nişangâh olarak kaydet ki parmak hiç
      // kımıldamadan yapılan tek dokunuş da doğru eseri hedeflesin
      fareNDC.set((t.clientX / innerWidth) * 2 - 1, -(t.clientY / innerHeight) * 2 + 1);
      break;
    }
  }
}, {passive: true});

addEventListener("touchmove", (e) => {
  if (dokunBakisId === null || !surukleniyor) return;
  turDonus = null; // kullanıcı bakınıyor: turun otomatik kamera dönüşünü bırak
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === dokunBakisId) {
      fareNDC.set((t.clientX / innerWidth) * 2 - 1, -(t.clientY / innerHeight) * 2 + 1);
      const dx = t.clientX - sonFareX;
      const dy = t.clientY - sonFareY;
      surukleMesafe += Math.abs(dx) + Math.abs(dy);
      sonFareX = t.clientX;
      sonFareY = t.clientY;
      bakis.setFromQuaternion(camera.quaternion);
      bakis.y -= dx * 0.004;
      bakis.x -= dy * 0.004;
      bakis.x = THREE.MathUtils.clamp(bakis.x, -1.4, 1.4);
      camera.quaternion.setFromEuler(bakis);
      break;
    }
  }
}, {passive: true});

addEventListener("touchend", (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === dokunBakisId) {
      surukleniyor = false;
      dokunBakisId = null;
      break;
    }
  }
});

// ---------- Sanal Joystick (Mobil) ----------
let joyAktif = false, joyId = null, joyX = 0, joyY = 0;
const joyZone = qs("#joystick-zone");
const joyKnob = qs("#joystick-knob");

if (joyZone) {
  function joyGuncelle(cx, cy) {
    const rect = joyZone.getBoundingClientRect();
    const r = rect.width / 2;
    let dx = cx - (rect.left + r);
    let dy = cy - (rect.top + r);
    const dist = Math.hypot(dx, dy);
    if (dist > r) { dx = (dx / dist) * r; dy = (dy / dist) * r; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // Merkezde ölü bölge: parmak titremesi istemsiz yürüyüşe dönüşmesin
    if (dist < r * 0.16) { joyX = 0; joyY = 0; }
    else { joyX = dx / r; joyY = dy / r; }
  }

  joyZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (turModu) turuDurdur(); // joystick'e dokunmak otomatik turu keser
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyAktif = true;
    surukleModu = true;
    if (!gezintiAktif) { girisDenendi = true; gezintiBaslat(); }
    joyGuncelle(t.clientX, t.clientY);
  }, {passive: false});

  joyZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!joyAktif) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyId) {
        joyGuncelle(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
      }
    }
  }, {passive: false});

  const joyBitir = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyId) {
        joyAktif = false;
        joyId = null;
        joyX = 0; joyY = 0;
        joyKnob.style.transform = "translate(-50%, -50%)";
      }
    }
  };
  joyZone.addEventListener("touchend", joyBitir);
  joyZone.addEventListener("touchcancel", joyBitir);
}

// ---------- Otomatik Tur Modu ----------
let turModu = false;
let turYon = -1;     // -1: salonun sonuna doğru, +1: kapıya dönüş
let turDonus = null; // uçlarda kamerayı yürüyüş yönüne çeviren animasyon

// Uçta yön değiştir ve kamerayı ~2.4 sn'de yeni yöne yumuşakça döndür
function turCevir(yon) {
  turYon = yon;
  bakis.setFromQuaternion(camera.quaternion);
  turDonus = { bas: bakis.y, hedef: yon < 0 ? 0 : Math.PI, t: 0 };
}

function turDonusGuncelle(dt) {
  if (!turDonus) return;
  turDonus.t = Math.min(turDonus.t + dt / 2.4, 1);
  const k = THREE.MathUtils.smoothstep(turDonus.t, 0, 1);
  let fark = turDonus.hedef - turDonus.bas;
  fark = Math.atan2(Math.sin(fark), Math.cos(fark)); // en kısa yay
  bakis.setFromQuaternion(camera.quaternion); // kullanıcının o anki eğimi korunur
  bakis.y = turDonus.bas + fark * k;
  camera.quaternion.setFromEuler(bakis);
  if (turDonus.t >= 1) turDonus = null;
}

// Kullanıcı fareyle bakınmaya başlarsa otomatik dönüşü ona bırak
controls.addEventListener("change", () => { turDonus = null; });

const btnOtotur = qs("#btn-ototur");

function turuDurdur() {
  turModu = false;
  turDonus = null;
  if (btnOtotur) {
    btnOtotur.textContent = "✦ Otomatik Tur";
    btnOtotur.style.background = "";
  }
}

if (btnOtotur) {
  btnOtotur.addEventListener("click", (e) => {
    e.stopPropagation();
    turModu = !turModu;
    btnOtotur.textContent = turModu ? "■ Turu Durdur" : "✦ Otomatik Tur";
    btnOtotur.style.background = turModu ? "rgba(201, 162, 39, 0.35)" : "";
  });
}

// ---------- Lightbox ----------
const lightbox = qs("#lightbox");
const lbImg = qs("#lb-img");
const lbBaslik = qs("#lb-baslik");
const lbNot = qs("#lb-not");
const kayitMesaj = qs("#kayit-mesaj");
let acikFoto = null;
let lightboxAcik = false;

// Yayın modunda inceleme paneli salt okunur
if (!DUZENLE) {
  lbBaslik.readOnly = true;
  lbNot.readOnly = true;
  qs("#btn-kaydet").style.display = "none";
  const ipucuSatiri = qs("#not-ipucu");
  if (ipucuSatiri) ipucuSatiri.style.display = "none";
}

function lightboxAc(foto) {
  acikFoto = foto;
  lightboxAcik = true;
  lbImg.src = foto.src;
  lbImg.alt = foto.baslik || "";
  lbBaslik.value = foto.baslik || "";
  lbNot.value = foto.not || "";
  kayitMesaj.textContent = "";
  lightbox.classList.remove("hidden");
  qs("#hud").classList.add("hidden");
  controls.unlock();
}

function lightboxKapatVeDon() {
  lightboxAcik = false;
  lightbox.classList.add("hidden");
  if (surukleModu) gezintiBaslat();
  else controls.lock();
}

qs("#btn-kaydet").addEventListener("click", () => {
  if (!acikFoto) return;
  acikFoto.baslik = lbBaslik.value.trim();
  acikFoto.not = lbNot.value.trim();
  yerelNotKaydet(acikFoto.id, acikFoto.baslik, acikFoto.not);
  const plaket = plaketler.get(acikFoto.id);
  if (plaket) {
    plaket.material.map.dispose();
    plaket.material.map = plaketDokusuCiz(acikFoto.baslik, acikFoto.not);
    plaket.material.needsUpdate = true;
  }
  lightboxKapatVeDon();
});

qs("#btn-kapat").addEventListener("click", lightboxKapatVeDon);

document.body.addEventListener("click", (e) => {
  if (!gezintiAktif || !hedefEser) return;
  if (e.target.closest("button, a, input, textarea")) return;
  if (surukleModu && surukleMesafe > 6) return;
  if (performance.now() - girisZamani < 400) return; // giriş tıklaması eseri açmasın
  lightboxAc(hedefEser.userData.foto);
});

// ---------- Giriş ekranı / duraklatma ----------
const giris = qs("#giris");
const btnGir = qs("#btn-gir");
let girisZamani = 0;

function gezintiBaslat() {
  gezintiAktif = true;
  girisZamani = performance.now();
  giris.classList.add("hidden");
  qs("#hud").classList.remove("hidden");
  crosshair.classList.toggle("hidden", surukleModu);
}

function gezintiDurdur() {
  gezintiAktif = false;
  document.body.style.cursor = "";
  qs("#hud").classList.add("hidden");
  if (!lightboxAcik) {
    giris.classList.remove("hidden");
    btnGir.textContent = "Devam Et";
  }
}

// Fare kilidi hiç çalışmazsa sürükle-bak moduna geç.
// girisDenendi şartı: bazı gömülü ortamlar kendiliğinden pointerlockerror
// üretiyor; kullanıcı butona basmadan galeriye düşmeyelim.
let girisDenendi = false;

function surukleyeGec() {
  if (kilitCalisti || !girisDenendi) return;
  surukleModu = true;
  const fareIpucu = qs("#ipucu-fare");
  if (fareIpucu) fareIpucu.innerHTML = "<kbd>Fare</kbd> basılı tut & sürükle";
  gezintiBaslat();
}

document.addEventListener("pointerlockerror", surukleyeGec);

btnGir.addEventListener("click", () => {
  girisDenendi = true;
  sesBaslat(); // AudioContext ancak kullanıcı jestiyle açılabilir
  if (surukleModu) { gezintiBaslat(); return; }
  const zamanlayici = setTimeout(surukleyeGec, 800);
  controls.addEventListener("lock", () => clearTimeout(zamanlayici), { once: true });
  try {
    controls.lock();
  } catch {
    clearTimeout(zamanlayici);
    surukleyeGec();
  }
});

controls.addEventListener("lock", () => {
  kilitCalisti = true;
  gezintiBaslat();
});

controls.addEventListener("unlock", gezintiDurdur);

addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (lightboxAcik) {
    lightboxAcik = false;
    lightbox.classList.add("hidden");
    gezintiDurdur();
  } else if (surukleModu && gezintiAktif) {
    gezintiDurdur();
  }
});

// ---------- Başlat ----------
async function baslat() {
  let veri;
  try {
    const yanit = await fetch(`data/${GEZI}.json`, { cache: "no-store" });
    if (!yanit.ok) throw new Error(yanit.status);
    veri = await yanit.json();
  } catch {
    qs("#giris-baslik").textContent = "Galeri bulunamadı";
    qs("#giris-aciklama").textContent = `"data/${GEZI}.json" dosyası okunamadı.`;
    return;
  }

  // Yerel not değişiklikleri yalnızca düzenleme modunda uygulanır;
  // ziyaretçiler her zaman manifestteki metinleri görür.
  if (DUZENLE) {
    const kayitli = yerelNotlar();
    for (const f of veri.fotograflar) {
      if (kayitli[f.id]) {
        f.baslik = kayitli[f.id].baslik ?? f.baslik;
        f.not = kayitli[f.id].not ?? f.not;
      }
    }
  }

  qs("#giris-baslik").textContent = veri.baslik;
  qs("#giris-aciklama").textContent =
    `${veri.aciklama || ""}  ·  ${veri.fotograflar.length} eser`;
  document.title = `${veri.baslik} — Sanal Galeri`;

  muzikKur(veri);

  const hol = holKur(veri.fotograflar.length, veri.baslik, veri.aciklama);
  const L = hol.L;
  kanatNesneleri = hol.kanatlar;

  // 22 esere kadar gerçek spot ışığı; üzerinde sahte ışık gölü (performans)
  const gercekSpot = veri.fotograflar.length <= 22;

  veri.fotograflar.forEach((foto, i) => {
    const taraf = i % 2 === 0 ? -1 : 1;
    const sira = Math.floor(i / 2);
    const z = L / 2 - 6 - sira * 3.7;
    tabloOlustur(foto, i, taraf, z, gercekSpot);
  });

  // Lobinin arkasındaki çay odası
  evKur(veri.fotograflar);

  // Lobide doğ, yüzün kapıya (L/2'ye) dönük
  const pObj = controls.getObject();
  pObj.position.set(0, 1.7, L / 2 + 4.5);
  pObj.rotation.set(0, 0, 0); // Lobi +Z'de, kapı +Z'nin tersi (-Z)'de olduğu için rotation 0,0,0 kapıya bakar.

  btnGir.disabled = false;
  btnGir.textContent = "Salona Gir";

  renderer.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.05);
    zaman += dt;

    // Mesafe bazlı otomatik kapı: erken açılır ki yürüyüş hiç kesilmesin
    const kapiMesafe = Math.abs(pObj.position.z - (L / 2));
    const kapiAcikYeni = gezintiAktif && kapiMesafe < 4.2;
    if (kapiAcikYeni !== kapiAcik) {
      kapiAcik = kapiAcikYeni;
      kapiSesi(kapiAcik); // menteşe gıcırtısı
      // Kapı ilk açıldığında müziği başlat
      if (kapiAcik) muzikOynat();
    }

    // Kapı animasyonu
    if (kapiAcik) {
      if (kapiAcilmaOrani < 1) kapiAcilmaOrani += dt * 2.0;
      if (kapiAcilmaOrani > 1) kapiAcilmaOrani = 1;
    } else {
      if (kapiAcilmaOrani > 0) kapiAcilmaOrani -= dt * 1.2;
      if (kapiAcilmaOrani < 0) kapiAcilmaOrani = 0;
    }

    const ease = 1 - Math.pow(1 - kapiAcilmaOrani, 3);
    const aci = ease * (Math.PI / 2 + 0.3); // 100 küsur derece
    kanatNesneleri.forEach(k => {
      k.pivot.rotation.y = -k.sx * aci; // İçeriye (negatif yöne) açılsın
    });

    // Çay odasının sürme kapısı: yaklaşınca yana kayar
    if (surmePanel) {
      const mesafe2 = Math.abs(pObj.position.z - EV.basi);
      const kapi2Yeni = gezintiAktif && mesafe2 < 3.0;
      if (kapi2Yeni !== kapi2Acik) {
        kapi2Acik = kapi2Yeni;
        kapiSesi(kapi2Acik);
      }
      if (kapi2Acik) kapi2AcilmaOrani = Math.min(1, kapi2AcilmaOrani + dt * 1.6);
      else kapi2AcilmaOrani = Math.max(0, kapi2AcilmaOrani - dt * 1.1);
      const ease2 = 1 - Math.pow(1 - kapi2AcilmaOrani, 3);
      surmePanel.position.x = ease2 * 1.85; // duvarın arkasına kayar
    }

    hareketGuncelle(dt);
    turDonusGuncelle(dt);
    hedefGuncelle();
    sakuraGuncelle(dt);
    renderer.render(scene, camera);
  });

  // Tanılama (konsoldan erişim için)
  window.__galeri = { scene, renderer, camera, controls, eserler, veri, HOL, EV, sakura, zamanOku: () => zaman };
}

baslat();
