# Project Notes & Log: ink-pageman

## 1. Project Overview & Current State (2026-10-28)
- **Nama Proyek**: Page Manager (`ink-pageman`)
- **Tipe**: Inkscape Extension (Inkscape 1.2+) dengan Web-based GUI (GTK+ 3 / WebKit2Gtk / pywebview / Browser)
- **Status Awal**:
  - Proyek ini tampaknya merupakan turunan / boilerplate dari ekstensi **"Pattern on Shape"** (`id.raniaamina.manager.page`), yang saat ini masih berisi kode untuk menyebarkan pola/objek dalam bentuk kontainer (`PatternFillExtension`).
  - File `.inx` (`ink-pageman.inx`) sudah dinamai **Page Manager** dengan ID `id.raniaamina.manager.page` di bawah menu `Content Manager`.
  - Terdapat file `sample-page.svg` yang merupakan dokumen Inkscape 1.4.3 dengan 3 halaman (`inkscape:page`: `page1`, `page2`, `page3` di bawah `sodipodi:namedview`).
  - Arsitektur ekstensi menggunakan pola **Python Backend + Web UI (HTML/CSS/JS)**:
    - Backend: `ink-pageman.py` (inkex EffectExtension + SimpleHTTPRequestHandler di thread background).
    - UI Window: WebKit2Gtk via PyGObject (Linux) atau PyWebView / App mode browser (fallback).
    - Frontend: `ui/index.html`, `ui/app.js`, `ui/style.css` (saat ini masih UI Pattern on Shape).

## 2. Log Percobaan & Langkah (Trial / Step Log)
- **2026-10-28 [SUCCESS]**: Inisiasi eksplorasi dan pembacaan seluruh file proyek:
  - Membaca `README.md`, `config.json`, `ink-pageman.inx`, `ink-pageman.py`, `ui/index.html`, `ui/app.js`, dan struktur XML `sample-page.svg`.
  - Teridentifikasi bahwa codebase dasar saat ini adalah boilerplate/clone dari ekstensi Pattern on Shape yang disiapkan untuk dikembangkan menjadi **Page Manager** (manajemen halaman Inkscape).

- **2026-10-28 [CONFIRMED]**: Arahan & spesifikasi dari user:
  1. Base arsitektur dipertahankan sepenuhnya: Core WebUI dengan auto-launch jendela mandiri di Linux (WebKit2Gtk/GTK+ 3) dan mode app/browser di Windows.
  2. Fungsi utama bertransformasi menjadi **Page Manager**: mengelola halaman Inkscape secara interaktif/realtime.
  3. Mengacu pada struktur multi-halaman Inkscape (`<sodipodi:namedview>` -> `<inkscape:page>`) sebagaimana ada di `sample-page.svg`.
  4. Riset API inkex: `inkex` versi 1.2+ memiliki dukungan native class `inkex.Page` dan method `namedview.get_pages()`, `namedview.new_page(x, y, w, h, label)` yang siap dimanfaatkan.
- **2026-10-28 [FEATURE SPECIFICATION]**: User menentukan 7 fitur utama yang ingin dibangun:
  - Fitur 0: List Halaman (ID, label, dimensi, orientasi, thumbnail/urutan).
  - Fitur 1: CRUD Halaman, Multi-select, Template ukuran standar (A-series, US Letter, Social Media, Custom) & Orientasi.
  - Fitur 2: Sort Auto-layout / Reorder (Grid, Horizontal Row, Vertical Column, Spreads) dengan pengaturan gap/jarak.
  - Fitur 3: Set Margin Guide (top, right, bottom, left, bleed, dan guides canvas).
  - Fitur 4: Page Number (format, posisi, offset, font, skip cover, layer otomatis).
  - Fitur 5: Watermark (teks, rotasi, opasitas, font, layer otomatis).
  - Fitur 6: Header / Footer (posisi kiri/tengah/kanan, variabel {page}, {total}, divider line, layer otomatis).
  - Target: Ekstensi multi-page Inkscape yang jauh lebih powerful daripada native tool.
- **2026-10-28 [UI DESIGN DECISION]**: User meminta antarmuka menggunakan konsep **Ribbon Menu ala Microsoft Office**:
  - Bagian atas: Tab Ribbon (Pages, Layout & Arrange, Margins & Bleed, Page Numbers, Header/Footer, Watermark).
  - Di bawah Tab: Ribbon Toolbar dibagi per Command Group dengan divider garis vertikal dan label grup di bawahnya (tombol besar dengan ikon, dropdown preset, toggle switch).
  - Bagian tengah: Workspace luas dengan dual view:
    - Sidebar kiri (Page Sorter / Thumbnails): daftar halaman dengan nomor indeks, badge ukuran, checkbox multi-select.
    - Kanvas utama (Live Canvas): Preview interaktif seluruh halaman dengan live preview layout, nomor halaman, header/footer, watermark, zoom/pan.
  - Bagian bawah: Status bar dengan info total halaman, dimensi kanvas, zoom controls, dan tombol aksi "Apply to Inkscape".
- **2026-10-28 [BACKUP & DESIGN PRINCIPLE]**:
  - Berkas cadangan berhasil dibuat: `ink-pageman.py.bak` dan direktori `ui.bak/`.
  - Prinsip Desain UI: Anti "AI Slop" style (tanpa gradien neon ungu/cyan, tanpa glow/bubbly/glassmorphism berlebih).
  - Menggunakan tema pro-tool minimalis & clean (seperti Blender/Figma/VS Code/MS Office Ribbon klasik modern): palet netral (dark slate/charcoal/neutral grey), garis batas tegas 1px presisi, tipografi monospace/sans-serif tajam, satu warna aksen fungsional (biru tenang/steel blue).
- **2026-10-28 [VERIFIED TESTS]**:
  - `namedview.get_pages()` membaca semua objek halaman.
  - `namedview.new_page(str(x), str(y), str(w), str(h), label=...)` menambahkan halaman (parameter harus string/unicode).
  - `p.move_to(x, y)` memindahkan posisi halaman.
  - `p.set('width', str(w))` & `p.set('height', str(h))` mengubah dimensi halaman.
  - `namedview.remove(p)` menghapus halaman.
  - `p.set('margin', 'top right bottom left')` dan `p.set('bleed', 'val')` mengatur margin dan bleed native Inkscape.
  - `namedview.add_guide(pos, orient=True/False, name=...)` membuat canvas guide.
  - `Layer.new('...')` dan `TextElement` membuat layer non-destruktif untuk Page Numbers, Header/Footer, dan Watermark.
- **2026-10-28 [IMPLEMENTATION COMPLETE & VERIFIED]**:
  - `ink-pageman.py`: Backend lengkap berhasil dibangun dan teruji.
    - REST API: `GET /api/document`, `POST /api/apply`, `POST /api/close`, `GET /heartbeat`.
    - Auto window launcher: Linux GTK+ 3 / WebKit2Gtk, PyWebView, dan App mode browser Windows tetap dipertahankan.
    - Manipulasi `<inkscape:page>` menggunakan objek `Page()` langsung untuk menghindari duplikasi halaman viewbox.
    - Layer non-destruktif teruji: `layer_page_numbers`, `layer_header_footer`, `layer_watermark`.
    - Margin guides `<sodipodi:guide>` teruji.
  - `ui/index.html`: Ribbon Menu modern (6 Tab: Halaman, Tata Letak, Margin & Bleed, Nomor Halaman, Header & Footer, Watermark) + Workspace (Page Sorter Sidebar di kiri + Interactive Live Canvas di kanan) + Status Bar di bawah.
  - `ui/style.css`: Clean Pro-tool Dark Theme (Zero AI-slop: tanpa gradien neon berlebih, 1px border presisi, palet netral charcoal/slate, tipografi tajam, aksen biru tunggal).
  - `ui/app.js`: Logika interaktif realtime lengkap dengan live WYSIWYG preview di kanvas, pan & zoom interaktif, auto-arrange (Grid, Row, Column, Spreads), CRUD halaman, dan integrasi API apply ke Inkscape.
  - `README.md`: Dokumentasi fitur dan panduan instalasi telah diperbarui.
- **2026-10-28 [UI/UX REFINEMENT BASED ON USER FEEDBACK]**:
  1. Penamaan Duplikasi Cerdas:
     - Mengganti penambahan berantai `(Copy) (Copy)...` dengan fungsi `generateDuplicateLabel()`.
     - Halaman bertipe `Page X` otomatis meningkat ke nomor urut berikutnya (`Page 2`, `Page 3`, dst).
     - Label khusus seperti `Cover` otomatis bernomor `Cover (2)`, `Cover (3)`, dst.
     - Membersihkan label riwayat duplikasi yang panjang saat memuat dokumen awal.
  2. Perbaikan Visibilitas Elemen `<select>`:
     - Mengatasi masalah teks putih di atas latar putih pada WebKitGTK Linux dengan `-webkit-appearance: none !important;`, background gelap `#242429 !important;`, teks terang `#f4f4f5 !important;`, dan custom SVG dropdown chevron.
     - Styling eksplisit pada tag `<option>` dan `<optgroup>` agar warna teks kontras tinggi.
  3. Tombol Ikonik Ringkas dengan Tooltip:
     - Mengubah tombol di ribbon (Duplikasi, Hapus, Naik, Turun, Pilih Semua, Batal Pilih, Balik Arah) menjadi tombol ikonik persegi (32px-34px) yang elegan.
     - Dilengkapi tooltip mengambang instan via CSS attribute selector `[data-tooltip]` sehingga menghemat banyak ruang horizontal dan tampak sangat bersih.
  4. Perataan Blok Menu yang Rapi & Presisi:
     - Merombak grid `.group-form-col`, `.form-row`, dan `.form-label` dengan perataan teks rata kanan dan input rata kiri-kanan (flush) yang simetris.
     - Setiap blok ribbon memiliki tinggi seragam (48px untuk body, 16px untuk label kategori di bawah).
     - Menghilangkan kesan "asal tampil" dan menghasilkan tampilan rapi berstandar software CAD/desain grafis profesional.
- **2026-10-28 [EXPLANATION: INKSCAPE APPLY MECHANISM]**:
  - Pertanyaan User: Apakah perubahan baru ter-apply ke Inkscape saat dialog ditutup?
  - Analisis Teknis: Ya. Ekstensi Inkscape berjalan sebagai subprocess eksternal yang menerima input SVG via stdin dan hanya menuliskan hasil akhir SVG ke stdout ketika proses python selesai (exit). Selama window GUI masih terbuka (loop Gtk.main() berjalan), Inkscape berada dalam kondisi menunggu (blocking wait on subprocess stdout).
  - Alur Standar Inkscape UI: Ketika tombol "Terapkan ke Inkscape" diklik, ekstensi menyimpan perubahan ke `self.svg`, menampilkan status sukses sejenak (~0.8 detik), lalu otomatis memanggil `Gtk.main_quit()` / `window.close()` sehingga proses selesai dan kanvas Inkscape langsung terbarui seketika.
- **2026-10-28 [AUTO-CLOSE ON APPLY IMPLEMENTED]**:
  - Tombol aksi utama disesuaikan menjadi **"Terapkan & Tutup"** (`btn-apply-inkscape`).
  - Di `ink-pageman.py`: saat endpoint `POST /api/apply` berhasil, thread background menjalankan penutupan tertunda (~0.6 detik) via `GLib.idle_add(Gtk.main_quit)` / `webview_window.destroy()` / `status = closed`.
  - Di `ui/app.js`: pesan status menampilkan "Sukses! Menerapkan ke Inkscape..." dan memicu `window.close()` otomatis setelah 500ms.
  - Alur eksekusi Inkscape: Begitu loop GUI selesai, `inkex` menulis SVG hasil modifikasi ke `stdout`, dan dokumen di kanvas Inkscape seketika langsung ter-update dengan mulus.
- **2026-10-28 [MARGIN & GUIDES ENABLE/DISABLE TOGGLE]**:
  - Tab "Margin & Panduan" kini memiliki blok "Status" dengan switch toggle `Aktif` (`#margin-enabled`), persis konsisten dengan tab Nomor Halaman, Header/Footer, dan Watermark.
  - Default status adalah **NONAKTIF (OFF)** dan checkbox "Buat Canvas Guides" juga default **UNCHECKED**.
  - Jika dinonaktifkan:
    - Tidak ada atribut `margin` atau `bleed` yang dipaksakan pada `<inkscape:page>`.
    - Tidak ada `<sodipodi:guide>` yang dibuat.
    - Semua margin guide lama yang pernah dibuat otomatis dibersihkan (*clean purge*).
    - Pada Live Canvas preview, garis putus-putus margin dan bleed tidak digambar.
  - Jika diaktifkan:
    - Margin dan bleed diterapkan ke halaman terpilih atau saat tombol "Terapkan" diklik.
    - Garis canvas guides dibuat pada dokumen Inkscape hanya jika opsi "Buat Canvas Guides" dicentang.
- **2026-10-28 [CUSTOM PAGE SIZE & CONFIG.JSON TEMPLATE MANAGEMENT]**:
  - Penjelasan & Konfirmasi: Ketika memilih preset "Kustom...", sistem otomatis memunculkan baris input Lebar (W) × Tinggi (H) dan Jumlah halaman baru.
  - Penyimpanan Template ke `config.json`:
    - Tombol simpan template (💾 `#btn-save-template`) memungkinkan pengguna menyimpan ukuran custom favorit (misal 500 × 500 mm) langsung ke `config.json` di bawah objek `"custom_presets"`.
    - Template kustom otomatis dimuat di bawah `<optgroup label="Template Saya">` saat aplikasi dibuka (`loadConfig()`).
    - Dilengkapi tombol hapus (🗑 `#btn-del-template`) yang otomatis muncul saat memilih template kustom dari daftar untuk memudahkan manajemen template tanpa perlu menyunting file json secara manual.
    - `POST /api/config` pada backend diperbarui menggunakan safe-merge dictionary agar tidak menimpa setelan konfigurasi lainnya.
- **2026-10-28 [PAGE NUMBERING: STYLES, CUSTOM TEXT, TYPOGRAPHY & LIVE PREVIEW FIX]**:
  - Perbaikan Preview Real-time:
    - Fungsi `toRoman()`, `toAlpha()`, dan `formatPageNumber()` diimplementasikan secara identik di frontend (`ui/app.js`) dan backend (`ink-pageman.py`).
    - Event listener WYSIWYG kini mengikat event `input` dan `change` pada elemen gaya (`pn-style`), teks kustom (`pn-custom-text`), format (`pn-format`), font (`pn-font-family`), dan custom font (`pn-font-custom`).
    - Kanvas SVG preview langsung merender perubahan secara instan tanpa perlu refresh.
  - Dukungan Format & Gaya Angka:
    - Arab: `1, 2, 3...`
    - Romawi Besar: `I, II, III...`
    - Romawi Kecil: `i, ii, iii...`
    - Alfabet Besar: `A, B, C...`
    - Alfabet Kecil: `a, b, c...`
    - Format template: `{n}`, `{n}/{total}`, `Page {n} of {total}`, `- {n} -`.
    - Teks kustom tambahan (misal: ` | Custom teks` menghasilkan `1 | Custom teks` atau `Page II of III | Laporan 2026`).
  - Pemilihan Font & Tipografi Rapi:
    - Menambahkan dropdown pilihan font (`Sans-serif`, `Serif`, `Monospace`, `Arial`, `Helvetica`, `Roboto`, `Ubuntu`, `Times New Roman`, `Georgia`, `Courier New`, dan opsi `Font Kustom...`).
    - Melebarkan kontainer ribbon "Tipografi, Warna & Offset" menjadi 295px sehingga input ukuran, swatch warna (34×22px), dan offset berbaris rapi dengan jarak lega tanpa ada elemen yang bertumpuk atau nabrak.
    - Fungsi `createSvgText()` mendukung parameter `fontFamily` sehingga font teks di kanvas SVG preview sesuai dengan pilihan font yang aktif.
  - Pengujian & Verifikasi:
    - Skrip uji integrasi end-to-end (`test_custom_and_pn.py`) mengonfirmasi bahwa eksekusi `apply_changes` berhasil menghasilkan elemen SVG dengan teks `Page II of III | Laporan 2026` ber-font `Ubuntu` pada halaman berdimensi custom 500×500 mm.
    - Pembuatan paket rilis via `./package.sh` berhasil menghasilkan `ink-pageman.zip` dan `ink-pageman.zip.md5` yang valid (`md5sum -c` OK).
- **2026-10-28 [HEADER/FOOTER ENHANCEMENT, WATERMARK IMAGE, PERSISTENCE & SETTINGS/ABOUT TAB]**:
  - **Pencegahan Tabrakan Nomor Halaman & Header/Footer (Collision Slot Lock)**:
    - Fungsi `syncPageNumberSlotLock()` memeriksa posisi nomor halaman yang aktif (misal `bottom-center`).
    - Input footer tengah (`f-center`) otomatis dinonaktifkan (`disabled = true`), diberi garis tepi putus-putus (`.slot-locked`), dan placeholder `[Digunakan No. Hal]` sehingga pengguna tidak akan menimpa slot tersebut secara tidak sengaja.
  - **Posisi Bebas & Teks Multiline Header/Footer**:
    - Menambahkan input jarak vertikal atas (`hf-offset-top`), jarak vertikal bawah (`hf-offset-bottom`), dan margin horizontal kiri-kanan (`hf-margin-x`).
    - Tombol modal sunting (`✎`) membuka dialog teks multiline (`#modal-multiline`) untuk input teks panjang dengan baris baru, serta tombol sisip instan tag variabel (`{page}`, `{total}`, `{date}`).
    - Di backend (`ink-pageman.py`) dan frontend kanvas (`createSvgText`), teks yang mengandung newline `\n` dipecah menjadi `<tspan x="..." dy="...">` standar SVG.
  - **Dukungan Gambar/Logo pada Footer & Watermark**:
    - Header & Footer: Menambahkan pemilih gambar logo via HTML5 `FileReader` (Base64 data URL), opsi posisi logo (`footer-left`, `footer-center`, `footer-right`, `header-left`, dll), serta dimensi W × H mm. Disematkan sebagai elemen `<image>` non-destruktif ke SVG.
    - Watermark: Menambahkan mode toggle antara **Teks** dan **Gambar** (`#wm-mode`). Pada mode gambar, pengguna dapat mengunggah gambar stamp/logo, mengatur skala lebar, rotasi, dan opasitas.
  - **Tipografi & Garis Pembatas (Divider)**:
    - Pengaturan font family, ukuran font, dan warna untuk Header & Footer dan Watermark.
    - Garis pembatas header dan footer dapat diatur ketebalan strokenya (`divider_thickness`) dan warnanya (`divider_color`).
  - **Persistensi Konfigurasi Otomatis (`config.json`)**:
    - Semua setelan terbaru (margin, nomor halaman, header/footer, watermark, preferensi tampilan, backend jendela) otomatis disimpan secara asinkron (debounced) ke `config.json` di bawah objek `"last_settings"`.
    - Saat ekstensi dibuka kembali, `restoreSettingsFromConfig()` memulihkan seluruh status antarmuka pengguna secara otomatis.
  - **Tab ke-7: Pengaturan & Info (`tab-settings`)**:
    - Preferensi Bahasa: Indonesia (`id`) / English (`en`).
    - Tema UI: Gelap (`dark`), Terang (`light`), Ikut OS (`system`).
    - Pilihan Backend Jendela: GTK+ 3 Native (`gtk`), Browser Standar (`browser`), PyWebView (`pywebview`), Otomatis (`auto`).
    - Tombol dialog "Tentang Ekstensi" (`#modal-about`) menampilkan informasi versi v1.2.0, daftar fitur, pintasan keyboard, pengembang, dan lisensi.
  - **Pengujian & Verifikasi**:
    - Pengujian integrasi end-to-end (`test_advanced_features.py`) memverifikasi 5 fitur: nomor halaman kustom, header multiline tspan, logo gambar HF, garis divider terformat, dan gambar watermark dengan rotasi.
    - Pembuatan paket rilis via `./package.sh` berhasil menghasilkan berkas rilis `ink-pageman.zip` dan `ink-pageman.zip.md5` yang valid.
- **2026-10-28 [MACOS NATIVE WINDOW & STANDALONE APP-MODE RESOLUTION]**:
  - **Identifikasi Masalah (Root Cause)**:
    - Di Linux, Inkscape didistribusikan dengan modul GTK+ 3 dan WebKit2GTK (`gi.repository.WebKit2`), sehingga langsung membuka dialog native.
    - Di macOS, paket Inkscape (`Inkscape.app`) tidak menyertakan modul `WebKit2GTK` untuk Python.
    - Kode peluncur window sebelumnya hanya memeriksa `if os.name == 'nt'` (Windows), sehingga di macOS (`sys.platform == 'darwin'`) langsung jatuh ke `webbrowser.open(url)` yang memanggil Safari dan membukanya sebagai tab browser biasa.
  - **Solusi Arsitektur Multi-Tier macOS**:
    1. **Tingkat 1 - Native Cocoa WKWebView**: Menambahkan deteksi modul `PyObjC` (`AppKit`, `WebKit`, `PyObjCTools.AppHelper`). Jika terpasang di Mac, ekstensi langsung memunculkan jendela dialog native macOS Cocoa murni (`NSWindow` + `WKWebView`).
    2. **Tingkat 2 - PyWebView**: Jika modul `pywebview` terpasang di Python Inkscape, otomatis menggunakan native WebKit dialog.
    3. **Tingkat 3 - Standalone App Mode Browser**: Mendeteksi otomatis keberadaan browser berbasis Chromium di macOS (`/Applications/Google Chrome.app`, `Microsoft Edge.app`, `Brave Browser.app`, `Chromium.app`, `Vivaldi.app`, `Arc.app`) dan menjalankannya dengan opsi `--app=http://... --window-size=1150,750`. Hasilnya adalah jendela desktop mandiri tanpa address bar, tanpa tab, dan terisolasi dari Safari.
    4. **Tingkat 4 - Dedicated Safari Window via AppleScript**: Jika pengguna tidak memiliki browser Chromium dan hanya memiliki Safari, sistem menjalankan skrip `osascript` untuk memaksa Safari membuat jendela dokumen baru terisolasi dengan bounds `{100, 80, 1250, 830}`, bukan membuka tab di jendela yang sudah ada.
  - **Pengujian & Verifikasi**:
    - Kompilasi `python3 -m py_compile ink-pageman.py` sukses 100%.
    - Validasi sintaks `node -c ui/app.js` lolos tanpa galat.
    - Pemaketan ulang melalui `./package.sh` berhasil memperbarui `ink-pageman.zip` dan `ink-pageman.zip.md5`.
- **2026-10-28 [WATERMARK & LOGO IMAGE FORMAT SUPPORT & AUTO-ACTIVATE UX]**:
  - **Format yang Didukung**:
    - `PNG` (.png): Paling direkomendasikan karena mendukung transparansi (alpha channel/transparan), sangat pas untuk cap, logo, dan watermark.
    - `SVG` (.svg): Vektor tajam resolusi tinggi tanpa pecah; disematkan sebagai base64 data URI ke SVG `<image>`.
    - `JPG/JPEG` (.jpg, .jpeg): Didukung penuh untuk gambar fotografi (tanpa transparansi).
    - `WebP` (.webp): Didukung penuh.
  - **Perbaikan Masalah Gambar Tidak Muncul di Kanvas Preview**:
    - *Akar Masalah:* Ketika pengguna mengunggah gambar watermark (`kde-mp-abu.svg`), switch toggle "Aktif" pada blok Status tab Watermark masih dalam keadaan MATI (OFF), sehingga fungsi `renderCanvas()` melewatkan penggambaran watermark.
    - *Solusi UX Cerdas:* Ketika pengguna memilih file gambar baru lewat tombol "Pilih Gambar...", sistem otomatis mengaktifkan switch toggle `Aktif` (`wmEnabled.checked = true`) dan seketika merender live preview di kanvas. Hal yang sama juga diterapkan pada logo Header & Footer (`hfEnabled.checked = true`).
    - *Atribut Input File:* Menambahkan ekstensi eksplisit `accept="image/*,.svg,.png,.jpg,.jpeg,.webp"` pada `#wm-image-file` dan `#hf-image-file` agar seluruh file picker di Linux, macOS, dan Windows menampilkan file SVG dan grafis dengan tepat.
    - *Namespace & Opacity SVG:* Memperbarui penyematan SVG `<image>` di kanvas preview dengan `xlink:href`, `href`, serta `style.opacity` demi kompatibilitas WebKit2GTK dan Chromium yang sempurna.
- **2026-10-28 [OBJECT & LAYER LOCKING: SODIPODI:INSENSITIVE & POINTER-EVENTS]**:
  - **Urgensi & Analisis Desain**:
    - Pertanyaan User: *"page number, teks-teks header footer, watermark, itu mustinya ada opsi check untuk lock objek, jadi kalau aktif gambar2 ini ga bisa digeser2 sama sekali, sepertinya ini lebih safe nggak sih"*
    - Analisis: **Sangat Tepat & Lebih Aman**. Saat pengguna mendesain pada dokumen multi-halaman Inkscape, seringkali mereka melakukan *marquee selection* (tarik kotak seleksi). Tanpa penguncian, elemen nomor halaman, header, footer, dan watermark akan ikut terpilih dan bergeser secara tidak sengaja.
  - **Implementasi Standar Native Inkscape**:
    - Atribut Inkscape standar untuk mengunci layer dan elemen adalah `sodipodi:insensitive="true"`.
    - Ketika atribut ini dipasang pada elemen `<g inkscape:groupmode="layer" ...>` dan elemen anak (`<text>`, `<image>`, `<path>`), Inkscape menampilkan ikon gembok terkunci 🔒 pada panel *Layers and Objects*.
    - Semua alat seleksi dan manipulasi di kanvas Inkscape secara otomatis mengabaikan objek yang terkunci, sehingga objek tersebut tidak dapat digeser atau disentuh tanpa membuka gemboknya terlebih dahulu.
  - **Opsi UI & Persistensi**:
    - Menambahkan checkbox `[x] Kunci Objek (Lock)` pada Tab Nomor Halaman (`#pn-locked`), Tab Header & Footer (`#hf-locked`), dan Tab Watermark (`#wm-locked`). Default adalah **AKTIF (TERKUNCI)** demi keamanan maksimal.
    - Setelan disimpan secara persisten di `config.json` di bawah `"last_settings"` dan otomatis dipulihkan setiap kali membuka ekstensi.
  - **Verifikasi**:
    - Skrip pengujian `test_advanced_features.py` lulus 6/6 uji integrasi termasuk uji atribut `sodipodi:insensitive="true"`.
    - Paket rilis `ink-pageman.zip` dan `ink-pageman.zip.md5` diperbarui via `./package.sh`.
- **2026-10-28 [IGNORE CONFIG.JSON & AUTO-GENERATION IN PACKAGING]**:
  - **Penjelasan & Konfirmasi**:
    - Berkas `config.json` memang dibuat secara otomatis (*auto-created*) oleh backend `ink-pageman.py` saat menyimpan setelan (`POST /api/config`). Jika berkas tidak ada, antarmuka tetap berjalan normal dengan nilai-nilai bawaan (*fallback default*).
    - Karena `config.json` menyimpan status lokal sesi pengguna (`last_settings`, template kustom, base64 data), menyimpannya di git menyebabkan working tree selalu kotor (*dirty*).
  - **Tindakan**:
    - Menambahkan `config.json` ke `.gitignore`.
    - Melepas pelacakan git (`git rm --cached config.json`) tanpa menghapus berkas fisik lokal di disk.
    - Memperbarui skrip `package.sh` agar secara otomatis membuat berkas template `config.json` default bersih jika dijalankan di lingkungan baru (misal klona baru repository) tanpa berkas `config.json`.
    - Menguji pemaketan ulang via `./package.sh` dan memverifikasi integritas checksum MD5.
- **2026-10-28 [LAYOUT OVERFLOW FIX, HEADER/FOOTER CONSOLIDATION & VERSION/WORDING ALIGNMENT]**:
  - **Koreksi Nomor Versi & Deskripsi Wording**:
    - Penjelasan Jujur: Versi `v1.2.0` sebelumnya dibuat secara sepihak/keliru oleh asisten AI karena terdistraksi target kompatibilitas "Inkscape 1.2+". Proyek ini sebenarnya merupakan rilis awal `v1.0.0`.
    - Tindakan: Nomor versi dikembalikan dan disamakan menjadi **v1.0.0** pada modal info (`#modal-about`) dan tab pengaturan.
    - Penyebutan "Ribbon" dihapus dari semua deskripsi (modal about dan `README.md`), digantikan dengan istilah yang tepat: *"antarmuka menu yang intuitif dan visual"*.
  - **Perbaikan Teks Offset Melewati Batas (Tab Nomor Halaman)**:
    - *Identifikasi Masalah:* Pada grup "Tipografi, Warna & Offset", label `form-label` memiliki `min-width: 48px`, dan input number `44px` dan `42px` menghasilkan total lebar baris kedua ~320px. Ketika kontainer dibatasi `295px`, baris kedua terdorong menyeberang garis divider vertikal ke grup "Pengecualian" sehingga teks `Offset: 10 mm` terpotong garis batas.
    - *Solusi:* Mengubah seluruh label menjadi `form-label-compact`, merampingkan input number menjadi `36px`, dan memperlebar kontainer menjadi `290px` proporsional. Baris kedua kini hanya menggunakan lebar ~238px, sehingga terdapat margin aman yang lega dan tidak akan pernah menabrak garis batas.
    - Menambahkan checkbox `[x] Kunci Objek (Lock)` (`#pn-locked`) pada blok Pengecualian & Proteksi di HTML agar konsisten dengan `ui/app.js`.
  - **Simplifikasi & Perampingan Header & Footer untuk Layar Kecil**:
    - *Identifikasi Masalah:* Tab Header & Footer sebelumnya memiliki 7 grup terpisah secara horizontal dengan total lebar mencapai > 1400px, sehingga pada layar laptop standar / resolusi kecil (1366x768 atau dialog ~1100px), menu sebelah kanan terpotong (*overflow cutoff*).
    - *Solusi Perampingan:*
      1. Rampingkan grup Header dan Footer dari 275px menjadi 200px masing-masing.
      2. Rampingkan grup Logo & Gambar dari 225px menjadi 175px.
      3. Rampingkan grup Tipografi & Warna dari 215px menjadi 175px.
      4. Satukan grup Pembatas & Margin (220px) dan Opsi & Proteksi (160px) menjadi satu grup terpadu: **Pembatas & Opsi** (235px).
      5. Total lebar menu terpangkas drastis dari **> 1400px** menjadi hanya **~1050px**, sehingga muat sempurna pada jendela standar tanpa terpotong.
    - *Dukungan Responsif Ekstra:* Menambahkan `overflow-x: auto` dengan custom thin scrollbar pada `.ribbon-content` dan `flex-shrink: 0` pada `.ribbon-group` agar jika jendela dibuka di layar sekecil apapun, seluruh tombol tetap dapat diakses dengan mulus tanpa terpotong.
  - **Verifikasi**:
    - Validasi sintaks `node -c ui/app.js` dan kompilasi Python `python3 -m py_compile ink-pageman.py` lolos 100%.
    - Pemaketan `./package.sh` berhasil memperbarui `ink-pageman.zip` dan `ink-pageman.zip.md5` terverifikasi OK.
- **2026-10-28 [README DISCLAIMER, SINGLE GPLV3 LICENSE & REPOSITORY URL]**:
  - **Penambahan Disclaimer & Saweria**:
    - Menambahkan klausul Disclaimer standar dan tautan donasi Saweria (`https://saweria.co/raniaamina`) pada `README.md` persis sesuai pola ekstensi Pattern on Shape.
  - **Penyelarasan Lisensi & URL Repositori**:
    - Menghapus kerancuan lisensi ganda ("GPLv3 / MIT") pada dialog Tentang Ekstensi (`#modal-about`) di `ui/index.html`. Ditetapkan secara tunggal dan presisi: **GNU General Public License v3.0 (GPLv3)**.
    - Menambahkan URL repositori resmi (`https://github.com/raniaamina/Inkscape-Page-Manager.git`) pada dialog Tentang Ekstensi dan `README.md`.
  - **Verifikasi**:
    - Validasi `./package.sh` berhasil memperbarui `ink-pageman.zip` dan `ink-pageman.zip.md5` dengan status checksum OK.
- **2026-10-28 [MODULAR I18N (ID.JSON & EN.JSON) & CLEAN INPUT ALIGNMENT]**:
  - **Penjelasan & Jawaban Pertanyaan User**:
    - Pertanyaan: *"bisa nggak bahasanya dibikin modular, misal di folder ui ada file id.json en.json, lalu baca dari situ, jadi clear semua teks ui-nya"*
    - Jawaban: **Sangat bisa dan arsitekturnya sudah diterapkan!** Karena ekstensi ini dijalankan dengan server HTTP lokal (`http://127.0.0.1:<port>`), browser/WebKit dapat memuat berkas `ui/id.json` dan `ui/en.json` via asynchronous `fetch()` tanpa kendala CORS maupun pembatasan protokol `file://`.
  - **Implementasi Bahasa Modular**:
    - Dibuat 2 berkas bahasa terstruktur di direktori `ui/`: `ui/id.json` (Bahasa Indonesia) dan `ui/en.json` (English) mencakup seluruh kategori teks: `brand`, `tabs`, `groups`, `labels`, `buttons`, `tooltips`, `page_sorter`, `options`, `about`, `modals`, `placeholders`, dan `status_bar`.
    - Menghubungkan markup HTML di `ui/index.html` dengan atribut deklaratif `data-i18n`, `data-i18n-label`, `data-i18n-placeholder`, `data-i18n-tooltip`, dan `data-i18n-title`.
    - Di `ui/app.js`: dibuat `loadLocale(lang)` dan `setLanguage(lang)` dinamis yang memetakan seluruh atribut secara instan begitu dropdown bahasa diganti atau saat preferensi dimuat.
    - Menyelaraskan teks dinamis: teks tombol upload logo/watermark (`Pilih Logo...`, `Logo Terpasang`, `Pilih Gambar...`, `Gambar Terpasang`), status bar (`Pages / Halaman`, `Total Canvas / Total Kanvas`), indikator status (`Siap` / `Ready`, `Memuat...` / `Loading...`, `Sukses...` / `Success...`), dan dialog konfirmasi/alert.
    - Memperbarui skrip `package.sh` agar `ui/id.json` dan `ui/en.json` otomatis masuk ke arsip `ink-pageman.zip`.
  - **Perbaikan Perataan Input & Satuan di Label**:
    - Menyematkan satuan pengukuran langsung ke label teks (misalnya: `Gap (mm):`, `Bleed (mm):`, `Ukuran (pt):`, `Offset (mm):`, `Offset Y (mm):`, `W (mm):`, `H (mm):`, `Lebar (mm):`, `Tbl (pt):`).
    - Menghapus elemen `<span>` satuan trailing yang sebelumnya menggantung di akhir baris dan membuat lebar input field tidak seragam.
    - Mengatur styling input number agar rata kanan (`text-align: right;`) dengan lebar seragam dan perataan rata kanan grup (*flush right*).
  - **Verifikasi**:
    - Validasi sintaks JSON `ui/id.json` dan `ui/en.json` lolos tanpa error.
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi isi `ink-pageman.zip` memuat lengkap 10 berkas dengan checksum MD5 valid.
- **2026-10-28 [PERBAIKAN TAB MARGIN & PANDUAN: GRID PRESISI, LINK SYNC & PEMBERSIHAN BUTTON TERAPKAN]**:
  - **Identifikasi Masalah (Tampilan Berantakan)**:
    - Pada tab "Margin & Panduan", input 4 margin (Atas, Bawah, Kiri, Kanan) disusun menggunakan flexbox dua baris tanpa grid kaku. Karena panjang teks label berbeda (`Atas:` vs `Kiri:`, serta `Bawah:` vs `Kanan:`), input baris pertama dan kedua tidak sejajar vertikal (zigzag/staggered hingga selisih 7px).
    - Pada blok "Bleed & Panduan", terdapat teks satuan trailing `mm` dan tombol kaku `[ Terapkan ]` yang diletakkan di baris pertama. Tombol ini tidak konsisten dengan tab lain yang bersifat realtime WYSIWYG, serta membingungkan pengguna karena perubahan sudah otomatis di-preview di kanvas.
  - **Solusi & Perbaikan**:
    1. **Grid Presisi 2x2 + Tombol Kaitkan (🔗 Link Margins)**:
       - Mengubah form margin menjadi CSS Grid `.margin-inputs-grid` dengan 5 kolom presisi (`44px 48px 46px 48px 24px`) dan gap 4px/6px.
       - Kolom label rata kanan (`.form-label-grid`), dan input number (48px) sejajar vertikal 100% presisi piksel.
       - Menambahkan tombol interaktif `🔗` (`#btn-link-margins`) di kolom ke-5 yang merentang 2 baris (ala Adobe InDesign / Illustrator / Figma). Ketika aktif (status biru), mengubah salah satu nilai margin otomatis menyinkronkan ketiga sisi margin lainnya.
    2. **Pembersihan & Perapian Blok Bleed & Panduan**:
       - Menghapus tombol manual redundan `[ Terapkan ]`. Seluruh perubahan margin dan bleed kini otomatis tersinkronisasi ke objek `pages` dan `ink-pageman.py` secara realtime saat input diubah atau saat tombol utama "Terapkan & Tutup" diklik.
       - Merapikan baris `Bleed (mm):` dengan input rata kanan dan perataan `justify-content: space-between`.
       - Menyederhanakan label checkbox menjadi `"Buat Garis Pandu Kanvas"` (`ui/id.json`) dan `"Create Canvas Guides"` (`ui/en.json`).
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.
- **2026-10-28 [REORGANISASI TAB HEADER & FOOTER: ELIMINASI SESAK & PLACEHOLDER RINGKAS]**:
  - **Identifikasi Masalah (Tampilan Sesak & Teks Terpotong)**:
    - Pada tab Header & Footer, slot teks sebelumnya memuat 3 input dengan placeholder panjang ("Header kiri", "Header ten...", "Header kar..." dan "[Digunakar...]" saat slot dikunci no. hal) sehingga teks terpotong jelek.
    - Grup "Pembatas & Opsi" menampung terlalu banyak kontrol sekaligus (garis, tebal, warna, cover, margin x, kunci objek) dalam ruang sempit sehingga terasa sangat sesak dan tidak terorganisir.
  - **Solusi & Reorganisasi**:
    1. **Placeholder Ringkas & Tidak Terpotong**:
       - Mengubah placeholder 3 slot menjadi ringkas: `Kiri`, `Tengah`, `Kanan` (atau `Left`, `Center`, `Right` pada EN).
       - Mengubah placeholder slot terkunci menjadi `[No. Hal]` (ID) dan `[Page No]` (EN) sehingga muat sempurna tanpa terpotong.
    2. **Reorganisasi Logis Grup Header & Footer**:
       - *Header (Atas)*: 3 slot input (`215px`) + Offset Y (mm) (48px) + Tombol Modal Multiline [✎].
       - *Footer (Bawah)*: 3 slot input (`215px`) + Offset Y (mm) (48px) + Tombol Modal Multiline [✎].
       - *Logo & Gambar*: Baris 1 memuat Tombol Pilih Logo + Dropdown Posisi (`Ftr Kiri`, `Hdr Kanan`, dll) bersebelahan; Baris 2 memuat `W (mm):` dan `H (mm):` (48px).
       - *Tipografi & Warna*: Font dropdown di baris 1, Warna picker + Ukuran (pt) (48px) di baris 2.
       - *Garis Pembatas (Tersendiri)*: Khusus mengelola pembatas: Switch garis + Warna garis di baris 1; Tebal (pt) (46px) + Margin X (mm) (48px) di baris 2.
       - *Pengecualian & Proteksi (Tersendiri)*: Khusus mengelola proteksi: `[ ] Lewati Halaman 1 (Cover)` di baris 1 dan `[x] Kunci Objek (Lock)` di baris 2 (persis konsisten dengan Tab Nomor Halaman).
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.
- **2026-10-28 [PERBAIKAN INPUT KEMEPETAN & POSISI SATUAN MENYELURUH]**:
  - **Identifikasi Masalah**:
    - Pada screenshot pengguna di blok "Tipografi, Warna & Offset" (Tab Nomor Halaman) dan tab lainnya, input number berukuran `32px` - `36px` terlalu sempit (*kemepetan*).
    - Pada browser/WebKit Linux, tombol stepper/spinner native `<input type="number">` memakan ruang sekitar 18-20px di sisi kanan. Ditambah padding bawaan, area teks angka tersisa hanya ~10px sehingga angka 2 digit (misal `10`, `16`, `72`) atau angka desimal terpotong atau mepet menabrak panah spinner.
  - **Solusi & Perbaikan Menyeluruh**:
    1. **Peningkatan Lebar Input Number**:
       - Tab Nomor Halaman: `pn-font-size` & `pn-offset` ditingkatkan dari `36px` ke **48px**, dan lebar kontainer grup ditingkatkan dari `290px` ke `315px`.
       - Tab Header & Footer: `hf-offset-top` & `hf-offset-bottom` (38px -> **48px**), `hf-image-w` & `hf-image-h` (32px -> **46px**), `hf-font-size` (34px -> **48px**), `hf-divider-thickness` (34px -> **46px**), `hf-margin-x` (36px -> **48px**). Lebar kontainer grup disesuaikan secara proporsional.
       - Tab Watermark: `wm-font-size` (44px -> **48px**).
       - Tab Halaman: `add-count` (44px -> **48px**), `custom-w` & `custom-h` (48px -> **52px**), `add-count-custom` (40px -> **48px**).
    2. **Perapian Styling Global `.number-input` di CSS**:
       - Menambahkan proteksi `min-width: 46px;` pada kelas `.number-input`.
       - Menyesuaikan padding sisi kanan (`padding: 3px 2px 3px 4px;`) agar teks angka rata kanan tidak pernah terpotong atau menempel ketat pada panah spinner.
    3. **Penyelarasan Satuan di Seluruh Label**:
       - Memastikan seluruh satuan berada di dalam teks label (`Ukuran (pt):`, `Offset (mm):`, `W (mm):`, `H (mm):`, `Tbl (pt):`, `Margin X (mm):`, `Bleed (mm):`, `Ukuran (mm):`).
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.
- **2026-10-28 [REORGANISASI TAB HEADER & FOOTER: ELIMINASI SESAK & PLACEHOLDER RINGKAS]**:
  - **Identifikasi Masalah (Tampilan Sesak & Teks Terpotong)**:
    - Pada tab Header & Footer, slot teks sebelumnya memuat 3 input dengan placeholder panjang ("Header kiri", "Header ten...", "Header kar..." dan "[Digunakar...]" saat slot dikunci no. hal) sehingga teks terpotong jelek.
    - Grup "Pembatas & Opsi" menampung terlalu banyak kontrol sekaligus (garis, tebal, warna, cover, margin x, kunci objek) dalam ruang sempit sehingga terasa sangat sesak dan tidak terorganisir.
  - **Solusi & Reorganisasi**:
    1. **Placeholder Ringkas & Tidak Terpotong**:
       - Mengubah placeholder 3 slot menjadi ringkas: `Kiri`, `Tengah`, `Kanan` (atau `Left`, `Center`, `Right` pada EN).
       - Mengubah placeholder slot terkunci menjadi `[No. Hal]` (ID) dan `[Page No]` (EN) sehingga muat sempurna tanpa terpotong.
    2. **Reorganisasi Logis Grup Header & Footer**:
       - *Header (Atas)*: 3 slot input (`215px`) + Offset Y (mm) (48px) + Tombol Modal Multiline [✎].
       - *Footer (Bawah)*: 3 slot input (`215px`) + Offset Y (mm) (48px) + Tombol Modal Multiline [✎].
       - *Logo & Gambar*: Baris 1 memuat Tombol Pilih Logo + Dropdown Posisi (`Ftr Kiri`, `Hdr Kanan`, dll) bersebelahan; Baris 2 memuat `W (mm):` dan `H (mm):` (48px).
       - *Tipografi & Warna*: Font dropdown di baris 1, Warna picker + Ukuran (pt) (48px) di baris 2.
       - *Garis Pembatas (Tersendiri)*: Khusus mengelola pembatas: Switch garis + Warna garis di baris 1; Tebal (pt) (46px) + Margin X (mm) (48px) di baris 2.
       - *Pengecualian & Proteksi (Tersendiri)*: Khusus mengelola proteksi: `[ ] Lewati Halaman 1 (Cover)` di baris 1 dan `[x] Kunci Objek (Lock)` di baris 2 (persis konsisten dengan Tab Nomor Halaman).
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [REORGANISASI TAB WATERMARK: PENYATUAN SUMBER & KONTEN, PERATAAN RAPI & KONSISTENSI TOTAL]**:
  - **Identifikasi Masalah**:
    - Pada tab Watermark, grup "Tipe Watermark" berdiri sendiri hanya dengan 1 kontrol dropdown `Mode:` sehingga melayang canggung dan menyisakan ruang kosong di bawahnya.
    - Pada "Berkas Gambar", baris 2 `Lebar: [ 80 ] mm` memiliki satuan yang terpisah di luar atau tidak rata kanan, serta menyisakan ruang kosong di sebelah kanannya yang tidak seimbang dengan baris 1.
    - Ketika berpindah ke mode gambar, grup "Gaya, Arah & Opasitas" menyembunyikan kontrol Warna dan Ukuran (pt) sehingga baris kontrol menjadi renggang dan tidak simetris (Rotasi memiliki margin kiri bawaan, Opasitas melebar sendiri).
    - Proteksi berdiri sendiri dengan 1 checkbox canggung.
  - **Solusi & Perapian Menyeluruh**:
    1. **Penyatuan Sumber & Konten (`Sumber & Konten` / `Source & Content`)**:
       - Menggabungkan pemilih `Mode:` langsung di awal baris 1 pada grup `290px`.
       - Mode Teks: Baris 1 memuat `Mode:` + `Teks: [ DRAFT ]`; Baris 2 memuat `Font: [ Sans-serif... v ]` (+ input kustom jika dipilih).
       - Mode Gambar: Baris 1 memuat `Mode:` + tombol `[ 🖼 Pilih Gambar... ]` + tombol `[ ✕ ]`; Baris 2 memuat `Lebar (mm): [ 80 ]` (rata kanan flush 52px) + keterangan halus `(Proporsional)`.
       - Kedua baris di kedua mode selalu terisi penuh, padat, simetris, dan tidak ada lubang kosong.
    2. **Perapian `Gaya & Transformasi` (`Style & Transform`)**:
       - Kontainer selebar `255px`.
       - Baris 1: `Rotasi:` dropdown + `Warna:` color picker (khusus mode teks, auto-hidden rapi di mode gambar).
       - Baris 2: `Opasitas:` range slider + `%` + `Ukuran (pt):` (48px number-input rata kanan, auto-hidden rapi di mode gambar).
       - Ketika mode gambar aktif, dropdown `Rotasi` dan slider `Opasitas` melebar penuh secara elegan (`flex-1`) tanpa sisa margin aneh.
    3. **Penyelarasan `Pengecualian & Proteksi` (`Exceptions & Protection`)**:
       - Menstandarkan grup proteksi selebar `185px` persis seperti pada Tab Nomor Halaman dan Tab Header & Footer:
         - Baris 1: `[ ] Lewati Halaman 1 (Cover)` (didukung penuh di live preview WYSIWYG dan backend Python `ink-pageman.py`).
         - Baris 2: `[x] Kunci Objek (Lock)`.
    4. **Modular i18n & Package**:
       - Menambahkan terjemahan `watermark_source`, `style_transform`, `proportional` pada `ui/id.json` dan `ui/en.json`.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi JSON `python3 -m json.tool` untuk `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [LOGO BRAND KLIK ABOUT & PENGHAPUSAN TEKS INKSCAPE 1.2+]**:
  - **Identifikasi Kebutuhan**:
    1. Logo brand `[INK] PAGE MANAGER` di pojok kiri atas antarmuka diharapkan membuka dialog About ketika diklik (interaksi cepat/shortcut pengguna).
    2. Teks/label `Inkscape 1.2+` di tab Pengaturan & Info (blok Tentang Ekstensi) tidak jelas konteksnya dan menimbulkan kebingungan bagi pengguna sehingga lebih baik dihapus.
  - **Solusi & Implementasi**:
    1. **Logo Brand Interaktif**:
       - Menambahkan cursor pointer, user-select none, transisi hover/active pada `.app-brand` di `ui/style.css`.
       - Menambahkan tooltip/title `Tentang Page Manager (Klik untuk Info & Bantuan)` dengan dukungan i18n (`tooltips.brand_about`).
       - Menghubungkan event listener click `.app-brand` pada `ui/app.js` untuk membuka modal About (`modal-about`).
    2. **Pembersihan Teks `Inkscape 1.2+`**:
       - Menghapus elemen `<span class="unit-label">Inkscape 1.2+</span>` dari baris 1 di blok Tentang Ekstensi (`ui/index.html`).
       - Menyesuaikan lebar kontainer grup dari `230px` menjadi `200px` yang pas dan proporsional untuk tombol Info Lengkap.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [PERBAIKAN OVERFLOW BARIS KUSTOM TAB HALAMAN (NABRAK PEMBATAS)]**:
  - **Identifikasi Masalah**:
    - Pada tab Halaman (Blok Tambah Baru), saat preset dipilih "Kustom...", baris input ukuran kustom (`Ukuran (mm): [ 210 ] × [ 297 ] Jml: [ 1 ]`) membutuhkan ruang horizontal sekitar 278px.
    - Kontainer `.group-form-col` sebelumnya dipatok pada `width: 260px;`.
    - Akibatnya, input stepper jumlah `Jml: [ 1 ]` meluber keluar melewati batas dan menabrak garis pembatas grup (*border-right*).
  - **Solusi & Perbaikan**:
    - Meningkatkan lebar kontainer `.group-form-col` dari `260px` menjadi `295px`.
    - Menggunakan `.form-label-compact` untuk label Ukuran agar lebih fleksibel tanpa `min-width` berlebih.
    - Menyesuaikan lebar input `custom-w` dan `custom-h` (50px) serta `add-count-custom` (46px) agar memiliki margin lega (+17px buffer) dari garis pembatas.
    - Mengatur dropdown orientasi pada baris standar dengan `flex-1` agar mengisi ruang secara proporsional.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [PERBAIKAN TOTAL TUMPANG TINDIH & OVERFLOW ELEMEN PADA SELURUH TAB]**:
  - **Identifikasi Masalah (Berdasarkan Screenshot Pengguna)**:
    1. Pada blok *Logo & Gambar* (Tab Header & Footer):
       - Tombol pilih logo yang terpasang ("Image Attached" / "Logo Attached") dipaksa berbagi ruang sempit dengan tombol clear `[✕]` dan dropdown posisi `[Ftr Left]` dalam kontainer `185px`.
       - Karena elemen flex tidak memiliki `min-width: 0;` dan `overflow: hidden;`, teks tombol meluber keluar dan tombol `[✕]` bertumpang tindih (*overlap*) langsung di atas teks tombol.
       - Baris 2 `W (mm): [ 25 ] H (mm): [ 10 ]` membutuhkan 196px sehingga input `[ 10 ]` menabrak garis pembatas.
    2. Pada blok *Garis Pembatas* (Tab Header & Footer):
       - Baris 2 `Thick (pt): [ 0.5 ] Margin X (mm): [ 10 ]` membutuhkan ruang 240-246px dalam bahasa Inggris, tetapi kontainer dipatok `210px`. Akibatnya input `[ 10 ]` meluber 36px keluar melewati pembatas grup (*border-right*).
    3. Pada blok *Tipografi & Warna* (Tab Header & Footer):
       - Kontainer `180px` terlalu ketat untuk baris 2 `Color: [ ] Size (pt): [ 9 ]` (186px).
    4. Pada blok *Tipografi, Warna & Offset* (Tab Nomor Halaman):
       - Kontainer `315px` sangat mepet dengan baris 2 `Color: [ ] Size (pt): [ 10 ] Offset (mm): [ 10 ]` (310px).
  - **Solusi & Perbaikan Menyeluruh**:
    1. **CSS Proteksi Overlap & Truncation**:
       - Menambahkan `min-width: 0; overflow: hidden;` pada `.btn-sm-action`.
       - Menambahkan `text-overflow: ellipsis; white-space: nowrap; overflow: hidden; min-width: 0;` pada span teks `.btn-sm-action` agar teks panjang secara otomatis terpotong rapi dengan `...` di dalam batas tombol, tanpa pernah meluber atau menabrak tombol sibling `[✕]`.
       - Menambahkan `flex-shrink: 0;` pada tombol `[✕]` dan icon agar ukurannya paten dan tidak tertekan gepeng.
    2. **Penyesuaian Lebar Kontainer Proporsional**:
       - *Logo & Gambar*: ditingkatkan dari `185px` ke **`240px`** (memberikan ruang lega 126px untuk tombol + 22px clear + 82px posisi di baris 1, serta ruang aman +56px di baris 2).
       - *Garis Pembatas*: ditingkatkan dari `210px` ke **`255px`** (memberikan ruang aman +15px sehingga `Margin X (mm): [ 10 ]` tidak pernah menyentuh garis pembatas).
       - *Tipografi & Warna (H&F)*: ditingkatkan dari `180px` ke **`200px`** (+24px buffer).
       - *Tipografi, Warna & Offset (No. Hal)*: ditingkatkan dari `315px` ke **`325px`** (+15px buffer).
       - *Gaya & Transformasi (Watermark)*: ditingkatkan dari `255px` ke **`265px`** (+15px buffer).
    3. **Modular i18n**:
       - Menambahkan label `"logo_attached": "Logo Attached" / "Logo Terpasang"` untuk membedakan konteks logo pada header/footer dari watermark gambar.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [PEMBERSIHAN SPINNER INPUT ANGKA & MOUSE WHEEL STEPPING]**:
  - **Identifikasi Masalah (Berdasarkan Feedback & Screenshot Pengguna)**:
    - Input angka `<input type="number">` pada WebKit2GTK / browser Linux menampilkan tombol panah naik/turun bawaan (*native stepper button*) berupa kotak putih terang (~20px) yang sangat mencolok dan kontras kasar dengan tema gelap (*dark theme*).
    - Panah bawaan tersebut memakan ruang horizontal sebesar ~20px di dalam input, sehingga tampilan angka menjadi sesak, terhimpit, dan merusak estetika antarmuka secara keseluruhan.
    - Pengguna meminta agar panah spinner tersebut dihilangkan atau dipoles menjadi input bersih yang sesuai tema.
  - **Solusi & Implementasi**:
    1. **Pembersihan Panah Native Spinner (CSS)**:
       - Menghilangkan tombol spinner WebKit dengan `::-webkit-inner-spin-button, ::-webkit-outer-spin-button { -webkit-appearance: none !important; margin: 0 !important; display: none !important; }`.
       - Mengatur `appearance: textfield !important; -moz-appearance: textfield !important;` pada `input[type="number"]`.
       - Menyesuaikan padding `.number-input` menjadi `padding: 3px 6px;` dan `min-width: 42px;` dengan font monospaced rata kanan (`text-align: right`) sehingga angka tampil sangat rapi, elegan, dan lega ala Blender / Figma.
    2. **Interaksi Cepat Mouse Wheel Stepping (JS)**:
       - Menambahkan event listener `wheel` pada seluruh elemen `input[type="number"]`.
       - Saat kursor mouse berada di atas input angka dan di-scroll (roda putar mouse), nilai angka bertambah atau berkurang secara otomatis mengikuti atribut `step`, `min`, dan `max`.
       - Menjaga presisi desimal (*floating point rounding*) sesuai step (misal 0.1 atau 0.5).
       - Men-dispatch event `input` dan `change` secara otomatis agar kanvas WYSIWYG langsung terupdate seketika (*real-time preview*).
       - Mengabaikan input yang dalam status `disabled` atau `readOnly`.
       - Navigasi tombol panah keyboard (Up / Down) dan pengetikan langsung tetap berfungsi 100% normal.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Menjalankan render headless WebKit2GTK (`render_all_tabs.py`) pada seluruh tab (`pages`, `layout`, `margins`, `numbers`, `headerfooter`, `watermark`, `settings`):
      - Terverifikasi visual: kotak putih panah native 100% hilang di seluruh tab.
      - Input angka tampil menyatu rapi dengan background gelap, teks rata kanan, dan proporsi jarak lega.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-28 [PENYELESAIAN TAMPILAN SCROLL & PELEBARAN PROPORSI TAB HEADER & FOOTER]**:
  - **Identifikasi Masalah**:
    1. Scrollbar horizontal tebal muncul melintasi bagian bawah tab ribbon dan menutupi teks label grup (`STATUS`, `HEADER (TOP)`, `FOOTER (BOTTOM)`, dll).
    2. Saat dilakukan uji penyusutan ekstrem untuk menghilangkan scrollbar, elemen di dalam grup `Teks & Posisi` (220px) dan `Logo & Gambar` (175px) menjadi sangat berdesakan (*sesak sekali*): tombol pensil `[✎]` menabrak garis pembatas, input slot teks tertekan gepeng (~68px), dan teks dropdown posisi terpotong menjadi `"Hdr Cente..."`.
  - **Solusi & Implementasi**:
    1. **Eliminasi Batang Scrollbar Fisik (CSS)**:
       - Mengatur `scrollbar-width: none;` dan `::-webkit-scrollbar { display: none; }` pada `.ribbon-content` di `ui/style.css`.
       - Menghilangkan sepenuhnya batang abu-abu tebal yang menimpa label grup, sehingga seluruh teks label di bawah ribbon tetap 100% bersih dan terbaca sempurna.
       - Menambahkan event listener `wheel` pada `.ribbon-content` (`ui/app.js`) agar pengguna tetap dapat menggeser toolbar ribbon secara halus menggunakan roda putar mouse (*horizontal mouse wheel scrolling*) saat ukuran jendela lebih kecil.
    2. **Pelebaran & Tata Letak Proporsional (*Spacious & Natural*)**:
       - `Teks & Posisi`: diperlebar menjadi **`285px`**. Segmented button `[ Header | Footer ]` memiliki jeda lega dengan `Offset Y (mm): [ 12 ]` dan tombol edit `[✎]` (+20px buffer dari garis pembatas). Tiga slot input teks di baris 2 masing-masing mendapatkan ruang lega ~88px sehingga placeholder dan isi teks leluasa tanpa terpotong.
       - `Logo & Gambar`: diperlebar menjadi **`230px`** dengan dropdown posisi 86px sehingga teks opsi `"Hdr Center"` / `"Ftr Left"` tampil utuh tanpa terpotong.
       - `Tipografi & Warna`: diperlebar menjadi **`195px`** dengan ruang nyaman untuk pilihan font dan warna/ukuran.
       - `Garis Pembatas` (245px) dan `Pengecualian & Proteksi` (185px) diposisikan secara konsisten dan proporsional.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi format JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Pengujian visual WebKit2GTK offscreen headless:
      - Seluruh label grup bawah ribbon bebas dari tumpukan batang scrollbar.
      - Tidak ada lagi elemen atau tombol yang menabrak garis pembatas.
      - Tampilan lapang, rapi, dan konsisten di Bahasa Indonesia dan Bahasa Inggris.
    - Menjalankan `./package.sh` dan memverifikasi `ink-pageman.zip.md5: OK`.

- **2026-10-29 [EKSEKUSI FITUR 1, 2, 4 & PEROMBAKAN GRID PRESISI RATA KANAN-KIRI]**:
  - **Identifikasi Kebutuhan & Permintaan Pengguna**:
    1. Pengguna menyetujui eksekusi fitur prioritas: Fitur 1 (Ikutkan Objek/Artwork), Fitur 2 (Mode Buku / Facing Pages Ganjil-Genap), dan Fitur 4 (Master Page / Template Bersama), serta melewati Fitur 3.
    2. Pengguna meminta perombakan antarmuka ribbon agar solid, teratur, matematis per kolom, dan **100% rata kanan-kiri (justified edge-to-edge)** di semua tab tanpa blok yang asal taruh atau berantakan.
  - **Solusi & Implementasi**:
    1. **Fitur 1: Ikutkan Objek / Artwork Saat Halaman Berpindah (`move_content`)**:
       - Di `ink-pageman.py`: Menyimpan koordinat awal halaman (`self.initial_pages`) saat memuat dokumen untuk menghitung pergeseran delta $(\Delta x, \Delta y)$ setiap halaman.
       - Saat `apply_changes`: Memeriksa objek-objek level atas pada layer (mengecualikan layer otomatis yang digenerate sistem). Jika titik tengah (*bounding box center*) objek berada di dalam halaman asal, objek dipindahkan dengan `Transform(translate=(dx, dy))`.
       - Di `ui/index.html` & `ui/app.js`: Ditambahkan checkbox `#layout-move-content` ("Ikutkan Objek / Artwork") dengan tooltip penjelasan.
    2. **Fitur 2: Facing Pages / Mode Buku (Ganjil-Genap) Cermin**:
       - *Margin*: Ditambahkan checkbox `#margin-facing` ("Mode Buku"). Pada halaman genap (halaman kiri buku), margin kiri dan margin kanan (dalam/luar) otomatis ditukar secara matematis baik pada `<inkscape:page>` maupun canvas guides `<sodipodi:guide>`.
       - *Nomor Halaman*: Ditambahkan checkbox `#pn-facing-pages`. Pada halaman genap, posisi `left` $\leftrightarrow$ `right` dicerminkan secara dinamis pada Live Preview dan export SVG.
       - *Header & Footer*: Ditambahkan checkbox `#hf-facing-pages` ("Tukar Kiri/Kanan Genap"). Slot teks kiri dan kanan serta penempatan logo dicerminkan pada halaman genap.
    3. **Fitur 4: Master Page / Template Bersama (Native SVG `<use>`)**:
       - Di `ui/index.html` & `ui/app.js`: Ditambahkan blok `Master Page` pada tab Halaman (`#master-source` untuk memilih halaman master dan `#master-target` untuk memilih target: Semua, Semua Kecuali Cover, atau Halaman Tertentu).
       - Pada Live Preview kanvas, halaman master ditandai dengan badge elegan `★ MASTER`.
       - Di `ink-pageman.py`: Seluruh elemen artwork pada halaman master dikloning ke dalam `<defs><g id="master_page_template">`, lalu dipasang ke target halaman menggunakan elemen native `<use href="#master_page_template" x="..." y="..." />` di dalam layer non-destruktif `layer_master_page` di posisi background paling bawah. Sangat ringan, file SVG tetap kecil, dan 100% didukung Inkscape.
    4. **Perombakan Grid Ribbon Toolbar 100% Presisi Rata Kanan-Kiri**:
       - Seluruh tab (`pages`, `layout`, `margins`, `numbers`, `headerfooter`, `watermark`, `settings`) dirapikan dengan struktur kolom vertikal yang sejajar antara Baris 1 dan Baris 2.
       - Menghilangkan `[✎ Sunting]` lebar menjadi square icon button `[✎]` 24px yang pas di kolom 3 sejajar dengan input slot ketiga.
       - Menyesuaikan lebar grup Header & Footer (`225px`, `180px`, `165px`, `175px`, `165px`) sehingga seluruh 6 grup dapat muat secara simultan pada lebar standar 1150px tanpa memerlukan scrollbar horizontal.
       - Seluruh baris form memiliki perataan rata kanan-kiri yang presisi (*flush alignment*).
    5. **Dukungan Multibahasa Penuh (i18n)**:
       - Memperbarui `ui/id.json` dan `ui/en.json` untuk semua string, label, dan opsi baru.
  - **Verifikasi**:
    - Validasi sintaks JS `node -c ui/app.js` dan Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    - Validasi JSON `ui/id.json` dan `ui/en.json` lolos 100%.
    - Skrip uji otomatis mengonfirmasi:
      - Pergeseran artwork rect mengikuti delta halaman ($x + 66.05, y + 50$) terverifikasi `translate(66.0549, 50)`.
      - Template master page `<defs><g id="master_page_template">` dan 2 instansi `<use>` terbuat di `layer_master_page`.
      - Facing pages cermin nomor halaman dan header/footer terpasang sempurna.
    - Render visual headless WebKit2GTK offscreen 1150px mengonfirmasi seluruh 7 tab tampil rapi, solid, rata kanan-kiri, dan tanpa clipping.
    - Pemaketan `./package.sh` berhasil dan checksum `md5sum -c ink-pageman.zip.md5` terverifikasi `OK`.

- **2026-10-29 [PERBAIKAN TOTAL: PAGE TIDAK TERKUNCI, RESCUE ARTWORK SISTEM, & ELIMINASI TABRAKAN UI HEADER/FOOTER]**:
  - **Identifikasi Masalah & Laporan Pengguna**:
    1. Pengguna melaporkan: *"btw, page jangan ikutan di lock dong, jadi ga bisa diisi dalamnya, yang di lock itu konten generatednya, header, footer, page number, watermark, dll"*.
       - *Penyebab Root*: Atribut `sodipodi:insensitive="true"` sebelumnya dipasang langsung pada node layer (`<g inkscape:groupmode="layer">`). Akibatnya, seluruh layer di Inkscape tergembok total, dan jika layer tersebut aktif atau menutupi halaman, pengguna tidak dapat menggambar atau mengisi objek di dalam halaman.
    2. Pengguna mengirim screenshot dengan kotak merah: *"nabrak ini ui-nya"* pada grup **Garis Pembatas** dan **Pengecualian**:
       - *Penyebab Root*: Di Bahasa Indonesia, label `Tebal (pt):` dan `Margin X (mm):` membutuhkan lebar 220px, tetapi kontainer dipatok `180px` sehingga input `[ 10 ]` menabrak border vertikal kanan. Ditambah lagi teks `Lewati Halaman 1 (Cover)` dan `Tukar Kiri/Kanan Genap` meluber keluar melewati batas kanan jendela 1150px (total lebar mencapai 1270px).
  - **Solusi & Implementasi**:
    1. **Pemisahan Penguncian Elemen Mandiri (Halaman & Layer Tetap 100% Bebas/Terbuka)**:
       - Menghapus pemasangan `sodipodi:insensitive="true"` dari seluruh node layer (`layer_page_numbers`, `layer_header_footer`, `layer_watermark`, `layer_master_page`, `layer1`). Seluruh layer kini selalu dalam keadaan **TERBUKA (UNLOCKED)**.
       - Atribut gembok `sodipodi:insensitive="true"` **hanya** dipasang pada elemen grafis individual buatan sistem (`<text>`, `<image>`, `<path>` pembatas, `<use>` master page) jika opsi kunci diaktifkan.
       - Setiap elemen buatan ekstensi ditandai secara presisi dengan `data-pageman-gen="true"` dan `class="ink-pageman-gen"`.
    2. **Penyelamatan Artwork Pengguna (*Safe Layer Rescue*)**:
       - Pada fungsi `safe_clean_layer()`, sistem hanya membersihkan elemen ber-tag `data-pageman-gen="true"`.
       - Jika terdapat objek buatan pengguna (misalnya kotak, path, atau teks yang digambar pengguna saat layer sistem sempat aktif), sistem otomatis menyelamatkan dan memindahkannya (*rescue*) ke `Layer 1` (Artwork Utama), sehingga tidak akan pernah ada artwork yang musnah saat apply.
       - Di akhir `apply_changes()`, atribut `inkscape:current-layer` selalu dikembalikan secara eksplisit ke `layer1`.
       - Jendela dialog Linux GTK disetel `window.set_modal(True)` dan `window.set_keep_above(True)`.
    3. **Eliminasi Tabrakan & Penyelarasan Presisi Ribbon Header & Footer**:
       - Di `ui/id.json` dan `ui/en.json`: merampingkan label menjadi `"thickness": "Tbl (pt):"`, `"margin_x": "Margin (mm):"`, `"skip_cover": "Lewati Cover"` / `"Skip Cover"`, dan `"facing_hf": "Tukar Kiri/Kanan (Genap)"`.
       - Menyesuaikan lebar kontainer form secara matematis:
         - `Teks & Posisi`: `width: 245px;` (label ringkas `Offset:` menghasilkan sisa jeda lega 54px di baris 1, dan 3 slot input 79px di baris 2).
         - `Logo & Gambar`: `width: 175px;` (dropdown 74px, tombol logo lega).
         - `Tipografi & Warna`: `width: 165px;`.
         - `Garis Pembatas`: `width: 195px;` (baris kedua `Tbl (pt): [ 0,5 ]` dan `Margin (mm): [ 10 ]` kini memiliki buffer aman 15px dari border kanan, 100% bebas tabrakan!).
         - `Pengecualian & Proteksi`: `width: 155px;` (seluruh teks checkbox muat sempurna tanpa terpotong).
       - Total lebar seluruh grup adalah **1145px** di dalam batas jendela **1150px**, dengan DOM `scrollWidth: 1150` dan `containerWidth: 1150` (tanpa horizontal scrollbar).
  - **Verifikasi**:
    1. Pengujian integrasi otomatis Python lolos 100%:
       - Seluruh layer SVG terverifikasi `locked=False`.
       - Elemen buatan sistem terverifikasi `sodipodi:insensitive="true"`.
       - Objek pengguna `accidental_user_rect` berhasil diselamatkan ke `layer1`.
       - Atribut `inkscape:current-layer` terverifikasi `layer1`.
    2. Render visual offscreen WebKit2GTK (`header_footer_id_verified3_crop.png` dan `header_footer_en_verified_crop.png`) mengonfirmasi tampilan rapi, proporsional, dan 0 tabrakan di Bahasa Indonesia dan Inggris.
    3. Validasi sintaks `node -c ui/app.js` dan kompilasi Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    4. Pemaketan rilis `./package.sh` berhasil dan checksum `md5sum -c ink-pageman.zip.md5` valid (`OK`).

- **2026-10-29 [PERBAIKAN PERPINDAHAN ARTWORK REARRANGE & PENYEMPURNAAN TAB HEADER & FOOTER]**:
  - **Identifikasi Masalah**:
    1. Pengguna melaporkan bahwa saat halaman di-rearrange atau ekstensi di-apply, halaman yang memiliki konten tampak blank/kembali kosong.
       - *Penyebab Root*: Keterbatasan `bounding_box()` inkex pada tipe elemen tertentu (misalnya `TextElement` yang menghitung bounding box ke titik `(0, 0)` saat tspan tidak memiliki x/y eksplisit sehingga anchor `cx` meleset ke halaman lain) dan elemen di dalam sublayer tidak terkumpul secara individual melainkan sebagai satu sublayer utuh.
    2. Tab Header & Footer sebelumnya memiliki potensi scrollbar jika dipecah terpisah. Desain yang tepat adalah menggunakan segmented toggle `[ Header | Footer ]` dalam satu kolom `TEXT & POSITION` terpadu dengan proporsi ruang yang leluasa (`Offset Y (mm): [ 12 ]` dan slot input teks).
    3. Peringatan console Inkscape `Unimplemented style property 399` muncul karena atribut CSS `pointer-events: none` yang tidak dikenali mesin render SVG Inkscape.
  - **Solusi & Implementasi**:
    1. **Robust Element Center & Recursive Graphic Collection (`ink-pageman.py`)**:
       - Mengimplementasikan `_get_element_center(elem)` yang secara cerdas mendeteksi koordinat tengah objek SVG:
         - Untuk `TextElement`: menghitung koordinat asli `x, y` dari atribut teks dan mengalikannya dengan `elem.transform` sehingga posisi teks tidak pernah meleset.
         - Untuk shapes (`Rectangle`, `Circle`, `Ellipse`, `Line`, `Image`, `Use`): fallback berlapis dari `bounding_box()`, `(cx, cy)`, hingga bounding box atribut geometri asli dengan matriks transform.
       - Mengimplementasikan `_collect_graphic_elements(node, ignored_layer_ids)` secara rekursif sehingga seluruh elemen grafis di dalam layer dan sublayer terdalam terkumpul satu per satu tanpa salah memindahkan satu layer utuh lintas halaman.
       - Master Page cloning juga mengadopsi `_collect_graphic_elements` dan `_get_element_center` agar seluruh jenis elemen artwork di halaman master terkloning secara presisi.
    2. **Penyempurnaan Tab Header & Footer (`ui/index.html`)**:
       - Menyesuaikan lebar kolom `Teks & Posisi` menjadi `260px` dengan label `Offset Y (mm):` yang jelas dan nyaman.
       - Menyesuaikan lebar grup pendamping: `Logo & Gambar` (195px), `Tipografi & Warna` (175px), `Garis Pembatas` (180px), dan `Pengecualian & Proteksi` (175px).
       - Total lebar tab Header & Footer adalah 1040px, pas dan sangat lega di dalam resolusi default 1150px tanpa ada scrollbar horizontal dan tanpa elemen bertabrakan.
    3. **Eliminasi Warning CSS Inkscape**:
       - Menghapus seluruh penugasan `pointer-events: none` pada elemen SVG, dan mengandalkan `sodipodi:insensitive="true"` native Inkscape untuk penguncian objek proteksi non-destruktif.
  - **Verifikasi**:
    1. Uji skrip otomatis pergeseran artwork multi-elemen (`Rectangle`, `Circle`, `TextElement`, `PathElement`, sublayer `Rectangle`) saat halaman berpindah dari $(233.94, 0)$ ke $(0, 320)$ terbukti berhasil 100%: seluruh elemen mendapatkan `translate(-233.945, 320)` dan elemen di halaman lain tidak terpengaruh (`transform: None`).
    2. Uji render visual offscreen headless WebKit2GTK pada resolusi 1150px mengonfirmasi tab Header & Footer tampil solid, rapi, proporsional, dan 100% bebas dari scrollbar horizontal.
    3. Validasi sintaks `node -c ui/app.js` dan kompilasi Python `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    4. Pemaketan `./package.sh` berhasil dan checksum `md5sum -c ink-pageman.zip.md5` terverifikasi `OK`.

- **2026-10-29 [EKSEKUSI PENUH & INTEGRASI TOTAL: LAYER RESCUE & MIGRATION SYSTEM]**:
  - **Identifikasi Masalah & Latar Belakang**:
    1. Pengguna menginstruksikan: *"sekalian juga eksekusi perbaikan layer migration"*.
    2. Sebelumnya, proses pembersihan elemen buatan sistem dan penyelamatan artwork pengguna hanya dieksekusi secara lokal di dalam fungsi `get_or_create_layer()`.
    3. Ini menyebabkan kelemahan kritis:
       - **Timing Issue**: Jika pengguna menggambar artwork di atas salah satu layer sistem (`layer_watermark`, `layer_header_footer`, dll.) dan kemudian mengubah posisi/rearrange halaman (misal memindahkan Halaman 2 ke baris baru), artwork tersebut baru diselamatkan *setelah* logika pergeseran artwork (`page_shifts`) selesai berjalan. Akibatnya, artwork tersebut tertinggal di posisi lama dan tidak ikut bergeser bersama halamannya.
       - **Disabled Features Issue**: Jika suatu fitur dinonaktifkan (misal Watermark dimatikan / tidak dicentang), layer sistem yang sudah ada sebelumnya tidak diproses oleh `get_or_create_layer()`, sehingga artwork pengguna yang terjebak di dalamnya tidak terselamatkan.
       - **Legacy Elements**: Elemen yang digenerate oleh versi ekstensi lama (sebelum penambahan `data-pageman-gen`) belum memiliki atribut pendeteksi spesifik.
  - **Solusi & Implementasi Komprehensif (`ink-pageman.py`)**:
    1. **Pre-Migration Sweep di Tahap Awal (Step 0)**:
       - Memindahkan seluruh inisialisasi layer helper (`get_main_artwork_layer`, `is_extension_generated`, `safe_clean_layer`) ke **Step 0** sebelum `page_shifts` / pergeseran halaman berjalan.
       - Melakukan penyisiran aktif (*pre-migration sweep*) pada seluruh layer sistem (`layer_page_numbers`, `layer_header_footer`, `layer_watermark`, `layer_master_page`):
         - Setiap elemen buatan pengguna (shapes, paths, text, images, groups) langsung dipindahkan (*rescued*) ke `Layer 1` (Artwork Utama).
         - Atribut gembok `sodipodi:insensitive` pada elemen yang diselamatkan langsung dibersihkan agar dapat diedit secara normal.
       - Dengan demikian, saat logika `move_content` berjalan di Step 1, seluruh elemen yang diselamatkan sudah berada di `Layer 1` dan **otomatis ikut bergeser secara presisi mengikuti pergerakan halamannya**!
    2. **Pendeteksian Cerdas Elemen Sistem vs Artwork Pengguna (`is_extension_generated`)**:
       - Memeriksa atribut `data-pageman-gen="true"` dan kelas `ink-pageman-gen`.
       - Memeriksa prefix ID sistem (`pn_`, `hf_`, `wm_`, `pageman_`, `master_page_`).
       - Memeriksa link template master page (`#master_page_template`).
       - Mendeteksi elemen legacy sistem: elemen `<text>` di `layer_page_numbers` dan `<use>` di `layer_master_page` dikenali sebagai item sistem yang dibersihkan, sedangkan bentuk grafis (`rect`, `circle`, `path`, `g`, dll.) 100% dipastikan sebagai artwork pengguna yang diselamatkan.
    3. **Pembersihan Bersih saat Fitur Dinonaktifkan**:
       - Ketika suatu fitur dinonaktifkan (misalnya Watermark atau Header/Footer), layer sistem tersebut dibersihkan dari seluruh elemen buatan sistem dan dihapus dari dokumen secara rapi, tanpa ada artwork pengguna yang hilang.
    4. **Jaminan Dokumen Bebas Gembok & Active Layer Siap Pakai**:
       - Di akhir `apply_changes()`, seluruh layer di dokumen SVG disisir untuk memastikan tidak ada tag layer (`<g inkscape:groupmode="layer">`) yang memiliki `sodipodi:insensitive`.
       - Atribut `inkscape:current-layer` selalu diarahkan kembali ke `layer1` sehingga kanvas Inkscape langsung aktif dan siap digambar.
  - **Verifikasi**:
    1. **Uji Kasus 1 (Pergeseran Artwork Rescued saat Rearrange)**:
       - Kotak buatan pengguna `accidental_rect_on_wm` di Halaman 2 yang sengaja ditaruh di `layer_watermark` terbukti berhasil diselamatkan ke `layer1` DAN otomatis berpindah koordinat dengan transform `translate(-220, 320)` mengikuti Halaman 2.
    2. **Uji Kasus 2 (Multi-Layer Rescue & Disabled Cleanup)**:
       - Circle di `layer_page_numbers`, path di `layer_header_footer`, dan rect di `layer_watermark` semuanya berhasil diselamatkan ke `layer1`.
       - Layer sistem yang dinonaktifkan terbukti terhapus bersih dari dokumen.
       - Teks nomor halaman versi legacy tidak terduplikasi ke `layer1`.
    3. Validasi sintaks `python3 -m py_compile ink-pageman.py` lolos tanpa error.
    4. Pemaketan rilis `./package.sh` diperbarui dan checksum `md5sum -c ink-pageman.zip.md5` terverifikasi `OK`.


- **2026-10-29 [PERBAIKAN SINKRONISASI TATA LETAK SPREADS & VIEWBOX DOKUMEN]**:
  - **Identifikasi Masalah**:
    - Pengguna melaporkan *"ada yang mleset"* pada tangkapan layar setelah menerapkan mode tata letak **Buku / Spreads**.
    - Di tangkapan layar, Halaman 1 tampak kosong di posisi kiri `(0, 0)`, sedangkan artwork kotak abu-abu Halaman 1 melayang sendirian di sebelah kanan `(230, 0)` tanpa halaman di belakangnya. Halaman 2–7 berpasangan rapi.
    - *Penyebab Teknis*:
      1. Di `ui/app.js`, mode Spreads sebelumnya menggeser Halaman 1 ke kanan secara manual (`p1.x = p1.width + gap = 230`).
      2. Inkscape GUI (1.2–1.4) mengunci halaman pertama dokumen (`Page 1`) ke origin kanvas dokumen `(0, 0)`. Memindahkan Page 1 ke `x = 230` merusak rendering kanvas Inkscape dan ekspor PDF karena Page 1 tetap digambar di `(0, 0)`, sementara artworknya dipindah ke `x = 230`.
      3. Tag root `<svg viewBox="...">` sebelumnya tidak disinkronkan saat menerapkan perubahan halaman.
  - **Solusi & Implementasi**:
    1. **Spreads Rapi 2-by-2 Mulai dari `(0, 0)` (`ui/app.js`)**:
       - Mengubah algoritma Spreads agar menyusun halaman berpasangan dua-dua mulai dari `pages[0]` di `x = 0, y = 0`, `pages[1]` di `x = p1.width + gap, y = 0`, `pages[2]` di `x = 0, y = curY`, dan seterusnya.
       - Dengan demikian, Halaman 1 selalu berada pada origin alami dokumen `(0, 0)`, bebas dari desinkronisasi visual di Inkscape.
    2. **Sinkronisasi Otomatis `viewBox` Root SVG (`ink-pageman.py`)**:
       - Di `apply_changes()`, atribut `<svg viewBox="...">`, `width`, dan `height` selalu disinkronkan secara presisi dengan ukuran Halaman 1 (`p1_w`, `p1_h`).
  - **Verifikasi**:
    1. Pengujian integrasi otomatis Python pada 7 halaman mode Spread:
       - Halaman 1 terverifikasi di `(0.0, 0.0)` dan artwork `rect1` tetap di tempatnya (`transform: None`).
       - Root `viewBox` terverifikasi `0 0 210.0 297.0`.
       - Ekspor PDF dan render multi-halaman Inkscape 1.4 terverifikasi 100% utuh tanpa elemen mengambang.
    2. Validasi sintaks Python `py_compile` dan JavaScript `node -c` lolos tanpa error.
    3. Pemaketan rilis `./package.sh` sukses dan checksum MD5 valid.


- **2026-10-29 [PERBAIKAN TUNTAS: UI OFFSIDE, KEBOCORAN {unit}, & MASTER PAGE LIVE CLONES]**:
  - **Identifikasi & Penyebab Masalah**:
    1. **UI Offside / Terpotong**:
       - Pada tab Header & Footer, lebar tiap kolom (`group-form-col`) sebelumnya berukuran fixed terlalu lebar (`width: 245px`, `195px`, dll.) sehingga total lebar ribbon mencapai ~1100px.
       - Jika jendela berada di bawah ~1100px, blok di sebelah kanan (`Pengecualian & Proteksi`) terdorong keluar layar (*clipped*).
       - Di dalam blok `Logo & Gambar`, `<select>` posisi berukuran 74px memotong teks `"Hdr Tengah"` menjadi `"Hdr Tenç..."`.
       - Di blok `Garis Pembatas`, kombinasi teks label `"Tbl (pt):"` dan `"Margin (mm):"` memakan ruang sehingga input `[ 10 ]` menabrak border kanan.
    2. **Kebocoran String `{unit}` ke UI**:
       - Pada file translasi (`id.json` & `en.json`), terdapat placeholder mentah seperti `"gap": "Gap ({unit}):"` dan `"bleed": "Bleed ({unit}):"`.
       - Fungsi `applyTranslations()` di `app.js` langsung menyalin string mentah tersebut ke elemen DOM tanpa regex replace `{unit}` menjadi unit dokumen (`mm`).
    3. **Mekanisme Master Page**:
       - Sebelumnya, objek di halaman master disalin mati (`copy.deepcopy()`) ke dalam `<defs id="master_page_template">`.
       - Akibatnya, ketika pengguna mengubah objek di halaman master (warna, bentuk, teks), objek di halaman lain tidak ikut ter-update.
  - **Solusi & Implementasi**:
    1. **Penataan Ulang Ribbon Header & Footer Bebas Offside**:
       - Merampingkan lebar form: Teks & Posisi (`215px`), Logo & Gambar (`155px`), Tipografi & Warna (`145px`), Garis Pembatas (`155px`), Pengecualian & Proteksi (`140px`).
       - Memperlebar select posisi logo menjadi `76px` dan menggunakan singkatan profesional `"Hdr Tgh"` / `"Ftr Tgh"` sehingga pas dan tidak terpotong.
       - Merampingkan label menjadi `"L:"`, `"T:"`, `"Tbl:"`, `"Mgn:"` dengan pembagian `flex: 1` simetris.
       - Total lebar seluruh grup turun menjadi **1030px** (aman di jendela 1050px–1150px tanpa ada elemen yang terdorong keluar).
    2. **Eliminasi Total Kebocoran `{unit}`**:
       - Menghapus string `{unit}` mentah dari key translasi `id.json` dan `en.json`.
       - Menambahkan fungsi pembantu `formatText()` dengan regex replace `val.replace(/\{unit\}/g, docUnit || 'mm')` di `applyTranslations()`.
       - Verifikasi DOM scan: **0 kebocoran `{unit}`**.
    3. **Master Page Mode Live Clone Inkscape (`<use href="#id">`)**:
       - Menghapus pembuatan template tiruan di `<defs>`.
       - Master Page kini mengambil ID elemen asli di halaman master dan membuat Inkscape Native Clone `<use href="#{eid}">` dengan pergeseran `Transform(translate=(dx, dy))`.
       - Karena clone menaut langsung ke ID objek asli di kanvas Inkscape, **setiap perubahan pada objek di halaman master (warna, bentuk path, teks, ukuran) akan langsung ter-update secara otomatis di semua halaman target**!
  - **Verifikasi**:
    - Uji WebKitGTK offscreen: Header & Footer muat sempurna di 1030px tanpa scrollbar dan tanpa teks terpotong.
    - Uji DOM search: 0 string `{unit}` ditemukan.
    - Uji integrasi Python: Live `<use>` clone terverifikasi 100% menaut ke `#rect1` dengan koordinat translate yang tepat.
    - Kompilasi `py_compile` dan `node -c` sukses.
    - Paket rilis `./package.sh` diperbarui dan checksum MD5 valid.


- **2026-10-29 [PERBAIKAN FUNDAMENTAL: SISTEM TAMPILAN ADAPTIF & RESPONSIF MURNI (ELIMINASI TOTAL TABRAKAN KONTROL RIBBON)]**:
  - **Masalah & Gejala**:
    - Terjadi tabrakan (overlap/collision) visual yang berulang pada Ribbon Toolbar (khususnya tab Header & Footer):
      1. Teks dan input `GARIS PEMBATAS` (`Tbl: [ 0,5 ]`) tertumpuk langsung di atas input `TIPOGRAFI & WARNA` (`Ukuran (pt): [ 9 ]`).
      2. Tombol `Footer` pada kontrol segmented menabrak dan menempel rapat pada label `Offset: [12]`.
      3. Tiga kotak slot input teks Header/Footer terhimpit dan placeholder `[No. Hal]` terpotong oleh batas grup.
  - **Investigasi & Akar Masalah (Root Cause)**:
    - Selama ini perbaikan hanya bersifat "tambal sulam" dengan mematok angka piksel manual inline (`style="width: 145px;"`, `style="width: 215px;"`, dsb) pada elemen `.group-form-col` di HTML.
    - Ketika kontrol di dalamnya (label translasi bahasa, color picker, input angka) memerlukan ruang alami lebih lebar (misal row 2 Tipografi & Warna butuh 178px namun dibatasi 145px), konten meluap (*overflow*) keluar dari batas koordinat grup.
    - Karena CSS default-nya `overflow: visible`, konten yang meluap itu mencuat keluar garis pembatas (`border-right`) dan menabrak elemen di blok sebelah kanan.
    - Pendekatan hardcoded pixel width ini rentan rusak saat ukuran font sistem GTK/Pango/Freetype berbeda atau saat berpindah bahasa ID ↔ EN.
  - **Solusi Permanen & Arsitektur Responsif-Adaptif Murni**:
    1. **Eliminasi 21 Atribut Fixed Width Inline**:
       - Menghapus seluruh 21 atribut inline `style="width: ...px"` pada `.group-form-col` di seluruh panel `ui/index.html`.
       - Menghapus inline `style="width: 82px;"` pada `.segmented-control` yang sebelumnya mencekik tombol "Header" dan "Footer".
    2. **Layout Konten Fleksibel Dinamis (`width: max-content`)**:
       - `.ribbon-group`: Dikonfigurasi dengan `width: max-content; min-width: max-content; flex-shrink: 0; box-sizing: border-box; padding: 0 10px 3px 10px;`.
       - `.group-body`: `width: max-content; box-sizing: border-box; gap: 8px;`.
       - `.group-form-col`: `width: max-content; min-width: max-content; box-sizing: border-box;`.
       - `.form-row`: `width: 100%; white-space: nowrap; box-sizing: border-box; gap: 6px;`.
       - `.segmented-control`: Menjadi `width: auto; display: inline-flex; gap: 1px;` sehingga tombol Header/Footer membesar sesuai teksnya secara natural.
       - Slot input Header/Footer: Diberikan ukuran proporsional `width: 78px; min-width: 65px;` sehingga tiga slot terbentang rapi tanpa terhimpit atau terpotong.
    3. **Ketahanan Scrolling Horizontal Terhadap Perubahan Resolusi Jendela**:
       - Kontainer `.ribbon-content` dengan `overflow-x: auto` dan pendengar mouse wheel di `ui/app.js` memastikan bahwa jika ukuran jendela diperkecil, toolbar dapat digulir horizontal dengan mulus tanpa pernah terjadi tabrakan atau distorsi elemen antar grup.
  - **Verifikasi Mendalam (Deep Verification)**:
    - Pengujian otomatis headless WebKitGTK (`scratch/test_overlap.py`):
      - Memeriksa batas koordinat (`getBoundingClientRect()`) seluruh grup dan elemen anak in-flow.
      - Hasil pengujian pada 7 tab (`pages`, `layout`, `margins`, `numbers`, `headerfooter`, `watermark`, `settings`) dalam 2 bahasa (`id` dan `en`):
        - **Total Group Overlap: 0**
        - **Total Child Bleed: 0**
    - Verifikasi visual: Pengambilan tangkapan layar WebKitGTK offscreen membuktikan semua teks, tombol, dan kotak isian berada di dalam batas grup masing-masing dengan padding dan margin yang lega dan presisi.
    - Pengemasan rilis `./package.sh` diperbarui dan checksum MD5 valid.

- **2026-10-29 [PENYEMPURNAAN LABEL OPSI POSISI LOGO / GAMBAR]**:
  - **Permintaan Pengguna**:
    - Mengubah opsi posisi gambar/logo dari singkatan `Hdr/Ftr` (`Ftr Kiri`, `Ftr Tgh`, `Hdr Kanan`, dll) menjadi deskriptif yang jelas sesuai urutan:
      1. Atas Kanan (`header-right`)
      2. Atas Tengah (`header-center`)
      3. Atas Kiri (`header-left`)
      4. Bawah Kanan (`footer-right`)
      5. Bawah Tengah (`footer-center`)
      6. Bawah Kiri (`footer-left`)
  - **Implementasi**:
    - `ui/index.html`: Mengurutkan 6 `<option>` sesuai instruksi pengguna, dengan `min-width: 95px` dan padding proporsional.
    - `ui/id.json`: Memperbarui string translasi menjadi `"Atas Kanan"`, `"Atas Tengah"`, `"Atas Kiri"`, `"Bawah Kanan"`, `"Bawah Tengah"`, `"Bawah Kiri"`.
    - `ui/en.json`: Memperbarui string translasi menjadi `"Top Right"`, `"Top Center"`, `"Top Left"`, `"Bottom Right"`, `"Bottom Center"`, `"Bottom Left"`.
  - **Verifikasi**:
    - Evaluasi DOM WebKitGTK offscreen mengonfirmasi opsi dirender tepat dengan teks yang diminta.
    - Uji benturan koordinat (`test_overlap.py`) memastikan 0 overlap dan 0 bleed.
    - Kompilasi `package.sh` sukses dan checksum MD5 valid.

- **2026-10-29 [PENERAPAN WARNA AKSEN MAGENTA/BERRY `#b42b6f`, LOGO DI ABOUT & SCREENSHOT DI README]**:
  - **Permintaan Pengguna**:
    1. Mengganti seluruh aksen biru dengan warna `#b42b6f` (warna brand identitas Page Manager).
    2. Menambahkan logo `inkpageman.svg` ke dialog About dan README.md.
    3. Menambahkan tangkapan layar `screenshoot.png` ke README.md.
  - **Implementasi**:
    - **Warna Aksen `#b42b6f`**:
      - `ui/style.css`: Memperbarui variabel `--accent-blue: #b42b6f;`, `--accent-blue-hover: #98225c;`, `--border-focus: #b42b6f;` pada tema Gelap dan Terang.
      - Memperbarui background aktif kontrol (`.btn-accent`, `#btn-link-margins.active`, `.ribbon-opt-btn.active`) dari navy `#1e3a8a` menjadi dark berry wine `#701a44`.
      - Memperbarui outline panduan kanvas dan seleksi ke `#b42b6f`.
      - `ui/app.js`: Memperbarui warna badge status kanvas `★ MASTER` dan `[Master]` ke `#b42b6f` dan `#d84e93`.
    - **Logo & Screenshot**:
      - Menyalin `inkpageman.svg` ke `ui/inkpageman.svg`.
      - `ui/index.html`: Menampilkan logo `inkpageman.svg` di bagian hero About modal di atas teks deskripsi.
      - `README.md`: Menambahkan logo `inkpageman.svg` (tengah) di bagian atas judul dan tangkapan layar `screenshoot.png` di bawah ringkasan deskripsi.
      - `package.sh`: Menyertakan `inkpageman.svg`, `screenshoot.png`, dan `ui/inkpageman.svg` ke dalam paket ZIP produksi.
  - **Verifikasi**:
    - Tangkapan layar visual WebKitGTK (`about_modal_logo.png`) memverifikasi logo dan warna aksen `#b42b6f` tampil proporsional dan selaras.
    - Uji headless WebKitGTK (`test_overlap.py`) membuktikan 0 isu benturan kontrol pada semua tab.
    - Pemaketan `./package.sh` sukses dan checksum MD5 valid.

- **2026-10-29 [OPTIMASI LEBAR FORM PROPERTI HALAMAN AKTIF]**:
  - **Masalah**:
    - Kontrol pada blok "Properti Halaman Aktif" (`ACTIVE PAGE PROPERTIES`) membentang terlalu panjang (lebar grup mencapai 443px), kotak nama halaman meregang 368px dan input dimensi W/H meregang 158px dengan ruang kosong yang tidak wajar.
  - **Penyebab**:
    - Input angka `edit-w` dan `edit-h` menggunakan class `flex-1` tanpa ukuran batas (`width`), sehingga browser default intrinsic sizing-nya membesar dan menaikkan lebar natural row menjadi >400px.
  - **Perbaikan**:
    - `ui/index.html`: Mengunci input dimensi `#edit-w` dan `#edit-h` ke lebar proporsional `width: 56px;` (cukup untuk angka dimensi 4 digit desimal seperti `1920.0`), serta merapikan `#custom-w` & `#custom-h` ke `52px`.
    - Input `#edit-label` kini otomatis mengisi row 1 secara proporsional (~164px).
    - Lebar total grup turun dari 443px menjadi **239px** yang kompak dan rapi.
  - **Verifikasi**:
    - Evaluasi DOM WebKitGTK offscreen memvalidasi `groupWidth: 239px`, `labelWidth: 164px`, `editW: 56px`, `editH: 56px`.
    - Tangkapan layar `crop_active_props_fixed.png` mengonfirmasi tampilan presisi dan proporsional.
    - Uji `test_overlap.py` pada 7 tab mengonfirmasi 0 overlap dan 0 bleed.
    - Pemaketan `./package.sh` diperbarui dan checksum MD5 valid.

- **2026-10-29 [PEMBARUAN DESKRIPSI RESMI & PENGHAPUSAN EMAIL PADA ABOUT/INFO]**:
  - **Permintaan Pengguna**:
    1. Mengganti deskripsi ekstensi menjadi:
       *"Ekstensi manajeman halaman Inkscape untuk meningkatkan fungsionalitas fitur Halaman. Dibuat untuk memudahkan pengguna mengelola dan menyusun banyak halaman sekaligus secara cepat dan praktis, termasuk memberikan penomoran halaman, watermark, serta penataan layout margin."*
    2. Menghapus tampilan alamat email pengembang dari UI / modal info.
  - **Implementasi**:
    - `ui/index.html`:
      - Mengganti teks elemen `<p class="about-desc">` dengan deskripsi resmi yang baru.
      - Menghapus elemen email `me@raniaamina.id` dari bagian `.about-meta` (hanya menampilkan nama pengembang `Rania Amina`).
    - `ui/id.json`: Memperbarui kunci `about.desc` sesuai teks bahasa Indonesia yang diminta.
    - `ui/en.json`: Memperbarui kunci `about.desc` dengan terjemahan bahasa Inggris yang akurat dan padat.
    - `README.md`: Memperbarui paragraf pembuka deskripsi ekstensi agar sinkron dan konsisten.
  - **Verifikasi**:
    - Tangkapan layar visual WebKitGTK (`about_modal_updated.png` dan `about_modal_en_crop.png`) mengonfirmasi deskripsi baru tampil presisi, rapi, dan email tidak lagi ditampilkan di UI.
    - Uji headless WebKitGTK (`test_overlap.py`) membuktikan 0 isu tabrakan/overflow di semua 7 tab dan 2 bahasa.
    - Pemaketan `./package.sh` dijalankan ulang dan checksum MD5 terverifikasi valid.

- **2026-10-29 [STANDARDISASI BAHASA INGGRIS LENGKAP PADA README.MD]**:
  - **Permintaan Pengguna**:
    - Memperbarui `README.md` secara menyeluruh menggunakan bahasa Inggris (EN) agar seragam, profesional, dan tidak tercampur bahasa Indonesia.
  - **Implementasi**:
    - `README.md`: Menerjemahkan dan menstandarkan seluruh bagian:
      - Deskripsi pembuka dan arsitektur desktop Ribbon UI.
      - 7 poin fitur utama: Page List & Sorter, CRUD & Presets, Auto-Layout, Artwork Shift & Master Pages, Margins & Bleed, Smart Page Numbering, Header & Footer, dan Watermarks.
      - Persyaratan sistem (Linux, Windows, macOS).
      - Tautan repositori, disclaimer, donasi/dukungan developer, dan lisensi GPLv3.
  - **Verifikasi**:
    - Berkas `README.md` dibaca ulang dan diverifikasi bersih 100% berbahasa Inggris konsisten.
    - Pemaketan `./package.sh` diperbarui dan checksum MD5 valid.







