#!/usr/bin/env python3
"""Tests de non-régression (TNR) contre un déploiement en cours.

Usage : python3 scripts/tnr.py [BASE_URL]     (défaut : http://localhost)
Identifiants admin lus dans .env (ADMIN_USERNAME / ADMIN_PASSWORD) ou TNR_USER / TNR_PASSWORD.

Ne crée que des données préfixées « tnr- » et les supprime à la fin, même en cas d'échec.
Les réglages du site et l'ordre des galeries sont restaurés à l'identique.
"""
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import uuid
import zlib
from pathlib import Path

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost").rstrip("/")
ROOT = Path(__file__).resolve().parent.parent
RUN = uuid.uuid4().hex[:6]

results = []  # (section, name, ok, detail)
section = "?"
cleanup = []  # callables, run in reverse


def env_file():
    vals = {}
    p = ROOT / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def http(method, path, body=None, token=None, headers=None, raw=None, ctype=None):
    url = path if path.startswith("http") else BASE + path
    h = dict(headers or {})
    data = None
    if raw is not None:
        data = raw
        h["Content-Type"] = ctype
    elif body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    if token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def js(b):
    try:
        return json.loads(b) if b else None
    except ValueError:
        return None


def check(name, cond, detail=""):
    results.append((section, name, bool(cond), "" if cond else str(detail)[:300]))
    return bool(cond)


def expect(name, method, path, status, **kw):
    s, b, h = http(method, path, **kw)
    ok = s == status if isinstance(status, int) else s in status
    check(name, ok, f"HTTP {s} (attendu {status}) {b[:200]!r}")
    return s, b, h


def multipart(fields, file_field, filename, content, ctype):
    boundary = "tnr" + uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'
        f"Content-Type: {ctype}\r\n\r\n".encode() + content + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def png(w=4, h=3):
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    rows = b"".join(b"\x00" + b"\xc8\x64\x32" * w for _ in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


def upload(token, name, content, ctype):
    body, ct = multipart({"filename": name}, "file", name, content, ctype)
    s, b, _ = http("POST", "/api/admin/media/upload", token=token, raw=body, ctype=ct)
    return s, js(b)


def run():
    global section
    creds = env_file()
    user = os.environ.get("TNR_USER") or creds.get("ADMIN_USERNAME", "admin")
    pwd = os.environ.get("TNR_PASSWORD") or creds.get("ADMIN_PASSWORD", "")

    # ------------------------------------------------------------------ site public
    section = "Pages publiques"
    s, b, _ = http("GET", "/api/public/categories")
    cats = js(b) or []
    s, b, _ = http("GET", "/api/public/videos")
    vids = js(b) or []
    for p in ["/", "/work", "/videos", "/about", "/contact", "/admin/login", "/admin",
              "/robots.txt", "/sitemap.xml", "/opengraph-image", "/favicon.ico"]:
        expect(f"GET {p}", "GET", p, 200)
    for c in cats:
        expect(f"GET /work/{c['slug']}", "GET", f"/work/{c['slug']}", 200)
        expect(f"GET /videos/{c['slug']}", "GET", f"/videos/{c['slug']}", (200, 404))
    expect("Page inconnue -> 404", "GET", f"/tnr-nexistepas-{RUN}", 404)
    expect("Galerie inconnue -> 404", "GET", f"/work/tnr-nexistepas-{RUN}", 404)
    s, b, _ = http("GET", "/")
    html = b.decode("utf-8", "replace")
    check("Accueil : section Photos présente", "Photos" in html)
    check("Accueil : section Film présente si vidéos", (not vids) or "Film" in html)
    s, b, _ = http("GET", "/sitemap.xml")
    sm = b.decode("utf-8", "replace")
    check("Sitemap liste chaque galerie", all(f"/work/{c['slug']}" in sm for c in cats), sm[:200])
    check("Sitemap sans URL localhost", "localhost" not in sm and "backend:" not in sm, sm[:200])
    s, b, _ = http("GET", "/robots.txt")
    check("robots.txt pointe vers le sitemap", b"sitemap" in b.lower(), b[:200])

    # ------------------------------------------------------------------ API publique
    section = "API publique"
    expect("GET categories", "GET", "/api/public/categories", 200)
    check("Catégories publiques toutes visibles", all(c.get("visible") for c in cats))
    for c in cats:
        expect(f"GET categories/{c['slug']}", "GET", f"/api/public/categories/{c['slug']}", 200)
        s, b, _ = expect(f"GET categories/{c['slug']}/media", "GET",
                         f"/api/public/categories/{c['slug']}/media", 200)
        media = js(b) or []
        check(f"{c['slug']} : médias visibles avec url", all(m.get("visible") and m.get("url") for m in media))
        expect(f"GET categories/{c['slug']}/videos", "GET", f"/api/public/categories/{c['slug']}/videos", 200)
    expect("GET videos", "GET", "/api/public/videos", 200)
    check("Vidéos de type VIDEO", all(v.get("type") == "VIDEO" for v in vids))
    expect("GET hero", "GET", "/api/public/hero", (200, 204))
    expect("GET featured", "GET", "/api/public/featured", 200)
    expect("GET settings", "GET", "/api/public/settings", 200)
    expect("Slug inconnu -> 404", "GET", f"/api/public/categories/tnr-x-{RUN}", 404)
    expect("Endpoint inconnu -> 404", "GET", "/api/public/tnr-nope", 404)

    # Les médias hérités de Cloudinary doivent toujours être servis.
    s, b, _ = http("GET", "/api/public/featured")
    sample = [m["url"] for m in (js(b) or [])][:1] + [c["coverImageUrl"] for c in cats if c.get("coverImageUrl")][:2]
    for u in sample:
        full = u if u.startswith("http") else BASE + u
        s, _, _ = http("GET", full)
        check(f"Image accessible {u[-50:]}", s == 200, f"HTTP {s}")

    # ------------------------------------------------------------------ sécurité
    section = "Sécurité / authentification"
    for m, p in [("GET", "/api/admin/categories"), ("GET", "/api/admin/media"), ("GET", "/api/admin/settings"),
                 ("POST", "/api/admin/categories"), ("DELETE", "/api/admin/media/1"),
                 ("POST", "/api/admin/media/upload"), ("GET", "/api/auth/me"), ("PUT", "/api/auth/account")]:
        expect(f"{m} {p} sans jeton -> 401", m, p, 401, body={} if m in ("POST", "PUT") else None)
    expect("Jeton invalide -> 401", "GET", "/api/admin/categories", 401, token="abc.def.ghi")
    expect("Login mauvais mot de passe -> 401", "POST", "/api/auth/login", 401,
           body={"username": user, "password": "tnr-wrong-" + RUN})
    expect("Login champs vides -> 400", "POST", "/api/auth/login", 400, body={"username": "", "password": ""})
    expect("Login JSON invalide -> 400", "POST", "/api/auth/login", 400, raw=b"{oops", ctype="application/json")
    s, b, _ = expect("Login admin -> 200", "POST", "/api/auth/login", 200, body={"username": user, "password": pwd})
    token = (js(b) or {}).get("token")
    if not check("Jeton reçu", token, "login admin impossible : vérifier ADMIN_PASSWORD / TNR_PASSWORD"):
        return
    s, b, _ = expect("GET /api/auth/me", "GET", "/api/auth/me", 200, token=token)
    check("me : bon utilisateur", (js(b) or {}).get("username") == user, b[:200])
    s, _, h = http("OPTIONS", "/api/public/categories",
                   headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    check("CORS : origine étrangère refusée",
          h.get("Access-Control-Allow-Origin") not in ("https://evil.example", "*"), h)
    s, b, _ = http("GET", "/media/../../etc/passwd")
    check("Traversée de chemin /media bloquée", b"root:" not in b, f"HTTP {s}")

    # ------------------------------------------------------------------ catégories
    section = "Admin : catégories"
    s, b, _ = expect("Liste admin", "GET", "/api/admin/categories", 200, token=token)
    before = js(b) or []
    original_order = [c["id"] for c in before]
    slug = f"tnr-galerie-{RUN}"
    s, b, _ = expect("Création", "POST", "/api/admin/categories", 201, token=token,
                     body={"name": f"TNR Galerie {RUN}", "slug": slug, "description": "créée par les TNR", "visible": True})
    cat = js(b) or {}
    if cat.get("id"):
        cleanup.append(lambda: http("DELETE", f"/api/admin/categories/{cat['id']}", token=token))
    check("Création : slug conservé", cat.get("slug") == slug, cat)
    expect("Slug dupliqué -> 409", "POST", "/api/admin/categories", 409, token=token,
           body={"name": "dup", "slug": slug})
    expect("Slug invalide -> 400", "POST", "/api/admin/categories", 400, token=token,
           body={"name": "x", "slug": "Pas Valide!"})
    expect("Nom manquant -> 400", "POST", "/api/admin/categories", 400, token=token, body={"slug": "tnr-x"})
    s, b, _ = expect("Slug généré depuis le nom", "POST", "/api/admin/categories", 201, token=token,
                     body={"name": f"TNR Auto {RUN}"})
    auto = js(b) or {}
    if auto.get("id"):
        cleanup.append(lambda: http("DELETE", f"/api/admin/categories/{auto['id']}", token=token))
    check("Slug auto au bon format", auto.get("slug", "").startswith("tnr-auto"), auto.get("slug"))
    expect("Visible côté public", "GET", f"/api/public/categories/{slug}", 200)
    expect("Page /work/<slug>", "GET", f"/work/{slug}", 200)
    s, b, _ = expect("Modification", "PUT", f"/api/admin/categories/{cat.get('id')}", 200, token=token,
                     body={"name": f"TNR Renommée {RUN}", "slug": slug, "description": "modifiée"})
    check("Modification appliquée", (js(b) or {}).get("name") == f"TNR Renommée {RUN}", b[:200])
    expect("Modif. vers slug existant -> 409", "PUT", f"/api/admin/categories/{cat.get('id')}", 409, token=token,
           body={"name": "x", "slug": auto.get("slug")})
    expect("Masquer", "PATCH", f"/api/admin/categories/{cat.get('id')}/visibility?visible=false", 200, token=token)
    expect("Masquée -> 404 public", "GET", f"/api/public/categories/{slug}", 404)
    # La page avait été rendue juste avant : elle ne doit pas rester servie depuis le cache.
    expect("Masquée -> page /work/<slug> 404", "GET", f"/work/{slug}", 404)
    s, b, _ = http("GET", "/api/public/categories")
    check("Masquée absente de la liste publique", slug not in [c["slug"] for c in js(b) or []])
    expect("Réafficher", "PATCH", f"/api/admin/categories/{cat.get('id')}/visibility?visible=true", 200, token=token)
    expect("Réaffichée -> 200 public", "GET", f"/api/public/categories/{slug}", 200)
    new_order = [cat["id"], auto["id"]] + original_order
    expect("Réordonner", "PATCH", "/api/admin/categories/reorder", 204, token=token, body={"orderedIds": new_order})
    s, b, _ = http("GET", "/api/admin/categories", token=token)
    check("Ordre appliqué", [c["id"] for c in js(b) or []][:2] == new_order[:2], b[:200])
    expect("Réordonner id inconnu -> 404", "PATCH", "/api/admin/categories/reorder", 404, token=token,
           body={"orderedIds": [999999999]})
    expect("Réordonner liste vide -> 400", "PATCH", "/api/admin/categories/reorder", 400, token=token,
           body={"orderedIds": []})
    expect("Modifier id inconnu -> 404", "PUT", "/api/admin/categories/999999999", 404, token=token,
           body={"name": "x"})

    # ------------------------------------------------------------------ médias
    section = "Admin : médias (stockage local)"
    s, full = upload(token, f"tnr-{RUN}.webp", png(8, 6), "image/webp")
    check("Upload image -> 200", s == 200 and full and full.get("key"), full)
    s, thumb = upload(token, f"tnr-{RUN}-thumb.webp", png(4, 3), "image/webp")
    check("Upload miniature -> 200", s == 200 and thumb and thumb.get("key"), thumb)
    body, ct = multipart({}, "file", "vide.webp", b"", "image/webp")
    s, _, _ = http("POST", "/api/admin/media/upload", token=token, raw=body, ctype=ct)
    check("Upload fichier vide -> 400", s == 400, f"HTTP {s}")
    body, ct = multipart({"filename": "../../../etc/evil.webp"}, "file", "x.webp", b"x", "image/webp")
    s, b, _ = http("POST", "/api/admin/media/upload", token=token, raw=body, ctype=ct)
    evil = js(b) or {}
    check("Nom de fichier malveillant neutralisé", s == 400 or (".." not in evil.get("key", "") and not evil.get("key", "").startswith("/")), evil)
    if s == 200 and evil.get("key"):
        orphan_evil = evil
    else:
        orphan_evil = None

    img = None
    if full and thumb:
        url = full["url"]
        check("URL publique relative /media (indépendante de l'IP)", url.startswith("/media/") or url.startswith(BASE + "/media/"), url)
        s, b, h = http("GET", url if url.startswith("http") else BASE + url)
        check("Fichier servi par Caddy", s == 200 and b[:4] == b"\x89PNG", f"HTTP {s}")
        check("Cache immutable", "immutable" in h.get("Cache-Control", ""), h.get("Cache-Control"))
        s, b, _ = expect("Enregistrement image", "POST", "/api/admin/media", 201, token=token, body={
            "title": f"TNR photo {RUN}", "description": "tnr", "url": full["url"], "storageKey": full["key"],
            "thumbnailUrl": thumb["url"], "thumbnailStorageKey": thumb["key"], "blurDataUrl": "data:image/png;base64,AA==",
            "type": "IMAGE", "width": 8, "height": 6, "format": "webp", "bytes": full.get("bytes"),
            "categoryId": cat.get("id"), "visible": True})
        img = js(b) or {}
        if img.get("id"):
            cleanup.append(lambda: http("DELETE", f"/api/admin/media/{img['id']}", token=token))
        check("Image : miniature et flou renvoyés", img.get("thumbnailUrl") and img.get("blurDataUrl"), img)
        expect("Double enregistrement même clé -> 409", "POST", "/api/admin/media", 409, token=token, body={
            "url": full["url"], "storageKey": full["key"], "type": "IMAGE"})
    expect("Enregistrement sans url -> 400", "POST", "/api/admin/media", 400, token=token,
           body={"storageKey": "x", "type": "IMAGE"})
    expect("Enregistrement sans type -> 400", "POST", "/api/admin/media", 400, token=token,
           body={"url": "/media/x", "storageKey": "x"})

    # Vidéo + affiche
    s, clip = upload(token, f"tnr-{RUN}.mp4", b"\x00\x00\x00\x18ftypmp42" + os.urandom(2048), "video/mp4")
    s2, poster = upload(token, f"tnr-{RUN}-poster.webp", png(16, 9), "image/webp")
    vid = None
    if check("Upload vidéo + affiche", clip and poster and clip.get("key") and poster.get("key"), (clip, poster)):
        s, b, _ = expect("Enregistrement vidéo", "POST", "/api/admin/media", 201, token=token, body={
            "title": f"TNR film {RUN}", "url": clip["url"], "storageKey": clip["key"],
            "posterUrl": poster["url"], "posterStorageKey": poster["key"], "type": "VIDEO",
            "width": 16, "height": 9, "format": "mp4", "durationSeconds": 1.5, "categoryId": cat.get("id"), "visible": True})
        vid = js(b) or {}
        if vid.get("id"):
            cleanup.append(lambda: http("DELETE", f"/api/admin/media/{vid['id']}", token=token))

    # Média hérité Cloudinary (clé sans fichier local) : la suppression doit marcher.
    s, b, _ = expect("Enregistrement média hérité Cloudinary", "POST", "/api/admin/media", 201, token=token, body={
        "url": "https://res.cloudinary.com/demo/image/upload/sample.jpg", "storageKey": f"portfolio/tnr-legacy-{RUN}",
        "type": "IMAGE", "categoryId": cat.get("id"), "visible": False})
    legacy = js(b) or {}

    if img and img.get("id"):
        s, b, _ = http("GET", f"/api/public/categories/{slug}/media")
        pub = js(b) or []
        ids = [m["id"] for m in pub]
        check("Image visible dans la galerie publique", img["id"] in ids, ids)
        check("Média masqué absent du public", legacy.get("id") not in ids, ids)
        s, b, _ = http("GET", f"/api/public/categories/{slug}")
        check("Compteur de médias de la galerie", (js(b) or {}).get("mediaCount", 0) >= 1, b[:200])
        expect("Page galerie avec média", "GET", f"/work/{slug}", 200)
        if vid and vid.get("id"):
            s, b, _ = http("GET", f"/api/public/categories/{slug}/videos")
            check("Vidéo dans les vidéos de la galerie", vid["id"] in [m["id"] for m in js(b) or []])
            s, b, _ = http("GET", "/api/public/videos")
            check("Vidéo dans /api/public/videos", vid["id"] in [m["id"] for m in js(b) or []])
            check("Vidéo absente des photos de la galerie", vid["id"] not in ids, ids)
            expect("Page /videos/<slug>", "GET", f"/videos/{slug}", 200)
            s, b, _ = http("GET", "/")
            check("Accueil : section Film affichée", b"Film" in b)

        s, b, _ = expect("Liste admin filtrée par galerie", "GET", f"/api/admin/media?categoryId={cat.get('id')}", 200, token=token)
        admin_ids = [m["id"] for m in js(b) or []]
        check("Admin voit aussi les médias masqués", legacy.get("id") in admin_ids, admin_ids)
        expect("Liste admin complète", "GET", "/api/admin/media", 200, token=token)

        s, b, _ = expect("Modification titre (PATCH partiel)", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token,
                         body={"title": f"TNR titre modifié {RUN}"})
        upd = js(b) or {}
        check("Titre modifié, description conservée", upd.get("title") == f"TNR titre modifié {RUN}" and upd.get("description") == "tnr", upd)
        expect("Masquer média", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token, body={"visible": False})
        s, b, _ = http("GET", f"/api/public/categories/{slug}/media")
        check("Média masqué retiré du public", img["id"] not in [m["id"] for m in js(b) or []])
        expect("Réafficher média", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token, body={"visible": True})

        s, b, _ = http("GET", "/api/public/featured")
        featured_before = [m["id"] for m in js(b) or []]
        expect("Mettre en avant", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token, body={"featured": True})
        s, b, _ = http("GET", "/api/public/featured")
        check("Présent dans featured", img["id"] in [m["id"] for m in js(b) or []])
        expect("Retirer la mise en avant", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token, body={"featured": False})
        s, b, _ = http("GET", "/api/public/featured")
        check("Featured restauré", [m["id"] for m in js(b) or []] == featured_before)

        order = [x for x in [legacy.get("id"), img["id"], vid and vid.get("id")] if x]
        expect("Réordonner médias", "PATCH", "/api/admin/media/reorder", 204, token=token, body={"orderedIds": order})
        s, b, _ = http("GET", f"/api/admin/media?categoryId={cat.get('id')}", token=token)
        check("Ordre médias appliqué", [m["id"] for m in js(b) or []] == order, b[:300])

        expect("Retirer de la galerie", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token,
               body={"removeFromCategory": True})
        s, b, _ = http("GET", f"/api/admin/media?categoryId={cat.get('id')}", token=token)
        check("Média détaché", img["id"] not in [m["id"] for m in js(b) or []])
        expect("Refiler dans la galerie", "PATCH", f"/api/admin/media/{img['id']}", 200, token=token,
               body={"categoryId": cat.get("id")})
        expect("Média id inconnu -> 404", "PATCH", "/api/admin/media/999999999", 404, token=token, body={"title": "x"})

        # Suppression : la ligne ET les fichiers disparaissent.
        expect("Suppression image", "DELETE", f"/api/admin/media/{img['id']}", 204, token=token)
        for label, u in [("original", full["url"]), ("miniature", thumb["url"])]:
            s, _, _ = http("GET", u if u.startswith("http") else BASE + u)
            check(f"Fichier {label} supprimé du disque", s == 404, f"HTTP {s}")
        if vid and vid.get("id"):
            expect("Suppression vidéo", "DELETE", f"/api/admin/media/{vid['id']}", 204, token=token)
            s, _, _ = http("GET", BASE + poster["url"] if not poster["url"].startswith("http") else poster["url"])
            check("Affiche supprimée du disque", s == 404, f"HTTP {s}")
    if legacy.get("id"):
        expect("Suppression média hérité Cloudinary", "DELETE", f"/api/admin/media/{legacy['id']}", 204, token=token)
    expect("Suppression id inconnu -> 404", "DELETE", "/api/admin/media/999999999", 404, token=token)

    # ------------------------------------------------------------------ réglages
    section = "Admin : réglages du site"
    s, b, _ = expect("Lecture réglages", "GET", "/api/admin/settings", 200, token=token)
    settings = js(b) or {}
    if settings:
        cleanup.append(lambda: http("PUT", "/api/admin/settings", token=token, body=settings))
        marker = f"TNR {RUN}"
        field = "heroTagline"
        changed = dict(settings, heroTagline=marker)
        s, b, _ = expect(f"Modification ({field})", "PUT", "/api/admin/settings", 200, token=token, body=changed)
        s, b, _ = http("GET", "/api/public/settings")
        check("Réglage visible côté public", (js(b) or {}).get(field) == marker, b[:200])
        expect("Restauration réglages", "PUT", "/api/admin/settings", 200, token=token, body=settings)
        s, b, _ = http("GET", "/api/admin/settings", token=token)
        after = js(b) or {}
        check("Réglages identiques après restauration",
              {k: v for k, v in after.items() if k not in ("updatedAt", "createdAt")}
              == {k: v for k, v in settings.items() if k not in ("updatedAt", "createdAt")})

    # ------------------------------------------------------------------ compte
    section = "Admin : compte"
    expect("Mot de passe actuel erroné -> refusé", "PUT", "/api/auth/account", (400, 401, 403), token=token,
           body={"currentPassword": "tnr-wrong-" + RUN, "username": user})
    expect("Nom d'utilisateur invalide -> 400", "PUT", "/api/auth/account", 400, token=token,
           body={"currentPassword": pwd, "username": "a b"})
    expect("Nouveau mot de passe > 72 car. -> 400", "PUT", "/api/auth/account", 400, token=token,
           body={"currentPassword": pwd, "username": user, "newPassword": "x" * 73})
    s, b, _ = expect("Mise à jour sans changement -> 200", "PUT", "/api/auth/account", 200, token=token,
                     body={"currentPassword": pwd, "username": user})
    expect("Login toujours OK après mise à jour", "POST", "/api/auth/login", 200,
           body={"username": user, "password": pwd})

    # ------------------------------------------------------------------ nettoyage catégories
    section = "Admin : suppression"
    if cat.get("id"):
        expect("Suppression catégorie", "DELETE", f"/api/admin/categories/{cat['id']}", 204, token=token)
        expect("Catégorie supprimée -> 404 public", "GET", f"/api/public/categories/{slug}", 404)
        expect("Page /work/<slug> supprimée -> 404", "GET", f"/work/{slug}", 404)
    if auto.get("id"):
        expect("Suppression catégorie auto", "DELETE", f"/api/admin/categories/{auto['id']}", 204, token=token)
    expect("Suppression catégorie inconnue -> 404", "DELETE", "/api/admin/categories/999999999", 404, token=token)
    expect("Restauration ordre des galeries", "PATCH", "/api/admin/categories/reorder", 204, token=token,
           body={"orderedIds": original_order})
    s, b, _ = http("GET", "/api/admin/categories", token=token)
    check("Ordre des galeries restauré", [c["id"] for c in js(b) or []] == original_order)
    if orphan_evil:
        # Fichier uploadé sans ligne : on le rattache puis supprime pour ne rien laisser.
        s, b, _ = http("POST", "/api/admin/media", token=token, body={
            "url": orphan_evil["url"], "storageKey": orphan_evil["key"], "type": "IMAGE", "visible": False})
        o = js(b) or {}
        if o.get("id"):
            http("DELETE", f"/api/admin/media/{o['id']}", token=token)


def main():
    t0 = time.time()
    try:
        run()
    except Exception as e:  # noqa: BLE001 — a crash is itself a failed test
        results.append((section, "Exception non prévue", False, repr(e)))
    finally:
        for fn in reversed(cleanup):
            try:
                fn()
            except Exception:
                pass
    cur = None
    for sec, name, ok, detail in results:
        if sec != cur:
            print(f"\n== {sec}")
            cur = sec
        print(f"  [{'OK' if ok else 'KO'}] {name}" + (f"\n        -> {detail}" if not ok else ""))
    ko = sum(1 for r in results if not r[2])
    print(f"\n{len(results) - ko}/{len(results)} OK, {ko} KO  ({time.time() - t0:.1f}s, run {RUN})")
    sys.exit(1 if ko else 0)


if __name__ == "__main__":
    main()
