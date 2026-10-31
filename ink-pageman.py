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

import copy
import inkex
from inkex import TextElement, Tspan, Layer, Group, Guide, Page, Image, Use, Transform

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
            has_order = any('data-order' in p.attrib for p in raw_pages)
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
                order_val = int(p.get('data-order')) if ('data-order' in p.attrib and p.get('data-order').isdigit()) else (idx + 1)

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
                    'orientation': 'portrait' if ph >= pw else 'landscape',
                    '_order': order_val
                })
            if has_order:
                pages_list.sort(key=lambda item: item['_order'])
            for item in pages_list:
                item.pop('_order', None)
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
            'watermark': svg.getElementById('layer_watermark') is not None,
            'master_page': svg.getElementById('layer_master_page') is not None
        }

        # Remember initial page positions to compute shift deltas (Move Artwork)
        self.initial_pages = {p['id']: dict(p) for p in pages_list}

        return {
            'unit': unit,
            'doc_width': float(doc_w),
            'doc_height': float(doc_h),
            'pages': pages_list,
            'layers': existing_layers
        }

    @staticmethod
    def _get_element_center(elem):
        """Safely calculate element center coordinate (cx, cy) in SVG user units."""
        # 1. Text elements: anchor coordinates
        if isinstance(elem, TextElement):
            try:
                tx = float(elem.get('x', 0.0))
                ty = float(elem.get('y', 0.0))
                if elem.transform:
                    pt = elem.transform.apply_to_point((tx, ty))
                    return pt[0], pt[1]
                return tx, ty
            except Exception:
                pass

        # 2. Native bounding_box
        try:
            bbox = elem.bounding_box()
            if bbox is not None:
                cx = (bbox.x.minimum + bbox.x.maximum) / 2.0
                cy = (bbox.y.minimum + bbox.y.maximum) / 2.0
                return cx, cy
        except Exception:
            pass

        # 3. Fallback for Circle / Ellipse
        try:
            if 'cx' in elem.attrib and 'cy' in elem.attrib:
                cx = float(elem.get('cx'))
                cy = float(elem.get('cy'))
                if elem.transform:
                    pt = elem.transform.apply_to_point((cx, cy))
                    return pt[0], pt[1]
                return cx, cy
        except Exception:
            pass

        # 4. Fallback for Rect / Image / Use
        try:
            if 'x' in elem.attrib and 'y' in elem.attrib:
                x = float(elem.get('x', 0.0))
                y = float(elem.get('y', 0.0))
                w = float(elem.get('width', 0.0))
                h = float(elem.get('height', 0.0))
                cx, cy = x + w / 2.0, y + h / 2.0
                if elem.transform:
                    pt = elem.transform.apply_to_point((cx, cy))
                    return pt[0], pt[1]
                return cx, cy
        except Exception:
            pass

        # 5. Fallback for Line
        try:
            if 'x1' in elem.attrib and 'y1' in elem.attrib:
                x1 = float(elem.get('x1', 0.0))
                y1 = float(elem.get('y1', 0.0))
                x2 = float(elem.get('x2', 0.0))
                y2 = float(elem.get('y2', 0.0))
                cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
                if elem.transform:
                    pt = elem.transform.apply_to_point((cx, cy))
                    return pt[0], pt[1]
                return cx, cy
        except Exception:
            pass

        return None

    @staticmethod
    def _collect_graphic_elements(node, ignored_layer_ids):
        """Recursively collect graphic elements across root and nested layers."""
        elems = []
        for child in list(node):
            if not isinstance(child.tag, str) or child.tag.endswith(('namedview', 'defs', 'metadata')):
                continue
            if isinstance(child, Layer):
                if child.get('id') in ignored_layer_ids:
                    continue
                elems.extend(PageManagerExtension._collect_graphic_elements(child, ignored_layer_ids))
            else:
                elems.append(child)
        return elems

    def apply_changes(self, data):
        """Apply all page adjustments and generate feature layers in SVG."""
        svg = self.svg
        namedview = svg.namedview
        pages_data = data.get('pages', [])
        options = data.get('options', {})

        if not pages_data:
            return False, "No page data provided."

        # =========================================================================
        # STEP 0: Layer Migration & Rescue
        # Find primary user artwork layer, unlock all layers, and rescue any user artwork
        # accidentally drawn on system layers BEFORE moving pages or generating content.
        # =========================================================================
        system_layer_ids = {'layer_page_numbers', 'layer_header_footer', 'layer_watermark', 'layer_master_page'}

        def get_main_artwork_layer():
            for c in list(svg):
                if isinstance(c, Layer) and c.get('id') not in system_layer_ids:
                    return c
            l1 = svg.getElementById('layer1')
            if l1 is None:
                l1 = Layer.new('Layer 1')
                l1.set('id', 'layer1')
                svg.append(l1)
            return l1

        main_art_layer = get_main_artwork_layer()
        # Guarantee main artwork layer is completely unlocked
        main_art_layer.attrib.pop('sodipodi:insensitive', None)
        main_art_layer.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)

        def is_extension_generated(elem, layer_id=None):
            """Check if an element was generated by ink-pageman (including legacy versions)."""
            if elem.get('data-pageman-gen') == 'true' or 'ink-pageman-gen' in (elem.get('class') or ''):
                return True
            eid = elem.get('id') or ''
            if eid.startswith(('pn_', 'hf_', 'wm_', 'pageman_', 'master_page_')):
                return True
            href = elem.get('href') or elem.get('{http://www.w3.org/1999/xlink}href') or ''
            if href == '#master_page_template':
                return True

            # Legacy element detection inside system layers
            if not isinstance(elem.tag, str):
                return False
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if layer_id == 'layer_page_numbers':
                if tag == 'text':
                    return True
            elif layer_id == 'layer_master_page':
                if tag == 'use':
                    return True
            return False

        def safe_clean_layer(layer_el):
            """Remove only extension-generated items. Rescue user artwork by moving to main artwork layer."""
            if layer_el is None:
                return
            lid = layer_el.get('id', '')
            for c in list(layer_el):
                if is_extension_generated(c, lid):
                    layer_el.remove(c)
                else:
                    # User-created object accidentally placed on this system layer: RESCUE IT!
                    c.attrib.pop('sodipodi:insensitive', None)
                    c.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)
                    layer_el.remove(c)
                    main_art_layer.append(c)

        # Pre-migration sweep across ALL system layers BEFORE page rearrangement / artwork shift
        for s_id in system_layer_ids:
            s_layer = svg.getElementById(s_id)
            if s_layer is not None:
                # Strip lock from the layer container itself
                s_layer.attrib.pop('sodipodi:insensitive', None)
                s_layer.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)
                # Rescue any user artwork immediately into main_art_layer
                for c in list(s_layer):
                    if not is_extension_generated(c, s_id):
                        c.attrib.pop('sodipodi:insensitive', None)
                        c.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)
                        s_layer.remove(c)
                        main_art_layer.append(c)

        # Helper: get or create layer (layers are NEVER locked, only generated items inside them are)
        def get_or_create_layer(layer_id, layer_name):
            el = svg.getElementById(layer_id)
            if el is not None:
                safe_clean_layer(el)
                el.attrib.pop('sodipodi:insensitive', None)
                el.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)
                return el
            new_layer = Layer.new(layer_name)
            new_layer.set('id', layer_id)
            svg.append(new_layer)
            return new_layer

        # Feature 1: Move Artwork / Objects with Page
        layout_opt = options.get('layout', {})
        move_content = layout_opt.get('move_content', True)
        if move_content and hasattr(self, 'initial_pages') and self.initial_pages:
            page_shifts = {}
            for p in pages_data:
                pid = p.get('id')
                if pid in self.initial_pages:
                    init_p = self.initial_pages[pid]
                    dx = float(p.get('x', 0.0)) - float(init_p.get('x', 0.0))
                    dy = float(p.get('y', 0.0)) - float(init_p.get('y', 0.0))
                    if abs(dx) > 0.001 or abs(dy) > 0.001:
                        page_shifts[pid] = {
                            'dx': dx,
                            'dy': dy,
                            'bounds': (float(init_p.get('x', 0.0)),
                                       float(init_p.get('y', 0.0)),
                                       float(init_p.get('width', 210.0)),
                                       float(init_p.get('height', 297.0)))
                        }
            if page_shifts:
                elements_to_move = self._collect_graphic_elements(svg, system_layer_ids)

                for elem in elements_to_move:
                    pt = self._get_element_center(elem)
                    if pt is not None:
                        cx, cy = pt
                        for pid, s in page_shifts.items():
                            bx, by, bw, bh = s['bounds']
                            if bx <= cx < bx + bw and by <= cy < by + bh:
                                elem.transform = Transform(translate=(s['dx'], s['dy'])) @ elem.transform
                                break

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
            if isinstance(child.tag, str) and child.tag.endswith('page'):
                namedview.remove(child)

        # Add updated pages in the exact new order
        page_elements = []
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
            new_p = Page(width=f"{pw:g}", height=f"{ph:g}", x=f"{px:g}", y=f"{py:g}")
            new_p.set('id', pid)
            new_p.set('inkscape:label', str(label))
            new_p.set('data-order', str(idx + 1))
            if apply_margins:
                m_top = guides_opt.get('top', 10.0)
                m_right = guides_opt.get('right', 10.0)
                m_bottom = guides_opt.get('bottom', 10.0)
                m_left = guides_opt.get('left', 10.0)
                m_bleed = guides_opt.get('bleed', 0.0)
                facing_margins = guides_opt.get('facing_margins', False)
                cur_l = m_left
                cur_r = m_right
                if facing_margins and (idx % 2 == 1):
                    # Even page in spread: gutter is on the right
                    cur_l, cur_r = m_right, m_left
                m_val = margin if (margin and margin != '0') else f"{m_top} {cur_r} {m_bottom} {cur_l}"
                b_val = bleed if (bleed and bleed != '0') else str(m_bleed)
                if m_val:
                    new_p.set('margin', str(m_val))
                if b_val and b_val != '0':
                    new_p.set('bleed', str(b_val))
            if page_size:
                new_p.set('page-size', str(page_size))
            page_elements.append(new_p)

        # Sort pages for namedview so that the page at canvas origin (0, 0)
        # or top-left (lowest y, then lowest x) is ALWAYS the first child of namedview.
        # This prevents Inkscape C++ PageManager from snapping non-zero pages to (0, 0)!
        page_elements.sort(key=lambda p: (round(float(p.get('y', 0.0)), 1), round(float(p.get('x', 0.0)), 1)))

        for new_p in page_elements:
            namedview.append(new_p)

        # Synchronize root SVG viewBox, width, and height with the first page in namedview (at origin 0, 0)
        if page_elements:
            first_p = page_elements[0]
            first_w = float(first_p.get('width', 210.0))
            first_h = float(first_p.get('height', 297.0))
            first_x = float(first_p.get('x', 0.0))
            first_y = float(first_p.get('y', 0.0))
            doc_unit = svg.unit if hasattr(svg, 'unit') and svg.unit else 'mm'
            svg.set('viewBox', f"{first_x:g} {first_y:g} {first_w:g} {first_h:g}")
            svg.set('width', f"{first_w:g}{doc_unit}")
            svg.set('height', f"{first_h:g}{doc_unit}")

        # Clean existing page margin guides
        for child in list(namedview):
            if isinstance(child.tag, str) and child.tag.endswith('guide'):
                label = child.get('{http://www.inkscape.org/namespaces/inkscape}label') or ''
                if 'Margin' in label:
                    namedview.remove(child)

        # 2. Create Margin Guides (only if enabled)
        if guides_enabled:
            m_top = float(guides_opt.get('top', 10.0))
            m_right = float(guides_opt.get('right', 10.0))
            m_bottom = float(guides_opt.get('bottom', 10.0))
            m_left = float(guides_opt.get('left', 10.0))
            facing_margins = guides_opt.get('facing_margins', False)

            for idx, pd in enumerate(pages_data):
                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))

                cur_l = m_left
                cur_r = m_right
                if facing_margins and (idx % 2 == 1):
                    cur_l, cur_r = m_right, m_left

                try:
                    namedview.add_guide(py + m_top, orient=True, name=f"P{idx+1} Margin Top")
                    namedview.add_guide(py + ph - m_bottom, orient=True, name=f"P{idx+1} Margin Bottom")
                    namedview.add_guide(px + cur_l, orient=False, name=f"P{idx+1} Margin Left")
                    namedview.add_guide(px + pw - cur_r, orient=False, name=f"P{idx+1} Margin Right")
                except Exception:
                    pass

        # 4. Page Numbers Layer
        pn_opt = options.get('page_numbers', {})
        pn_enabled = pn_opt.get('enabled', False)
        pn_layer = svg.getElementById('layer_page_numbers')
        if pn_enabled:
            pn_layer = get_or_create_layer('layer_page_numbers', 'Page Numbers')
            pn_locked = pn_opt.get('locked', True)
            total_pages = len(pages_data)
            skip_first = pn_opt.get('skip_first', False)
            pn_style = pn_opt.get('style', 'arabic')
            fmt = pn_opt.get('format', '{n}')
            custom_text = pn_opt.get('custom_text', '')
            pos = pn_opt.get('position', 'bottom-center')
            pn_facing = pn_opt.get('facing_pages', False)
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
                cur_pos = pos
                if pn_facing and (idx % 2 == 1):
                    if 'right' in cur_pos:
                        cur_pos = cur_pos.replace('right', 'left')
                    elif 'left' in cur_pos:
                        cur_pos = cur_pos.replace('left', 'right')

                anchor = 'middle'
                if 'left' in cur_pos:
                    tx = px + offset
                    anchor = 'start'
                elif 'right' in cur_pos:
                    tx = px + pw - offset
                    anchor = 'end'
                else:
                    tx = px + (pw / 2.0)
                    anchor = 'middle'

                if 'top' in cur_pos:
                    ty = py + offset + (f_size * 0.35)
                else:
                    ty = py + ph - offset

                t_elem = TextElement(x=str(tx), y=str(ty))
                t_elem.set('data-pageman-gen', 'true')
                t_elem.set('class', 'ink-pageman-gen')
                t_elem.style['font-size'] = f"{f_size}pt"
                t_elem.style['font-family'] = f_family
                t_elem.style['text-anchor'] = anchor
                t_elem.style['fill'] = f_color
                tsp = Tspan()
                tsp.text = txt_val
                t_elem.append(tsp)
                if pn_locked:
                    t_elem.set('sodipodi:insensitive', 'true')
                pn_layer.append(t_elem)
        else:
            if pn_layer is not None:
                safe_clean_layer(pn_layer)
                svg.remove(pn_layer)

        # 5. Header & Footer Layer
        hf_opt = options.get('header_footer', {})
        hf_enabled = hf_opt.get('enabled', False)
        hf_layer = svg.getElementById('layer_header_footer')
        if hf_enabled:
            hf_layer = get_or_create_layer('layer_header_footer', 'Header & Footer')
            hf_locked = hf_opt.get('locked', True)
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
            hf_facing = hf_opt.get('facing_pages', False)
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
                t_elem.set('data-pageman-gen', 'true')
                t_elem.set('class', 'ink-pageman-gen')
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
                if hf_locked:
                    t_elem.set('sodipodi:insensitive', 'true')
                layer.append(t_elem)

            for idx, pd in enumerate(pages_data):
                if skip_first and idx == 0:
                    continue

                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))

                cur_hl = h_left
                cur_hr = h_right
                cur_fl = f_left
                cur_fr = f_right
                cur_img_pos = hf_img_pos
                if hf_facing and (idx % 2 == 1):
                    # Even page (left spread): swap left & right
                    cur_hl, cur_hr = h_right, h_left
                    cur_fl, cur_fr = f_right, f_left
                    if 'left' in cur_img_pos:
                        cur_img_pos = cur_img_pos.replace('left', 'right')
                    elif 'right' in cur_img_pos:
                        cur_img_pos = cur_img_pos.replace('right', 'left')

                # Header entries
                header_entries = [
                    (cur_hl, px + pad, py + m_top, 'start'),
                    (h_center, px + (pw / 2.0), py + m_top, 'middle'),
                    (cur_hr, px + pw - pad, py + m_top, 'end')
                ]
                for text_tpl, tx, ty, anc in header_entries:
                    val = replace_vars(text_tpl, idx).strip()
                    if val:
                        add_multiline_text(hf_layer, val, tx, ty, anc)

                # Footer entries
                footer_entries = [
                    (cur_fl, px + pad, py + ph - m_bottom, 'start'),
                    (f_center, px + (pw / 2.0), py + ph - m_bottom, 'middle'),
                    (cur_fr, px + pw - pad, py + ph - m_bottom, 'end')
                ]
                for text_tpl, tx, ty, anc in footer_entries:
                    val = replace_vars(text_tpl, idx).strip()
                    if val:
                        add_multiline_text(hf_layer, val, tx, ty, anc)

                # Optional Logo / Image
                if hf_img_data:
                    ix = px + pad
                    iy = py + ph - m_bottom - hf_img_h
                    if 'header' in cur_img_pos:
                        iy = py + m_top - hf_img_h
                    if 'center' in cur_img_pos:
                        ix = px + (pw - hf_img_w) / 2.0
                    elif 'right' in cur_img_pos:
                        ix = px + pw - pad - hf_img_w

                    img_elem = Image()
                    img_elem.set('data-pageman-gen', 'true')
                    img_elem.set('class', 'ink-pageman-gen')
                    img_elem.set('xlink:href', hf_img_data)
                    img_elem.set('href', hf_img_data)
                    img_elem.set('x', str(ix))
                    img_elem.set('y', str(iy))
                    img_elem.set('width', str(hf_img_w))
                    img_elem.set('height', str(hf_img_h))
                    img_elem.set('preserveAspectRatio', 'xMidYMid meet')
                    if hf_locked:
                        img_elem.set('sodipodi:insensitive', 'true')
                    hf_layer.append(img_elem)

                # Optional divider lines
                if show_divider:
                    from inkex import PathElement
                    # Header divider
                    if any([h_left, h_center, h_right]):
                        d_y = py + m_top + div_offset
                        line_h = PathElement()
                        line_h.set('data-pageman-gen', 'true')
                        line_h.set('class', 'ink-pageman-gen')
                        line_h.set('d', f"M {px + pad} {d_y} L {px + pw - pad} {d_y}")
                        line_h.style['stroke'] = div_color
                        line_h.style['stroke-width'] = f"{div_thick}pt"
                        if hf_locked:
                            line_h.set('sodipodi:insensitive', 'true')
                        hf_layer.append(line_h)
                    # Footer divider
                    if any([f_left, f_center, f_right]):
                        d_y = py + ph - m_bottom - div_offset
                        line_f = PathElement()
                        line_f.set('data-pageman-gen', 'true')
                        line_f.set('class', 'ink-pageman-gen')
                        line_f.set('d', f"M {px + pad} {d_y} L {px + pw - pad} {d_y}")
                        line_f.style['stroke'] = div_color
                        line_f.style['stroke-width'] = f"{div_thick}pt"
                        if hf_locked:
                            line_f.set('sodipodi:insensitive', 'true')
                        hf_layer.append(line_f)
        else:
            if hf_layer is not None:
                safe_clean_layer(hf_layer)
                svg.remove(hf_layer)

        # 6. Watermark Layer
        wm_opt = options.get('watermark', {})
        wm_enabled = wm_opt.get('enabled', False)
        wm_layer = svg.getElementById('layer_watermark')
        if wm_enabled:
            wm_layer = get_or_create_layer('layer_watermark', 'Watermark')
            wm_locked = wm_opt.get('locked', True)
            wm_mode = wm_opt.get('mode', 'text')
            wm_text = wm_opt.get('text', 'DRAFT').strip()
            f_size = float(wm_opt.get('font_size', 48))
            f_color = wm_opt.get('color', '#888888')
            f_family = wm_opt.get('font_family', 'sans-serif')
            opacity = float(wm_opt.get('opacity', 0.2))
            rotation = float(wm_opt.get('rotation', -45.0))
            wm_img_data = wm_opt.get('image_data', '')
            wm_img_w = float(wm_opt.get('image_width', 80.0))
            wm_skip_first = wm_opt.get('skip_first', False)

            for idx, pd in enumerate(pages_data):
                if wm_skip_first and idx == 0:
                    continue
                px = float(pd.get('x', 0.0))
                py = float(pd.get('y', 0.0))
                pw = float(pd.get('width', 210.0))
                ph = float(pd.get('height', 297.0))
                cx = px + (pw / 2.0)
                cy = py + (ph / 2.0)

                if wm_mode == 'image' and wm_img_data:
                    img_elem = Image()
                    img_elem.set('data-pageman-gen', 'true')
                    img_elem.set('class', 'ink-pageman-gen')
                    img_elem.set('xlink:href', wm_img_data)
                    img_elem.set('href', wm_img_data)
                    img_elem.set('x', str(cx - (wm_img_w / 2.0)))
                    img_elem.set('y', str(cy - (wm_img_w / 2.0)))
                    img_elem.set('width', str(wm_img_w))
                    img_elem.set('height', str(wm_img_w))
                    img_elem.set('preserveAspectRatio', 'xMidYMid meet')
                    img_elem.set('transform', f"rotate({rotation}, {cx}, {cy})")
                    img_elem.style['opacity'] = str(opacity)
                    if wm_locked:
                        img_elem.set('sodipodi:insensitive', 'true')
                    wm_layer.append(img_elem)
                elif wm_text:
                    t_elem = TextElement(x=str(cx), y=str(cy))
                    t_elem.set('data-pageman-gen', 'true')
                    t_elem.set('class', 'ink-pageman-gen')
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
                    if wm_locked:
                        t_elem.set('sodipodi:insensitive', 'true')
                    wm_layer.append(t_elem)
        else:
            if wm_layer is not None:
                safe_clean_layer(wm_layer)
                svg.remove(wm_layer)

        # 7. Master Page Layer (Feature 4 - Live Inkscape Clones)
        master_opt = options.get('master_page', {})
        master_src = master_opt.get('source', 'none')
        master_target = master_opt.get('target', 'all_except_first')
        selected_pages = set(master_opt.get('selected_pages', []))
        master_layer = svg.getElementById('layer_master_page')
        if master_src and master_src != 'none':
            src_page = None
            for p in pages_data:
                if p.get('id') == master_src:
                    src_page = p
                    break
            if src_page:
                master_layer = get_or_create_layer('layer_master_page', 'Master Page')

                sx = float(src_page.get('x', 0.0))
                sy = float(src_page.get('y', 0.0))
                sw = float(src_page.get('width', 210.0))
                sh = float(src_page.get('height', 297.0))

                # Clean any legacy template from defs
                existing_tmpl = svg.getElementById('master_page_template')
                if existing_tmpl is not None:
                    try:
                        existing_tmpl.getparent().remove(existing_tmpl)
                    except Exception:
                        pass

                # Find all graphic elements within the master page bounds
                master_elements = []
                for sub in self._collect_graphic_elements(svg, system_layer_ids):
                    pt = self._get_element_center(sub)
                    if pt is not None:
                        cx, cy = pt
                        if sx <= cx < sx + sw and sy <= cy < sy + sh:
                            eid = sub.get('id')
                            if not eid:
                                eid = svg.get_unique_id('master_obj_')
                                sub.set('id', eid)
                            master_elements.append(sub)

                # Replicate via live <use> clones to target pages
                for idx, pd in enumerate(pages_data):
                    pid = pd.get('id')
                    if pid == master_src:
                        continue
                    if master_target == 'all_except_first' and idx == 0:
                        continue
                    elif master_target == 'even' and (idx % 2 == 0):
                        continue
                    elif master_target == 'odd' and (idx % 2 == 1):
                        continue
                    elif master_target == 'selected' and pid not in selected_pages:
                        continue

                    px = float(pd.get('x', 0.0))
                    py = float(pd.get('y', 0.0))
                    dx = px - sx
                    dy = py - sy

                    page_group = Group()
                    page_group.set('data-pageman-gen', 'true')
                    page_group.set('class', 'ink-pageman-gen')
                    page_group.set('id', f"master_clone_p{idx+1}")
                    page_group.transform = Transform(translate=(dx, dy))

                    for melem in master_elements:
                        eid = melem.get('id')
                        use_inst = Use()
                        use_inst.set('data-pageman-gen', 'true')
                        use_inst.set('class', 'ink-pageman-gen')
                        use_inst.set('sodipodi:insensitive', 'true')
                        use_inst.set('href', f"#{eid}")
                        page_group.append(use_inst)

                    master_layer.append(page_group)

                # Position master layer as background (below first artwork layer)
                first_layer = None
                for c in list(svg):
                    if isinstance(c, Layer) and c.get('id') != 'layer_master_page':
                        first_layer = c
                        break
                if first_layer is not None:
                    svg.remove(master_layer)
                    first_layer.addprevious(master_layer)
        else:
            if master_layer is not None:
                safe_clean_layer(master_layer)
                svg.remove(master_layer)

        # Ensure Inkscape's active layer points to the primary artwork layer (so user can draw immediately)
        active_layer = get_main_artwork_layer()
        namedview.set('inkscape:current-layer', active_layer.get('id', 'layer1'))

        # Strip sodipodi:insensitive from all layer nodes across the entire document
        for l in [c for c in svg.iter() if isinstance(c, Layer) or (isinstance(c.tag, str) and c.tag.endswith('g') and c.get('inkscape:groupmode') == 'layer')]:
            l.attrib.pop('sodipodi:insensitive', None)
            l.attrib.pop('{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}insensitive', None)

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
        window.set_modal(True)
        window.set_keep_above(True)

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
