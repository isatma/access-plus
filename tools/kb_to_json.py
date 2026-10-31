"""Turn OptiKey dynamic keyboard XML files into preview data for the Keyboards page."""
import json, pathlib, xml.etree.ElementTree as ET

SYM = {'KeyboardIcon': '⌨', 'MouseIcon': '\U0001F5B1', 'WinIcon': '⊞', 'UpArrowKeyIcon': '↑',
       'DownArrowKeyIcon': '↓', 'LeftArrowKeyIcon': '←', 'RightArrowKeyIcon': '→'}
DEFAULT_BG = {'MouseKey': '#2f6b4f'}

def layout(path):
    root = ET.parse(path).getroot()
    g = root.find('Grid')
    groups = {}
    for kg in root.findall('KeyGroup'):
        groups[kg.get('Name')] = {'bg': kg.get('BackgroundColor') or DEFAULT_BG.get(kg.get('Name')), 'fg': kg.get('ForegroundColor'), 'op': kg.get('Opacity')}
    keys = []
    for el in root.find('Content'):
        r, c = int(el.get('Row', 0)), int(el.get('Col', 0))
        w, h = int(el.get('Width', 1)), int(el.get('Height', 1))
        if el.tag == 'Scratchpad':
            keys.append({'r': r, 'c': c, 'w': w, 'h': h, 't': 'Typed text appears here', 'k': 'pad'}); continue
        if el.tag == 'SuggestionRow':
            keys.append({'r': r, 'c': c, 'w': w, 'h': h, 't': 'Word suggestions', 'k': 'sug'}); continue
        if el.tag != 'DynamicKey': continue
        lab = el.findtext('Label')
        if lab is None:
            lab = SYM.get(el.findtext('Symbol') or '', el.findtext('Symbol') or '')
        lab = lab.replace('\\n', '\n')
        grp = el.findtext('KeyGroup')
        st = groups.get(grp, {})
        key = {'r': r, 'c': c, 'w': w, 'h': h, 't': lab}
        if st.get('bg'): key['bg'] = st['bg']
        if st.get('fg'): key['fg'] = st['fg']
        if st.get('op'): key['op'] = float(st['op'])
        keys.append(key)
    return {'rows': int(g.findtext('Rows')), 'cols': int(g.findtext('Cols')), 'keys': keys}

if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    out = {}
    for name in ['Dave_Keyboard2', 'Dave_Mouse', 'Dave_Mini']:
        p = root / 'keyboards' / (name + '.xml')
        out[name] = {'layout': layout(p), 'xml': p.read_text(encoding='utf-8')}
    (root / 'src' / 'keyboards-data.js').write_text('var KB_FILES = ' + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')
    for k, v in out.items(): print(k, v['layout']['rows'], 'x', v['layout']['cols'], len(v['layout']['keys']), 'keys')
