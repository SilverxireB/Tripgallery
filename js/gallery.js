// ===== Gezi Galerim — 3B sanal müze motoru (gerçekçi hol sürümü) =====
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ---------- Yardımcılar ----------
const qs = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const GEZI = params.get("gezi") || "japonya";
const NOT_ANAHTARI = `galeriNotlar:${GEZI}`;

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

// Son işleme: bloom ile ışıklar gerçekçi biçimde "taşar"
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.14, 0.35, 0.93);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
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
  const notSatirlar = metniSar(x, not || "Henüz not eklenmemiş — esere tıklayıp yazabilirsin.", 440);
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
  x.clearRect(0, 0, 2048, 1024);
  x.textAlign = "center";
  x.fillStyle = "#3a3227";
  x.font = "300 64px Georgia, serif";
  x.fillText("— KALICI SERGİ —", 1024, 300);
  x.font = "600 190px Georgia, serif";
  x.fillStyle = "#2c261c";
  x.fillText(baslik, 1024, 520);
  x.fillStyle = "#8a7a55";
  x.fillRect(724, 590, 600, 5);
  x.font = "italic 56px Georgia, serif";
  x.fillStyle = "#4a4234";
  const satirlar = metniSar(x, aciklama || "", 1500);
  let y = 710;
  for (const s of satirlar.slice(0, 3)) {
    x.fillText(s, 1024, y);
    y += 72;
  }
  x.font = "300 44px Georgia, serif";
  x.fillText(`${adet} eser`, 1024, y + 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- Hol kurulumu ----------
const eserler = [];
const plaketler = new Map();
const golgeDoku = golgeDokusu();
const cevizDoku = cevizDokusu();
const isikGolu = isikGoluDokusu();
let HOL = { W: 8, L: 40, H: 5.2 };
let toz = null; // havada süzülen zerreler

function holKur(fotoSayisi, baslik, aciklama) {
  const tarafBasina = Math.ceil(fotoSayisi / 2);
  const W = 8.4, H = 5.2;
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
  for (const uc of [-1, 1]) {
    const duvar = new THREE.Mesh(new THREE.PlaneGeometry(W, H), duvarMat);
    duvar.position.set(0, H / 2, uc * L / 2);
    duvar.rotation.y = uc === 1 ? Math.PI : 0;
    scene.add(duvar);
  }

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
    new THREE.PlaneGeometry(6.4, 3.2),
    new THREE.MeshBasicMaterial({
      map: baslikDuvariDokusu(baslik, aciklama, fotoSayisi),
      transparent: true,
    })
  );
  tanitim.position.set(0, 2.5, -L / 2 + 0.03);
  scene.add(tanitim);

  const tanitimSpot = new THREE.SpotLight(0xfff0d8, 26, 12, 0.7, 0.7, 1.6);
  tanitimSpot.position.set(0, H - 0.4, -L / 2 + 4);
  tanitimSpot.target.position.set(0, 2.2, -L / 2);
  scene.add(tanitimSpot, tanitimSpot.target);

  // --- Giriş kapısı (arkanı dönünce boş duvar yerine çift kanatlı kapı) ---
  const kapiGrubu = new THREE.Group();
  const kapiKasasi = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.45, 0.22), supurgelikMat);
  kapiKasasi.position.y = 1.72;
  kapiGrubu.add(kapiKasasi);
  const kapiMat = new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.4, metalness: 0.1 });
  for (const sx of [-1, 1]) {
    const kanat = new THREE.Mesh(new THREE.BoxGeometry(1.28, 3.2, 0.08), kapiMat);
    kanat.position.set(sx * 0.66, 1.62, 0.09);
    kapiGrubu.add(kanat);
    const kol = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.2, metalness: 0.95 })
    );
    kol.position.set(sx * 0.14, 1.55, 0.15);
    kapiGrubu.add(kol);
  }
  kapiGrubu.position.set(0, 0, L / 2 - 0.1);
  kapiGrubu.rotation.y = Math.PI;
  scene.add(kapiGrubu);

  // --- Banklar ---
  const bankSayisi = Math.max(1, Math.floor((L - 12) / 9));
  const ahsapMat = new THREE.MeshStandardMaterial({ map: cevizDoku, roughness: 0.35, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1713, roughness: 0.3, metalness: 0.8 });
  for (let b = 0; b < bankSayisi; b++) {
    const bz = -L / 2 + 10 + b * ((L - 14) / Math.max(bankSayisi - 1, 1));
    const bank = new THREE.Group();
    for (let cita = 0; cita < 3; cita++) {
      const tahta = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.16), ahsapMat);
      tahta.position.set(0, 0.5, (cita - 1) * 0.2);
      bank.add(tahta);
    }
    for (const sx of [-1, 1]) {
      const bacak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.55), metalMat);
      bacak.position.set(sx * 0.9, 0.25, 0);
      bank.add(bacak);
    }
    const bGolge = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.1),
      new THREE.MeshBasicMaterial({ map: golgeDoku, transparent: true, opacity: 0.5, depthWrite: false })
    );
    bGolge.rotation.x = -Math.PI / 2;
    bGolge.position.y = 0.015;
    bank.add(bGolge);
    bank.position.set(0, 0, bz);
    scene.add(bank);
  }

  // --- Havada süzülen toz zerreleri (ışık huzmesi hissi) ---
  const tozSayisi = Math.min(600, Math.floor(L * 9));
  const pozlar = new Float32Array(tozSayisi * 3);
  const tabanY = new Float32Array(tozSayisi);
  const fazlar = new Float32Array(tozSayisi);
  for (let i = 0; i < tozSayisi; i++) {
    pozlar[i * 3] = (Math.random() - 0.5) * W * 0.85;
    tabanY[i] = 0.5 + Math.random() * (H - 1.2);
    pozlar[i * 3 + 1] = tabanY[i];
    pozlar[i * 3 + 2] = (Math.random() - 0.5) * (L - 3);
    fazlar[i] = Math.random() * Math.PI * 2;
  }
  const tozGeo = new THREE.BufferGeometry();
  tozGeo.setAttribute("position", new THREE.BufferAttribute(pozlar, 3));
  const tozMesh = new THREE.Points(
    tozGeo,
    new THREE.PointsMaterial({
      color: 0xfff3dd,
      size: 0.02,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(tozMesh);
  toz = { mesh: tozMesh, tabanY, fazlar };

  // --- Genel ışık ve atmosfer ---
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.32));
  scene.add(new THREE.HemisphereLight(0xfff8ea, 0x35291d, 0.35));
  scene.fog = new THREE.Fog(0x151210, L * 0.55, L * 1.7);

  return { W, L, H, tarafBasina };
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
let surukleModu = false;
let kilitCalisti = false;
const fareNDC = new THREE.Vector2(0, 0);

// ---------- Hareket ----------
const tuslar = new Set();
addEventListener("keydown", (e) => tuslar.add(e.code));
addEventListener("keyup", (e) => tuslar.delete(e.code));

const hiz = new THREE.Vector3();
const saat = new THREE.Clock();
let adimFazi = 0;
let zaman = 0;

function hareketGuncelle(dt) {
  if (gezintiAktif) {
    const ivme = tuslar.has("ShiftLeft") ? 40 : 24;
    const yon = new THREE.Vector3(
      (tuslar.has("KeyD") || tuslar.has("ArrowRight") ? 1 : 0) -
      (tuslar.has("KeyA") || tuslar.has("ArrowLeft") ? 1 : 0),
      0,
      (tuslar.has("KeyS") || tuslar.has("ArrowDown") ? 1 : 0) -
      (tuslar.has("KeyW") || tuslar.has("ArrowUp") ? 1 : 0)
    );
    if (yon.lengthSq() > 0) yon.normalize();
    hiz.x += yon.x * ivme * dt;
    hiz.z += yon.z * ivme * dt;
  }
  hiz.multiplyScalar(Math.max(1 - 8 * dt, 0));

  controls.moveRight(hiz.x * dt);
  controls.moveForward(-hiz.z * dt);

  const p = controls.getObject().position;
  p.x = THREE.MathUtils.clamp(p.x, -(HOL.W / 2 - 0.7), HOL.W / 2 - 0.7);
  p.z = THREE.MathUtils.clamp(p.z, -(HOL.L / 2 - 0.9), HOL.L / 2 - 0.9);

  const tempo = Math.hypot(hiz.x, hiz.z);
  adimFazi += dt * tempo * 1.9;
  p.y = 1.7 + Math.sin(adimFazi) * Math.min(tempo / 40, 1) * 0.045;
}

function tozGuncelle() {
  if (!toz) return;
  const poz = toz.mesh.geometry.attributes.position;
  for (let i = 0; i < poz.count; i++) {
    poz.array[i * 3 + 1] = toz.tabanY[i] + Math.sin(zaman * 0.22 + toz.fazlar[i]) * 0.45;
    poz.array[i * 3] += Math.sin(zaman * 0.13 + toz.fazlar[i] * 2) * 0.0006;
  }
  poz.needsUpdate = true;
}

// ---------- Nişangâh & etkileşim ----------
const raycaster = new THREE.Raycaster();
const crosshair = qs("#crosshair");
const ipucu = qs("#hedef-ipucu");
let hedefEser = null;

const MERKEZ = new THREE.Vector2(0, 0);

function hedefGuncelle() {
  if (!gezintiAktif) {
    hedefEser = null;
    crosshair.classList.remove("aktif");
    ipucu.classList.remove("gorunur");
    return;
  }
  raycaster.setFromCamera(surukleModu ? fareNDC : MERKEZ, camera);
  const kesisimler = raycaster.intersectObjects(eserler, false);
  const yakin = kesisimler.find((k) => k.distance < 7);
  hedefEser = yakin ? yakin.object : null;
  crosshair.classList.toggle("aktif", !!hedefEser);
  ipucu.classList.toggle("gorunur", !!hedefEser);
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

// ---------- Lightbox ----------
const lightbox = qs("#lightbox");
const lbImg = qs("#lb-img");
const lbBaslik = qs("#lb-baslik");
const lbNot = qs("#lb-not");
const kayitMesaj = qs("#kayit-mesaj");
let acikFoto = null;
let lightboxAcik = false;

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

// Fare kilidi hiç çalışmazsa sürükle-bak moduna geç
function surukleyeGec() {
  if (kilitCalisti) return;
  surukleModu = true;
  const fareIpucu = qs("#ipucu-fare");
  if (fareIpucu) fareIpucu.innerHTML = "<kbd>Fare</kbd> basılı tut & sürükle";
  gezintiBaslat();
}

document.addEventListener("pointerlockerror", surukleyeGec);

btnGir.addEventListener("click", () => {
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
    const yanit = await fetch(`data/${GEZI}.json`);
    if (!yanit.ok) throw new Error(yanit.status);
    veri = await yanit.json();
  } catch {
    qs("#giris-baslik").textContent = "Galeri bulunamadı";
    qs("#giris-aciklama").textContent = `"data/${GEZI}.json" dosyası okunamadı.`;
    return;
  }

  const kayitli = yerelNotlar();
  for (const f of veri.fotograflar) {
    if (kayitli[f.id]) {
      f.baslik = kayitli[f.id].baslik ?? f.baslik;
      f.not = kayitli[f.id].not ?? f.not;
    }
  }

  qs("#giris-baslik").textContent = veri.baslik;
  qs("#giris-aciklama").textContent =
    `${veri.aciklama || ""}  ·  ${veri.fotograflar.length} eser`;
  document.title = `${veri.baslik} — Sanal Galeri`;

  const { L } = holKur(veri.fotograflar.length, veri.baslik, veri.aciklama);

  // 22 esere kadar gerçek spot ışığı; üzerinde sahte ışık gölü (performans)
  const gercekSpot = veri.fotograflar.length <= 22;

  veri.fotograflar.forEach((foto, i) => {
    const taraf = i % 2 === 0 ? -1 : 1;
    const sira = Math.floor(i / 2);
    const z = L / 2 - 6 - sira * 3.7;
    tabloOlustur(foto, i, taraf, z, gercekSpot);
  });

  controls.getObject().position.set(0, 1.7, L / 2 - 2);
  camera.lookAt(0, 1.65, -L / 2);

  btnGir.disabled = false;
  btnGir.textContent = "Salona Gir";

  renderer.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.05);
    zaman += dt;
    hareketGuncelle(dt);
    hedefGuncelle();
    tozGuncelle();
    composer.render();
  });

  // Tanılama (konsoldan erişim için)
  window.__galeri = { scene, renderer, camera, controls, eserler, veri, HOL };
}

baslat();
