(() => {
  const KEY = 'salone-pro-cookie-consent-v1';
  const VERSION = '2026-06-16';
  const EVENT = 'salonepro:open-cookie-preferences';

  const defaults = () => ({ necessary: true, analytics: false, marketing: false });
  const expiresAt = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString();
  };
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || saved.version !== VERSION || new Date(saved.expiresAt).getTime() < Date.now()) return null;
      return saved;
    } catch {
      return null;
    }
  };
  const save = (preferences) => {
    const record = {
      version: VERSION,
      preferences: {
        necessary: true,
        analytics: Boolean(preferences.analytics),
        marketing: Boolean(preferences.marketing)
      },
      decidedAt: new Date().toISOString(),
      expiresAt: expiresAt()
    };
    localStorage.setItem(KEY, JSON.stringify(record));
    return record;
  };
  const loadScript = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  };
  const ensureGtag = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    return window.gtag;
  };
  const apply = (preferences) => {
    const config = window.SALONE_PRO_CONFIG || {};
    const analyticsId = String(config.googleAnalyticsId || '').trim();
    const metaPixelId = String(config.metaPixelId || '').trim();
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
        ad_storage: preferences.marketing ? 'granted' : 'denied',
        ad_user_data: preferences.marketing ? 'granted' : 'denied',
        ad_personalization: preferences.marketing ? 'granted' : 'denied'
      });
    }
    if (preferences.analytics && analyticsId) {
      const gtag = ensureGtag();
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: preferences.marketing ? 'granted' : 'denied',
        ad_user_data: preferences.marketing ? 'granted' : 'denied',
        ad_personalization: preferences.marketing ? 'granted' : 'denied'
      });
      loadScript('salonepro-google-analytics', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`);
      gtag('js', new Date());
      gtag('config', analyticsId, { anonymize_ip: true });
    }
    if (preferences.marketing && metaPixelId) {
      window.fbq = window.fbq || function fbq() {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(['fbq', ...Array.prototype.slice.call(arguments)]);
      };
      loadScript('salonepro-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', metaPixelId);
      window.fbq('track', 'PageView');
    }
  };
  const removeBanner = () => document.querySelector('[data-cookie-banner]')?.remove();
  const commit = (preferences) => {
    const record = save(preferences);
    apply(record.preferences);
    removeBanner();
  };
  const render = (settings = false) => {
    removeBanner();
    const saved = load();
    const preferences = saved?.preferences || defaults();
    const banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferenze cookie');
    banner.setAttribute('data-cookie-banner', 'true');
    banner.innerHTML = `
      <button class="cookie-close" type="button" aria-label="Chiudi e usa solo cookie tecnici">×</button>
      <div class="cookie-copy">
        <span class="pill">Privacy</span>
        <h2>Cookie e dati di navigazione</h2>
        <p>${settings ? 'Modifica le preferenze per finalità. Le scelte valgono 6 mesi e puoi riaprirle dal footer.' : 'Usiamo solo strumenti tecnici necessari. Statistiche e marketing vengono attivati solo se dai consenso.'}</p>
        <div class="cookie-links"><a href="/privacy.html">Privacy policy</a><a href="/cookie-policy.html">Cookie policy</a></div>
      </div>
      ${settings ? `
      <div class="cookie-settings">
        <label class="cookie-toggle disabled"><input type="checkbox" checked disabled /><span><strong>Tecnici necessari</strong><small>Sessione, sicurezza, preferenze consenso e funzionamento.</small></span></label>
        <label class="cookie-toggle"><input type="checkbox" data-cookie-analytics ${preferences.analytics ? 'checked' : ''} /><span><strong>Statistiche</strong><small>Misurazione visite e conversioni, solo dopo consenso.</small></span></label>
        <label class="cookie-toggle"><input type="checkbox" data-cookie-marketing ${preferences.marketing ? 'checked' : ''} /><span><strong>Marketing</strong><small>Campagne e pixel pubblicitari, solo dopo consenso.</small></span></label>
      </div>` : ''}
      <div class="cookie-actions">
        <button type="button" class="button" data-cookie-reject>Rifiuta</button>
        ${settings ? '<button type="button" class="button" data-cookie-save>Salva scelte</button>' : '<button type="button" class="button" data-cookie-settings>Personalizza</button>'}
        <button type="button" class="button" data-cookie-accept>Accetta tutto</button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector('.cookie-close')?.addEventListener('click', () => commit(defaults()));
    banner.querySelector('[data-cookie-reject]')?.addEventListener('click', () => commit(defaults()));
    banner.querySelector('[data-cookie-settings]')?.addEventListener('click', () => render(true));
    banner.querySelector('[data-cookie-save]')?.addEventListener('click', () => commit({
      necessary: true,
      analytics: Boolean(banner.querySelector('[data-cookie-analytics]')?.checked),
      marketing: Boolean(banner.querySelector('[data-cookie-marketing]')?.checked)
    }));
    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => commit({ necessary: true, analytics: true, marketing: true }));
  };

  window.SaloneProCookieConsent = { open: () => render(true) };
  window.addEventListener(EVENT, () => render(true));
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-cookie-preferences]')) render(true);
  });

  const saved = load();
  if (saved) apply(saved.preferences);
  else render(false);
})();
