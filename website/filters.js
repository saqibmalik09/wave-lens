/**
 * Wave Lens filter library — drives the interactive showcase on wavelens.online.
 * `live: true` = shipped in SDK today (Phase 1). Others marked coming soon.
 */
const FILTER_CATEGORIES = [
  {
    id: 'effects',
    label: 'Effects',
    icon: '🎨',
    filters: [
      { id: 'original', name: 'Original', live: true, preview: 'fx-original' },
      { id: 'auto', name: 'Auto', live: true, preview: 'fx-auto' },
      { id: 'brightness', name: 'Brightness', live: true, preview: 'fx-bright' },
      { id: 'contrast', name: 'Contrast', live: true, preview: 'fx-contrast' },
      { id: 'saturation', name: 'Saturation', live: true, preview: 'fx-saturate' },
      { id: 'warm', name: 'Warm', live: true, preview: 'fx-warm' },
      { id: 'cool', name: 'Cool', live: true, preview: 'fx-cool' },
      { id: 'bw', name: 'B&W', live: true, preview: 'fx-bw' },
      { id: 'vintage', name: 'Vintage', live: true, preview: 'fx-vintage' },
      { id: 'sepia', name: 'Sepia', live: true, preview: 'fx-sepia' },
      { id: 'glow', name: 'Glow', live: true, preview: 'fx-glow' },
      { id: 'film_warm', name: 'Film Warm', live: true, preview: 'fx-film-warm' },
      { id: 'film_cool', name: 'Film Cool', live: true, preview: 'fx-film-cool' },
    ],
  },
  {
    id: 'face',
    label: 'Face',
    icon: '🐱',
    filters: [
      { id: 'cat_ears', name: 'Cat Ears', live: false, preview: 'fx-face-cat', sticker: '🐱' },
      { id: 'bunny_ears', name: 'Bunny Ears', live: false, preview: 'fx-face-bunny', sticker: '🐰' },
      { id: 'dog_ears', name: 'Dog Ears', live: false, preview: 'fx-face-dog', sticker: '🐶' },
      { id: 'crown', name: 'Crown', live: false, preview: 'fx-face-crown', sticker: '👑' },
      { id: 'sunglasses', name: 'Sunglasses', live: false, preview: 'fx-face-glasses', sticker: '🕶️' },
      { id: 'heart_glasses', name: 'Heart Glasses', live: false, preview: 'fx-face-heart', sticker: '💕' },
      { id: 'devil_horns', name: 'Devil Horns', live: false, preview: 'fx-face-devil', sticker: '😈' },
      { id: 'halo', name: 'Angel Halo', live: false, preview: 'fx-face-halo', sticker: '😇' },
      { id: 'makeup', name: 'Eye Makeup', live: false, preview: 'fx-face-makeup', sticker: '💄' },
      { id: 'freckles', name: 'Freckles', live: false, preview: 'fx-face-freckles', sticker: '✨' },
      { id: 'mustache', name: 'Mustache', live: false, preview: 'fx-face-stache', sticker: '🥸' },
      { id: 'clown_nose', name: 'Clown Nose', live: false, preview: 'fx-face-clown', sticker: '🔴' },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    icon: '🖼️',
    filters: [
      { id: 'bg_blur', name: 'Blur', live: false, preview: 'fx-bg-blur' },
      { id: 'bg_color', name: 'Solid Color', live: false, preview: 'fx-bg-color' },
      { id: 'bg_image', name: 'Replace Image', live: false, preview: 'fx-bg-image' },
      { id: 'bg_bokeh', name: 'Bokeh', live: false, preview: 'fx-bg-bokeh' },
      { id: 'bg_studio', name: 'Studio', live: false, preview: 'fx-bg-studio' },
      { id: 'bg_nature', name: 'Nature', live: false, preview: 'fx-bg-nature' },
    ],
  },
  {
    id: 'animated',
    label: 'Animated',
    icon: '✨',
    filters: [
      { id: 'float_hearts', name: 'Floating Hearts', live: false, preview: 'fx-anim-hearts', sticker: '💗' },
      { id: 'sparkles', name: 'Sparkles', live: false, preview: 'fx-anim-sparkle', sticker: '✨' },
      { id: 'confetti', name: 'Confetti', live: false, preview: 'fx-anim-confetti', sticker: '🎊' },
      { id: 'snow', name: 'Falling Snow', live: false, preview: 'fx-anim-snow', sticker: '❄️' },
      { id: 'bubbles', name: 'Bubbles', live: false, preview: 'fx-anim-bubbles', sticker: '🫧' },
      { id: 'fire', name: 'Fire', live: false, preview: 'fx-anim-fire', sticker: '🔥' },
      { id: 'butterflies', name: 'Butterflies', live: false, preview: 'fx-anim-fly', sticker: '🦋' },
    ],
  },
  {
    id: 'festive',
    label: 'Festive',
    icon: '🎉',
    filters: [
      { id: 'christmas', name: 'Christmas', live: false, preview: 'fx-fest-xmas', sticker: '🎄' },
      { id: 'halloween', name: 'Halloween', live: false, preview: 'fx-fest-halloween', sticker: '🎃' },
      { id: 'valentine', name: "Valentine's", live: false, preview: 'fx-fest-valentine', sticker: '💝' },
      { id: 'birthday', name: 'Birthday', live: false, preview: 'fx-fest-birthday', sticker: '🎂' },
      { id: 'new_year', name: 'New Year', live: false, preview: 'fx-fest-ny', sticker: '🎆' },
      { id: 'party_hat', name: 'Party Hat', live: false, preview: 'fx-fest-party', sticker: '🥳' },
    ],
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const tabsEl = document.getElementById('filterTabs');
  const chipsEl = document.getElementById('filterChips');
  const previewEl = document.getElementById('filterPreview');
  const stickerEl = document.getElementById('filterSticker');
  const nameEl = document.getElementById('activeFilterName');
  const badgeEl = document.getElementById('activeFilterBadge');
  const slidersEl = document.getElementById('effectSliders');

  if (!tabsEl || !chipsEl || !previewEl) return;

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
        <button type="button" class="demo-tab${cat.id === activeCategory ? ' demo-tab--active' : ''}"
                data-category="${cat.id}" aria-pressed="${cat.id === activeCategory}">
          <span class="demo-tab__icon">${cat.icon}</span>
          ${cat.label}
        </button>`
    ).join('');

    tabsEl.querySelectorAll('.demo-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        const first = getCategory(activeCategory).filters[0];
        activeFilterId = first.id;
        renderTabs();
        renderChips();
        applyFilter(first);
      });
    });
  }

  function renderChips() {
    const cat = getCategory(activeCategory);
    chipsEl.innerHTML = cat.filters.map(
      (f) => `
        <button type="button" class="demo-chip${f.id === activeFilterId ? ' demo-chip--active' : ''}"
                data-id="${f.id}" aria-pressed="${f.id === activeFilterId}">
          ${f.name}
          ${f.live ? '<span class="demo-chip__live">Live</span>' : '<span class="demo-chip__soon">Soon</span>'}
        </button>`
    ).join('');

    chipsEl.querySelectorAll('.demo-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilterId = chip.dataset.id;
        renderChips();
        applyFilter(getFilter(activeCategory, activeFilterId));
      });
    });

    slidersEl.hidden = activeCategory !== 'effects';
  }

  function applyFilter(filter) {
    if (!filter) return;

    previewEl.className = 'demo-phone__fx ' + filter.preview;
    nameEl.textContent = filter.name;

    if (filter.live) {
      badgeEl.textContent = 'Available now';
      badgeEl.className = 'demo-phone__badge demo-phone__badge--live';
    } else {
      badgeEl.textContent = 'Coming soon';
      badgeEl.className = 'demo-phone__badge demo-phone__badge--soon';
    }

    if (filter.sticker) {
      stickerEl.textContent = filter.sticker;
      stickerEl.hidden = false;
    } else {
      stickerEl.hidden = true;
    }
  }

  renderTabs();
  renderChips();
  applyFilter(getFilter('effects', 'original'));
});
