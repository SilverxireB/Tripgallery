"""
Google Photos paylasilan album linkinden fotograf adreslerini cekip
galeri manifestine (data/<gezi>.json) doldurur.

Kullanim:
    python tools/google_photos_cek.py <album_linki> <gezi_adi> ["Galeri Basligi"]

Ornek:
    python tools/google_photos_cek.py https://photos.app.goo.gl/XXXX japonya "Japonya 2026"

Notlar:
- Album "link ile paylasilan" (herkese acik link) olmali.
- Fotograflar assets/<gezi>/ klasorune INDIRILIR; tarayici Google'in sunucusundan
  dogrudan yukleyemez (CORS engeli), bu yuzden yerel kopya sart.
- Var olan manifestteki basliklar/notlar korunur; sadece yeni fotograflar eklenir.
- Google sayfa yapisini degistirirse betik calismayabilir; o durumda fotograflari
  assets/<gezi>/ klasorune elle kopyalamak her zaman calisir.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0"}


def album_fotolari(url: str) -> list[str]:
    istek = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(istek, timeout=30) as yanit:
        html = yanit.read().decode("utf-8", errors="ignore")

    # Paylasilan album sayfasinda tam boy gorseller bu desenle gomulu gelir
    adresler = re.findall(r'https://lh3\.googleusercontent\.com/pw/[A-Za-z0-9_\-]+', html)

    # Sirayi koruyarak tekrarlari at
    benzersiz = list(dict.fromkeys(adresler))
    return benzersiz


def indir(adres: str, hedef: Path) -> bool:
    if hedef.exists():
        return True
    try:
        istek = urllib.request.Request(f"{adres}=w1920", headers=UA)
        with urllib.request.urlopen(istek, timeout=60) as yanit:
            hedef.write_bytes(yanit.read())
        return True
    except Exception as hata:
        print(f"  UYARI: indirilemedi ({hata}): {adres[:60]}...")
        return False


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    url, gezi = sys.argv[1], sys.argv[2]
    baslik = sys.argv[3] if len(sys.argv) > 3 else gezi.title()

    print(f"Album cekiliyor: {url}")
    adresler = album_fotolari(url)
    if not adresler:
        print("HATA: Fotograf bulunamadi. Linkin 'herkese acik paylasim' linki")
        print("oldugundan emin ol (photos.app.goo.gl/... veya photos.google.com/share/...).")
        sys.exit(2)
    print(f"{len(adresler)} fotograf bulundu.")

    manifest_yolu = KOK / "data" / f"{gezi}.json"
    if manifest_yolu.exists():
        veri = json.loads(manifest_yolu.read_text(encoding="utf-8"))
    else:
        veri = {"baslik": baslik, "aciklama": "", "fotograflar": []}

    veri["albumLink"] = url
    mevcut = {f.get("kaynak", "") for f in veri["fotograflar"]}

    foto_klasoru = KOK / "assets" / gezi
    foto_klasoru.mkdir(parents=True, exist_ok=True)

    eklenen = 0
    for i, adres in enumerate(adresler):
        if adres in mevcut:
            continue
        dosya = foto_klasoru / f"gp{i + 1:03d}.jpg"
        print(f"  indiriliyor ({i + 1}/{len(adresler)}): {dosya.name}")
        if not indir(adres, dosya):
            continue
        veri["fotograflar"].append({
            "id": f"gp{i + 1:03d}",
            "src": f"assets/{gezi}/{dosya.name}",
            "kaynak": adres,
            "baslik": f"Fotoğraf {i + 1}",
            "not": "",
        })
        eklenen += 1

    manifest_yolu.parent.mkdir(exist_ok=True)
    manifest_yolu.write_text(
        json.dumps(veri, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{eklenen} yeni fotograf eklendi -> {manifest_yolu}")
    print(f"Galeri: gallery.html?gezi={gezi}")


if __name__ == "__main__":
    main()
