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

// ---------- Tema sistemi ----------
// Motor tek: temel salon deneyimi bütün gezilerde aynı kalır. Mekân
// hissini veren dokunuşlar temadan gelir. Yeni bir gezi salonu açmak =
// data/<gezi>.json yazmak + (istenirse) buraya bir tema kaydı eklemek.
// Manifest "tema" alanıyla kayıt seçebilir; yoksa gezi adı denenir.
const TEMALAR = {
  varsayilan: {
    parcaciklar: null,   // havada süzülen parçacık yok
    isiklikDeseni: null, // düz süt beyazı tavan ışıklığı
    plaketMuhru: false,
    slogan: "— SONSUZLUĞA ASILI ANILAR —",
  },
  japonya: {
    parcaciklar: "sakura", // kiraz çiçeği yağmuru + yerde birikme
    isiklikDeseni: "shoji", // ışıklıkta pirinç kâğıdı kafes silueti
    plaketMuhru: true,      // ukiyo-e baskılarındaki kırmızı sanatçı mührü
    slogan: "— SONSUZLUĞA ASILI ANILAR —",
  },
};
let TEMA = TEMALAR.varsayilan;

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

// Sinematik film taneciği: statik gürültü karosu, CSS animasyonuyla kıpırdar
const gren = qs("#gren");
if (gren) {
  const gc = document.createElement("canvas");
  gc.width = gc.height = 128;
  const gx = gc.getContext("2d");
  const gv = gx.createImageData(128, 128);
  for (let i = 0; i < gv.data.length; i += 4) {
    const n = 112 + (Math.random() * 32 | 0); // orta griye yakın dar bant: overlay'de nötr
    gv.data[i] = gv.data[i + 1] = gv.data[i + 2] = n;
    gv.data[i + 3] = 255;
  }
  gx.putImageData(gv, 0, 0);
  gren.style.backgroundImage = `url(${gc.toDataURL()})`;
}

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

function shojiIsiklikDokusu() {
  // Işıklığın camının arkasında shoji kafesi varmış hissi: sıcak beyaz
  // zemin üstünde yumuşak ahşap çıta silueti
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#fff7e8";
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(146, 124, 96, 0.5)";
  x.lineWidth = 7;
  for (const k of [0, 128, 256]) {
    x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 256); x.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
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

  if (TEMA.plaketMuhru) {
    // Ukiyo-e baskılarındaki kırmızı sanatçı mührü (inkan)
    x.fillStyle = "#b0392e";
    x.beginPath(); x.arc(458, 262, 22, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "rgba(245, 238, 226, 0.9)";
    x.lineWidth = 2.5;
    x.strokeRect(447, 251, 22, 22);
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
    x.fillText(TEMA.slogan, 1024, 300);
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

  // Tavan ışıklığı (laylight) — temaya göre desen alır (Japonya: shoji)
  const isiklikMat = new THREE.MeshBasicMaterial({ color: 0xfff7e8 });
  if (TEMA.isiklikDeseni === "shoji") {
    const sd = shojiIsiklikDokusu();
    sd.repeat.set(3, Math.max(8, Math.round((L - 8) / 2.2)));
    isiklikMat.map = sd;
    isiklikMat.color.set(0xffffff); // sıcaklık dokunun kendisinden gelsin
  }
  const isiklik = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.42, L - 8), isiklikMat);
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
  
  const lobiArkaDuvar = new THREE.Mesh(new THREE.PlaneGeometry(W, H), duvarMat);
  lobiArkaDuvar.position.set(0, H / 2, L / 2 + lobiL);
  lobiArkaDuvar.rotation.y = Math.PI;
  scene.add(lobiArkaDuvar);

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

  // --- Havada süzülen parçacıklar (temaya bağlı; Japonya: kiraz çiçeği) ---
  if (TEMA.parcaciklar === "sakura") {
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
  }

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

// ---------- Videowall: holün sonundaki tam boy sinevizyon ----------
// Karşı duvar, fotoğrafların yumuşak çapraz geçişle döndüğü dev bir
// ekrandır. Başlık duvarı altta kalır: ilk kare yüklenene dek görünür.
// Bellek dostu: aynı anda en fazla iki doku tutulur, eskisi dispose edilir.
const VW_GOSTERIM = 4.2; // bir karenin ekranda kalma süresi (sn)
const VW_GECIS = 1.2;    // çapraz geçiş süresi (sn)
let videowall = null;

function videowallDokuHazirla(doku) {
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = MAKS_ANIZO;
  // Duvarı doldur (cover): oranı bozmadan ortadan kırp
  const duvarOran = HOL.W / HOL.H;
  const resimOran = doku.image.width / doku.image.height;
  if (resimOran > duvarOran) {
    const r = duvarOran / resimOran;
    doku.repeat.set(r, 1);
    doku.offset.set((1 - r) / 2, 0);
  } else {
    const r = resimOran / duvarOran;
    doku.repeat.set(1, r);
    doku.offset.set(0, (1 - r) / 2);
  }
  return doku;
}

function videowallKur(fotograflar) {
  if (!fotograflar.length) return;
  const panelYap = (z) => {
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    m.toneMapped = false; // fotoğraf renkleri solmasın
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(HOL.W, HOL.H), m);
    mesh.position.set(0, HOL.H / 2, z);
    scene.add(mesh);
    return mesh;
  };
  const alt = panelYap(-HOL.L / 2 + 0.035);
  const ust = panelYap(-HOL.L / 2 + 0.037);
  videowall = { alt, ust, sira: 0, bekleme: 0, gecis: -1, yukleniyor: false, fotograflar };
  dokuYukleyici.load(fotograflar[0].src, (doku) => {
    alt.material.map = videowallDokuHazirla(doku);
    alt.material.opacity = 1;
    alt.material.needsUpdate = true;
  });
}

function videowallGuncelle(dt) {
  if (!videowall) return;
  const v = videowall;
  if (v.gecis >= 0) {
    v.gecis += dt / VW_GECIS;
    const k = Math.min(v.gecis, 1);
    v.ust.material.opacity = k * k * (3 - 2 * k); // smoothstep
    if (k >= 1) {
      // Üstteki kare kalıcı görüntü oldu: alta indir, üstü boşalt
      const eski = v.alt.material.map;
      v.alt.material.map = v.ust.material.map;
      v.alt.material.opacity = 1;
      v.alt.material.needsUpdate = true;
      v.ust.material.opacity = 0;
      v.ust.material.map = null;
      v.ust.material.needsUpdate = true;
      if (eski) eski.dispose();
      v.gecis = -1;
      v.bekleme = 0;
    }
  } else {
    v.bekleme += dt;
    if (v.bekleme >= VW_GOSTERIM && !v.yukleniyor) {
      v.yukleniyor = true;
      v.sira = (v.sira + 1) % v.fotograflar.length;
      dokuYukleyici.load(
        v.fotograflar[v.sira].src,
        (doku) => {
          v.yukleniyor = false;
          v.ust.material.map = videowallDokuHazirla(doku);
          v.ust.material.opacity = 0;
          v.ust.material.needsUpdate = true;
          v.gecis = 0;
        },
        undefined,
        () => { v.yukleniyor = false; v.bekleme = 0; } // yüklenemedi: sıradakine geç
      );
    }
  }
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

  p.x = THREE.MathUtils.clamp(p.x, -(HOL.W / 2 - 0.7), HOL.W / 2 - 0.7);

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

  p.z = THREE.MathUtils.clamp(p.z, -(HOL.L / 2 - 0.9), HOL.L / 2 + 6.5);

  const tempo = Math.hypot(hiz.x, hiz.z);
  adimFazi += dt * tempo * 1.9;
  p.y = 1.7 + Math.sin(adimFazi) * Math.min(tempo / 40, 1) * 0.045;
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

// Tur sırasında joystick yürüyüşü değil BAKIŞI yönetir: kullanıcının eli
// bakış değiştirmek için zaten joysticke gidiyor — tur kesilmez, kamera döner.
// Tur kapalıyken joystick her zamanki gibi yürütür (hareketGuncelle).
function joyBakisGuncelle(dt) {
  if (!turModu || !gezintiAktif || !joyAktif) return;
  if (joyX === 0 && joyY === 0) return;
  turDonus = null; // kamerayı kullanıcı devraldı
  bakis.setFromQuaternion(camera.quaternion);
  bakis.y -= joyX * dt * 1.8;
  bakis.x -= joyY * dt * 1.2;
  bakis.x = THREE.MathUtils.clamp(bakis.x, -1.4, 1.4);
  camera.quaternion.setFromEuler(bakis);
}

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

  // Tema seçimi: manifest "tema" alanı > gezi adıyla eşleşen kayıt > varsayılan
  TEMA = TEMALAR[veri.tema] || TEMALAR[GEZI] || TEMALAR.varsayilan;

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

  // Holün sonundaki duvar: tam boy sinevizyon
  videowallKur(veri.fotograflar);

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

    // Müzik mekâna göre: lobide kısık, salonda tam — yumuşak geçişle
    if (muzik && !muzik.paused) {
      const hedefSes = pObj.position.z < L / 2 ? 0.3 : 0.12;
      muzik.volume += (hedefSes - muzik.volume) * Math.min(dt * 1.2, 1);
    }

    hareketGuncelle(dt);
    turDonusGuncelle(dt);
    joyBakisGuncelle(dt);
    hedefGuncelle();
    sakuraGuncelle(dt);
    videowallGuncelle(dt);
    renderer.render(scene, camera);
  });

  // Tanılama (konsoldan erişim için)
  window.__galeri = { scene, renderer, camera, controls, eserler, veri, HOL, sakura, zamanOku: () => zaman };
}

baslat();
