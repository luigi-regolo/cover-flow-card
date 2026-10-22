/*
 * Cover Flow Card — development version 0 (not a published release)
 * Copyright (c) 2026 luigi-regolo
 * SPDX-License-Identifier: GPL-3.0-only
 */
(() => {
  'use strict';

  const CARD_TAG = 'cover-flow-card';
  const EDITOR_TAG = 'cover-flow-card-editor';
  const EMERALD = '#0E6B52';
  const FEATURES = Object.freeze({ OPEN: 1, CLOSE: 2, SET_POSITION: 4, STOP: 8 });
  const THEMES = ['auto', 'light', 'dark'];
  const MAX_COVERS = 24;
  const ENTITY_PATTERN = /^cover\.[a-z0-9_]+$/;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function normalizeConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Cover Flow Card: invalid card configuration.');
    }
    // The initial single-cover test format is migrated when it is encountered.
    const requested = Array.isArray(config.entities) ? config.entities :
      (config.entity ? [{ entity: config.entity, name: config.name }] : []);
    if (requested.length > MAX_COVERS) throw new Error('Cover Flow Card: too many cover entities.');
    const seen = new Set();
    const entities = requested.map(item => {
      const entity = typeof item === 'string' ? item.trim() : String(item?.entity ?? '').trim();
      if (!ENTITY_PATTERN.test(entity) || seen.has(entity)) {
        throw new Error('Cover Flow Card: invalid or duplicate cover entity.');
      }
      seen.add(entity);
      return { entity, name: String(typeof item === 'string' ? '' : (item?.name ?? '')).trim().slice(0, 70) };
    });
    return {
      entities,
      eyebrow: String(config.eyebrow ?? 'CONTROLLO TAPPARELLA').trim().slice(0, 60),
      theme: THEMES.includes(config.theme) ? config.theme : 'auto'
    };
  }

  function positionFromState(state) {
    const raw = state?.attributes?.current_position;
    if (raw === null || raw === undefined || raw === '') return null;
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number) : null;
  }

  function supported(state, feature) {
    const flags = Number(state?.attributes?.supported_features);
    return Number.isInteger(flags) && (flags & feature) === feature;
  }

  function displayState(state, position) {
    if (!state) return 'Entità non trovata';
    switch (state.state) {
      case 'unavailable': return 'Non disponibile';
      case 'unknown': return 'Stato sconosciuto';
      case 'opening': return 'In apertura';
      case 'closing': return 'In chiusura';
      case 'closed': return 'Chiusa';
      case 'open':
        if (position === 100) return 'Completamente aperta';
        if (position === 0) return 'Chiusa';
        if (position !== null) return 'Aperta parzialmente';
        return 'Aperta';
      default: return 'Stato sconosciuto';
    }
  }

  const chevron = (direction) => direction === 'up'
    ? '<path d="M12 19V5m-6 6 6-6 6 6"/>'
    : '<path d="M12 5v14m-6-6 6 6 6-6"/>';

  const CARD_CSS = `
    :host{display:block;min-width:0;container-type:inline-size;color:var(--cf-text);font-family:var(--ha-font-family-body,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);font-size:14px}
    :host([data-theme="light"]){--cf-bg:#ffffff;--cf-surface:#f1f3ef;--cf-text:#19221e;--cf-muted:#68716c;--cf-line:#e3e7e2;--cf-graphic:#d5e9de;--cf-slat:#d3dbd5;--cf-slat-edge:#9ea9a1;--cf-ctrl:#fff}
    :host([data-theme="dark"]){--cf-bg:#202221;--cf-surface:#181a19;--cf-text:#f7f5f0;--cf-muted:#c6cac7;--cf-line:#343735;--cf-graphic:#47675e;--cf-slat:#4c5650;--cf-slat-edge:#252d28;--cf-ctrl:#303431}
    :host{--cf-accent:var(--edera-emerald-color,${EMERALD})}
    *,*::before,*::after{box-sizing:border-box}
    .cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:12px;align-items:start;min-width:0}
    .cf-cell{container-type:inline-size;min-width:0;max-width:410px}
    .cf-shell{border:1px solid var(--cf-line);border-radius:26px;background:var(--cf-bg);padding:17px;min-width:0;overflow:hidden}
    .cf-eyebrow{font-size:10px;font-weight:750;letter-spacing:1.5px;color:var(--cf-muted);line-height:1.3;text-transform:uppercase;margin:1px 0 7px}
    .cf-header{display:flex;justify-content:space-between;align-items:center;gap:11px;margin-bottom:15px}
    .cf-title{font-size:23px;line-height:1.2;letter-spacing:-.6px;font-weight:760;min-width:0;overflow-wrap:anywhere}
    .cf-title:after{content:"";display:inline-block;vertical-align:middle;width:6px;height:6px;border-radius:50%;background:var(--cf-accent);margin-left:7px}
    .cf-orb{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:50%;background:var(--cf-surface)}
    .cf-icon{display:block;width:22px;height:22px}
    .cf-well{border-radius:20px;background:var(--cf-surface);padding:15px;min-width:0}
    .cf-hero{display:flex;align-items:center;gap:19px;min-height:121px}
    .cf-window{position:relative;width:92px;height:118px;flex:none;overflow:hidden;border:5px solid var(--cf-bg);border-radius:11px;background:linear-gradient(155deg,#eef4e8 0%,var(--cf-graphic) 100%);box-shadow:0 1px 3px #00000010}
    .cf-window:after{content:"";position:absolute;left:50%;bottom:0;width:1px;height:53%;background:#647d7029}
    .cf-shade{position:absolute;z-index:1;top:0;left:0;right:0;height:var(--cf-closed,38%);background:repeating-linear-gradient(to bottom,var(--cf-slat) 0px,var(--cf-slat) 8px,var(--cf-slat-edge) 9px,var(--cf-slat) 11px);box-shadow:0 3px 7px #1524192b;transition:height 130ms ease}
    .cf-window.unknown{background:var(--cf-line)}.cf-window.unknown .cf-shade{height:0!important}
    .cf-window-bottom{position:absolute;bottom:0;left:0;right:0;height:4px;background:#9db1a2}
    .cf-metric{min-width:0;flex:1}.cf-metric-label{display:block;font-weight:720;letter-spacing:1.2px;color:var(--cf-muted);font-size:10px;margin-bottom:4px}
    .cf-value{font-size:44px;font-weight:770;line-height:1.12;letter-spacing:-1.8px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .cf-value .cf-percent{font-size:23px;color:var(--cf-accent);margin-left:2px}
    .cf-state{font-size:11px;color:var(--cf-muted);line-height:1.4;margin-top:5px;overflow-wrap:anywhere;min-height:16px}
    .cf-slider{display:block;appearance:none;-webkit-appearance:none;width:100%;height:28px;background:transparent;cursor:pointer;margin:11px 0 0;accent-color:var(--cf-accent);touch-action:none}
    .cf-slider::-webkit-slider-runnable-track{height:7px;border-radius:20px;background:linear-gradient(to right,var(--cf-accent) 0%,var(--cf-accent) var(--cf-progress,0%),var(--cf-line) var(--cf-progress,0%),var(--cf-line) 100%)}
    .cf-slider::-moz-range-track{height:7px;border-radius:20px;background:var(--cf-line)}
    .cf-slider::-moz-range-progress{height:7px;border-radius:20px;background:var(--cf-accent)}
    .cf-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-7.5px;background:var(--cf-accent);border:4px solid var(--cf-bg);box-shadow:0 1px 5px #0004;border-radius:50%}
    .cf-slider::-moz-range-thumb{width:14px;height:14px;border:4px solid var(--cf-bg);background:var(--cf-accent);box-shadow:0 1px 5px #0004;border-radius:50%}
    .cf-slider:disabled{cursor:not-allowed;opacity:.45}
    .cf-slider:focus-visible,.cf-actions button:focus-visible{outline:2px solid var(--cf-accent);outline-offset:2px}
    .cf-ends{display:flex;justify-content:space-between;gap:8px;color:var(--cf-muted);font-size:10px;line-height:1.3;margin-top:2px}
    .cf-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
    .cf-actions button{appearance:none;font:inherit;font-size:12px;font-weight:680;display:flex;gap:7px;align-items:center;justify-content:center;min-width:0;min-height:46px;border:1px solid var(--cf-line);border-radius:14px;color:var(--cf-text);background:var(--cf-ctrl);cursor:pointer;padding:8px 5px}
    .cf-actions button[data-action="open"]{background:var(--cf-accent);color:#fff;border-color:var(--cf-accent)}
    .cf-actions button:disabled{opacity:.44;cursor:not-allowed}.cf-actions button:not(:disabled):active{transform:scale(.98)}
    .cf-actions svg{width:16px;height:16px;flex:none}
    .cf-message{margin-top:10px;font-size:11px;color:var(--cf-muted);line-height:1.4}.cf-message.error{color:var(--edera-alert-color,#b85d55)}
    .cf-empty{padding:15px;font-size:12px;line-height:1.5;border-radius:15px;background:var(--cf-surface);color:var(--cf-muted)}
    @container(max-width:355px){.cf-shell{padding:13px;border-radius:22px}.cf-well{padding:12px}.cf-title{font-size:21px}.cf-hero{gap:13px}.cf-window{width:79px;height:105px}.cf-value{font-size:38px}.cf-actions{gap:6px}.cf-actions button{gap:5px}}
    @container(max-width:275px){.cf-hero{gap:9px}.cf-window{width:65px;height:93px}.cf-title{font-size:19px}.cf-value{font-size:33px}.cf-actions button{font-size:11px;padding:6px 3px}}
    @media(prefers-reduced-motion:reduce){.cf-shade{transition:none}}
  `;

  const EDITOR_CSS = `
    :host{display:block;min-width:0;font:14px var(--ha-font-family-body,Roboto,-apple-system,sans-serif);color:var(--primary-text-color,#19221e)}
    *{box-sizing:border-box}.cf-edit{padding:5px 0 12px}.cf-intro{color:var(--secondary-text-color,#68716c);font-size:12px;line-height:1.5;margin:0 0 20px}
    .cf-field{display:block;margin:15px 0}.cf-label{font-size:13px;font-weight:650;display:block;margin:0 0 8px}.cf-input,.cf-select{width:100%;min-height:46px;padding:10px 12px;border:1px solid var(--divider-color,#dfe4df);border-radius:12px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#19221e);font:inherit}
    .cf-input:focus-visible,.cf-select:focus-visible{outline:2px solid var(--edera-emerald-color,${EMERALD});outline-offset:2px}.cf-small{font-size:11px;line-height:1.5;color:var(--secondary-text-color,#68716c);margin-top:6px}
    ha-selector{display:block;width:100%;--mdc-theme-primary:var(--edera-emerald-color,${EMERALD})}
    .cf-native{display:block}.cf-fallback{display:none}.cf-edit.no-selector .cf-native{display:none}.cf-edit.no-selector .cf-fallback{display:block}
    .cf-list{display:flex;flex-direction:column;gap:10px;margin:16px 0}.cf-item{padding:12px;border-radius:15px;border:1px solid var(--divider-color,#dfe4df);background:var(--secondary-background-color,#f1f3ef)}
    .cf-itemhead{display:flex;align-items:center;gap:8px;min-width:0}.cf-itemhead strong{font-size:13px;flex:1;overflow-wrap:anywhere}.cf-tools{display:flex;gap:6px}
    .cf-btn{min-height:39px;min-width:39px;padding:7px 10px;border:1px solid var(--divider-color,#dfe4df);border-radius:12px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#19221e);font:inherit;cursor:pointer}.cf-btn.primary{background:var(--edera-emerald-color,#0e6b52);border-color:transparent;color:#fff;padding:10px 17px}.cf-btn:disabled{opacity:.43;cursor:not-allowed}.cf-btn:focus-visible{outline:2px solid var(--edera-emerald-color,#0e6b52);outline-offset:2px}
    .cf-error{font-size:12px;color:var(--error-color,#b85d55);margin-top:8px}
  `;

  class CoverFlowCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._cfg = normalizeConfig({});
      this._hass = null;
      this._draggingEntity = null;
      this._pending = new Map();
      this._errors = new Map();
      this._signature = '';
      this._onClick = this._onClick.bind(this);
      this._onInput = this._onInput.bind(this);
      this._onChange = this._onChange.bind(this);
    }

    static getStubConfig() { return { entities: [], theme: 'auto' }; }
    static getConfigElement() { return document.createElement(EDITOR_TAG); }
    getCardSize() { return Math.max(4, Math.ceil(this._cfg.entities.length / 2) * 4); }

    connectedCallback() {
      this.shadowRoot.addEventListener('click', this._onClick);
      this.shadowRoot.addEventListener('input', this._onInput);
      this.shadowRoot.addEventListener('change', this._onChange);
      this._render();
    }
    disconnectedCallback() {
      this.shadowRoot.removeEventListener('click', this._onClick);
      this.shadowRoot.removeEventListener('input', this._onInput);
      this.shadowRoot.removeEventListener('change', this._onChange);
    }

    setConfig(config) {
      this._cfg = normalizeConfig(config);
      const ids = new Set(this._cfg.entities.map(item => item.entity));
      for (const id of this._errors.keys()) if (!ids.has(id)) this._errors.delete(id);
      this._signature = '';
      this._render();
    }

    set hass(value) {
      this._hass = value;
      const states = this._cfg.entities.map(item => {
        const state = value?.states?.[item.entity];
        return [item.entity, state?.state, state?.attributes?.current_position,
          state?.attributes?.supported_features, state?.attributes?.friendly_name];
      });
      const sig = JSON.stringify([this._cfg, states, this._resolvedTheme()]);
      if (this._signature !== sig) {
        this._signature = sig;
        this._render();
      }
    }

    _resolvedTheme() {
      if (this._cfg.theme !== 'auto') return this._cfg.theme;
      const dark = this._hass?.themes?.darkMode;
      if (typeof dark === 'boolean') return dark ? 'dark' : 'light';
      return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    _state(entity) { return this._hass?.states?.[entity]; }
    _ready(state) {
      return !!state && ['open', 'closed', 'opening', 'closing'].includes(state.state);
    }

    _renderCover(item) {
      const entity = item.entity;
      const state = this._state(entity);
      const ready = this._ready(state);
      const pos = ready ? positionFromState(state) : null;
      const title = item.name || state?.attributes?.friendly_name || entity;
      const busy = this._pending.has(entity);
      const sliderAvailable = ready && !busy && pos !== null && supported(state, FEATURES.SET_POSITION);
      const isDisabled = feature => !ready || !supported(state, feature) || (busy && feature !== FEATURES.STOP);
      const message = state && ready && pos === null ? 'Posizione non fornita dal dispositivo. Usa i comandi disponibili.' : '';
      const value = pos === null ? '—' : String(pos);
      const error = this._errors.get(entity) || '';
      return `<div class="cf-cell"><section class="cf-shell" data-entity="${escapeHtml(entity)}" aria-label="Controllo tapparella ${escapeHtml(title)}">
          <div class="cf-eyebrow">${escapeHtml(this._cfg.eyebrow)}</div>
          <div class="cf-header">
            <div class="cf-title">${escapeHtml(title)}</div>
            <div class="cf-orb" aria-hidden="true"><svg class="cf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 8h16M4 11h16M4 14h16M4 17h16"/></svg></div>
          </div>
          <div class="cf-well">
            <div class="cf-hero">
              <div class="cf-window${pos === null ? ' unknown' : ''}" style="--cf-closed:${pos === null ? 0 : 100 - pos}%" aria-hidden="true"><div class="cf-shade"></div><div class="cf-window-bottom"></div></div>
              <div class="cf-metric"><span class="cf-metric-label">APERTURA</span><div class="cf-value"><span data-value>${value}</span>${pos === null ? '' : '<span class="cf-percent">%</span>'}</div><div class="cf-state" data-state role="status">${escapeHtml(displayState(state, pos))}</div></div>
            </div>
            <input class="cf-slider" type="range" min="0" max="100" step="1" value="${pos ?? 0}" style="--cf-progress:${pos ?? 0}%" aria-label="Imposta apertura ${escapeHtml(title)}" ${sliderAvailable ? '' : 'disabled'}>
            <div class="cf-ends"><span>Chiusa · 0%</span><span>Aperta · 100%</span></div>
          </div>
          <div class="cf-actions">
            <button type="button" data-action="open" aria-label="Apri ${escapeHtml(title)}" ${isDisabled(FEATURES.OPEN) ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${chevron('up')}</svg>Apri</button>
            <button type="button" data-action="stop" aria-label="Ferma ${escapeHtml(title)}" ${isDisabled(FEATURES.STOP) ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="5.5" width="13" height="13" rx="2"/></svg>Stop</button>
            <button type="button" data-action="close" aria-label="Chiudi ${escapeHtml(title)}" ${isDisabled(FEATURES.CLOSE) ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${chevron('down')}</svg>Chiudi</button>
          </div>
          ${message ? `<div class="cf-message">${escapeHtml(message)}</div>` : ''}
          ${error ? `<div class="cf-message error" role="alert">${escapeHtml(error)}</div>` : ''}
        </section></div>`;
    }

    _render() {
      if (this._draggingEntity) return;
      this.setAttribute('data-theme', this._resolvedTheme());
      if (this._cfg.entities.length === 0) {
        this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><div class="cf-shell"><div class="cf-eyebrow">COVER FLOW CARD</div><div class="cf-title">Tapparelle</div><p class="cf-empty">Aggiungi una o più entità cover nell'editor visuale per iniziare.</p></div>`;
        return;
      }
      this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><div class="cf-grid">${this._cfg.entities.map(item => this._renderCover(item)).join('')}</div>`;
    }

    _onInput(event) {
      const input = event.target.closest?.('.cf-slider');
      if (!input || input.disabled) return;
      const shell = input.closest('.cf-shell');
      if (!shell) return;
      const entity = shell.dataset.entity;
      if (!this._cfg.entities.some(item => item.entity === entity)) return;
      this._draggingEntity = entity;
      const preview = Number(input.value);
      if (!Number.isInteger(preview) || preview < 0 || preview > 100) return;
      this._errors.delete(entity);
      input.style.setProperty('--cf-progress', `${preview}%`);
      const val = shell.querySelector('[data-value]');
      const message = shell.querySelector('[data-state]');
      const shade = shell.querySelector('.cf-window');
      if (val) val.textContent = String(preview);
      if (message) message.textContent = 'Posizione desiderata';
      if (shade) shade.style.setProperty('--cf-closed', `${100 - preview}%`);
    }

    _onChange(event) {
      const input = event.target.closest?.('.cf-slider');
      if (!input || input.disabled) return;
      const shell = input.closest('.cf-shell');
      const entity = shell?.dataset.entity;
      this._draggingEntity = null;
      if (!entity || !this._cfg.entities.some(item => item.entity === entity)) return this._render();
      const requested = Math.round(Number(input.value));
      const state = this._state(entity);
      const current = positionFromState(state);
      if (this._ready(state) && supported(state, FEATURES.SET_POSITION) &&
          Number.isInteger(requested) && requested >= 0 && requested <= 100 && requested !== current) {
        void this._send(entity, 'set_cover_position', { position: requested }, FEATURES.SET_POSITION);
      } else {
        this._render();
      }
    }

    _onClick(event) {
      const button = event.target.closest?.('button[data-action]');
      if (!button || button.disabled) return;
      const entity = button.closest('.cf-shell')?.dataset.entity;
      if (!this._cfg.entities.some(item => item.entity === entity)) return;
      if (button.dataset.action === 'open') void this._send(entity, 'open_cover', {}, FEATURES.OPEN);
      if (button.dataset.action === 'stop') void this._send(entity, 'stop_cover', {}, FEATURES.STOP);
      if (button.dataset.action === 'close') void this._send(entity, 'close_cover', {}, FEATURES.CLOSE);
    }

    async _send(entity, service, data, feature) {
      const state = this._state(entity);
      if (!this._cfg.entities.some(item => item.entity === entity) ||
          !this._ready(state) || !supported(state, feature) ||
          (this._pending.has(entity) && feature !== FEATURES.STOP)) return;
      // STOP can interrupt a pending movement command, but only for its own cover.
      const operation = Symbol(service);
      this._pending.set(entity, operation);
      this._errors.delete(entity);
      this._render();
      try {
        await this._hass.callService('cover', service, { entity_id: entity, ...data });
      } catch (error) {
        if (this._pending.get(entity) === operation) {
          this._errors.set(entity, 'Comando non eseguito. Verifica il dispositivo in Home Assistant.');
        }
        console.warn('[Cover Flow Card] Cover service failed:', error);
      } finally {
        if (this._pending.get(entity) === operation) this._pending.delete(entity);
        this._render();
      }
    }
  }

  class CoverFlowEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._cfg = normalizeConfig({});
      this._hass = null;
      this._pendingEntity = '';
      this._notice = '';
    }

    connectedCallback() { this._render(); }
    set hass(value) { this._hass = value; this._updateSelector(); }
    setConfig(config) { this._cfg = normalizeConfig(config); this._render(); }

    _render() {
      if (!this.isConnected) return;
      const list = this._cfg.entities.map((item, index) => `
        <div class="cf-item" data-index="${index}">
          <div class="cf-itemhead"><strong>${escapeHtml(item.entity)}</strong>
            <div class="cf-tools">
              <button type="button" class="cf-btn" data-action="up" aria-label="Sposta in alto" title="Sposta in alto" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="cf-btn" data-action="down" aria-label="Sposta in basso" title="Sposta in basso" ${index === this._cfg.entities.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="cf-btn" data-action="remove" aria-label="Rimuovi tapparella" title="Rimuovi">×</button>
            </div>
          </div>
          <label class="cf-label" for="cf-name-${index}" style="margin-top:9px">Nome visualizzato (facoltativo)</label>
          <input id="cf-name-${index}" data-name-index="${index}" class="cf-input" maxlength="70" placeholder="Usa il nome Home Assistant" value="${escapeHtml(item.name)}">
        </div>`).join('');
      this.shadowRoot.innerHTML = `<style>${EDITOR_CSS}</style>
        <section class="cf-edit">
          <p class="cf-intro">Aggiungi fino a ${MAX_COVERS} tapparelle. Ogni dispositivo ha uno slider e comandi indipendenti, se supportati dall'entità.</p>
          <div class="cf-field">
            <label class="cf-label">Aggiungi entità cover</label>
            <div class="cf-native"><ha-selector id="cf-new-entity"></ha-selector></div>
            <div class="cf-fallback"><input id="cf-entity-fallback" class="cf-input" spellcheck="false" placeholder="cover.nome_tapparella" value="${escapeHtml(this._pendingEntity)}"></div>
          </div>
          <button type="button" class="cf-btn primary" id="cf-add" ${this._cfg.entities.length >= MAX_COVERS ? 'disabled' : ''}>+ Aggiungi tapparella</button>
          ${this._notice ? `<div class="cf-error" role="alert">${escapeHtml(this._notice)}</div>` : ''}
          <div class="cf-list">${list || '<p class="cf-small">Nessuna tapparella configurata.</p>'}</div>
          <div class="cf-field"><label class="cf-label" for="cf-eyebrow">Intestazione superiore</label><input id="cf-eyebrow" class="cf-input" maxlength="60" value="${escapeHtml(this._cfg.eyebrow)}"></div>
          <div class="cf-field"><label class="cf-label" for="cf-theme">Aspetto Edera</label><select class="cf-select" id="cf-theme"><option value="auto">Automatico</option><option value="light">Light</option><option value="dark">Graphite Dark</option></select><div class="cf-small">La card funziona anche senza installare Edera.</div></div>
        </section>`;
      this.shadowRoot.getElementById('cf-theme').value = this._cfg.theme;
      const section = this.shadowRoot.querySelector('.cf-edit');
      const nativeSelector = this.shadowRoot.getElementById('cf-new-entity');
      nativeSelector.selector = { entity: { domain: 'cover' } };
      nativeSelector.hass = this._hass;
      nativeSelector.value = this._pendingEntity || undefined;
      if (!customElements.get('ha-selector')) {
        section.classList.add('no-selector');
        customElements.whenDefined('ha-selector').then(() => {
          if (this.isConnected && this.shadowRoot.querySelector('.cf-edit') === section) {
            section.classList.remove('no-selector'); this._updateSelector();
          }
        });
      }
      nativeSelector.addEventListener('value-changed', event => {
        this._pendingEntity = String(event.detail?.value ?? '').trim();
        this._notice = '';
      });
      this.shadowRoot.getElementById('cf-entity-fallback').addEventListener('change', event => {
        this._pendingEntity = event.target.value.trim();
      });
      this.shadowRoot.getElementById('cf-add').addEventListener('click', () => {
        const entity = this._pendingEntity.trim();
        if (!ENTITY_PATTERN.test(entity)) {
          this._notice = 'Seleziona una entità cover valida.'; this._render(); return;
        }
        if (this._cfg.entities.some(item => item.entity === entity)) {
          this._notice = 'Questa tapparella è già presente.'; this._render(); return;
        }
        if (this._cfg.entities.length >= MAX_COVERS) return;
        this._pendingEntity = ''; this._notice = '';
        this._save({ entities: [...this._cfg.entities, { entity, name: '' }] });
      });
      this.shadowRoot.querySelectorAll('[data-name-index]').forEach(input => {
        input.addEventListener('change', event => {
          const index = Number(event.target.dataset.nameIndex);
          const entities = this._cfg.entities.map((item, i) => i === index ? { ...item, name: event.target.value } : item);
          this._save({ entities });
        });
      });
      this.shadowRoot.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => {
          const index = Number(button.closest('[data-index]')?.dataset.index);
          const entities = this._cfg.entities.map(item => ({ ...item }));
          if (!Number.isInteger(index) || index < 0 || index >= entities.length) return;
          if (button.dataset.action === 'remove') entities.splice(index, 1);
          if (button.dataset.action === 'up' && index > 0) [entities[index], entities[index - 1]] = [entities[index - 1], entities[index]];
          if (button.dataset.action === 'down' && index < entities.length - 1) [entities[index], entities[index + 1]] = [entities[index + 1], entities[index]];
          this._save({ entities });
        });
      });
      this.shadowRoot.getElementById('cf-eyebrow').addEventListener('change', event => this._save({ eyebrow: event.target.value }));
      this.shadowRoot.getElementById('cf-theme').addEventListener('change', event => this._save({ theme: event.target.value }));
    }

    _updateSelector() {
      const element = this.shadowRoot.getElementById('cf-new-entity');
      if (element) element.hass = this._hass;
    }

    _save(values) {
      try { this._cfg = normalizeConfig({ ...this._cfg, ...values }); }
      catch (error) { this._notice = error.message; this._render(); return; }
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this._cfg, entities: this._cfg.entities.map(item => ({ ...item })) } },
        bubbles: true, composed: true
      }));
      this._render();
    }
  }

  if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, CoverFlowEditor);
  if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, CoverFlowCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some(card => card.type === CARD_TAG)) {
    window.customCards.push({ type: CARD_TAG, name: 'Cover Flow Card',
      description: 'Edera-inspired controls for multiple Home Assistant cover entities.', preview: false });
  }
})();