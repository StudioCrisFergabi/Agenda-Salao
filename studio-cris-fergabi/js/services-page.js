/* Studio Cris Fergabi — js/services-page.js (página servicos.html) */

const currency = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function renderServicesList() {
  const list = document.getElementById('servicesList');
  list.innerHTML = `<div class="admin-empty">Carregando serviços…</div>`;
  let services = [];
  try {
    services = await STORE.getServices();
  } catch (err) {
    console.error('Não foi possível carregar os serviços:', err);
    list.innerHTML = `<div class="admin-empty">Não foi possível carregar os serviços agora. Recarregue a página em instantes.</div>`;
    return;
  }
  list.innerHTML = services.map(s => `
      <div class="service-card">
        <h3>${s.name}</h3>
        <div class="service-card__prices">
          <div class="len-price"><span class="len-label">Curto</span><strong>${currency(s.prices.curto)}</strong></div>
          <div class="len-price"><span class="len-label">Médio</span><strong>${currency(s.prices.medio)}</strong></div>
          <div class="len-price"><span class="len-label">Longo</span><strong>${currency(s.prices.longo)}</strong></div>
        </div>
        <a href="agendar.html?service=${encodeURIComponent(s.id)}" class="btn-service-link">Agendar</a>
      </div>`).join('');
}

(async function init() {
  await STORE.ready;
  await renderServicesList();
})();
