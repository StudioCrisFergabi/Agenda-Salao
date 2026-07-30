/* Studio Cris Fergabi — js/admin.js */

import { onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const currency = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ---------- auth ----------
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginError = document.getElementById('loginError');
let dashboardInited = false;

async function boot() {
  await window.STORE.ready;
  onAuthStateChanged(window.FIREBASE_AUTH, (user) => {
    if (user) {
      loginScreen.hidden = true; dashboard.hidden = false;
      initDashboard();
    } else {
      loginScreen.hidden = false; dashboard.hidden = true;
    }
  });
}
boot();

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('emailInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passInput').value;
  loginError.textContent = '';
  if (!email || !pass) { loginError.textContent = 'Preencha e-mail e senha.'; return; }
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    await signInWithEmailAndPassword(window.FIREBASE_AUTH, email, pass);
  } catch (err) {
    loginError.textContent = 'E-mail ou senha incorretos.';
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  signOut(window.FIREBASE_AUTH);
});

// ---------- tabs ----------
document.querySelectorAll('.admin__navbtn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin__navbtn[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.id === `tab-${btn.dataset.tab}`));
  });
});

async function initDashboard() {
  if (dashboardInited) return;
  dashboardInited = true;
  await Promise.all([
    renderServicesTable(),
    renderHoursForm(),
    renderBlockedList(),
    populateManualServiceSelect(),
    renderGalleryAdmin()
  ]);
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById('agendaDate').value = todayStr;
  document.getElementById('manualDate').value = todayStr;
  await renderAgenda();
  document.getElementById('agendaDate').addEventListener('change', renderAgenda);
}

// ============================================================
// GALERIA
// ============================================================
async function renderGalleryAdmin() {
  const grid = document.getElementById('galleryAdminGrid');
  grid.innerHTML = `<div class="admin-empty">Carregando…</div>`;
  const photos = await window.STORE.getGalleryPhotos();
  if (!photos.length) { grid.innerHTML = `<div class="admin-empty">Nenhuma foto adicionada ainda.</div>`; return; }
  grid.innerHTML = photos.map(p => `
    <div class="gallery-admin-tile">
      <img src="${p.url}" alt="">
      <button data-remove="${p.id}" data-path="${p.path}" aria-label="Remover foto">✕</button>
    </div>`).join('');
  grid.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Remover esta foto da galeria?')) return;
    await window.STORE.removeGalleryPhoto(btn.dataset.remove, btn.dataset.path);
    await renderGalleryAdmin();
    showToast('Foto removida.');
  }));
}

document.getElementById('galleryUploadBtn').addEventListener('click', async () => {
  const input = document.getElementById('galleryFileInput');
  const files = Array.from(input.files || []);
  const status = document.getElementById('galleryUploadStatus');
  if (!files.length) { showToast('Escolha ao menos uma foto.'); return; }
  const btn = document.getElementById('galleryUploadBtn');
  btn.disabled = true;
  let done = 0;
  for (const file of files) {
    status.textContent = `Enviando ${done + 1} de ${files.length}…`;
    try {
      await window.STORE.addGalleryPhoto(file);
      done++;
    } catch (err) {
      console.error(err);
      showToast(`Não foi possível enviar "${file.name}".`);
    }
  }
  status.textContent = done ? `${done} foto(s) enviada(s) com sucesso.` : '';
  input.value = '';
  btn.disabled = false;
  await renderGalleryAdmin();
  if (done) showToast('Galeria atualizada.');
});

// ============================================================
// SERVIÇOS
// ============================================================
const modal = document.getElementById('serviceModal');
let editingServiceId = null;
let CACHED_SERVICES = [];

async function renderServicesTable() {
  const box = document.getElementById('servicesTable');
  box.innerHTML = `<div class="admin-empty">Carregando…</div>`;
  CACHED_SERVICES = await window.STORE.getServices();
  let html = `<div class="admin-row admin-row--head"><span>Serviço</span><span>Duração (C/M/L)</span><span>Preço (C/M/L)</span><span></span></div>`;
  if (!CACHED_SERVICES.length) html += `<div class="admin-empty">Nenhum serviço cadastrado.</div>`;
  html += CACHED_SERVICES.map(s => `
    <div class="admin-row">
      <span>${s.name}</span>
      <span>${s.durations.curto} / ${s.durations.medio} / ${s.durations.longo} min</span>
      <span>${currency(s.prices.curto)} / ${currency(s.prices.medio)} / ${currency(s.prices.longo)}</span>
      <span class="actions">
        <button data-edit="${s.id}">Editar</button>
        <button data-del="${s.id}" class="danger">Remover</button>
      </span>
    </div>`).join('');
  box.innerHTML = html;

  box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openServiceModal(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (confirm('Remover este serviço? Esta ação não pode ser desfeita.')) {
      await window.STORE.removeService(b.dataset.del);
      await renderServicesTable();
      await populateManualServiceSelect();
      showToast('Serviço removido.');
    }
  }));
}

document.getElementById('newServiceBtn').addEventListener('click', () => openServiceModal(null));

function openServiceModal(id) {
  editingServiceId = id;
  document.getElementById('modalTitle').textContent = id ? 'Editar serviço' : 'Novo serviço';
  if (id) {
    const s = CACHED_SERVICES.find(x => x.id === id);
    document.getElementById('svcName').value = s.name;
    document.getElementById('svcDurCurto').value = s.durations.curto;
    document.getElementById('svcDurMedio').value = s.durations.medio;
    document.getElementById('svcDurLongo').value = s.durations.longo;
    document.getElementById('svcPriceCurto').value = s.prices.curto;
    document.getElementById('svcPriceMedio').value = s.prices.medio;
    document.getElementById('svcPriceLongo').value = s.prices.longo;
  } else {
    ['svcName','svcDurCurto','svcDurMedio','svcDurLongo','svcPriceCurto','svcPriceMedio','svcPriceLongo']
      .forEach(id2 => document.getElementById(id2).value = '');
  }
  modal.hidden = false;
}
document.getElementById('modalCancel').addEventListener('click', () => modal.hidden = true);

document.getElementById('modalSave').addEventListener('click', async () => {
  const name = document.getElementById('svcName').value.trim();
  const durations = {
    curto: Number(document.getElementById('svcDurCurto').value),
    medio: Number(document.getElementById('svcDurMedio').value),
    longo: Number(document.getElementById('svcDurLongo').value)
  };
  const prices = {
    curto: Number(document.getElementById('svcPriceCurto').value),
    medio: Number(document.getElementById('svcPriceMedio').value),
    longo: Number(document.getElementById('svcPriceLongo').value)
  };
  if (!name || !durations.curto || !durations.medio || !durations.longo) {
    showToast('Preencha nome e as durações de todos os comprimentos.');
    return;
  }
  const saveBtn = document.getElementById('modalSave');
  saveBtn.disabled = true;
  try {
    if (editingServiceId) {
      await window.STORE.updateService(editingServiceId, { name, durations, prices });
      showToast('Serviço atualizado.');
    } else {
      await window.STORE.addService({ name, durations, prices });
      showToast('Serviço adicionado.');
    }
    modal.hidden = true;
    await renderServicesTable();
    await populateManualServiceSelect();
  } catch (err) {
    console.error(err);
    showToast('Não foi possível salvar. Tente novamente.');
  } finally {
    saveBtn.disabled = false;
  }
});

// ============================================================
// HORÁRIO DE FUNCIONAMENTO
// ============================================================
const DAY_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

async function renderHoursForm() {
  const hours = await window.STORE.getHours();
  const box = document.getElementById('hoursForm');
  box.innerHTML = DAY_NAMES.map((name, i) => {
    const day = hours[i];
    const closed = !day;
    return `
      <div class="hours-row" data-day="${i}">
        <label class="day">${name}</label>
        <input type="time" class="hour-open" value="${day ? day.open : '09:00'}" ${closed ? 'disabled' : ''}>
        <span>até</span>
        <input type="time" class="hour-close" value="${day ? day.close : '19:00'}" ${closed ? 'disabled' : ''}>
        <label class="closed-toggle" style="grid-column:1/-1">
          <input type="checkbox" class="hour-closed" ${closed ? 'checked' : ''}> Fechado neste dia
        </label>
      </div>`;
  }).join('');

  box.querySelectorAll('.hour-closed').forEach(cb => {
    cb.addEventListener('change', () => {
      const row = cb.closest('.hours-row');
      row.querySelector('.hour-open').disabled = cb.checked;
      row.querySelector('.hour-close').disabled = cb.checked;
    });
  });
}

document.getElementById('saveHoursBtn').addEventListener('click', async () => {
  const hours = {};
  document.querySelectorAll('.hours-row').forEach(row => {
    const day = row.dataset.day;
    const closed = row.querySelector('.hour-closed').checked;
    hours[day] = closed ? null : {
      open: row.querySelector('.hour-open').value,
      close: row.querySelector('.hour-close').value
    };
  });
  await window.STORE.saveHours(hours);
  showToast('Horários de funcionamento salvos.');
});

// ============================================================
// DATAS BLOQUEADAS
// ============================================================
async function renderBlockedList() {
  const list = (await window.STORE.getBlockedDates()).slice().sort();
  const box = document.getElementById('blockedList');
  if (!list.length) { box.innerHTML = `<div class="admin-empty">Nenhuma data bloqueada.</div>`; return; }
  box.innerHTML = `<div class="admin-row admin-row--head"><span>Data</span><span></span><span></span><span></span></div>` +
    list.map(d => {
      const [y, m, dd] = d.split('-');
      return `<div class="admin-row"><span>${dd}/${m}/${y}</span><span></span><span></span>
        <span class="actions"><button data-unblock="${d}" class="danger">Desbloquear</button></span></div>`;
    }).join('');
  box.querySelectorAll('[data-unblock]').forEach(b => b.addEventListener('click', async () => {
    await window.STORE.removeBlockedDate(b.dataset.unblock);
    await renderBlockedList();
    showToast('Data desbloqueada.');
  }));
}

document.getElementById('addBlockBtn').addEventListener('click', async () => {
  const val = document.getElementById('blockDateInput').value;
  if (!val) { showToast('Escolha uma data.'); return; }
  await window.STORE.addBlockedDate(val);
  document.getElementById('blockDateInput').value = '';
  await renderBlockedList();
  showToast('Data bloqueada.');
});

// ============================================================
// AGENDA
// ============================================================
async function renderAgenda() {
  const date = document.getElementById('agendaDate').value;
  const box = document.getElementById('agendaList');
  if (!date) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="admin-empty">Carregando…</div>`;
  const bookings = (await window.STORE.getBookingsForDate(date)).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  let html = `<div class="admin-row admin-row--head"><span>Horário</span><span>Cliente</span><span>Serviço</span><span></span></div>`;
  if (!bookings.length) html += `<div class="admin-empty">Nenhum agendamento para esta data.</div>`;
  html += bookings.map(b => `
    <div class="admin-row">
      <span>${b.startTime} – ${b.endTime}</span>
      <span>${b.name}<br><small style="color:var(--ink-muted)">${b.whatsapp}</small></span>
      <span>${b.serviceName} (${window.LENGTH_LABELS[b.length] || b.length})</span>
      <span class="actions"><button data-cancel="${b.id}" class="danger">Cancelar</button></span>
    </div>`).join('');
  box.innerHTML = html;
  box.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', async () => {
    if (confirm('Cancelar este agendamento?')) {
      await window.STORE.removeBooking(btn.dataset.cancel);
      await renderAgenda();
      showToast('Agendamento cancelado.');
    }
  }));
}

// ---------- marcar manualmente ----------
async function populateManualServiceSelect() {
  const sel = document.getElementById('manualService');
  sel.innerHTML = CACHED_SERVICES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  await refreshManualSlots();
}
document.getElementById('manualService').addEventListener('change', refreshManualSlots);
document.getElementById('manualLength').addEventListener('change', refreshManualSlots);
document.getElementById('manualDate').addEventListener('change', refreshManualSlots);

async function refreshManualSlots() {
  const svcId = document.getElementById('manualService').value;
  const svc = CACHED_SERVICES.find(s => s.id === svcId);
  const length = document.getElementById('manualLength').value;
  const date = document.getElementById('manualDate').value;
  const sel = document.getElementById('manualSlot');
  if (!svc || !date) { sel.innerHTML = ''; return; }
  sel.innerHTML = `<option value="">Carregando…</option>`;
  const duration = svc.durations[length];
  const slots = await window.STORE.getAvailableSlots(date, duration);
  sel.innerHTML = slots.length
    ? slots.map(s => `<option value="${s}">${s}</option>`).join('')
    : `<option value="">Sem horários livres</option>`;
}

document.getElementById('manualAddBtn').addEventListener('click', async () => {
  const svcId = document.getElementById('manualService').value;
  const svc = CACHED_SERVICES.find(s => s.id === svcId);
  const length = document.getElementById('manualLength').value;
  const date = document.getElementById('manualDate').value;
  const time = document.getElementById('manualSlot').value;
  const name = document.getElementById('manualName').value.trim();
  const wa = document.getElementById('manualWa').value.trim();

  if (!svc || !date || !time) { showToast('Preencha serviço, data e horário.'); return; }
  if (!name) { showToast('Informe o nome da cliente.'); return; }

  const duration = svc.durations[length];
  const startMin = (() => { const [h, m] = time.split(':').map(Number); return h * 60 + m; })();
  const endTime = `${String(Math.floor((startMin + duration) / 60)).padStart(2, '0')}:${String((startMin + duration) % 60).padStart(2, '0')}`;

  const btn = document.getElementById('manualAddBtn');
  btn.disabled = true;
  try {
    await window.STORE.addBooking({
      serviceId: svc.id, serviceName: svc.name, length, date,
      startTime: time, endTime, durationMin: duration, price: svc.prices[length],
      name, whatsapp: wa || '—'
    });
    document.getElementById('manualName').value = '';
    document.getElementById('manualWa').value = '';
    await refreshManualSlots();
    document.getElementById('agendaDate').value = date;
    await renderAgenda();
    showToast('Agendamento adicionado à agenda.');
  } catch (err) {
    if (err.message === 'CONFLICT') {
      showToast('Esse horário acabou de ficar indisponível. Escolha outro.');
      await refreshManualSlots();
    } else {
      console.error(err);
      showToast('Não foi possível adicionar agora. Tente novamente.');
    }
  } finally {
    btn.disabled = false;
  }
});
