/**
 * Wave Lens filter library — grid picker + phone preview.
 */
const FILTER_CATEGORIES = [
  {
    id: 'effects',
    label: 'Effects',
    icon: '🎨',
    filters: [
      { id: 'original', name: 'Original', live: true, preview: 'fx-original', emoji: '○' },
      { id: 'auto', name: 'Auto', live: true, preview: 'fx-auto', emoji: '⚡' },
      { id: 'brightness', name: 'Brightness', live: true, preview: 'fx-bright', emoji: '☀️' },
      { id: 'contrast', name: 'Contrast', live: true, preview: 'fx-contrast', emoji: '◐' },
      { id: 'saturation', name: 'Saturation', live: true, preview: 'fx-saturate', emoji: '🌈' },
      { id: 'warm', name: 'Warm', live: true, preview: 'fx-warm', emoji: '🔥' },
      { id: 'cool', name: 'Cool', live: true, preview: 'fx-cool', emoji: '❄️' },
      { id: 'bw', name: 'B&W', live: true, preview: 'fx-bw', emoji: '⬛' },
      { id: 'vintage', name: 'Vintage', live: true, preview: 'fx-vintage', emoji: '📷' },
      { id: 'sepia', name: 'Sepia', live: true, preview: 'fx-sepia', emoji: '🟤' },
      { id: 'glow', name: 'Glow', live: true, preview: 'fx-glow', emoji: '✨' },
      { id: 'film_warm', name: 'Film Warm', live: true, preview: 'fx-film-warm', emoji: '🎞️' },
      { id: 'film_cool', name: 'Film Cool', live: true, preview: 'fx-film-cool', emoji: '🎬' },
    ],
  },
  {
    id: 'face',
    label: 'Face',
    icon: '🐱',
    filters: [
      { id: 'cat_ears', name: 'Cat Ears', live: false, preview: 'fx-face-cat', sticker: '🐱', emoji: '🐱' },
      { id: 'bunny_ears', name: 'Bunny Ears', live: false, preview: 'fx-face-bunny', sticker: '🐰', emoji: '🐰' },
      { id: 'dog_ears', name: 'Dog Ears', live: false, preview: 'fx-face-dog', sticker: '🐶', emoji: '🐶' },
      { id: 'crown', name: 'Crown', live: false, preview: 'fx-face-crown', sticker: '👑', emoji: '👑' },
      { id: 'sunglasses', name: 'Sunglasses', live: false, preview: 'fx-face-glasses', sticker: '🕶️', emoji: '🕶️' },
      { id: 'heart_glasses', name: 'Heart Glasses', live: false, preview: 'fx-face-heart', sticker: '💕', emoji: '💕' },
      { id: 'devil_horns', name: 'Devil Horns', live: false, preview: 'fx-face-devil', sticker: '😈', emoji: '😈' },
      { id: 'halo', name: 'Angel Halo', live: false, preview: 'fx-face-halo', sticker: '😇', emoji: '😇' },
      { id: 'makeup', name: 'Eye Makeup', live: false, preview: 'fx-face-makeup', sticker: '💄', emoji: '💄' },
      { id: 'freckles', name: 'Freckles', live: false, preview: 'fx-face-freckles', sticker: '✨', emoji: '✨' },
      { id: 'mustache', name: 'Mustache', live: false, preview: 'fx-face-stache', sticker: '🥸', emoji: '🥸' },
      { id: 'clown_nose', name: 'Clown Nose', live: false, preview: 'fx-face-clown', sticker: '🔴', emoji: '🔴' },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    icon: '🖼️',
    filters: [
      { id: 'bg_blur', name: 'Blur', live: false, preview: 'fx-bg-blur', emoji: '🌫️' },
      { id: 'bg_color', name: 'Solid Color', live: false, preview: 'fx-bg-color', emoji: '🎨' },
      { id: 'bg_image', name: 'Replace', live: false, preview: 'fx-bg-image', emoji: '🖼️' },
      { id: 'bg_bokeh', name: 'Bokeh', live: false, preview: 'fx-bg-bokeh', emoji: '💫' },
      { id: 'bg_studio', name: 'Studio', live: false, preview: 'fx-bg-studio', emoji: '📸' },
      { id: 'bg_nature', name: 'Nature', live: false, preview: 'fx-bg-nature', emoji: '🌿' },
    ],
  },
  {
    id: 'animated',
    label: 'Animated',
    icon: '✨',
    filters: [
      { id: 'float_hearts', name: 'Hearts', live: false, preview: 'fx-anim-hearts', sticker: '💗', emoji: '💗' },
      { id: 'sparkles', name: 'Sparkles', live: false, preview: 'fx-anim-sparkle', sticker: '✨', emoji: '✨' },
      { id: 'confetti', name: 'Confetti', live: false, preview: 'fx-anim-confetti', sticker: '🎊', emoji: '🎊' },
      { id: 'snow', name: 'Snow', live: false, preview: 'fx-anim-snow', sticker: '❄️', emoji: '❄️' },
      { id: 'bubbles', name: 'Bubbles', live: false, preview: 'fx-anim-bubbles', sticker: '🫧', emoji: '🫧' },
      { id: 'fire', name: 'Fire', live: false, preview: 'fx-anim-fire', sticker: '🔥', emoji: '🔥' },
      { id: 'butterflies', name: 'Butterflies', live: false, preview: 'fx-anim-fly', sticker: '🦋', emoji: '🦋' },
    ],
  },
  {
    id: 'festive',
    label: 'Festive',
    icon: '🎉',
    filters: [
      { id: 'christmas', name: 'Christmas', live: false, preview: 'fx-fest-xmas', sticker: '🎄', emoji: '🎄' },
      { id: 'halloween', name: 'Halloween', live: false, preview: 'fx-fest-halloween', sticker: '🎃', emoji: '🎃' },
      { id: 'valentine', name: 'Valentine', live: false, preview: 'fx-fest-valentine', sticker: '💝', emoji: '💝' },
      { id: 'birthday', name: 'Birthday', live: false, preview: 'fx-fest-birthday', sticker: '🎂', emoji: '🎂' },
      { id: 'new_year', name: 'New Year', live: false, preview: 'fx-fest-ny', sticker: '🎆', emoji: '🎆' },
      { id: 'party_hat', name: 'Party', live: false, preview: 'fx-fest-party', sticker: '🥳', emoji: '🥳' },
    ],
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const tabsEl = document.getElementById('filterTabs');
  const gridEl = document.getElementById('filterGrid');
  const previewEl = document.getElementById('filterPreview');
  const stickerEl = document.getElementById('filterSticker');
  const nameEl = document.getElementById('activeFilterName');
  const badgeEl = document.getElementById('activeFilterBadge');
  const slidersEl = document.getElementById('effectSliders');

  if (!tabsEl || !gridEl || !previewEl) return;

  let activeCategory = 'effects';
  let activeFilterId = 'original';

  function getCategory(id) {
    return FILTER_CATEGORIES.find((c) => c.id === id) ?? FILTER_CATEGORIES[0];
  }

  function getFilter(catId, filterId) {
    return getCategory(catId).filters.find((f) => f.id === filterId);
  }

  function renderTabs() {
    tabsEl.innerHTML = FILTER_CATEGORIES.map(
      (cat) => `
        <button type="button" class="cat-pill${cat.id === activeCategory ? ' cat-pill--active' : ''}"
                data-category="${cat.id}">
          <span>${cat.icon}</span> ${cat.label}
        </button>`
    ).join('');

    tabsEl.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        const first = getCategory(activeCategory).filters[0];
        activeFilterId = first.id;
        renderTabs();
        renderGrid();
        applyFilter(first);
      });
    });
  }

  function renderGrid() {
    const cat = getCategory(activeCategory);
    gridEl.innerHTML = cat.filters.map(
      (f) => `
        <button type="button" class="filter-card${f.id === activeFilterId ? ' filter-card--active' : ''}"
                data-id="${f.id}">
          <span class="filter-card__emoji">${f.emoji ?? '✦'}</span>
          <span class="filter-card__name">${f.name}</span>
          <span class="filter-card__badge filter-card__badge--${f.live ? 'live' : 'soon'}">${f.live ? 'Live' : 'Soon'}</span>
        </button>`
    ).join('');

    gridEl.querySelectorAll('.filter-card').forEach((card) => {
      card.addEventListener('click', () => {
        activeFilterId = card.dataset.id;
        renderGrid();
        applyFilter(getFilter(activeCategory, activeFilterId));
      });
    });

    if (slidersEl) slidersEl.hidden = activeCategory !== 'effects';
  }

  function applyFilter(filter) {
    if (!filter) return;
    previewEl.className = 'demo-phone__fx ' + filter.preview;
    nameEl.textContent = filter.name;
    badgeEl.textContent = filter.live ? 'Available now' : 'Coming soon';
    badgeEl.className = 'demo-phone__badge demo-phone__badge--' + (filter.live ? 'live' : 'soon');
    if (filter.sticker) {
      stickerEl.textContent = filter.sticker;
      stickerEl.hidden = false;
    } else {
      stickerEl.hidden = true;
    }
  }

  renderTabs();
  renderGrid();
  applyFilter(getFilter('effects', 'original'));
});
