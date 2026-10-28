import warnings
try:
    from gi import PyGIDeprecationWarning
    warnings.filterwarnings('ignore', category=PyGIDeprecationWarning)
except ImportError:
    warnings.filterwarnings('ignore', message='.*unix_signal_add_full.*')

import os
import sys
import json
import threading
import http.server
import socketserver
import webbrowser
import socket
import time
from datetime import datetime

# Add inkscape extensions directory to sys.path if not present
ext_paths = [
    '/usr/share/inkscape/extensions',
    '/usr/lib/inkscape/extensions',
    os.path.expanduser('~/.config/inkscape/extensions')
]
for p in ext_paths:
    if os.path.exists(p) and p not in sys.path:
        sys.path.append(p)

import inkex
from inkex import TextElement, Tspan, Layer, Group, Guide, Page, Image

# Try to load GTK and WebKit2 for native window on Linux
GTK_UI_AVAILABLE = False
try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
    from gi.repository import Gtk, WebKit2, GLib
    GTK_UI_AVAILABLE = True
except (ImportError, ValueError):
    try:
        import gi
        gi.require_version('Gtk', '3.0')
        gi.require_version('WebKit2', '4.0')
        from gi.repository import Gtk, WebKit2, GLib
        GTK_UI_AVAILABLE = True
    except:
        GTK_UI_AVAILABLE = False

# Try to load pywebview as fallback for Windows/macOS
try:
    import webview
    PYWEBVIEW_AVAILABLE = True
except ImportError:
    PYWEBVIEW_AVAILABLE = False

# Try to load PyObjC Cocoa WebKit on macOS
COCOA_UI_AVAILABLE = False
if sys.platform == 'darwin':
    try:
        import objc
        from AppKit import (
            NSApplication, NSApp, NSWindow, NSBackingStoreBuffered, NSMakeRect,
            NSApplicationActivationPolicyRegular, NSMenu, NSMenuItem
        )
        from Foundation import NSURL, NSURLRequest
        from WebKit import WKWebView, WKWebViewConfiguration
        from PyObjCTools import AppHelper
        COCOA_UI_AVAILABLE = True
    except Exception:
        COCOA_UI_AVAILABLE = False

# Redirect stderr to a log file
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extension_debug.log')
log_file = open(log_path, 'w')
os.dup2(log_file.fileno(), sys.stderr.fileno())


class PageManagerExtension(inkex.EffectExtension):
    """Inkscape extension to manage multi-page documents in real-time."""

    class WebUIHandler(http.server.SimpleHTTPRequestHandler):
        """Handler for the Page Manager Web UI HTTP server."""

        def __init__(self, *args, extension_instance=None, **kwargs):
            self.extension_instance = extension_instance
            super().__init__(*args, **kwargs)

        def log_message(self, format, *args):
            pass

        def do_GET(self):
            if self.path == '/api/document':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()

                doc_info = self.extension_instance.get_document_info()
                self.wfile.write(json.dumps(doc_info).encode('utf-8'))

            elif self.path == '/api/config':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()

                config_path = os.path.join(os.path.dirname(__file__), 'config.json')
                config_data = {}
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r', encoding='utf-8') as f:
                            config_data = json.load(f)
                    except:
                        pass
                self.wfile.write(json.dumps(config_data).encode('utf-8'))

            elif self.path == '/heartbeat':
                self.extension_instance.last_heartbeat = time.time()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))

            elif self.path == '/api/status':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(self.extension_instance.status_data).encode('utf-8'))

            else:
                super().do_GET()

        def do_POST(self):
            if self.path == '/api/apply':
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    success, message = self.extension_instance.apply_changes(data)
                    self.send_response(200 if success else 400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'success' if success else 'error',
                        'message': message
                    }).encode('utf-8'))

                    if success:
                        # Schedule shutdown after brief delay so HTTP response is sent and UI shows success
                        def delayed_shutdown():
                            import time
                            time.sleep(0.6)
                            self.extension_instance.status_data['status'] = 'closed'
                            if GTK_UI_AVAILABLE:
                                from gi.repository import GLib, Gtk
                                GLib.idle_add(Gtk.main_quit)
                            elif PYWEBVIEW_AVAILABLE and hasattr(self.extension_instance, 'webview_window') and self.extension_instance.webview_window is not None:
                                self.extension_instance.webview_window.destroy()

                        threading.Thread(target=delayed_shutdown).start()
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'error',
                        'message': f'Server Error: {str(e)}'
                    }).encode('utf-8'))

            elif self.path == '/api/config':
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                config_path = os.path.join(os.path.dirname(__file__), 'config.json')
                try:
                    cur_config = {}
                    if os.path.exists(config_path):
                        with open(config_path, 'r', encoding='utf-8') as f:
                            cur_config = json.load(f)
                    cur_config.update(data)
                    with open(config_path, 'w', encoding='utf-8') as f:
                        json.dump(cur_config, f, indent=4)
                except:
                    pass

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'saved'}).encode('utf-8'))

            elif self.path == '/api/close':
                self.send_response(200)
                self.end_headers()
                self.extension_instance.status_data['status'] = 'closed'
                if GTK_UI_AVAILABLE:
                    from gi.repository import GLib, Gtk
                    GLib.idle_add(Gtk.main_quit)
                elif PYWEBVIEW_AVAILABLE and hasattr(self.extension_instance, 'webview_window') and self.extension_instance.webview_window is not None:
                    self.extension_instance.webview_window.destroy()

    def __init__(self):
        super().__init__()
        self.status_data = {"status": "idle", "message": "Ready"}
        self.last_heartbeat = time.time()
        self.active_backend = 'auto'

    def get_document_info(self):
        """Extract all pages and document metadata."""
        svg = self.svg
        namedview = svg.namedview
        unit = svg.unit if hasattr(svg, 'unit') and svg.unit else 'mm'

        # Document dimensions
        doc_w = svg.viewbox_width if hasattr(svg, 'viewbox_width') and svg.viewbox_width else 210.0
        doc_h = svg.viewbox_height if hasattr(svg, 'viewbox_height') and svg.viewbox_height else 297.0

        raw_pages = namedview.get_pages() if hasattr(namedview, 'get_pages') else []
        pages_list = []

        if raw_pages:
            for idx, p in enumerate(raw_pages):
                pid = p.get('id') or f"page{idx+1}"
                label = p.get('inkscape:label') or p.get('label') or f"Page {idx+1}"
                px = float(p.x) if hasattr(p, 'x') and p.x is not None else 0.0
                py = float(p.y) if hasattr(p, 'y') and p.y is not None else 0.0
                pw = float(p.width) if hasattr(p, 'width') and p.width is not None else doc_w
                ph = float(p.height) if hasattr(p, 'height') and p.height is not None else doc_h
                margin = p.get('margin') or '0'
                bleed = p.get('bleed') or '0'
                page_size = p.get('page-size') or ''

                pages_list.append({
                    'id': pid,
                    'label': label,
                    'x': px,
                    'y': py,
                    'width': pw,
                    'height': ph,
                    'margin': margin,
                    'bleed': bleed,
                    'page_size': page_size,
                    'orientation': 'portrait' if ph >= pw else 'landscape'
                })
        else:
            # Single page document without explicit inkscape:page
            pages_list.append({
                'id': 'page1',
                'label': 'Page 1',
                'x': 0.0,
                'y': 0.0,
                'width': float(doc_w),
                'height': float(doc_h),
                'margin': '0',
                'bleed': '0',
                'page_size': 'A4' if abs(doc_w - 210.0) < 1.0 and abs(doc_h - 297.0) < 1.0 else '',
                'orientation': 'portrait' if doc_h >= doc_w else 'landscape'
            })

        # Check existing layers
        existing_layers = {
            'page_numbers': svg.getElementById('layer_page_numbers') is not None,
            'header_footer': svg.getElementById('layer_header_footer') is not None,
            'watermark': svg.getElementById('layer_watermark') is not None
        }

        return {
            'unit': unit,
            'doc_width': float(doc_w),
            'doc_height': float(doc_h),
            'pages': pages_list,
            'layers': existing_layers
        }

    def apply_changes(self, data):
        """Apply all page adjustments and generate feature layers in SVG."""
        svg = self.svg
        namedview = svg.namedview
        pages_data = data.get('pages', [])
        options = data.get('options', {})

        if not pages_data:
            return False, "No page data provided."

        # 1. Update / Recreate pages in namedview
        guides_opt = options.get('guides', {})
        apply_margins = guides_opt.get('apply_margins', False)
        guides_enabled = guides_opt.get('enabled', False)

        # Remove all existing <inkscape:page> elements
        existing_pages = namedview.get_pages() if hasattr(namedview, 'get_pages') else []
        for ep in existing_pages:
            try:
                namedview.remove(ep)
            except Exception:
                pass

        # Also purge any loose page elements
        for child in list(namedview):
            if child.tag.endswith('page'):
                namedview.remove(child)

        # Add updated pages in the exact new order
        for idx, pd in enumerate(pages_data):
            pw = float(pd.get('width', 210.0))
            ph = float(pd.get('height', 297.0))
            px = float(pd.get('x', 0.0))
            py = float(pd.get('y', 0.0))
            label = pd.get('label') or f"Page {idx+1}"
            pid = pd.get('id') or f"page{idx+1}"
            margin = pd.get('margin') or '0'
            bleed = pd.get('bleed') or '0'
            page_size = pd.get('page_size') or ''

            # Create new page element directly to avoid duplicate viewbox page insertion
            new_p = Page(width=str(pw), height=str(ph), x=str(px), y=str(py))
            new_p.set('id', pid)
            new_p.set('inkscape:label', str(label))
            if apply_margins:
                if margin and margin != '0':
                    new_p.set('margin', str(margin))
                if bleed and bleed != '0':
                    new_p.set('bleed', str(bleed))
            if page_size:
                new_p.set('page-size', str(page_size))
            namedview.append(new_p)

        # Clean existing page margin guides
        for child in list(namedview):
            if child.tag.endswith('guide'):
                label = child.get('{http://www.inkscape.org/namespaces/inkscape}label') or ''
                if 'Margin' in label:
                    namedview.remove(child)

        # 2. Create Margin Guides (only if enabled)
        if guides_enabled:
            m_top = float(guides_opt.get('top', 10.0))
            m_right = float(guides_opt.get('right', 10.0))
            m_bottom = float(guides_opt.get('bottom', 10.0))
            m_left = float(guides_opt.get('left', 10.0))

            for idx, pd in enumerate(pages_data):
                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))

                try:
                    namedview.add_guide(py + m_top, orient=True, name=f"P{idx+1} Margin Top")
                    namedview.add_guide(py + ph - m_bottom, orient=True, name=f"P{idx+1} Margin Bottom")
                    namedview.add_guide(px + m_left, orient=False, name=f"P{idx+1} Margin Left")
                    namedview.add_guide(px + pw - m_right, orient=False, name=f"P{idx+1} Margin Right")
                except Exception:
                    pass

        # 3. Layer helper: get or create layer
        def get_or_create_layer(layer_id, layer_name):
            el = svg.getElementById(layer_id)
            if el is not None:
                for c in list(el):
                    el.remove(c)
                return el
            new_layer = Layer.new(layer_name)
            new_layer.set('id', layer_id)
            svg.append(new_layer)
            return new_layer

        # 4. Page Numbers Layer
        pn_opt = options.get('page_numbers', {})
        pn_enabled = pn_opt.get('enabled', False)
        pn_layer = svg.getElementById('layer_page_numbers')
        if pn_enabled:
            pn_layer = get_or_create_layer('layer_page_numbers', 'Page Numbers')
            total_pages = len(pages_data)
            skip_first = pn_opt.get('skip_first', False)
            pn_style = pn_opt.get('style', 'arabic')
            fmt = pn_opt.get('format', '{n}')
            custom_text = pn_opt.get('custom_text', '')
            pos = pn_opt.get('position', 'bottom-center')
            f_size = pn_opt.get('font_size', 10)
            f_color = pn_opt.get('color', '#333333')
            f_family = pn_opt.get('font_family', 'sans-serif')
            offset = float(pn_opt.get('offset', 10.0))

            def to_roman(n, upper=True):
                lookup = [
                    (1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'),
                    (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
                    (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')
                ]
                res = ''
                for val, s in lookup:
                    while n >= val:
                        res += s
                        n -= val
                return res if upper else res.lower()

            def to_alpha(n, upper=True):
                res = ''
                while n > 0:
                    rem = (n - 1) % 26
                    res = chr(65 + rem) + res
                    n = (n - 1) // 26
                return res if upper else res.lower()

            for idx, pd in enumerate(pages_data):
                if skip_first and idx == 0:
                    continue

                page_num = idx + 1
                if pn_style == 'roman_upper':
                    n_str = to_roman(page_num, True)
                    tot_str = to_roman(total_pages, True)
                elif pn_style == 'roman_lower':
                    n_str = to_roman(page_num, False)
                    tot_str = to_roman(total_pages, False)
                elif pn_style == 'alpha_upper':
                    n_str = to_alpha(page_num, True)
                    tot_str = to_alpha(total_pages, True)
                elif pn_style == 'alpha_lower':
                    n_str = to_alpha(page_num, False)
                    tot_str = to_alpha(total_pages, False)
                else:
                    n_str = str(page_num)
                    tot_str = str(total_pages)

                if fmt in ('1/N', '{n}/{total}'):
                    base_txt = f"{n_str} / {tot_str}"
                elif fmt in ('Page 1 of N', 'Page {n} of {total}'):
                    base_txt = f"Page {n_str} of {tot_str}"
                elif fmt in ('- 1 -', '- {n} -'):
                    base_txt = f"- {n_str} -"
                else:
                    base_txt = n_str

                if custom_text:
                    base_txt = f"{base_txt}{custom_text}"

                txt_val = base_txt

                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))

                # Compute position
                anchor = 'middle'
                if 'left' in pos:
                    tx = px + offset
                    anchor = 'start'
                elif 'right' in pos:
                    tx = px + pw - offset
                    anchor = 'end'
                else:
                    tx = px + (pw / 2.0)
                    anchor = 'middle'

                if 'top' in pos:
                    ty = py + offset + (f_size * 0.35)
                else:
                    ty = py + ph - offset

                t_elem = TextElement(x=str(tx), y=str(ty))
                t_elem.style['font-size'] = f"{f_size}pt"
                t_elem.style['font-family'] = f_family
                t_elem.style['text-anchor'] = anchor
                t_elem.style['fill'] = f_color
                tsp = Tspan()
                tsp.text = txt_val
                t_elem.append(tsp)
                pn_layer.append(t_elem)
        else:
            if pn_layer is not None:
                svg.remove(pn_layer)

        # 5. Header & Footer Layer
        hf_opt = options.get('header_footer', {})
        hf_enabled = hf_opt.get('enabled', False)
        hf_layer = svg.getElementById('layer_header_footer')
        if hf_enabled:
            hf_layer = get_or_create_layer('layer_header_footer', 'Header & Footer')
            total_pages = len(pages_data)
            skip_first = hf_opt.get('skip_first', False)
            f_size = float(hf_opt.get('font_size', 9))
            f_color = hf_opt.get('color', '#555555')
            f_family = hf_opt.get('font_family', 'sans-serif')
            show_divider = hf_opt.get('show_divider', False)
            div_thick = float(hf_opt.get('divider_thickness', 0.5))
            div_color = hf_opt.get('divider_color', '#cccccc')
            div_offset = float(hf_opt.get('divider_offset', 3.0))
            m_top = float(hf_opt.get('offset_top', hf_opt.get('top_margin', 12.0)))
            m_bottom = float(hf_opt.get('offset_bottom', hf_opt.get('bottom_margin', 12.0)))
            pad = float(hf_opt.get('margin_x', 10.0))
            h_left = hf_opt.get('header_left', '')
            h_center = hf_opt.get('header_center', '')
            h_right = hf_opt.get('header_right', '')
            f_left = hf_opt.get('footer_left', '')
            f_center = hf_opt.get('footer_center', '')
            f_right = hf_opt.get('footer_right', '')
            hf_img_data = hf_opt.get('image_data', '')
            hf_img_pos = hf_opt.get('image_pos', 'footer-left')
            hf_img_w = float(hf_opt.get('image_width', 25.0))
            hf_img_h = float(hf_opt.get('image_height', 10.0))
            today_str = datetime.now().strftime('%Y-%m-%d')

            def replace_vars(tmpl, p_idx):
                return tmpl.replace('{page}', str(p_idx + 1)) \
                           .replace('{total}', str(total_pages)) \
                           .replace('{date}', today_str)

            def add_multiline_text(layer, text, tx, ty, anc):
                lines = text.split('\n')
                t_elem = TextElement(x=str(tx), y=str(ty))
                t_elem.style['font-size'] = f"{f_size}pt"
                t_elem.style['font-family'] = f_family
                t_elem.style['text-anchor'] = anc
                t_elem.style['fill'] = f_color
                for l_idx, line in enumerate(lines):
                    tsp = Tspan()
                    tsp.text = line
                    tsp.set('x', str(tx))
                    if l_idx > 0:
                        tsp.set('dy', f"{f_size * 1.25}pt")
                    t_elem.append(tsp)
                layer.append(t_elem)

            for idx, pd in enumerate(pages_data):
                if skip_first and idx == 0:
                    continue

                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))

                # Header entries
                header_entries = [
                    (h_left, px + pad, py + m_top, 'start'),
                    (h_center, px + (pw / 2.0), py + m_top, 'middle'),
                    (h_right, px + pw - pad, py + m_top, 'end')
                ]
                for text_tpl, tx, ty, anc in header_entries:
                    val = replace_vars(text_tpl, idx).strip()
                    if val:
                        add_multiline_text(hf_layer, val, tx, ty, anc)

                # Footer entries
                footer_entries = [
                    (f_left, px + pad, py + ph - m_bottom, 'start'),
                    (f_center, px + (pw / 2.0), py + ph - m_bottom, 'middle'),
                    (f_right, px + pw - pad, py + ph - m_bottom, 'end')
                ]
                for text_tpl, tx, ty, anc in footer_entries:
                    val = replace_vars(text_tpl, idx).strip()
                    if val:
                        add_multiline_text(hf_layer, val, tx, ty, anc)

                # Optional Logo / Image
                if hf_img_data:
                    ix = px + pad
                    iy = py + ph - m_bottom - hf_img_h
                    if 'header' in hf_img_pos:
                        iy = py + m_top - hf_img_h
                    if 'center' in hf_img_pos:
                        ix = px + (pw - hf_img_w) / 2.0
                    elif 'right' in hf_img_pos:
                        ix = px + pw - pad - hf_img_w

                    img_elem = Image()
                    img_elem.set('xlink:href', hf_img_data)
                    img_elem.set('href', hf_img_data)
                    img_elem.set('x', str(ix))
                    img_elem.set('y', str(iy))
                    img_elem.set('width', str(hf_img_w))
                    img_elem.set('height', str(hf_img_h))
                    img_elem.set('preserveAspectRatio', 'xMidYMid meet')
                    hf_layer.append(img_elem)

                # Optional divider lines
                if show_divider:
                    from inkex import PathElement
                    # Header divider
                    if any([h_left, h_center, h_right]):
                        d_y = py + m_top + div_offset
                        line_h = PathElement()
                        line_h.set('d', f"M {px + pad} {d_y} L {px + pw - pad} {d_y}")
                        line_h.style['stroke'] = div_color
                        line_h.style['stroke-width'] = f"{div_thick}pt"
                        hf_layer.append(line_h)
                    # Footer divider
                    if any([f_left, f_center, f_right]):
                        d_y = py + ph - m_bottom - div_offset
                        line_f = PathElement()
                        line_f.set('d', f"M {px + pad} {d_y} L {px + pw - pad} {d_y}")
                        line_f.style['stroke'] = div_color
                        line_f.style['stroke-width'] = f"{div_thick}pt"
                        hf_layer.append(line_f)
        else:
            if hf_layer is not None:
                svg.remove(hf_layer)

        # 6. Watermark Layer
        wm_opt = options.get('watermark', {})
        wm_enabled = wm_opt.get('enabled', False)
        wm_layer = svg.getElementById('layer_watermark')
        if wm_enabled:
            wm_layer = get_or_create_layer('layer_watermark', 'Watermark')
            wm_mode = wm_opt.get('mode', 'text')
            wm_text = wm_opt.get('text', 'DRAFT').strip()
            f_size = float(wm_opt.get('font_size', 48))
            f_color = wm_opt.get('color', '#888888')
            f_family = wm_opt.get('font_family', 'sans-serif')
            opacity = float(wm_opt.get('opacity', 0.2))
            rotation = float(wm_opt.get('rotation', -45.0))
            wm_img_data = wm_opt.get('image_data', '')
            wm_img_w = float(wm_opt.get('image_width', 80.0))

            for idx, pd in enumerate(pages_data):
                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))
                cx = px + (pw / 2.0)
                cy = py + (ph / 2.0)

                if wm_mode == 'image' and wm_img_data:
                    img_elem = Image()
                    img_elem.set('xlink:href', wm_img_data)
                    img_elem.set('href', wm_img_data)
                    img_elem.set('x', str(cx - (wm_img_w / 2.0)))
                    img_elem.set('y', str(cy - (wm_img_w / 2.0)))
                    img_elem.set('width', str(wm_img_w))
                    img_elem.set('height', str(wm_img_w))
                    img_elem.set('preserveAspectRatio', 'xMidYMid meet')
                    img_elem.set('transform', f"rotate({rotation}, {cx}, {cy})")
                    img_elem.style['opacity'] = str(opacity)
                    wm_layer.append(img_elem)
                elif wm_text:
                    t_elem = TextElement(x=str(cx), y=str(cy))
                    t_elem.set('transform', f"rotate({rotation}, {cx}, {cy})")
                    t_elem.style['font-size'] = f"{f_size}pt"
                    t_elem.style['font-family'] = f_family
                    t_elem.style['font-weight'] = 'bold'
                    t_elem.style['text-anchor'] = 'middle'
                    t_elem.style['dominant-baseline'] = 'middle'
                    t_elem.style['fill'] = f_color
                    t_elem.style['opacity'] = str(opacity)
                    tsp = Tspan()
                    tsp.text = wm_text
                    t_elem.append(tsp)
                    wm_layer.append(t_elem)
        else:
            if wm_layer is not None:
                svg.remove(wm_layer)

        return True, f"Successfully updated {len(pages_data)} pages in Inkscape!"

    def run_web_ui(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            port = s.getsockname()[1]

        ui_dir = os.path.join(os.path.dirname(__file__), 'ui')
        handler_class = lambda *args, **kwargs: self.WebUIHandler(
            *args, extension_instance=self, directory=ui_dir, **kwargs
        )

        server = socketserver.TCPServer(("", port), handler_class)
        server_thread = threading.Thread(target=server.serve_forever)
        server_thread.daemon = True
        server_thread.start()

        url = f"http://localhost:{port}/index.html"

        # Determine preferred UI backend
        ui_backend = "auto"
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    ui_backend = config_data.get('ui_backend', 'auto')
            except:
                pass

        use_gtk = False
        use_webview = False
        use_cocoa = False

        if ui_backend == "gtk" and GTK_UI_AVAILABLE:
            use_gtk = True
        elif ui_backend == "cocoa" and COCOA_UI_AVAILABLE:
            use_cocoa = True
        elif ui_backend == "pywebview" and PYWEBVIEW_AVAILABLE:
            use_webview = True
        elif ui_backend == "browser":
            pass
        else:
            if GTK_UI_AVAILABLE:
                use_gtk = True
            elif COCOA_UI_AVAILABLE:
                use_cocoa = True
            elif PYWEBVIEW_AVAILABLE:
                use_webview = True

        if use_gtk:
            self.active_backend = 'gtk'
            heartbeat_id = GLib.timeout_add(100, lambda: True)
            GLib.idle_add(self._launch_gtk_window, url, server)
            Gtk.main()
            GLib.source_remove(heartbeat_id)
        elif use_cocoa:
            self.active_backend = 'cocoa'
            self._launch_cocoa_window(url, server)
            self.status_data['status'] = 'closed'
        elif use_webview:
            self.active_backend = 'webview'
            self.webview_window = webview.create_window(
                'Page Manager - Inkscape', url, width=1150, height=750, resizable=True
            )
            webview.start()
            self.status_data['status'] = 'closed'
        else:
            # Fallback for Windows / macOS standalone app mode or browser
            import subprocess
            self.last_heartbeat = time.time()
            start_time = time.time()
            app_launched = False
            self.app_process = None

            if os.name == 'nt':
                browser_paths = [
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                ]
                for b_path in browser_paths:
                    if os.path.exists(b_path):
                        try:
                            self.app_process = subprocess.Popen([
                                b_path, f"--app={url}", "--window-size=1150,750"
                            ])
                            app_launched = True
                            self.active_backend = 'app'
                            break
                        except Exception:
                            pass

            elif sys.platform == 'darwin':
                # macOS standalone app mode via Chromium-based browsers
                macos_browsers = [
                    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                    os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
                    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                    os.path.expanduser("~/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
                    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
                    os.path.expanduser("~/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
                    "/Applications/Chromium.app/Contents/MacOS/Chromium",
                    os.path.expanduser("~/Applications/Chromium.app/Contents/MacOS/Chromium"),
                    "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
                    os.path.expanduser("~/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"),
                    "/Applications/Arc.app/Contents/MacOS/Arc",
                    os.path.expanduser("~/Applications/Arc.app/Contents/MacOS/Arc"),
                ]
                for b_path in macos_browsers:
                    if os.path.exists(b_path):
                        try:
                            self.app_process = subprocess.Popen([
                                b_path, f"--app={url}", "--window-size=1150,750"
                            ])
                            app_launched = True
                            self.active_backend = 'app'
                            break
                        except Exception:
                            pass

                # If no Chromium browser installed on macOS, spawn dedicated Safari window via AppleScript
                if not app_launched:
                    ascript = f'''
                    tell application "Safari"
                        activate
                        set newWin to make new document with properties {{URL:"{url}"}}
                        set bounds of newWin to {{100, 80, 1250, 830}}
                    end tell
                    '''
                    try:
                        res = subprocess.run(['osascript', '-e', ascript], capture_output=True, text=True, timeout=5)
                        if res.returncode == 0:
                            app_launched = True
                            self.active_backend = 'safari_window'
                    except Exception:
                        pass

            if not app_launched:
                self.active_backend = 'browser'
                webbrowser.open(url)

            while self.status_data['status'] == 'idle':
                time.sleep(0.5)
                if time.time() - self.last_heartbeat > 3.0 and time.time() - start_time > 15.0:
                    self.status_data['status'] = 'closed'
                    break

            if app_launched and self.app_process:
                try:
                    self.app_process.terminate()
                except:
                    pass

        server.shutdown()
        server.server_close()

    def _launch_cocoa_window(self, url, server):
        """Launches a native Cocoa WKWebView window on macOS using PyObjC."""
        import objc
        from AppKit import (
            NSApplication, NSApp, NSWindow, NSBackingStoreBuffered, NSMakeRect,
            NSApplicationActivationPolicyRegular, NSMenu, NSMenuItem
        )
        from Foundation import NSURL, NSURLRequest
        from WebKit import WKWebView, WKWebViewConfiguration
        from PyObjCTools import AppHelper

        with objc.autorelease_pool():
            app = NSApplication.sharedApplication()
            NSApp.setActivationPolicy_(NSApplicationActivationPolicyRegular)

            # Minimal Menu
            menubar = NSMenu.alloc().init().autorelease()
            app_menu_item = NSMenuItem.alloc().init().autorelease()
            menubar.addItem_(app_menu_item)
            NSApp.setMainMenu_(menubar)

            app_menu = NSMenu.alloc().init().autorelease()
            quit_menu_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
                "Quit Page Manager", "terminate:", "q"
            ).autorelease()
            app_menu.addItem_(quit_menu_item)
            app_menu_item.setSubmenu_(app_menu)

            # Window: Titled (1) | Closable (2) | Miniaturizable (4) | Resizable (8)
            style_mask = 1 | 2 | 4 | 8
            window_rect = NSMakeRect(0, 0, 1150, 750)
            window = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(
                window_rect, style_mask, NSBackingStoreBuffered, False
            )
            window.setTitle_("Page Manager - Inkscape")
            window.center()

            config = WKWebViewConfiguration.alloc().init()
            webview_el = WKWebView.alloc().initWithFrame_configuration_(
                window.contentView().bounds(), config
            )
            webview_el.setAutoresizingMask_(18)  # NSViewWidthSizable | NSViewHeightSizable

            req = NSURLRequest.requestWithURL_(NSURL.URLWithString_(url))
            webview_el.loadRequest_(req)

            window.contentView().addSubview_(webview_el)
            window.makeKeyAndOrderFront_(None)
            NSApp.activateIgnoringOtherApps_(True)

            def poll_status():
                while self.status_data.get('status') == 'idle':
                    time.sleep(0.3)
                AppHelper.stopEventLoop()

            t = threading.Thread(target=poll_status, daemon=True)
            t.start()

        AppHelper.runEventLoop()

    def _launch_gtk_window(self, url, server):
        window = Gtk.Window(title="Page Manager - Inkscape")
        window.set_default_size(1150, 750)
        window.set_position(Gtk.WindowPosition.CENTER)
        window.set_resizable(True)

        webview_el = WebKit2.WebView()
        window.add(webview_el)
        webview_el.load_uri(url)

        def on_destroy(widget):
            server.shutdown()
            Gtk.main_quit()

        window.connect("destroy", on_destroy)
        window.show_all()

    def effect(self):
        self.run_web_ui()


if __name__ == '__main__':
    try:
        PageManagerExtension().run()
    finally:
        try:
            log_file.close()
        except:
            pass
