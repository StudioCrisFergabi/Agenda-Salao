/* Studio Cris Fergabi — js/site.js
   Camada de acabamento visual: barra de progresso, destaque do menu
   conforme a rolagem, animações de entrada e CTA fixo no mobile.
   Não depende de Firebase — roda independente do resto do site. */

// ---------- barra de progresso de rolagem ----------
const progressBar = document.getElementById('scrollProgress');
function updateProgress() {
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  const pct = height > 0 ? (scrolled / height) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// ---------- menu mobile: botão de fechar ----------
const navCloseBtn = document.getElementById('navClose');
const navLinksEl = document.getElementById('navLinks');
if (navCloseBtn && navLinksEl) {
  navCloseBtn.addEventListener('click', () => navLinksEl.classList.remove('open'));
}

// ---------- scrollspy: destaca o link da seção visível ----------
const sections = ['sobre', 'servicos', 'galeria', 'agendar', 'contato']
  .map(id => document.getElementById(id))
  .filter(Boolean);
const navLinkMap = {};
document.querySelectorAll('[data-link]').forEach(a => { navLinkMap[a.dataset.link] = a; });

if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        Object.values(navLinkMap).forEach(a => a.classList.remove('is-active'));
        const link = navLinkMap[entry.target.id];
        if (link) link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));
}

// ---------- animações de entrada ao rolar ----------
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => reveal.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

// ---------- CTA fixo no mobile (some perto do formulário de agendar e do rodapé) ----------
const mobileCta = document.getElementById('mobileCta');
const agendarSection = document.getElementById('agendar');
const footerEl = document.querySelector('footer');
if (mobileCta && 'IntersectionObserver' in window) {
  const hideTargets = [agendarSection, footerEl].filter(Boolean);
  const ctaObserver = new IntersectionObserver((entries) => {
    const anyVisible = entries.some(e => e.isIntersecting);
    mobileCta.classList.toggle('hide', anyVisible);
  }, { threshold: 0.15 });
  hideTargets.forEach(t => ctaObserver.observe(t));

  // só mostra depois de passar da dobra inicial (hero)
  const hero = document.getElementById('home');
  if (hero) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => mobileCta.classList.toggle('below-hero', !entry.isIntersecting));
    }, { threshold: 0 });
    heroObserver.observe(hero);
  }
}
