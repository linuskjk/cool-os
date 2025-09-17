# CoolOS

Lightweight in‑browser “web OS”: window manager, terminal, editor, simple file store, theming, and a German hyphenation (syllabification) demo script.

## Features
- Windowed apps: Terminal, File Explorer, Editor, Browser, Calculator, Settings
- Persistent virtual files (LocalStorage)
- Theming: dark/light, accent color, dock position, base font size
- Extended terminal: command history (Arrow Up/Down), contextual help (help <command>)
- German hyphenation engine (programm.py) with many handcrafted linguistic rules

## Quick Start
1. Open the folder in VS Code or any editor.
2. Open `index.html` in a browser (or run a simple HTTP server).
3. Default app is the Terminal. Type `help`.

Optional (hyphenation script):
```
cd bwinf
python programm.py
Text: Deine Eingabe hier
```
Type or paste a sentence after `Text:` prompt.

## Terminal Commands (Summary)
Files:  
`ls` • `find <text>` • `cat <file>` • `head <file> [n]` • `tail <file> [n]`  
`touch <file>` • `write <file> <text>` • `append <file> <text>` • `rm <file>` • `mv <old> <new>` • `cp <src> <dst>` • `open <file>`

Apps & UI:  
`app <terminal|explorer|editor|calculator|browser|settings>` • `browser <url>`  
`settings` • `calc` • `theme <dark|light>` • `accent <#rrggbb>`  
`dock <top|bottom>` • `fontsize <px>`

Info / Tools:  
`date` • `time` • `random [max]` • `math <expr>` • `history` • `clear` • `about`

Help:  
`help` shows list, `help <command>` shows usage line.

## Hyphenation (programm.py)
Hand‑built rule engine (not TeX patterns). Key ideas:
- Prefix handling: ge-, be-, ent-, ver-, her-, pro-, etc. (cuts placed after full prefix)
- Special protected clusters: sch, tsch, ch, qu, ph, th, ck
- Vowel group guarding (ie, ei, au, eu, äu, ai, io) with targeted exceptions (e|x, i|e|r, etc.)
- Compound and morphology aware tweaks: keeps “tions” together (…ti-ons-…), “ungs” logic, avoids awkward splits like “prog-ram-…”, prefers “Pro-gram-mier-…”
- Numerous micro‑rules for German examples (Informationsgesellschaft, Kommunikationstechnologie, Programmiersprache, ent-schei-den…, hoch-kom-ple-xe, Op-ti-mi-e-rung, Bio-tech-no-lo-gie-platt-form)

Run:
```
python programm.py
Text: Kommunikationstechnologie Programmiersprache
```
Output: words with inserted hyphens.

## Structure
- `index.html` base shell
- `style.css` theming + layout
- `script.js` window manager, settings, terminal
- `bwinf/programm.py` hyphenation logic
- (Optional) `README.md` this file

## Customization
- Add terminal commands: edit `loadTerminal` in `script.js`
- Change defaults: `DEFAULT_SETTINGS` in `script.js`
- Adjust hyphen rules: edit `programm.py` comments + enabler/blocker sections
- Clear stored state: remove site LocalStorage in DevTools

## Development
No build step. Pure static assets. Open in any modern browser.  
Use a simple server if needed: `python -m http.server` (outside Windows UNC paths if issues).

## Notes
The hyphenation rules are heuristic and tuned for showcase examples, not exhaustive.

## License
MIT

Enjoy.
