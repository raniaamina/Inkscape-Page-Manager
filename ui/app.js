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
    const pageOrientationSelect = document.getElementById('page-orientation');
    const addCountInput = document.getElementById('add-count');
    const btnDuplicate = document.getElementById('btn-duplicate-page');
    const btnDelete = document.getElementById('btn-delete-page');
    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnDeselectAll = document.getElementById('btn-deselect-all');
    const btnToggleOrient = document.getElementById('btn-toggle-orient');

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
    const btnApplyMargins = document.getElementById('btn-apply-margins');

    // Page Numbers
    const pnEnabled = document.getElementById('pn-enabled');
    const pnFormat = document.getElementById('pn-format');
    const pnPosition = document.getElementById('pn-position');
    const pnFontSize = document.getElementById('pn-font-size');
    const pnColor = document.getElementById('pn-color');
    const pnOffset = document.getElementById('pn-offset');
    const pnSkipFirst = document.getElementById('pn-skip-first');

    // Header & Footer
    const hfEnabled = document.getElementById('hf-enabled');
    const hLeft = document.getElementById('h-left');
    const hCenter = document.getElementById('h-center');
    const hRight = document.getElementById('h-right');
    const fLeft = document.getElementById('f-left');
    const fCenter = document.getElementById('f-center');
    const fRight = document.getElementById('f-right');
    const hfDivider = document.getElementById('hf-divider');
    const hfSkipFirst = document.getElementById('hf-skip-first');

    // Watermark
    const wmEnabled = document.getElementById('wm-enabled');
    const wmText = document.getElementById('wm-text');
    const wmRotation = document.getElementById('wm-rotation');
    const wmColor = document.getElementById('wm-color');
    const wmOpacity = document.getElementById('wm-opacity');
    const wmOpacityVal = document.getElementById('wm-opacity-val');

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
            statusMsg.textContent = 'Memuat dokumen Inkscape...';
            statusIndicator.className = 'status-indicator busy';

            const res = await fetch('/api/document');
            if (!res.ok) throw new Error('Gagal memuat dokumen');

            const data = await res.json();
            docUnit = data.unit || 'mm';
            docWidth = data.doc_width || 210;
            docHeight = data.doc_height || 297;
            pages = data.pages || [];

            if (layoutGapUnit) layoutGapUnit.textContent = docUnit;

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
            statusMsg.textContent = 'Siap';
            updateStatusBarMeta();
        } catch (err) {
            statusIndicator.className = 'status-indicator busy';
            statusMsg.textContent = `Error: ${err.message}`;
        }
    }

    function updateStatusBarMeta() {
        const total = pages.length;
        let bounds = calculatePagesBoundingBox();
        let totalW = (bounds.maxX - bounds.minX).toFixed(1);
        let totalH = (bounds.maxY - bounds.minY).toFixed(1);
        statusMeta.textContent = `${total} Halaman • Unit: ${docUnit} • Total Kanvas: ${totalW} × ${totalH} ${docUnit}`;
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
        const pnFmt = pnFormat.value;
        const pnPos = pnPosition.value;
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
            if (isWm && wmTxt) {
                const cx = p.x + (p.width / 2);
                const cy = p.y + (p.height / 2);
                const wmElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                wmElem.setAttribute('x', cx);
                wmElem.setAttribute('y', cy);
                wmElem.setAttribute('transform', `rotate(${wmRot}, ${cx}, ${cy})`);
                wmElem.setAttribute('fill', wmClr);
                wmElem.setAttribute('opacity', wmOp);
                wmElem.setAttribute('font-size', '44px');
                wmElem.setAttribute('font-weight', '700');
                wmElem.setAttribute('font-family', 'sans-serif');
                wmElem.setAttribute('text-anchor', 'middle');
                wmElem.setAttribute('dominant-baseline', 'middle');
                wmElem.setAttribute('pointer-events', 'none');
                wmElem.textContent = wmTxt;
                pageG.appendChild(wmElem);
            }

            // 6. Live Header Preview
            if (isHf && (!hfSkip || !isCover)) {
                const replaceHfVars = (tmpl) => {
                    return tmpl.replace('{page}', idx + 1)
                               .replace('{total}', pages.length)
                               .replace('{date}', todayStr);
                };

                const hTopY = p.y + 12;
                if (hl) createSvgText(pageG, replaceHfVars(hl), p.x + 10, hTopY, 'start', '#555', 8.5);
                if (hc) createSvgText(pageG, replaceHfVars(hc), p.x + (p.width / 2), hTopY, 'middle', '#555', 8.5);
                if (hr) createSvgText(pageG, replaceHfVars(hr), p.x + p.width - 10, hTopY, 'end', '#555', 8.5);

                const fBotY = p.y + p.height - 10;
                if (fl) createSvgText(pageG, replaceHfVars(fl), p.x + 10, fBotY, 'start', '#555', 8.5);
                if (fc) createSvgText(pageG, replaceHfVars(fc), p.x + (p.width / 2), fBotY, 'middle', '#555', 8.5);
                if (fr) createSvgText(pageG, replaceHfVars(fr), p.x + p.width - 10, fBotY, 'end', '#555', 8.5);

                if (hfLine) {
                    const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    lineH.setAttribute('x1', p.x + 10);
                    lineH.setAttribute('y1', hTopY + 3);
                    lineH.setAttribute('x2', p.x + p.width - 10);
                    lineH.setAttribute('y2', hTopY + 3);
                    lineH.setAttribute('stroke', '#d1d5db');
                    lineH.setAttribute('stroke-width', '0.5');
                    pageG.appendChild(lineH);

                    const lineF = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    lineF.setAttribute('x1', p.x + 10);
                    lineF.setAttribute('y1', fBotY - 10);
                    lineF.setAttribute('x2', p.x + p.width - 10);
                    lineF.setAttribute('y2', fBotY - 10);
                    lineF.setAttribute('stroke', '#d1d5db');
                    lineF.setAttribute('stroke-width', '0.5');
                    pageG.appendChild(lineF);
                }
            }

            // 7. Live Page Number Preview
            if (isPn && (!pnSkip || !isCover)) {
                let pnVal = `${idx + 1}`;
                if (pnFmt === '1/N') pnVal = `${idx + 1} / ${pages.length}`;
                else if (pnFmt === 'Page 1 of N') pnVal = `Page ${idx + 1} of ${pages.length}`;
                else if (pnFmt === '- 1 -') pnVal = `- ${idx + 1} -`;

                let anchor = 'middle';
                let tx = p.x + (p.width / 2);
                let ty = p.y + p.height - pnOff;

                if (pnPos.includes('left')) { tx = p.x + pnOff; anchor = 'start'; }
                else if (pnPos.includes('right')) { tx = p.x + p.width - pnOff; anchor = 'end'; }

                if (pnPos.includes('top')) { ty = p.y + pnOff + (pnSize * 0.4); }

                createSvgText(pageG, pnVal, tx, ty, anchor, pnClr, pnSize);
            }

            gViewport.appendChild(pageG);
        });

        canvasSvg.appendChild(gViewport);
        zoomBadge.textContent = `${Math.round(zoom * 100)}%`;
    }

    function createSvgText(parent, text, x, y, anchor, color, size) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', y);
        t.setAttribute('text-anchor', anchor);
        t.setAttribute('fill', color);
        t.setAttribute('font-size', `${size}px`);
        t.setAttribute('font-family', 'sans-serif');
        t.setAttribute('pointer-events', 'none');
        t.textContent = text;
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
        const orient = pageOrientationSelect.value;
        const count = parseInt(addCountInput.value) || 1;

        let w = docWidth;
        let h = docHeight;
        if (PRESETS[presetKey]) {
            w = PRESETS[presetKey].w;
            h = PRESETS[presetKey].h;
        }

        if (orient === 'landscape' && h > w) {
            const tmp = w; w = h; h = tmp;
        } else if (orient === 'portrait' && w > h) {
            const tmp = w; w = h; h = tmp;
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
     pnEnabled, pnFormat, pnPosition, pnFontSize, pnColor, pnOffset, pnSkipFirst,
     hfEnabled, hLeft, hCenter, hRight, fLeft, fCenter, fRight, hfDivider, hfSkipFirst,
     wmEnabled, wmText, wmRotation, wmColor, wmOpacity].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            if (input === wmOpacity && wmOpacityVal) {
                wmOpacityVal.textContent = `${Math.round(parseFloat(wmOpacity.value) * 100)}%`;
            }
            renderCanvas();
        });
    });

    btnApplyMargins.addEventListener('click', () => {
        if (marginEnabled) marginEnabled.checked = true;
        const mStr = `${mTopInput.value} ${mRightInput.value} ${mBottomInput.value} ${mLeftInput.value}`;
        const bStr = mBleedInput.value;
        pages.forEach(p => {
            if (selectedPageIds.has(p.id)) {
                p.margin = mStr;
                p.bleed = bStr;
            }
        });
        renderAll();
    });

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
            statusMsg.textContent = 'Menerapkan perubahan ke Inkscape...';

            const payload = {
                pages: pages,
                options: {
                    guides: {
                        enabled: (marginEnabled && marginEnabled.checked) && (chkGuidesEnabled && chkGuidesEnabled.checked),
                        apply_margins: marginEnabled ? marginEnabled.checked : false,
                        top: parseFloat(mTopInput.value) || 10,
                        right: parseFloat(mRightInput.value) || 10,
                        bottom: parseFloat(mBottomInput.value) || 10,
                        left: parseFloat(mLeftInput.value) || 10
                    },
                    page_numbers: {
                        enabled: pnEnabled.checked,
                        format: pnFormat.value,
                        position: pnPosition.value,
                        font_size: parseFloat(pnFontSize.value) || 10,
                        color: pnColor.value,
                        offset: parseFloat(pnOffset.value) || 10,
                        skip_first: pnSkipFirst.checked,
                        font_family: 'sans-serif'
                    },
                    header_footer: {
                        enabled: hfEnabled.checked,
                        header_left: hLeft.value,
                        header_center: hCenter.value,
                        header_right: hRight.value,
                        footer_left: fLeft.value,
                        footer_center: fCenter.value,
                        footer_right: fRight.value,
                        show_divider: hfDivider.checked,
                        skip_first: hfSkipFirst.checked,
                        font_size: 9,
                        color: '#555555',
                        top_margin: 12,
                        bottom_margin: 12
                    },
                    watermark: {
                        enabled: wmEnabled.checked,
                        text: wmText.value,
                        rotation: parseFloat(wmRotation.value) || -45,
                        opacity: parseFloat(wmOpacity.value) || 0.15,
                        color: wmColor.value,
                        font_size: 48,
                        font_family: 'sans-serif'
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
                statusMsg.textContent = 'Sukses! Menerapkan ke Inkscape...';
                // Auto-close dialog so Inkscape applies changes immediately
                setTimeout(() => {
                    try { window.close(); } catch (e) {}
                }, 500);
            } else {
                throw new Error(result.message || 'Gagal menyimpan');
            }
        } catch (err) {
            statusIndicator.className = 'status-indicator busy';
            statusMsg.textContent = `Gagal: ${err.message}`;
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
});
