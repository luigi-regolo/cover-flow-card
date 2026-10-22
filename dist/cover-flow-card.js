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
      // Keep the card's public name as the Edera eyebrow; migrate the original default.
      eyebrow: String(config.eyebrow === 'CONTROLLO TAPPARELLA' ? 'COVER FLOW CARD' : (config.eyebrow ?? 'COVER FLOW CARD')).trim().slice(0, 60),
      title: String(config.title ?? 'Tapparelle').trim().slice(0, 70),
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
      case 'unknown': return ''; // Position may be unknown while commands remain supported.
      case 'opening': return 'In apertura';
      case 'closing': return 'In chiusura';
      case 'closed': return 'Chiusa';
      case 'open':
        if (position === 100) return 'Completamente aperta';
        if (position === 0) return 'Chiusa';
        if (position !== null) return 'Aperta parzialmente';
        return 'Aperta';
      default: return '';
    }
  }

  const chevron = (direction) => direction === 'up'
    ? '<path d="M12 19V5m-6 6 6-6 6 6"/>'
    : '<path d="M12 5v14m-6-6 6 6 6-6"/>';

  const CARD_CSS = `
    :host{display:block;min-width:0;container-type:inline-size;color:var(--cf-text);font-family:var(--ha-font-family-body,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);font-size:14px}
    :host([data-theme="light"]){--cf-bg:#fafbf9;--cf-surface:#f0f2ef;--cf-text:#18221c;--cf-muted:#56675c;--cf-line:#e0e5df;--cf-graphic:#d5e9de;--cf-slat:#d3dbd5;--cf-slat-edge:#9ea9a1;--cf-ctrl:#fff}
    :host([data-theme="dark"]){--cf-bg:#101211;--cf-surface:#191c1a;--cf-text:#f5f7f4;--cf-muted:#bbc5bd;--cf-line:#2b302c;--cf-graphic:#47675e;--cf-slat:#4c5650;--cf-slat-edge:#252d28;--cf-ctrl:#282b29}
    :host{--cf-accent:var(--edera-emerald-color,${EMERALD})}
    *,*::before,*::after{box-sizing:border-box}
    .cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:12px;align-items:start;min-width:0}
    .cf-cell{container-type:inline-size;min-width:0;width:100%}
    .cf-shell{border:1px solid var(--cf-line);border-radius:26px;background:var(--cf-bg);padding:21px;min-width:0;overflow:hidden}
    .cf-header{min-width:0;margin:2px 4px 17px}
    .cf-eyebrow{font-size:10px;font-weight:750;letter-spacing:1.7px;color:var(--cf-muted);line-height:1.1;text-transform:uppercase;margin:0 0 7px}
    .cf-title{font-size:25px;line-height:1.14;letter-spacing:-.7px;font-weight:780;min-width:0;overflow-wrap:anywhere}
    .cf-title b{color:var(--cf-accent);font:inherit}
    .cf-well{border-radius:24px;background:var(--cf-surface);padding:19px;min-width:0}
    .cf-hero{display:flex;align-items:center;gap:24px;min-height:152px}
    .cf-window{position:relative;width:116px;height:147px;flex:none;overflow:hidden;border:5px solid var(--cf-bg);border-radius:13px;background:linear-gradient(155deg,#eef4e8 0%,var(--cf-graphic) 100%);box-shadow:0 1px 3px #00000010}
    .cf-window:after{content:"";position:absolute;left:50%;bottom:0;width:1px;height:53%;background:#647d7029}
    .cf-shade{position:absolute;z-index:1;top:0;left:0;right:0;height:var(--cf-closed,38%);background:repeating-linear-gradient(to bottom,var(--cf-slat) 0px,var(--cf-slat) 8px,var(--cf-slat-edge) 9px,var(--cf-slat) 11px);box-shadow:0 3px 7px #1524192b;transition:height 130ms ease}
    .cf-window.unknown{background:var(--cf-line)}.cf-window.unknown .cf-shade{height:0!important}
    .cf-window-bottom{position:absolute;bottom:0;left:0;right:0;height:4px;background:#9db1a2}
    .cf-metric{min-width:0;flex:1}.cf-metric-label{display:block;font-weight:720;letter-spacing:1.2px;color:var(--cf-muted);font-size:12px;margin-bottom:5px}
    .cf-value{font-size:52px;font-weight:770;line-height:1.12;letter-spacing:-1.8px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .cf-value .cf-percent{font-size:23px;color:var(--cf-accent);margin-left:2px}
    .cf-state{font-size:12px;color:var(--cf-muted);line-height:1.4;margin-top:5px;overflow-wrap:anywhere;min-height:16px}
    .cf-slider{display:block;appearance:none;-webkit-appearance:none;width:100%;height:30px;background:transparent;cursor:pointer;margin:17px 0 0;accent-color:var(--cf-accent);touch-action:none}
    .cf-slider::-webkit-slider-runnable-track{height:7px;border-radius:20px;background:linear-gradient(to right,var(--cf-accent) 0%,var(--cf-accent) var(--cf-progress,0%),var(--cf-line) var(--cf-progress,0%),var(--cf-line) 100%)}
    .cf-slider::-moz-range-track{height:7px;border-radius:20px;background:var(--cf-line)}
    .cf-slider::-moz-range-progress{height:7px;border-radius:20px;background:var(--cf-accent)}
    .cf-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-7.5px;background:var(--cf-accent);border:4px solid var(--cf-bg);box-shadow:0 1px 5px #0004;border-radius:50%}
    .cf-slider::-moz-range-thumb{width:14px;height:14px;border:4px solid var(--cf-bg);background:var(--cf-accent);box-shadow:0 1px 5px #0004;border-radius:50%}
    .cf-slider:disabled{cursor:not-allowed;opacity:.55}
    .cf-slider:disabled::-webkit-slider-thumb{background:var(--cf-muted);box-shadow:none}
    .cf-slider:disabled::-moz-range-thumb{background:var(--cf-muted);box-shadow:none}
    .cf-slider:focus-visible,.cf-actions button:focus-visible{outline:2px solid var(--cf-accent);outline-offset:2px}
    .cf-ends{display:flex;justify-content:space-between;gap:8px;color:var(--cf-muted);font-size:10px;line-height:1.3;margin-top:2px}
    .cf-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
    .cf-actions button{appearance:none;font:inherit;font-size:13px;font-weight:680;display:flex;gap:7px;align-items:center;justify-content:center;min-width:0;min-height:56px;border:1px solid var(--cf-line);border-radius:16px;color:var(--cf-text);background:var(--cf-ctrl);cursor:pointer;padding:8px 5px}
    .cf-actions button[data-action="open"]{background:var(--cf-accent);color:#fff;border-color:var(--cf-accent)}
    .cf-actions button:disabled{opacity:.44;cursor:not-allowed}.cf-actions button:not(:disabled):active{transform:scale(.98)}
    .cf-actions svg{width:16px;height:16px;flex:none}
    .cf-message{margin-top:10px;font-size:11px;color:var(--cf-muted);line-height:1.4}.cf-message.error{color:var(--edera-alert-color,#b85d55)}
    .cf-empty{padding:15px;font-size:12px;line-height:1.5;border-radius:15px;background:var(--cf-surface);color:var(--cf-muted)}
    @container(max-width:410px){.cf-shell{padding:15px;border-radius:24px}.cf-well{padding:14px}.cf-title{font-size:22px}.cf-hero{gap:14px;min-height:118px}.cf-window{width:86px;height:116px}.cf-value{font-size:41px}.cf-actions{gap:7px}.cf-actions button{gap:5px;min-height:48px;font-size:12px}}
    @container(max-width:295px){.cf-hero{gap:9px;min-height:96px}.cf-window{width:66px;height:94px}.cf-title{font-size:19px}.cf-value{font-size:33px}.cf-actions button{font-size:11px;padding:6px 3px}}
    @media(prefers-reduced-motion:reduce){.cf-shade{transition:none}}
  `;

  const EDITOR_CSS = `
    :host{display:block;min-width:0;font:var(--ha-font-size-m,14px) var(--ha-font-family-body,Roboto,Arial,sans-serif);color:var(--primary-text-color,#18221c)}
    *,*:before,*:after{box-sizing:border-box}.cf-editor{display:block}
    .cf-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
    .cf-tab{border:0;background:none;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap;font:inherit;cursor:pointer}
    .cf-tab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
    .cf-heading{font-size:21px;font-weight:500;margin:25px 0 9px}.cf-desc{color:var(--secondary-text-color,#55665a);font-size:13px;line-height:1.5;margin-bottom:24px}
    .cf-field{display:block;margin:20px 0}.cf-label{display:block;font-size:14px;margin-bottom:10px}
    .cf-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0;font:inherit}
    .cf-select{appearance:auto}.cf-small{font-size:12px;color:var(--secondary-text-color,#55665a);line-height:1.5;margin:9px 0}
    .cf-panel{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;padding:14px;margin:15px 0}
    .cf-tools{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.cf-btn{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:9px 12px;border-radius:12px;font:inherit;cursor:pointer}
    .cf-btn:disabled{opacity:.4;cursor:not-allowed}.cf-btn.danger{color:var(--error-color,#bd4b42)}
    .cf-btn.cf-remove{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;padding:0;border:1px solid var(--divider-color,#dfe5df);border-radius:50%;background:var(--secondary-background-color,#eef1ef);color:var(--secondary-text-color,#57655c);line-height:0}
    .cf-remove ha-icon{display:block;width:18px;height:18px;--mdc-icon-size:18px}
    .cf-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--divider-color,#e0e5de)}
    .cf-itemtext{flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px}.cf-id{font-size:11px;color:var(--secondary-text-color,#55665a);margin-top:3px}
    ha-selector{display:block;width:100%;--mdc-theme-primary:var(--edera-emerald-color,#0E6B52)}.cf-fallback{display:none}.cf-no-native .cf-fallback{display:block}
    details{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;margin:12px 0;overflow:hidden}
    summary{cursor:pointer;padding:16px 14px;font-weight:650;list-style:none;font-size:14px;overflow-wrap:anywhere}
    summary::-webkit-details-marker{display:none}summary:after{content:'⌄';float:right;color:var(--secondary-text-color)}details[open] summary:after{content:'⌃'}
    .cf-detailbody{padding:1px 14px 16px}.cf-notice{padding:10px 12px;color:var(--error-color,#ad433f);font-size:12px;border-radius:9px;margin-top:8px}
    .cf-input:focus-visible,.cf-btn:focus-visible,.cf-tab:focus-visible,summary:focus-visible{outline:2px solid var(--edera-emerald-color,#0E6B52);outline-offset:2px}
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

    static getStubConfig(hass, entities, entitiesFallback) {
      const eligible = [...(Array.isArray(entities) ? entities : []),
        ...(Array.isArray(entitiesFallback) ? entitiesFallback : [])];
      let selected = eligible.find(id => typeof id === 'string' && ENTITY_PATTERN.test(id));
      if (!selected) selected = Object.keys(hass?.states || {}).find(id => ENTITY_PATTERN.test(id));
      return { entities: selected ? [{ entity: selected, name: '' }] : [], theme: 'auto' };
    }
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
      return !!state && typeof state.state === 'string' && state.state !== 'unavailable';
    }

    _renderCover(item, placeholder = false) {
      const entity = item.entity;
      const state = this._state(entity);
      const ready = this._ready(state);
      const pos = ready ? positionFromState(state) : null;
      const customizedSingleTitle = this._cfg.entities.length === 1 && this._cfg.title !== 'Tapparelle' ? this._cfg.title : '';
      const title = item.name || customizedSingleTitle || state?.attributes?.friendly_name || entity;
      const busy = this._pending.has(entity);
      const sliderAvailable = ready && !busy && pos !== null && supported(state, FEATURES.SET_POSITION);
      const isDisabled = feature => !ready || !supported(state, feature) || (busy && feature !== FEATURES.STOP);
      const message = placeholder ? 'Aggiungi una o più entità cover nell’editor visuale per iniziare.' : '';
      const value = pos === null ? '—' : String(pos);
      const error = this._errors.get(entity) || '';
      const shownState = placeholder ? 'Nessuna tapparella configurata' : displayState(state, pos);
      return `<div class="cf-cell"><section class="cf-shell" data-entity="${escapeHtml(entity)}" aria-label="Controllo tapparella ${escapeHtml(title)}">
          <header class="cf-header"><div class="cf-eyebrow">${escapeHtml(this._cfg.eyebrow)}</div><div class="cf-title">${escapeHtml(title)}<b>.</b></div></header>
          <div class="cf-well">
            <div class="cf-hero">
              <div class="cf-window${pos === null ? ' unknown' : ''}" style="--cf-closed:${pos === null ? 0 : 100 - pos}%" aria-hidden="true"><div class="cf-shade"></div><div class="cf-window-bottom"></div></div>
              <div class="cf-metric"><span class="cf-metric-label">APERTURA</span><div class="cf-value"><span data-value>${value}</span>${pos === null ? '' : '<span class="cf-percent">%</span>'}</div><div class="cf-state" data-state role="status">${escapeHtml(shownState)}</div></div>
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
        this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><div class="cf-grid">${this._renderCover({ entity: '', name: this._cfg.title || 'Tapparelle' }, true)}</div>`;
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
      this._tab = 'tapparelle';
      this._openId = null;
      this._notice = '';
      this._nativeTried = false;
      this.shadowRoot.addEventListener('click', event => this._click(event));
      this.shadowRoot.addEventListener('change', event => this._change(event));
      this.shadowRoot.addEventListener('toggle', event => {
        const details = event.target.closest?.('details[data-cover]');
        if (details?.open) this._openId = details.dataset.cover;
      }, true);
    }

    connectedCallback() { this._render(); void this._ensureNative(); }
    set hass(value) {
      this._hass = value;
      this.shadowRoot.querySelectorAll('ha-selector').forEach(selector => { selector.hass = value; });
    }
    setConfig(config) {
      const cfg = normalizeConfig(config);
      if (JSON.stringify(this._cfg) === JSON.stringify(cfg) && this.shadowRoot.querySelector('.cf-editor')) return;
      this._cfg = cfg;
      this._render();
    }
    async _ensureNative() {
      if (this._nativeTried) return;
      this._nativeTried = true;
      if (!customElements.get('ha-selector')) {
        try {
          const helpers = await window.loadCardHelpers?.();
          await helpers?.importSelector?.();
        } catch (error) {
          console.debug('[Cover Flow Card] Native entity selector unavailable:', error);
        }
      }
      this._render();
    }
    _save(changes) {
      try { this._cfg = normalizeConfig({ ...this._cfg, ...changes }); }
      catch (error) { this._notice = error.message; this._render(); return; }
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { type: 'custom:cover-flow-card', ...this._cfg, entities: this._cfg.entities.map(item => ({ ...item })) } },
        bubbles: true, composed: true
      }));
      this._render();
    }
    _addEntity(raw) {
      const entity = String(raw ?? '').trim();
      if (!ENTITY_PATTERN.test(entity)) { this._notice = 'Seleziona una entità cover valida.'; this._render(); return; }
      if (this._cfg.entities.some(item => item.entity === entity)) {
        this._notice = 'Questa tapparella è già presente.'; this._render(); return;
      }
      if (this._cfg.entities.length >= MAX_COVERS) {
        this._notice = 'È stato raggiunto il limite di tapparelle.'; this._render(); return;
      }
      this._notice = '';
      this._openId = entity;
      this._save({ entities: [...this._cfg.entities, { entity, name: '' }] });
    }
    _cover(item, index) {
      const name = item.name || this._hass?.states?.[item.entity]?.attributes?.friendly_name || item.entity;
      const open = this._openId === item.entity || (this._openId === null && index === 0);
      return `<details data-cover="${escapeHtml(item.entity)}" ${open ? 'open' : ''}>
        <summary>${escapeHtml(name)} <span class="cf-small">(${index + 1})</span></summary>
        <div class="cf-detailbody">
          <div class="cf-field"><label class="cf-label" for="cf-name-${index}">Nome visualizzato</label><input id="cf-name-${index}" class="cf-input" data-name="${escapeHtml(item.entity)}" maxlength="70" placeholder="Usa il nome Home Assistant" value="${escapeHtml(item.name)}"></div>
          <div class="cf-panel"><div class="cf-label">Entità tapparella (1)</div>
            <div class="cf-item"><div class="cf-itemtext">${escapeHtml(name)}<div class="cf-id">${escapeHtml(item.entity)}</div></div><button type="button" class="cf-btn cf-remove" data-remove="${escapeHtml(item.entity)}" aria-label="Rimuovi ${escapeHtml(name)}" title="Rimuovi"><ha-icon icon="mdi:close"></ha-icon></button></div>
          </div>
          <div class="cf-tools"><button type="button" class="cf-btn" data-move="${escapeHtml(item.entity)}" data-step="-1" ${index === 0 ? 'disabled' : ''}>↑ Su</button>
          <button type="button" class="cf-btn" data-move="${escapeHtml(item.entity)}" data-step="1" ${index === this._cfg.entities.length - 1 ? 'disabled' : ''}>↓ Giù</button></div>
        </div></details>`;
    }
    _render() {
      if (!this.isConnected) return;
      const tabs = [['tapparelle','Tapparelle'], ['aspetto','Aspetto'], ['avanzate','Avanzate']];
      let body = '';
      if (this._tab === 'tapparelle') body = `<div class="cf-heading">Tapparelle</div>
        <div class="cf-desc">Seleziona le entità da controllare. Puoi aggiungere fino a ${MAX_COVERS} tapparelle, rinominarle e modificarne l'ordine.</div>
        ${this._cfg.entities.map((item, index) => this._cover(item, index)).join('')}
        <div class="cf-panel"><div class="cf-label">Aggiungi tapparella (${this._cfg.entities.length}/${MAX_COVERS})</div>
          <div class="cf-small">Cerca e seleziona un'entità cover di Home Assistant</div><div data-entity-slot></div>
          <div class="cf-fallback"><input class="cf-input" data-add type="text" placeholder="cover.nome_tapparella" spellcheck="false"></div>
        </div>`;
      if (this._tab === 'aspetto') body = `<div class="cf-heading">Aspetto Edera</div><div class="cf-desc">Stessa tipografia, spaziature e selezione del tema delle altre card Edera. Il nome di ogni tapparella si modifica nella scheda Tapparelle.</div>
        <div class="cf-field"><label class="cf-label" for="cf-title">Titolo</label><input id="cf-title" class="cf-input" data-appearance="title" maxlength="70" value="${escapeHtml(this._cfg.title)}"></div>
        <div class="cf-field"><label class="cf-label" for="cf-eyebrow">Intestazione superiore</label><input id="cf-eyebrow" class="cf-input" data-appearance="eyebrow" maxlength="60" value="${escapeHtml(this._cfg.eyebrow)}"></div>
        <div class="cf-field"><label class="cf-label" for="cf-theme">Tema</label>
          <select id="cf-theme" class="cf-input cf-select" data-appearance="theme"><option value="auto" ${this._cfg.theme === 'auto' ? 'selected' : ''}>Automatico (Home Assistant)</option><option value="light" ${this._cfg.theme === 'light' ? 'selected' : ''}>Light Edera</option><option value="dark" ${this._cfg.theme === 'dark' ? 'selected' : ''}>Graphite Dark Edera</option></select></div>`;
      if (this._tab === 'avanzate') body = `<div class="cf-heading">Compatibilità e comandi</div>
        <div class="cf-desc">Ogni tapparella viene controllata in modo indipendente tramite i servizi di Home Assistant.</div>
        <div class="cf-panel"><div class="cf-small">I pulsanti Apri, Stop e Chiudi dipendono dalle funzionalità dichiarate dall'entità. Lo slider richiede un valore di posizione valido e il supporto a SET_POSITION. Quando un dispositivo non comunica la posizione, non viene mostrata una percentuale stimata.</div></div>`;
      this.shadowRoot.innerHTML = `<style>${EDITOR_CSS}</style><div class="cf-editor"><div class="cf-tabs">${tabs.map(([id,label]) => `<button type="button" class="cf-tab ${this._tab === id ? 'active' : ''}" data-tab="${id}" aria-current="${this._tab === id ? 'page' : 'false'}">${label}</button>`).join('')}</div>${body}${this._notice ? `<div class="cf-notice" role="alert">${escapeHtml(this._notice)}</div>` : ''}</div>`;
      const editor = this.shadowRoot.querySelector('.cf-editor');
      const native = !!customElements.get('ha-selector');
      editor.classList.toggle('cf-no-native', !native);
      const slot = this.shadowRoot.querySelector('[data-entity-slot]');
      if (native && slot && this._cfg.entities.length < MAX_COVERS) {
        const selector = document.createElement('ha-selector');
        selector.hass = this._hass;
        selector.selector = { entity: { domain: 'cover' } };
        selector.value = '';
        selector.addEventListener('value-changed', event => {
          event.stopPropagation();
          this._addEntity(event.detail?.value);
        });
        slot.appendChild(selector);
      }
    }
    _click(event) {
      const tab = event.target.closest?.('[data-tab]');
      if (tab) { this._tab = tab.dataset.tab; this._notice = ''; this._render(); return; }
      const remove = event.target.closest?.('[data-remove]');
      if (remove) {
        const entity = remove.dataset.remove;
        this._openId = null; this._notice = '';
        this._save({ entities: this._cfg.entities.filter(item => item.entity !== entity) });
        return;
      }
      const move = event.target.closest?.('[data-move]');
      if (move) {
        const index = this._cfg.entities.findIndex(item => item.entity === move.dataset.move);
        const destination = index + Number(move.dataset.step);
        if (index < 0 || destination < 0 || destination >= this._cfg.entities.length) return;
        const entities = this._cfg.entities.map(item => ({ ...item }));
        [entities[index], entities[destination]] = [entities[destination], entities[index]];
        this._openId = move.dataset.move; this._notice = '';
        this._save({ entities });
      }
    }
    _change(event) {
      const input = event.target;
      if (input.dataset.add !== undefined) { this._addEntity(input.value); return; }
      if (input.dataset.name !== undefined) {
        const entities = this._cfg.entities.map(item => item.entity === input.dataset.name ? { ...item, name: input.value.trim() } : item);
        this._openId = input.dataset.name;
        this._save({ entities });
        return;
      }
      if (input.dataset.appearance !== undefined) {
        const key = input.dataset.appearance;
        if (key === 'eyebrow' || key === 'theme' || key === 'title') this._save({ [key]: input.value });
      }
    }
  }

  if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, CoverFlowEditor);
  if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, CoverFlowCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some(card => card.type === CARD_TAG)) {
    window.customCards.push({ type: CARD_TAG, name: 'Cover Flow Card',
      description: 'Edera-inspired controls for multiple Home Assistant cover entities.', preview: true,
      documentationURL: 'https://github.com/luigi-regolo/cover-flow-card',
      getEntitySuggestion: (_hass, entityId) => ENTITY_PATTERN.test(entityId) ? {
        config: { type: 'custom:cover-flow-card', entities: [{ entity: entityId, name: '' }], theme: 'auto' }
      } : null });
  }
})();