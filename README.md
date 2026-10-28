# Page Manager for Inkscape

Sebuah ekstensi canggih untuk mengelola dokumen multi-halaman di Inkscape (versi 1.2+) secara visual, interaktif, dan realtime.

Dibangun dengan arsitektur **Python Backend + Web-based GUI (WebKit2Gtk / Native Window / App-mode Browser)** dengan desain **antarmuka menu yang intuitif, visual, dan modern** ala software produktivitas desktop profesional.

---

## Fitur Utama

0. **List Halaman & Visual Page Sorter:**
   - Menampilkan seluruh halaman dalam dokumen Inkscape dengan thumbnail proporsional, nomor urut, dimensi ($W \times H$), unit dokumen (`mm`, `px`, dll), dan orientasi.
   - Kanvas interaktif dengan zoom & pan untuk melihat tata letak seluruh halaman.

1. **CRUD Halaman & Template Ukuran:**
   - Tambah halaman baru dengan template ukuran standar:
     - **ISO Series:** A3, A4, A5, A6, B4, B5
     - **US Standards:** US Letter, US Legal, Tabloid
     - **Digital / Media:** Instagram Post (1080x1080), Story / Reels (1080x1920), Full HD (1920x1080)
     - **Kustom:** Dimensi bebas dalam satuan dokumen.
   - Pilihan orientasi Portrait (Tegak) dan Landscape (Mendatar) serta tombol balik arah cepat.
   - Seleksi multi-halaman (*multi-select*), duplikasi, dan hapus massal.

2. **Auto-Layout & Reorder:**
   - Susun ulang posisi koordinat seluruh halaman secara otomatis:
     - **Grid Matrix:** Susun dalam $N$ kolom dengan jarak (*gap*) seragam.
     - **Baris Horizontal:** Berjajar ke samping dari kiri ke kanan.
     - **Kolom Vertikal:** Berjajar ke bawah dari atas ke bawah.
     - **Buku / Spreads:** Pola halaman buku (halaman 1 di kanan, diikuti pasangan halaman spread 2-3, 4-5, dst).
   - Naikkan atau turunkan urutan halaman (*Move Up / Move Down*).

3. **Margin & Canvas Guides:**
   - Atur margin halaman (Atas, Bawah, Kiri, Kanan) dan nilai Bleed.
   - Opsi membuat garis panduan kanvas (*Canvas Guides*) otomatis sesuai batas margin.

4. **Nomor Halaman Otomatis (Page Numbering):**
   - Menghasilkan nomor halaman pada layer non-destruktif khusus (`layer_page_numbers`).
   - Pilihan format: `1, 2, 3...`, `1 / N`, `Page 1 of N`, `- 1 -`.
   - Posisi fleksibel (Bawah/Atas, Kiri/Tengah/Kanan) dengan offset margin.
   - Opsi lewati halaman pertama (*Skip Cover*).

5. **Header & Footer:**
   - Kolom teks Kiri, Tengah, dan Kanan untuk Header dan Footer.
   - Dukungan variabel dinamis: `{page}` (nomor halaman), `{total}` (total halaman), `{date}` (tanggal hari ini).
   - Opsi garis pembatas (*divider line*) dan lewati halaman cover.
   - Dikelola di layer khusus non-destruktif (`layer_header_footer`).

6. **Watermark:**
   - Teks watermark kustom (misal "DRAFT", "CONFIDENTIAL", "RAHASIA").
   - Rotasi sudut ($-45^\circ$, $0^\circ$, $45^\circ$, $-90^\circ$).
   - Pengaturan transparansi/opasitas, ukuran font, dan warna.
   - Dikelola di layer khusus non-destruktif (`layer_watermark`).

---

## Persyaratan Sistem

- **Inkscape 1.2+** (direkomendasikan Inkscape 1.3 atau 1.4+)
- **Linux:**
  - `python3-gi`, `gir1.2-gtk-3.0`, `gir1.2-webkit2-4.1` (atau `gir1.2-webkit2-4.0`)
  ```bash
  sudo apt install python3-gi gir1.2-gtk-3.0 gir1.2-webkit2-4.1
  ```
- **Windows / macOS:**
  - Berjalan otomatis melalui Chrome / Edge dalam *App Mode* (`--app=...`) atau melalui `pywebview`.

---

## Repositori
[https://github.com/raniaamina/Inkscape-Page-Manager](https://github.com/raniaamina/Inkscape-Page-Manager)

## Disclaimer 
We don't guarantee anything about this tool/extension, so please use it at your own risk. We can't give 24/7 support if you have a problem when using this boilerplate. 

If you feel that this tool has helped you to create, feel free to donate a cup of coffee on the [Support Dev](https://saweria.co/raniaamina) :")

## License
This project is licensed under the GNU General Public License v3.0 (GPLv3). See the [LICENSE](LICENSE) file for details.
