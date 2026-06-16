# Salone Pro Web

Questa cartella e il sito web da pubblicare sul dominio: homepage commerciale, pagine prodotto, login clienti e applicazione gestionale browser autonoma.

La web app non importa componenti dalla versione desktop in `src/`. In modalita demo salva anche nel `localStorage`; in produzione si collega a `server/web-production-api.mjs` tramite `public/config.js`.

## Avvio sviluppo

```bash
npm install
npm run dev
```

## Build dominio

```bash
npm run build
```

Carica il contenuto di `web/dist/` sull'hosting statico.

Prima di pubblicare modifica `web/dist/config.js`:

```js
window.SALONE_PRO_CONFIG = {
  apiBaseUrl: "https://api.salonegestionale.it",
  siteUrl: "https://salonegestionale.it",
  allowLocalDemo: false
};
```

Se API e sito sono sullo stesso dominio, lascia `apiBaseUrl` vuoto e configura il proxy `/api/*`.

## Accesso clienti

- URL locale: `http://127.0.0.1:5174/`

Il login non contiene credenziali demo e non apre preview pubbliche. Sul dominio reale crea ogni salone dal backend con:

```bash
SALONE_ADMIN_API_KEY=<chiave-admin> npm run web:provision -- \
  --api https://salonegestionale.it \
  --name "Salone Rossi" \
  --email titolare@salonerossi.it
```

Le credenziali sono salvate nel database con password hashata.

## Backend produzione

Avvia l'API web con database persistente:

```bash
npm run web:api
```

Endpoint principali:

- `POST /api/public/leads`
- `POST /api/auth/login`
- `GET /api/app/bootstrap`
- `PUT /api/app/bootstrap`
- `POST /api/admin/salons`
- `POST /api/admin/users/reset-password`

Vedi `docs/PRODUZIONE_ONLINE.md` per variabili, dominio, backup e checklist.
