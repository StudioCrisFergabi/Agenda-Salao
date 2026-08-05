/* Studio Cris Fergabi — js/booking-page.js (página agendar.html) */

const currency = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const WHATSAPP_NUMBER = '5511965114520';
document.getElementById('serviceHelpLink').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o comprimento do cabelo ou os serviços do Studio Cris Fergabi.')}`;

let CACHED_SERVICES = [];
let preselectServiceId = new URLSearchParams(location.search).get('service');

// ---------- booking wizard state ----------
const state = { service: null, length: null, date: null, time: null };

function renderServiceChoices() {
  const box = document.getElementById('serviceChoices');
  box.innerHTML = CACHED_SERVICES.map(s => {
    const price = s.prices[state.length];
    return `
    <button class="choice" data-service="${s.id}">
      <strong>${s.name}</strong>
      <span>${currency(price)}</span>
    </button>`;
  }).join('');
  box.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => selectService(btn.dataset.service));
  });
  if (preselectServiceId) {
    if (CACHED_SERVICES.some(s => s.id === preselectServiceId)) selectService(preselectServiceId);
    preselectServiceId = null;
  }
}

function selectService(id) {
  state.service = CACHED_SERVICES.find(s => s.id === id);
  document.querySelectorAll('#serviceChoices .choice').forEach(b => b.classList.toggle('selected', b.dataset.service === id));
  document.getElementById('toStep3').disabled = false;
}

document.querySelectorAll('#lengthChoices .choice').forEach(btn => {
  btn.addEventListener('click', () => {
    state.length = btn.dataset.length;
    document.querySelectorAll('#lengthChoices .choice').forEach(b => b.classList.toggle('selected', b === btn));
    document.getElementById('toStep2').disabled = false;
  });
});

// ---------- data ----------
const dateInput = document.getElementById('dateInput');
const todayStr = new Date().toISOString().slice(0, 10);
dateInput.min = todayStr;
dateInput.addEventListener('change', async () => {
  state.date = dateInput.value;
  state.time = null;
  const hint = document.getElementById('dateHint');
  if (!state.date) { document.getElementById('toStep4').disabled = true; return; }
  hint.textContent = 'Verificando disponibilidade…';
  let blocked = false;
  try {
    const blockedDates = await STORE.getBlockedDates();
    blocked = blockedDates.includes(state.date);
  } catch (err) {
    console.error(err);
  }
  if (blocked) {
    hint.textContent = 'Essa data não está disponível para agendamentos. Escolha outra data.';
    document.getElementById('toStep4').disabled = true;
  } else {
    hint.textContent = 'Data selecionada. Clique em continuar para ver os horários livres.';
    document.getElementById('toStep4').disabled = false;
  }
});

// ---------- horários ----------
async function renderSlots() {
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML = `<div class="slot-empty">Carregando horários…</div>`;
  const duration = state.service.durations[state.length];
  let slots = [];
  try {
    slots = await STORE.getAvailableSlots(state.date, duration);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="slot-empty">Não foi possível carregar os horários agora. Tente novamente.</div>`;
    document.getElementById('toStep5').disabled = true;
    return;
  }
  if (!slots.length) {
    grid.innerHTML = `<div class="slot-empty">Não há horários livres nesta data para este serviço. Volte e escolha outra data.</div>`;
    document.getElementById('toStep5').disabled = true;
    return;
  }
  grid.innerHTML = slots.map(s => `<button class="slot" data-time="${s}">${s}</button>`).join('');
  grid.querySelectorAll('.slot').forEach(btn => {
    btn.addEventListener('click', () => {
      state.time = btn.dataset.time;
      grid.querySelectorAll('.slot').forEach(b => b.classList.toggle('selected', b === btn));
      document.getElementById('toStep5').disabled = false;
    });
  });
}

// ---------- navegação entre passos ----------
function goToStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${n}`).classList.add('active');
  document.querySelectorAll('.step').forEach(s => {
    const step = Number(s.dataset.step);
    s.classList.toggle('active', step === n);
    s.classList.toggle('done', step < n);
  });
  document.querySelector('.booking-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('toStep2').addEventListener('click', () => { renderServiceChoices(); goToStep(2); });
document.getElementById('toStep3').addEventListener('click', () => goToStep(3));
document.getElementById('toStep4').addEventListener('click', async () => { goToStep(4); await renderSlots(); });
document.getElementById('toStep5').addEventListener('click', () => { renderSummary(); goToStep(5); });

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => goToStep(Number(btn.dataset.back)));
});

function renderSummary() {
  const duration = state.service.durations[state.length];
  const price = state.service.prices[state.length];
  const [y, m, d] = state.date.split('-');
  document.getElementById('summaryBox').innerHTML = `
    <div><b>Serviço:</b> ${state.service.name} (${LENGTH_LABELS[state.length]})</div>
    <div><b>Data:</b> ${d}/${m}/${y} às ${state.time}</div>
    <div><b>Duração prevista:</b> ${duration} min</div>
    <div><b>Valor:</b> ${currency(price)}</div>`;
}

// ---------- confirmar ----------
document.getElementById('confirmBooking').addEventListener('click', async () => {
  const name = document.getElementById('nameInput').value.trim();
  const wa = document.getElementById('waInput').value.trim();
  if (!name || !wa) { showToast('Preencha nome e WhatsApp para confirmar.'); return; }

  const confirmBtn = document.getElementById('confirmBooking');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Confirmando…';

  const duration = state.service.durations[state.length];
  const startMin = (() => { const [h, m] = state.time.split(':').map(Number); return h * 60 + m; })();
  const endTime = `${String(Math.floor((startMin + duration) / 60)).padStart(2, '0')}:${String((startMin + duration) % 60).padStart(2, '0')}`;

  try {
    await STORE.addBooking({
      serviceId: state.service.id,
      serviceName: state.service.name,
      length: state.length,
      date: state.date,
      startTime: state.time,
      endTime,
      durationMin: duration,
      price: state.service.prices[state.length],
      name, whatsapp: wa
    });

    const [y, m, d] = state.date.split('-');
    document.getElementById('confirmText').textContent =
      `${state.service.name} (${LENGTH_LABELS[state.length]}) em ${d}/${m}/${y} às ${state.time}. Obrigada, ${name.split(' ')[0]}!`;
    goToStep(6);
  } catch (err) {
    if (err.message === 'CONFLICT') {
      showToast('Esse horário acabou de ser reservado por outra cliente. Escolha outro.');
      await renderSlots();
      goToStep(4);
    } else {
      console.error(err);
      showToast('Não foi possível confirmar agora. Tente novamente em instantes.');
    }
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar agendamento';
  }
});

document.getElementById('newBooking').addEventListener('click', () => {
  state.service = null; state.length = null; state.date = null; state.time = null;
  dateInput.value = '';
  document.getElementById('toStep2').disabled = true;
  document.getElementById('toStep3').disabled = true;
  document.getElementById('toStep4').disabled = true;
  document.getElementById('toStep5').disabled = true;
  document.querySelectorAll('.choice.selected').forEach(b => b.classList.remove('selected'));
  goToStep(1);
});

// ---------- boot ----------
(async function init() {
  await STORE.ready;
  try {
    CACHED_SERVICES = await STORE.getServices();
  } catch (err) {
    console.error('Não foi possível carregar os serviços:', err);
    showToast('Não foi possível carregar os serviços agora. Recarregue a página.');
  }
})();
