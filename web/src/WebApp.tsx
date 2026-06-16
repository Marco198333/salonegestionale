import React, { useEffect, useState } from 'react';
import {
  Appointment,
  COOKIE_CONSENT_VERSION,
  CookieConsentPreferences,
  clearProductionSession,
  Customer,
  SESSION_KEY,
  SalonData,
  createId,
  dateInput,
  defaultCookieConsent,
  hasProductionApi,
  loadCookieConsent,
  loadSalonData,
  loadSalonDataFromApi,
  loginWithProductionApi,
  money,
  saveCookieConsent,
  saveSalonData,
  saveSalonDataToApi,
  shortDateTime,
  submitLeadToNetlify,
  timeInput
} from './webStore';
import './web.css';

type PublicView = 'home' | 'product' | 'pricing' | 'login';
type AppView = 'dashboard' | 'agenda' | 'customers' | 'automations' | 'statistics' | 'settings';

const publicViews: PublicView[] = ['home', 'product', 'pricing', 'login'];
const publicViewFromHash = (): PublicView => {
  if (typeof window === 'undefined') return 'home';
  const value = window.location.hash.replace('#', '') as PublicView;
  return publicViews.includes(value) ? value : 'home';
};

const serviceById = (data: SalonData, id: string) => data.services.find((service) => service.id === id) || data.services[0];
const customerById = (data: SalonData, id: string) => data.customers.find((customer) => customer.id === id);
const operatorById = (data: SalonData, id: string) => data.operators.find((operator) => operator.id === id);

const addMinutes = (iso: string, minutes: number) => {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

const publicFeatures = [
  ['Agenda online parrucchieri', 'Giornata piena senza caos', 'Agenda web per parrucchieri, barber e centri estetici con operatori, servizi, durata, colore, posa e buchi visibili.'],
  ['Prenotazioni online salone', 'Booking diretto senza commissioni', 'Link prenotazione da mettere su Instagram, Google Business Profile e WhatsApp: il cliente prenota dal salone, non da un portale.'],
  ['Scheda cliente e colore', 'Memoria professionale del salone', 'Storico trattamenti, formule colore, preferenze, consenso marketing e messaggi WhatsApp per far tornare i clienti giusti.']
];

const salonMoments = [
  ['Promemoria appuntamento', 'Il reminder WhatsApp riduce telefonate, dimenticanze e conferme manuali.'],
  ['Tempo posa colore', "L'agenda mostra quando l'operatrice è libera durante posa e rifinitura."],
  ['Cliente dormiente', 'Una lista pronta aiuta a recuperare chi non prenota da settimane.']
];

const seoFaqs = [
  ['Quale gestionale parrucchieri scegliere?', 'Un salone piccolo o medio deve cercare agenda online, prenotazioni dirette, schede colore, clienti esportabili e supporto italiano. SalonePro nasce su questi punti.'],
  ['Quanto costa un software parrucchieri?', 'Il modello consigliato è canone fisso: da 29 euro al mese per agenda e clienti, senza commissioni sulle prenotazioni dirette del salone.'],
  ["È un'alternativa a Treatwell o Fresha?", 'Sì, si posiziona come alternativa proprietaria: non marketplace, non portale clienti, ma mini-sito e booking diretto del salone.'],
  ['Funziona anche per barber e centri estetici?', 'Sì. La struttura è pensata per parrucchieri, barber shop, saloni beauty e centri estetici con agenda, servizi, clienti e promemoria.']
];

const seoIntents = [
  ['Gestionale parrucchieri', 'Agenda, clienti, schede colore, servizi e statistiche in un unico software web.'],
  ['Agenda parrucchieri online', 'Appuntamenti, operatori, tempi tecnici e buchi della giornata sempre visibili.'],
  ['Prenotazioni online salone', 'Booking diretto da Google, Instagram e WhatsApp senza commissioni sul cliente.'],
  ['Reminder WhatsApp salone', 'Testi pronti per promemoria, recensioni, compleanni e clienti dormienti.']
];

const Feature: React.FC<{ label: string; title: string; text: string }> = ({ label, title, text }) => (
  <article className="site-card">
    <span>{label}</span>
    <h3>{title}</h3>
    <p>{text}</p>
  </article>
);

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="metric-tile">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

const Icon: React.FC<{ name: 'calendar' | 'spark' | 'message' | 'chart' | 'user' | 'bolt' }> = ({ name }) => {
  const paths = {
    calendar: 'M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    spark: 'M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z',
    message: 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    chart: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-9',
    user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8Z'
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
};

const cookiePreferenceEvent = 'salonepro:open-cookie-preferences';

const openCookiePreferences = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(cookiePreferenceEvent));
};

const loadExternalScript = (id: string, src: string) => {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const ensureGtag = () => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
  return window.gtag;
};

const applyCookieConsentEffects = (preferences: CookieConsentPreferences) => {
  if (typeof window === 'undefined') return;
  const analyticsId = window.SALONE_PRO_CONFIG?.googleAnalyticsId?.trim();
  const metaPixelId = window.SALONE_PRO_CONFIG?.metaPixelId?.trim();

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
    loadExternalScript('salonepro-google-analytics', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`);
    gtag('js', new Date());
    gtag('config', analyticsId, { anonymize_ip: true });
  }

  if (preferences.marketing && metaPixelId) {
    window.fbq = window.fbq || ((...args: unknown[]) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(['fbq', ...args]);
    });
    loadExternalScript('salonepro-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }
};

const CookieConsentBanner: React.FC = () => {
  const initialRecord = loadCookieConsent();
  const [visible, setVisible] = useState(!initialRecord);
  const [mode, setMode] = useState<'notice' | 'settings'>('notice');
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(initialRecord?.preferences || defaultCookieConsent());

  useEffect(() => {
    if (initialRecord) applyCookieConsentEffects(initialRecord.preferences);
  }, []);

  useEffect(() => {
    const open = () => {
      const saved = loadCookieConsent();
      setPreferences(saved?.preferences || defaultCookieConsent());
      setMode('settings');
      setVisible(true);
    };
    window.addEventListener(cookiePreferenceEvent, open);
    return () => window.removeEventListener(cookiePreferenceEvent, open);
  }, []);

  const commit = (next: CookieConsentPreferences) => {
    const saved = saveCookieConsent(next);
    setPreferences(saved.preferences);
    applyCookieConsentEffects(saved.preferences);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="cookie-banner" role="dialog" aria-label="Preferenze cookie">
      <button className="cookie-close" type="button" aria-label="Chiudi e usa solo cookie tecnici" onClick={() => commit(defaultCookieConsent())}>×</button>
      <div className="cookie-copy">
        <span className="pill">Privacy</span>
        <h2>Cookie e dati di navigazione</h2>
        {mode === 'notice' ? (
          <p>Usiamo solo strumenti tecnici necessari per far funzionare il sito. Statistiche e marketing vengono attivati solo se dai consenso. Puoi rifiutare, accettare tutto o scegliere le finalità.</p>
        ) : (
          <p>Modifica le preferenze per finalità. Le scelte valgono 6 mesi e puoi riaprirle dal footer.</p>
        )}
        <div className="cookie-links">
          <a href="/privacy.html">Privacy policy</a>
          <a href="/cookie-policy.html">Cookie policy</a>
        </div>
      </div>

      {mode === 'settings' && (
        <div className="cookie-settings">
          <label className="cookie-toggle disabled">
            <input type="checkbox" checked disabled />
            <span><strong>Tecnici necessari</strong><small>Sessione, sicurezza, preferenze consenso e funzionamento del sito.</small></span>
          </label>
          <label className="cookie-toggle">
            <input type="checkbox" checked={preferences.analytics} onChange={(event) => setPreferences({ ...preferences, analytics: event.target.checked })} />
            <span><strong>Statistiche</strong><small>Misurazione visite e conversioni, solo dopo consenso.</small></span>
          </label>
          <label className="cookie-toggle">
            <input type="checkbox" checked={preferences.marketing} onChange={(event) => setPreferences({ ...preferences, marketing: event.target.checked })} />
            <span><strong>Marketing</strong><small>Campagne e pixel pubblicitari, solo dopo consenso esplicito.</small></span>
          </label>
        </div>
      )}

      <div className="cookie-actions">
        <button type="button" className="btn btn-soft" onClick={() => commit(defaultCookieConsent())}>Rifiuta</button>
        {mode === 'notice' && <button type="button" className="btn btn-ghost" onClick={() => setMode('settings')}>Personalizza</button>}
        {mode === 'settings' && <button type="button" className="btn btn-ghost" onClick={() => commit(preferences)}>Salva scelte</button>}
        <button type="button" className="btn btn-yellow" onClick={() => commit({ necessary: true, analytics: true, marketing: true })}>Accetta tutto</button>
      </div>
    </section>
  );
};

const PublicFooter: React.FC = () => (
  <footer className="site-footer wrap">
    <div>
      <strong>SalonePro</strong>
      <span>Gestionale parrucchieri, barber e centri estetici.</span>
    </div>
    <nav aria-label="Link legali">
      <a href="/privacy.html">Privacy</a>
      <a href="/cookie-policy.html">Cookie</a>
      <button type="button" onClick={openCookiePreferences}>Preferenze cookie</button>
    </nav>
  </footer>
);

const LiveSalonConsole: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <div className="live-console">
    <div className="console-top">
      <div>
        <span className="console-dot" />
        <strong>Salone Milano Brera</strong>
      </div>
      <button onClick={onOpen}>Apri</button>
    </div>
    <div className="console-kpis">
      <div><span>Oggi</span><strong>11 appuntamenti</strong></div>
      <div><span>Agenda</span><strong>86% piena</strong></div>
      <div><span>Incasso stimato</span><strong>€ 742</strong></div>
    </div>
    <div className="console-agenda">
      {[
        ['09:00', 'Giulia', 'Colore + piega', 'Asia', 'rose'],
        ['10:30', 'Martina', 'Posa colore', 'Libera Amanda', 'green'],
        ['12:00', 'Elena', 'Taglio donna', 'Sofia', 'gold'],
        ['15:00', 'Buco riempito', 'Cliente dormiente', 'WhatsApp', 'plum']
      ].map(([time, name, service, operator, tone]) => (
        <div className={`console-row ${tone}`} key={`${time}-${name}`}>
          <time>{time}</time>
          <div>
            <strong>{name}</strong>
            <span>{service}</span>
          </div>
          <em>{operator}</em>
        </div>
      ))}
    </div>
    <div className="console-toast">
      <Icon name="message" />
      <span>Reminder WhatsApp inviato a 7 clienti</span>
    </div>
  </div>
);

const ProductPreview = () => (
  <div className="product-frame" aria-hidden="true">
    <div className="frame-top"><span /><span /><span /></div>
    <div className="frame-body">
      <aside>
        <strong>Salone cliente</strong>
        <span>Agenda</span>
        <span>Clienti</span>
        <span>Automazioni</span>
        <span>Statistiche</span>
      </aside>
      <main>
        <div className="frame-title">
          <strong>Agenda di oggi</strong>
          <button>Nuovo appuntamento</button>
        </div>
        <div className="frame-columns">
          {['Asia', 'Amanda', 'Sofia'].map((name, index) => (
            <div key={name}>
              <strong>{name}</strong>
              <i style={{ height: 82 + index * 18 }} />
              <i style={{ height: 54 + index * 12 }} />
              <i style={{ height: 72 }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const apiEnabled = hasProductionApi();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!apiEnabled) {
      setError('Accesso non disponibile: il backend produzione non e collegato a questo dominio.');
      return;
    }
    if (apiEnabled) {
      setLoading(true);
      try {
        await loginWithProductionApi(username, password);
        onLogin();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Accesso non riuscito');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  return (
    <main className="site-page login-page">
      <section className="wrap login-layout">
        <div>
          <span className="pill">Area clienti SalonePro</span>
          <h1>Accesso riservato ai saloni attivi.</h1>
          <p>Questa pagina è solo per parrucchieri, barber e centri estetici con account SalonePro già attivato. Ogni salone entra con credenziali personali salvate nel database, sessione server e dati separati.</p>
          <div className="credential-box">
            <strong>{apiEnabled ? 'Account cliente richiesto' : 'Backend non collegato'}</strong>
            <span>{apiEnabled ? "Usa email e password ricevute dopo l'attivazione." : "Avvia l'API o configura il proxy /api prima del go-live."}</span>
          </div>
        </div>
        <form className="login-card" onSubmit={submit}>
          <label>Email<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="titolare@salone.it" autoComplete="username" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>
          {!apiEnabled && <p className="muted">In locale questo form resta bloccato finché non colleghi l'API. In produzione userà il dominio o l'endpoint API configurato.</p>}
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-yellow" disabled={loading || !apiEnabled}>{loading ? 'Accesso...' : 'Accedi al gestionale'} <span>→</span></button>
        </form>
      </section>
    </main>
  );
};

const PublicSite: React.FC<{ view: PublicView; setView: (view: PublicView) => void; onLogin: () => void }> = ({ view, setView, onLogin }) => {
  const [leadStatus, setLeadStatus] = useState('');

  const openLeadForm = () => {
    if (view !== 'home') setView('home');
    window.setTimeout(() => document.getElementById('lead-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  const submitLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setLeadStatus('Invio richiesta...');
    try {
      const sentToNetlify = await submitLeadToNetlify(payload);
      if (!sentToNetlify) {
        const leads = JSON.parse(localStorage.getItem('salone-pro-leads') || '[]') as unknown[];
        localStorage.setItem('salone-pro-leads', JSON.stringify([...leads, { ...payload, createdAt: new Date().toISOString() }]));
      }
      setLeadStatus('Richiesta ricevuta. Ti ricontattiamo su WhatsApp per attivare la demo guidata.');
    } catch (err) {
      setLeadStatus(err instanceof Error ? err.message : 'Non siamo riusciti a inviare la richiesta.');
    }
    form.reset();
  };

  return (
    <div className="site-shell">
      <div className="salon-strip">
        <div className="wrap">
          <span>Gestionale parrucchieri, barber e centri estetici</span>
          <span>Agenda online · prenotazioni dirette · schede colore · WhatsApp</span>
        </div>
      </div>
      <nav className="main-nav">
        <div className="wrap nav-row">
          <button className="brand" onClick={() => setView('home')}><span>Salone</span><strong>Pro</strong></button>
          <div className="nav-links">
            <button onClick={() => setView('product')}>Prodotto</button>
            <button onClick={() => setView('pricing')}>Prezzi</button>
            <button className="btn btn-ghost" onClick={() => setView('login')}>Area clienti</button>
            <button className="btn btn-yellow" onClick={openLeadForm}>Richiedi demo <span>→</span></button>
          </div>
        </div>
      </nav>

      {view === 'home' && (
        <main>
          <section className="hero">
            <img className="hero-photo" src="/salone-web-hero.png" alt="" aria-hidden="true" />
            <div className="hero-overlay" />
            <div className="wrap hero-content">
              <div className="hero-copy">
                <span className="pill glass">Software gestionale parrucchieri e saloni</span>
                <h1>Il gestionale parrucchieri che riempie l'agenda senza commissioni.</h1>
                <p>SalonePro e il software web per parrucchieri, barber e centri estetici: agenda online, prenotazioni dirette, schede colore, reminder WhatsApp, clienti dormienti e statistiche del salone.</p>
                <div className="hero-actions">
                  <button className="btn btn-rose" onClick={openLeadForm}>Richiedi demo guidata <span>→</span></button>
                  <button className="btn btn-soft" onClick={() => setView('pricing')}>Prezzi software salone</button>
                </div>
                <div className="hero-proofline">
                  <span><Icon name="bolt" /> Setup in 15 minuti</span>
                  <span><Icon name="message" /> Reminder WhatsApp</span>
                  <span><Icon name="chart" /> Clienti e incassi</span>
                </div>
              </div>
              <LiveSalonConsole onOpen={() => setView('product')} />
            </div>
          </section>

          <section className="wrap trust-ribbon" aria-label="Indicatori prodotto">
            <Metric value="0%" label="commissioni sulle prenotazioni online" />
            <Metric value="24/7" label="agenda e booking dal link del salone" />
            <Metric value="15m" label="setup guidato per servizi e operatori" />
          </section>

          <section className="wrap feature-section">
            <div className="section-intro">
              <span className="pill">Software per saloni</span>
              <h2>Le funzioni che cercano parrucchieri, barber e centri estetici.</h2>
              <p>Agenda parrucchieri online, prenotazioni senza commissioni, scheda cliente, scheda colore e WhatsApp in un unico gestionale.</p>
            </div>
            <div className="feature-grid">
              {publicFeatures.map(([label, title, text]) => <Feature key={title} label={label} title={title} text={text} />)}
            </div>
          </section>

          <section className="wrap search-intent-band">
            <div className="section-intro">
              <span className="pill">Cosa indicizziamo</span>
              <h2>Una pagina pensata per le ricerche che portano clienti pronti a comprare.</h2>
            </div>
            <div className="intent-list">
              {seoIntents.map(([title, text]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="wrap salon-flow compact">
            <div className="section-intro">
              <span className="pill">Giornata in salone</span>
              <h2>Cosa cambia quando il gestionale lavora mentre tu lavori.</h2>
            </div>
            <div className="moment-grid">
              {salonMoments.map(([title, text]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="wrap beauty-statement">
            <div>
              <span className="pill">Alternativa marketplace</span>
              <h2>Non un portale di prenotazione. Il cliente resta del salone.</h2>
            </div>
            <p>SalonePro non vende visibilita in cambio del cliente: crea booking diretto, mini-sito del salone, promemoria WhatsApp e archivio clienti proprietario. Il valore resta in salone.</p>
          </section>

          <section className="wrap preview-band">
            <div>
              <span className="pill">App gestionale</span>
              <h2>Agenda, clienti, trattamenti e marketing locale senza menu inutili.</h2>
              <p>Dashboard salone, agenda operatori, nuovo appuntamento, schede clienti, formule colore, messaggi WhatsApp, statistiche e impostazioni: tutto accessibile da browser.</p>
              <button className="btn btn-rose" onClick={openLeadForm}>Richiedi accesso demo <span>→</span></button>
            </div>
            <ProductPreview />
          </section>

          <section className="wrap price-strip">
            <div>
              <span className="pill">Prezzi gestionale parrucchieri</span>
              <h2>Canone fisso, zero commissioni sulle prenotazioni del salone.</h2>
              <p>Una parrucchiera o un barber deve capire subito quanto costa: agenda e clienti da 29 euro al mese, piano Pro per booking e WhatsApp.</p>
            </div>
            <div className="price-strip-card">
              <strong>da 29€/mese</strong>
              <span>software agenda parrucchieri + clienti</span>
              <button className="btn btn-soft" onClick={() => setView('pricing')}>Vedi prezzi</button>
            </div>
          </section>

          <section className="wrap seo-faq">
            <div className="section-intro">
              <span className="pill">Domande vere</span>
              <h2>Quello che chiede un salone prima di comprare.</h2>
            </div>
            <div className="faq-list">
              {seoFaqs.map(([question, answer]) => (
                <article key={question}>
                  <h3>{question}</h3>
                  <p>{answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="wrap cta-band" id="lead-demo">
            <div>
              <span className="pill">Attivazione software parrucchieri</span>
              <h2>Vuoi vedere SalonePro su un salone reale?</h2>
              <p>Lascia nome salone, città e WhatsApp. Ti prepariamo un accesso guidato con agenda, scheda colore, prenotazioni online e clienti dormienti in meno di 15 minuti.</p>
            </div>
            <form className="lead-form" name="salonepro-lead" method="POST" data-netlify="true" onSubmit={submitLead}>
              <input type="hidden" name="form-name" value="salonepro-lead" />
              <input type="hidden" name="source" value="website" />
              <p className="netlify-honeypot" aria-hidden="true">
                <label>Non compilare<input name="bot-field" tabIndex={-1} autoComplete="off" /></label>
              </p>
              <label>Nome salone<input name="salonName" required /></label>
              <label>Città<input name="city" required /></label>
              <label>WhatsApp<input name="phone" required /></label>
              <label>Email<input name="email" type="email" placeholder="opzionale" /></label>
              <label>Messaggio<textarea name="message" rows={4} placeholder="Obiettivo principale: agenda, WhatsApp, clienti, import dati..." /></label>
              <label className="check-row">
                <input type="checkbox" name="privacyAccepted" value="yes" required />
                <span>Ho letto la <a href="/privacy.html" target="_blank" rel="noreferrer">privacy policy</a> e autorizzo il contatto per gestire la richiesta demo.</span>
              </label>
              <label className="check-row">
                <input type="checkbox" name="marketingConsent" value="yes" />
                <span>Acconsento a ricevere aggiornamenti commerciali su SalonePro. Posso revocare il consenso in qualsiasi momento.</span>
              </label>
              <input type="hidden" name="consentVersion" value={COOKIE_CONSENT_VERSION} />
              <button className="btn btn-yellow">Richiedi demo <span>→</span></button>
              {leadStatus && <p>{leadStatus}</p>}
            </form>
          </section>
        </main>
      )}

      {view === 'product' && (
        <main className="site-page">
          <section className="page-head wrap">
            <span className="pill">Gestionale salone completo</span>
            <h1>Software gestionale parrucchieri: agenda online, clienti, schede colore e WhatsApp.</h1>
            <p>SalonePro centralizza le funzioni che un salone cerca davvero: prenotazioni online, agenda operatori, storico clienti, formule colore, trattamenti, promemoria WhatsApp e statistiche commerciali.</p>
          </section>
          <section className="wrap feature-grid">
            <Feature label="Setup salone" title="Configurazione senza codice" text="Nome salone, orari, operatori, servizi, prezzi, link booking e link recensioni configurabili da interfaccia." />
            <Feature label="Agenda parrucchieri" title="Appuntamenti e tempi tecnici" text="Crea appuntamenti, assegna operatore, gestisci durata, colore, posa, cancellazioni e appuntamenti completati." />
            <Feature label="Marketing WhatsApp" title="Clienti che ritornano" text="Testi pronti per reminder, compleanni, clienti dormienti e recensioni Google, partendo dai consensi salvati in scheda cliente." />
          </section>
          <section className="wrap preview-band"><ProductPreview /><div><h2>Applicazione web pronta per saloni attivi.</h2><p>Ogni cliente riceve un account personale: salone configurato, password temporanea generata dal backend, dati separati e accesso riservato dall area clienti.</p><button className="btn btn-yellow" onClick={openLeadForm}>Richiedi attivazione <span>→</span></button></div></section>
        </main>
      )}

      {view === 'pricing' && (
        <main className="site-page">
          <section className="page-head wrap">
            <span className="pill">Costo gestionale parrucchieri</span>
            <h1>Prezzi software parrucchieri: canone fisso e zero commissioni.</h1>
            <p>Il listino è pensato per essere capito subito da saloni, barber e centri estetici: nessuna commissione sulle prenotazioni online dirette, setup guidato e piani scalabili.</p>
          </section>
          <section className="wrap price-grid">
            <article><h2>Base</h2><strong>29€/mese</strong><p>Agenda parrucchieri online, archivio clienti, servizi, operatori e configurazione salone.</p></article>
            <article className="featured"><h2>Pro</h2><strong>59€/mese</strong><p>Prenotazioni online salone, schede colore, reminder WhatsApp, clienti dormienti e statistiche.</p></article>
            <article><h2>Premium</h2><strong>99€/mese</strong><p>Multi-operatore avanzato, import clienti guidato, priorita supporto e funzioni SaaS evolute.</p></article>
          </section>
        </main>
      )}

      {view === 'login' && <LoginPage onLogin={onLogin} />}
      <PublicFooter />
    </div>
  );
};

const AppShell: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [data, setData] = useState<SalonData>(() => loadSalonData());
  const [view, setView] = useState<AppView>('dashboard');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    if (!hasProductionApi()) return () => { alive = false; };
    loadSalonDataFromApi()
      .then((serverData) => {
        if (alive && serverData) setData(serverData);
      })
      .catch(() => {
        if (alive) onLogout();
      });
    return () => { alive = false; };
  }, []);

  const persist = (next: SalonData, message?: string) => {
    const applyLocal = () => {
      setData(next);
      saveSalonData(next);
      if (message) {
        setNotice(message);
        window.setTimeout(() => setNotice(''), 2600);
      }
    };
    if (hasProductionApi()) {
      saveSalonDataToApi(next)
        .then(applyLocal)
        .catch(() => setNotice('Salvataggio non riuscito: sessione o server non disponibile.'));
      return;
    }
    applyLocal();
  };

  const completeAppointment = (id: string) => {
    const appointment = data.appointments.find((item) => item.id === id);
    if (!appointment) return;
    const service = serviceById(data, appointment.serviceId);
    const next: SalonData = {
      ...data,
      appointments: data.appointments.map((item) => item.id === id ? { ...item, status: 'Done' } : item),
      treatments: [{
        id: createId('t'),
        customerId: appointment.customerId,
        serviceName: service.name,
        dateAt: appointment.endAt,
        priceCents: service.priceCents,
        notes: appointment.notes
      }, ...data.treatments]
    };
    persist(next, 'Appuntamento completato');
  };

  const cancelAppointment = (id: string) => {
    persist({ ...data, appointments: data.appointments.map((item) => item.id === id ? { ...item, status: 'Cancelled' } : item) }, 'Appuntamento annullato');
  };

  return (
    <div className="app-web">
      <aside className="app-sidebar">
        <div className="app-brand"><span>Salone</span><strong>Pro</strong></div>
        <small>{data.settings.name}</small>
        <nav>
          {[
            ['dashboard', 'Dashboard'],
            ['agenda', 'Agenda'],
            ['customers', 'Clienti'],
            ['automations', 'Automazioni'],
            ['statistics', 'Statistiche'],
            ['settings', 'Impostazioni']
          ].map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id as AppView)}>{label}</button>
          ))}
        </nav>
        <button className="side-exit" onClick={onLogout}>Esci</button>
      </aside>
      <main className="app-main">
        <header className="app-top">
          <div>
            <span>Area salone</span>
            <h1>{view === 'dashboard' ? 'Dashboard' : view === 'agenda' ? 'Agenda' : view === 'customers' ? 'Clienti' : view === 'automations' ? 'Automazioni' : view === 'statistics' ? 'Statistiche' : 'Impostazioni'}</h1>
          </div>
          <button className="app-primary" onClick={() => setView('agenda')}>Nuovo appuntamento</button>
        </header>
        {notice && <div className="toast">{notice}</div>}
        {view === 'dashboard' && <Dashboard data={data} />}
        {view === 'agenda' && <Agenda data={data} persist={persist} onDone={completeAppointment} onCancel={cancelAppointment} />}
        {view === 'customers' && <Customers data={data} persist={persist} />}
        {view === 'automations' && <Automations data={data} />}
        {view === 'statistics' && <Statistics data={data} />}
        {view === 'settings' && <Settings data={data} persist={persist} />}
      </main>
    </div>
  );
};

const Dashboard: React.FC<{ data: SalonData }> = ({ data }) => {
  const today = dateInput();
  const todays = data.appointments.filter((item) => item.startAt.slice(0, 10) === today && item.status !== 'Cancelled');
  const doneRevenue = data.appointments.reduce((total, appointment) => appointment.status === 'Done' ? total + serviceById(data, appointment.serviceId).priceCents : total, 0);
  return (
    <div className="dashboard-grid">
      <Metric value={String(data.customers.length)} label="clienti in archivio" />
      <Metric value={String(todays.length)} label="appuntamenti oggi" />
      <Metric value={money(doneRevenue)} label="fatturato completato" />
      <Metric value={String(data.services.filter((item) => item.active).length)} label="servizi attivi" />
      <section className="panel wide">
        <h2>Prossimi appuntamenti</h2>
        <AppointmentList data={data} appointments={data.appointments.filter((item) => item.status === 'Scheduled').slice(0, 6)} />
      </section>
      <section className="panel">
        <h2>Link booking</h2>
        <p className="muted">Da mettere su Instagram, WhatsApp e Google Business Profile.</p>
        <a className="link-box" href={data.settings.bookingUrl}>{data.settings.bookingUrl}</a>
      </section>
    </div>
  );
};

const AppointmentList: React.FC<{ data: SalonData; appointments: Appointment[]; onDone?: (id: string) => void; onCancel?: (id: string) => void }> = ({ data, appointments, onDone, onCancel }) => (
  <div className="list">
    {appointments.map((appointment) => {
      const service = serviceById(data, appointment.serviceId);
      return (
        <div className="list-row" key={appointment.id}>
          <div>
            <strong>{customerById(data, appointment.customerId)?.fullName || 'Cliente'}</strong>
            <span>{service.name} · {operatorById(data, appointment.operatorId)?.name}</span>
          </div>
          <time>{shortDateTime(appointment.startAt)}</time>
          {(onDone || onCancel) && (
            <div className="row-actions">
              {onDone && appointment.status === 'Scheduled' && <button onClick={() => onDone(appointment.id)}>Fatto</button>}
              {onCancel && appointment.status === 'Scheduled' && <button onClick={() => onCancel(appointment.id)}>Annulla</button>}
            </div>
          )}
        </div>
      );
    })}
    {appointments.length === 0 && <p className="muted">Nessun appuntamento.</p>}
  </div>
);

const Agenda: React.FC<{ data: SalonData; persist: (data: SalonData, message?: string) => void; onDone: (id: string) => void; onCancel: (id: string) => void }> = ({ data, persist, onDone, onCancel }) => {
  const [customerId, setCustomerId] = useState(data.customers[0]?.id || '');
  const [operatorId, setOperatorId] = useState(data.operators[0]?.id || '');
  const [serviceId, setServiceId] = useState(data.services[0]?.id || '');
  const [date, setDate] = useState(dateInput());
  const [time, setTime] = useState('09:00');
  const appointments = [...data.appointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const service = serviceById(data, serviceId);
    const startAt = new Date(`${date}T${time}:00`).toISOString();
    const appointment: Appointment = {
      id: createId('a'),
      customerId,
      operatorId,
      serviceId,
      startAt,
      endAt: addMinutes(startAt, service.durationMinutes),
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    };
    persist({ ...data, appointments: [...data.appointments, appointment] }, 'Appuntamento creato');
  };

  return (
    <div className="workspace-grid">
      <form className="panel form-grid" onSubmit={submit}>
        <h2>Nuovo appuntamento</h2>
        <label>Cliente<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}</select></label>
        <label>Operatore<select value={operatorId} onChange={(event) => setOperatorId(event.target.value)}>{data.operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}</select></label>
        <label>Servizio<select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{data.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Ora<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <button className="app-primary">Crea appuntamento</button>
      </form>
      <section className="panel">
        <h2>Agenda</h2>
        <AppointmentList data={data} appointments={appointments} onDone={onDone} onCancel={onCancel} />
      </section>
    </div>
  );
};

const Customers: React.FC<{ data: SalonData; persist: (data: SalonData, message?: string) => void }> = ({ data, persist }) => {
  const [selectedId, setSelectedId] = useState(data.customers[0]?.id || '');
  const selected = data.customers.find((customer) => customer.id === selectedId) || data.customers[0];
  const [form, setForm] = useState({ fullName: '', phone: '', colorFormula: '', preferences: '' });

  const addCustomer = (event: React.FormEvent) => {
    event.preventDefault();
    const customer: Customer = {
      id: createId('c'),
      fullName: form.fullName,
      phone: form.phone,
      marketingConsent: true,
      colorFormula: form.colorFormula,
      preferences: form.preferences,
      createdAt: new Date().toISOString()
    };
    persist({ ...data, customers: [...data.customers, customer] }, 'Cliente creato');
    setForm({ fullName: '', phone: '', colorFormula: '', preferences: '' });
    setSelectedId(customer.id);
  };

  return (
    <div className="workspace-grid">
      <section className="panel">
        <h2>Clienti</h2>
        <div className="customer-list">
          {data.customers.map((customer) => (
            <button key={customer.id} className={selected?.id === customer.id ? 'active' : ''} onClick={() => setSelectedId(customer.id)}>
              <strong>{customer.fullName}</strong><span>{customer.phone}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        {selected && (
          <>
            <h2>{selected.fullName}</h2>
            <div className="detail-grid">
              <span>Telefono<strong>{selected.phone}</strong></span>
              <span>Formula colore<strong>{selected.colorFormula || 'Non inserita'}</strong></span>
              <span>Preferenze<strong>{selected.preferences || 'Non inserite'}</strong></span>
              <span>Marketing<strong>{selected.marketingConsent ? 'Consenso presente' : 'No consenso'}</strong></span>
            </div>
            <h3>Storico trattamenti</h3>
            <div className="list">
              {data.treatments.filter((item) => item.customerId === selected.id).map((item) => (
                <div className="list-row" key={item.id}><div><strong>{item.serviceName}</strong><span>{item.notes}</span></div><time>{shortDateTime(item.dateAt)}</time></div>
              ))}
            </div>
          </>
        )}
      </section>
      <form className="panel form-grid" onSubmit={addCustomer}>
        <h2>Nuovo cliente</h2>
        <label>Nome<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
        <label>Telefono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
        <label>Formula colore<input value={form.colorFormula} onChange={(event) => setForm({ ...form, colorFormula: event.target.value })} /></label>
        <label>Preferenze<input value={form.preferences} onChange={(event) => setForm({ ...form, preferences: event.target.value })} /></label>
        <button className="app-primary">Salva cliente</button>
      </form>
    </div>
  );
};

const Automations: React.FC<{ data: SalonData }> = ({ data }) => {
  const dormant = data.customers.filter((customer) => !data.appointments.some((appointment) => appointment.customerId === customer.id && appointment.status === 'Scheduled'));
  const templates = [
    ['Reminder appuntamento', "Ciao {nome}, ti ricordiamo l'appuntamento di domani da {salone}. Rispondi OK per confermare."],
    ['Cliente dormiente', 'Ciao {nome}, è da un po che non ti vediamo. Ti va di prenotare una piega questa settimana?'],
    ['Recensione Google', 'Ciao {nome}, grazie per essere passata da {salone}. Ci lasci una recensione? {review}'],
    ['Compleanno', 'Auguri {nome}! Per te un trattamento speciale se prenoti entro 7 giorni.']
  ];
  return (
    <div className="workspace-grid">
      <section className="panel">
        <h2>Messaggi WhatsApp</h2>
        <div className="automation-list">
          {templates.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text.replace('{salone}', data.settings.name).replace('{review}', data.settings.googleReviewUrl)}</p>
              <button onClick={() => navigator.clipboard?.writeText(text)}>Copia testo</button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Clienti da recuperare</h2>
        <div className="list">
          {dormant.map((customer) => <div className="list-row" key={customer.id}><div><strong>{customer.fullName}</strong><span>{customer.phone}</span></div><span>{customer.marketingConsent ? 'WhatsApp OK' : 'No marketing'}</span></div>)}
        </div>
      </section>
    </div>
  );
};

const Statistics: React.FC<{ data: SalonData }> = ({ data }) => {
  const done = data.appointments.filter((appointment) => appointment.status === 'Done');
  const revenue = done.reduce((total, appointment) => total + serviceById(data, appointment.serviceId).priceCents, 0);
  const byService = data.services.map((service) => {
    const count = done.filter((appointment) => appointment.serviceId === service.id).length;
    return { service, count, revenue: count * service.priceCents };
  }).filter((item) => item.count > 0);
  const maxRevenue = Math.max(...byService.map((item) => item.revenue), 1);
  return (
    <div className="dashboard-grid">
      <Metric value={money(revenue)} label="fatturato stimato" />
      <Metric value={String(done.length)} label="appuntamenti completati" />
      <Metric value={money(Math.round(revenue / Math.max(done.length, 1)))} label="ticket medio" />
      <Metric value={String(data.customers.filter((customer) => customer.marketingConsent).length)} label="consensi marketing" />
      <section className="panel wide">
        <h2>Fatturato per servizio</h2>
        <div className="bar-list">
          {byService.map((item) => (
            <div key={item.service.id}>
              <span>{item.service.name}</span>
              <i style={{ width: `${Math.max(8, (item.revenue / maxRevenue) * 100)}%` }} />
              <strong>{money(item.revenue)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Settings: React.FC<{ data: SalonData; persist: (data: SalonData, message?: string) => void }> = ({ data, persist }) => {
  const [settings, setSettings] = useState(data.settings);
  const [operatorName, setOperatorName] = useState('');
  const [service, setService] = useState({ name: '', durationMinutes: 30, priceCents: 3000 });

  const saveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    persist({ ...data, settings }, 'Impostazioni salvate');
  };

  const addOperator = (event: React.FormEvent) => {
    event.preventDefault();
    persist({ ...data, operators: [...data.operators, { id: createId('op'), name: operatorName, color: '#bd315f', active: true }] }, 'Operatore aggiunto');
    setOperatorName('');
  };

  const addService = (event: React.FormEvent) => {
    event.preventDefault();
    persist({ ...data, services: [...data.services, { id: createId('srv'), name: service.name, durationMinutes: Number(service.durationMinutes), priceCents: Number(service.priceCents), active: true }] }, 'Servizio aggiunto');
    setService({ name: '', durationMinutes: 30, priceCents: 3000 });
  };

  return (
    <div className="workspace-grid">
      <form className="panel form-grid" onSubmit={saveSettings}>
        <h2>Salone</h2>
        <label>Nome<input value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} /></label>
        <label>Indirizzo<input value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} /></label>
        <label>Telefono<input value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></label>
        <label>Booking<input value={settings.bookingUrl} onChange={(event) => setSettings({ ...settings, bookingUrl: event.target.value })} /></label>
        <button className="app-primary">Salva impostazioni</button>
      </form>
      <form className="panel form-grid" onSubmit={addOperator}>
        <h2>Operatori</h2>
        <div className="chips">{data.operators.map((operator) => <span key={operator.id}>{operator.name}</span>)}</div>
        <label>Nuovo operatore<input value={operatorName} onChange={(event) => setOperatorName(event.target.value)} required /></label>
        <button className="app-primary">Aggiungi operatore</button>
      </form>
      <form className="panel form-grid" onSubmit={addService}>
        <h2>Servizi</h2>
        <div className="chips">{data.services.map((item) => <span key={item.id}>{item.name} · {money(item.priceCents)}</span>)}</div>
        <label>Nome servizio<input value={service.name} onChange={(event) => setService({ ...service, name: event.target.value })} required /></label>
        <label>Durata minuti<input type="number" value={service.durationMinutes} onChange={(event) => setService({ ...service, durationMinutes: Number(event.target.value) })} /></label>
        <label>Prezzo centesimi<input type="number" value={service.priceCents} onChange={(event) => setService({ ...service, priceCents: Number(event.target.value) })} /></label>
        <button className="app-primary">Aggiungi servizio</button>
      </form>
    </div>
  );
};

const WebApp: React.FC = () => {
  const [publicView, setPublicViewState] = useState<PublicView>(() => publicViewFromHash());
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem(SESSION_KEY) && hasProductionApi()));

  const setPublicView = (view: PublicView) => {
    setPublicViewState(view);
    if (typeof window !== 'undefined') {
      const nextHash = view === 'home' ? '' : `#${view}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
      }
    }
  };

  const onLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    clearProductionSession();
    setAuthenticated(false);
    setPublicView('home');
  };

  useEffect(() => {
    if (authenticated) loadSalonData();
  }, [authenticated]);

  useEffect(() => {
    const syncHash = () => setPublicViewState(publicViewFromHash());
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (publicView === 'home' && window.location.hash === '#lead-demo') {
      window.setTimeout(() => document.getElementById('lead-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [publicView]);

  return (
    <>
      {authenticated ? <AppShell onLogout={onLogout} /> : <PublicSite view={publicView} setView={setPublicView} onLogin={() => setAuthenticated(true)} />}
      <CookieConsentBanner />
    </>
  );
};

export default WebApp;
