// Basic app switcher (kept for compatibility)
window.openApp = function(appName) {
  document.querySelectorAll('.app').forEach(app => app.classList.add('hidden'));
  const el = document.getElementById(appName + 'App');
  if (el) el.classList.remove('hidden');
};

/* ===== Settings: defaults + storage/helpers ===== */
const DEFAULT_SETTINGS = {
  theme: 'dark',           // 'dark' | 'light'
  accent: '#33aaff',       // hex color
  fontSize: 16,            // px
  reduceMotion: false,     // boolean
  defaultApp: 'terminal',  // 'terminal'|'explorer'|'editor'|'calculator'|'browser'|'settings'
  dockPosition: 'bottom'   // 'bottom'|'top'
};
let settings = loadSettingsFromStorage();

function saveSettings() {
  try { localStorage.setItem('CoolOS.settings', JSON.stringify(settings)); } catch {}
}
function loadSettingsFromStorage() {
  try {
    const raw = localStorage.getItem('CoolOS.settings');
    if (!raw) return { ...DEFAULT_SETTINGS };
    const obj = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...obj };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function applyAllSettings() {
  applyTheme(settings.theme);
  applyAccent(settings.accent);
  applyFontSize(settings.fontSize);
  applyReduceMotion(settings.reduceMotion);
  applyDockPosition(settings.dockPosition);
}
function applyTheme(theme) {
  if (theme === 'light') document.body.classList.add('light-theme');
  else document.body.classList.remove('light-theme');
  styleAccentExistingWindows();
}
function applyAccent(color) {
  styleAccentExistingWindows();
  const dock = document.getElementById('dock');
  if (dock) dock.style.boxShadow = `0 4px 24px ${hexToRGBA(color || '#33aaff', 0.35)}`;
}
function styleAccentExistingWindows() {
  document.querySelectorAll('.window').forEach(styleAccentWindow);
}
function styleAccentWindow(win) {
  const header = win.querySelector('.window-header');
  const light = document.body.classList.contains('light-theme');
  const base = light ? '#e0eafc' : '#232526';
  const accent = settings?.accent || DEFAULT_SETTINGS.accent;
  win.style.borderColor = accent;
  if (header) header.style.background = `linear-gradient(90deg, ${base} 0%, ${accent} 100%)`;
}
function applyFontSize(px) {
  document.documentElement.style.fontSize = (px || 16) + 'px';
}
function applyReduceMotion(enabled) {
  let style = document.getElementById('reduceMotionStyle');
  if (enabled) {
    if (!style) {
      style = document.createElement('style');
      style.id = 'reduceMotionStyle';
      style.textContent = `
        .window { animation: none !important; transition: none !important; }
        .dock-app:hover { transform: none !important; }
      `;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.window').forEach(w => w.style.animation = 'none');
  } else if (style) {
    style.remove();
  }
}
function applyDockPosition(pos) {
  const dock = document.getElementById('dock');
  if (!dock) return;

  // Toggle body class so CSS can adjust layout/visuals
  document.body.classList.toggle('dock-top', pos === 'top');
  document.body.classList.toggle('dock-bottom', pos !== 'top');

  // Anchor the dock
  if (pos === 'top') { dock.style.top = '20px'; dock.style.bottom = ''; }
  else { dock.style.bottom = '20px'; dock.style.top = ''; }
}
function hexToRGBA(hex, a) {
  const x = hex.replace('#','');
  const n = x.length === 3 ? x.split('').map(c=>c+c).join('') : x;
  const bigint = parseInt(n, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/* ===== Window system ===== */
function bringToFront(win) {
  document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
  win.style.zIndex = 100;
}

function createWindow(type) {
  const id = `${type}-window`;
  const existing = document.getElementById(id);
  if (existing) { bringToFront(existing); return existing; }

  const win = document.createElement('div');
  win.className = 'window';
  win.id = id;

  // Spawn below a top-dock if needed
  const baseTop = document.body.classList.contains('dock-top') ? 180 : 80;
  win.style.left = (80 + Math.random()*60) + 'px';
  win.style.top  = (baseTop + Math.random()*40) + 'px';

  win.innerHTML = `
    <div class="window-header">
      ${type.charAt(0).toUpperCase() + type.slice(1)}
      <button class="window-close" title="Close"><span>&times;</span></button>
    </div>
    <div class="window-content"></div>
  `;
  document.getElementById('desktop').appendChild(win);
  styleAccentWindow(win);
  bringToFront(win);

  // Dragging
  const header = win.querySelector('.window-header');
  let down = false, dx = 0, dy = 0;
  header.addEventListener('mousedown', e => {
    down = true; bringToFront(win);
    dx = e.clientX - win.offsetLeft; dy = e.clientY - win.offsetTop;
  });
  document.addEventListener('mousemove', e => {
    if (!down) return;
    win.style.left = (e.clientX - dx) + 'px';
    win.style.top = (e.clientY - dy) + 'px';
  });
  document.addEventListener('mouseup', () => { down = false; });

  // Close
  win.querySelector('.window-close').onclick = () => win.remove();

  // Load content
  const content = win.querySelector('.window-content');
  if (type === 'terminal') loadTerminal(content);
  else if (type === 'explorer') loadExplorer(content);
  else if (type === 'editor') loadEditor(content);
  else if (type === 'calculator') loadCalculator(content);
  else if (type === 'browser') loadBrowser(content);
  else if (type === 'settings') loadSettings(content);

  return win;
}
window.openWindow = (type) => createWindow(type);

/* ===== Simple file store (localStorage + cookie mirror) ===== */
const FILES_KEY = 'CoolOS.files';
function cookiesSet(name, value) {
  try {
    const exp = new Date(Date.now() + 365*24*3600*1000).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${exp}; path=/`;
  } catch {}
}
function cookiesGet(name) {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}
function filesLoad() {
  try {
    const raw = localStorage.getItem(FILES_KEY) || cookiesGet(FILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // defaults
  return {
    'readme.txt': 'Welcome to your files!\nEdit and it will be saved locally.',
    'script.js': "console.log('Hello from file store');",
    'style.css': "body { background:#101418; color:#cfc; }",
    'index.html': "<!doctype html><title>CoolOS</title>"
  };
}
function filesSave(obj) {
  try { localStorage.setItem(FILES_KEY, JSON.stringify(obj)); } catch {}
  try { cookiesSet(FILES_KEY, JSON.stringify(obj)); } catch {}
}
let FILES = filesLoad();

/* Helper: open editor and load a file */
function openEditorWithFile(name) {
  const win = openWindow('editor'); // ensure created/focused
  const editorWin = document.getElementById('editor-window');
  if (!editorWin) return;
  const area = editorWin.querySelector('#editorArea');
  if (!area) return;
  area.value = FILES[name] ?? '';
  editorWin.dataset.currentFile = name;
  // update title to show the file
  const header = editorWin.querySelector('.window-header');
  if (header) header.firstChild.nodeValue = 'Editor - ' + name;
}

/* ===== Apps (revised) ===== */
function loadTerminal(container) {
  container.innerHTML = `
    <div class="terminal">
      <div id="terminalOutput" class="terminal-output"></div>
      <input id="terminalInput" class="terminal-input" autocomplete="off" placeholder="Type a command...">
    </div>
  `;
  const output = container.querySelector('#terminalOutput');
  const input = container.querySelector('#terminalInput');

  const print = (s) => { output.innerHTML += '<br>' + s; output.scrollTop = output.scrollHeight; };
  const ok = (s='OK') => print(`<span style="color:#8f8">${s}</span>`);
  const err = (s='Error') => print(`<span style="color:#f88">${s}</span>`);
  const parseArgs = (s) => {
    const out = []; let cur = ''; let q = null;
    for (const ch of s.trim()) {
      if (q) { if (ch === q) { q = null; } else { cur += ch; } }
      else if (ch === '"' || ch === "'") { q = ch; }
      else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ''; } }
      else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };

  // --- Help metadata (descriptions, usage, examples) ---
  // Canonical usage strings (shown in help and help <cmd>)
  const USAGE = {
    ls: 'ls',
    find: 'find <query>',
    cat: 'cat <name>',
    head: 'head <name> [n]',
    tail: 'tail <name> [n]',
    touch: 'touch <name>',
    write: 'write <name> <text>',
    append: 'append <name> <text>',
    rm: 'rm <name>',
    mv: 'mv <old> <new>',
    cp: 'cp <src> <dst>',
    open: 'open <name>',

    app: 'app <terminal|explorer|editor|calculator|browser|settings>',
    browser: 'browser <url>',
    settings: 'settings',
    calc: 'calc',

    theme: 'theme <dark|light>',
    accent: 'accent <#rrggbb>',
    dock: 'dock <top|bottom>',
    fontsize: 'fontsize <px>',

    date: 'date',
    time: 'time',
    random: 'random [max]',
    math: 'math <expr>',
    clear: 'clear',
    history: 'history',
    about: 'about'
  };

  const HELP = {
    ls:       { usage: USAGE.ls, desc: 'List file names in the virtual storage.' },
    find:     { usage: USAGE.find, desc: 'Find files whose name contains <query> (case-insensitive).', ex: ['find txt'] },
    cat:      { usage: USAGE.cat, desc: 'Print file contents.' },
    head:     { usage: USAGE.head, desc: 'First n lines (default 10).', ex: ['head notes.txt 5'] },
    tail:     { usage: USAGE.tail, desc: 'Last n lines (default 10).', ex: ['tail log.txt 20'] },
    touch:    { usage: USAGE.touch, desc: 'Create an empty file (no overwrite).'},
    write:    { usage: USAGE.write, desc: 'Overwrite file with text. Use quotes for spaces.', ex: ['write todo.txt "buy milk"'] },
    append:   { usage: USAGE.append, desc: 'Append a new line of text.', ex: ['append todo.txt "call mom"'] },
    rm:       { usage: USAGE.rm, desc: 'Delete a file.' },
    mv:       { usage: USAGE.mv, desc: 'Rename a file.' },
    cp:       { usage: USAGE.cp, desc: 'Copy a file.' },
    open:     { usage: USAGE.open, desc: 'Open the file in the Editor window (creates if missing).', ex: ['open notes.txt'] },

    app:      { usage: USAGE.app, desc: 'Open an app window.' },
    browser:  { usage: USAGE.browser, desc: 'Open URL in Browser app (auto snapshot when blocked).', ex: ['browser example.com'] },
    settings: { usage: USAGE.settings, desc: 'Open Settings window.' },
    calc:     { usage: USAGE.calc, desc: 'Open Calculator window.' },

    theme:    { usage: USAGE.theme, desc: 'Switch overall theme.' },
    accent:   { usage: USAGE.accent, desc: 'Change accent color.', ex: ['accent #ff66cc'] },
    dock:     { usage: USAGE.dock, desc: 'Move the dock.' },
    fontsize: { usage: USAGE.fontsize, desc: 'Set base font size (10–30).', ex: ['fontsize 18'] },

    date:     { usage: USAGE.date, desc: 'Show current date.' },
    time:     { usage: USAGE.time, desc: 'Show current time.' },
    random:   { usage: USAGE.random, desc: 'Random integer in [0, max).', ex: ['random 10'] },
    math:     { usage: USAGE.math, desc: 'Evaluate a JavaScript expression.', ex: ['math (2+3)*10'] },
    clear:    { usage: USAGE.clear, desc: 'Clear the screen.' },
    history:  { usage: USAGE.history, desc: 'List recent commands. Use Arrow Up/Down to recall.' },
    about:    { usage: USAGE.about, desc: 'About this OS.' }
  };

  function printHelpSummary() {
    const sections = [
      ['Files', ['ls','find','cat','head','tail','touch','write','append','rm','mv','cp','open']],
      ['Apps & system', ['app','browser','settings','calc','theme','accent','dock','fontsize','date','time','random','math','clear','history','about']]
    ];
    let html = '<pre style="font-family:inherit;font-size:1em;margin:0;line-height:1.5em">';
    html += 'Use: help <command> for details, quotes for multi-word text, Arrow Up/Down to navigate history.\n\n';
    for (const [title, keys] of sections) {
      html += title + '\n';
      for (const k of keys) {
        const usage = USAGE[k] || HELP[k]?.usage || k;
        const desc  = HELP[k]?.desc || '';
        html += `  ${String(usage).padEnd(30)} ${desc}\n`;
      }
      html += '\n';
    }
    html += '</pre>';
    print(html);
  }
  function printHelpOne(cmd) {
    const h = HELP[cmd];
    if (!h) { err('No such command'); return; }
    const usage = USAGE[cmd] || h.usage || cmd;
    let html = '<pre style="font-family:inherit;font-size:1em;margin:0;line-height:1.6em">';
    html += `Command : ${cmd}\nUsage   : ${usage}\n`;
    if (h.desc) html += `About   : ${h.desc}\n`;
    if (h.ex && h.ex.length) {
      html += 'Example : ' + h.ex[0] + '\n';
      for (let i = 1; i < h.ex.length; i++) html += '          ' + h.ex[i] + '\n';
    }
    html += '</pre>';
    print(html);
  }
  // --- end help metadata ---

  // command history (Up/Down)
  const history = []; let hIndex = -1;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (history.length) { hIndex = Math.max(0, hIndex < 0 ? history.length - 1 : hIndex - 1); input.value = history[hIndex]; e.preventDefault(); }
    } else if (e.key === 'ArrowDown') {
      if (history.length) {
        if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex]; }
        else { hIndex = -1; input.value = ''; }
        e.preventDefault();
      }
    }
  });

  output.innerHTML = 'Welcome to Zerotrace OS!<br>Type <b>help</b> or <b>help command</b> for details.<br>';
  input.focus();

  input.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const line = input.value.trim();
    if (!line) { input.value = ''; return; }
    history.push(line); hIndex = -1;

    print(`<span style="color:#0ff">&gt; ${line}</span>`);
    const [cmd, ...restRaw] = parseArgs(line);
    const rest = restRaw;
    const restStr = restRaw.join(' ');

    try {
      if (cmd === 'help') {
        if (rest[0]) printHelpOne(rest[0]);
        else printHelpSummary();
      }

      else if (cmd === 'ls') {
        print(Object.keys(FILES).join('  '));
      }
      else if (cmd === 'find') {
        const q = restStr.toLowerCase();
        const list = Object.keys(FILES).filter(n => n.toLowerCase().includes(q));
        print(list.length ? list.join('  ') : '(no matches)');
      }
      else if (cmd === 'cat') {
        const n = rest[0]; if (!n) return err('Usage: cat <name>');
        if (FILES[n] == null) return err('Not found');
        print(`<pre style="white-space:pre-wrap;margin:0">${FILES[n].replace(/[<>&]/g,s=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[s]))}</pre>`);
      }
      else if (cmd === 'head' || cmd === 'tail') {
        const n = rest[0]; if (!n) return err(`Usage: ${cmd} <name> [lines]`);
        if (FILES[n] == null) return err('Not found');
        const k = Math.max(1, parseInt(rest[1] ?? '10', 10));
        const lines = FILES[n].split(/\r?\n/);
        const slice = cmd === 'head' ? lines.slice(0, k) : lines.slice(-k);
        print(`<pre style="white-space:pre-wrap;margin:0">${slice.join('\n').replace(/[<>&]/g,s=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[s]))}</pre>`);
      }
      else if (cmd === 'touch') {
        const n = rest[0]; if (!n) return err('Usage: touch <name>');
        if (FILES[n] == null) FILES[n] = '';
        filesSave(FILES); ok();
      }
      else if (cmd === 'write') {
        const n = rest[0]; if (!n) return err('Usage: write <name> <text>');
        const txt = rest.slice(1).join(' ');
        FILES[n] = txt; filesSave(FILES); ok();
      }
      else if (cmd === 'append') {
        const n = rest[0]; if (!n) return err('Usage: append <name> <text>');
        const txt = rest.slice(1).join(' ');
        FILES[n] = (FILES[n] ?? '') + (FILES[n] ? '\n' : '') + txt; filesSave(FILES); ok();
      }
      else if (cmd === 'rm') {
        const n = rest[0]; if (!n) return err('Usage: rm <name>');
        if (!(n in FILES)) return err('Not found');
        delete FILES[n]; filesSave(FILES); ok();
      }
      else if (cmd === 'mv') {
        const [a,b] = rest; if (!a || !b) return err('Usage: mv <old> <new>');
        if (!(a in FILES)) return err('Not found');
        if (b in FILES) return err('Destination exists');
        FILES[b] = FILES[a]; delete FILES[a]; filesSave(FILES); ok();
      }
      else if (cmd === 'cp') {
        const [a,b] = rest; if (!a || !b) return err('Usage: cp <src> <dst>');
        if (!(a in FILES)) return err('Not found');
        FILES[b] = FILES[a]; filesSave(FILES); ok();
      }

      else if (cmd === 'open') {
        const n = rest[0]; if (!n) return err('Usage: open <name>');
        if (FILES[n] == null) return err('Not found');
        openEditorWithFile(n);
      }
      else if (cmd === 'app') {
        const a = rest[0]; if (!a) return err('Usage: app <terminal|explorer|editor|calculator|browser|settings>');
        openWindow(a);
      }
      else if (cmd === 'browser') {
        const url = restStr || 'https://example.com';
        openWindow('browser');
        setTimeout(() => {
          const w = document.getElementById('browser-window');
          const inp = w?.querySelector('#browserUrl');
          const go = w?.querySelector('#goBtn');
          if (inp) { inp.value = url; go?.click(); }
        }, 0);
      }
      else if (cmd === 'settings') { openWindow('settings'); }
      else if (cmd === 'calc') { openWindow('calculator'); }

      else if (cmd === 'accent') {
        const hex = rest[0]; if (!/^#?[0-9a-f]{6}$/i.test(hex || '')) return err('Usage: accent #rrggbb');
        settings.accent = hex.startsWith('#') ? hex : ('#' + hex); saveSettings(); applyAccent(settings.accent); ok();
      }
      else if (cmd === 'dock') {
        const pos = (rest[0]||'').toLowerCase(); if (!['top','bottom'].includes(pos)) return err('Usage: dock <top|bottom>');
        settings.dockPosition = pos; saveSettings(); applyDockPosition(pos); ok(`dock set to ${pos}`);
      }
      else if (cmd === 'fontsize') {
        const px = parseInt(rest[0] || '', 10); if (!px || px < 10 || px > 30) return err('Usage: fontsize <10..30>');
        settings.fontSize = px; saveSettings(); applyFontSize(px); ok(`font size ${px}px`);
      }

      else if (cmd === 'clear') { output.innerHTML = ''; }
      else if (cmd === 'date') { print(new Date().toLocaleDateString()); }
      else if (cmd === 'time') { print(new Date().toLocaleTimeString()); }
      else if (cmd === 'theme') {
        const theme = (rest[0]||'').toLowerCase();
        if (theme === 'dark' || theme === 'light') { settings.theme = theme; saveSettings(); applyTheme(theme); ok(`theme ${theme}`); }
        else err('Usage: theme dark|light');
      }
      else if (cmd === 'random') {
        const max = Math.max(1, parseInt(rest[0] || '1000000', 10));
        print(String(Math.floor(Math.random() * max)));
      }
      else if (cmd === 'math') {
        const expr = restStr;
        try { const result = eval(expr); print(String(result)); } catch { err('Math error'); }
      }
      else if (cmd === 'about') { print('ZeroTrace Web OS © 2025'); }
      else if (cmd === 'history') {
        if (!history.length) print('(empty)'); else history.forEach((h, i) => print(`${i+1}. ${h}`));
      }
      else {
        print('Unknown command. Type "help" for a list of commands.');
      }
    } finally {
      input.value = '';
      output.scrollTop = output.scrollHeight;
    }
  };
}

function loadExplorer(container) {
  container.innerHTML = `
    <div class="explorer">
      <div class="explorer-header">Explorer</div>
      <ul id="fileList"></ul>
    </div>
  `;
  const ul = container.querySelector('#fileList');
  ul.innerHTML = '';
  Object.keys(FILES).forEach(name => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.textContent = name;
    li.dataset.name = name;
    li.onclick = () => openEditorWithFile(name);
    ul.appendChild(li);
  });
}

function loadEditor(container) {
  container.innerHTML = `
    <div class="editor">
      <textarea id="editorArea" spellcheck="false" placeholder="// start typing..."></textarea>
    </div>
  `;
  const editorWin = container.closest('.window');
  const area = container.querySelector('#editorArea');
  // If opened from Explorer, window has dataset.currentFile set by openEditorWithFile
  const name = editorWin?.dataset.currentFile || 'untitled.txt';
  if (!FILES[name]) FILES[name] = '';
  area.value = FILES[name];
  // Save on input
  area.addEventListener('input', () => {
    const fileName = editorWin?.dataset.currentFile || 'untitled.txt';
    FILES[fileName] = area.value;
    filesSave(FILES);
  });
}

function loadCalculator(container) {
  container.innerHTML = `
    <div class="calc-scale">
      <div class="calc-ui">
        <div class="calc">
          <input id="calcDisplay" class="calc-display" disabled value="0">
          <div id="calcButtons" class="calc-grid">
            <button class="calc-btn">7</button><button class="calc-btn">8</button><button class="calc-btn">9</button><button class="calc-btn op">÷</button>
            <button class="calc-btn">4</button><button class="calc-btn">5</button><button class="calc-btn">6</button><button class="calc-btn op">×</button>
            <button class="calc-btn">1</button><button class="calc-btn">2</button><button class="calc-btn">3</button><button class="calc-btn op">−</button>
            <button class="calc-btn">0</button><button class="calc-btn">.</button><button class="calc-btn equals">=</button><button class="calc-btn op">+</button>
            <button class="calc-btn danger" data-clear style="grid-column:1 / -1">C</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Uniform scale in both axes (preserves design ratio 320x420)
  const wrap = container.querySelector('.calc-scale');
  const stage = container.querySelector('.calc-ui');
  const BASE_W = 320, BASE_H = 420;

  const rescale = () => {
    const W = wrap.clientWidth || 1;
    // compute ideal height from width (aspect-ratio), clamp to available content height
    const parentH = container.clientHeight || BASE_H;
    let H = W * (BASE_H / BASE_W);
    if (H > parentH) { H = parentH; }
    // set wrapper height so width growth also grows height
    wrap.style.height = H + 'px';
    const s = Math.min(W / BASE_W, H / BASE_H);
    stage.style.transform = `translateX(-50%) scale(${s})`;
  };

  const ro1 = new ResizeObserver(rescale);
  ro1.observe(wrap);
  const ro2 = new ResizeObserver(rescale);
  ro2.observe(container);

  // Calculator logic (unchanged)
  let val = '';
  const display = container.querySelector('#calcDisplay');
  const buttons = Array.from(container.querySelectorAll('#calcButtons button'));
  const update = () => display.value = val || '0';
  const input = (v) => {
    if (v === '.') {
      const parts = val.split(/[-+*/]/);
      if (parts.at(-1)?.includes('.')) return update();
      if (val === '' || /[+\-*/]$/.test(val)) val += '0';
    }
    if (v === '0') {
      const parts = val.split(/[-+*/]/);
      if (parts.at(-1) === '0') return update();
    }
    if ('+-*/'.includes(v) && (val === '' || /[+\-*/.]$/.test(val))) return update();
    val += v; update();
  };
  const evalNow = () => {
    let expr = val.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-');
    if (/\/0(?![0-9.])/.test(expr)) { display.value='Err: ÷0'; val=''; return; }
    try { let r = eval(expr); if (!isFinite(r)) throw 0; val = r+''; update(); }
    catch { display.value='Err'; val=''; }
  };
  const clear = () => { val=''; update(); };
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.textContent;
      if (btn.dataset.clear != null) return clear();
      if (t === '=') return evalNow();
      input(t.replace('÷','/').replace('×','*').replace('−','-'));
    });
  });

  update();
  rescale();
}

function loadBrowser(container) {
  container.innerHTML = `
    <div class="browser">
      <div class="urlbar">
        <input id="browserUrl" placeholder="Enter URL...">
        <button id="goBtn" class="primary-btn">Go</button>
      </div>
      <div class="quickbar">
        <button data-url="self">This OS</button>
        <button data-url="https://example.com">Example</button>
        <button data-url="https://httpbingo.org/html">HTTPBingo</button>
        <button data-url="https://neverssl.com">NeverSSL</button>
        <button data-url="https://lite.cnn.com">CNN Lite</button>
        <!-- Big sites (GitHub/YouTube) will auto-fallback to snapshot when blocked -->
        <button data-url="https://github.com">GitHub (auto snapshot)</button>
        <button data-url="https://youtube.com">YouTube (auto snapshot)</button>
      </div>
      <iframe id="browserFrame" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
      <div id="browserMsg" style="color:#ff9b9b;display:none;margin-top:-2px;"></div>
    </div>
  `;

  const urlInput = container.querySelector('#browserUrl');
  const frame = container.querySelector('#browserFrame');
  const msg = container.querySelector('#browserMsg');

  let currentUrl = '';

  const openSnapshot = async (url) => {
    // Read-only snapshot through a public text proxy (no JS; bypasses frame-ancestors)
    const proxy = 'https://r.jina.ai/http://' + url.replace(/^https?:\/\//i, '');
    try {
      const html = await fetch(proxy, { mode: 'cors' }).then(r => r.text());
      frame.srcdoc = `<!doctype html><base href="${url}"><meta charset="utf-8">${html}`;
      msg.style.display = 'none';
    } catch {
      msg.innerHTML = `Blocked and snapshot failed. <a href="${url}" target="_blank" rel="noopener">Open in new tab</a>`;
      msg.style.display = 'block';
    }
  };

  const go = (raw) => {
    let url = (raw ?? urlInput.value).trim();
    if (url === 'self') url = location.href;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch {
      frame.srcdoc = '<p style="color:red;padding:8px">Invalid URL</p>';
      frame.removeAttribute('src'); msg.style.display='none'; return;
    }
    currentUrl = url;
    urlInput.value = url;
    msg.style.display = 'none';
    frame.removeAttribute('srcdoc');
    frame.src = url;
  };

  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  container.querySelector('#goBtn').onclick = () => go();
  container.querySelectorAll('.quickbar button').forEach(b => b.onclick = () => go(b.dataset.url));

  frame.addEventListener('load', () => {
    // If the site blocks framing, reading contentDocument will throw; fallback to snapshot automatically
    try {
      void frame.contentDocument;               // access test
      msg.style.display = 'none';
    } catch {
      openSnapshot(currentUrl);                 // auto snapshot fallback
    }
  });
}

/* ===== Settings window (styled) ===== */
function loadSettings(container) {
  container.innerHTML = `
    <h3 style="margin:0 0 10px 0">Settings</h3>
    <div class="settings-grid">
      <label for="themeSelect">Theme</label>
      <select id="themeSelect">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>

      <label for="accentColor">Accent color</label>
      <input id="accentColor" type="color">

      <label for="fontSize">Font size</label>
      <div>
        <input id="fontSize" type="range" min="12" max="20" step="1">
        <span id="fontSizeVal" style="margin-left:8px;"></span>
      </div>

      <label for="reduceMotion">Reduce motion</label>
      <input id="reduceMotion" type="checkbox">

      <label for="dockPos">Dock position</label>
      <select id="dockPos">
        <option value="bottom">Bottom</option>
        <option value="top">Top</option>
      </select>

      <label for="defaultApp">Default app</label>
      <select id="defaultApp">
        <option value="terminal">Terminal</option>
        <option value="explorer">Explorer</option>
        <option value="editor">Editor</option>
        <option value="calculator">Calculator</option>
        <option value="browser">Browser</option>
        <option value="settings">Settings</option>
      </select>
    </div>
    <p class="settings-note">Changes apply immediately. Default app is used on next load.</p>
  `;
  const selTheme = container.querySelector('#themeSelect');
  const inpAccent = container.querySelector('#accentColor');
  const rngFont = container.querySelector('#fontSize');
  const lblFont = container.querySelector('#fontSizeVal');
  const chkMotion = container.querySelector('#reduceMotion');
  const selDock = container.querySelector('#dockPos');
  const selDefault = container.querySelector('#defaultApp');

  selTheme.value = settings.theme ?? 'dark';
  inpAccent.value = settings.accent ?? '#33aaff';
  rngFont.value = settings.fontSize ?? 16;
  lblFont.textContent = (settings.fontSize ?? 16) + 'px';
  chkMotion.checked = !!settings.reduceMotion;
  selDock.value = settings.dockPosition ?? 'bottom';
  selDefault.value = settings.defaultApp ?? 'terminal';

  selTheme.onchange = () => { settings.theme = selTheme.value; applyTheme(settings.theme); saveSettings(); };
  inpAccent.oninput = () => { settings.accent = inpAccent.value; applyAccent(settings.accent); saveSettings(); };
  rngFont.oninput = () => { settings.fontSize = parseInt(rngFont.value,10); lblFont.textContent = settings.fontSize + 'px'; applyFontSize(settings.fontSize); saveSettings(); };
  chkMotion.onchange = () => { settings.reduceMotion = chkMotion.checked; applyReduceMotion(settings.reduceMotion); saveSettings(); };
  selDock.onchange = () => { settings.dockPosition = selDock.value; applyDockPosition(settings.dockPosition); saveSettings(); };
  selDefault.onchange = () => { settings.defaultApp = selDefault.value; saveSettings(); };

  const win = container.closest('.window');
  if (win) bringToFront(win);
}

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  applyAllSettings();                               // applies dock position
  // Ensure body has a class on first load
  document.body.classList.toggle('dock-top', settings.dockPosition === 'top');
  document.body.classList.toggle('dock-bottom', settings.dockPosition !== 'top');
});
window.onload = () => {
  openWindow(settings?.defaultApp || 'terminal');
};

// Dock click pulse (no layout change)
(() => {
  const dock = document.getElementById('dock');
  if (!dock) return;
  dock.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.dock-app');
    if (!item) return;
    item.classList.remove('pulsing');
    // restart animation
    void item.offsetWidth;
    item.classList.add('pulsing');
    setTimeout(() => item.classList.remove('pulsing'), 500);
  });
})();

