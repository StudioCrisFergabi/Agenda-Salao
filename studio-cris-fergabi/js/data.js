/* ============================================================
   Studio Cris Fergabi — camada de dados (js/data.js)
   Agora usando Firebase Firestore (dados em tempo real, únicos
   para todas as clientes e para o painel da proprietária).

   Todas as funções de STORE agora são assíncronas (retornam
   Promise) — sempre use `await STORE.algumaCoisa()`.
   ============================================================ */

import { db, auth, storage } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  runTransaction, serverTimestamp, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const LENGTH_LABELS = { curto: 'Curto', medio: 'Médio', longo: 'Longo' };

const DEFAULT_SERVICES = [
  { id: 'svc_corte', name: 'Corte', durations: { curto: 40, medio: 50, longo: 60 }, prices: { curto: 60, medio: 80, longo: 100 } },
  { id: 'svc_escova', name: 'Escova', durations: { curto: 30, medio: 40, longo: 55 }, prices: { curto: 45, medio: 65, longo: 90 } },
  { id: 'svc_progressiva', name: 'Progressiva', durations: { curto: 120, medio: 150, longo: 180 }, prices: { curto: 250, medio: 320, longo: 420 } },
  { id: 'svc_coloracao', name: 'Coloração', durations: { curto: 90, medio: 120, longo: 150 }, prices: { curto: 180, medio: 240, longo: 300 } },
  { id: 'svc_hidratacao', name: 'Hidratação', durations: { curto: 40, medio: 50, longo: 65 }, prices: { curto: 70, medio: 90, longo: 120 } }
];

// 0 = domingo ... 6 = sábado
const DEFAULT_HOURS = {
  0: null,
  1: { open: '09:00', close: '19:00' },
  2: { open: '09:00', close: '19:00' },
  3: { open: '09:00', close: '19:00' },
  4: { open: '09:00', close: '19:00' },
  5: { open: '09:00', close: '19:00' },
  6: { open: '09:00', close: '17:00' }
};

function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Garante que existam serviços e configurações iniciais no Firestore
 *  (só grava se ainda não existir nada — não sobrescreve dados reais). */
async function seedIfEmpty() {
  const servicesSnap = await getDocs(collection(db, 'services'));
  if (servicesSnap.empty) {
    await Promise.all(DEFAULT_SERVICES.map(s => {
      const { id, ...rest } = s;
      return setDoc(doc(db, 'services', id), rest);
    }));
  }
  const hoursRef = doc(db, 'settings', 'hours');
  const hoursSnap = await getDoc(hoursRef);
  if (!hoursSnap.exists()) await setDoc(hoursRef, DEFAULT_HOURS);

  const blockedRef = doc(db, 'settings', 'blockedDates');
  const blockedSnap = await getDoc(blockedRef);
  if (!blockedSnap.exists()) await setDoc(blockedRef, { dates: [] });
}

const readyPromise = seedIfEmpty().catch(err => {
  console.error('Falha ao inicializar dados no Firestore:', err);
});

export const STORE = {
  ready: readyPromise,

  // ---- services ----
  async getServices() {
    const snap = await getDocs(collection(db, 'services'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addService(svc) {
    await addDoc(collection(db, 'services'), svc);
  },
  async updateService(id, patch) {
    await updateDoc(doc(db, 'services', id), patch);
  },
  async removeService(id) {
    await deleteDoc(doc(db, 'services', id));
  },

  // ---- business hours ----
  async getHours() {
    const snap = await getDoc(doc(db, 'settings', 'hours'));
    return snap.exists() ? snap.data() : DEFAULT_HOURS;
  },
  async saveHours(hours) {
    await setDoc(doc(db, 'settings', 'hours'), hours);
  },

  // ---- blocked dates (YYYY-MM-DD) ----
  async getBlockedDates() {
    const snap = await getDoc(doc(db, 'settings', 'blockedDates'));
    return snap.exists() ? (snap.data().dates || []) : [];
  },
  async addBlockedDate(dateStr) {
    const list = await STORE.getBlockedDates();
    if (!list.includes(dateStr)) {
      await setDoc(doc(db, 'settings', 'blockedDates'), { dates: [...list, dateStr] });
    }
  },
  async removeBlockedDate(dateStr) {
    const list = await STORE.getBlockedDates();
    await setDoc(doc(db, 'settings', 'blockedDates'), { dates: list.filter(d => d !== dateStr) });
  },

  // ---- bookings ----
  async getBookingsForDate(dateStr) {
    const q = query(collection(db, 'bookings'), where('date', '==', dateStr));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Cria um agendamento com checagem de conflito revalidada no momento
   * da gravação (transação), para que duas clientes não consigam
   * reservar o mesmo horário ao mesmo tempo. Lança um erro com a
   * mensagem 'CONFLICT' se o horário já não estiver mais livre.
   */
  async addBooking(booking) {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('date', '==', booking.date));
    const snap = await getDocs(q);
    const existingRefs = snap.docs.map(d => d.ref);
    const newRef = doc(bookingsRef);
    const start = toMinutes(booking.startTime);
    const end = toMinutes(booking.endTime);

    // Transação: relê cada agendamento existente no exato momento da
    // gravação. Se algum deles mudar entre a consulta acima e o commit
    // (ex.: outra cliente reservou um horário conflitante nesse meio
    // tempo), o Firestore rejeita a transação e tentamos de novo — isso
    // é o que impede duas clientes de ocuparem o mesmo horário.
    await runTransaction(db, async (tx) => {
      const freshDocs = await Promise.all(existingRefs.map(r => tx.get(r)));
      const conflict = freshDocs.some(fd => {
        if (!fd.exists()) return false;
        const b = fd.data();
        const bStart = toMinutes(b.startTime);
        const bEnd = toMinutes(b.endTime);
        return start < bEnd && end > bStart;
      });
      if (conflict) throw new Error('CONFLICT');
      tx.set(newRef, { ...booking, createdAt: serverTimestamp() });
    });
    return { id: newRef.id, ...booking };
  },

  async removeBooking(id) {
    await deleteDoc(doc(db, 'bookings', id));
  },
  async updateBooking(id, patch) {
    await updateDoc(doc(db, 'bookings', id), patch);
  },

  /**
   * Gera os horários de início disponíveis para um serviço/comprimento
   * em uma data, respeitando expediente, datas bloqueadas e conflitos
   * com agendamentos já existentes (bloqueando o período inteiro do
   * serviço, não só o horário de início).
   */
  async getAvailableSlots(dateStr, durationMin, stepMin = 15) {
    const blocked = await STORE.getBlockedDates();
    if (blocked.includes(dateStr)) return [];

    const [y, m, d] = dateStr.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const hours = await STORE.getHours();
    const dayHours = hours[weekday];
    if (!dayHours) return [];

    const openMin = toMinutes(dayHours.open);
    const closeMin = toMinutes(dayHours.close);
    const existing = await STORE.getBookingsForDate(dateStr);

    const slots = [];
    for (let start = openMin; start + durationMin <= closeMin; start += stepMin) {
      const end = start + durationMin;
      const conflict = existing.some(b => {
        const bStart = toMinutes(b.startTime);
        const bEnd = toMinutes(b.endTime);
        return start < bEnd && end > bStart;
      });
      if (!conflict) slots.push(toHHMM(start));
    }

    const now = new Date();
    const isToday = now.getFullYear() === y && (now.getMonth() + 1) === m && now.getDate() === d;
    if (isToday) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return slots.filter(s => toMinutes(s) > nowMin);
    }
    return slots;
  },

  // ---- galeria de fotos ----
  async getGalleryPhotos() {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addGalleryPhoto(file) {
    const path = `gallery/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await addDoc(collection(db, 'gallery'), { url, path, createdAt: serverTimestamp() });
  },
  async removeGalleryPhoto(id, path) {
    await deleteDoc(doc(db, 'gallery', id));
    try { await deleteObject(ref(storage, path)); } catch (e) { /* arquivo já pode ter sido removido */ }
  }
};

// Disponibiliza globalmente para booking.js / admin.js (que não usam import)
window.STORE = STORE;
window.LENGTH_LABELS = LENGTH_LABELS;
window.FIREBASE_AUTH = auth;
