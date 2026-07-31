(() => {
  const CFG = /*__CONFIG__*/;
  const SN = CFG.skinnyNote || {};
  const ICON_CFG = SN.icon || { mode: 'legacy' };
  const LINE_CFG = SN.titleBarLines || { enabled: false };
  const ABOUT_CFG = SN.about || {};
  const WATERMARK_CFG = SN.editorWatermark || {};
  const PREVIEW_MODE = !!CFG._preview;
  const HOST_ID = `jives-retro-editor-${CFG.id}-host`;
  const existing = document.getElementById(HOST_ID);
  if (existing && existing.__jivesRetroEditor) {
    existing.__jivesRetroEditor.toggle();
    return;
  }

  const STORAGE_DRAFT = `jives-retro-editor:${CFG.id}:draft`;
  const STORAGE_UI = `jives-retro-editor:${CFG.id}:ui:v2`;
  const safeStore = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) {}
    }
  };

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = [
    'all:initial',
    'position:fixed',
    PREVIEW_MODE ? 'top:10px' : 'top:72px',
    PREVIEW_MODE ? 'right:10px' : 'right:24px',
    PREVIEW_MODE ? 'width:calc(100% - 20px)' : 'width:420px',
    PREVIEW_MODE ? 'height:calc(100% - 20px)' : 'height:320px',
    'min-width:280px',
    'min-height:190px',
    'z-index:2147483647',
    'overflow:hidden',
    'display:block',
    'box-sizing:border-box',
    'touch-action:auto'
  ].join(';');
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const c = CFG.colors;
  const safeText = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const productName = safeText(CFG.productName || CFG.name || 'SkinnyNote');
  const aboutSubtitle = safeText(ABOUT_CFG.subtitle || 'Compact browser text editor');
  const aboutCopyright = safeText(ABOUT_CFG.copyright || 'Copyright © 2026 Jives');
  function buildLineCss(lines) {
    if (!lines || !lines.enabled) return '';
    const mode = lines.mode === 'full' ? 'full' : 'gap';
    const line = lines.lineColor || c.titleFg || '#000';
    const gap = lines.gapColor || c.titleBg || '#fff';
    const linePx = Math.max(1, Math.min(12, Number(lines.lineThickness) || 2));
    const gapPx = Math.max(0, Math.min(16, Number(lines.gapThickness) || 2));
    const cycle = linePx + gapPx;
    const pattern = lines.startWithGap
      ? `repeating-linear-gradient(to bottom,${gap} 0 ${gapPx}px,${line} ${gapPx}px ${cycle}px)`
      : `repeating-linear-gradient(to bottom,${line} 0 ${linePx}px,${gap} ${linePx}px ${cycle}px)`;
    const plate = lines.titlePlateColor || c.titleBg || gap;
    const about = lines.applyToAbout !== false;
    if (mode === 'full') {
      return `.titlebar{position:relative}.title-lines{display:block;position:absolute;inset:0;background:${pattern};pointer-events:none;z-index:0}.titlebar>.icon,.titlebar>.title,.titlebar>.controls{position:relative;z-index:1}.titlebar>.title{background:${plate};padding-left:4px;padding-right:4px}` +
        (about ? `.abouttitle{position:relative}.about-lines{display:block;position:absolute;inset:0;background:${pattern};pointer-events:none;z-index:0}.abouttitle>span,.abouttitle>.caption{position:relative;z-index:1}.abouttitle>span{background:${plate};padding-left:4px;padding-right:4px}` : '');
    }
    return `.title-lines{display:block;order:2;flex:1 1 auto;align-self:stretch;min-width:8px;background:${pattern};pointer-events:none}.titlebar>.title{order:1;flex:0 1 auto}.titlebar>.controls{order:3}` +
      (about ? `.about-lines{display:block;order:2;flex:1 1 auto;align-self:stretch;min-width:8px;background:${pattern};pointer-events:none}.abouttitle>span{order:1;flex:0 1 auto}.abouttitle>.caption{order:3}` : '');
  }
  const structuredLineCss = buildLineCss(LINE_CFG);
  shadow.innerHTML = `
    <style>
      :host{
        --panel:${c.panel};--panel2:${c.panel2};--button:${c.button};--title-bg:${c.titleBg};--title-fg:${c.titleFg};
        --editor-bg:${c.editorBg};--editor-fg:${c.editorFg};--status-bg:${c.statusBg};--status-fg:${c.statusFg};--menu-fg:${c.menuFg || c.statusFg};--about-bg:${c.aboutBg || c.panel};--about-fg:${c.aboutFg || c.statusFg};--about-button-fg:${c.aboutButtonFg || c.statusFg};
        --menu-hover-bg:${c.menuHoverBg};--menu-hover-fg:${c.menuHoverFg};--menu-active-bg:${c.menuActiveBg || c.menuHoverBg || c.button};--menu-active-fg:${c.menuActiveFg || c.menuHoverFg || c.menuFg || c.statusFg};--selection-bg:${c.selectionBg};--selection-fg:${c.selectionFg};
        --hi:${c.hi};--mid:${c.mid};--dark:${c.dark};--deep:${c.deep};--frame-bg:${c.frameBg};--grip:${c.grip};
        font-family:${CFG.uiFont};font-size:13px;color:var(--editor-fg);line-height:1.15;color-scheme:light
      }
      *{box-sizing:border-box}
      button,textarea{font:inherit;color:inherit}
      button{-webkit-appearance:none;appearance:none}
      .window{width:100%;height:100%;display:grid;grid-template-rows:24px 26px minmax(0,1fr) 28px;background:var(--panel);padding:3px;box-shadow:inset -2px -2px var(--deep),inset 2px 2px var(--hi),inset -4px -4px var(--dark),inset 4px 4px var(--mid);-webkit-user-select:none;user-select:none;overflow:hidden}
      .titlebar{min-width:0;display:flex;align-items:center;gap:5px;padding:2px 3px 2px 5px;color:var(--title-fg);background:var(--title-bg);font-weight:700;letter-spacing:.2px;cursor:move;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}
      .icon{width:15px;height:17px;background:var(--editor-bg);border:1px solid var(--deep);box-shadow:inset 2px 0 var(--dark);position:relative;flex:0 0 auto;transform:rotate(-4deg)}
      .icon:before{content:"";position:absolute;left:4px;right:2px;top:4px;height:1px;background:var(--editor-fg);box-shadow:0 3px var(--editor-fg),0 6px var(--editor-fg);opacity:.65}
      .title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
      .title-lines,.about-lines{display:none}
      .icon.custom-icon{display:grid!important;place-items:center;transform:none;background-color:transparent!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;border:0!important;box-shadow:none!important;font-weight:700;line-height:1;overflow:hidden}
      .icon.custom-icon:before{display:none!important}
      .controls{display:flex;align-items:center;gap:2px;margin-left:auto;height:20px}
      .caption{--p:0px;position:relative;display:block;width:22px;height:19px;padding:0;border:0;background:var(--button);color:var(--deep)!important;-webkit-text-fill-color:var(--deep)!important;box-shadow:inset -1px -1px var(--deep),inset 1px 1px var(--hi),inset -2px -2px var(--dark),inset 2px 2px var(--mid);cursor:default;touch-action:manipulation}
      .caption:active{--p:1px;box-shadow:inset 1px 1px var(--deep),inset -1px -1px var(--hi)}
      .minimize:before{content:"";position:absolute;left:calc(50% + var(--p));top:calc(12px + var(--p));width:10px;height:2px;background:var(--deep);transform:translateX(-50%)}
      .maximize:before{content:"";position:absolute;left:calc(50% + var(--p));top:calc(50% + var(--p));width:10px;height:9px;border:2px solid var(--deep);transform:translate(-50%,-50%)}
      .close:before,.close:after{content:"";position:absolute;left:calc(50% + var(--p));top:calc(50% + var(--p));width:12px;height:2px;background:var(--deep);transform-origin:center}
      .close:before{transform:translate(-50%,-50%) rotate(45deg)}
      .close:after{transform:translate(-50%,-50%) rotate(-45deg)}
      .menubar{min-width:0;display:flex;align-items:flex-start;padding:2px 4px 0;position:relative;color:var(--menu-fg)}
      .menuwrap{position:relative}
      .menubtn{border:1px solid transparent;background:transparent;padding:3px 7px 4px;cursor:default;touch-action:manipulation;color:inherit}
      .menubtn:hover,.menubtn.open{border-color:var(--hi) var(--dark) var(--dark) var(--hi);background:var(--menu-active-bg);color:var(--menu-active-fg)}
      .menu{position:absolute;display:none;top:24px;left:0;min-width:190px;padding:3px;background:var(--panel);color:var(--menu-fg);z-index:8;box-shadow:inset -1px -1px var(--deep),inset 1px 1px var(--hi),inset -2px -2px var(--dark),inset 2px 2px var(--mid)}
      .menu.show{display:block}
      .item{width:100%;border:0;background:transparent;text-align:left;padding:5px 22px 5px 24px;position:relative;white-space:nowrap;cursor:default;touch-action:manipulation;color:inherit}
      .item:hover{background:var(--menu-hover-bg);color:var(--menu-hover-fg)}
      .item .shortcut{float:right;margin-left:24px}
      .sep{height:2px;margin:3px 2px;border-top:1px solid var(--dark);border-bottom:1px solid var(--hi)}
      .check:before{content:"✓";position:absolute;left:7px;font-weight:700}
      .editorframe{position:relative;min-width:0;min-height:0;overflow:hidden;margin:0 4px 3px;padding:3px;background:var(--frame-bg);box-shadow:inset 2px 2px var(--dark),inset -1px -1px var(--hi),inset 3px 3px var(--deep)}
      .editor-watermark{display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1;pointer-events:none;-webkit-user-select:none;user-select:none;background-repeat:no-repeat;background-position:center;background-size:contain;place-items:center;font-weight:700;line-height:1;overflow:hidden}
      textarea{display:block;width:100%;height:100%;min-width:0;min-height:0;resize:none;border:0;outline:0;background:var(--editor-bg)!important;color:var(--editor-fg)!important;-webkit-text-fill-color:var(--editor-fg)!important;opacity:1!important;text-shadow:none!important;-webkit-appearance:none;appearance:none;padding:6px;line-height:1.38;font-family:${CFG.editorFont};font-size:15px;font-weight:${CFG.editorWeight};-webkit-font-smoothing:auto;text-rendering:optimizeLegibility;-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default;touch-action:auto;white-space:pre;overflow:auto;-webkit-overflow-scrolling:touch;caret-color:var(--editor-fg)}
      textarea::selection,textarea:focus::selection{background-color:var(--selection-bg)!important;color:var(--selection-fg)!important;-webkit-text-fill-color:var(--selection-fg)!important;text-shadow:none!important}
      textarea::-moz-selection,textarea:focus::-moz-selection{background-color:var(--selection-bg)!important;color:var(--selection-fg)!important;text-shadow:none!important}
      .selection-mirror{position:absolute;display:none;overflow:hidden;pointer-events:none;z-index:4;background:transparent;color:transparent;-webkit-user-select:none;user-select:none}
      .selection-mirror-content{position:absolute;left:0;top:0;margin:0;border:0;background:transparent;color:transparent;box-sizing:border-box;transform-origin:0 0}
      .selection-mirror .selected{background-color:var(--selection-bg)!important;color:var(--selection-fg)!important;-webkit-text-fill-color:var(--selection-fg)!important;text-shadow:none!important}
      .editorframe.selection-visible .selection-mirror{display:block}
      .status{min-width:0;margin:0 4px 4px;display:flex;align-items:center;padding:0 5px 0 7px;background:var(--status-bg);color:var(--status-fg);box-shadow:inset 1px 1px var(--dark),inset -1px -1px var(--hi);white-space:nowrap;overflow:hidden}
      .status .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
      .chars{margin-left:8px}
      .grip{width:18px;height:18px;margin-left:5px;flex:0 0 auto;cursor:nwse-resize;touch-action:none;background:repeating-linear-gradient(135deg,transparent 0 3px,var(--grip) 3px 5px);clip-path:polygon(100% 0,100% 100%,0 100%)}
      .hidden{display:none!important}
      .modalbackdrop{position:absolute;inset:3px;z-index:30;display:grid;place-items:center;padding:10px;background:rgba(0,0,0,.12);touch-action:manipulation}
      .aboutbox{width:min(340px,calc(100% - 8px));background:var(--panel);padding:3px;color:var(--about-fg);box-shadow:inset -2px -2px var(--deep),inset 2px 2px var(--hi),inset -4px -4px var(--dark),inset 4px 4px var(--mid)}
      .abouttitle{height:24px;display:flex;align-items:center;padding:2px 3px 2px 6px;background:var(--title-bg);color:var(--title-fg);font-weight:700}
      .abouttitle span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .abouttitle .caption{width:22px;height:19px;flex:0 0 auto}
      .aboutbody{min-height:150px;padding:28px 18px 16px;text-align:center;color:var(--about-fg);background:var(--about-bg)}
      .aboutlogo{display:none;margin:0 auto 12px;background-size:contain;background-repeat:no-repeat;background-position:center;place-items:center;font-weight:700;line-height:1;overflow:hidden}
      .aboutlogo.show{display:grid}
      .aboutname{font-size:22px;line-height:1.1;margin-bottom:10px;color:inherit}
      .abouttype{font-size:13px;margin-bottom:24px;opacity:.76}
      .aboutcopy{font-size:13px;margin-bottom:22px}
      .winbutton{min-width:82px;height:34px;border:0;background:var(--button);color:var(--about-button-fg)!important;-webkit-text-fill-color:var(--about-button-fg)!important;padding:2px 14px;box-shadow:inset -2px -2px var(--deep),inset 2px 2px var(--hi),inset -4px -4px var(--dark),inset 4px 4px var(--mid);touch-action:manipulation}
      .winbutton:active{padding:3px 13px 1px 15px;box-shadow:inset 2px 2px var(--deep),inset -2px -2px var(--hi)}
      .winbutton:focus-visible{outline:1px dotted currentColor;outline-offset:-7px}
      .window.minimized{grid-template-rows:24px;padding-bottom:3px}
      .window.minimized .menubar,.window.minimized .editorframe,.window.minimized .status{display:none}
      ${CFG.extraCss || ''}
      .aboutbody{background:var(--about-bg)!important}
      .menubtn:hover,.menubtn.open{background:var(--menu-active-bg)!important;color:var(--menu-active-fg)!important;-webkit-text-fill-color:var(--menu-active-fg)!important}
      .editorframe.watermark-enabled{background:var(--editor-bg)!important}
      .editorframe.watermark-enabled .editor-watermark{display:grid}
      .editorframe.watermark-enabled textarea{position:relative;z-index:2;background:transparent!important}
      ${structuredLineCss}
      @media(max-width:500px){:host{font-size:12px}.menu{min-width:175px}}
    </style>
    <div class="window">
      <div class="titlebar">
        <span class="icon" aria-hidden="true"></span>
        <span class="title">untitled.txt - ${productName}</span>
        <span class="title-lines" aria-hidden="true"></span>
        <span class="controls">
          <button class="caption minimize" title="Minimize" aria-label="Minimize"></button>
          <button class="caption maximize" title="Maximize" aria-label="Maximize"></button>
          <button class="caption close" title="Close" aria-label="Close"></button>
        </span>
      </div>
      <div class="menubar">
        <div class="menuwrap">
          <button class="menubtn" data-menu="file">File</button>
          <div class="menu" data-panel="file">
            <button class="item" data-action="new">New <span class="shortcut">Ctrl+N</span></button>
            <button class="item" data-action="open">Open... <span class="shortcut">Ctrl+O</span></button>
            <div class="sep"></div>
            <button class="item" data-action="save">Save <span class="shortcut">Ctrl+S</span></button>
            <button class="item" data-action="saveas">Save As...</button>
            <div class="sep"></div>
            <button class="item" data-action="close">Close</button>
          </div>
        </div>
        <div class="menuwrap">
          <button class="menubtn" data-menu="edit">Edit</button>
          <div class="menu" data-panel="edit">
            <button class="item" data-action="undo">Undo <span class="shortcut">Ctrl+Z</span></button>
            <button class="item" data-action="redo">Redo <span class="shortcut">Ctrl+Y</span></button>
            <div class="sep"></div>
            <button class="item" data-action="cut">Cut <span class="shortcut">Ctrl+X</span></button>
            <button class="item" data-action="copy">Copy <span class="shortcut">Ctrl+C</span></button>
            <button class="item" data-action="paste">Paste <span class="shortcut">Ctrl+V</span></button>
            <button class="item" data-action="selectall">Select All <span class="shortcut">Ctrl+A</span></button>
          </div>
        </div>
        <div class="menuwrap">
          <button class="menubtn" data-menu="view">View</button>
          <div class="menu" data-panel="view">
            <button class="item check" data-action="wrap">Word Wrap</button>
            <button class="item" data-action="smaller">Smaller Text</button>
            <button class="item" data-action="larger">Larger Text</button>
            <button class="item" data-action="resetview">Reset Size</button>
          </div>
        </div>
        <div class="menuwrap">
          <button class="menubtn" data-menu="help">Help</button>
          <div class="menu" data-panel="help">
            <button class="item" data-action="about">About ${productName}</button>
          </div>
        </div>
      </div>
      <div class="editorframe"><div class="editor-watermark" aria-hidden="true"></div><textarea spellcheck="false" wrap="off" aria-label="Text editor"></textarea><div class="selection-mirror" aria-hidden="true"><div class="selection-mirror-content"><span class="mirror-before"></span><span class="selected"></span><span class="mirror-after"></span></div></div></div>
      <div class="status"><span class="grow">Ln 1, Col 1</span><span class="chars">0 chars</span><span class="grip" title="Resize"></span></div>
      <div class="modalbackdrop hidden" aria-hidden="true">
        <section class="aboutbox" role="dialog" aria-modal="true" aria-labelledby="jives-about-title-${CFG.id}">
          <div class="abouttitle">
            <span id="jives-about-title-${CFG.id}">About ${productName}</span>
            <span class="about-lines" aria-hidden="true"></span>
            <button class="caption close about-close" title="Close" aria-label="Close"></button>
          </div>
          <div class="aboutbody">
            <div class="aboutlogo" aria-hidden="true"></div>
            <div class="aboutname">${productName}</div>
            <div class="abouttype">${aboutSubtitle}</div>
            <div class="aboutcopy">${aboutCopyright}</div>
            <button class="winbutton about-ok" type="button">OK</button>
          </div>
        </section>
      </div>
      <input class="hidden fileinput" type="file" accept="text/*,.txt,.md,.json,.js,.css,.html,.xml,.csv">
    </div>`;

  const $ = selector => shadow.querySelector(selector);
  const $$ = selector => [...shadow.querySelectorAll(selector)];
  const win = $('.window');
  const titleIcon = $('.icon');
  const aboutLogo = $('.aboutlogo');
  const titlebar = $('.titlebar');
  const title = $('.title');
  const editorframe = $('.editorframe');
  const editorWatermark = $('.editor-watermark');
  const textarea = $('textarea');
  const selectionMirror = $('.selection-mirror');
  const selectionMirrorContent = $('.selection-mirror-content');
  const mirrorBefore = $('.mirror-before');
  const mirrorSelected = $('.selection-mirror .selected');
  const mirrorAfter = $('.mirror-after');
  const forceSelectionMirror = CFG.id === 'perfect-blue' || CFG.id === 'star-blue' || CFG.id === 'green-terminal' || CFG.id === 'amigados-blue';
  const status = $('.status .grow');
  const chars = $('.chars');
  const grip = $('.grip');
  const aboutBackdrop = $('.modalbackdrop');
  const aboutClose = $('.about-close');
  const aboutOK = $('.about-ok');
  const fileInput = $('.fileinput');

  function applyIcon(target, isAbout) {
    if (!target) return;
    const mode = ICON_CFG.mode || 'legacy';
    const visible = isAbout ? !!ICON_CFG.showInAbout : ICON_CFG.showInTitleBar !== false;
    if (!visible || mode === 'none') {
      target.style.display = 'none';
      return;
    }
    if (mode === 'legacy' && !isAbout) return;
    if (mode === 'legacy' && isAbout) {
      target.style.display = 'none';
      return;
    }
    const size = Math.max(12, Math.min(isAbout ? 96 : 32, Number(ICON_CFG.size) || (isAbout ? 56 : 18)));
    target.classList.add(isAbout ? 'show' : 'custom-icon');
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    target.style.fontSize = `${Math.max(10, Math.round(size * .72))}px`;
    if (mode === 'image' && typeof ICON_CFG.dataUrl === 'string' && ICON_CFG.dataUrl.startsWith('data:image/')) {
      target.style.backgroundImage = `url(${JSON.stringify(ICON_CFG.dataUrl).slice(1,-1)})`;
      target.textContent = '';
    } else {
      target.style.backgroundImage = 'none';
      target.textContent = String(ICON_CFG.text || 'N').slice(0, 3);
    }
  }
  applyIcon(titleIcon, false);
  applyIcon(aboutLogo, true);

  function applyEditorWatermark() {
    if (!editorWatermark) return;
    const enabled = !!WATERMARK_CFG.enabled;
    const mode = ICON_CFG.mode || 'legacy';
    const validImage = mode === 'image' && typeof ICON_CFG.dataUrl === 'string' && ICON_CFG.dataUrl.startsWith('data:image/');
    const validText = mode === 'text' && String(ICON_CFG.text || '').trim();
    const visible = enabled && (validImage || validText);
    editorframe.classList.toggle('watermark-enabled', visible);
    editorWatermark.style.backgroundImage = 'none';
    editorWatermark.textContent = '';
    if (!visible) return;
    const size = Math.max(10, Math.min(90, Number(WATERMARK_CFG.size) || 46));
    const opacity = Math.max(0, Math.min(100, Number(WATERMARK_CFG.opacity) || 18)) / 100;
    editorWatermark.style.width = `${size}%`;
    editorWatermark.style.height = `${size}%`;
    editorWatermark.style.opacity = String(opacity);
    if (validImage) {
      editorWatermark.style.backgroundImage = `url(${JSON.stringify(ICON_CFG.dataUrl).slice(1,-1)})`;
    } else {
      editorWatermark.textContent = String(ICON_CFG.text || 'N').slice(0, 3);
      editorWatermark.style.fontSize = `${Math.max(28, Math.round(size * 2.8))}px`;
      editorWatermark.style.color = c.editorFg || '#000';
    }
  }
  applyEditorWatermark();

  const aborter = new AbortController();
  const signal = aborter.signal;

  let filename = 'untitled.txt';
  let dirty = false;
  let fileHandle = null;
  let minimized = false;
  let maximized = false;
  let previousRect = null;
  let wordWrap = true;
  const defaultFontSize = Number.isFinite(CFG.defaultFontSize) ? CFG.defaultFontSize : 15;
  let fontSize = defaultFontSize;
  let autosaveTimer = 0;
  let interaction = null;
  let aboutOpen = false;
  let focusGuardUntil = 0;
  let selectionMirrorRAF = 0;

  function requestSelectionMirror() {
    if (!forceSelectionMirror || selectionMirrorRAF) return;
    selectionMirrorRAF = requestAnimationFrame(updateSelectionMirror);
  }

  function updateSelectionMirror() {
    selectionMirrorRAF = 0;
    if (!forceSelectionMirror) return;
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : 0;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : start;
    const visible = shadow.activeElement === textarea && end > start && !aboutOpen && host.style.display !== 'none';
    editorframe.classList.toggle('selection-visible', visible);
    if (!visible) return;

    const style = getComputedStyle(textarea);
    selectionMirror.style.left = `${textarea.offsetLeft}px`;
    selectionMirror.style.top = `${textarea.offsetTop}px`;
    selectionMirror.style.width = `${textarea.offsetWidth}px`;
    selectionMirror.style.height = `${textarea.offsetHeight}px`;

    const copied = [
      'fontFamily','fontSize','fontWeight','fontStyle','fontVariant','fontStretch',
      'lineHeight','letterSpacing','wordSpacing','textAlign','textIndent','textTransform',
      'paddingTop','paddingRight','paddingBottom','paddingLeft','tabSize'
    ];
    copied.forEach(property => { selectionMirrorContent.style[property] = style[property]; });
    selectionMirrorContent.style.width = `${textarea.clientWidth}px`;
    selectionMirrorContent.style.minHeight = `${Math.max(textarea.clientHeight, textarea.scrollHeight)}px`;
    selectionMirrorContent.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
    selectionMirrorContent.style.overflowWrap = wordWrap ? 'break-word' : 'normal';
    selectionMirrorContent.style.wordBreak = wordWrap ? 'break-word' : 'normal';
    selectionMirrorContent.style.transform = `translate3d(${-textarea.scrollLeft}px,${-textarea.scrollTop}px,0)`;

    mirrorBefore.textContent = textarea.value.slice(0, start);
    mirrorSelected.textContent = textarea.value.slice(start, end);
    mirrorAfter.textContent = textarea.value.slice(end);
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(safeStore.get(key)) ?? fallback; } catch (_) { return fallback; }
  }

  const savedDraft = readJSON(STORAGE_DRAFT, null);
  if (savedDraft && typeof savedDraft.text === 'string') {
    textarea.value = savedDraft.text;
    filename = savedDraft.filename || filename;
    dirty = !!savedDraft.dirty;
  }

  const savedUI = PREVIEW_MODE ? null : readJSON(STORAGE_UI, null);
  if (savedUI) {
    if (Number.isFinite(savedUI.left)) { host.style.left = `${savedUI.left}px`; host.style.right = 'auto'; }
    if (Number.isFinite(savedUI.top)) host.style.top = `${savedUI.top}px`;
    if (Number.isFinite(savedUI.width)) host.style.width = `${Math.max(280, savedUI.width)}px`;
    if (Number.isFinite(savedUI.height)) host.style.height = `${Math.max(190, savedUI.height)}px`;
    if (Number.isFinite(savedUI.fontSize) && savedUI.fontRevision === CFG.fontRevision) fontSize = Math.min(28, Math.max(10, savedUI.fontSize));
    if (typeof savedUI.wordWrap === 'boolean') wordWrap = savedUI.wordWrap;
  }

  function applyView() {
    textarea.style.fontSize = `${fontSize}px`;
    textarea.wrap = wordWrap ? 'soft' : 'off';
    textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
    $('[data-action="wrap"]').classList.toggle('check', wordWrap);
    requestSelectionMirror();
  }

  function updateTitle() {
    title.textContent = `${dirty ? '*' : ''}${filename} - ${CFG.productName}`;
  }

  function updateStatus() {
    const before = textarea.value.slice(0, textarea.selectionStart);
    const lines = before.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    const selected = Math.abs(textarea.selectionEnd - textarea.selectionStart);
    status.textContent = `Ln ${line}, Col ${col}${selected ? ` | ${selected} selected` : ''}`;
    chars.textContent = `${textarea.value.length} chars`;
    requestSelectionMirror();
  }

  function saveDraft() {
    safeStore.set(STORAGE_DRAFT, JSON.stringify({ text: textarea.value, filename, dirty }));
  }

  function saveUI() {
    if (maximized || minimized || interaction) return;
    const rect = host.getBoundingClientRect();
    if (PREVIEW_MODE) return;
    safeStore.set(STORAGE_UI, JSON.stringify({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      fontSize,
      fontRevision: CFG.fontRevision,
      wordWrap
    }));
  }

  function scheduleSaveUI() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveUI, 180);
  }

  function markDirty(value = true) {
    dirty = value;
    updateTitle();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 250);
  }

  function closeMenus() {
    $$('.menu').forEach(menu => menu.classList.remove('show'));
    $$('.menubtn').forEach(button => button.classList.remove('open'));
  }

  function toggleMenu(name, button) {
    const panel = $(`[data-panel="${name}"]`);
    const willShow = !panel.classList.contains('show');
    closeMenus();
    if (willShow) {
      panel.classList.add('show');
      button.classList.add('open');
    }
  }

  function viewportSize() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function fitToViewport() {
    if (maximized || minimized || interaction) return;
    const viewport = viewportSize();
    const rect = host.getBoundingClientRect();
    const width = Math.min(rect.width, Math.max(280, viewport.width - 8));
    const height = Math.min(rect.height, Math.max(190, viewport.height - 8));
    if (width !== rect.width) host.style.width = `${width}px`;
    if (height !== rect.height) host.style.height = `${height}px`;
  }

  function placeOnScreen() {
    if (maximized || interaction) return;
    const rect = host.getBoundingClientRect();
    const viewport = viewportSize();
    const maxLeft = Math.max(4, viewport.width - rect.width - 4);
    const maxTop = Math.max(4, viewport.height - rect.height - 4);
    const left = Math.min(Math.max(4, rect.left), maxLeft);
    const top = Math.min(Math.max(4, rect.top), maxTop);
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
    host.style.right = 'auto';
  }

  function focusEditor() {
    if (aboutOpen || host.style.display === 'none') return;
    try { textarea.focus({ preventScroll: true }); } catch (_) { textarea.focus(); }
  }

  function guardEditorFocus(duration = 900) {
    focusGuardUntil = performance.now() + duration;
    queueMicrotask(() => {
      if (performance.now() < focusGuardUntil && shadow.activeElement !== textarea && !aboutOpen) focusEditor();
    });
    requestAnimationFrame(() => {
      if (performance.now() < focusGuardUntil && shadow.activeElement !== textarea && !aboutOpen) focusEditor();
    });
  }

  function showAbout() {
    closeMenus();
    aboutOpen = true;
    aboutBackdrop.classList.remove('hidden');
    aboutBackdrop.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => aboutOK.focus());
  }

  function hideAbout() {
    if (!aboutOpen) return;
    aboutOpen = false;
    aboutBackdrop.classList.add('hidden');
    aboutBackdrop.setAttribute('aria-hidden', 'true');
    focusEditor();
  }

  function newDocument() {
    if (dirty && !confirm('Discard the current unsaved text?')) return;
    textarea.value = '';
    filename = 'untitled.txt';
    fileHandle = null;
    dirty = false;
    updateTitle();
    updateStatus();
    saveDraft();
    focusEditor();
  }

  async function openWithPicker() {
    if (dirty && !confirm('Discard the current unsaved text?')) return;
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md', '.json', '.js', '.css', '.html', '.xml', '.csv'] } }]
        });
        fileHandle = handles[0];
        const file = await fileHandle.getFile();
        textarea.value = await file.text();
        filename = file.name || 'untitled.txt';
        dirty = false;
        updateTitle();
        updateStatus();
        saveDraft();
        focusEditor();
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    fileInput.value = '';
    fileInput.click();
  }

  function cleanFilename(name) {
    const value = (name || 'untitled.txt').trim().replace(/[\\/:*?"<>|]+/g, '_');
    return value.includes('.') ? value : `${value}.txt`;
  }

  function downloadText(name) {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanFilename(name);
    link.style.display = 'none';
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function saveDocument(saveAs = false) {
    if (!saveAs && fileHandle && fileHandle.createWritable) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(textarea.value);
        await writable.close();
        dirty = false;
        updateTitle();
        saveDraft();
        return;
      } catch (_) {}
    }

    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: cleanFilename(filename),
          types: [{ description: 'Text file', accept: { 'text/plain': ['.txt'] } }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(textarea.value);
        await writable.close();
        filename = fileHandle.name || filename;
        dirty = false;
        updateTitle();
        saveDraft();
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }

    let chosen = filename;
    if (saveAs || filename === 'untitled.txt') chosen = prompt('File name:', filename) || filename;
    filename = cleanFilename(chosen);
    downloadText(filename);
    dirty = false;
    updateTitle();
    saveDraft();
  }

  async function clipboardAction(action) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    try {
      if (action === 'copy') await navigator.clipboard.writeText(selected);
      if (action === 'cut') {
        await navigator.clipboard.writeText(selected);
        textarea.setRangeText('', start, end, 'start');
        markDirty();
      }
      if (action === 'paste') {
        const text = await navigator.clipboard.readText();
        textarea.setRangeText(text, start, end, 'end');
        markDirty();
      }
    } catch (_) {
      focusEditor();
      document.execCommand(action);
      if (action !== 'copy') markDirty();
    }
    focusEditor();
    updateStatus();
  }

  function toggleMinimize() {
    minimized = !minimized;
    win.classList.toggle('minimized', minimized);
    if (minimized) {
      previousRect = previousRect || host.getBoundingClientRect();
      host.style.height = '30px';
      host.style.minHeight = '30px';
    } else {
      host.style.minHeight = '190px';
      if (previousRect) host.style.height = `${Math.max(190, previousRect.height)}px`;
      placeOnScreen();
      focusEditor();
    }
  }

  function toggleMaximize() {
    if (minimized) toggleMinimize();
    maximized = !maximized;
    if (maximized) {
      previousRect = host.getBoundingClientRect();
      host.style.left = '6px';
      host.style.top = '6px';
      host.style.right = 'auto';
      host.style.width = 'calc(100vw - 12px)';
      host.style.height = 'calc(100vh - 12px)';
    } else if (previousRect) {
      host.style.left = `${previousRect.left}px`;
      host.style.top = `${previousRect.top}px`;
      host.style.width = `${previousRect.width}px`;
      host.style.height = `${previousRect.height}px`;
      placeOnScreen();
    }
  }

  function finishInteraction(event) {
    if (!interaction) return;
    if (event && event.pointerId !== undefined && event.pointerId !== interaction.pointerId) return;
    const target = interaction.target;
    const pointerId = interaction.pointerId;
    interaction = null;
    try { target.releasePointerCapture(pointerId); } catch (_) {}
    placeOnScreen();
    saveUI();
  }

  function closeEditor() {
    if (dirty && !confirm(`Close ${CFG.productName} with unsaved text?`)) return;
    saveDraft();
    finishInteraction();
    saveUI();
    aborter.abort();
    host.remove();
  }

  async function runAction(action) {
    closeMenus();
    if (action === 'new') newDocument();
    if (action === 'open') await openWithPicker();
    if (action === 'save') await saveDocument(false);
    if (action === 'saveas') await saveDocument(true);
    if (action === 'close') closeEditor();
    if (action === 'undo' || action === 'redo') { focusEditor(); document.execCommand(action); markDirty(); }
    if (['cut', 'copy', 'paste'].includes(action)) await clipboardAction(action);
    if (action === 'selectall') { focusEditor(); textarea.select(); updateStatus(); }
    if (action === 'wrap') { wordWrap = !wordWrap; applyView(); saveUI(); }
    if (action === 'smaller') { fontSize = Math.max(10, fontSize - 1); applyView(); saveUI(); }
    if (action === 'larger') { fontSize = Math.min(28, fontSize + 1); applyView(); saveUI(); }
    if (action === 'resetview') {
      host.style.width = '420px';
      host.style.height = '320px';
      fontSize = 15;
      wordWrap = true;
      applyView();
      placeOnScreen();
      saveUI();
    }
    if (action === 'about') showAbout();
  }

  $$('.menubtn').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      toggleMenu(button.dataset.menu, button);
    });
  });

  $$('.item').forEach(item => item.addEventListener('click', () => runAction(item.dataset.action)));
  aboutClose.addEventListener('click', hideAbout);
  aboutOK.addEventListener('click', hideAbout);
  $('.minimize').addEventListener('click', toggleMinimize);
  $('.maximize').addEventListener('click', toggleMaximize);
  $('.close').addEventListener('click', closeEditor);
  titlebar.addEventListener('dblclick', event => {
    if (!event.target.closest('.controls')) toggleMaximize();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    textarea.value = await file.text();
    filename = file.name || 'untitled.txt';
    fileHandle = null;
    dirty = false;
    updateTitle();
    updateStatus();
    saveDraft();
    focusEditor();
  });

  textarea.addEventListener('input', () => { markDirty(); updateStatus(); });
  ['click', 'keyup', 'select', 'focus', 'touchend', 'pointerup'].forEach(type => textarea.addEventListener(type, updateStatus));
  textarea.addEventListener('selectionchange', updateStatus);
  textarea.addEventListener('scroll', requestSelectionMirror, { passive: true });
  textarea.addEventListener('blur', () => {
    editorframe.classList.remove('selection-visible');
    if (selectionMirrorRAF) cancelAnimationFrame(selectionMirrorRAF);
    selectionMirrorRAF = 0;
  });

  shadow.addEventListener('keydown', async event => {
    event.stopPropagation();
    if (aboutOpen) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        hideAbout();
      }
      return;
    }
    if (event.composedPath().includes(textarea)) guardEditorFocus();
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier) {
      if (event.key === 'Escape') closeMenus();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); await saveDocument(event.shiftKey); }
    if (key === 'o') { event.preventDefault(); await openWithPicker(); }
    if (key === 'n') { event.preventDefault(); newDocument(); }
  });

  ['keyup', 'keypress', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'paste', 'cut', 'copy', 'focusin', 'focusout', 'click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(type => {
    shadow.addEventListener(type, event => event.stopPropagation());
  });

  textarea.addEventListener('pointerdown', () => {
    focusGuardUntil = performance.now() + 1200;
    setTimeout(focusEditor, 0);
  });
  textarea.addEventListener('touchstart', () => {
    focusGuardUntil = performance.now() + 1200;
    setTimeout(focusEditor, 0);
  }, { passive: true });
  textarea.addEventListener('beforeinput', () => guardEditorFocus(1200));
  textarea.addEventListener('compositionstart', () => guardEditorFocus(1800));
  textarea.addEventListener('compositionupdate', () => guardEditorFocus(1800));

  document.addEventListener('focusin', event => {
    if (performance.now() >= focusGuardUntil || aboutOpen || host.style.display === 'none') return;
    if (!event.composedPath().includes(host)) requestAnimationFrame(focusEditor);
  }, { capture: true, signal });

  function beginInteraction(type, event, target) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = host.getBoundingClientRect();
    interaction = {
      type,
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    try { target.setPointerCapture(event.pointerId); } catch (_) {}
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
  }

  titlebar.addEventListener('pointerdown', event => {
    if (event.target.closest('.controls') || maximized) return;
    beginInteraction('move', event, titlebar);
  });

  grip.addEventListener('pointerdown', event => {
    if (minimized || maximized) return;
    beginInteraction('resize', event, grip);
  });

  window.addEventListener('pointermove', event => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    if (event.cancelable) event.preventDefault();
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    const viewport = viewportSize();

    if (interaction.type === 'move') {
      const maxLeft = Math.max(4, viewport.width - interaction.width - 4);
      const maxTop = Math.max(4, viewport.height - interaction.height - 4);
      host.style.left = `${Math.min(Math.max(4, interaction.left + dx), maxLeft)}px`;
      host.style.top = `${Math.min(Math.max(4, interaction.top + dy), maxTop)}px`;
      host.style.right = 'auto';
    } else {
      const maxWidth = Math.max(280, viewport.width - interaction.left - 4);
      const maxHeight = Math.max(190, viewport.height - interaction.top - 4);
      host.style.width = `${Math.min(Math.max(280, interaction.width + dx), maxWidth)}px`;
      host.style.height = `${Math.min(Math.max(190, interaction.height + dy), maxHeight)}px`;
    }
  }, { capture: true, passive: false, signal });

  window.addEventListener('pointerup', finishInteraction, { capture: true, signal });
  window.addEventListener('pointercancel', finishInteraction, { capture: true, signal });
  titlebar.addEventListener('lostpointercapture', finishInteraction);
  grip.addEventListener('lostpointercapture', finishInteraction);
  window.addEventListener('blur', () => finishInteraction(), { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishInteraction();
  }, { signal });

  document.addEventListener('pointerdown', event => {
    if (!event.composedPath().includes(host)) closeMenus();
  }, { signal });

  window.addEventListener('resize', () => {
    if (shadow.activeElement === textarea || interaction) return;
    fitToViewport();
    placeOnScreen();
    scheduleSaveUI();
    requestSelectionMirror();
  }, { signal });

  host.__jivesRetroEditor = {
    toggle() {
      if (host.style.display === 'none') {
        host.style.display = 'block';
        placeOnScreen();
        focusEditor();
        requestSelectionMirror();
      } else {
        host.style.display = 'none';
        editorframe.classList.remove('selection-visible');
      }
    }
  };

  applyView();
  updateTitle();
  updateStatus();
  fitToViewport();
  placeOnScreen();
  if (!CFG._preview) focusEditor();
})();