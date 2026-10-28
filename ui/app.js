/**
 * Page Manager - Frontend Application Logic
 * Clean, efficient, responsive, real-time WYSIWYG
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let pages = [];
    let selectedPageIds = new Set();
    let activePageId = null;
    let docUnit = 'mm';
    let docWidth = 210;
    let docHeight = 297;

    // Viewport & Pan/Zoom
    let zoom = 1.0;
    let panX = 40;
    let panY = 40;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;

    // Presets Table in document units (default mm)
    const PRESETS = {
        'A4': { w: 210, h: 297 },
        'A3': { w: 297, h: 420 },
        'A5': { w: 148, h: 210 },
        'A6': { w: 105, h: 148 },
        'B4': { w: 250, h: 353 },
        'B5': { w: 176, h: 250 },
        'Letter': { w: 215.9, h: 279.4 },
        'Legal': { w: 215.9, h: 355.6 },
        'Tabloid': { w: 279.4, h: 431.8 },
        'IG_Post': { w: 285.75, h: 285.75 },    // 1080px in mm at 96dpi
        'IG_Story': { w: 285.75, h: 508 },     // 1080x1920 in mm
        'FHD': { w: 508, h: 285.75 }           // 1920x1080 in mm
    };

    // DOM Elements
    const sorterList = document.getElementById('sorter-list');
    const sorterCountBadge = document.getElementById('sorter-count-badge');
    const canvasViewport = document.getElementById('canvas-viewport');
    const canvasSvg = document.getElementById('canvas-svg');
    const zoomBadge = document.getElementById('zoom-badge');
    const statusIndicator = document.getElementById('status-indicator');
    const statusMsg = document.getElementById('status-msg');
    const statusMeta = document.getElementById('status-meta');

    // Ribbon Tabs
    const ribbonTabs = document.querySelectorAll('.ribbon-tab');
    const ribbonPanels = document.querySelectorAll('.ribbon-panel');

    // Page Actions
    const btnAddPage = document.getElementById('btn-add-page');
    const pagePresetSelect = document.getElementById('page-preset');
    const optgroupCustomPresets = document.getElementById('optgroup-custom-presets');
    const rowStandardPreset = document.getElementById('row-standard-preset');
    const rowCustomPreset = document.getElementById('row-custom-preset');
    const customWInput = document.getElementById('custom-w');
    const customHInput = document.getElementById('custom-h');
    const customUnitLabel = document.getElementById('custom-unit-label');
    const addCountCustomInput = document.getElementById('add-count-custom');
    const btnSaveTemplate = document.getElementById('btn-save-template');
    const btnDelTemplate = document.getElementById('btn-del-template');
    const pageOrientationSelect = document.getElementById('page-orientation');
    const addCountInput = document.getElementById('add-count');
    const btnDuplicate = document.getElementById('btn-duplicate-page');
    const btnDelete = document.getElementById('btn-delete-page');
    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnDeselectAll = document.getElementById('btn-deselect-all');
    const btnToggleOrient = document.getElementById('btn-toggle-orient');

    // User Custom Presets State (from config.json)
    let userCustomPresets = {};

    // Quick Edit Inputs
    const editLabelInput = document.getElementById('edit-label');
    const editWInput = document.getElementById('edit-w');
    const editHInput = document.getElementById('edit-h');

    // Layout Controls
    const layoutOptBtns = document.querySelectorAll('.ribbon-opt-btn[data-layout]');
    const layoutColsInput = document.getElementById('layout-cols');
    const layoutGapInput = document.getElementById('layout-gap');
    const layoutGapUnit = document.getElementById('layout-gap-unit');
    const btnAutoArrange = document.getElementById('btn-auto-arrange');
    let currentLayoutMode = 'grid';

    // Margins & Guides
    const marginEnabled = document.getElementById('margin-enabled');
    const mTopInput = document.getElementById('m-top');
    const mRightInput = document.getElementById('m-right');
    const mBottomInput = document.getElementById('m-bottom');
    const mLeftInput = document.getElementById('m-left');
    const mBleedInput = document.getElementById('m-bleed');
    const chkGuidesEnabled = document.getElementById('chk-guides-enabled');
    const btnLinkMargins = document.getElementById('btn-link-margins');
    let marginsLinked = false;

    // Page Numbers
    const pnEnabled = document.getElementById('pn-enabled');
    const pnStyle = document.getElementById('pn-style');
    const pnFormat = document.getElementById('pn-format');
    const pnCustomText = document.getElementById('pn-custom-text');
    const pnPosition = document.getElementById('pn-position');
    const pnFontFamily = document.getElementById('pn-font-family');
    const pnFontCustom = document.getElementById('pn-font-custom');
    const pnFontSize = document.getElementById('pn-font-size');
    const pnColor = document.getElementById('pn-color');
    const pnOffset = document.getElementById('pn-offset');
    const pnSkipFirst = document.getElementById('pn-skip-first');
    const pnLocked = document.getElementById('pn-locked');

    // Header & Footer
    const hfEnabled = document.getElementById('hf-enabled');
    const hLeft = document.getElementById('h-left');
    const hCenter = document.getElementById('h-center');
    const hRight = document.getElementById('h-right');
    const fLeft = document.getElementById('f-left');
    const fCenter = document.getElementById('f-center');
    const fRight = document.getElementById('f-right');
    const hfOffsetTop = document.getElementById('hf-offset-top');
    const hfOffsetBottom = document.getElementById('hf-offset-bottom');
    const hfMarginX = document.getElementById('hf-margin-x');
    const hfFontFamily = document.getElementById('hf-font-family');
    const hfFontCustom = document.getElementById('hf-font-custom');
    const hfFontSize = document.getElementById('hf-font-size');
    const hfColor = document.getElementById('hf-color');
    const hfDivider = document.getElementById('hf-divider');
    const hfDividerThick = document.getElementById('hf-divider-thickness');
    const hfDividerColor = document.getElementById('hf-divider-color');
    const hfSkipFirst = document.getElementById('hf-skip-first');
    const hfLocked = document.getElementById('hf-locked');
    const btnModalHeader = document.getElementById('btn-modal-header');
    const btnModalFooter = document.getElementById('btn-modal-footer');
    const btnPickHfImage = document.getElementById('btn-pick-hf-image');
    const hfImageFile = document.getElementById('hf-image-file');
    const btnClearHfImage = document.getElementById('btn-clear-hf-image');
    const hfImageBtnLabel = document.getElementById('hf-image-btn-label');
    const hfImagePos = document.getElementById('hf-image-pos');
    const hfImageW = document.getElementById('hf-image-w');
    const hfImageH = document.getElementById('hf-image-h');
    let hfImageData = '';

    // Watermark
    const wmEnabled = document.getElementById('wm-enabled');
    const wmMode = document.getElementById('wm-mode');
    const groupWmText = document.getElementById('group-wm-text');
    const groupWmImage = document.getElementById('group-wm-image');
    const wmText = document.getElementById('wm-text');
    const wmFontFamily = document.getElementById('wm-font-family');
    const wmFontCustom = document.getElementById('wm-font-custom');
    const wmFontSize = document.getElementById('wm-font-size');
    const wmColor = document.getElementById('wm-color');
    const wmRotation = document.getElementById('wm-rotation');
    const wmOpacity = document.getElementById('wm-opacity');
    const wmOpacityVal = document.getElementById('wm-opacity-val');
    const wmLocked = document.getElementById('wm-locked');
    const btnPickWmImage = document.getElementById('btn-pick-wm-image');
    const wmImageFile = document.getElementById('wm-image-file');
    const btnClearWmImage = document.getElementById('btn-clear-wm-image');
    const wmImageBtnLabel = document.getElementById('wm-image-btn-label');
    const wmImageWidth = document.getElementById('wm-image-width');
    let wmImageData = '';

    // Settings & About
    const prefLanguage = document.getElementById('pref-language');
    const prefTheme = document.getElementById('pref-theme');
    const prefBackend = document.getElementById('pref-backend');
    const btnShowAbout = document.getElementById('btn-show-about');
    const modalAbout = document.getElementById('modal-about');
    const btnCloseAboutModal = document.getElementById('btn-close-about-modal');
    const btnDismissAbout = document.getElementById('btn-dismiss-about');

    // Multiline Modal
    const modalMultiline = document.getElementById('modal-multiline');
    const modalMlTitle = document.getElementById('modal-ml-title');
    const btnCloseMlModal = document.getElementById('btn-close-ml-modal');
    const btnCancelMl = document.getElementById('btn-cancel-ml');
    const btnSaveMl = document.getElementById('btn-save-ml');
    const mlLeft = document.getElementById('ml-left');
    const mlCenter = document.getElementById('ml-center');
    const mlRight = document.getElementById('ml-right');
    let activeMlTarget = 'header';

    // Zoom Controls
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const btnFitAll = document.getElementById('btn-fit-all');

    // Apply & Close
    const btnApply = document.getElementById('btn-apply-inkscape');
    const btnClose = document.getElementById('btn-close-app');

    // =========================================================================
    // 1. RIBBON TAB SWITCHING
    // =========================================================================
    ribbonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            ribbonTabs.forEach(t => t.classList.remove('active'));
            ribbonPanels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPanel = document.getElementById(tab.dataset.tab);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // =========================================================================
    // 2. INITIALIZATION & DATA FETCHING
    // =========================================================================
    async function loadDocument() {
        try {
            await setLanguage(prefLanguage ? prefLanguage.value : 'id');
            statusMsg.textContent = currentLang === 'en' ? 'Loading Inkscape document...' : 'Memuat dokumen Inkscape...';
            statusIndicator.className = 'status-indicator busy';

            const res = await fetch('/api/document');
            if (!res.ok) throw new Error(currentLang === 'en' ? 'Failed to load document' : 'Gagal memuat dokumen');

            const data = await res.json();
            docUnit = data.unit || 'mm';
            docWidth = data.doc_width || 210;
            docHeight = data.doc_height || 297;
            pages = data.pages || [];

            if (layoutGapUnit) layoutGapUnit.textContent = docUnit;
            if (customUnitLabel) customUnitLabel.textContent = docUnit;

            // Clean up any historical chained "(Copy) (Copy)" if present
            pages.forEach((p, idx) => {
                if (/\(Copy\)/i.test(p.label)) {
                    const cleanBase = p.label.replace(/(\s*\((?:Copy|\d+)\))+$/gi, '').trim();
                    p.label = cleanBase ? cleanBase : `Page ${idx + 1}`;
                }
            });

            // Select first page by default
            if (pages.length > 0) {
                selectedPageIds.add(pages[0].id);
                activePageId = pages[0].id;
                populateQuickEdit(pages[0]);
            }

            renderAll();
            fitAllPages();

            statusIndicator.className = 'status-indicator';
            statusMsg.textContent = currentLang === 'en' ? 'Ready' : 'Siap';
            updateStatusBarMeta();
        } catch (err) {
            statusIndicator.className = 'status-indicator busy';
            statusMsg.textContent = `Error: ${err.message}`;
        }
    }

    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) return;
            const data = await res.json();
            userCustomPresets = data.custom_presets || {};
            renderCustomPresetsOptions();
            restoreSettingsFromConfig(data);
        } catch (e) {
            console.error('Failed to load config:', e);
        }
    }

    function renderCustomPresetsOptions() {
        if (!optgroupCustomPresets) return;
        optgroupCustomPresets.innerHTML = '';
        const names = Object.keys(userCustomPresets);
        if (names.length === 0) {
            optgroupCustomPresets.style.display = 'none';
        } else {
            optgroupCustomPresets.style.display = '';
            names.forEach(name => {
                const item = userCustomPresets[name];
                const opt = document.createElement('option');
                opt.value = `user_${name}`;
                opt.textContent = `${name} (${item.w} × ${item.h} ${item.unit || 'mm'})`;
                optgroupCustomPresets.appendChild(opt);
            });
        }
    }

    // =========================================================================
    // PERSISTENCE (AUTO-SAVE & RESTORE STATE TO CONFIG.JSON)
    // =========================================================================
    let saveTimeout = null;
    function saveSettingsDebounced() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveSettingsToConfig, 400);
    }

    async function saveSettingsToConfig() {
        try {
            const state = {
                margins: {
                    enabled: marginEnabled ? marginEnabled.checked : false,
                    top: mTopInput ? mTopInput.value : 10,
                    right: mRightInput ? mRightInput.value : 10,
                    bottom: mBottomInput ? mBottomInput.value : 10,
                    left: mLeftInput ? mLeftInput.value : 10,
                    bleed: mBleedInput ? mBleedInput.value : 0,
                    guides: chkGuidesEnabled ? chkGuidesEnabled.checked : false
                },
                page_numbers: {
                    enabled: pnEnabled ? pnEnabled.checked : false,
                    style: pnStyle ? pnStyle.value : 'arabic',
                    format: pnFormat ? pnFormat.value : '{n}',
                    custom_text: pnCustomText ? pnCustomText.value : '',
                    position: pnPosition ? pnPosition.value : 'bottom-center',
                    font_family: pnFontFamily ? pnFontFamily.value : 'sans-serif',
                    font_custom: pnFontCustom ? pnFontCustom.value : '',
                    font_size: pnFontSize ? pnFontSize.value : 10,
                    color: pnColor ? pnColor.value : '#333333',
                    offset: pnOffset ? pnOffset.value : 10,
                    skip_first: pnSkipFirst ? pnSkipFirst.checked : false,
                    locked: pnLocked ? pnLocked.checked : true
                },
                header_footer: {
                    enabled: hfEnabled ? hfEnabled.checked : false,
                    h_left: hLeft ? hLeft.value : '',
                    h_center: hCenter ? hCenter.value : '',
                    h_right: hRight ? hRight.value : '',
                    f_left: fLeft ? fLeft.value : '',
                    f_center: fCenter ? fCenter.value : '',
                    f_right: fRight ? fRight.value : '',
                    offset_top: hfOffsetTop ? hfOffsetTop.value : 12,
                    offset_bottom: hfOffsetBottom ? hfOffsetBottom.value : 12,
                    margin_x: hfMarginX ? hfMarginX.value : 10,
                    font_family: hfFontFamily ? hfFontFamily.value : 'sans-serif',
                    font_custom: hfFontCustom ? hfFontCustom.value : '',
                    font_size: hfFontSize ? hfFontSize.value : 9,
                    color: hfColor ? hfColor.value : '#555555',
                    divider: hfDivider ? hfDivider.checked : false,
                    divider_thickness: hfDividerThick ? hfDividerThick.value : 0.5,
                    divider_color: hfDividerColor ? hfDividerColor.value : '#cccccc',
                    skip_first: hfSkipFirst ? hfSkipFirst.checked : false,
                    locked: hfLocked ? hfLocked.checked : true,
                    image_data: hfImageData || '',
                    image_pos: hfImagePos ? hfImagePos.value : 'footer-left',
                    image_width: hfImageW ? hfImageW.value : 25,
                    image_height: hfImageH ? hfImageH.value : 10
                },
                watermark: {
                    enabled: wmEnabled ? wmEnabled.checked : false,
                    mode: wmMode ? wmMode.value : 'text',
                    text: wmText ? wmText.value : 'DRAFT',
                    font_family: wmFontFamily ? wmFontFamily.value : 'sans-serif',
                    font_custom: wmFontCustom ? wmFontCustom.value : '',
                    font_size: wmFontSize ? wmFontSize.value : 48,
                    color: wmColor ? wmColor.value : '#888888',
                    rotation: wmRotation ? wmRotation.value : -45,
                    opacity: wmOpacity ? wmOpacity.value : 0.15,
                    locked: wmLocked ? wmLocked.checked : true,
                    image_data: wmImageData || '',
                    image_width: wmImageWidth ? wmImageWidth.value : 80
                },
                layout: {
                    mode: currentLayoutMode,
                    cols: layoutColsInput ? layoutColsInput.value : 3,
                    gap: layoutGapInput ? layoutGapInput.value : 20
                },
                app_prefs: {
                    language: prefLanguage ? prefLanguage.value : 'id',
                    theme: prefTheme ? prefTheme.value : 'dark',
                    ui_backend: prefBackend ? prefBackend.value : 'gtk'
                }
            };

            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    last_settings: state,
                    ui_backend: state.app_prefs.ui_backend
                })
            });
        } catch (e) {
            console.error('Failed to save settings to config:', e);
        }
    }

    function restoreSettingsFromConfig(cfg) {
        if (!cfg) return;
        const s = cfg.last_settings;
        if (!s) return;

        // Margins
        if (s.margins) {
            if (marginEnabled && s.margins.enabled !== undefined) marginEnabled.checked = s.margins.enabled;
            if (mTopInput && s.margins.top) mTopInput.value = s.margins.top;
            if (mRightInput && s.margins.right) mRightInput.value = s.margins.right;
            if (mBottomInput && s.margins.bottom) mBottomInput.value = s.margins.bottom;
            if (mLeftInput && s.margins.left) mLeftInput.value = s.margins.left;
            if (mBleedInput && s.margins.bleed) mBleedInput.value = s.margins.bleed;
            if (chkGuidesEnabled && s.margins.guides !== undefined) chkGuidesEnabled.checked = s.margins.guides;
        }

        // Page Numbers
        if (s.page_numbers) {
            if (pnEnabled && s.page_numbers.enabled !== undefined) pnEnabled.checked = s.page_numbers.enabled;
            if (pnStyle && s.page_numbers.style) pnStyle.value = s.page_numbers.style;
            if (pnFormat && s.page_numbers.format) pnFormat.value = s.page_numbers.format;
            if (pnCustomText && s.page_numbers.custom_text !== undefined) pnCustomText.value = s.page_numbers.custom_text;
            if (pnPosition && s.page_numbers.position) pnPosition.value = s.page_numbers.position;
            if (pnFontFamily && s.page_numbers.font_family) {
                pnFontFamily.value = s.page_numbers.font_family;
                if (pnFontCustom) {
                    pnFontCustom.value = s.page_numbers.font_custom || '';
                    pnFontCustom.style.display = pnFontFamily.value === 'custom' ? 'inline-block' : 'none';
                }
            }
            if (pnFontSize && s.page_numbers.font_size) pnFontSize.value = s.page_numbers.font_size;
            if (pnColor && s.page_numbers.color) pnColor.value = s.page_numbers.color;
            if (pnOffset && s.page_numbers.offset) pnOffset.value = s.page_numbers.offset;
            if (pnSkipFirst && s.page_numbers.skip_first !== undefined) pnSkipFirst.checked = s.page_numbers.skip_first;
            if (pnLocked && s.page_numbers.locked !== undefined) pnLocked.checked = s.page_numbers.locked;
        }

        // Header & Footer
        if (s.header_footer) {
            if (hfEnabled && s.header_footer.enabled !== undefined) hfEnabled.checked = s.header_footer.enabled;
            if (hLeft && s.header_footer.h_left !== undefined) hLeft.value = s.header_footer.h_left;
            if (hCenter && s.header_footer.h_center !== undefined) hCenter.value = s.header_footer.h_center;
            if (hRight && s.header_footer.h_right !== undefined) hRight.value = s.header_footer.h_right;
            if (fLeft && s.header_footer.f_left !== undefined) fLeft.value = s.header_footer.f_left;
            if (fCenter && s.header_footer.f_center !== undefined) fCenter.value = s.header_footer.f_center;
            if (fRight && s.header_footer.f_right !== undefined) fRight.value = s.header_footer.f_right;
            if (hfOffsetTop && s.header_footer.offset_top) hfOffsetTop.value = s.header_footer.offset_top;
            if (hfOffsetBottom && s.header_footer.offset_bottom) hfOffsetBottom.value = s.header_footer.offset_bottom;
            if (hfMarginX && s.header_footer.margin_x) hfMarginX.value = s.header_footer.margin_x;
            if (hfFontFamily && s.header_footer.font_family) {
                hfFontFamily.value = s.header_footer.font_family;
                if (hfFontCustom) {
                    hfFontCustom.value = s.header_footer.font_custom || '';
                    hfFontCustom.style.display = hfFontFamily.value === 'custom' ? 'inline-block' : 'none';
                }
            }
            if (hfFontSize && s.header_footer.font_size) hfFontSize.value = s.header_footer.font_size;
            if (hfColor && s.header_footer.color) hfColor.value = s.header_footer.color;
            if (hfDivider && s.header_footer.divider !== undefined) hfDivider.checked = s.header_footer.divider;
            if (hfDividerThick && s.header_footer.divider_thickness) hfDividerThick.value = s.header_footer.divider_thickness;
            if (hfDividerColor && s.header_footer.divider_color) hfDividerColor.value = s.header_footer.divider_color;
            if (hfSkipFirst && s.header_footer.skip_first !== undefined) hfSkipFirst.checked = s.header_footer.skip_first;
            if (hfLocked && s.header_footer.locked !== undefined) hfLocked.checked = s.header_footer.locked;

            if (s.header_footer.image_data) {
                hfImageData = s.header_footer.image_data;
                if (hfImageBtnLabel) hfImageBtnLabel.textContent = 'Logo Terpasang';
                if (btnClearHfImage) btnClearHfImage.style.display = 'inline-flex';
            }
            if (hfImagePos && s.header_footer.image_pos) hfImagePos.value = s.header_footer.image_pos;
            if (hfImageW && s.header_footer.image_width) hfImageW.value = s.header_footer.image_width;
            if (hfImageH && s.header_footer.image_height) hfImageH.value = s.header_footer.image_height;
        }

        // Watermark
        if (s.watermark) {
            if (wmEnabled && s.watermark.enabled !== undefined) wmEnabled.checked = s.watermark.enabled;
            if (wmMode && s.watermark.mode) {
                wmMode.value = s.watermark.mode;
                wmMode.dispatchEvent(new Event('change'));
            }
            if (wmText && s.watermark.text) wmText.value = s.watermark.text;
            if (wmFontFamily && s.watermark.font_family) {
                wmFontFamily.value = s.watermark.font_family;
                if (wmFontCustom) {
                    wmFontCustom.value = s.watermark.font_custom || '';
                    wmFontCustom.style.display = wmFontFamily.value === 'custom' ? 'inline-block' : 'none';
                }
            }
            if (wmFontSize && s.watermark.font_size) wmFontSize.value = s.watermark.font_size;
            if (wmColor && s.watermark.color) wmColor.value = s.watermark.color;
            if (wmRotation && s.watermark.rotation) wmRotation.value = s.watermark.rotation;
            if (wmOpacity && s.watermark.opacity) {
                wmOpacity.value = s.watermark.opacity;
                if (wmOpacityVal) wmOpacityVal.textContent = `${Math.round(parseFloat(wmOpacity.value) * 100)}%`;
            }
            if (wmLocked && s.watermark.locked !== undefined) wmLocked.checked = s.watermark.locked;
            if (s.watermark.image_data) {
                wmImageData = s.watermark.image_data;
                if (wmImageBtnLabel) wmImageBtnLabel.textContent = 'Gambar Terpasang';
                if (btnClearWmImage) btnClearWmImage.style.display = 'inline-flex';
            }
            if (wmImageWidth && s.watermark.image_width) wmImageWidth.value = s.watermark.image_width;
        }

        // Preferences
        if (s.app_prefs) {
            if (prefLanguage && s.app_prefs.language) {
                prefLanguage.value = s.app_prefs.language;
                setLanguage(prefLanguage.value);
            }
            if (prefTheme && s.app_prefs.theme) {
                prefTheme.value = s.app_prefs.theme;
                setTheme(prefTheme.value);
            }
            if (prefBackend && s.app_prefs.ui_backend) {
                prefBackend.value = s.app_prefs.ui_backend;
            }
        }

        syncPageNumberSlotLock();
        renderCanvas();
    }

    // =========================================================================
    // PAGE NUMBER SLOT LOCKING (PROTECT HEADER/FOOTER COLLISION)
    // =========================================================================
    function syncPageNumberSlotLock() {
        const isPn = pnEnabled && pnEnabled.checked;
        const pos = pnPosition ? pnPosition.value : 'bottom-center';

        const slots = [
            { el: hLeft, key: 'top-left' },
            { el: hCenter, key: 'top-center' },
            { el: hRight, key: 'top-right' },
            { el: fLeft, key: 'bottom-left' },
            { el: fCenter, key: 'bottom-center' },
            { el: fRight, key: 'bottom-right' }
        ];

        slots.forEach(s => {
            if (!s.el) return;
            if (isPn && pos === s.key) {
                s.el.disabled = true;
                s.el.classList.add('slot-locked');
                s.el.placeholder = currentLang === 'en' ? '[Used by Page No.]' : '[Digunakan No. Hal]';
                s.el.title = currentLang === 'en' 
                    ? 'This slot is disabled because its position is used by Page Numbers' 
                    : 'Slot ini dinonaktifkan karena posisinya digunakan oleh Nomor Halaman';
            } else {
                s.el.disabled = false;
                s.el.classList.remove('slot-locked');
                if (s.key === 'bottom-center') {
                    s.el.placeholder = '{page}';
                } else if (s.key.startsWith('top')) {
                    s.el.placeholder = currentLang === 'en' 
                        ? (s.key === 'top-left' ? 'Left' : (s.key === 'top-center' ? 'Center' : 'Right'))
                        : (s.key === 'top-left' ? 'Kiri' : (s.key === 'top-center' ? 'Tengah' : 'Kanan'));
                } else {
                    s.el.placeholder = currentLang === 'en'
                        ? (s.key === 'bottom-left' ? 'Left' : 'Right')
                        : (s.key === 'bottom-left' ? 'Kiri' : 'Kanan');
                }
                s.el.title = '';
            }
        });
    }

    if (pnEnabled) pnEnabled.addEventListener('change', syncPageNumberSlotLock);
    if (pnPosition) pnPosition.addEventListener('change', syncPageNumberSlotLock);

    // =========================================================================
    // THEME & LANGUAGE PREFERENCES
    // =========================================================================
    function setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else if (theme === 'dark') {
            document.body.classList.remove('theme-light');
        } else if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) document.body.classList.remove('theme-light');
            else document.body.classList.add('theme-light');
        }
    }

    if (prefTheme) {
        prefTheme.addEventListener('change', () => {
            setTheme(prefTheme.value);
            saveSettingsDebounced();
        });
    }

    // Modular Localization Loader (id.json & en.json)
    let i18nData = {};
    let currentLang = 'id';

    function getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        const parts = path.split('.');
        let curr = obj;
        for (const p of parts) {
            if (curr && typeof curr === 'object' && p in curr) {
                curr = curr[p];
            } else {
                return undefined;
            }
        }
        return curr;
    }

    async function loadLocale(lang) {
        if (i18nData[lang]) return i18nData[lang];
        try {
            const res = await fetch(`./${lang}.json`);
            if (res.ok) {
                i18nData[lang] = await res.json();
                return i18nData[lang];
            }
        } catch (err) {
            console.warn(`Could not load locale ${lang}:`, err);
        }
        return null;
    }

    async function setLanguage(lang) {
        currentLang = lang || 'id';
        let dict = await loadLocale(currentLang);
        if (!dict) return;

        // 1. Tabs
        if (dict.tabs) {
            document.querySelectorAll('[data-tab]').forEach(tab => {
                const key = tab.dataset.tab;
                if (dict.tabs[key]) tab.textContent = dict.tabs[key];
            });
        }

        // 2. Elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const path = el.getAttribute('data-i18n');
            const val = getNestedValue(dict, path);
            if (val !== undefined) el.textContent = val;
        });

        // 3. Optgroup labels
        document.querySelectorAll('[data-i18n-label]').forEach(el => {
            const path = el.getAttribute('data-i18n-label');
            const val = getNestedValue(dict, path);
            if (val !== undefined) el.label = val;
        });

        // 4. Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const path = el.getAttribute('data-i18n-placeholder');
            const val = getNestedValue(dict, path);
            if (val !== undefined) el.placeholder = val;
        });

        // 5. Tooltips
        document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
            const path = el.getAttribute('data-i18n-tooltip');
            const val = getNestedValue(dict, path);
            if (val !== undefined) el.setAttribute('data-tooltip', val);
        });

        // 6. Titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const path = el.getAttribute('data-i18n-title');
            const val = getNestedValue(dict, path);
            if (val !== undefined) el.title = val;
        });

        // 7. Modals: Features & Shortcuts in About Modal
        if (dict.about && dict.about.features) {
            const featList = document.getElementById('about-features-list');
            if (featList && Array.isArray(dict.about.features)) {
                featList.innerHTML = dict.about.features.map(f => `<li>${f}</li>`).join('');
            }
        }
        if (dict.about && dict.about.shortcuts) {
            const scList = document.getElementById('about-shortcuts-list');
            if (scList && Array.isArray(dict.about.shortcuts)) {
                scList.innerHTML = dict.about.shortcuts.map(s => `<li>${s}</li>`).join('');
            }
        }

        // 8. Buttons & Dynamic labels
        if (btnApply && dict.buttons && dict.buttons.apply_close) {
            const labelSpan = document.getElementById('btn-apply-label');
            if (labelSpan) labelSpan.textContent = dict.buttons.apply_close;
            else btnApply.innerHTML = `<span class="btn-icon">✓</span> <span id="btn-apply-label">${dict.buttons.apply_close}</span>`;
        }
        if (btnClose && dict.buttons && dict.buttons.close) {
            btnClose.textContent = dict.buttons.close;
        }

        if (hfImageBtnLabel && dict.buttons) {
            if (hfImageData) {
                hfImageBtnLabel.textContent = dict.buttons.image_attached;
            } else {
                hfImageBtnLabel.textContent = dict.buttons.pick_logo;
            }
        }
        if (wmImageBtnLabel && dict.buttons) {
            if (wmImageData) {
                wmImageBtnLabel.textContent = dict.buttons.image_attached;
            } else {
                wmImageBtnLabel.textContent = dict.buttons.pick_image;
            }
        }

        syncPageNumberSlotLock();
        updateStatusBarMeta();
    }

    if (prefLanguage) {
        prefLanguage.addEventListener('change', () => {
            setLanguage(prefLanguage.value);
            saveSettingsDebounced();
        });
    }

    if (prefBackend) {
        prefBackend.addEventListener('change', () => {
            saveSettingsDebounced();
        });
    }

    // =========================================================================
    // MULTILINE HEADER / FOOTER MODAL
    // =========================================================================
    if (btnModalHeader) {
        btnModalHeader.addEventListener('click', () => {
            activeMlTarget = 'header';
            modalMlTitle.textContent = currentLang === 'en' ? 'Edit Header Text (Multiline)' : 'Sunting Teks Header (Multiline)';
            mlLeft.value = hLeft.value;
            mlCenter.value = hCenter.value;
            mlRight.value = hRight.value;
            modalMultiline.style.display = 'flex';
            mlCenter.focus();
        });
    }

    if (btnModalFooter) {
        btnModalFooter.addEventListener('click', () => {
            activeMlTarget = 'footer';
            modalMlTitle.textContent = currentLang === 'en' ? 'Edit Footer Text (Multiline)' : 'Sunting Teks Footer (Multiline)';
            mlLeft.value = fLeft.value;
            mlCenter.value = fCenter.value;
            mlRight.value = fRight.value;
            modalMultiline.style.display = 'flex';
            mlCenter.focus();
        });
    }

    const closeMlModal = () => { if (modalMultiline) modalMultiline.style.display = 'none'; };
    if (btnCloseMlModal) btnCloseMlModal.addEventListener('click', closeMlModal);
    if (btnCancelMl) btnCancelMl.addEventListener('click', closeMlModal);

    if (btnSaveMl) {
        btnSaveMl.addEventListener('click', () => {
            if (activeMlTarget === 'header') {
                hLeft.value = mlLeft.value;
                hCenter.value = mlCenter.value;
                hRight.value = mlRight.value;
            } else {
                fLeft.value = mlLeft.value;
                fCenter.value = mlCenter.value;
                fRight.value = mlRight.value;
            }
            closeMlModal();
            renderCanvas();
            saveSettingsDebounced();
        });
    }

    document.querySelectorAll('.btn-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            const activeElem = document.activeElement;
            const targetTa = (activeElem && activeElem.classList.contains('form-textarea')) ? activeElem : mlCenter;
            const start = targetTa.selectionStart || targetTa.value.length;
            const end = targetTa.selectionEnd || targetTa.value.length;
            targetTa.value = targetTa.value.substring(0, start) + tag + targetTa.value.substring(end);
            targetTa.selectionStart = targetTa.selectionEnd = start + tag.length;
            targetTa.focus();
        });
    });

    // =========================================================================
    // ABOUT MODAL
    // =========================================================================
    if (btnShowAbout) {
        btnShowAbout.addEventListener('click', () => {
            if (modalAbout) modalAbout.style.display = 'flex';
        });
    }
    const closeAboutModal = () => { if (modalAbout) modalAbout.style.display = 'none'; };
    if (btnCloseAboutModal) btnCloseAboutModal.addEventListener('click', closeAboutModal);
    if (btnDismissAbout) btnDismissAbout.addEventListener('click', closeAboutModal);

    // =========================================================================
    // IMAGE PICKERS (HEADER/FOOTER LOGO & WATERMARK IMAGE)
    // =========================================================================
    if (btnPickHfImage && hfImageFile) {
        btnPickHfImage.addEventListener('click', () => hfImageFile.click());
        hfImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                hfImageData = evt.target.result;
                if (hfImageBtnLabel) hfImageBtnLabel.textContent = file.name.length > 14 ? file.name.substring(0, 12) + '...' : file.name;
                if (btnClearHfImage) btnClearHfImage.style.display = 'inline-flex';
                // Auto-enable Header & Footer status toggle when image is selected
                if (hfEnabled && !hfEnabled.checked) {
                    hfEnabled.checked = true;
                }
                renderCanvas();
                saveSettingsDebounced();
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnClearHfImage) {
        btnClearHfImage.addEventListener('click', () => {
            hfImageData = '';
            if (hfImageFile) hfImageFile.value = '';
            const dict = i18nData[currentLang];
            if (hfImageBtnLabel) hfImageBtnLabel.textContent = dict && dict.buttons ? dict.buttons.pick_logo : (currentLang === 'en' ? 'Logo...' : 'Pilih Logo...');
            btnClearHfImage.style.display = 'none';
            renderCanvas();
            saveSettingsDebounced();
        });
    }

    if (wmMode) {
        wmMode.addEventListener('change', () => {
            const isImg = wmMode.value === 'image';
            if (groupWmText) groupWmText.style.display = isImg ? 'none' : '';
            if (groupWmImage) groupWmImage.style.display = isImg ? '' : 'none';
            const lblColor = document.getElementById('lbl-wm-color');
            const lblSize = document.getElementById('lbl-wm-size');
            const unitSize = document.getElementById('unit-wm-size');
            if (lblColor) lblColor.style.display = isImg ? 'none' : '';
            if (wmColor) wmColor.style.display = isImg ? 'none' : '';
            if (lblSize) lblSize.style.display = isImg ? 'none' : '';
            if (wmFontSize) wmFontSize.style.display = isImg ? 'none' : '';
            if (unitSize) unitSize.style.display = isImg ? 'none' : '';
            renderCanvas();
            saveSettingsDebounced();
        });
    }

    if (btnPickWmImage && wmImageFile) {
        btnPickWmImage.addEventListener('click', () => wmImageFile.click());
        wmImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                wmImageData = evt.target.result;
                if (wmImageBtnLabel) wmImageBtnLabel.textContent = file.name.length > 14 ? file.name.substring(0, 12) + '...' : file.name;
                if (btnClearWmImage) btnClearWmImage.style.display = 'inline-flex';
                // Auto-enable Watermark status toggle when image is selected
                if (wmEnabled && !wmEnabled.checked) {
                    wmEnabled.checked = true;
                }
                renderCanvas();
                saveSettingsDebounced();
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnClearWmImage) {
        btnClearWmImage.addEventListener('click', () => {
            wmImageData = '';
            if (wmImageFile) wmImageFile.value = '';
            const dict = i18nData[currentLang];
            if (wmImageBtnLabel) wmImageBtnLabel.textContent = dict && dict.buttons ? dict.buttons.pick_image : (currentLang === 'en' ? 'Pick Image...' : 'Pilih Gambar...');
            btnClearWmImage.style.display = 'none';
            renderCanvas();
            saveSettingsDebounced();
        });
    }

    // Font Helpers
    function getHfFontFamily() {
        if (!hfFontFamily) return 'sans-serif';
        if (hfFontFamily.value === 'custom') {
            return (hfFontCustom && hfFontCustom.value.trim()) ? hfFontCustom.value.trim() : 'sans-serif';
        }
        return hfFontFamily.value || 'sans-serif';
    }

    if (hfFontFamily) {
        hfFontFamily.addEventListener('change', () => {
            if (hfFontCustom) {
                hfFontCustom.style.display = hfFontFamily.value === 'custom' ? 'inline-block' : 'none';
            }
            renderCanvas();
        });
    }

    function getWmFontFamily() {
        if (!wmFontFamily) return 'sans-serif';
        if (wmFontFamily.value === 'custom') {
            return (wmFontCustom && wmFontCustom.value.trim()) ? wmFontCustom.value.trim() : 'sans-serif';
        }
        return wmFontFamily.value || 'sans-serif';
    }

    if (wmFontFamily) {
        wmFontFamily.addEventListener('change', () => {
            if (wmFontCustom) {
                wmFontCustom.style.display = wmFontFamily.value === 'custom' ? 'inline-block' : 'none';
            }
            renderCanvas();
        });
    }

    // Toggle Custom Size row vs Standard Preset row
    if (pagePresetSelect) {
        pagePresetSelect.addEventListener('change', () => {
            const val = pagePresetSelect.value;
            if (val === 'custom') {
                if (rowCustomPreset) rowCustomPreset.style.display = 'flex';
                if (rowStandardPreset) rowStandardPreset.style.display = 'none';
                if (btnDelTemplate) btnDelTemplate.style.display = 'none';
                // Prefill custom inputs from active page if available
                const activeP = pages.find(p => p.id === activePageId);
                if (activeP && customWInput && customHInput) {
                    customWInput.value = activeP.width.toFixed(1);
                    customHInput.value = activeP.height.toFixed(1);
                }
            } else if (val.startsWith('user_')) {
                if (rowCustomPreset) rowCustomPreset.style.display = 'none';
                if (rowStandardPreset) rowStandardPreset.style.display = 'flex';
                if (btnDelTemplate) btnDelTemplate.style.display = 'inline-flex';
            } else {
                if (rowCustomPreset) rowCustomPreset.style.display = 'none';
                if (rowStandardPreset) rowStandardPreset.style.display = 'flex';
                if (btnDelTemplate) btnDelTemplate.style.display = 'none';
            }
        });
    }

    // Save Template to config.json
    if (btnSaveTemplate) {
        btnSaveTemplate.addEventListener('click', async () => {
            let defW = 210, defH = 297;
            const val = pagePresetSelect.value;
            if (val === 'custom') {
                defW = parseFloat(customWInput.value) || 210;
                defH = parseFloat(customHInput.value) || 297;
            } else if (val.startsWith('user_')) {
                const curName = val.replace('user_', '');
                if (userCustomPresets[curName]) {
                    defW = userCustomPresets[curName].w;
                    defH = userCustomPresets[curName].h;
                }
            } else if (PRESETS[val]) {
                defW = PRESETS[val].w;
                defH = PRESETS[val].h;
            } else {
                const activeP = pages.find(p => p.id === activePageId);
                if (activeP) { defW = activeP.width; defH = activeP.height; }
            }

            const name = prompt(`Simpan ukuran ${defW} × ${defH} ${docUnit} sebagai nama template baru:`, '');
            if (!name || !name.trim()) return;
            const cleanName = name.trim();

            userCustomPresets[cleanName] = {
                w: defW,
                h: defH,
                unit: docUnit
            };

            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ custom_presets: userCustomPresets })
                });
                if (res.ok) {
                    renderCustomPresetsOptions();
                    pagePresetSelect.value = `user_${cleanName}`;
                    pagePresetSelect.dispatchEvent(new Event('change'));
                    statusMsg.textContent = currentLang === 'en'
                        ? `Template "${cleanName}" saved to config.json!`
                        : `Template "${cleanName}" tersimpan di config.json!`;
                    setTimeout(() => { statusMsg.textContent = currentLang === 'en' ? 'Ready' : 'Siap'; }, 2500);
                } else {
                    alert(currentLang === 'en' ? 'Failed to save template to config.json' : 'Gagal menyimpan template ke config.json');
                }
            } catch (err) {
                alert(currentLang === 'en' ? `Error saving config: ${err.message}` : `Error saat menyimpan config: ${err.message}`);
            }
        });
    }

    // Delete custom template from config.json
    if (btnDelTemplate) {
        btnDelTemplate.addEventListener('click', async () => {
            const val = pagePresetSelect.value;
            if (!val.startsWith('user_')) return;
            const name = val.replace('user_', '');
            const confirmMsg = currentLang === 'en'
                ? `Delete template "${name}" from config.json?`
                : `Hapus template "${name}" dari config.json?`;
            if (!confirm(confirmMsg)) return;

            delete userCustomPresets[name];
            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ custom_presets: userCustomPresets })
                });
                if (res.ok) {
                    renderCustomPresetsOptions();
                    pagePresetSelect.value = 'A4';
                    pagePresetSelect.dispatchEvent(new Event('change'));
                    statusMsg.textContent = currentLang === 'en'
                        ? `Template "${name}" removed`
                        : `Template "${name}" telah dihapus`;
                    setTimeout(() => { statusMsg.textContent = currentLang === 'en' ? 'Ready' : 'Siap'; }, 2000);
                }
            } catch (err) {
                alert(currentLang === 'en' ? `Error: ${err.message}` : `Error: ${err.message}`);
            }
        });
    }

    function updateStatusBarMeta() {
        const total = pages.length;
        let bounds = calculatePagesBoundingBox();
        let totalW = (bounds.maxX - bounds.minX).toFixed(1);
        let totalH = (bounds.maxY - bounds.minY).toFixed(1);
        const pagesText = currentLang === 'en' ? 'Pages' : 'Halaman';
        const canvasText = currentLang === 'en' ? 'Total Canvas' : 'Total Kanvas';
        statusMeta.textContent = `${total} ${pagesText} • Unit: ${docUnit} • ${canvasText}: ${totalW} × ${totalH} ${docUnit}`;
        sorterCountBadge.textContent = total;
    }

    function calculatePagesBoundingBox() {
        if (pages.length === 0) return { minX: 0, minY: 0, maxX: docWidth, maxY: docHeight };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pages.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x + p.width > maxX) maxX = p.x + p.width;
            if (p.y + p.height > maxY) maxY = p.y + p.height;
        });
        return { minX, minY, maxX, maxY };
    }

    // =========================================================================
    // 3. RENDERING (PAGE SORTER & LIVE CANVAS)
    // =========================================================================
    function renderAll() {
        renderSorter();
        renderCanvas();
        updateStatusBarMeta();
    }

    function renderSorter() {
        sorterList.innerHTML = '';

        pages.forEach((p, idx) => {
            const card = document.createElement('div');
            card.className = `page-card ${selectedPageIds.has(p.id) ? 'selected' : ''} ${activePageId === p.id ? 'active-focus' : ''}`;
            card.dataset.id = p.id;

            const isChecked = selectedPageIds.has(p.id);

            card.innerHTML = `
                <input type="checkbox" class="page-card-chk" ${isChecked ? 'checked' : ''} data-id="${p.id}">
                <span class="page-card-badge">#${idx + 1}</span>
                <div class="page-card-info">
                    <span class="page-card-title">${escapeHtml(p.label || `Page ${idx + 1}`)}</span>
                    <span class="page-card-meta">${p.width.toFixed(1)} × ${p.height.toFixed(1)} ${docUnit} • ${p.orientation}</span>
                </div>
            `;

            // Card click handler
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-card-chk')) return;

                if (e.ctrlKey || e.metaKey) {
                    if (selectedPageIds.has(p.id)) selectedPageIds.delete(p.id);
                    else selectedPageIds.add(p.id);
                } else if (!e.shiftKey) {
                    selectedPageIds.clear();
                    selectedPageIds.add(p.id);
                }

                activePageId = p.id;
                populateQuickEdit(p);
                renderAll();
                centerOnPage(p);
            });

            // Checkbox handler
            const chk = card.querySelector('.page-card-chk');
            chk.addEventListener('change', (e) => {
                e.stopPropagation();
                if (chk.checked) selectedPageIds.add(p.id);
                else selectedPageIds.delete(p.id);
                renderAll();
            });

            sorterList.appendChild(card);
        });
    }

    function renderCanvas() {
        canvasSvg.innerHTML = '';

        const gViewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gViewport.setAttribute('id', 'viewport-transform');
        gViewport.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);

        // Read current feature states for live WYSIWYG
        const isMargin = marginEnabled ? marginEnabled.checked : false;
        const showGuides = isMargin && chkGuidesEnabled && chkGuidesEnabled.checked;
        const mTop = parseFloat(mTopInput.value) || 10;
        const mRight = parseFloat(mRightInput.value) || 10;
        const mBottom = parseFloat(mBottomInput.value) || 10;
        const mLeft = parseFloat(mLeftInput.value) || 10;
        const bleed = parseFloat(mBleedInput.value) || 0;

        const isPn = pnEnabled.checked;
        const pnStyleVal = pnStyle ? pnStyle.value : 'arabic';
        const pnFmt = pnFormat ? pnFormat.value : '{n}';
        const pnCustomVal = pnCustomText ? pnCustomText.value : '';
        const pnPos = pnPosition.value;
        const pnFontFam = getPnFontFamily();
        const pnSize = parseFloat(pnFontSize.value) || 10;
        const pnClr = pnColor.value;
        const pnOff = parseFloat(pnOffset.value) || 10;
        const pnSkip = pnSkipFirst.checked;

        const isHf = hfEnabled.checked;
        const hfSkip = hfSkipFirst.checked;
        const hfLine = hfDivider.checked;
        const hl = hLeft.value.trim();
        const hc = hCenter.value.trim();
        const hr = hRight.value.trim();
        const fl = fLeft.value.trim();
        const fc = fCenter.value.trim();
        const fr = fRight.value.trim();
        const hfOffTop = parseFloat(hfOffsetTop.value) || 12;
        const hfOffBot = parseFloat(hfOffsetBottom.value) || 12;
        const hfPadX = parseFloat(hfMarginX.value) || 10;
        const hfFontFam = getHfFontFamily();
        const hfSize = parseFloat(hfFontSize.value) || 9;
        const hfClr = hfColor.value || '#555555';
        const hfLineThick = parseFloat(hfDividerThick.value) || 0.5;
        const hfLineClr = hfDividerColor.value || '#d1d5db';
        const hfImgPos = hfImagePos.value || 'footer-left';
        const hfImgW = parseFloat(hfImageW.value) || 25;
        const hfImgH = parseFloat(hfImageH.value) || 10;

        const isWm = wmEnabled.checked;
        const wmTxt = wmText.value.trim();
        const wmRot = parseFloat(wmRotation.value) || -45;
        const wmClr = wmColor.value;
        const wmOp = parseFloat(wmOpacity.value) || 0.15;

        const todayStr = new Date().toISOString().split('T')[0];

        pages.forEach((p, idx) => {
            const isSelected = selectedPageIds.has(p.id);
            const isCover = (idx === 0);
            const pageG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            pageG.setAttribute('class', 'page-canvas-group');
            pageG.dataset.id = p.id;

            // 1. Bleed box (if margin is enabled and bleed > 0)
            if (isMargin && bleed > 0) {
                const bleedRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bleedRect.setAttribute('class', 'svg-bleed-line');
                bleedRect.setAttribute('x', p.x - bleed);
                bleedRect.setAttribute('y', p.y - bleed);
                bleedRect.setAttribute('width', p.width + (bleed * 2));
                bleedRect.setAttribute('height', p.height + (bleed * 2));
                pageG.appendChild(bleedRect);
            }

            // 2. Main Page Rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', `svg-page-rect ${isSelected ? 'selected' : ''}`);
            rect.setAttribute('x', p.x);
            rect.setAttribute('y', p.y);
            rect.setAttribute('width', p.width);
            rect.setAttribute('height', p.height);
            rect.setAttribute('rx', '2');
            rect.style.cursor = 'pointer';

            rect.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                    if (selectedPageIds.has(p.id)) selectedPageIds.delete(p.id);
                    else selectedPageIds.add(p.id);
                } else {
                    selectedPageIds.clear();
                    selectedPageIds.add(p.id);
                }
                activePageId = p.id;
                populateQuickEdit(p);
                renderAll();
            });
            pageG.appendChild(rect);

            // 3. Page Header Badges (Index & Label)
            const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeText.setAttribute('class', 'svg-page-badge');
            badgeText.setAttribute('x', p.x + 6);
            badgeText.setAttribute('y', p.y - 6);
            badgeText.textContent = `#${idx + 1} (${p.label || `Page ${idx + 1}`})`;
            pageG.appendChild(badgeText);

            // 4. Margin Guides
            if (showGuides && p.width > (mLeft + mRight) && p.height > (mTop + mBottom)) {
                const guideRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                guideRect.setAttribute('class', 'svg-guide-line');
                guideRect.setAttribute('x', p.x + mLeft);
                guideRect.setAttribute('y', p.y + mTop);
                guideRect.setAttribute('width', p.width - mLeft - mRight);
                guideRect.setAttribute('height', p.height - mTop - mBottom);
                guideRect.setAttribute('fill', 'none');
                guideRect.setAttribute('pointer-events', 'none');
                pageG.appendChild(guideRect);
            }

            // 5. Live Watermark Preview
            if (isWm) {
                const cx = p.x + (p.width / 2);
                const cy = p.y + (p.height / 2);
                const wmModeVal = wmMode ? wmMode.value : 'text';

                if (wmModeVal === 'image' && wmImageData) {
                    const wmImgW = parseFloat(wmImageWidth ? wmImageWidth.value : 80) || 80;
                    const imgElem = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    imgElem.setAttribute('href', wmImageData);
                    imgElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', wmImageData);
                    imgElem.setAttribute('x', cx - (wmImgW / 2));
                    imgElem.setAttribute('y', cy - (wmImgW / 2));
                    imgElem.setAttribute('width', wmImgW);
                    imgElem.setAttribute('height', wmImgW);
                    imgElem.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    imgElem.setAttribute('transform', `rotate(${wmRot}, ${cx}, ${cy})`);
                    imgElem.setAttribute('opacity', wmOp);
                    imgElem.style.opacity = wmOp;
                    imgElem.setAttribute('pointer-events', 'none');
                    pageG.appendChild(imgElem);
                } else if (wmTxt) {
                    const wmFontFam = getWmFontFamily();
                    const wmSizeVal = parseFloat(wmFontSize ? wmFontSize.value : 44) || 44;
                    const wmElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    wmElem.setAttribute('x', cx);
                    wmElem.setAttribute('y', cy);
                    wmElem.setAttribute('transform', `rotate(${wmRot}, ${cx}, ${cy})`);
                    wmElem.setAttribute('fill', wmClr);
                    wmElem.setAttribute('opacity', wmOp);
                    wmElem.setAttribute('font-size', `${wmSizeVal}px`);
                    wmElem.setAttribute('font-weight', '700');
                    wmElem.setAttribute('font-family', wmFontFam);
                    wmElem.setAttribute('text-anchor', 'middle');
                    wmElem.setAttribute('dominant-baseline', 'middle');
                    wmElem.setAttribute('pointer-events', 'none');
                    wmElem.textContent = wmTxt;
                    pageG.appendChild(wmElem);
                }
            }

            // 6. Live Header Preview
            if (isHf && (!hfSkip || !isCover)) {
                const replaceHfVars = (tmpl) => {
                    return (tmpl || '')
                        .replace(/\{page\}/gi, idx + 1)
                        .replace(/\{total\}/gi, pages.length)
                        .replace(/\{date\}/gi, todayStr);
                };

                const hTopY = p.y + hfOffTop;
                if (hl) createSvgText(pageG, replaceHfVars(hl), p.x + hfPadX, hTopY, 'start', hfClr, hfSize, hfFontFam);
                if (hc) createSvgText(pageG, replaceHfVars(hc), p.x + (p.width / 2), hTopY, 'middle', hfClr, hfSize, hfFontFam);
                if (hr) createSvgText(pageG, replaceHfVars(hr), p.x + p.width - hfPadX, hTopY, 'end', hfClr, hfSize, hfFontFam);

                const fBotY = p.y + p.height - hfOffBot;
                if (fl) createSvgText(pageG, replaceHfVars(fl), p.x + hfPadX, fBotY, 'start', hfClr, hfSize, hfFontFam);
                if (fc) createSvgText(pageG, replaceHfVars(fc), p.x + (p.width / 2), fBotY, 'middle', hfClr, hfSize, hfFontFam);
                if (fr) createSvgText(pageG, replaceHfVars(fr), p.x + p.width - hfPadX, fBotY, 'end', hfClr, hfSize, hfFontFam);

                // Logo / Image
                if (hfImageData) {
                    let imgX = p.x + hfPadX;
                    let imgY = p.y + p.height - hfOffBot - hfImgH;
                    if (hfImgPos.includes('header')) {
                        imgY = p.y + hfOffTop - hfImgH;
                    }
                    if (hfImgPos.includes('center')) {
                        imgX = p.x + (p.width - hfImgW) / 2;
                    } else if (hfImgPos.includes('right')) {
                        imgX = p.x + p.width - hfPadX - hfImgW;
                    }

                    const imgElem = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    imgElem.setAttribute('href', hfImageData);
                    imgElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', hfImageData);
                    imgElem.setAttribute('x', imgX);
                    imgElem.setAttribute('y', imgY);
                    imgElem.setAttribute('width', hfImgW);
                    imgElem.setAttribute('height', hfImgH);
                    imgElem.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    imgElem.setAttribute('pointer-events', 'none');
                    pageG.appendChild(imgElem);
                }

                if (hfLine) {
                    if (hl || hc || hr) {
                        const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        lineH.setAttribute('x1', p.x + hfPadX);
                        lineH.setAttribute('y1', hTopY + 3);
                        lineH.setAttribute('x2', p.x + p.width - hfPadX);
                        lineH.setAttribute('y2', hTopY + 3);
                        lineH.setAttribute('stroke', hfLineClr);
                        lineH.setAttribute('stroke-width', hfLineThick);
                        pageG.appendChild(lineH);
                    }

                    if (fl || fc || fr) {
                        const lineF = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        lineF.setAttribute('x1', p.x + hfPadX);
                        lineF.setAttribute('y1', fBotY - hfSize - 2);
                        lineF.setAttribute('x2', p.x + p.width - hfPadX);
                        lineF.setAttribute('y2', fBotY - hfSize - 2);
                        lineF.setAttribute('stroke', hfLineClr);
                        lineF.setAttribute('stroke-width', hfLineThick);
                        pageG.appendChild(lineF);
                    }
                }
            }

            // 7. Live Page Number Preview
            if (isPn && (!pnSkip || !isCover)) {
                const pnVal = formatPageNumber(idx, pages.length, pnStyleVal, pnFmt, pnCustomVal);

                let anchor = 'middle';
                let tx = p.x + (p.width / 2);
                let ty = p.y + p.height - pnOff;

                if (pnPos.includes('left')) { tx = p.x + pnOff; anchor = 'start'; }
                else if (pnPos.includes('right')) { tx = p.x + p.width - pnOff; anchor = 'end'; }

                if (pnPos.includes('top')) { ty = p.y + pnOff + (pnSize * 0.4); }

                createSvgText(pageG, pnVal, tx, ty, anchor, pnClr, pnSize, pnFontFam);
            }

            gViewport.appendChild(pageG);
        });

        canvasSvg.appendChild(gViewport);
        zoomBadge.textContent = `${Math.round(zoom * 100)}%`;
    }

    function toRoman(num, upper = true) {
        if (num <= 0) return `${num}`;
        const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syb = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
        let res = "";
        let n = num;
        for (let i = 0; i < val.length; i++) {
            while (n >= val[i]) {
                res += syb[i];
                n -= val[i];
            }
        }
        return upper ? res : res.toLowerCase();
    }

    function toAlpha(num, upper = true) {
        if (num <= 0) return `${num}`;
        let res = "";
        let n = num;
        while (n > 0) {
            const rem = (n - 1) % 26;
            res = String.fromCharCode(65 + rem) + res;
            n = Math.floor((n - 1) / 26);
        }
        return upper ? res : res.toLowerCase();
    }

    function formatPageNumber(pageIdx, totalPages, style, fmt, customSuffix) {
        const pageNum = pageIdx + 1;
        let nStr = `${pageNum}`;
        let totStr = `${totalPages}`;

        if (style === 'roman_upper') {
            nStr = toRoman(pageNum, true);
            totStr = toRoman(totalPages, true);
        } else if (style === 'roman_lower') {
            nStr = toRoman(pageNum, false);
            totStr = toRoman(totalPages, false);
        } else if (style === 'alpha_upper') {
            nStr = toAlpha(pageNum, true);
            totStr = toAlpha(totalPages, true);
        } else if (style === 'alpha_lower') {
            nStr = toAlpha(pageNum, false);
            totStr = toAlpha(totalPages, false);
        }

        let baseTxt = (fmt || '{n}')
            .replace(/\{n\}/g, nStr)
            .replace(/\{total\}/g, totStr)
            .replace(/1\/N/g, `${nStr} / ${totStr}`)
            .replace(/Page 1 of N/g, `Page ${nStr} of ${totStr}`)
            .replace(/- 1 -/g, `- ${nStr} -`);

        if (customSuffix) {
            baseTxt = `${baseTxt}${customSuffix}`;
        }
        return baseTxt;
    }

    function getPnFontFamily() {
        if (!pnFontFamily) return 'sans-serif';
        if (pnFontFamily.value === 'custom') {
            return (pnFontCustom && pnFontCustom.value.trim()) ? pnFontCustom.value.trim() : 'sans-serif';
        }
        return pnFontFamily.value || 'sans-serif';
    }

    if (pnFontFamily) {
        pnFontFamily.addEventListener('change', () => {
            if (pnFontCustom) {
                pnFontCustom.style.display = pnFontFamily.value === 'custom' ? 'inline-block' : 'none';
            }
            renderCanvas();
        });
    }

    function createSvgText(parent, text, x, y, anchor, color, size, fontFamily = 'sans-serif') {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', y);
        t.setAttribute('text-anchor', anchor);
        t.setAttribute('fill', color);
        t.setAttribute('font-size', `${size}px`);
        t.setAttribute('font-family', fontFamily);
        t.setAttribute('pointer-events', 'none');

        const lines = (text || '').split('\n');
        if (lines.length === 1) {
            t.textContent = lines[0];
        } else {
            lines.forEach((line, lIdx) => {
                const tsp = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                tsp.setAttribute('x', x);
                if (lIdx > 0) {
                    tsp.setAttribute('dy', `${size * 1.25}px`);
                }
                tsp.textContent = line;
                t.appendChild(tsp);
            });
        }
        parent.appendChild(t);
        return t;
    }

    function populateQuickEdit(p) {
        if (!p) return;
        editLabelInput.value = p.label || '';
        editWInput.value = p.width.toFixed(1);
        editHInput.value = p.height.toFixed(1);
    }

    // =========================================================================
    // 4. QUICK EDIT INPUT LISTENERS
    // =========================================================================
    editLabelInput.addEventListener('input', () => {
        const p = pages.find(item => item.id === activePageId);
        if (p) {
            p.label = editLabelInput.value;
            renderAll();
        }
    });

    editWInput.addEventListener('change', () => {
        const val = parseFloat(editWInput.value);
        if (val > 0) {
            pages.forEach(p => {
                if (selectedPageIds.has(p.id)) {
                    p.width = val;
                    p.orientation = p.height >= p.width ? 'portrait' : 'landscape';
                }
            });
            renderAll();
        }
    });

    editHInput.addEventListener('change', () => {
        const val = parseFloat(editHInput.value);
        if (val > 0) {
            pages.forEach(p => {
                if (selectedPageIds.has(p.id)) {
                    p.height = val;
                    p.orientation = p.height >= p.width ? 'portrait' : 'landscape';
                }
            });
            renderAll();
        }
    });

    btnToggleOrient.addEventListener('click', () => {
        pages.forEach(p => {
            if (selectedPageIds.has(p.id)) {
                const temp = p.width;
                p.width = p.height;
                p.height = temp;
                p.orientation = p.height >= p.width ? 'portrait' : 'landscape';
            }
        });
        const activeP = pages.find(item => item.id === activePageId);
        if (activeP) populateQuickEdit(activeP);
        renderAll();
    });

    // =========================================================================
    // 5. CRUD: ADD, DUPLICATE, DELETE, REORDER
    // =========================================================================
    btnAddPage.addEventListener('click', () => {
        const presetKey = pagePresetSelect.value;
        let w = docWidth;
        let h = docHeight;
        let count = 1;

        if (presetKey === 'custom') {
            w = parseFloat(customWInput.value) || docWidth;
            h = parseFloat(customHInput.value) || docHeight;
            count = parseInt(addCountCustomInput.value) || 1;
        } else if (presetKey.startsWith('user_')) {
            const name = presetKey.replace('user_', '');
            if (userCustomPresets[name]) {
                w = userCustomPresets[name].w;
                h = userCustomPresets[name].h;
            }
            const orient = pageOrientationSelect.value;
            if (orient === 'landscape' && h > w) {
                const tmp = w; w = h; h = tmp;
            } else if (orient === 'portrait' && w > h) {
                const tmp = w; w = h; h = tmp;
            }
            count = parseInt(addCountInput.value) || 1;
        } else {
            if (PRESETS[presetKey]) {
                w = PRESETS[presetKey].w;
                h = PRESETS[presetKey].h;
            }
            const orient = pageOrientationSelect.value;
            if (orient === 'landscape' && h > w) {
                const tmp = w; w = h; h = tmp;
            } else if (orient === 'portrait' && w > h) {
                const tmp = w; w = h; h = tmp;
            }
            count = parseInt(addCountInput.value) || 1;
        }

        const gap = parseFloat(layoutGapInput.value) || 20;
        let lastX = 0, lastY = 0, lastW = docWidth;
        if (pages.length > 0) {
            const lp = pages[pages.length - 1];
            lastX = lp.x;
            lastY = lp.y;
            lastW = lp.width;
        }

        selectedPageIds.clear();

        for (let i = 0; i < count; i++) {
            const newId = `page_${Date.now()}_${i}`;
            const newX = lastX + lastW + gap;
            lastX = newX;
            lastW = w;

            const newPage = {
                id: newId,
                label: `Page ${pages.length + 1}`,
                x: newX,
                y: lastY,
                width: w,
                height: h,
                margin: '0',
                bleed: '0',
                page_size: presetKey !== 'custom' ? presetKey : '',
                orientation: h >= w ? 'portrait' : 'landscape'
            };

            pages.push(newPage);
            selectedPageIds.add(newId);
            activePageId = newId;
        }

        const activeP = pages.find(p => p.id === activePageId);
        populateQuickEdit(activeP);
        renderAll();
        if (activeP) centerOnPage(activeP);
    });

    function generateDuplicateLabel(originalLabel, existingPages) {
        // Strip any chained "(Copy)", "(Copy 2)", "(2)", etc.
        let base = originalLabel.replace(/(\s*\((?:Copy|\d+)\))+$/gi, '').trim();
        if (!base) base = 'Page';

        const isStandardPage = /^(?:Page|Halaman)\s*(\d+)?$/i.test(originalLabel) ||
                               base.toLowerCase() === 'page' ||
                               base.toLowerCase() === 'halaman';

        if (isStandardPage) {
            let maxNum = 0;
            existingPages.forEach(p => {
                const m = p.label.match(/^(?:Page|Halaman)\s*(\d+)/i);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                }
            });
            return `Page ${maxNum + 1}`;
        }

        // Custom label: find highest suffix (2), (3), etc.
        let maxIdx = 1;
        const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`^${escaped}(?:\\s*\\((\\d+)\\))?$`, 'i');
        existingPages.forEach(p => {
            const m = p.label.match(pattern);
            if (m) {
                const val = m[1] ? parseInt(m[1], 10) : 1;
                if (val > maxIdx) maxIdx = val;
            }
        });
        return `${base} (${maxIdx + 1})`;
    }

    btnDuplicate.addEventListener('click', () => {
        if (selectedPageIds.size === 0) return;
        const toDup = pages.filter(p => selectedPageIds.has(p.id));
        const gap = parseFloat(layoutGapInput.value) || 20;

        selectedPageIds.clear();
        toDup.forEach((p, idx) => {
            const newId = `page_${Date.now()}_${idx}`;
            const newLabel = generateDuplicateLabel(p.label, pages);
            const newP = {
                ...p,
                id: newId,
                label: newLabel,
                x: p.x + p.width + gap
            };
            pages.push(newP);
            selectedPageIds.add(newId);
            activePageId = newId;
        });

        const activeP = pages.find(p => p.id === activePageId);
        populateQuickEdit(activeP);
        renderAll();
    });

    btnDelete.addEventListener('click', () => {
        if (pages.length <= 1) {
            alert('Dokumen harus memiliki minimal 1 halaman.');
            return;
        }
        if (selectedPageIds.size === 0) return;

        pages = pages.filter(p => !selectedPageIds.has(p.id));
        selectedPageIds.clear();

        if (pages.length > 0) {
            selectedPageIds.add(pages[0].id);
            activePageId = pages[0].id;
            populateQuickEdit(pages[0]);
        }
        renderAll();
    });

    btnMoveUp.addEventListener('click', () => {
        if (!activePageId) return;
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx > 0) {
            const tmp = pages[idx - 1];
            pages[idx - 1] = pages[idx];
            pages[idx] = tmp;
            renderAll();
        }
    });

    btnMoveDown.addEventListener('click', () => {
        if (!activePageId) return;
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx >= 0 && idx < pages.length - 1) {
            const tmp = pages[idx + 1];
            pages[idx + 1] = pages[idx];
            pages[idx] = tmp;
            renderAll();
        }
    });

    btnSelectAll.addEventListener('click', () => {
        pages.forEach(p => selectedPageIds.add(p.id));
        renderAll();
    });

    btnDeselectAll.addEventListener('click', () => {
        selectedPageIds.clear();
        renderAll();
    });

    // =========================================================================
    // 6. AUTO-LAYOUT ARRANGE
    // =========================================================================
    layoutOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            layoutOptBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLayoutMode = btn.dataset.layout;
        });
    });

    btnAutoArrange.addEventListener('click', () => {
        if (pages.length === 0) return;

        const gap = parseFloat(layoutGapInput.value) || 20;
        const cols = parseInt(layoutColsInput.value) || 3;

        if (currentLayoutMode === 'row') {
            // Horizontal single row
            let curX = 0;
            pages.forEach(p => {
                p.x = curX;
                p.y = 0;
                curX += p.width + gap;
            });
        } else if (currentLayoutMode === 'col') {
            // Vertical single column
            let curY = 0;
            pages.forEach(p => {
                p.x = 0;
                p.y = curY;
                curY += p.height + gap;
            });
        } else if (currentLayoutMode === 'spread') {
            // Book spreads (Page 1 right, Page 2-3 pair, 4-5 pair...)
            let curY = 0;
            if (pages.length > 0) {
                // Page 1 on the right
                const p1 = pages[0];
                p1.x = p1.width + gap;
                p1.y = curY;
                curY += p1.height + gap;
            }
            for (let i = 1; i < pages.length; i += 2) {
                const leftP = pages[i];
                const rightP = pages[i + 1];
                leftP.x = 0;
                leftP.y = curY;
                if (rightP) {
                    rightP.x = leftP.width + gap;
                    rightP.y = curY;
                    curY += Math.max(leftP.height, rightP.height) + gap;
                } else {
                    curY += leftP.height + gap;
                }
            }
        } else {
            // Grid Matrix mode
            let colIndex = 0;
            let rowIndex = 0;
            let rowMaxH = 0;
            let curX = 0;
            let curY = 0;

            pages.forEach((p, idx) => {
                p.x = curX;
                p.y = curY;
                curX += p.width + gap;
                if (p.height > rowMaxH) rowMaxH = p.height;

                colIndex++;
                if (colIndex >= cols) {
                    colIndex = 0;
                    rowIndex++;
                    curX = 0;
                    curY += rowMaxH + gap;
                    rowMaxH = 0;
                }
            });
        }

        renderAll();
        fitAllPages();
    });

    // =========================================================================
    // 7. LIVE WYSIWYG EVENT LISTENERS
    // =========================================================================
    [marginEnabled, chkGuidesEnabled, mTopInput, mRightInput, mBottomInput, mLeftInput, mBleedInput,
     pnEnabled, pnStyle, pnFormat, pnCustomText, pnPosition, pnFontFamily, pnFontCustom, pnFontSize, pnColor, pnOffset, pnSkipFirst, pnLocked,
     hfEnabled, hLeft, hCenter, hRight, fLeft, fCenter, fRight, hfOffsetTop, hfOffsetBottom, hfMarginX,
     hfFontFamily, hfFontCustom, hfFontSize, hfColor, hfDivider, hfDividerThick, hfDividerColor, hfSkipFirst, hfLocked,
     hfImagePos, hfImageW, hfImageH,
     wmEnabled, wmMode, wmText, wmFontFamily, wmFontCustom, wmFontSize, wmImageWidth, wmRotation, wmColor, wmOpacity, wmLocked].forEach(input => {
        if (!input) return;
        const trigger = () => {
            if (input === wmOpacity && wmOpacityVal) {
                wmOpacityVal.textContent = `${Math.round(parseFloat(wmOpacity.value) * 100)}%`;
            }
            renderCanvas();
            saveSettingsDebounced();
        };
        input.addEventListener('input', trigger);
        input.addEventListener('change', trigger);
    });

    function syncMarginsToPages() {
        const mStr = `${mTopInput.value} ${mRightInput.value} ${mBottomInput.value} ${mLeftInput.value}`;
        const bStr = mBleedInput ? mBleedInput.value : '0';
        pages.forEach(p => {
            p.margin = mStr;
            p.bleed = bStr;
        });
    }

    if (btnLinkMargins) {
        btnLinkMargins.addEventListener('click', () => {
            marginsLinked = !marginsLinked;
            btnLinkMargins.classList.toggle('active', marginsLinked);
            if (marginsLinked && mTopInput) {
                const val = mTopInput.value;
                if (mRightInput) mRightInput.value = val;
                if (mBottomInput) mBottomInput.value = val;
                if (mLeftInput) mLeftInput.value = val;
                syncMarginsToPages();
                renderCanvas();
                saveSettingsDebounced();
            }
        });
    }

    [mTopInput, mRightInput, mBottomInput, mLeftInput].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('input', () => {
            if (marginsLinked) {
                const val = inp.value;
                if (inp !== mTopInput && mTopInput) mTopInput.value = val;
                if (inp !== mRightInput && mRightInput) mRightInput.value = val;
                if (inp !== mBottomInput && mBottomInput) mBottomInput.value = val;
                if (inp !== mLeftInput && mLeftInput) mLeftInput.value = val;
            }
            syncMarginsToPages();
        });
    });

    if (mBleedInput) {
        mBleedInput.addEventListener('input', syncMarginsToPages);
    }

    // =========================================================================
    // 8. INTERACTIVE CANVAS: PAN & ZOOM
    // =========================================================================
    canvasViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvasViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY < 0 ? 1.15 : 0.85;
        const newZoom = Math.max(0.05, Math.min(10.0, zoom * delta));

        // Zoom toward mouse pointer
        panX = mouseX - ((mouseX - panX) * (newZoom / zoom));
        panY = mouseY - ((mouseY - panY) * (newZoom / zoom));
        zoom = newZoom;

        renderCanvas();
    });

    canvasViewport.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            renderCanvas();
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
    });

    btnZoomIn.addEventListener('click', () => {
        zoom = Math.min(10.0, zoom * 1.25);
        renderCanvas();
    });

    btnZoomOut.addEventListener('click', () => {
        zoom = Math.max(0.05, zoom * 0.8);
        renderCanvas();
    });

    btnZoomReset.addEventListener('click', () => {
        zoom = 1.0;
        panX = 40;
        panY = 40;
        renderCanvas();
    });

    btnFitAll.addEventListener('click', fitAllPages);

    function fitAllPages() {
        if (pages.length === 0) return;
        const bounds = calculatePagesBoundingBox();
        const pad = 40;
        const vpW = canvasViewport.clientWidth || 800;
        const vpH = canvasViewport.clientHeight || 500;

        const totalW = bounds.maxX - bounds.minX;
        const totalH = bounds.maxY - bounds.minY;

        if (totalW <= 0 || totalH <= 0) return;

        const scaleX = (vpW - (pad * 2)) / totalW;
        const scaleY = (vpH - (pad * 2)) / totalH;
        zoom = Math.min(scaleX, scaleY);
        zoom = Math.max(0.05, Math.min(1.5, zoom));

        panX = (vpW - (totalW * zoom)) / 2 - (bounds.minX * zoom);
        panY = (vpH - (totalH * zoom)) / 2 - (bounds.minY * zoom);

        renderCanvas();
    }

    function centerOnPage(p) {
        const vpW = canvasViewport.clientWidth || 800;
        const vpH = canvasViewport.clientHeight || 500;
        panX = (vpW / 2) - ((p.x + (p.width / 2)) * zoom);
        panY = (vpH / 2) - ((p.y + (p.height / 2)) * zoom);
        renderCanvas();
    }

    // =========================================================================
    // 9. APPLY CHANGES TO INKSCAPE (SAVE / SUBMIT)
    // =========================================================================
    btnApply.addEventListener('click', async () => {
        try {
            btnApply.disabled = true;
            statusIndicator.className = 'status-indicator busy';
            statusMsg.textContent = currentLang === 'en' ? 'Applying changes to Inkscape...' : 'Menerapkan perubahan ke Inkscape...';

            // Auto-persist latest configuration before applying
            await saveSettingsToConfig();

            const payload = {
                pages: pages,
                options: {
                    guides: {
                        enabled: (marginEnabled && marginEnabled.checked) && (chkGuidesEnabled && chkGuidesEnabled.checked),
                        apply_margins: marginEnabled ? marginEnabled.checked : false,
                        top: parseFloat(mTopInput.value) || 10,
                        right: parseFloat(mRightInput.value) || 10,
                        bottom: parseFloat(mBottomInput.value) || 10,
                        left: parseFloat(mLeftInput.value) || 10,
                        bleed: parseFloat(mBleedInput ? mBleedInput.value : 0) || 0
                    },
                    page_numbers: {
                        enabled: pnEnabled.checked,
                        style: pnStyle ? pnStyle.value : 'arabic',
                        format: pnFormat.value,
                        custom_text: pnCustomText ? pnCustomText.value : '',
                        position: pnPosition.value,
                        font_size: parseFloat(pnFontSize.value) || 10,
                        color: pnColor.value,
                        offset: parseFloat(pnOffset.value) || 10,
                        skip_first: pnSkipFirst.checked,
                        locked: pnLocked ? pnLocked.checked : true,
                        font_family: getPnFontFamily()
                    },
                    header_footer: {
                        enabled: hfEnabled.checked,
                        header_left: hLeft.value,
                        header_center: hCenter.value,
                        header_right: hRight.value,
                        footer_left: fLeft.value,
                        footer_center: fCenter.value,
                        footer_right: fRight.value,
                        offset_top: parseFloat(hfOffsetTop.value) || 12,
                        offset_bottom: parseFloat(hfOffsetBottom.value) || 12,
                        margin_x: parseFloat(hfMarginX.value) || 10,
                        font_family: getHfFontFamily(),
                        font_size: parseFloat(hfFontSize.value) || 9,
                        color: hfColor.value || '#555555',
                        show_divider: hfDivider.checked,
                        divider_thickness: parseFloat(hfDividerThick.value) || 0.5,
                        divider_color: hfDividerColor.value || '#cccccc',
                        divider_offset: 3.0,
                        skip_first: hfSkipFirst.checked,
                        locked: hfLocked ? hfLocked.checked : true,
                        image_data: hfImageData || '',
                        image_pos: hfImagePos.value || 'footer-left',
                        image_width: parseFloat(hfImageW.value) || 25,
                        image_height: parseFloat(hfImageH.value) || 10
                    },
                    watermark: {
                        enabled: wmEnabled.checked,
                        mode: wmMode ? wmMode.value : 'text',
                        text: wmText.value,
                        font_family: getWmFontFamily(),
                        font_size: parseFloat(wmFontSize ? wmFontSize.value : 48) || 48,
                        color: wmColor.value,
                        rotation: parseFloat(wmRotation.value) || -45,
                        opacity: parseFloat(wmOpacity.value) || 0.15,
                        locked: wmLocked ? wmLocked.checked : true,
                        image_data: wmImageData || '',
                        image_width: parseFloat(wmImageWidth ? wmImageWidth.value : 80) || 80
                    }
                }
            };

            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok && result.status === 'success') {
                statusIndicator.className = 'status-indicator';
                statusMsg.textContent = currentLang === 'en' ? 'Success! Applying to Inkscape...' : 'Sukses! Menerapkan ke Inkscape...';
                // Auto-close dialog so Inkscape applies changes immediately
                setTimeout(() => {
                    try { window.close(); } catch (e) {}
                }, 500);
            } else {
                throw new Error(result.message || (currentLang === 'en' ? 'Failed to apply' : 'Gagal menyimpan'));
            }
        } catch (err) {
            statusIndicator.className = 'status-indicator busy';
            statusMsg.textContent = currentLang === 'en' ? `Failed: ${err.message}` : `Gagal: ${err.message}`;
        } finally {
            btnApply.disabled = false;
        }
    });

    btnClose.addEventListener('click', async () => {
        try {
            await fetch('/api/close', { method: 'POST' });
        } catch (e) {}
        window.close();
    });

    // =========================================================================
    // 10. HEARTBEAT & HELPER UTILITIES
    // =========================================================================
    setInterval(async () => {
        try {
            await fetch('/heartbeat');
        } catch (e) {}
    }, 2500);

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Start App
    loadDocument();
    loadConfig();
});
