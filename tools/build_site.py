"""Combine the Access+ pages into one site (website/index.html) with hash routes.

Views: #home (with #simulators, #guide-ai, #how, #goals, #who), #borrow, #profile, #gesture.
Run from the repo root:  python3 tools/build_site.py
Sources: src/home.html, src/borrow.html, src/profile.html. Output: website/index.html (do not edit by hand).
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
GESTURE_URL = 'https://claude.ai/artifact/7oGn9ccZY4vL6n8731dXro'

SKIP = re.compile(r'^(:root|\*|\[hidden\]|body|html|:focus-visible|\.wrap\b|\.bar\b|\.brand\b|\.tagline\b|\.nav\b|\.navrow\b|\.ver\b|a\b|h1, h2, h3|\.sr\b|\.toast\b|\.btn \{|\.btn\[aria-pressed|\.btn\.primary)')


def split_rules(css):
    """Yield (prelude, body) for top-level blocks."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        yield prelude, css[j + 1:k - 1]
        i = k


def scope(css, view):
    out = []
    for prelude, body in split_rules(css):
        if prelude.startswith('@media'):
            inner = scope(body, view)
            if inner.strip():
                out.append(prelude + ' {\n' + inner + '}')
        elif prelude.startswith('@keyframes'):
            out.append(prelude + ' {' + body + '}')
        else:
            if SKIP.match(prelude + ' {') or SKIP.match(prelude):
                continue
            sels = []
            for sel in prelude.split(','):
                sel = sel.strip()
                if sel.startswith('main .wrap'):
                    sels.append('#view-%s > .wrap' % view + sel[len('main .wrap'):])
                else:
                    sels.append('#view-%s %s' % (view, sel))
            out.append(', '.join(sels) + ' {' + body + '}')
    return '\n'.join(out) + '\n'


def rename_classes(text, mapping, prefix_css=False):
    def cls_attr(m):
        toks = [mapping.get(t, t) for t in m.group(2).split()]
        return m.group(1) + ' '.join(toks) + '"'
    text = re.sub(r'(class=")([^"]*)"', cls_attr, text)
    return text


def css_rename(css, mapping):
    for a, b in mapping.items():
        css = re.sub(r'\.%s(?![\w-])' % re.escape(a), '.' + b, css)
    return css


def prefix_ids(html, js, pre, keep=()):
    ids = set(re.findall(r'\bid="([^"]+)"', html))
    ids -= set(keep)
    def fix(m):
        attr, val = m.group(1), m.group(2)
        vals = [pre + v if v in ids else v for v in val.split()]
        return '%s="%s"' % (attr, ' '.join(vals))
    html = re.sub(r'\b(id|for|aria-labelledby|aria-controls|aria-describedby)="([^"]+)"', fix, html)
    for i in sorted(ids, key=len, reverse=True):
        js = re.sub(r"'#%s(?=[\s.'\[])" % re.escape(i), "'#" + pre + i, js)
    js = 'var __ID = function (x) { return document.getElementById(%r + x) || document.getElementById(x); };\n' % pre + js.replace('document.getElementById(', '__ID(')
    return html, js


def strip_big_toggle(js):
    i = js.find('var root = document.documentElement, big')
    if i < 0: return js
    j = js.find("big.addEventListener('click'", i)
    j = js.find('\n', j)
    return js[:i] + js[j + 1:]


def fragment(path):
    s = path.read_text()
    css = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
    main = re.search(r'<main>(.*?)</main>', s, re.S).group(1)
    js = re.findall(r'<script>(.*?)</script>', s, re.S)[-1]
    return css, main, js


def build():
    home_p = ROOT / 'website' / 'index.html'
    home = (ROOT / 'src' / 'home.html').read_text()

    # ---------- borrow ----------
    css, main, js = fragment(ROOT / 'src' / 'borrow.html')
    bmap = {'intro': 'bw-intro', 'head': 'bw-head', 'chips': 'bw-chips', 'chip': 'bw-chip', 'how': 'bw-how'}
    main = rename_classes(main, bmap); css = css_rename(css, bmap)
    main, js = prefix_ids(main, js, 'bw-', keep=('toast',))
    js = js.replace("  document.querySelectorAll('[data-msg]').forEach(function (b) { b.addEventListener('click', function () { say(b.dataset.msg); }); });\n", '')
    js = js.replace("document.querySelectorAll('button.item')", "document.querySelectorAll('#view-borrow button.item')")
    js = strip_big_toggle(js)
    borrow = ('<main id="view-borrow" class="view" hidden>\n' + main.replace('<div class="wrap">', '<div class="wrap">\n    <div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div>', 1) + '</main>\n',
              scope(css, 'borrow'), js)

    # ---------- profile ----------
    css, main, js = fragment(ROOT / 'src' / 'profile.html')
    pmap = {'chips': 'pf-chips', 'chip': 'pf-chip', 'who': 'pf-who', 'ai': 'pf-ai'}
    main = rename_classes(main, pmap); css = css_rename(css, pmap)
    js = js.replace("el('span', 'chip on', m)", "el('span', 'pf-chip on', m)").replace("bubble('ai thinking'", "bubble('pf-ai thinking'")
    main, js = prefix_ids(main, js, 'pf-')
    js = strip_big_toggle(js)
    profile = ('<main id="view-profile" class="view" hidden>\n  <div class="wrap backwrap"><div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div></div>\n' + main + '</main>\n',
               scope(css, 'profile'), js)

    # ---------- keyboards ----------
    css, main, js = fragment(ROOT / 'src' / 'keyboards.html')
    js = js.replace('/*KB_DATA*/', (ROOT / 'src' / 'keyboards-data.js').read_text(encoding='utf-8'))
    main, js = prefix_ids(main, js, 'kb-', keep=('toast',))
    keyboards = ('<main id="view-keyboards" class="view" hidden>\n' + main.replace('<div class="wrap kb-wrap">', '<div class="wrap kb-wrap">\n    <div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div>', 1) + '</main>\n',
                 scope(css, 'keyboards'), js)

    # ---------- tech guide ----------
    css, main, js = fragment(ROOT / 'src' / 'tech.html')
    main, js = prefix_ids(main, js, 'tg-', keep=('toast',))
    js = js.replace("document.querySelectorAll('#view-tech .tg-cat, .tg-cat')", "document.querySelectorAll('#view-tech .tg-cat')")
    tech = ('<main id="view-tech" class="view" hidden>\n' + main.replace('<div class="wrap tg-wrap">', '<div class="wrap tg-wrap">\n    <div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div>', 1) + '</main>\n',
            scope(css, 'tech'), js)

    # ---------- about ----------
    css, main, js = fragment(ROOT / 'src' / 'about.html')
    main, js = prefix_ids(main, js, 'ab-', keep=('toast',))
    about = ('<main id="view-about" class="view" hidden>\n' + main.replace('<div class="wrap ab-wrap">', '<div class="wrap ab-wrap">\n    <div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div>', 1) + '</main>\n',
             scope(css, 'about'), js)

    # ---------- gesture ----------
    gesture_html = '''<main id="view-gesture" class="view" hidden>
  <div class="wrap">
    <div class="backrow"><button class="btn back" type="button" data-back>&larr; Back</button></div>
    <section class="gx" aria-labelledby="gxT">
      <div class="gx-text">
        <div class="eyebrow">Head, nose and face tracking</div>
        <h1 id="gxT">Gesture check</h1>
        <p>Your webcam can turn small movements into switches. The camera page mirrors your expressions on a face model and tests which gestures work best for you.</p>
        <ul class="gx-list">
          <li><b>Face switches</b><span>Smile, open mouth, raised eyebrows, long blink, pucker</span></li>
          <li><b>Head switches</b><span>Tilt left and right, turn left and right, nod down, look up</span></li>
          <li><b>Nose pointer</b><span>Steer a pointer with your nose and hold on targets that get smaller</span></li>
          <li><b>Results</b><span>Each gesture rated Reliable, Possible or Not yet, with the AI agent's top picks</span></li>
        </ul>
        <p class="gx-note">The camera is turned off inside this preview. Gesture Check runs on its own page, where your browser can use the camera. Your video stays on your device.</p>
        <a class="btn primary" href="%s" target="_blank" rel="noopener">Open Gesture Check (new tab)</a>
      </div>
      <canvas id="gxFace" class="gx-face" role="img" aria-label="The Access+ AI agent, shown as a moving cloud of light"></canvas>
    </section>

    <section class="hx" aria-labelledby="hxT">
      <div class="hx-head"><h2 id="hxT">Head, nose and face tracking: what's available</h2><p>Independent summaries, not endorsements. Hands-on reviews and simulator scores are coming.</p></div>
      <div class="hx-legend"><span class="hx-tag free">Free</span><span class="hx-tag paid">Commercial</span><span class="hx-tag built">Built in</span><span class="hx-tag">Webcam</span><span class="hx-tag">Worn sensor</span></div>
      <h3 class="hx-group">Free webcam software</h3>
      <div class="hx-grid">
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag free">Free</span><span class="hx-tag">Webcam</span></div><h4>FaceNav</h4><p>Facial and nose navigation software for hands-free mouse control, developed alongside the Access+ work with MotionInput.</p><dl><dt>Clicking</dt><dd>Nose and head movement for the pointer; facial gestures for clicks</dd><dt>Works on</dt><dd>Details and download link to be added</dd></dl><span class="hx-pending">Link coming soon</span></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag free">Free</span><span class="hx-tag">Webcam</span></div><h4>UCL MotionInput / MotionInput Games</h4><p>Touchless computing from University College London: nose navigation, facial gestures, eye gaze, hand gestures and speech commands. Development continues at the MotionInput Games spin-off.</p><dl><dt>Clicking</dt><dd>Nose navigation moves the pointer; smiles, raised eyebrows, open mouth or speech click</dd><dt>Works on</dt><dd>Windows 10 and 11; free for non-commercial personal use</dd></dl><a class="hx-link" href="https://students.cs.ucl.ac.uk/software/MotionInput/v2/MotionInput.html" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag free">Free</span><span class="hx-tag">Webcam</span></div><h4>Project Gameface (Google)</h4><p>Open-source hands-free mouse built for gaming. Head movement moves the cursor, with speed set separately for each direction and smoothing to cut jitter.</p><dl><dt>Clicking</dt><dd>Facial expressions such as raised eyebrows or an open mouth mapped to clicks, scrolling or keys, each with its own threshold</dd><dt>Works on</dt><dd>Open source on GitHub</dd></dl><a class="hx-link" href="https://developers.googleblog.com/2023/06/project-gameface.html" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag free">Free</span><span class="hx-tag">Webcam</span></div><h4>Enable Viacam (eViacam)</h4><p>Long-standing free, open-source head mouse that follows head movement through a standard webcam.</p><dl><dt>Clicking</dt><dd>Dwell clicking: rest the pointer to click</dd><dt>Works on</dt><dd>Windows and Linux</dd></dl><a class="hx-link" href="https://fosshub.com/Enable-Viacam.html" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag free">Free</span><span class="hx-tag">Webcam</span></div><h4>Camera Mouse</h4><p>Free program that tracks a chosen point on the face, such as the nose, through a webcam. Developed at Boston College and widely used in schools.</p><dl><dt>Clicking</dt><dd>Dwell clicking</dd><dt>Works on</dt><dd>Windows</dd></dl><a class="hx-link" href="https://www.senteacher.org/app/popular/11/Free-Camera-Mouse-Disabilities.html" target="_blank" rel="noopener">Learn more &#8599;</a></article>
      </div>
<h3 class="hx-group">Built into your device</h3>
      <div class="hx-grid">
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag built">Built in</span><span class="hx-tag">Webcam</span></div><h4>Apple Head Pointer (Mac)</h4><p>Turn on Head Pointer in Accessibility settings and the Mac camera moves the pointer with your head. Facial expressions can be set to click and drag.</p><dl><dt>Clicking</dt><dd>Facial expressions, dwell, or a switch</dd><dt>Works on</dt><dd>macOS; iPhone and iPad offer head movements in Switch Control</dd></dl><a class="hx-link" href="https://support.apple.com/en-il/guide/mac-help/mchl654a7cc7" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag built">Built in</span><span class="hx-tag">Webcam</span></div><h4>Android Camera Switches and Project Activate</h4><p>Camera Switches turns the front camera into switches using six facial gestures: look left, right or up, smile, raise eyebrows, open mouth. Project Activate uses the same gestures to speak a phrase, send a text, call or play audio.</p><dl><dt>Clicking</dt><dd>Facial gestures as switches, with adjustable size and hold time</dd><dt>Works on</dt><dd>Android; Project Activate in English in the U.S., U.K., Canada and Australia</dd></dl><a class="hx-link" href="https://blog.google/outreach-initiatives/accessibility/making-android-more-accessible/" target="_blank" rel="noopener">Learn more &#8599;</a></article>
      </div>
<h3 class="hx-group">Commercial software</h3>
      <div class="hx-grid">
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag paid">Commercial</span><span class="hx-tag">Webcam</span></div><h4>Smyle Mouse (Perceptive Devices)</h4><p>Webcam software that moves the pointer with head movement and uses facial gestures, including smiling, to click.</p><dl><dt>Clicking</dt><dd>Smile and other facial gestures</dd><dt>Works on</dt><dd>Check the maker for current platforms</dd></dl><a class="hx-link" href="https://askjan.org/products/Smyle-Mouse.cfm" target="_blank" rel="noopener">Learn more &#8599;</a></article>
      </div>
<h3 class="hx-group">Hardware head mice</h3>
      <div class="hx-grid">
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag paid">Commercial</span><span class="hx-tag">Worn sensor</span></div><h4>HeadMouse Nano (Origin Instruments)</h4><p>An optical sensor tracks a small disposable target dot worn on the forehead, glasses or a hat, and moves the pointer as your head moves. Plugs in as a standard USB mouse with no special software.</p><dl><dt>Clicking</dt><dd>Dwell software, or wireless switches through its built-in receiver</dd><dt>Works on</dt><dd>Computers, tablets, phones and speech devices that accept a USB mouse</dd></dl><a class="hx-link" href="https://orin.com/access/headmouse/" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag paid">Commercial</span><span class="hx-tag">Worn sensor</span></div><h4>Quha Zono</h4><p>A small wireless gyroscopic mouse worn on the head, or on another part of the body that moves, that turns movement into pointer movement.</p><dl><dt>Clicking</dt><dd>Built-in options or an external switch; check current models</dd><dt>Works on</dt><dd>Wireless; works as a standard mouse</dd></dl><a class="hx-link" href="https://support.inclusive.com/article/quha-zono-mouse-range" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag paid">Commercial</span><span class="hx-tag">Worn sensor</span></div><h4>Glassouse</h4><p>Glasses with motion sensors that turn head movement into mouse or trackpad input over Bluetooth, with a battery that lasts up to about 10 days.</p><dl><dt>Clicking</dt><dd>See the maker for clicking options</dd><dt>Works on</dt><dd>Windows, macOS, Linux, Android and Apple mobile devices</dd></dl><a class="hx-link" href="https://newmobility.com/glassouse/" target="_blank" rel="noopener">Learn more &#8599;</a></article>
        <article class="hx-card"><div class="hx-tags"><span class="hx-tag paid">Commercial</span><span class="hx-tag">Worn sensor</span></div><h4>SmartNav (NaturalPoint)</h4><p>An infrared camera that follows a small reflective dot worn on the head. A long-established option; check current availability.</p><dl><dt>Clicking</dt><dd>Dwell software or switches</dd><dt>Works on</dt><dd>Windows</dd></dl><a class="hx-link" href="https://askjan.org/products/smartNAV.cfm" target="_blank" rel="noopener">Learn more &#8599;</a></article>
      </div>

      <p class="hx-note">Details change often. Check the maker's site for current versions, prices and platforms. Have a product we've missed, or a review to share? Tell us on the About page.</p>
    </section>
  </div>
</main>
''' % GESTURE_URL
    gesture_css = '''#view-gesture .wrap { gap: 48px !important; }
#view-gesture .gx { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 28px; align-items: center; }
#view-gesture .gx-text { display: grid; gap: 14px; justify-items: start; }
#view-gesture h1 { font-size: 1.8em; line-height: 1.25; }
#view-gesture p { margin: 0; color: var(--muted); max-width: 40em; }
#view-gesture .gx-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
#view-gesture .gx-list li { display: grid; gap: 2px; padding-left: 14px; border-left: 2px solid var(--signal); }
#view-gesture .gx-list b { font-weight: 600; }
#view-gesture .gx-list span { color: var(--desc); font-size: 0.93em; }
#view-gesture .gx-note { color: var(--desc); font-size: 0.9em; }
#view-gesture .gx-face { width: 100%; height: 380px; display: block; background: radial-gradient(ellipse at 50% 45%, #0f1a2c, #060b14 70%); border: 1px solid var(--line-hi); }
#view-gesture .hx { display: grid; gap: 18px; }
#view-gesture .hx-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 20px; padding-bottom: 12px; border-bottom: 1px solid var(--line-hi); position: relative; }
#view-gesture .hx-head::after { content: ""; position: absolute; left: 0; bottom: -1px; width: 64px; height: 2px; background: var(--signal); }
#view-gesture .hx-head h2 { font-size: 1.15em; text-transform: uppercase; letter-spacing: 0.08em; }
#view-gesture .hx-head p { margin: 0; color: var(--muted); }
#view-gesture .hx-legend, #view-gesture .hx-tags { display: flex; flex-wrap: wrap; gap: 6px; }
#view-gesture .hx-tag { font: 500 0.64em var(--mono); letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 7px; border: 1px solid var(--line-hi); color: var(--muted); }
#view-gesture .hx-tag.free { color: var(--signal); border-color: var(--signal); }
#view-gesture .hx-tag.paid { color: #ffc670; border-color: #ffc670; }
#view-gesture .hx-tag.built { color: #7cc4ff; border-color: #7cc4ff; }
#view-gesture .hx-group { font: 500 0.78em var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--signal); margin: 10px 0 -4px; }
#view-gesture .hx-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
#view-gesture .hx-card { display: grid; gap: 8px; align-content: start; padding: 16px; background: color-mix(in srgb, var(--panel) 94%, transparent); border: 1px solid var(--line-hi); }
#view-gesture .hx-card h4 { margin: 0; font: 600 1em var(--body); }
#view-gesture .hx-card p { margin: 0; color: var(--desc); font-size: 0.9em; }
#view-gesture .hx-card dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 0.85em; }
#view-gesture .hx-card dt { font: 500 0.78em var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding-top: 2px; }
#view-gesture .hx-card dd { margin: 0; color: var(--ink); }
#view-gesture .hx-link { justify-self: start; font: 500 0.72em var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--signal); text-decoration: none; border: 1px solid var(--line-hi); padding: 8px 10px; min-height: 40px; display: inline-flex; align-items: center; }
#view-gesture .hx-link:hover { border-color: var(--signal); }
#view-gesture .hx-pending { font: 500 0.72em var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
#view-gesture .hx-note { margin: 0; color: var(--muted); font-size: 0.85em; }
@media (max-width: 1000px) { #view-gesture .hx-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { #view-gesture .hx-grid { grid-template-columns: 1fr; } }
@media (max-width: 900px) { #view-gesture .gx { grid-template-columns: 1fr; } #view-gesture .gx-face { height: 280px; } }
'''

    # ---------- home edits ----------
    # wrap home main as a view
    home = home.replace('<main>\n  <div class="wrap">', '<main id="view-home" class="view">\n  <div class="wrap">', 1)
    home = home.replace('main .wrap { padding-block: 44px 80px;', '.view > .wrap { padding-block: 28px 80px;', 1)
    # remove previously merged views if rebuilding
    home = re.sub(r'<!-- views:start -->.*?<!-- views:end -->\n', '', home, flags=re.S)
    home = re.sub(r'/\* views-css:start \*/.*?/\* views-css:end \*/\n', '', home, flags=re.S)
    home = re.sub(r'<script>\n// views-js:start.*?// views-js:end\n</script>\n', '', home, flags=re.S)

    # links to hash routes
    home = re.sub(r'href="https://claude\.ai/artifact/W2wmMHp9CfJrPfaQULxeqi"', 'href="#profile"', home)
    home = home.replace('href="borrow.html"', 'href="#borrow"')
    home = home.replace("go: 'borrow.html'", "go: '#borrow'")

    # header: test-version badge, sign in button with demo tag, nav
    home = home.replace('<div class="brand">ACCESS<span>+</span></div>', '<a class="brand" href="#home">ACCESS<span>+</span></a><span class="testbadge" title="This is a test version. Nothing is saved to a real account.">Test version</span>', 1)
    home = re.sub(r'<a class="btn primary" href="#profile">My profile</a>', '<a class="btn primary signin" href="#profile">Sign in / My profile<span class="demo">Demo</span></a>', home, count=1)
    nav = ('<nav class="nav" aria-label="Site">'
           '<a href="#home" data-route="home">Home</a>'
           '<a href="#simulators" data-route="simulators">Simulators</a>'
           '<a href="#guide-ai" data-route="guide-ai">AI agent</a>'
           '<a href="#software" data-route="software">Software solutions</a>'
           '<a href="#hardware" data-route="hardware">Hardware solutions</a>'
           '<a href="#advanced" data-route="advanced">Advanced tech reviews</a>'
           '<a href="#borrow" data-route="borrow">Borrow a kit</a>'
           '<a href="#about" data-route="about">About</a>'
           '<a class="navsign" href="#profile" data-route="profile">Sign in / My profile<span class="navdemo">Demo</span></a></nav>')
    home = re.sub(r'<nav class="nav" aria-label="Site">.*?</nav>', nav, home, count=1, flags=re.S)
    if '.testbadge' not in home:
        home = home.replace('/* hero */', '''.brand { text-decoration: none; }
.testbadge { font: 500 0.62em var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: #ffc670; border: 1px dashed #ffc670; padding: 3px 7px; }
.signin { gap: 10px; }
.tagline { flex: 1 1 160px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.signin .demo { font: 500 0.78em var(--mono); letter-spacing: 0.1em; background: #ffc670; color: #231c05; padding: 2px 6px; }
.backrow { display: flex; padding-bottom: 4px; }
.backwrap { padding-block: 20px 0 !important; }
.totop { position: fixed; z-index: 6; right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); min-height: 56px; min-width: 56px; background: var(--panel-hi); }
/* hero */''', 1)

    views_html = '<!-- views:start -->\n' + borrow[0] + profile[0] + keyboards[0] + tech[0] + about[0] + gesture_html + '<!-- views:end -->\n'
    home = re.sub(r'</main>\s*(<div class="band band-bottom".*?</div>\s*)?<footer>', lambda m: '</main>\n\n' + views_html + '\n' + (m.group(1) or '') + '<footer>', home, count=1, flags=re.S)
    if False:
        home = home.replace('<div class="toast" id="toast"', '<button class="btn totop" id="toTop" type="button" aria-label="Back to top">&uarr; Top</button>\n\n<div class="toast" id="toast"', 1)

    views_css = '/* views-css:start */\n' + borrow[1] + profile[1] + keyboards[1] + tech[1] + about[1] + gesture_css + '/* views-css:end */\n'
    home = home.replace('</style>', views_css + '</style>', 1)

    router = r'''
  var VIEWS = ['home', 'borrow', 'profile', 'gesture', 'keyboards', 'tech', 'about'];
  function route() {
    var h = (location.hash || '#home').slice(1) || 'home';
    var MODE = { software: 'tech', hardware: 'tech', advanced: 'tech', tech: 'tech' };
    var v = MODE[h] || (VIEWS.indexOf(h) >= 0 ? h : 'home');
    if (v === 'tech' && window.tgMode) window.tgMode(h === 'tech' ? 'hardware' : h);
    VIEWS.forEach(function (n) { var e = document.getElementById('view-' + n); if (e) e.hidden = n !== v; });
    var navKey = v !== 'home' ? v : (h === 'simulators' || h === 'guide-ai' ? h : 'home');
    if (v === 'tech') navKey = h === 'tech' ? 'hardware' : h;
    if (v === 'gesture' || v === 'keyboards') navKey = 'software';
    document.querySelectorAll('.nav a').forEach(function (a) { if (a.dataset.route === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v === 'home' && h !== 'home') { var t = document.getElementById(h); if (t) { t.scrollIntoView({ block: 'start' }); return; } }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
  document.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { if (history.length > 1) history.back(); else location.hash = 'home'; });
  });
  var smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.getElementById('dockMenu').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: smooth });
    var cur = document.querySelector('.nav a[aria-current]') || document.querySelector('.nav a');
    setTimeout(function () { if (cur) cur.focus({ preventScroll: true }); }, 350);
  });
  document.getElementById('dockBack').addEventListener('click', function () {
    var h = (location.hash || '#home').slice(1);
    if (history.length > 1 && h !== 'home' && h !== '') history.back();
    else window.scrollTo({ top: 0, behavior: smooth });
  });
  try { AgentCloud(document.getElementById('gxFace')); } catch (e) {}
'''
    views_js = '<script>\n// views-js:start\n(function () {\n' + borrow[2] + '\n})();\n' + profile[2] + '\n(function () {\n' + keyboards[2] + '\n})();\n(function () {\n' + tech[2] + '\n})();\n(function () {\n' + about[2] + '\n})();\n(function () {' + router + '})();\n// views-js:end\n</script>\n'
    home = home.replace('</script>\n</body>', '</script>\n' + views_js + '</body>', 1) if '</body>' in home else home + views_js

    # arm dial: all destinations go through the router
    home = home.replace("""      if (d.go.charAt(0) === '#') {
        var t = document.querySelector(d.go);
        if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        sel.textContent = 'Pointing at: ' + d.name;
      } else { location.href = d.go; }""", """      if (location.hash === d.go) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = d.go;
      sel.textContent = 'Pointing at: ' + d.name;""")
    home_p.write_text(home)
    print('built', len(home), 'bytes')


if __name__ == '__main__':
    build()
