export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  birthday?: string;
  marketingConsent: boolean;
  colorFormula?: string;
  preferences?: string;
  notes?: string;
  createdAt: string;
};

export type Operator = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  phases?: string;
  active: boolean;
};

export type Appointment = {
  id: string;
  customerId: string;
  operatorId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: 'Scheduled' | 'Done' | 'Cancelled';
  notes?: string;
  createdAt: string;
};

export type Treatment = {
  id: string;
  customerId: string;
  serviceName: string;
  dateAt: string;
  priceCents: number;
  notes?: string;
};

export type SalonSettings = {
  name: string;
  address: string;
  phone: string;
  bookingUrl: string;
  googleReviewUrl: string;
  businessStartHour: number;
  businessEndHour: number;
};

export type SalonData = {
  settings: SalonSettings;
  operators: Operator[];
  services: Service[];
  customers: Customer[];
  appointments: Appointment[];
  treatments: Treatment[];
};

const STORAGE_KEY = 'salone-pro-web-standalone-v1';
export const SESSION_KEY = 'salone-pro-web-session';
export const API_TOKEN_KEY = 'salone-pro-api-token';

declare global {
  interface Window {
    SALONE_PRO_CONFIG?: {
      apiBaseUrl?: string;
      siteUrl?: string;
      allowLocalDemo?: boolean;
    };
  }
}

const nowIso = () => new Date().toISOString();

const isoAt = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const addMinutes = (iso: string, minutes: number) => {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const demoSalon = (): SalonData => {
  const createdAt = nowIso();
  const services: Service[] = [
    { id: 'piega', name: 'Piega', durationMinutes: 30, priceCents: 2500, active: true },
    { id: 'taglio-donna', name: 'Taglio donna', durationMinutes: 45, priceCents: 3800, active: true },
    { id: 'colore', name: 'Colore con posa', durationMinutes: 95, priceCents: 6200, phases: 'Applicazione 30m, posa 35m, rifinitura 30m', active: true },
    { id: 'balayage', name: 'Balayage', durationMinutes: 120, priceCents: 12500, phases: 'Schiaritura, tonalizzante, piega finale', active: true },
    { id: 'trattamento-cute', name: 'Trattamento cute', durationMinutes: 35, priceCents: 3200, active: true }
  ];

  const customers: Customer[] = [
    { id: 'c-giulia-ferri', fullName: 'Giulia Ferri', phone: '+39 333 182 4410', email: 'giulia@example.it', birthday: '1992-04-18', marketingConsent: true, colorFormula: 'Base 7.34 + 20 vol, posa 35m', preferences: 'Preferisce martedi mattina', notes: 'Chiedere recensione dopo colore.', createdAt },
    { id: 'c-martina-rossi', fullName: 'Martina Rossi', phone: '+39 340 778 1209', email: 'martina@example.it', birthday: '1988-09-05', marketingConsent: true, colorFormula: 'Tonalizzante 9.13, posa 20m', preferences: 'No phon troppo caldo', createdAt },
    { id: 'c-elena-bianchi', fullName: 'Elena Bianchi', phone: '+39 347 221 9001', marketingConsent: false, preferences: 'Pausa pranzo', createdAt },
    { id: 'c-chiara-gallo', fullName: 'Chiara Gallo', phone: '+39 328 011 7720', birthday: '1984-12-02', marketingConsent: true, colorFormula: 'Balayage miele, gloss finale', createdAt },
    { id: 'c-francesca-neri', fullName: 'Francesca Neri', phone: '+39 339 710 4512', marketingConsent: true, preferences: 'Reminder WhatsApp 24h prima', createdAt }
  ];

  const operators: Operator[] = [
    { id: 'asia', name: 'Asia', color: '#cf3f7d', active: true },
    { id: 'amanda', name: 'Amanda', color: '#147f78', active: true },
    { id: 'sofia', name: 'Sofia', color: '#7c5cff', active: true }
  ];

  const appointment = (
    id: string,
    customerId: string,
    operatorId: string,
    serviceId: string,
    dayOffset: number,
    hour: number,
    status: Appointment['status'] = 'Scheduled'
  ): Appointment => {
    const service = services.find((item) => item.id === serviceId) || services[0];
    const startAt = isoAt(dayOffset, hour);
    return {
      id,
      customerId,
      operatorId,
      serviceId,
      startAt,
      endAt: addMinutes(startAt, service.durationMinutes),
      status,
      createdAt
    };
  };

  const appointments = [
    appointment('a-oggi-giulia', 'c-giulia-ferri', 'asia', 'colore', 0, 9),
    appointment('a-oggi-elena', 'c-elena-bianchi', 'amanda', 'taglio-donna', 0, 11),
    appointment('a-oggi-francesca', 'c-francesca-neri', 'sofia', 'piega', 0, 15),
    appointment('a-domani-chiara', 'c-chiara-gallo', 'asia', 'balayage', 1, 10),
    appointment('a-domani-martina', 'c-martina-rossi', 'amanda', 'trattamento-cute', 1, 16),
    appointment('a-done-1', 'c-martina-rossi', 'asia', 'piega', -4, 10, 'Done'),
    appointment('a-done-2', 'c-chiara-gallo', 'sofia', 'balayage', -6, 14, 'Done'),
    appointment('a-done-3', 'c-giulia-ferri', 'amanda', 'taglio-donna', -9, 9, 'Done'),
    appointment('a-done-4', 'c-francesca-neri', 'asia', 'colore', -12, 11, 'Done')
  ];

  const treatments = appointments
    .filter((item) => item.status === 'Done')
    .map((item): Treatment => {
      const service = services.find((serviceItem) => serviceItem.id === item.serviceId) || services[0];
      return {
        id: `t-${item.id}`,
        customerId: item.customerId,
        serviceName: service.name,
        dateAt: item.endAt,
        priceCents: service.priceCents,
        notes: service.id === 'colore' ? 'Formula colore salvata in scheda cliente.' : 'Cliente soddisfatta, proporre recensione Google.'
      };
    });

  return {
    settings: {
      name: 'Salone Milano Brera',
      address: 'Via della Moscova 18, Milano',
      phone: '+39 02 9288 0140',
      bookingUrl: 'https://prenota.salonepro.it/salone-milano-brera',
      googleReviewUrl: 'https://g.page/r/Cbeta/review',
      businessStartHour: 8,
      businessEndHour: 20
    },
    operators,
    services,
    customers,
    appointments,
    treatments
  };
};

export const loadSalonData = (): SalonData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const seeded = demoSalon();
    saveSalonData(seeded);
    return seeded;
  }
  try {
    return JSON.parse(saved) as SalonData;
  } catch {
    const seeded = demoSalon();
    saveSalonData(seeded);
    return seeded;
  }
};

export const saveSalonData = (data: SalonData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const isLocalHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '';
};

export const apiBaseUrl = () => {
  const value = typeof window !== 'undefined' ? window.SALONE_PRO_CONFIG?.apiBaseUrl || '' : '';
  const configured = value.trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined' && !isLocalHost()) return window.location.origin;
  return '';
};

export const hasProductionApi = () => Boolean(apiBaseUrl());

export const canUseLocalDemo = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SALONE_PRO_CONFIG?.allowLocalDemo)
    || isLocalHost();
};

const apiToken = () => localStorage.getItem(API_TOKEN_KEY) || '';

const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error('API produzione non configurata');

  const headers = new Headers(options.headers || {});
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
  const token = apiToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'omit'
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Errore collegamento server');
  }
  return body as T;
};

export const loginWithProductionApi = async (email: string, password: string) => {
  const body = await apiFetch<{ token: string; data: SalonData }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem(API_TOKEN_KEY, body.token);
  localStorage.setItem(SESSION_KEY, '1');
  saveSalonData(body.data);
  return body.data;
};

export const loadSalonDataFromApi = async () => {
  if (!hasProductionApi() || !apiToken()) return null;
  const body = await apiFetch<{ data: SalonData }>('/api/app/bootstrap');
  saveSalonData(body.data);
  return body.data;
};

export const saveSalonDataToApi = async (data: SalonData) => {
  if (!hasProductionApi() || !apiToken()) return false;
  await apiFetch<{ ok: true }>('/api/app/bootstrap', {
    method: 'PUT',
    body: JSON.stringify({ data })
  });
  return true;
};

export const submitLeadToApi = async (payload: Record<string, FormDataEntryValue>) => {
  if (!hasProductionApi()) return false;
  await apiFetch<{ ok: true }>('/api/public/leads', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return true;
};

export const clearProductionSession = () => {
  localStorage.removeItem(API_TOKEN_KEY);
};

export const resetSalonData = () => {
  const seeded = demoSalon();
  saveSalonData(seeded);
  return seeded;
};

export const money = (cents: number) => new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR'
}).format(cents / 100);

export const shortDateTime = (value: string) => new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value));

export const dateInput = (value = new Date()) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const timeInput = (value = new Date()) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(11, 16);
};
