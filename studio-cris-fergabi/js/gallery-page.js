/* Studio Cris Fergabi — js/gallery-page.js (página galeria.html) */

const FOLLOW_TILE = `
  <a class="ig-tile ig-tile--follow" href="https://www.instagram.com/studiocrisfergabi" target="_blank" rel="noopener">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>
    <span>@studiocrisfergabi</span>
  </a>`;

async function renderGallery() {
  const grid = document.getElementById('igGrid');
  let photos = [];
  try {
    photos = await STORE.getGalleryPhotos();
  } catch (err) {
    console.error('Não foi possível carregar a galeria:', err);
  }
  const photoTiles = photos.map(p => `<div class="ig-tile"><img src="${p.url}" alt="Trabalho do Studio Cris Fergabi" loading="lazy"></div>`).join('');
  const placeholders = photos.length ? '' : Array(5).fill('<div class="ig-tile"><span>Foto em breve</span></div>').join('');
  grid.innerHTML = FOLLOW_TILE + photoTiles + placeholders;
}

(async function init() {
  await STORE.ready;
  await renderGallery();
})();
