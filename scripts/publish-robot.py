# Publica uma versão do robô no portal (o mesmo que Admin → Arquivos do robô), direto no banco da VPS.
# Uso (dentro de site/):  python scripts/publish-robot.py v7.7 [--current] [--notes-pt "..."] [--notes-en "..."] [--notes-es "..."]
# Lê ../ea/dist/<pt|en|es>/Ai X PULSE RS <versão> <PT|EN|ES>.ex4 (gerados pelo ea/build_langs.py).
# --current = vira a versão "Atual" que o cliente baixa (as outras deixam de ser).
# Autorizado pelo Alesson em 2026-11-27 ("eu preciso que isso fique 100% automático... te dou total permissão").
import argparse, base64, json, os, subprocess, sys

HOST = "pulse@2.25.215.59"
KEY = os.path.expanduser("~/.ssh/aixtradex_vps")
PRODUCT = "pulse-rs"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST = os.path.join(ROOT, "ea", "dist")
MAX_BYTES = 4 * 1024 * 1024


def lit(s):
    return "NULL" if s is None else "'" + s.replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("version")
    ap.add_argument("--current", action="store_true")
    ap.add_argument("--replace", action="store_true", help="substitui a versão com o mesmo número")
    ap.add_argument("--notes-pt", default="")
    ap.add_argument("--notes-en", default="")
    ap.add_argument("--notes-es", default="")
    a = ap.parse_args()

    files = []
    for lang in ("pt", "en", "es"):
        path = os.path.join(DIST, lang, f"Ai X PULSE RS {a.version} {lang.upper()}.ex4")
        if not os.path.isfile(path):
            sys.exit(f"Falta o arquivo: {path} (rode ea/build_langs.py)")
        data = open(path, "rb").read()
        if len(data) > MAX_BYTES:
            sys.exit(f"Arquivo maior que 4 MB: {path}")
        files.append((lang, data))

    notes_i18n = {k: v for k, v in (("pt", a.notes_pt), ("en", a.notes_en), ("es", a.notes_es)) if v}
    file_name = f"Ai X PULSE RS {a.version}.ex4"
    sql = ["\\set ON_ERROR_STOP on", "set client_encoding = 'UTF8';", "begin;"]
    if a.replace:
        # mesma versão recompilada (correção logo depois de publicar): apaga a anterior (os arquivos vão junto, cascade)
        sql.append(f"delete from product_versions where product = {lit(PRODUCT)} and version = {lit(a.version)};")
    sql.append(
        "with v as (insert into product_versions (product, version, notes, notes_i18n, file_name, size, is_current) values "
        f"({lit(PRODUCT)}, {lit(a.version)}, {lit(a.notes_pt or None)}, {lit(json.dumps(notes_i18n, ensure_ascii=False)) + '::jsonb' if notes_i18n else 'NULL'}, "
        f"{lit(file_name)}, {len(files[0][1])}, false) returning id) select id from v \\gset"
    )
    for lang, data in files:
        sql.append(
            f"insert into product_files (version_id, lang, size, data_base64) values (:id, {lit(lang)}, {len(data)}, '{base64.b64encode(data).decode()}');"
        )
    if a.current:
        sql.append(f"update product_versions set is_current = false where product = {lit(PRODUCT)};")
        sql.append("update product_versions set is_current = true where id = :id;")
    sql.append(
        f"insert into admin_events (actor, action, detail) values ('claude (script)', 'files.upload', "
        f"{lit(a.version + ' · ' + file_name + ' · PT/EN/ES' + (' · atual' if a.current else ''))});"
    )
    sql.append("commit;")
    sql.append(f"select id, version, is_current, size from product_versions where product = {lit(PRODUCT)} order by created_at desc limit 3;")

    cmd = ["ssh", "-i", KEY, "-o", "BatchMode=yes", HOST,
           'set -a; . /srv/pulse/shared/.env; set +a; psql "$DATABASE_URL" -At -F" | "']
    r = subprocess.run(cmd, input="\n".join(sql).encode("utf-8"), capture_output=True)
    sys.stdout.write(r.stdout.decode("utf-8", "replace"))
    sys.stderr.write(r.stderr.decode("utf-8", "replace"))
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
