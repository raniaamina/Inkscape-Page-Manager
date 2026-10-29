#!/usr/bin/env bash
# ==============================================================================
# Script untuk memaketkan ekstensi Inkscape "Page Manager" ke ZIP & membuat MD5
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PACKAGE_NAME="ink-pageman"
ZIP_FILE="${PACKAGE_NAME}.zip"
MD5_FILE="${ZIP_FILE}.md5"

echo "=== Memulai Pemaketan ${PACKAGE_NAME} ==="

# Bersihkan file zip dan md5 lama jika ada
rm -f "${ZIP_FILE}" "${MD5_FILE}"

# Buat config.json default jika belum ada di lingkungan lokal
if [[ ! -f "config.json" ]]; then
    cat << 'EOF' > config.json
{
    "default_preset": "A4",
    "default_gap": 20,
    "default_layout": "grid",
    "custom_presets": {}
}
EOF
fi

# Pastikan file-file utama ada
REQUIRED_FILES=(
    "ink-pageman.inx"
    "ink-pageman.py"
    "config.json"
    "README.md"
    "LICENSE"
    "inkpageman.svg"
    "screenshoot.png"
    "ui/index.html"
    "ui/style.css"
    "ui/app.js"
    "ui/id.json"
    "ui/en.json"
    "ui/inkpageman.svg"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "${file}" ]]; then
        echo "Error: Berkas '${file}' tidak ditemukan!" >&2
        exit 1
    fi
done

# Buat file ZIP (hanya menyertakan file produksi yang dibutuhkan)
echo "Mengompresi berkas ke ${ZIP_FILE}..."
zip -q -9 -r "${ZIP_FILE}" \
    ink-pageman.inx \
    ink-pageman.py \
    config.json \
    README.md \
    LICENSE \
    inkpageman.svg \
    screenshoot.png \
    ui/index.html \
    ui/style.css \
    ui/app.js \
    ui/id.json \
    ui/en.json \
    ui/inkpageman.svg

# Hitung MD5 Checksum
echo "Menghitung MD5 checksum..."
md5sum "${ZIP_FILE}" > "${MD5_FILE}"

echo "=== Selesai ==="
echo "Berkas ZIP : ${ZIP_FILE} ($(du -h "${ZIP_FILE}" | cut -f1))"
echo "Berkas MD5 : ${MD5_FILE}"
echo "MD5 Hash   : $(cat "${MD5_FILE}")"

