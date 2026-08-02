// ===== Gezi Galerim — 3B sanal müze motoru (gerçekçi hol sürümü) =====
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

// ---------- Yardımcılar ----------
const qs = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const GEZI = params.get("gezi");           // null => hub (giriş salonu)
const HUB_MODU = !GEZI;
// akis=1: ziyaretçi bir kapıdan yürüyerek geldi. Karşılama ekranı gösterilmez,
// gezinti anında sürer — bölümler ayrı sayfalar olsa da tek bina gibi akar.
const AKIS = params.get("akis") === "1";
// Tek bina: hub ve sergiler aynı sahnede yaşar. Ziyaretçi koridordayken
// hedef salon arka planda kurulur; yürüyüş hiç kesilmez, sayfa değişmez.
const TEK_BINA = HUB_MODU;
const NOT_ANAHTARI = `galeriNotlar:${GEZI || "hub"}`;
// Yayın modu: notlar salt okunur. Sahibi ?duzenle=1 ile düzenlemeyi açabilir.
const DUZENLE = params.get("duzenle") === "1";

// ---------- Gezi kayıt defteri (genişletilebilir) ----------
// Lobi bir "hub"tır: her gezinin bir kapısı vardır. Açık gezinin kapısı
// salona götürür; "yakinda" olanlar kapalı portal + tabela olarak durur.
// Yeni gezi eklemek = buraya bir satır + data/<id>.json. Sıra, lobide
// hangi duvara düşeceğini belirler (sol, sağ, arka).
const GEZILER = [
  // muzik: kapıya yaklaşınca çalan parça. Tayland'ınki şimdilik yer tutucu.
  { id: "japonya", ad: "Japonya", altbaslik: "2026",   renk: 0xbf2b25, durum: "acik",    muzik: "assets/japonya/muzik.mp3" },
  { id: "tayland", ad: "Tayland", altbaslik: "2026",   renk: 0xd9a441, durum: "acik",    muzik: "assets/japonya/muzik.mp3" },
  { id: "bali",    ad: "Bali",    altbaslik: "2026",    renk: 0x1f8a70, durum: "acik",    muzik: "assets/japonya/muzik.mp3" },
  { id: "misir",   ad: "Mısır",   altbaslik: "2026",    renk: 0xc9a227, durum: "acik",    muzik: "assets/japonya/muzik.mp3" },
];

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
    dekor: null,         // kenar-köşe dekorasyon yok
  },
  japonya: {
    parcaciklar: "sakura", // kiraz çiçeği yağmuru + yerde birikme
    isiklikDeseni: "shoji", // ışıklıkta pirinç kâğıdı kafes silueti
    plaketMuhru: true,      // ukiyo-e baskılarındaki kırmızı sanatçı mührü
    slogan: "— SONSUZLUĞA ASILI ANILAR —",
    // Torii artık serginin KAPISINI çerçeveliyor (kapiGecidi); salon içi
    // sade kalsın diye burada yalnızca dingin öğeler var.
    dekor: { tasFener: true, chochin: true },
  },
  tayland: {
    // Tayland'ın imzası: Yi Peng gökyüzü fenerleri. Düşen çiçek değil,
    // ağır ağır YÜKSELEN sıcak fanuslar; tavana yaklaşırken sönümlenir.
    parcaciklar: "fener",
    isiklikDeseni: null,
    plaketMuhru: false,
    slogan: "— UZAK DİYARLARDAN ANILAR —",
    dekor: { thaiFanus: true, altinStupa: true },
  },
  misir: {
    // Çölün tozu ışıkta asılı kalır: yavaş süzülen altın zerreler.
    parcaciklar: "toz",
    isiklikDeseni: null,
    plaketMuhru: false,
    slogan: "— ÇÖLÜN HAFIZASI —",
    dekor: { stel: true, mesale: true },
  },
  bali: {
    // Bali'nin çiçeği frangipani: yere düşüp birikir.
    parcaciklar: "plumeria",
    isiklikDeseni: null,
    plaketMuhru: false,
    slogan: "— TANRILAR ADASINDAN —",
    dekor: { tasHeykel: true, yesillik: true },
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
// ---------- Geçiş perdesi ----------
// Kapıdan geçerken kararır, yeni bölüm açılınca çözülür. Sayfa değişse de
// ziyaretçi tek bir binanın içinde yürüyormuş gibi hisseder.
const perde = qs("#perde");
if (perde && AKIS) perde.classList.add("kapali"); // kapıdan gelindi: siyahla başla

function perdeKapatVeGit(url) {
  if (perde) perde.classList.add("kapali");
  setTimeout(() => { location.href = url; }, 380);
}

function perdeAc() {
  if (perde) requestAnimationFrame(() => perde.classList.remove("kapali"));
}

const canvas = qs("#sahne");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const MAKS_ANIZO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();

// Salon inşası hedefi. Tek bina modunda salon, kapının arkasına asılan bir
// gruba kurulur; hub doğrudan sahneye. ekle() bu hedefi kullanır.
// Hub ile salonların ORTAK kullandığı dokular. Salon sökülürken bunlar
// imha edilmemeli: aynı nesneleri hub kapıları da kullanıyor; imha edilince
// kapılar dokusuz kalıyor ve her geçişte yeniden GPU'ya yükleniyordu.
const PAYLASILAN_DOKULAR = new Set();

let EKLE = scene;
function ekle(...nesneler) { EKLE.add(...nesneler); return EKLE; }
scene.background = new THREE.Color(0x0d0b09);

// --- IŞIK BÜTÇESİ (dokunmadan önce oku) ---------------------------------
// Tek bina modunda tüm sergiler AYNI sahnede duruyor, dolayısıyla sahnedeki
// her ışık her MeshStandardMaterial'in shader'ına giriyor. three.js ışık
// sayısına göre program derler; ışıklar arttıkça fragment shader'ın uniform
// ihtiyacı büyür. Masaüstü GPU'lar 4096 vec4 bildirdiği için sorun görünmez,
// telefonlarda sınır çoğu zaman 256-1024'tür: aşıldığında program LINK
// EDİLEMEZ ve ışıklı her yüzey SİYAH çizilir (MeshBasicMaterial'ler görünmeye
// devam ettiği için "sadece fotoğraflar duruyor" gibi görünür — tam olarak
// bu hata yaşandı: eser başına SpotLight ile 20+ spot birikmişti).
// Kural: eser/dekor başına ışık YOK. Işık yerine sahte ışık gölü dokusu,
// kendinden aydınlık (Basic) yüzey veya additive parıltı kullan.
// Hedef tavan: 0 spot, <=6 point, <=4 rectarea, 1 ambient, 1 hemisphere.
// ------------------------------------------------------------------------

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
ekle(controls.getObject());

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Prosedürel dokular ----------
// Pahalı dokular (mermer, sıva) bir kez üretilir; her salon kurulumunda
// yeniden çizmek 2-3 saniyelik donmaya yol açıyordu. Kopyalar aynı kaynağı
// paylaşır: GPU'ya tek yükleme, ayrı repeat/offset. Kopyalar imha edilmez.
const _dokuOnbellek = new Map();
function onbellekliDoku(ad, uret) {
  let temel = _dokuOnbellek.get(ad);
  if (!temel) { temel = uret(); _dokuOnbellek.set(ad, temel); }
  const kopya = temel.clone();
  kopya.needsUpdate = true;
  kopya.userData.paylasilanKaynak = true; // salonSok bunu imha etmez
  return kopya;
}

function mermerZeminDokusu() {
  return onbellekliDoku("mermer", mermerZeminDokusuUret);
}

function sivaDokusu() {
  return onbellekliDoku("siva", sivaDokusuUret);
}

function cevizDokusu() {
  return onbellekliDoku("ceviz", cevizDokusuUret);
}

function mermerZeminDokusuUret() {
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

function sivaDokusuUret() {
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

function cevizDokusuUret() {
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

function plumeriaDokusu() {
  // Frangipani (jepun) çiçeğinin TAMAMI — Bali'nin imzası tek yaprak değil,
  // beş yaprağı fırıldak gibi bindirilmiş, ortası sarı, beyaz çiçektir.
  // Tapınak kapılarında, kulak arkasında, sunularda hep bütün haliyle durur.
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const M = 64;

  const yaprakCiz = (aci) => {
    x.save();
    x.translate(M, M);
    x.rotate(aci);
    const g = x.createLinearGradient(0, 0, 0, -56);
    g.addColorStop(0, "#ffd875");     // dipte sıcak sarı göbek
    g.addColorStop(0.32, "#fff6d8");
    g.addColorStop(0.75, "#ffffff");
    g.addColorStop(1, "#f6f1e4");     // uçta hafif kırık beyaz
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 2);
    // sol kenar: göbekten dışa doğru açılan geniş yay
    x.bezierCurveTo(-24, -10, -31, -40, -12, -55);
    // yuvarlak uç
    x.quadraticCurveTo(0, -62, 13, -53);
    // sağ kenar: fırıldak dönüşünü veren daha dik dönüş
    x.bezierCurveTo(27, -37, 20, -11, 0, 2);
    x.closePath();
    x.fill();
    // yaprak ortasında çok hafif damar gölgesi — düz beyaz lekeyi kırar
    x.strokeStyle = "rgba(214, 198, 158, 0.35)";
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(-2, -6);
    x.quadraticCurveTo(-6, -30, 1, -48);
    x.stroke();
    x.restore();
  };

  // Bindirme sırası önemli: her yaprak bir sonrakinin altında kalsın
  for (let i = 4; i >= 0; i--) yaprakCiz((i * Math.PI * 2) / 5);

  // Göbek: sarı ışıltı
  const gob = x.createRadialGradient(M, M, 1, M, M, 17);
  gob.addColorStop(0, "rgba(255, 205, 74, 0.95)");
  gob.addColorStop(0.55, "rgba(255, 224, 140, 0.55)");
  gob.addColorStop(1, "rgba(255, 235, 175, 0)");
  x.fillStyle = gob;
  x.beginPath(); x.arc(M, M, 17, 0, Math.PI * 2); x.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function khomLoiDokusu() {
  // Yi Peng gökyüzü feneri: içten aydınlanan sıcak altın fanus + halesi
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  // Dış hale
  const hale = x.createRadialGradient(32, 34, 2, 32, 34, 31);
  hale.addColorStop(0, "rgba(255, 214, 132, 0.95)");
  hale.addColorStop(0.35, "rgba(255, 179, 84, 0.45)");
  hale.addColorStop(1, "rgba(255, 150, 60, 0)");
  x.fillStyle = hale;
  x.fillRect(0, 0, 64, 64);
  // Fanus gövdesi (hafif silindirik, altı dar)
  const govde = x.createLinearGradient(0, 14, 0, 52);
  govde.addColorStop(0, "#ffe9b0");
  govde.addColorStop(0.5, "#ffcf72");
  govde.addColorStop(1, "#ff9f3d");
  x.fillStyle = govde;
  x.beginPath();
  x.moveTo(22, 16);
  x.quadraticCurveTo(32, 12, 42, 16);
  x.lineTo(40, 46);
  x.quadraticCurveTo(32, 50, 24, 46);
  x.closePath();
  x.fill();
  // Alt ağızdaki alev
  x.fillStyle = "rgba(255, 246, 214, 0.9)";
  x.beginPath(); x.ellipse(32, 47, 4, 3, 0, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Mısır steli: kireç taşı levhaya oyulmuş hiyeroglif sütunları.
// Bilinçli olarak dokuya dayanıyor — kutu geometrisinden yontulan heykeller
// yakından bakınca oyuncak gibi duruyor, oysa düz bir levhanın üstündeki
// çizim kabartma yanılsamasını uzaktan da yakından da koruyor.
function stelDokusu() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 1024;
  const x = c.getContext("2d");

  // Kireç taşı zemin + damar
  x.fillStyle = "#cdb489";
  x.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 2600; i++) {
    const r = Math.random();
    x.fillStyle = r < 0.5 ? "rgba(255,246,224,0.16)" : "rgba(120,98,64,0.13)";
    x.fillRect(Math.random() * 512, Math.random() * 1024, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }

  // Oyma yanılsaması: her işaret iki kez çizilir. Önce bir tık aşağı
  // kaydırılmış AÇIK kopya (oyuğun ışık alan alt dudağı), sonra üstüne
  // koyu asıl oyuk. Bu yüzden çizim rengi değişken.
  const OYUK_KOYU = "#7d6236";
  const OYUK_ACIK = "#fff3d8";
  let OYUK = OYUK_KOYU;
  const KENAR = "rgba(255,247,226,0.75)";

  // Çift çerçeve (kabartma bordür)
  x.strokeStyle = OYUK; x.lineWidth = 7;
  x.strokeRect(26, 26, 460, 972);
  x.lineWidth = 2.5;
  x.strokeRect(44, 44, 424, 936);

  // --- Üst alınlık: kanatlı güneş kursu ---
  const kursY = 118;
  x.save();
  x.fillStyle = OYUK;
  // kanatlar
  for (const yon of [-1, 1]) {
    x.beginPath();
    x.moveTo(256 + yon * 26, kursY);
    x.quadraticCurveTo(256 + yon * 120, kursY - 30, 256 + yon * 196, kursY - 6);
    x.quadraticCurveTo(256 + yon * 120, kursY + 6, 256 + yon * 96, kursY + 30);
    x.quadraticCurveTo(256 + yon * 70, kursY + 14, 256 + yon * 26, kursY + 16);
    x.closePath(); x.fill();
    // tüy çizgileri
    x.strokeStyle = "rgba(205,180,137,0.85)"; x.lineWidth = 2;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      x.beginPath();
      x.moveTo(256 + yon * (30 + t * 160), kursY - 16 + t * 8);
      x.lineTo(256 + yon * (34 + t * 150), kursY + 6 + t * 16);
      x.stroke();
    }
  }
  // güneş kursu + iki kobra
  x.fillStyle = "#8a6a33";
  x.beginPath(); x.arc(256, kursY, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = OYUK;
  for (const yon of [-1, 1]) {
    x.beginPath();
    x.moveTo(256 + yon * 12, kursY + 26);
    x.quadraticCurveTo(256 + yon * 40, kursY + 34, 256 + yon * 34, kursY + 60);
    x.quadraticCurveTo(256 + yon * 20, kursY + 44, 256 + yon * 6, kursY + 44);
    x.closePath(); x.fill();
  }
  x.restore();

  // Alınlığı gövdeden ayıran çizgi
  x.strokeStyle = OYUK; x.lineWidth = 4;
  x.beginPath(); x.moveTo(60, 208); x.lineTo(452, 208); x.stroke();

  // --- Hiyeroglif sütunları ---
  // Küçük bir işaret dağarcığı: uzaktan bakınca "yazı" olarak okunur,
  // yakından da her biri tanınır bir silüettir.
  const isaretler = [
    (a, b, s) => { // ankh
      x.lineWidth = s * 0.14; x.strokeStyle = OYUK;
      x.beginPath(); x.ellipse(a, b - s * 0.26, s * 0.2, s * 0.24, 0, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(a, b - s * 0.02); x.lineTo(a, b + s * 0.46); x.stroke();
      x.beginPath(); x.moveTo(a - s * 0.28, b + s * 0.04); x.lineTo(a + s * 0.28, b + s * 0.04); x.stroke();
    },
    (a, b, s) => { // su (n): üç dalga
      x.lineWidth = s * 0.1; x.strokeStyle = OYUK;
      for (let k = -1; k <= 1; k++) {
        x.beginPath();
        x.moveTo(a - s * 0.34, b + k * s * 0.22);
        for (let i = 0; i < 3; i++) {
          x.quadraticCurveTo(a - s * 0.34 + s * 0.11 + i * s * 0.23, b + k * s * 0.22 - s * 0.12,
                             a - s * 0.34 + s * 0.23 + i * s * 0.23, b + k * s * 0.22);
        }
        x.stroke();
      }
    },
    (a, b, s) => { // Horus gözü
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a - s * 0.36, b);
      x.quadraticCurveTo(a, b - s * 0.3, a + s * 0.34, b - s * 0.04);
      x.quadraticCurveTo(a, b + s * 0.24, a - s * 0.36, b);
      x.closePath(); x.fill();
      x.fillStyle = "#cdb489";
      x.beginPath(); x.arc(a + s * 0.02, b - s * 0.03, s * 0.09, 0, Math.PI * 2); x.fill();
      x.strokeStyle = OYUK; x.lineWidth = s * 0.08;
      x.beginPath(); x.moveTo(a + s * 0.1, b + s * 0.14); x.lineTo(a + s * 0.02, b + s * 0.42); x.stroke();
    },
    (a, b, s) => { // kuş (şahin silüeti)
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a - s * 0.34, b + s * 0.2);
      x.quadraticCurveTo(a - s * 0.1, b - s * 0.12, a + s * 0.22, b - s * 0.2);
      x.quadraticCurveTo(a + s * 0.4, b - s * 0.22, a + s * 0.36, b - s * 0.08);
      x.quadraticCurveTo(a + s * 0.1, b + s * 0.06, a - s * 0.1, b + s * 0.3);
      x.closePath(); x.fill();
      x.lineWidth = s * 0.07; x.strokeStyle = OYUK;
      x.beginPath(); x.moveTo(a - s * 0.08, b + s * 0.28); x.lineTo(a - s * 0.08, b + s * 0.46); x.stroke();
      x.beginPath(); x.moveTo(a + s * 0.06, b + s * 0.24); x.lineTo(a + s * 0.06, b + s * 0.46); x.stroke();
    },
    (a, b, s) => { // maat tüyü
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a, b - s * 0.44);
      x.quadraticCurveTo(a + s * 0.2, b - s * 0.1, a + s * 0.06, b + s * 0.44);
      x.quadraticCurveTo(a - s * 0.14, b - s * 0.06, a, b - s * 0.44);
      x.closePath(); x.fill();
    },
    (a, b, s) => { // sepet (nb)
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a - s * 0.36, b - s * 0.06);
      x.quadraticCurveTo(a, b + s * 0.34, a + s * 0.36, b - s * 0.06);
      x.quadraticCurveTo(a, b + s * 0.06, a - s * 0.36, b - s * 0.06);
      x.closePath(); x.fill();
    },
    (a, b, s) => { // güneş kursu (ra)
      x.strokeStyle = OYUK; x.lineWidth = s * 0.11;
      x.beginPath(); x.arc(a, b, s * 0.26, 0, Math.PI * 2); x.stroke();
      x.fillStyle = OYUK;
      x.beginPath(); x.arc(a, b, s * 0.08, 0, Math.PI * 2); x.fill();
    },
    (a, b, s) => { // saz yaprağı (i)
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a, b + s * 0.46);
      x.lineTo(a - s * 0.06, b - s * 0.16);
      x.quadraticCurveTo(a, b - s * 0.5, a + s * 0.12, b - s * 0.2);
      x.lineTo(a + s * 0.05, b + s * 0.46);
      x.closePath(); x.fill();
    },
    (a, b, s) => { // ağız (r)
      x.fillStyle = OYUK;
      x.beginPath(); x.ellipse(a, b, s * 0.34, s * 0.1, 0, 0, Math.PI * 2); x.fill();
    },
    (a, b, s) => { // oturan figür
      x.fillStyle = OYUK;
      x.beginPath(); x.arc(a - s * 0.04, b - s * 0.3, s * 0.12, 0, Math.PI * 2); x.fill();
      x.beginPath();
      x.moveTo(a - s * 0.16, b - s * 0.16);
      x.lineTo(a + s * 0.04, b - s * 0.16);
      x.lineTo(a + s * 0.1, b + s * 0.2);
      x.lineTo(a + s * 0.34, b + s * 0.2);
      x.lineTo(a + s * 0.34, b + s * 0.34);
      x.lineTo(a - s * 0.16, b + s * 0.34);
      x.closePath(); x.fill();
    },
    (a, b, s) => { // sunak / kâse
      x.fillStyle = OYUK;
      x.fillRect(a - s * 0.3, b + s * 0.1, s * 0.6, s * 0.12);
      x.beginPath();
      x.moveTo(a - s * 0.22, b + s * 0.1);
      x.quadraticCurveTo(a, b - s * 0.36, a + s * 0.22, b + s * 0.1);
      x.closePath(); x.fill();
    },
    (a, b, s) => { // kobra
      x.fillStyle = OYUK;
      x.beginPath();
      x.moveTo(a - s * 0.3, b + s * 0.4);
      x.quadraticCurveTo(a + s * 0.26, b + s * 0.3, a + s * 0.04, b - s * 0.08);
      x.quadraticCurveTo(a - s * 0.14, b - s * 0.42, a + s * 0.2, b - s * 0.34);
      x.quadraticCurveTo(a + s * 0.02, b - s * 0.2, a + s * 0.18, b - s * 0.02);
      x.quadraticCurveTo(a + s * 0.44, b + s * 0.34, a - s * 0.3, b + s * 0.46);
      x.closePath(); x.fill();
    },
  ];

  const SUT = 4, sutGen = 392 / SUT, ustY = 232, altY = 966;
  const satirY = 74;
  for (let s = 0; s < SUT; s++) {
    const cx = 60 + sutGen * (s + 0.5);
    // sütunları ayıran oyuk çizgi
    if (s > 0) {
      x.strokeStyle = OYUK; x.lineWidth = 3;
      x.beginPath(); x.moveTo(60 + sutGen * s, ustY); x.lineTo(60 + sutGen * s, altY); x.stroke();
      x.strokeStyle = KENAR; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(61.5 + sutGen * s, ustY); x.lineTo(61.5 + sutGen * s, altY); x.stroke();
    }
    for (let y = ustY + satirY * 0.6; y < altY - 20; y += satirY) {
      const ciz = isaretler[Math.floor(Math.random() * isaretler.length)];
      const boy = sutGen * 0.62;
      x.save(); x.translate(1.6, 2.8); x.globalAlpha = 0.6;
      OYUK = OYUK_ACIK;
      ciz(cx, y, boy);
      x.restore();
      OYUK = OYUK_KOYU;
      ciz(cx, y, boy);
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function sarmasikDokusu() {
  // Sarkan sarmaşık teli: ince sap + iki yana dizilmiş yapraklar. Alfa'lı
  // olduğu için düz yeşil şerit yerine gerçekten bitki siluetine benziyor.
  const c = document.createElement("canvas");
  c.width = 32; c.height = 256;
  const x = c.getContext("2d");
  x.strokeStyle = "#3d6b3a";
  x.lineWidth = 1.6;
  x.beginPath();
  x.moveTo(16, 0);
  x.quadraticCurveTo(11, 128, 16, 252);
  x.stroke();
  for (let i = 0; i < 11; i++) {
    const y = 14 + i * 22;
    const sag = i % 2 === 0;
    const boy = 9 + (i % 3) * 2;
    x.save();
    x.translate(16, y);
    x.rotate((sag ? 1 : -1) * (0.6 + (i % 3) * 0.12));
    x.fillStyle = i % 2 ? "#4f8f52" : "#3a6f3f";
    x.beginPath();
    x.ellipse(sag ? boy * 0.7 : -boy * 0.7, 0, boy, boy * 0.52, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  // uçta biraz seyrelt: alt kenar sertçe kesilmiş görünmesin
  const sil = x.createLinearGradient(0, 214, 0, 256);
  sil.addColorStop(0, "rgba(0,0,0,1)");
  sil.addColorStop(1, "rgba(0,0,0,0)");
  x.globalCompositeOperation = "destination-in";
  x.fillStyle = sil;
  x.fillRect(0, 214, 32, 42);
  x.globalCompositeOperation = "source-over";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tozDokusu() {
  // Çöl tozu: rüzgârda savrulan zerre. Yuvarlak bir nokta yerine hafif
  // uzamış bir iz — sürüklendiği yön böyle okunuyor.
  const c = document.createElement("canvas");
  c.width = 64; c.height = 32;
  const x = c.getContext("2d");
  // Sıcak kum rengi, beyaz çekirdek YOK: additive değil normal karışımla
  // çizildiği için aydınlık salonda beyaz benek gibi patlamıyor, görüntüyü
  // kum rengine boyuyor.
  const g = x.createRadialGradient(32, 16, 0, 32, 16, 30);
  g.addColorStop(0, "rgba(206, 170, 112, 0.85)");
  g.addColorStop(0.3, "rgba(198, 163, 108, 0.42)");
  g.addColorStop(1, "rgba(190, 158, 106, 0)");
  x.fillStyle = g;
  x.save(); x.translate(32, 16); x.scale(1, 0.5); x.translate(-32, -16);
  x.fillRect(0, 0, 64, 32);
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function kumBirikintiDokusu() {
  // Yerde biriken kum: tek tek zerre değil, kenarları dağılan yumuşak bir
  // öbek. Üst üste bindikçe zeminde savrulmuş kum tabakasına dönüşüyor.
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, "rgba(226, 201, 152, 0.85)");
  g.addColorStop(0.4, "rgba(214, 187, 137, 0.42)");
  g.addColorStop(0.75, "rgba(208, 180, 130, 0.12)");
  g.addColorStop(1, "rgba(206, 178, 128, 0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  // Kenarlarda tanecik: düz bir leke gibi durmasın. Öbeğin dış kenarına
  // taşmamalı, yoksa yan yana gelen karolar kare kenarı gösteriyor.
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 19;
    x.fillStyle = `rgba(198, 170, 120, ${0.45 - r / 60})`;
    x.fillRect(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Temaya göre havada süzülen parçacık dokusu
function parcacikDokusu() {
  if (TEMA.parcaciklar === "toz") return tozDokusu();
  if (TEMA.parcaciklar === "fener") return khomLoiDokusu();
  if (TEMA.parcaciklar === "plumeria") return plumeriaDokusu();
  return sakuraDokusu();
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

function chochinDokusu() {
  // Asılı kırmızı kağıt fener: yatay kağıt kaburgaları + ortada kanji (祭 · matsuri)
  const c = document.createElement("canvas");
  c.width = 128; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#cf2b28";
  x.fillRect(0, 0, 128, 256);
  x.strokeStyle = "rgba(120, 12, 10, 0.5)";
  x.lineWidth = 2;
  for (let y = 10; y < 256; y += 15) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke();
  }
  x.fillStyle = "#f3ead7";
  x.font = "bold 90px 'Yu Mincho', serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("祭", 64, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
  c.width = 384; c.height = 240;   // daha kucuk tuval: eser basina canvas maliyeti
  const x = c.getContext("2d");
  x.scale(384 / 512, 240 / 320);   // cizim 512x320 tabanli, oranli kucult
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

function baslikDuvariDokusu(baslik, aciklama, adet, arkaSrc) {
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
  img.src = arkaSrc || `assets/${GEZI}/gp007.jpg`;

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

function hubTabelaDokusu(ad, altbaslik, renk) {
  // Kapının üstündeki tabela: yalnızca ülke adı. Açık renkli duvarda
  // okunması için koyu, sıcak bir ton + ince altın alt çizgi kullanılır.
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 384;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 1024, 384);
  const hex = "#" + renk.toString(16).padStart(6, "0");
  x.textAlign = "center";
  x.font = "600 168px Georgia, serif";
  x.fillStyle = "rgba(24, 18, 10, 0.30)";           // yumuşak gölge: her zeminde okunur
  x.fillText((ad || "").toUpperCase(), 516, 196);
  x.fillStyle = "#2a2118";                           // koyu ceviz
  x.fillText((ad || "").toUpperCase(), 512, 192);
  x.fillStyle = hex;
  x.fillRect(372, 236, 280, 6);
  if (altbaslik) {                                   // yalnızca "Yakında" gibi durum notu
    x.font = "italic 300 54px Georgia, serif";
    x.fillStyle = "#6b5c42";
    x.fillText(altbaslik.toUpperCase(), 512, 318);
  }
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
// Bu üçü hem hub kapılarında hem salonlarda kullanılır: salon sökülürken
// imha edilmemeleri için korumaya alınır.
PAYLASILAN_DOKULAR.add(golgeDoku);
PAYLASILAN_DOKULAR.add(cevizDoku);
PAYLASILAN_DOKULAR.add(isikGolu);
let HOL = { W: 8, L: 40, H: 5.2 };
let HUB = null;            // atrium ölçüleri (holKur'da belirlenir)
const kapilar = [];        // atrium gezi kapıları (nişangâh/tık hedefleri)
let sakura = null; // havada süzülen kiraz çiçeği yaprakları

function holKur(fotoSayisi, baslik, aciklama, arkaSrc, suslemeyiErtele) {
  const tarafBasina = Math.ceil(fotoSayisi / 2);
  // Döngülü tur orta hattan yürüdüğü için hol bir tık dar tutuldu:
  // eserler ~3.9 m bakış mesafesine gelir, plaketler yürürken okunur.
  const W = 7.8, H = 5.2;
  // Hol, eser sayısına göre uzar: her esere 3.7 m + giriş/çıkış payı
  const L = Math.max(26, tarafBasina * 3.7 + 12);
  HOL = { W, L, H };

  // --- Zemin: cilalı taş ---
  // Ayna (Reflector) kaldırıldı: yürürken zeminde hayalet izler bırakıyordu
  // ve her karede sahneyi bir kez daha render ediyordu. Parlaklık artık
  // ortam haritasından geliyor — temiz ve çok daha hafif.

  const zeminDoku = mermerZeminDokusu();
  zeminDoku.repeat.set(W / 4, L / 4);
  const zemin = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({
      map: zeminDoku,
      roughness: 0.22,   // cilalı taş: ortam haritasından yumuşak parlama
      metalness: 0.18,
    })
  );
  zemin.rotation.x = -Math.PI / 2;
  zemin.position.y = 0.012;
  ekle(zemin);

  // Duvar diplerinde koyu mermer bordür şeridi
  const bordurMat = new THREE.MeshStandardMaterial({ color: 0x4d4234, roughness: 0.25, metalness: 0.1 });
  for (const taraf of [-1, 1]) {
    const bordur = new THREE.Mesh(new THREE.PlaneGeometry(0.55, L), bordurMat);
    bordur.rotation.x = -Math.PI / 2;
    bordur.position.set(taraf * (W / 2 - 0.3), 0.013, 0);
    ekle(bordur);
  }

  // --- Tavan ---
  const tavanMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const tavan = new THREE.Mesh(new THREE.PlaneGeometry(W, L), tavanMat);
  tavan.rotation.x = Math.PI / 2;
  tavan.position.y = H;
  ekle(tavan);

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
  ekle(isiklik);

  const kasaMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.5, metalness: 0.4 });
  for (const sx of [-1, 1]) {
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, L - 8), kasaMat);
    kasa.position.set(sx * W * 0.21, H - 0.05, 0);
    ekle(kasa);
  }
  for (const sz of [-1, 1]) {
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(W * 0.42, 0.1, 0.12), kasaMat);
    kasa.position.set(0, H - 0.05, sz * (L - 8) / 2);
    ekle(kasa);
  }

  const alanIsigi = new THREE.RectAreaLight(0xfff3e0, 3.1, W * 0.42, L - 8);
  alanIsigi.position.set(0, H - 0.05, 0);
  alanIsigi.rotation.x = -Math.PI / 2;
  ekle(alanIsigi);

  // --- Duvarlar ---
  const duvarDoku = sivaDokusu();
  duvarDoku.repeat.set(6, 3);
  const duvarMat = new THREE.MeshStandardMaterial({ map: duvarDoku, roughness: 0.92 });

  for (const taraf of [-1, 1]) {
    const duvar = new THREE.Mesh(new THREE.PlaneGeometry(L, H), duvarMat);
    duvar.position.set(taraf * W / 2, H / 2, 0);
    duvar.rotation.y = -taraf * Math.PI / 2;
    ekle(duvar);
  }
  // Holün sonundaki (arka) duvar
  const duvarArka = new THREE.Mesh(new THREE.PlaneGeometry(W, H), duvarMat);
  duvarArka.position.set(0, H / 2, -L / 2);
  duvarArka.rotation.y = 0;
  ekle(duvarArka);

  // --- Mimari ritim: pilastrlar (duvar) + kirişler (tavan) ---
  const pilastrMat = new THREE.MeshStandardMaterial({ color: 0xf0e9db, roughness: 0.85 });
  const kirisMat = new THREE.MeshStandardMaterial({ color: 0x261f16, roughness: 0.45, metalness: 0.3 });
  for (let s = 1.5; s * 3.7 < L - 13; s += 2) {
    const z = L / 2 - 6 - s * 3.7;

    for (const taraf of [-1, 1]) {
      const pilastr = new THREE.Mesh(new THREE.BoxGeometry(0.14, H - 0.3, 0.55), pilastrMat);
      pilastr.position.set(taraf * (W / 2 - 0.07), (H - 0.3) / 2 + 0.02, z);
      ekle(pilastr);
    }

    // tavan kirişi (ışıklığın camekân çıtası gibi üzerinden geçer)
    const kiris = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, 0.26), kirisMat);
    kiris.position.set(0, H - 0.07, z);
    ekle(kiris);
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
    ekle(sup);

    const kornis = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.05), supurgelikMat);
    kornis.position.set(taraf * (W / 2 - 0.028), H - 0.06, 0);
    kornis.rotation.y = Math.PI / 2;
    ekle(kornis);

    const ao = new THREE.Mesh(
      new THREE.PlaneGeometry(L, 0.7),
      new THREE.MeshBasicMaterial({ map: aoDoku, transparent: true, depthWrite: false })
    );
    ao.position.set(taraf * (W / 2 - 0.015), 0.35, 0);
    ao.rotation.y = -taraf * Math.PI / 2;
    ekle(ao);
  }

  // --- Sergi tanıtım duvarı (holün sonunda) ---
  const tanitim = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({
      map: baslikDuvariDokusu(baslik, aciklama, fotoSayisi, arkaSrc),
      transparent: true,
    })
  );
  tanitim.position.set(0, H / 2, -L / 2 + 0.03);
  ekle(tanitim);

  // Not: burada eskiden bir SpotLight vardı. Tanıtım duvarı zaten
  // MeshBasicMaterial (kendinden aydınlık), spot yalnızca ışık bütçesini
  // yiyordu — bkz. dosya başındaki ışık bütçesi notu.

  // --- Serginin ön duvarı ---
  // Tek bina modunda salon hub'ın kapısına asılıdır: ön duvarı ve çıkış
  // kapısını hub sağlar, burada yeniden kurulmaz (üst üste binmesin).
  const onMat = new THREE.MeshStandardMaterial({ map: sivaDokusu(), roughness: 0.92, side: THREE.DoubleSide });
  onMat.map.repeat.set(6, 3);
  const onYanW = (W - 2.9) / 2;
  if (!TEK_BINA) {
    HUB = null; // eski tek-sergi modunda hub yok
    for (const taraf of [-1, 1]) {
      const on = new THREE.Mesh(new THREE.PlaneGeometry(onYanW, H), onMat);
      on.position.set(taraf * (1.45 + onYanW / 2), H / 2, L / 2);
      ekle(on);
    }
    const onUst = new THREE.Mesh(new THREE.PlaneGeometry(2.9, H - 3.45), onMat);
    onUst.position.set(0, 3.45 + (H - 3.45) / 2, L / 2);
    ekle(onUst);

    // Çıkış nişan paneli (yüzü hole/-Z dönük): "Ana Salon →" ipucu + tık
    const cikisPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    cikisPanel.position.set(0, 1.7, L / 2 - 0.16);
    cikisPanel.rotation.y = Math.PI;
    cikisPanel.userData = { kapiHedef: "./", kapiAd: "Ana Salon", kapiAcik: true };
    ekle(cikisPanel);
    kapilar.push(cikisPanel);
    const cikisTabela = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9),
      new THREE.MeshBasicMaterial({ map: hubTabelaDokusu("Ana Salon", "← geri dön", 0xc9a227), transparent: true }));
    cikisTabela.position.set(0, 4.15, L / 2 - 0.04);
    cikisTabela.rotation.y = Math.PI;
    ekle(cikisTabela);
  }

  // --- Giriş kapısı (Lobi ile hol arası çift kanatlı kapı) ---
  // TEK BİNA: salon zaten hub'ın kapısının arkasına asılıdır. Salonun kendi
  // kapısı da kurulursa hub kapısının TAM ÜSTÜNE ikinci bir kapı gelir; o
  // kapı hub döngüsünde animasyonlanmadığı için sürekli kapalı görünür ve
  // "kapı açılırken tak diye değişip kapanıyor" hissi doğar. Bu yüzden
  // tek bina modunda kurulmaz — kapıyı hub sağlar.
  const kanatlar = [];
  if (!TEK_BINA) {
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
    ekle(kapiGrubu);
  }

  // Not: Orta hattaki banklar kaldırıldı — döngülü tur tam o hattan
  // yürüyor, içlerinden geçmek yanılsamayı bozuyordu. Zemin artık
  // kesintisiz yaprak halısına kalıyor.

  // --- Süslemeler (parçacıklar + kenar-köşe dekoru) ---
  // Ertelenebilir: önce fotoğraflar asılsın, ziyaretçi eserleri görsün;
  // süslemeler hemen ardından gelir. Yükleme böyle daha anlamlı ilerler.
  const susle = () => { parcacikKur({ W, L, H }); dekorKur({ W, L, H }); };
  if (suslemeyiErtele) suslemeyiErtele.push(susle); else susle();

  // --- Genel ışık ve atmosfer ---
  // Tek bina modunda ortam ışığı ve sis hub tarafından bir kez kurulur;
  // her salon kendi kopyasını eklerse sahne kat kat aydınlanır.
  if (!TEK_BINA) {
    ekle(new THREE.AmbientLight(0xfff4e0, 0.32));
    ekle(new THREE.HemisphereLight(0xfff8ea, 0x35291d, 0.35));
    scene.fog = new THREE.Fog(0x151210, L * 0.55, L * 1.7);
  }

  return { W, L, H, tarafBasina, kanatlar };
}

function parcacikKur({ W, L, H }) {
  // İki davranış var: "düşen" (sakura — yere birikir) ve "yükselen"
  // (khom loi fenerleri — tavana doğru süzülüp sönümlenir).
  if (TEMA.parcaciklar) {
  const yukselen = TEMA.parcaciklar === "fener";
  const toz = TEMA.parcaciklar === "toz";
  // Jepun BÜTÜN bir çiçek: sakura yaprağından iri, bu yüzden çok daha az
  // ve çok daha ağır süzülür. Kalabalık olunca kar gibi görünüp saçmalıyordu.
  const cicek = TEMA.parcaciklar === "plumeria";
  const parcaDoku = parcacikDokusu();
  const adet = yukselen ? Math.min(70, Math.floor(L * 0.9))
             : toz ? Math.min(900, Math.floor(L * 18))
             : cicek ? Math.min(280, Math.floor(L * 4))
             : Math.min(1200, Math.floor(L * 10));
  // Toz zerresi tek başına görünmüyordu: 5 cm'lik nokta, üstelik yalnızca
  // 200 tane. Fırtına olması için hem çok daha kalabalık hem daha iri.
  const boy = yukselen ? 0.32 : toz ? 0.16 : cicek ? 0.19 : 0.085;
  const yaprakGeo = new THREE.PlaneGeometry(toz ? boy * 1.9 : boy, boy);
  const yaprakMat = new THREE.MeshBasicMaterial({
    map: parcaDoku,
    transparent: true,
    opacity: yukselen ? 0.5 : toz ? 0.55 : 0.92,   // fener arka planda kalsın
    depthWrite: false,
    side: THREE.DoubleSide,
    // Fener ışık kaynağı, additive parlar. Kum ise ışık değil MADDE:
    // additive çizilince aydınlık salonda beyaz benek gibi patlıyordu.
    blending: yukselen ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const yapraklar = new THREE.InstancedMesh(yaprakGeo, yaprakMat, adet);
  yapraklar.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // InstancedMesh'in kapsama küresi tek parçanın geometrisinden hesaplanır;
  // origin görüş dışına çıkınca TÜMÜ birden yok oluyordu. Kapat.
  yapraklar.frustumCulled = false;
  const parcalar = [];
  for (let i = 0; i < adet; i++) {
    parcalar.push({
      x: (Math.random() - 0.5) * W * 0.9,
      y: Math.random() * H,
      z: (Math.random() - 0.5) * (L - 2),
      dusme: yukselen ? 0.16 + Math.random() * 0.2   // yükseliş hızı (m/sn)
           : toz ? 0.1 + Math.random() * 0.3          // kum savrularak alçalır
           : cicek ? 0.09 + Math.random() * 0.11      // çiçek ağır ağır iner
           : 0.12 + Math.random() * 0.22,             // düşüş hızı
      // Fırtınanın yatay sürüklenmesi: yalnızca tozda var, salon boyunca
      // eser. Hepsi aynı yöne gittiği için havada bir akış okunuyor.
      ruzgar: toz ? 1.5 + Math.random() * 2.6 : 0,
      sallanma: yukselen ? 0.15 + Math.random() * 0.25
              : cicek ? 0.2 + Math.random() * 0.3
              : toz ? 0.8 + Math.random() * 1.6
              : 0.4 + Math.random() * 0.7,
      faz: Math.random() * Math.PI * 2,
      donme: yukselen ? (Math.random() - 0.5) * 0.25
           : cicek ? (Math.random() - 0.5) * 0.7      // fırıldak gibi yavaş döner
           : toz ? 0                                   // iz rüzgâr yönünde yatay kalır
           : (Math.random() - 0.5) * 2.2,
      egim: Math.random() * Math.PI * 2,
    });
  }
  ekle(yapraklar);

  let yerdeYapraklar = null;
  if (!yukselen) {
    // --- Yere düşenlerin biriktiği katman ---
    // Zemin boş başlar: her parça tavandan doğar, süzülür ve yere değdiği
    // noktada bu katmana "yapışır" — kaybolmaz, salon zamanla örtülür.
    // Mısır'da biriken şey kum: tek tek zerre değil, kenarları dağılan
    // yumuşak öbekler; üst üste bindikçe savrulmuş kum tabakası oluyor.
    const YERDE_KAPASITE = toz ? 6000 : cicek ? 4000 : 24000;
    const yerdeBoy = toz ? 0.62 : cicek ? 0.18 : 0.09;
    yerdeYapraklar = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(yerdeBoy, yerdeBoy),
      new THREE.MeshBasicMaterial({
        map: toz ? kumBirikintiDokusu() : parcaDoku,
        transparent: true, opacity: toz ? 0.68 : 0.85,
        depthWrite: false, side: THREE.DoubleSide,
      }),
      YERDE_KAPASITE
    );
    yerdeYapraklar.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    yerdeYapraklar.frustumCulled = false;
    yerdeYapraklar.count = 0; // boş başlar, düşen her parçayla artar
    ekle(yerdeYapraklar);
  }

  sakura = { mesh: yapraklar, parcalar, yerde: yerdeYapraklar, yerdeSayi: 0, yukselen, toz };

  // Kum salona ZİYARETÇİDEN ÖNCE dolmuş olmalı: çiçek yaprağı gözünün
  // önünde düşerken güzel, kum ise "yıllardır esiyor" hissi vermeli.
  // Bu yüzden zemin duvar diplerinde hazır bir kum tabakasıyla başlar,
  // fırtına onun üstüne eklemeyi sürdürür.
  if (toz && yerdeYapraklar) {
    const tohum = Math.min(1800, Math.floor(L * 34));
    for (let i = 0; i < tohum; i++) {
      // Duvar dibine doğru toplanmış, ortaya doğru seyrelen dağılım
      const yan = Math.random() < 0.5 ? -1 : 1;
      const kenarPay = Math.pow(Math.random(), 2.1);   // 0 = duvar dibi
      _yaprakPoz.set(
        yan * (W / 2 - 0.3 - kenarPay * (W / 2 - 0.9)),
        0.015 + Math.random() * 0.03,
        (Math.random() - 0.5) * (L - 3)
      );
      _yaprakDonus.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
      _yaprakQ.setFromEuler(_yaprakDonus);
      _yaprakOlcek.setScalar(0.7 + Math.random() * 0.9);
      _yaprakMatrisi.compose(_yaprakPoz, _yaprakQ, _yaprakOlcek);
      yerdeYapraklar.setMatrixAt(i, _yaprakMatrisi);
    }
    sakura.yerdeSayi = tohum;
    yerdeYapraklar.count = tohum;
    yerdeYapraklar.instanceMatrix.needsUpdate = true;
    _yaprakOlcek.setScalar(1);
  }
  }
}

// Salona mekân kimliğini veren dekorasyonlar. Tümü prosedürel (dosya yok)
// ve TEMA.dekor bayraklarıyla açılır — böylece "thailand" teması aynı
// kancalara bambaşka öğeler asabilir, deneyim aynı kalır.
function dekorKur({ W, L, H }) {
  const d = TEMA.dekor;
  if (!d) return;

  // --- Girişte vermilion torii kapısı (Japonya'nın en güçlü sembolü) ---
  if (d.girisTorii) {
    const kirmizi = new THREE.MeshStandardMaterial({ color: 0xbf2b25, roughness: 0.55, metalness: 0.05 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 0.5 });
    const torii = new THREE.Group();
    for (const sx of [-1, 1]) {
      const hashira = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4.0, 16), kirmizi);
      hashira.position.set(sx * 3.35, 2.0, 0);
      torii.add(hashira);
    }
    // Kasagi (üstteki ana kiriş) + hafif yukarı kalkık uçlar
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.26, 0.42), kirmizi);
    kasagi.position.set(0, 4.06, 0);
    torii.add(kasagi);
    for (const sx of [-1, 1]) {
      const uc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.38), kirmizi);
      uc.position.set(sx * 3.85, 4.12, 0);
      uc.rotation.z = sx * -0.14;
      torii.add(uc);
    }
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.15, 0.34), kirmizi);
    shimaki.position.set(0, 3.83, 0);
    torii.add(shimaki);
    // Nuki (alt bağ kirişi) + ortada gakuzuka levhası
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.2, 0.26), kirmizi);
    nuki.position.set(0, 2.95, 0);
    torii.add(nuki);
    const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.1), siyah);
    gaku.position.set(0, 3.42, 0.17);
    torii.add(gaku);
    torii.position.set(0, 0, L / 2 - 4.2); // girişte, ilk eserlerden önce
    ekle(torii);
  }

  // --- Duvar diplerinde taş fenerler (ishidoro) ---
  if (d.tasFener) {
    const tas = new THREE.MeshStandardMaterial({ color: 0x8f8b83, roughness: 0.95, metalness: 0 });
    const ates = new THREE.MeshBasicMaterial({ color: 0xffce88 });
    const fenerYap = () => {
      const g = new THREE.Group();
      const kaide = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.14, 10), tas); kaide.position.y = 0.07; g.add(kaide);
      const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), tas); govde.position.y = 0.4; g.add(govde);
      const tabla = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.08, 8), tas); tabla.position.y = 0.69; g.add(tabla);
      const hazne = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), tas); hazne.position.y = 0.86; g.add(hazne);
      const alev = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.17, 0.15), ates); alev.position.y = 0.86; g.add(alev);
      const cati = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.2, 6), tas); cati.position.y = 1.06; cati.rotation.y = Math.PI / 6; g.add(cati);
      const tepe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tas); tepe.position.y = 1.2; g.add(tepe);
      return g;
    };
    let taraf = 1;
    for (let z = L / 2 - 11; z > -L / 2 + 6; z -= 15) {
      const f = fenerYap();
      f.position.set(taraf * 3.4, 0, z); // oyuncu sınırının (±3.2) hemen dışı
      ekle(f);
      taraf *= -1;
    }
  }

  // --- Hol boyunca asılı kırmızı kağıt fenerler (chochin) ---
  if (d.chochin) {
    const choMat = new THREE.MeshBasicMaterial({ map: chochinDokusu() }); // kendinden aydınlık
    const kapak = new THREE.MeshBasicMaterial({ color: 0x141414 });
    const ip = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    // Not: gövde + askı ipi yeterli (alt/üst kapaklar bu mesafede
    // seçilmiyordu) ve aralık seyreltildi — çizim çağrısı dörtte bire indi.
    const govdeGeo = new THREE.SphereGeometry(0.2, 14, 10);
    const ipGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.1, 5);
    for (let z = L / 2 - 9; z > -L / 2 + 6; z -= 10) {
      for (const sx of [-1, 1]) {
        const g = new THREE.Group();
        const govde = new THREE.Mesh(govdeGeo, choMat); govde.scale.set(1, 1.35, 1); g.add(govde);
        const askı = new THREE.Mesh(ipGeo, ip); askı.position.y = 0.82; g.add(askı);
        g.position.set(sx * 2.45, 4.0, z);
        ekle(g);
      }
    }
  }

  // === MISIR ===

  // --- Hiyeroglif stelleri (duvara dayalı dikili taş levhalar) ---
  // Buraya önce tavana kadar papirüs sütunları, sonra sfenks heykelleri
  // kondu; ikisi de kutu geometrisinden yontulduğu için oyuncak gibi
  // duruyordu. Stel bilinçli olarak DÜZ bir levha: bütün detay dokudaki
  // oyma hiyerogliflerden geliyor, o yüzden yakından da elle yontulmuş
  // duruyor. Duvara dayalı olduğu için hiçbir eserin önünü de kapatmıyor.
  if (d.stel) {
    const stelDoku = stelDokusu();
    const tas = new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 0.95 });
    const tasKoyu = new THREE.MeshStandardMaterial({ color: 0xa8916a, roughness: 0.95 });
    const yuzMat = new THREE.MeshStandardMaterial({ map: stelDoku, roughness: 0.9 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.4, metalness: 0.7 });
    // BoxGeometry yüz sırası: +x, -x, +y, -y, +z, -z — yalnızca ön yüz oymalı
    const govdeMat = [tas, tas, tas, tas, yuzMat, tas];

    const stelYap = () => {
      const g = new THREE.Group();
      const kaide = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.15, 0.42), tasKoyu);
      kaide.position.y = 0.075; g.add(kaide);
      const govde = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.9, 0.2), govdeMat);
      govde.position.set(0, 1.1, 0.02); g.add(govde);
      // Torus silmesi: Mısır mimarisinin klasik yuvarlak bileziği
      const silme = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.96, 10), tasKoyu);
      silme.rotation.z = Math.PI / 2;
      silme.position.set(0, 2.08, 0.05); g.add(silme);
      // Cavetto korniş: gövdeden bir tık taşan saçak + ince kapak taşı
      const kornis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.19, 0.27), tasKoyu);
      kornis.position.set(0, 2.21, 0.04); g.add(kornis);
      const kapak = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.05, 0.31), tasKoyu);
      kapak.position.set(0, 2.33, 0.04); g.add(kapak);
      // Korniş altındaki ince yaldız şerit
      const serit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.22), altin);
      serit.position.set(0, 2.0, 0.03); g.add(serit);
      return g;
    };

    // Eserler 3.7 m aralıkla asılı; steller iki eserin TAM ORTASINA gelir.
    // Meşaleler k = 1.5, 4.5, 7.5'te olduğu için steller 0.5, 3.5, 6.5'te.
    for (let k = 0.5; k * 3.7 < L - 13; k += 3) {
      for (const sx of [-1, 1]) {
        const s = stelYap();
        s.position.set(sx * (W / 2 - 0.13), 0, L / 2 - 6 - k * 3.7);
        // Oymalı yüz (+z) salonun içine baksın: sol duvarda +x, sağda -x.
        s.rotation.y = -sx * Math.PI / 2;
        ekle(s);
      }
    }
  }

  // --- Duvar dibi meşaleler: sıcak, titrek ışık ---
  if (d.mesale) {
    const metal = new THREE.MeshStandardMaterial({ color: 0x3b3129, roughness: 0.5, metalness: 0.6 });
    const alev = new THREE.MeshBasicMaterial({ color: 0xffb45c });
    // Eserler her iki duvarda 3.7 m aralıkla asılı; meşale tam ortalarına,
    // iki eser ARASINA ve duvarın dibine gelmeli. Eskiden eserin önünde
    // duruyordu ve tabloyu kapatıyordu.
    let taraf = 1;
    for (let k = 1.5; k * 3.7 < L - 13; k += 3) {
      const z = L / 2 - 6 - k * 3.7;
      const g = new THREE.Group();
      const sap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), metal);
      sap.position.y = 0.75;
      g.add(sap);
      const kase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.1, 0.24, 10), metal);
      kase.position.y = 1.6;
      g.add(kase);
      const atesTopu = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), alev);
      atesTopu.scale.y = 1.6;
      atesTopu.position.y = 1.76;
      g.add(atesTopu);
      // Gerçek ışık yerine kameraya dönük additive hale: ışık bütçesi
      // dolmasın (bkz. dosya başındaki IŞIK BÜTÇESİ notu).
      const hale = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tozDokusu(), color: 0xffa94d, transparent: true,
        opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      hale.scale.set(1.3, 1.3, 1);
      hale.position.y = 1.8;
      g.add(hale);
      g.position.set(taraf * (W / 2 - 0.42), 0, z);
      ekle(g);
      taraf *= -1;
    }
  }

  // === BALİ ===

  // --- Kapı diplerinde koruyucu taş heykeller (dvarapala) ---
  if (d.tasHeykel) {
    const tas = new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95 });
    const kumas = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
    let taraf = 1;
    for (let z = L / 2 - 10; z > -L / 2 + 6; z -= 15) {
      const g = new THREE.Group();
      const kaide = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.62), tas);
      kaide.position.y = 0.17;
      g.add(kaide);
      const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8), tas);
      govde.position.y = 0.79;
      g.add(govde);
      // Kutsal dama desenli kumaş (poleng) — Bali'nin imzası
      const sarik = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.26, 8), kumas);
      sarik.position.y = 0.72;
      g.add(sarik);
      const bas = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), tas);
      bas.position.y = 1.36;
      g.add(bas);
      const tac = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), tas);
      tac.position.y = 1.66;
      g.add(tac);
      g.position.set(taraf * 3.35, 0, z);
      ekle(g);
      taraf *= -1;
    }
  }

  // --- Tavandan sarkan tropikal yeşillik ---
  if (d.yesillik) {
    // Sarkan sarmaşık: ince, farklı boylarda şeritler — düz yeşil levha
    // gibi durmasın diye dar tutulur ve hafifçe eğilir.
    const sarmasikDoku = sarmasikDokusu();
    const yaprakMat = new THREE.MeshStandardMaterial({
      map: sarmasikDoku, transparent: true, alphaTest: 0.35,
      roughness: 0.9, side: THREE.DoubleSide,
    });
    const koyuMat = new THREE.MeshStandardMaterial({
      map: sarmasikDoku, color: 0xb9d6b0, transparent: true, alphaTest: 0.35,
      roughness: 0.9, side: THREE.DoubleSide,
    });
    for (let z = L / 2 - 8; z > -L / 2 + 6; z -= 6) {
      for (const sx of [-1, 1]) {
        const g = new THREE.Group();
        for (let i = 0; i < 7; i++) {
          const boy = 0.5 + Math.random() * 0.9;
          const y = new THREE.Mesh(
            // Doku dikey 1:8 oranında; en de ona yakın kalsın ki yapraklar ezilmesin
            new THREE.PlaneGeometry(boy * 0.16, boy),
            i % 2 ? koyuMat : yaprakMat
          );
          y.position.set((Math.random() - 0.5) * 0.5, -boy / 2 - 0.05, (Math.random() - 0.5) * 0.35);
          y.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
          g.add(y);
        }
        g.position.set(sx * (W / 2 - 0.45), H - 0.12, z);
        ekle(g);
      }
    }
  }

  // === TAYLAND ===

  // --- Girişte altın tapınak kemeri (prang siluetli) ---
  if (d.girisPrang) {
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.32, metalness: 0.85 });
    const kemer = new THREE.Group();
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 4.0, 16), altin);
      post.position.set(sx * 3.3, 2.0, 0);
      kemer.add(post);
    }
    const lento = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 0.5), altin);
    lento.position.set(0, 4.12, 0);
    kemer.add(lento);
    // Merkez sivri kule: daralan segment yığını + tepe konisi
    let yy = 4.35;
    for (let i = 0; i < 5; i++) {
      const r = 0.85 - i * 0.13;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, 0.46, 8), altin);
      seg.position.set(0, yy + 0.23, 0);
      seg.rotation.y = Math.PI / 8;
      kemer.add(seg);
      yy += 0.42;
    }
    kemer.add((() => { const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), altin); t.position.set(0, yy + 0.3, 0); return t; })());
    // Yanlarda kalkık chofa uçları
    for (const sx of [-1, 1]) {
      const chofa = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.1, 6), altin);
      chofa.position.set(sx * 3.5, 4.55, 0);
      chofa.rotation.z = sx * -0.5;
      kemer.add(chofa);
    }
    kemer.position.set(0, 0, L / 2 - 4.2);
    ekle(kemer);
  }

  // --- Duvar diplerinde altın stupalar ---
  if (d.altinStupa) {
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.3, metalness: 0.85 });
    const yap = () => {
      const g = new THREE.Group();
      const kaide = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), altin); kaide.position.y = 0.08; g.add(kaide);
      const kaide2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.16, 16), altin); kaide2.position.y = 0.24; g.add(kaide2);
      const can = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), altin); can.position.y = 0.42; g.add(can);
      let yy = 0.62;
      for (let i = 0; i < 4; i++) { const r = 0.12 - i * 0.02; const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, 0.15, 10), altin); s.position.y = yy + 0.07; g.add(s); yy += 0.15; }
      const tepe = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 8), altin); tepe.position.y = yy + 0.16; g.add(tepe);
      return g;
    };
    let taraf = 1;
    for (let z = L / 2 - 11; z > -L / 2 + 6; z -= 15) {
      const s = yap();
      s.position.set(taraf * 3.4, 0, z);
      ekle(s);
      taraf *= -1;
    }
  }

  // --- Hol boyunca asılı altın fanuslar ---
  if (d.thaiFanus) {
    const altinMat = new THREE.MeshBasicMaterial({ color: 0xffcf5a }); // kendinden aydınlık
    const kapak = new THREE.MeshBasicMaterial({ color: 0x8a5a12 });
    const ip = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const govdeGeo = new THREE.SphereGeometry(0.18, 14, 10);
    const altGeo = new THREE.ConeGeometry(0.12, 0.22, 10);
    const ustGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.06, 10);
    const ipGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.0, 6);
    for (let z = L / 2 - 9; z > -L / 2 + 6; z -= 10) {
      for (const sx of [-1, 1]) {
        const g = new THREE.Group();
        const govde = new THREE.Mesh(govdeGeo, altinMat); govde.scale.set(1, 1.15, 1); g.add(govde);
        const askı = new THREE.Mesh(ipGeo, ip); askı.position.y = 0.8; g.add(askı);
        g.position.set(sx * 2.45, 4.0, z);
        ekle(g);
      }
    }
  }
}

// ---------- Tablo + çerçeve + plaket ----------
const dokuYukleyici = new THREE.TextureLoader();
dokuYukleyici.setCrossOrigin("anonymous");

// Hazır olan eserler burada bekler; her karede yalnızca birkaçı sahneye
// eklenir. Böylece 60+ fotoğrafın yüklenmesi tek karede yığılıp yürüyüşü
// saniyelerce dondurmaz.
const eserKuyrugu = [];
const KARE_BASINA_ESER = 4;

function eserKuyrugunuIsle() {
  let adet = 0;
  while (eserKuyrugu.length && adet < KARE_BASINA_ESER) {
    const is = eserKuyrugu.shift();
    if (TEK_BINA && is.jeton !== salonJeton) { is.doku.dispose(); continue; }
    is.kur();
    adet++;
  }
}

function tabloOlustur(foto, index, taraf, z, rayArmaturu, kayit) {
  const hedefGrup = EKLE; // doku asenkron gelir; o anki salon grubunu sabitle
  const jeton = salonJeton;
  dokuYukleyici.load(foto.src, (doku) => {
    if (TEK_BINA) { eserKuyrugu.push({ doku, jeton, kur: () => kurEser(doku) }); return; }
    kurEser(doku);
  }, undefined, () => { if (kayit) kayit.kalanEser--; });

  function kurEser(doku) {
    doku.colorSpace = THREE.SRGBColorSpace;
    doku.anisotropy = MAKS_ANIZO;

    const oran = doku.image.width / doku.image.height;
    const h = Math.sqrt(2.15 / oran);
    const w = oran * h;

    const grup = new THREE.Group();

    // Duvara vuran ışık gölü. Her eserde var: tek binada üç sergi aynı
    // sahnede durduğu için eser başına gerçek SpotLight kullanılamıyor
    // (bkz. rayArmaturu). Işık yıkaması bu görevi bedelsiz üstlenir.
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
    golPlane.position.set(0, 0.45, 0.002);
    grup.add(golPlane);

    // Ceviz çerçeve. Not: eskiden her eser için ayrı ExtrudeGeometry
    // üretiliyordu (şekil üçgenleştirme) — kurulum maliyetinin en büyük
    // kalemiydi. Tek kutu profil, izleme mesafesinde neredeyse aynı görünür.
    // ÖNEMLİ: katmanlar birbirinden en az 5 mm ayrı durmalı. Kutu çerçevenin
    // ön yüzü ile paspartu tam aynı düzleme denk geldiğinde yürürken
    // titreşen ("ışıklanan") z-fighting oluşuyordu.
    const cerceve = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.19, h + 0.19, 0.07),
      new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.32, metalness: 0.15 })
    );
    cerceve.position.z = 0;          // ön yüz: 0.035
    grup.add(cerceve);

    // Paspartu (krem kart)
    const paspartu = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.10, h + 0.10),
      new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.95 })
    );
    paspartu.position.z = 0.042;
    grup.add(paspartu);

    // İç pervaz: ince altın varak şeridi (paspartu ile fotoğraf arasında)
    const varak = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.035, h + 0.035),
      new THREE.MeshStandardMaterial({ color: 0xa8843c, roughness: 0.25, metalness: 0.9 })
    );
    varak.position.z = 0.047;
    grup.add(varak);

    // Fotoğraf
    const fotoMat = new THREE.MeshBasicMaterial({ map: doku });
    fotoMat.toneMapped = false;
    const fotoMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fotoMat);
    fotoMesh.position.z = 0.052;
    fotoMesh.userData = { index, foto };
    grup.add(fotoMesh);
    eserler.push(fotoMesh);

    // Plaket
    const plaket = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.3),
      new THREE.MeshBasicMaterial({ map: plaketDokusuCiz(foto.baslik, foto.not) })
    );
    plaket.position.set(w / 2 + 0.46, -h / 2 + 0.46, 0.03);
    grup.add(plaket);
    plaketler.set(foto.id, plaket);

    // Görünür ray spot armatürü — yalnızca AZ eserli salonlarda. 60+ eserde
    // 120+ ek çizim çağrısı demekti; tavandaki küçük armatürün katkısı o
    // maliyeti hak etmiyor. (Yalnızca gövde; ışık kaynağı değil.)
    if (rayArmaturu) {
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
    }

    // Duvara yerleştir
    grup.position.set(taraf * (HOL.W / 2 - 0.02), 1.72, z);
    grup.rotation.y = taraf === -1 ? Math.PI / 2 : -Math.PI / 2;
    hedefGrup.add(grup);
  }
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
// ekrandır. İki önemli tasarım kararı:
//  1) MESAFE KAPISI: ekran yalnızca oyuncu son eserlere yaklaşınca belirir.
//     Uzaktayken panel tamamen GİZLİ -> aynadaki (Reflector) yansımaya hiç
//     girmez. Böylece "hareket edince yansıma yetişemiyor / beyaza dönüyor"
//     sorunu kökten kalkar; yakında ise yansıma zaten sorunsuz.
//  2) KIRPMA YOK: fotoğraf tam haliyle ortaya sığdırılır (contain); kalan
//     boşluk, aynı fotoğrafın flu ve koyulaştırılmış hali ile doldurulur.
//     Böylece hiçbir karede insan/manzara kesilmez.
// Bellek dostu: aynı anda en fazla iki doku tutulur, eskisi dispose edilir.
const VW_GOSTERIM = 4.2; // bir karenin ekranda kalma süresi (sn)
const VW_GECIS = 1.2;    // çapraz geçiş süresi (sn)
const VW_MENZIL = 17;    // ekran arka duvara bu mesafede (m) belirmeye başlar
let videowall = null;

// Fotoğrafı kırpmadan duvara oturt: arka plan flu+koyu (cover), ön plan tam (contain)
function videowallKareDokusu(img) {
  const cw = 2048, ch = Math.round(cw * HOL.H / HOL.W);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const x = c.getContext("2d");
  const io = img.width / img.height;
  const co = cw / ch;

  // Arka plan: ekranı dolduracak şekilde büyüt (cover), flulaştır + karart
  let bw, bh;
  if (io > co) { bh = ch; bw = ch * io; } else { bw = cw; bh = cw / io; }
  x.filter = "blur(26px) brightness(0.45)";
  x.drawImage(img, (cw - bw) / 2, (ch - bh) / 2, bw, bh);
  x.filter = "none";

  // Ön plan: fotoğrafın tamamı sığacak şekilde (contain), kırpılmadan
  let fw, fh;
  if (io > co) { fw = cw; fh = cw / io; } else { fh = ch; fw = ch * io; }
  x.drawImage(img, (cw - fw) / 2, (ch - fh) / 2, fw, fh);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAKS_ANIZO;
  return t;
}

function videowallKur(fotograflar) {
  if (!fotograflar.length) return;
  const panelYap = (z) => {
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    m.toneMapped = false; // fotoğraf renkleri solmasın
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(HOL.W, HOL.H), m);
    mesh.position.set(0, HOL.H / 2, z);
    mesh.visible = false; // menzil dışında gizli -> yansımaya girmez
    ekle(mesh);
    return mesh;
  };
  const alt = panelYap(-HOL.L / 2 + 0.035);
  const ust = panelYap(-HOL.L / 2 + 0.037);
  videowall = { alt, ust, sira: 0, bekleme: 0, gecis: -1, yukleniyor: false,
                fotograflar, gorunur: 0, ilkYuklendi: false };
  const kayitVW = videowall; // asenkron geri çağrı için sabitle (global değişebilir)
  const jeton = salonJeton;
  dokuYukleyici.load(fotograflar[0].src, (doku) => {
    if (TEK_BINA && jeton !== salonJeton) { doku.dispose(); return; }
    alt.material.map = videowallKareDokusu(doku.image);
    alt.material.needsUpdate = true;
    kayitVW.ilkYuklendi = true;
    doku.dispose(); // kaynak GPU dokusu gerekmez; canvas dokusunu kullanıyoruz
  });
}

function videowallGuncelle(dt) {
  if (!videowall) return;
  const v = videowall;

  // Mesafe kapısı: arka duvara uzaklık. Yakınken belir, uzaklaşınca sön.
  // Salon döndürülmüş olabilir: mesafe salonun YEREL z ekseninde ölçülür
  const _p = controls.getObject().position;
  let yerelZ = _p.z;
  if (salon) { _v.set(_p.x, _p.y, _p.z); salon.grup.worldToLocal(_v); yerelZ = _v.z; }
  const mesafe = yerelZ + HOL.L / 2;
  const hedef = (gezintiAktif && mesafe < VW_MENZIL) ? 1 : 0;
  v.gorunur += (hedef - v.gorunur) * Math.min(dt * 2.5, 1);

  v.alt.visible = v.ilkYuklendi && v.gorunur > 0.01;
  v.alt.material.opacity = v.gorunur;

  // Menzil dışında: döngü durur, yeni kare yüklenmez (yansıma da temiz kalır)
  if (v.gorunur < 0.5) {
    v.ust.visible = false;
    return;
  }

  if (v.gecis >= 0) {
    v.gecis += dt / VW_GECIS;
    const k = Math.min(v.gecis, 1);
    v.ust.visible = true;
    v.ust.material.opacity = (k * k * (3 - 2 * k)) * v.gorunur; // smoothstep × kapı
    if (k >= 1) {
      // Üstteki kare kalıcı görüntü oldu: alta indir, üstü boşalt
      const eski = v.alt.material.map;
      v.alt.material.map = v.ust.material.map;
      v.alt.material.needsUpdate = true;
      v.ust.material.map = null;
      v.ust.material.needsUpdate = true;
      v.ust.visible = false;
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
          v.ust.material.map = videowallKareDokusu(doku.image);
          v.ust.material.opacity = 0;
          v.ust.material.needsUpdate = true;
          doku.dispose();
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
  a.volume = 0.0; // girişte 0'dan yükselir (render döngüsü rampalar)
  a.addEventListener("error", () => { muzik = null; }); // dosya yoksa sessizce vazgeç
  muzik = a;
}

function muzikOynat() {
  if (!muzik || !muzikAcik || !muzik.paused) return;
  muzik.play().catch(() => {
    // Tarayıcı jest istiyor (kapıdan gelindiğinde olabilir): ilk dokunuşta dene
    const tekrar = () => { muzik && muzik.play().catch(() => {}); };
    addEventListener("pointerdown", tekrar, { once: true });
    addEventListener("keydown", tekrar, { once: true });
    addEventListener("touchstart", tekrar, { once: true });
  });
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
    // Tur, bakış yönünden bağımsız SALON EKSENİNDE ilerler: eserlere dönüp
    // bakmak yürüyüşü duvara saptırıp durdurmaz. Salon döndürülmüş olabilir,
    // bu yüzden ilerleme salonun yerel z ekseni boyunca uygulanır.
    if (TEK_BINA && salon) {
      _v.set(p.x, p.y, p.z);
      salon.grup.worldToLocal(_v);
      _v.z += hiz.z * dt;
      _v.x = THREE.MathUtils.damp(_v.x, 0, 1.5, dt);
      if (turYon < 0 && _v.z <= -(salon.L / 2 - 1.6)) turCevir(1);
      else if (turYon > 0 && _v.z >= salon.L / 2 - 4.6) turCevir(-1);
      salon.grup.localToWorld(_v);
      p.x = _v.x; p.z = _v.z;
    } else {
      p.z += hiz.z * dt;
      p.x = THREE.MathUtils.damp(p.x, 0, 1.5, dt); // yumuşakça orta hatta süzül
      // Döngü: iki uçta yön değiştir. Kapı tarafındaki dönüş noktası kapı
      // sensörünün (4.2 m) dışında — kapı her turda açılıp kapanmasın.
      if (turYon < 0 && p.z <= -(HOL.L / 2 - 1.6)) turCevir(1);
      else if (turYon > 0 && p.z >= HOL.L / 2 - 4.6) turCevir(-1);
    }
  } else {
    controls.moveForward(-hiz.z * dt);
  }

  // --- Tek bina: salonun içindeyken salonun YEREL uzayında sınırla ---
  // Salon kapının arkasına döndürülmüş olarak asılıdır; dünya koordinatını
  // salona çevirip mevcut hol mantığını uygular, sonra geri yazarız.
  if (TEK_BINA && bolge === "salon" && salon) {
    _v.set(p.x, p.y, p.z);
    salon.grup.worldToLocal(_v);
    const yariW = salon.W / 2 - 0.7;
    _v.x = THREE.MathUtils.clamp(_v.x, -yariW, yariW);
    if (_v.z > salon.L / 2) {           // ön açıklıktan çıkıldı -> hub'a dön
      bolge = "hub";
      salon = null;
    } else {
      _v.z = Math.max(_v.z, -(salon.L / 2 - 0.9));  // sondaki sinevizyon duvarı
      // Ön açıklıkta kasa genişliği kadar daral (kapıdan geçiş hissi)
      if (_v.z > salon.L / 2 - 0.5) _v.x = THREE.MathUtils.clamp(_v.x, -1.2, 1.2);
      salon.grup.localToWorld(_v);
      p.x = _v.x; p.z = _v.z;
    }
    const t2 = Math.hypot(hiz.x, hiz.z);
    adimFazi += dt * t2 * 1.9;
    p.y = 1.7 + Math.sin(adimFazi) * Math.min(t2 / 40, 1) * 0.045;
    return;
  }

  // Hub modu: atrium kutusu + açık kapıların ardındaki koridorlara giriş izni.
  // Kapı yeterince açıksa ve oyuncu açıklığın hizasındaysa duvar sınırı o
  // yönde uzatılır — salon yüklüyse sınır kalkar, ziyaretçi salona yürür.
  if (HUB && HUB.hub) {
    const yW = HUB.AW / 2 - 0.6, yD = HUB.AD / 2 - 0.6;
    let minX = -yW, maksX = yW, minZ = -yD, maksZ = yD;
    let koridorda = false;
    if (hub) {
      for (const k of hub.kapilar) {
        if (!k.acik || k.acilma < 0.45) continue;
        const salonHazir = salonlar.has(k.gezi.id);
        const derinlik = salonHazir ? 1e4 : 3.0; // salon yüklüyse sınır yok
        if (Math.abs(k.cx) < 0.01) {            // ön/arka kapı: z ekseninde
          if (Math.abs(p.x) < 1.2) {
            if (k.cz < 0) minZ = k.cz - derinlik; else maksZ = k.cz + derinlik;
            const icerlek = k.cz < 0 ? k.cz - p.z : p.z - k.cz;
            if (icerlek > -0.4) koridorda = true;
            if (salonHazir && icerlek > 0.5) { salon = salonlar.get(k.gezi.id); bolge = "salon"; }
          }
        } else {                                 // sol/sağ kapı: x ekseninde
          if (Math.abs(p.z) < 1.2) {
            if (k.cx < 0) minX = k.cx - derinlik; else maksX = k.cx + derinlik;
            const icerlek = k.cx < 0 ? k.cx - p.x : p.x - k.cx;
            if (icerlek > -0.4) koridorda = true;
            if (salonHazir && icerlek > 0.5) { salon = salonlar.get(k.gezi.id); bolge = "salon"; }
          }
        }
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, minX, maksX);
    p.z = THREE.MathUtils.clamp(p.z, minZ, maksZ);
    // Koridordayken yanlara sürtme (dar geçit)
    if (koridorda && bolge === "hub") {
      if (Math.abs(p.x) > Math.abs(p.z)) p.z = THREE.MathUtils.clamp(p.z, -1.2, 1.2);
      else p.x = THREE.MathUtils.clamp(p.x, -1.2, 1.2);
    }
    const t = Math.hypot(hiz.x, hiz.z);
    adimFazi += dt * t * 1.9;
    p.y = 1.7 + Math.sin(adimFazi) * Math.min(t / 40, 1) * 0.045;
    return;
  }

  // Bölgeye göre yatay sınır: atriumda geniş, holde dar
  const atriumda = HUB && p.z > HOL.L / 2 + 0.2;
  const xSinir = atriumda ? HUB.AW / 2 - 0.6 : HOL.W / 2 - 0.7;
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

  const zUzak = HUB ? HUB.arkaZ - 0.6 : HOL.L / 2 - 0.9; // trip: ön duvar sınırı
  p.z = THREE.MathUtils.clamp(p.z, -(HOL.L / 2 - 0.9), zUzak);

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
  let bx = THREE.MathUtils.clamp(
    p.x + Math.sin(zaman * p.sallanma + p.faz) * 0.35,
    -(HOL.W / 2 - 0.1), HOL.W / 2 - 0.1
  );
  // Kum rüzgârla süpürülür: ortada tutunamaz, duvar diplerinde yığılır.
  // Çiçek yaprağı düştüğü yerde kalır, ona dokunulmuyor.
  if (sakura.toz) {
    const duvar = (HOL.W / 2 - 0.35) * Math.sign(bx || 1);
    bx = THREE.MathUtils.lerp(bx, duvar, 0.45 + Math.random() * 0.4);
  }
  _yaprakPoz.set(
    bx,
    0.015 + Math.random() * 0.03, // hafif yükseklik farkı: üst üste binince titreşim olmasın
    p.z + Math.cos(zaman * p.sallanma * 0.8 + p.faz) * 0.2
  );
  _yaprakDonus.set(
    // Kum tabakası yere yapışık; yaprağın ucu belli belirsiz kalkık durur
    -Math.PI / 2 + (sakura.toz ? 0 : (Math.random() - 0.5) * 0.22),
    Math.random() * Math.PI * 2,
    sakura.toz ? 0 : (Math.random() - 0.5) * 0.18
  );
  _yaprakQ.setFromEuler(_yaprakDonus);
  _yaprakOlcek.setScalar(sakura.toz ? 0.7 + Math.random() * 0.9 : 0.85 + Math.random() * 0.35);
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
  const { mesh, parcalar, yukselen } = sakura;
  for (let i = 0; i < parcalar.length; i++) {
    const p = parcalar[i];

    if (yukselen) {
      // Khom loi: ağır ağır yükselir, tavana yaklaşırken küçülüp söner ve
      // aşağıdan yeni bir fener salınır. Yere birikme yok.
      p.y += p.dusme * dt;
      if (p.y > HOL.H - 0.15) {
        p.y = 0.4 + Math.random() * 0.5;
        p.x = (Math.random() - 0.5) * HOL.W * 0.85;
        p.z = (Math.random() - 0.5) * (HOL.L - 3);
        p.faz = Math.random() * Math.PI * 2;
        p.dusme = 0.16 + Math.random() * 0.2;
      }
      // Doğarken büyü, tavana yaklaşırken küçül: yumuşak beliriş/kayboluş
      const oran = p.y / Math.max(HOL.H, 0.001);
      const olcek = Math.min(1, oran * 4) * Math.min(1, (1 - oran) * 3.2);
      _yaprakOlcek.setScalar(Math.max(olcek, 0.001));
      _yaprakPoz.set(
        p.x + Math.sin(zaman * p.sallanma + p.faz) * 0.28,
        p.y,
        p.z + Math.cos(zaman * p.sallanma * 0.7 + p.faz) * 0.22
      );
      // Fenerler dik durur, yalnızca hafifçe salınır (takla atmaz)
      _yaprakDonus.set(0, Math.sin(zaman * 0.4 + p.faz) * 0.25, Math.sin(zaman * 0.5 + p.faz) * 0.09);
      _yaprakQ.setFromEuler(_yaprakDonus);
      _yaprakMatrisi.compose(_yaprakPoz, _yaprakQ, _yaprakOlcek);
      mesh.setMatrixAt(i, _yaprakMatrisi);
      continue;
    }

    p.y -= p.dusme * dt;
    // Kum fırtınası: zerreler salon boyunca aynı yöne sürüklenir. Salonun
    // ucuna varan zerre öbür uçtan geri girer, akış hiç kesilmez.
    if (p.ruzgar) {
      p.z -= p.ruzgar * dt;
      if (p.z < -(HOL.L / 2 - 1)) p.z = HOL.L / 2 - 1;
    }
    if (p.y < 0.05) {
      // Yere inen parça düştüğü yerde kalır, birikintiye eklenir…
      if (sakura.yerde) yereBirak(p);
      // …ve gökyüzünden yepyeni bir parça doğar
      p.y = HOL.H - 0.3;
      p.x = (Math.random() - 0.5) * HOL.W * 0.9;
      p.z = (Math.random() - 0.5) * (HOL.L - 2);
      p.faz = Math.random() * Math.PI * 2;
      p.dusme = p.ruzgar ? 0.1 + Math.random() * 0.3 : 0.12 + Math.random() * 0.22;
    }
    _yaprakOlcek.setScalar(1);
    _yaprakPoz.set(
      p.x + Math.sin(zaman * p.sallanma + p.faz) * (p.ruzgar ? 0.18 : 0.35),
      p.y,
      p.z + Math.cos(zaman * p.sallanma * 0.8 + p.faz) * 0.2
    );
    // Toz izi yatay kalır (yalnızca rüzgârda hafifçe kıvrılır); yaprak takla atar
    _yaprakDonus.set(
      p.ruzgar ? 0 : zaman * p.donme + p.faz,
      p.ruzgar ? Math.sin(zaman * 0.7 + p.faz) * 0.25 : p.egim + Math.sin(zaman * 0.6 + p.faz) * 0.6,
      p.ruzgar ? Math.sin(zaman * 1.4 + p.faz) * 0.12 : p.faz
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
const kapiIpucu = qs("#kapi-ipucu");
let hedefEser = null;
let hedefKapi = null; // atriumda nişangâhtaki gezi kapısı

const MERKEZ = new THREE.Vector2(0, 0);

function hedefGuncelle() {
  if (!gezintiAktif) {
    hedefEser = null; hedefKapi = null;
    crosshair.classList.remove("aktif");
    if (kapiIpucu) kapiIpucu.classList.remove("gorunur");
    return;
  }
  raycaster.setFromCamera(surukleModu ? fareNDC : MERKEZ, camera);

  const eserKes = raycaster.intersectObjects(eserler, false).find((k) => k.distance < 7);
  const kapiKes = kapilar.length ? raycaster.intersectObjects(kapilar, false).find((k) => k.distance < 8) : null;

  // Hangisi daha yakınsa o hedeflenir (eser incelenir, kapı geçilir)
  hedefEser = null; hedefKapi = null;
  if (eserKes && (!kapiKes || eserKes.distance <= kapiKes.distance)) hedefEser = eserKes.object;
  else if (kapiKes) hedefKapi = kapiKes.object;

  crosshair.classList.toggle("aktif", !!(hedefEser || hedefKapi));
  if (kapiIpucu) {
    if (hedefKapi) {
      const d = hedefKapi.userData;
      kapiIpucu.textContent = d.kapiAcik ? `${d.kapiAd} →` : `${d.kapiAd} · Yakında`;
      kapiIpucu.classList.add("gorunur");
    } else {
      kapiIpucu.classList.remove("gorunur");
    }
  }
  const tiklanir = hedefEser || (hedefKapi && hedefKapi.userData.kapiAcik);
  document.body.style.cursor = surukleModu && tiklanir ? "pointer" : "";
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
  // Parmağa göre konumlanan joystick: halka, dokunulan noktada doğar.
  // Sabit merkezli joystick'te başparmak nereye denk gelirse gelsin oradan
  // itmek gerekiyordu; bu "acayip" hissin kaynağıydı.
  const joyHalka = qs("#joystick-halka");
  const JOY_YARICAP = 58;   // halka yarıçapı (px)
  let joyMerkezX = 0, joyMerkezY = 0;

  function joyHalkayiTasi(cx, cy) {
    const rect = joyZone.getBoundingClientRect();
    joyMerkezX = cx; joyMerkezY = cy;
    if (joyHalka) {
      joyHalka.style.left = `${cx - rect.left}px`;
      joyHalka.style.top = `${cy - rect.top}px`;
    }
  }

  function joyGuncelle(cx, cy) {
    let dx = cx - joyMerkezX;
    let dy = cy - joyMerkezY;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_YARICAP) { dx = (dx / dist) * JOY_YARICAP; dy = (dy / dist) * JOY_YARICAP; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // Merkezde ölü bölge: parmak titremesi istemsiz yürüyüşe dönüşmesin
    if (dist < JOY_YARICAP * 0.14) { joyX = 0; joyY = 0; }
    else { joyX = dx / JOY_YARICAP; joyY = dy / JOY_YARICAP; }
  }

  joyZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyAktif = true;
    surukleModu = true;
    joyZone.classList.add("aktif");
    joyHalkayiTasi(t.clientX, t.clientY);   // halka parmağın altında doğsun
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
        joyZone.classList.remove("aktif");
        if (joyHalka) { joyHalka.style.left = "50%"; joyHalka.style.top = "50%"; }
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
  if (!gezintiAktif) return;
  if (e.target.closest("button, a, input, textarea")) return;
  if (surukleModu && surukleMesafe > 6) return;
  if (performance.now() - girisZamani < 400) return; // giriş tıklaması tetiklemesin
  // Tek binada kapıya tıklamak gerekmez (yürüyerek girilir); eski tek-sergi
  // sayfaları için tıklayarak geçiş korunur.
  if (!TEK_BINA && hedefKapi && hedefKapi.userData.kapiAcik && hedefKapi.userData.kapiHedef) {
    perdeKapatVeGit(hedefKapi.userData.kapiHedef);
    return;
  }
  if (hedefEser) lightboxAc(hedefEser.userData.foto);
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
  muzikOynat(); // sergi müziği girişte başlar (hub'da muzik null -> no-op)
  perdeAc();    // siyah perde çözülür: yeni bölüm belirir
}

// Kapıdan yürüyerek gelindiğinde karşılama ekranı gösterilmez: ziyaretçi
// yürümeye kaldığı yerden devam eder. Fare kilidi jest ister, o yüzden
// sürükle-bak moduyla başlanır; ilk tıklamada kilide geçilir.
function akisBaslat() {
  surukleModu = true;
  const fareIpucu = qs("#ipucu-fare");
  if (fareIpucu) fareIpucu.innerHTML = "<kbd>Fare</kbd> basılı tut & sürükle";
  gezintiBaslat();
  sesBaslat();
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

// ---------- Kapı yapımcısı (hub + sergi dönüş kapıları) ----------
// Açılabilir çift kanatlı portal. leaves döndürür ki hub modu mesafeye göre
// açıp kapatabilsin. cfg: { ad, renk, acik, hedef(url), altbaslik }.
// Kapının ardındaki gerçek giriş koridoru ("içeriyi gör"). Serginin salonuyla
// aynı malzeme dilini kullanır; ucu sisle karanlığa karışır, böylece koridor
// devam ediyormuş hissi verir. Fotoğraflar geziden gerçek karelerdir.
function vestibulKur(anaGrup, cfg) {
  const grup = new THREE.Group();   // ayrı grup: salon yüklenince gizlenebilir
  anaGrup.add(grup);
  const KW = 2.88, KH = 3.44, KD = 9;   // koridor eni / yüksekliği / derinliği
  const mz = -KD / 2;                    // koridor merkezi (kapının arkası)

  const zeminDoku = mermerZeminDokusu();
  zeminDoku.repeat.set(KW / 4, KD / 4);
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(KW, KD),
    new THREE.MeshStandardMaterial({ map: zeminDoku, roughness: 0.32, metalness: 0.05 }));
  zemin.rotation.x = -Math.PI / 2;
  zemin.position.set(0, 0.01, mz);
  grup.add(zemin);

  const sivaD = sivaDokusu(); sivaD.repeat.set(3, 2);
  const duvarM = new THREE.MeshStandardMaterial({ map: sivaD, roughness: 0.92 });
  for (const sx of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(KD, KH), duvarM);
    d.position.set(sx * KW / 2, KH / 2, mz);
    d.rotation.y = -sx * Math.PI / 2;
    grup.add(d);
  }
  const tavan = new THREE.Mesh(new THREE.PlaneGeometry(KW, KD),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 }));
  tavan.rotation.x = Math.PI / 2;
  tavan.position.set(0, KH, mz);
  grup.add(tavan);

  // Tavan ışık şeridi + koridoru dolduran sıcak ışık
  const serit = new THREE.Mesh(new THREE.PlaneGeometry(KW * 0.42, KD - 1.4),
    new THREE.MeshBasicMaterial({ color: 0xfff7e8 }));
  serit.rotation.x = Math.PI / 2;
  serit.position.set(0, KH - 0.02, mz);
  grup.add(serit);
  // Tek ışık: koridor yalnızca salon hazır olana kadar görünür, ışık
  // bütçesini iki lambayla yemeye değmez (bkz. IŞIK BÜTÇESİ notu).
  const isik = new THREE.PointLight(0xfff0d8, 9, 11, 1.6);
  isik.position.set(0, KH - 0.6, mz + 1.5);
  grup.add(isik);
  // Gezinin kimlik rengi: gerçek ışık yerine additive renk yıkaması
  const renkYikama = new THREE.Mesh(
    new THREE.PlaneGeometry(KW * 0.9, KH * 0.8),
    new THREE.MeshBasicMaterial({
      color: cfg.renk, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  renkYikama.position.set(0, KH * 0.45, mz - 2.6);
  grup.add(renkYikama);

  // Koridorun ucu: karanlığa karışan kapanış (devam ediyor hissi)
  const uc = new THREE.Mesh(new THREE.PlaneGeometry(KW, KH),
    new THREE.MeshBasicMaterial({ color: 0x0f0d0b }));
  uc.position.set(0, KH / 2, -KD + 0.02);
  grup.add(uc);
  const ucSis = new THREE.Mesh(new THREE.PlaneGeometry(KW, KH),
    new THREE.MeshBasicMaterial({ color: 0x0f0d0b, transparent: true, opacity: 0.72 }));
  ucSis.position.set(0, KH / 2, -KD + 2.2);
  grup.add(ucSis);

  // Yan duvarlarda gezinin gerçek fotoğrafları (çerçeveli, aydınlatılmış)
  if (cfg.gezi) {
    fetch(`data/${cfg.gezi}.json`, { cache: "no-cache" })
      .then((y) => (y.ok ? y.json() : null))
      .then((veri) => {
        if (!veri || !veri.fotograflar || !veri.fotograflar.length) return;
        const secim = [veri.fotograflar[0], veri.fotograflar[1] || veri.fotograflar[0]];
        secim.forEach((foto, i) => {
          dokuYukleyici.load(foto.src, (doku) => {
            doku.colorSpace = THREE.SRGBColorSpace;
            doku.anisotropy = MAKS_ANIZO;
            const oran = doku.image.width / doku.image.height;
            const h = Math.sqrt(1.55 / oran), w = oran * h;
            const sx = i === 0 ? -1 : 1;
            const g = new THREE.Group();
            const cerceve = new THREE.Mesh(new THREE.BoxGeometry(w + 0.13, h + 0.13, 0.05),
              new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.35, metalness: 0.15 }));
            g.add(cerceve);
            const fmat = new THREE.MeshBasicMaterial({ map: doku });
            fmat.toneMapped = false;
            const fm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fmat);
            fm.position.z = 0.028;
            g.add(fm);
            g.position.set(sx * (KW / 2 - 0.04), 1.62, mz + (i === 0 ? 1.1 : -1.3));
            g.rotation.y = -sx * Math.PI / 2;
            grup.add(g);
          });
        });
      })
      .catch(() => {});
  }
  return grup;
}

// Sergi kapısını çerçeveleyen kültürel geçit. Gezinin kimliğini kapıda
// gösterir; salonun içi böylece sade ve fotoğraflara odaklı kalır.
function kapiGecidi(geziId) {
  const g = new THREE.Group();
  if (geziId === "japonya") {
    // Vermilion torii: kapı açıklığını (2.9 m) çerçeveleyecek ölçüde
    const kirmizi = new THREE.MeshStandardMaterial({ color: 0xbf2b25, roughness: 0.55, metalness: 0.05 });
    for (const sx of [-1, 1]) {
      const hashira = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 4.3, 16), kirmizi);
      hashira.position.set(sx * 2.15, 2.15, 0);
      g.add(hashira);
    }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.24, 0.4), kirmizi);
    kasagi.position.set(0, 4.36, 0);
    g.add(kasagi);
    for (const sx of [-1, 1]) {
      const uc = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.36), kirmizi);
      uc.position.set(sx * 2.7, 4.42, 0);
      uc.rotation.z = sx * -0.14;
      g.add(uc);
    }
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.14, 0.32), kirmizi);
    shimaki.position.set(0, 4.14, 0);
    g.add(shimaki);
    // Bağ kirişi biraz aşağıda: üstündeki boşluk sergi tabelasına kalsın.
    // (Ortadaki gakuzuka levhası kaldırıldı — tabelanın önüne geliyordu.)
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 0.24), kirmizi);
    nuki.position.set(0, 3.30, 0);
    g.add(nuki);
  } else if (geziId === "tayland") {
    // Altın tapınak geçidi: sivri prang siluetli
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.32, metalness: 0.85 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.3, 16), altin);
      post.position.set(sx * 2.15, 2.15, 0);
      g.add(post);
    }
    const lento = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.34, 0.44), altin);
    lento.position.set(0, 4.4, 0);
    g.add(lento);
    let yy = 4.6;
    for (let i = 0; i < 4; i++) {
      const r = 0.6 - i * 0.1;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, 0.36, 8), altin);
      seg.position.set(0, yy + 0.18, 0);
      seg.rotation.y = Math.PI / 8;
      g.add(seg);
      yy += 0.33;
    }
    const tepe = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), altin);
    tepe.position.set(0, yy + 0.25, 0);
    g.add(tepe);
    for (const sx of [-1, 1]) {
      const chofa = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 6), altin);
      chofa.position.set(sx * 2.4, 4.8, 0);
      chofa.rotation.z = sx * -0.5;
      g.add(chofa);
    }
  } else if (geziId === "misir") {
    // Pylon: içe eğimli kumtaşı kuleler + cavetto korniş, lapis-altın bant
    const tas = new THREE.MeshStandardMaterial({ color: 0xd8bd85, roughness: 0.9 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.8 });
    const lapis = new THREE.MeshStandardMaterial({ color: 0x1f3f7a, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      // Hafif konik kule (aşağısı geniş) — pylon silueti
      const kule = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 4.4, 4), tas);
      kule.rotation.y = Math.PI / 4;
      kule.position.set(sx * 2.35, 2.2, 0);
      g.add(kule);
      const kornis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 1.5), tas);
      kornis.position.set(sx * 2.35, 4.5, 0);
      g.add(kornis);
      const bant = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.16, 1.36), lapis);
      bant.position.set(sx * 2.35, 4.28, 0);
      g.add(bant);
    }
    // Üst lento + kanatlı güneş kursu (basitleştirilmiş)
    const lento = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.42, 0.5), tas);
    lento.position.set(0, 4.62, 0);
    g.add(lento);
    const kurs = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), altin);
    kurs.scale.set(1, 0.85, 0.4);
    kurs.position.set(0, 5.0, 0.12);
    g.add(kurs);
    for (const sx of [-1, 1]) {
      const kanat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.26), altin);
      kanat.position.set(sx * 0.78, 5.0, 0.12);
      kanat.rotation.z = sx * 0.06;
      g.add(kanat);
    }
  } else if (geziId === "bali") {
    // Candi bentar: ortadan ikiye ayrılmış, kademeli taş tapınak kapısı
    const tas = new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95 });
    const koyu = new THREE.MeshStandardMaterial({ color: 0x4a463e, roughness: 0.95 });
    for (const sx of [-1, 1]) {
      // Kademeli yığın: yukarı doğru daralan bloklar (yarık kapı yarısı)
      let yy = 0;
      for (let i = 0; i < 7; i++) {
        const gen = 1.5 - i * 0.13;
        const der = 0.9 - i * 0.06;
        const yuk = 0.62 - i * 0.03;
        const blok = new THREE.Mesh(new THREE.BoxGeometry(gen, yuk, der), i % 2 ? koyu : tas);
        // İç kenar kapı açıklığının (±1.45) dışında kalsın, dışa kademelensin
        blok.position.set(sx * (2.25 + (1.5 - gen) / 2), yy + yuk / 2, 0);
        g.add(blok);
        yy += yuk;
      }
      const tepe = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), tas);
      tepe.position.set(sx * 2.6, yy + 0.25, 0);
      tepe.rotation.y = Math.PI / 4;
      g.add(tepe);
    }
  } else {
    return null;
  }
  return g;
}

function hubKapisiInsa(cfg, yuva) {
  const grup = new THREE.Group();
  const acik = cfg.acik;
  const cerceveMat = new THREE.MeshStandardMaterial({ color: 0x241d15, roughness: 0.5, metalness: 0.2 });
  const kanatMat = new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.5, metalness: 0.1 });
  for (const sx of [-1, 1]) {
    const dikme = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.5, 0.2), cerceveMat);
    dikme.position.set(sx * 1.35, 1.75, 0);
    grup.add(dikme);
  }
  const lento = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.2, 0.2), cerceveMat);
  lento.position.set(0, 3.5, 0);
  grup.add(lento);
  const leaves = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 1.28, 1.72, 0.05); // menteşe (açıklık kenarı)
    const kanat = new THREE.Mesh(new THREE.BoxGeometry(1.26, 3.3, 0.07), kanatMat);
    kanat.position.set(-sx * 0.63, 0, 0);
    pivot.add(kanat);
    const kol = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.25, metalness: 0.9 }));
    kol.position.set(-sx * 1.1, -0.1, 0.06);
    pivot.add(kol);
    grup.add(pivot);
    leaves.push({ pivot, sx });
  }
  const serit = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.1),
    new THREE.MeshBasicMaterial({ color: cfg.renk }));
  serit.position.set(0, 0.12, 0.12);
  grup.add(serit);
  // Kapının ardında serginin GERÇEK giriş koridoru inşa edilir: zemin,
  // duvarlar, tavan ışığı ve o gezinin fotoğrafları. Kapı açılınca düz bir
  // renk değil, derinliğe uzanan gerçek bir iç mekân görünür.
  const vestibul = cfg.vestibulVar ? vestibulKur(grup, cfg) : null;
  // Tabela kültürel geçidin ÖNÜNDE ve ÜSTÜNDE durur: geçit eklendikten
  // sonra kirişin arkasında kalıp okunmuyordu.
  const tabela = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98),
    new THREE.MeshBasicMaterial({ map: hubTabelaDokusu(cfg.ad, cfg.altbaslik, cfg.renk),
                                  transparent: true, depthTest: false }));
  tabela.renderOrder = 5;
  tabela.position.set(0, 3.62, 0.68);  // kapı kasasının hemen üstü, geçidin önünde
  grup.add(tabela);
  if (cfg.gezi) {
    const gecit = kapiGecidi(cfg.gezi);
    if (gecit) { gecit.position.z = 0.55; grup.add(gecit); } // kapının hub tarafında
  }
  const hedefPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hedefPanel.position.set(0, 1.75, 0.16);
  hedefPanel.userData = { kapiHedef: cfg.hedef || null, kapiAd: cfg.ad, kapiAcik: acik };
  grup.add(hedefPanel);
  kapilar.push(hedefPanel);
  grup.position.set(yuva.x, 0, yuva.z);
  grup.rotation.y = yuva.ry;
  ekle(grup);
  const vurgu = new THREE.PointLight(cfg.renk, acik ? 9 : 6, 7, 2);
  vurgu.position.set(yuva.x - Math.sin(yuva.ry) * 1.4, 3.9, yuva.z + Math.cos(yuva.ry) * 1.4);
  ekle(vurgu);
  return { leaves, cx: yuva.x, cz: yuva.z, ry: yuva.ry, hedef: cfg.hedef, acik,
           acilma: 0, acikDurum: false, ses: null, vestibul, yukleniyor: false };
}

// ---------- Hub (giriş salonu): tüm gezilere açılan kapılar ----------
let hub = null;
// Tek bina: TÜM sergiler açılışta bir kez kurulur ve öylece kalır. Kapıya
// yaklaşınca kurma/sökme yok — bina baştan ayakta, ziyaretçi sadece dolaşır.
const salonlar = new Map();   // gezi id -> { gezi, grup, ry, kapi, L, W, H, veri }
let salon = null;             // içinde bulunulan salon (yoksa null)
let salonJeton = 0;           // geç gelen dokular için (sökme artık yok, ama korunur)
let bolge = "hub";            // "hub" | "salon"
const _v = new THREE.Vector3();

// Kapının arkasına o gezinin salonunu kurar. Salon grubu öyle yerleştirilir ki
// salonun yerel z=+L/2 düzlemi (ön açıklığı) kapının dünya konumuna oturur.
async function salonYukle(kapi) {
  const id = kapi.gezi.id;
  if (salonlar.has(id) || kapi.yukleniyor) return true;
  kapi.yukleniyor = true;
  try {
    const yanit = await fetch(`data/${id}.json`, { cache: "no-cache" });
    if (!yanit.ok) throw new Error(yanit.status);
    const veri = await yanit.json();

    TEMA = TEMALAR[veri.tema] || TEMALAR[id] || TEMALAR.varsayilan;
    const grup = new THREE.Group();
    scene.add(grup);
    EKLE = grup;                       // bundan sonraki inşa gruba gider

    // 1) Mimari kabuk (duvar/zemin/tavan/ışık) — süslemeler ertelenir
    const suslemeler = [];
    const hol = holKur(veri.fotograflar.length, veri.baslik, veri.aciklama,
                       veri.fotograflar[0]?.src, suslemeler);
    const L = hol.L;
    const rayArmaturu = veri.fotograflar.length <= 22;
    const kayit = { gezi: id, grup, ry: kapi.ry, kapi, L, W: hol.W, H: hol.H, veri,
                    sakura: null, videowall: null, kalanEser: veri.fotograflar.length };

    // 2) Fotoğraflar: asıl içerik önce gelsin
    veri.fotograflar.forEach((foto, i) => {
      const taraf = i % 2 === 0 ? -1 : 1;
      const z = L / 2 - 6 - Math.floor(i / 2) * 3.7;
      tabloOlustur(foto, i, taraf, z, rayArmaturu, kayit);
    });
    videowallKur(veri.fotograflar);
    kayit.videowall = videowall;
    await kuyrukBosalsin();            // tablolar asılana kadar

    // 3) Süslemeler (parçacıklar, fenerler, taş fenerler…) en son
    EKLE = grup;
    suslemeler.forEach((f) => f());
    kayit.sakura = sakura;
    EKLE = scene;                      // hedefi geri al

    // Yerleştir: yerel (0,0,L/2) -> kapının dünya konumu
    const ry = kapi.ry;
    grup.rotation.y = ry;
    grup.position.set(kapi.cx - Math.sin(ry) * (L / 2), 0, kapi.cz - Math.cos(ry) * (L / 2));
    grup.updateMatrixWorld(true);

    salonlar.set(id, kayit);
    if (kapi.vestibul) kapi.vestibul.visible = false; // artık gerçek salon var
    kapi.yukleniyor = false;
    return true;
  } catch {
    kapi.yukleniyor = false;
    return false;
  }
}

// Kuyruktaki eserlerin tamamı sahneye eklenene kadar bekler.
function kuyrukBosalsin() {
  return new Promise((coz) => {
    const bekle = () => (eserKuyrugu.length ? requestAnimationFrame(bekle) : coz());
    requestAnimationFrame(bekle);
  });
}

// Açılış: ilk sergi (Japonya) kurulur kurulmaz ziyaretçi içeri alınır;
// kalan sergiler o dolaşırken arka planda kurulmayı sürdürür. Böylece
// bekleme kısa kalır ama kapıya varıldığında her şey hazırdır.
async function tumSalonlariKur(ilerleme) {
  const acik = hub.kapilar.filter((k) => k.acik);
  if (!acik.length) { if (ilerleme) ilerleme(null); return; }

  // Binanın TAMAMI kurulmadan giriş açılmaz. Yarım hazır girip yürürken
  // takılmak hata gibi algılanıyordu; bunun yerine kısa ve açıklamalı
  // bir bekleme var.
  for (let i = 0; i < acik.length; i++) {
    if (ilerleme) ilerleme(acik[i].gezi.ad, i, acik.length);
    await salonYukle(acik[i]);
    await kuyrukBosalsin();
  }
  if (ilerleme) ilerleme(null, acik.length, acik.length);
}

function hubKur() {
  const AW = 17, AD = 17, AH = 6.6;
  HUB = { AW, AD, AH, hub: true };
  // Sis tüm binayı kapsar: atriyum 17 m, en uzun salon 130 m'yi bulabiliyor.
  // Yakın sınır atriyumun köşegeninden büyük olmalı ki hol içindeyken
  // duvarlar sisin içinde kalmasın; uzak sınır salonun dibini karanlığa
  // karıştırıp "koridor devam ediyor" hissini versin.
  scene.fog = new THREE.Fog(0x151210, 26, 95);
  ekle(new THREE.AmbientLight(0xfff4e0, 0.42));
  ekle(new THREE.HemisphereLight(0xfff8ea, 0x35291d, 0.45));

  const duvarDoku = sivaDokusu(); duvarDoku.repeat.set(5, 3);
  // Cift yuzlu: sergiden geri bakildiginda hub duvarlari tek yuzlu oldugu
  // icin gorunmez oluyor, duvar seffafmis gibi icerisi gozukuyordu.
  const duvarMat = new THREE.MeshStandardMaterial({ map: duvarDoku, roughness: 0.92, side: THREE.DoubleSide });
  const tavanMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d2, roughness: 0.95, side: THREE.DoubleSide });

  // Zemin: cilalı taş (ayna yok — hayalet iz bırakıyordu, bkz. holKur)
  const zeminDoku = mermerZeminDokusu(); zeminDoku.repeat.set(AW / 4, AD / 4);
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(AW, AD),
    new THREE.MeshStandardMaterial({ map: zeminDoku, roughness: 0.22, metalness: 0.18 }));
  zemin.rotation.x = -Math.PI / 2; zemin.position.y = 0.012; ekle(zemin);

  // Tavan + tepe ışıklığı
  const tavan = new THREE.Mesh(new THREE.PlaneGeometry(AW, AD), tavanMat);
  tavan.rotation.x = Math.PI / 2; tavan.position.y = AH; ekle(tavan);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(AW * 0.5, AD * 0.5), new THREE.MeshBasicMaterial({ color: 0xfff7e8 }));
  sky.rotation.x = Math.PI / 2; sky.position.y = AH - 0.02; ekle(sky);
  const rIsik = new THREE.RectAreaLight(0xfff3e0, 3.0, AW * 0.5, AD * 0.5);
  rIsik.position.set(0, AH - 0.05, 0); rIsik.rotation.x = -Math.PI / 2; ekle(rIsik);
  const pIsik = new THREE.PointLight(0xfff3e0, 24, 40); pIsik.position.set(0, AH - 1, 0); ekle(pIsik);

  // Dört duvar — her birinde ortada 2.9 m kapı boşluğu
  const yanW = (AW - 2.9) / 2;
  function duvarKapiBoslukluYap(merkez, ry) {
    for (const taraf of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(yanW, AH), duvarMat);
      p.position.set(taraf * (1.45 + yanW / 2), AH / 2, 0);
      const g = new THREE.Group(); g.add(p);
      const ust = new THREE.Mesh(new THREE.PlaneGeometry(2.9, AH - 3.45), duvarMat);
      ust.position.set(0, 3.45 + (AH - 3.45) / 2, 0);
      g.add(ust);
      g.position.copy(merkez); g.rotation.y = ry; ekle(g);
    }
  }
  duvarKapiBoslukluYap(new THREE.Vector3(0, 0, -AD / 2), 0);        // ön
  duvarKapiBoslukluYap(new THREE.Vector3(0, 0, AD / 2), Math.PI);   // arka
  duvarKapiBoslukluYap(new THREE.Vector3(-AW / 2, 0, 0), Math.PI / 2);  // sol
  duvarKapiBoslukluYap(new THREE.Vector3(AW / 2, 0, 0), -Math.PI / 2);  // sağ

  // Köşe kolonları
  const kolonMat = new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.85 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const kx = sx * (AW / 2 - 1.1), kz = sz * (AD / 2 - 1.1);
    const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, AH, 20), kolonMat);
    govde.position.set(kx, AH / 2, kz); ekle(govde);
    for (const [py, ph] of [[0.28, 0.5], [AH - 0.3, 0.5]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, ph, 20), kolonMat);
      b.position.set(kx, py, kz); ekle(b);
    }
  }

  // Zemin madalyonu
  const madalyonDoku = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d");
    x.strokeStyle = "rgba(201, 162, 39, 0.5)"; x.lineWidth = 5;
    x.beginPath(); x.arc(256, 256, 240, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 216, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(256, 256, 120, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = "rgba(201, 162, 39, 0.3)";
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; x.beginPath(); x.moveTo(256 + Math.cos(a) * 216, 256 + Math.sin(a) * 216); x.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const madalyon = new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({ map: madalyonDoku, transparent: true, depthWrite: false }));
  madalyon.rotation.x = -Math.PI / 2; madalyon.position.y = 0.02; ekle(madalyon);

  // Kapılar: her geziye bir duvar
  const yuvalar = [
    { x: 0, z: -AD / 2 + 0.06, ry: 0 },        // ön
    { x: AW / 2 - 0.06, z: 0, ry: -Math.PI / 2 }, // sağ
    { x: 0, z: AD / 2 - 0.06, ry: Math.PI },   // arka
    { x: -AW / 2 + 0.06, z: 0, ry: Math.PI / 2 }, // sol
  ];
  hub = { kapilar: [], enYakin: null };
  GEZILER.slice(0, 4).forEach((gezi, i) => {
    const acik = gezi.durum === "acik";
    const rec = hubKapisiInsa(
      { ad: gezi.ad, renk: gezi.renk, acik, gezi: gezi.id,   // geçit her zaman kurulur
        vestibulVar: acik,                                     // koridor yalnızca açık sergide
        hedef: acik ? `?gezi=${gezi.id}` : null, altbaslik: acik ? "" : gezi.altbaslik },
      yuvalar[i]
    );
    rec.gezi = gezi;
    if (acik && gezi.muzik) {
      const a = new Audio(gezi.muzik);
      a.loop = true; a.volume = 0; a.preload = "auto";
      a.addEventListener("error", () => { rec.ses = null; });
      rec.ses = a;
    }
    hub.kapilar.push(rec);
  });
}

function hubSesBaslat() {
  if (!hub) return;
  for (const k of hub.kapilar) {
    if (!k.ses || !k.ses.paused) continue;
    k.ses.play().catch(() => {  // jest gerekiyorsa ilk dokunuşta tekrar dene
      const tekrar = () => { k.ses && k.ses.play().catch(() => {}); };
      addEventListener("pointerdown", tekrar, { once: true });
      addEventListener("touchstart", tekrar, { once: true });
    });
  }
}

// Bölgeye göre arayüz: tur düğmesi yalnızca sergi içinde görünür ve
// hub'a dönüldüğünde tur kendiliğinden durur.
function bolgeGorunum() {
  if (!btnOtotur) return;
  const sergide = bolge === "salon" && !!salon;
  btnOtotur.style.display = sergide ? "" : "none";
  if (!sergide && turModu) turuDurdur();
}

function hubGuncelle(dt) {
  if (!hub) return;
  const p = controls.getObject().position;
  let enYakin = null, enYakinMes = Infinity;
  for (const k of hub.kapilar) {
    const d = Math.hypot(p.x - k.cx, p.z - k.cz);
    // Açık kapı yaklaşınca açılır; içindeyken açık kalır (arkandan kapanmaz)
    const icerdeyim = bolge === "salon" && salon && salon.kapi === k;
    const hedef = (k.acik && gezintiAktif && (icerdeyim || d < 5.2)) ? 1 : 0;
    if (hedef > 0.5 !== k.acikDurum) { k.acikDurum = hedef > 0.5; kapiSesi(k.acikDurum); }
    k.acilma += (hedef - k.acilma) * Math.min(dt * 3.2, 1);
    const ease = 1 - Math.pow(1 - k.acilma, 3);
    const aci = ease * (Math.PI / 2 + 0.25);
    k.leaves.forEach((l) => { l.pivot.rotation.y = -l.sx * aci; });
    if (k.acik) {
      if (d < enYakinMes) { enYakinMes = d; enYakin = k; }
      // Salonlar açılışta kurulduğu için burada yükleme yok.
    }
  }
  hub.enYakin = enYakin;
  // Müzik: salondayken o serginin parçası tam sesle; hub'da en yakın kapıdan
  // mesafeyle sızar. Diğer tüm kapılar susar.
  for (const k of hub.kapilar) {
    if (!k.ses) continue;
    let hedefSes = 0;
    if (bolge === "salon" && salon && salon.gezi === k.gezi.id) hedefSes = 0.3;
    else if (bolge === "hub" && k === enYakin && enYakinMes < 6) hedefSes = 0.32 * (1 - enYakinMes / 6);
    k.ses.volume += (hedefSes - k.ses.volume) * Math.min(dt * 1.6, 1);
    if (k.ses.volume < 0.003) k.ses.volume = 0;
  }
}

async function hubBaslat() {
  hubKur();
  qs("#giris-eyebrow").textContent = "SANAL GALERİ";
  qs("#giris-baslik").textContent = "Gezi Galerim";
  qs("#giris-aciklama").textContent = "Anılarınızın sergilendiği sanal müzeye hoş geldiniz.";
  btnGir.disabled = true;
  btnGir.textContent = "Hazırlanıyor";
  qs("#ilerleme")?.classList.add("acik");
  document.title = "Gezi Galerim — Sanal Galeri";
  // Otomatik tur yalnızca bir serginin içindeyken anlamlı: hub'da gizli,
  // salona girince belirir (bolgeGorunum her karede günceller).
  if (btnOtotur) btnOtotur.style.display = "none";

  const pObj = controls.getObject();
  pObj.position.set(0, 1.7, 0);   // salonun tam merkezinde doğ
  pObj.rotation.set(0, 0, 0);      // ön kapıya (−Z) dönük

  btnGir.addEventListener("click", hubSesBaslat); // müzik ancak kullanıcı jestiyle

  renderer.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.05);
    zaman += dt;
    hareketGuncelle(dt);
    turDonusGuncelle(dt);
    joyBakisGuncelle(dt);
    hedefGuncelle();
    hubGuncelle(dt);
    bolgeGorunum();
    eserKuyrugunuIsle();   // eserleri kareye yayarak ekle (donma olmasin)
    // Yalnızca içinde bulunulan salonun parçacık/sinevizyonu güncellenir:
    // tüm salonlar kurulu olduğundan hepsini animasyonlamak boşuna maliyet.
    sakura = salon ? salon.sakura : null;
    videowall = salon ? salon.videowall : null;
    if (salon) { HOL = { W: salon.W, L: salon.L, H: salon.H }; }
    sakuraGuncelle(dt);
    videowallGuncelle(dt);
    renderer.render(scene, camera);
  });

  window.__galeri = { scene, renderer, camera, controls, HUB, kapilar, eserler,
    get hub() { return hub; }, get salon() { return salon; }, get salonlar() { return salonlar; },
    get bolge() { return bolge; }, zamanOku: () => zaman };

  // --- Binanın tamamını şimdi kur ---
  // Ziyaretçi daha girmeden bütün sergiler ayağa kalkar; sonrasında kapıya
  // yaklaşınca hiçbir yükleme/sökme olmaz, takılma yaşanmaz.
  const aciklamaEl = qs("#giris-aciklama");
  const ilerlemeKutu = qs("#ilerleme");
  const ilerlemeDolgu = qs("#ilerleme-dolgu");
  const ilerlemeNot = qs("#ilerleme-not");

  await tumSalonlariKur((ad, i, toplam) => {
    if (ad) {
      // Sakin ve profesyonel: hangi salonun döşendiği + ince ilerleme çubuğu
      if (ilerlemeNot) ilerlemeNot.textContent = `${ad} salonu düzenleniyor`;
      if (ilerlemeDolgu) ilerlemeDolgu.style.width = `${Math.round((i / toplam) * 100)}%`;
      return;
    }
    if (ilerlemeDolgu) ilerlemeDolgu.style.width = "100%";
    if (ilerlemeNot) ilerlemeNot.textContent = "Sergi hazır";
    setTimeout(() => ilerlemeKutu?.classList.remove("acik"), 700);
    aciklamaEl.textContent = "Bir sergi kapısına doğru yürüyün — kapı açılır, müziği başlar ve içeri girersiniz.";
    btnGir.disabled = false;
    btnGir.textContent = "Salona Gir";
  });
}

// ---------- Başlat ----------
async function baslat() {
  if (HUB_MODU) { hubBaslat(); return; }
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

  // 22 esere kadar görünür ray armatürü (yalnızca gövde — bkz. tabloOlustur)
  const rayArmaturu = veri.fotograflar.length <= 22;

  veri.fotograflar.forEach((foto, i) => {
    const taraf = i % 2 === 0 ? -1 : 1;
    const sira = Math.floor(i / 2);
    const z = L / 2 - 6 - sira * 3.7;
    tabloOlustur(foto, i, taraf, z, rayArmaturu);
  });

  // Holün sonundaki duvar: tam boy sinevizyon
  videowallKur(veri.fotograflar);

  // Serginin içinde, ön çıkış kapısının hemen önünde doğ; yüzün eserlere
  // (−Z) dönük. Böylece hub kapısından geçen ziyaretçi doğrudan sergide olur.
  const pObj = controls.getObject();
  pObj.position.set(0, 1.7, L / 2 - 3.2);
  pObj.rotation.set(0, 0, 0);

  btnGir.disabled = false;
  btnGir.textContent = "Salona Gir";

  // Hub kapısından yürüyerek gelindi: karşılama ekranı yok, doğrudan sergide
  if (AKIS) akisBaslat();

  let cikisYapildi = false;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.05);
    zaman += dt;

    // Ön kapı = Ana Salon çıkışı. Yaklaşınca açılır; ortasına varınca hub'a döner.
    const kapiMesafe = Math.abs(pObj.position.z - (L / 2));
    const kapiAcikYeni = gezintiAktif && kapiMesafe < 3.4;
    if (kapiAcikYeni !== kapiAcik) {
      kapiAcik = kapiAcikYeni;
      kapiSesi(kapiAcik); // menteşe gıcırtısı
    }
    if (!cikisYapildi && gezintiAktif && kapiMesafe < 1.4 &&
        Math.abs(pObj.position.x) < 1.3 && performance.now() - girisZamani > 800) {
      cikisYapildi = true;
      perdeKapatVeGit("./?akis=1"); // Ana Salon'a dön
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

    // Sergi müziği: girer girmez çalar, sabit sesle
    if (muzik && !muzik.paused && muzik.volume < 0.3) {
      muzik.volume = Math.min(0.3, muzik.volume + dt * 0.4);
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
  window.__galeri = { scene, renderer, camera, controls, eserler, veri, HOL, HUB, kapilar, sakura,
    get __vw() { return videowall; }, zamanOku: () => zaman };
}

baslat();
