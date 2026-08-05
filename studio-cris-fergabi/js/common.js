/* Studio Cris Fergabi — js/common.js
   Compartilhado por todas as páginas: menu, WhatsApp, toast, barra de
   progresso, destaque da página atual no menu, animações de entrada e
   o botão fixo de "Agendar horário" no mobile. */

// ---------- WhatsApp ----------
const WHATSAPP_NUMBER = '5511965114520';
const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de mais informações sobre o Studio Cris Fergabi.')}`;
const whatsFabEl = document.getElementById('whatsFab');
const whatsLinkEl = document.getElementById('whatsLink');
if (whatsFabEl) whatsFabEl.href = waHref;
if (whatsLinkEl) whatsLinkEl.href = waHref;

// ---------- toast ----------
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- ano no rodapé ----------
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- nav: scroll / abrir / fechar ----------
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
  if (window.scrollY > 40) nav.classList.add('scrolled');
}
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navClose = document.getElementById('navClose');
if (navToggle && navLinks) navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
if (navClose && navLinks) navClose.addEventListener('click', () => navLinks.classList.remove('open'));
if (navLinks) navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ---------- destaque da página atual no menu ----------
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('[data-page]').forEach(a => {
  if (a.dataset.page === currentPage) a.classList.add('is-active');
});

// ---------- barra de progresso de rolagem ----------
const progressBar = document.getElementById('scrollProgress');
function updateProgress() {
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  const pct = height > 0 ? (scrolled / height) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
}
if (progressBar) {
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
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

// ---------- CTA fixo no mobile ----------
const mobileCta = document.getElementById('mobileCta');
if (mobileCta) {
  if (currentPage === 'agendar.html') {
    mobileCta.remove();
  } else {
    const footerEl = document.querySelector('footer');
    if (footerEl && 'IntersectionObserver' in window) {
      const ctaObserver = new IntersectionObserver((entries) => {
        mobileCta.classList.toggle('hide', entries.some(e => e.isIntersecting));
      }, { threshold: 0.15 });
      ctaObserver.observe(footerEl);
    }
    setTimeout(() => mobileCta.classList.add('below-hero'), 400);
  }
}
