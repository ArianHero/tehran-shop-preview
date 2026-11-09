(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const runtime = JSON.parse($('#runtime-data').textContent);
  if (runtime.page === 'home' && window.location.hash === '#support') {
    window.location.replace(runtime.contact_url);
    return;
  }
  const products = runtime.products;
  const byId = new Map(products.map(product => [product.id, product]));
  const grid = $('#product-grid');
  const cards = new Map($$('#product-grid .product-card').map(card => [Number(card.dataset.productId), card]));
  const searchInput = $('#search-input');
  const fa = new Intl.NumberFormat('fa-IR');
  const cartKey = 'tehranshop:preview-cart:v4';
  const emptyCart = {items: [], count: 0, total: 0};
  const escaped = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => escaped[character]);
  const icon = name => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const money = value => fa.format(value) + ' <span class="currency">تومان</span>';

  let previewLines = readArray(cartKey);
  let cart = emptyCart;
  let cartReady;
  let mutating = false;
  const params = new URLSearchParams(window.location.search);
  const collectionName = params.get('collection');
  const collectionIds = runtime.collection_ids?.[collectionName];
  const activeCollection = Array.isArray(collectionIds) ? collectionName : '';
  const collectionProducts = activeCollection ? new Set(collectionIds) : null;
  const defaultSort = activeCollection === 'new-collection' ? 'newest' : 'featured';
  let query = (params.get('q') || '').trim().slice(0, 120);
  let selectedProduct, selectedSize, selectedColor, toastTimer;

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveArray(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The current page remains usable when browser storage is unavailable.
    }
  }

  function normalizeDigits(value) {
    return value.replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
      .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
  }

  function normalize(value) {
    return normalizeDigits(String(value))
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\s\u200c\u200f\-–]/g, '')
      .toLowerCase();
  }

  function parsePrice(value) {
    const digits = normalizeDigits(value).replace(/[,٬\s]/g, '');
    if (!digits) return null;
    return /^\d{1,12}$/.test(digits) ? Number(digits) : NaN;
  }

  function updateThemeButtons() {
    const light = document.documentElement.dataset.theme === 'light';
    const name = light ? 'حالت تیره' : 'حالت روشن';
    for (const button of $$('[data-theme-toggle]')) {
      button.setAttribute('aria-label', 'فعال کردن ' + name);
      button.title = name;
      button.querySelector('use').setAttribute('href', light ? '#i-moon' : '#i-sun');
    }
    $('meta[name="theme-color"]').content = light ? '#ffffff' : '#0d1220';
  }

  function renderProducts() {
    if (!grid) return;
    const terms = query.split(/\s+/).map(normalize).filter(Boolean);
    const selectedCategory = $('#filter-category')?.value || '';
    const category = runtime.category || selectedCategory;
    const size = $('#filter-size').value;
    const onlySale = $('#filter-sale').checked;
    const minimumInput = $('#filter-min');
    const maximumInput = $('#filter-max');
    const minimum = parsePrice(minimumInput.value);
    const maximum = parsePrice(maximumInput.value);
    const reversed = minimum !== null && maximum !== null && minimum > maximum;
    const invalidMinimum = Number.isNaN(minimum) || reversed;
    const invalidMaximum = Number.isNaN(maximum) || reversed;
    minimumInput.setAttribute('aria-invalid', String(invalidMinimum));
    maximumInput.setAttribute('aria-invalid', String(invalidMaximum));
    $('#filter-error').hidden = !invalidMinimum && !invalidMaximum;
    const filterCount = [selectedCategory, size, minimumInput.value.trim(), maximumInput.value.trim(), onlySale]
      .filter(Boolean).length;
    $('#filter-count').hidden = filterCount === 0;
    $('#filter-count').textContent = fa.format(filterCount);

    let count = 0;

    for (const product of products) {
      const searchable = normalize(
        product.name + ' ' + product.english + ' ' + product.category_name
      );
      const visible = (!category || product.category === category)
        && (!collectionProducts || collectionProducts.has(product.id))
        && terms.every(term => searchable.includes(term))
        && (!size || product.sizes.includes(size))
        && (!onlySale || product.sale_price !== null)
        && (invalidMinimum || minimum === null || product.price >= minimum)
        && (invalidMaximum || maximum === null || product.price <= maximum);
      const card = cards.get(product.id);
      card.hidden = !visible;
      count += Number(visible);
    }

    $('#result-count').textContent = fa.format(count) + ' مدل';
    $('#empty-results').hidden = count > 0;
    $('#filter-description').hidden = !query;
    $('#filter-description').textContent = query ? 'نتایج «' + query + '»' : '';
  }

  function sortProducts(order) {
    const ordered = [...products];
    if (order === 'newest') ordered.sort((a, b) => b.id - a.id);
    if (order === 'price-asc') ordered.sort((a, b) => a.price - b.price);
    if (order === 'price-desc') ordered.sort((a, b) => b.price - a.price);
    if (order === 'name') ordered.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    for (const product of ordered) grid.append(cards.get(product.id));
  }

  function resetFilters() {
    query = '';
    searchInput.value = '';
    for (const selector of ['#filter-category', '#filter-size', '#filter-min', '#filter-max']) {
      const input = $(selector);
      if (input) input.value = '';
    }
    $('#filter-sale').checked = false;
    $('#sort-select').value = defaultSort;
    sortProducts(defaultSort);
    const url = new URL(window.location.href);
    if (url.searchParams.has('q')) {
      url.searchParams.delete('q');
      window.history.replaceState(window.history.state, '', url);
    }
    renderProducts();
  }

  function showDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog.open) dialog.showModal();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $('#toast span').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
  }

  function showCartError(message) {
    const error = $('#product-dialog').open ? $('#detail-error') : $('#cart-error');
    error.textContent = message;
    error.hidden = false;
  }

  function clearCartErrors() {
    $('#detail-error').hidden = true;
    $('#cart-error').hidden = true;
  }

  function updateAddButton() {
    const button = $('#add-to-cart');
    const ready = selectedSize && selectedColor && !mutating;
    button.disabled = !ready;
    let label = 'انتخاب سایز';
    if (mutating) label = 'در حال به‌روزرسانی…';
    else if (ready) label = 'افزودن به سبد خرید';
    button.innerHTML = label + ' ' + icon('bag');
  }

  function openProduct(id) {
    const product = byId.get(id);
    if (!product) return;

    selectedProduct = product;
    selectedSize = null;
    selectedColor = product.colors[0]?.name;
    clearCartErrors();

    $('#detail-image').src = product.image;
    $('#detail-image').alt = product.name;
    $('.detail-image .sample-badge').hidden = !product.demo;
    $('#detail-tags').innerHTML = product.badges.map(badge =>
      '<span class="product-tag product-tag--' + esc(badge.tag) + '">' + esc(badge.label) + '</span>'
    ).join('');
    const gallery = $('#detail-gallery');
    gallery.hidden = product.images.length < 2;
    gallery.innerHTML = gallery.hidden ? '' : product.images.map((url, index) =>
      '<button type="button" data-photo-index="' + index + '" aria-label="عکس ' + fa.format(index + 1) +
      '" aria-pressed="' + (index === 0) + '"><img src="' + esc(url) + '" alt="" width="56" height="56"></button>'
    ).join('');
    $('#product-title').textContent = product.name;
    const price = money(product.price);
    $('#detail-price').innerHTML = product.sale_price === null ? price :
      '<span class="price-stack"><del class="old-price">' + money(product.regular_price) +
      '</del><span class="sale-price">' + price + '</span></span>';
    $('#detail-description').textContent = product.description;
    $('#selected-color').textContent = selectedColor || '';
    $('#detail-colors').innerHTML = product.colors.map((color, index) => {
      const hex = /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#888888';
      return '<button type="button" class="color-option" data-color-index="' + index +
        '" aria-label="' + esc(color.name) + '" aria-pressed="' + (index === 0) +
        '"><span style="background:' + hex + '"></span></button>';
    }).join('');
    $('#detail-sizes').innerHTML = product.sizes.map((size, index) =>
      '<button type="button" class="size-button" data-size-index="' + index +
      '" aria-pressed="false">' + esc(size) + '</button>'
    ).join('');

    updateAddButton();
    showDialog('product-dialog');
    $('#product-dialog').scrollTop = 0;
  }

  async function cartRequest(method, data) {
    const csrf = document.cookie.split('; ').find(value => value.startsWith('csrftoken='))?.slice(10) || '';
    let response;
    try {
      response = await fetch(runtime.cart_url, {
        method,
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-CSRFToken': decodeURIComponent(csrf)},
        ...(data ? {body: JSON.stringify(data)} : {}),
      });
    } catch {
      throw new Error('ارتباط با فروشگاه برقرار نشد. دوباره تلاش کنید.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'به‌روزرسانی سبد انجام نشد.');
    return payload;
  }

  function lineKey(line) {
    return [line.product_id, line.size, line.color].join(':');
  }

  function previewCart() {
    previewLines = previewLines.filter(line => {
      const product = byId.get(line?.product_id);
      return product && product.sizes.includes(line.size)
        && product.colors.some(color => color.name === line.color)
        && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 10;
    });

    const items = previewLines.map(line => {
      const product = byId.get(line.product_id);
      return {
        key: lineKey(line), product, size: line.size, color: line.color,
        quantity: line.quantity, subtotal: product.price * line.quantity,
      };
    });

    return {
      items,
      count: items.reduce((total, line) => total + line.quantity, 0),
      total: items.reduce((total, line) => total + line.subtotal, 0),
    };
  }

  function updatePreviewCart(method, data) {
    if (method === 'POST') {
      const line = previewLines.find(item => lineKey(item) === lineKey(data));
      if (line && line.quantity + data.quantity > 10) {
        throw new Error('حداکثر تعداد هر سایز و رنگ در سبد ۱۰ عدد است.');
      }
      if (line) line.quantity += data.quantity;
      else previewLines.push(data);
    } else {
      const index = previewLines.findIndex(line => lineKey(line) === data.key);
      if (index >= 0) {
        if (method === 'PATCH') previewLines[index].quantity = data.quantity;
        if (method === 'DELETE') previewLines.splice(index, 1);
      }
    }
    const result = previewCart();
    saveArray(cartKey, previewLines);
    return result;
  }

  function renderCart() {
    const count = fa.format(cart.count);
    $('#cart-count').textContent = count;
    $('#drawer-count').textContent = count;
    $('#cart-toggle').setAttribute('aria-label', 'باز کردن سبد خرید، ' + count + ' کالا');
    $('#cart-summary').hidden = cart.items.length === 0;
    $('#cart-total').innerHTML = money(cart.total);

    if (!cart.items.length) {
      $('#cart-lines').innerHTML = '<div class="cart-empty">' + icon('bag') +
        '<h3>سبد خرید خالی است.</h3>' +
        '<button type="button" class="button button-dark" data-close-dialog="cart-dialog">بازگشت به کاتالوگ ' +
        icon('arrow') + '</button></div>';
      return;
    }

    $('#cart-lines').innerHTML = cart.items.map(line => {
      const product = line.product;
      const key = esc(line.key);
      return [
        '<article class="cart-line">',
        '  <img src="' + esc(product.image) + '" alt="' + esc(product.name) + '" width="80" height="88">',
        '  <div>',
        '    <div class="cart-line-title"><h3>' + esc(product.name) + '</h3>',
        '      <button type="button" class="remove-button" data-remove="' + key + '" aria-label="حذف ' + esc(product.name) + '">' + icon('trash') + '</button>',
        '    </div>',
        '    <div class="cart-line-details">' + esc(line.color) + ' · <bdi>' + esc(line.size) + '</bdi></div>',
        '    <div class="cart-line-bottom">',
        '      <div class="quantity-control">',
        '        <button type="button" data-quantity="' + key + '" data-value="' + (line.quantity - 1) + '" aria-label="کم کردن تعداد"' + (line.quantity === 1 ? ' disabled' : '') + '>' + icon('minus') + '</button>',
        '        <span>' + fa.format(line.quantity) + '</span>',
        '        <button type="button" data-quantity="' + key + '" data-value="' + (line.quantity + 1) + '" aria-label="زیاد کردن تعداد"' + (line.quantity >= 10 ? ' disabled' : '') + '>' + icon('plus') + '</button>',
        '      </div>',
        '      <span class="cart-line-price">' + money(line.subtotal) + '</span>',
        '    </div>',
        '  </div>',
        '</article>',
      ].join('\n');
    }).join('\n');
  }

  async function syncCart() {
    if (runtime.backend) {
      try {
        cart = await cartRequest('GET');
      } catch (error) {
        showCartError(error.message);
      }
    } else {
      previewLines = readArray(cartKey);
      cart = previewCart();
    }
    renderCart();
  }

  async function mutateCart(method, data) {
    if (mutating) return false;
    mutating = true;
    clearCartErrors();
    updateAddButton();
    $$('#cart-lines button').forEach(button => { button.disabled = true; });

    try {
      await cartReady;
      cart = runtime.backend ? await cartRequest(method, data) : updatePreviewCart(method, data);
      return true;
    } catch (error) {
      showCartError(error.message);
      return false;
    } finally {
      mutating = false;
      updateAddButton();
      renderCart();
    }
  }

  const filterToggle = $('#filter-toggle');
  const filterPanel = $('#catalog-filters');
  filterToggle?.addEventListener('click', () => {
    filterPanel.hidden = !filterPanel.hidden;
    filterToggle.setAttribute('aria-expanded', String(!filterPanel.hidden));
  });
  filterPanel?.addEventListener('input', renderProducts);
  $('#sort-select')?.addEventListener('change', event => sortProducts(event.target.value));
  $('#reset-filters')?.addEventListener('click', resetFilters);
  $('#empty-reset')?.addEventListener('click', resetFilters);
  const categoryMenu = $('#category-menu');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && categoryMenu.open) {
      categoryMenu.open = false;
      categoryMenu.querySelector('summary').focus();
    }
  });

  for (const button of $$('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      const root = document.documentElement;
      const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = theme;
      try {
        localStorage.setItem('tehranshop:theme', theme);
      } catch {
        // The current page can still switch themes without browser storage.
      }
      updateThemeButtons();
    });
  }

  $('#detail-gallery').addEventListener('click', event => {
    const button = event.target.closest('[data-photo-index]');
    if (!button || !selectedProduct) return;
    $('#detail-image').src = selectedProduct.images[Number(button.dataset.photoIndex)];
    $$('#detail-gallery button').forEach(photo => photo.setAttribute('aria-pressed', String(photo === button)));
  });

  $('#detail-sizes').addEventListener('click', event => {
    const button = event.target.closest('[data-size-index]');
    if (!button) return;
    selectedSize = selectedProduct.sizes[Number(button.dataset.sizeIndex)];
    $$('#detail-sizes button').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    updateAddButton();
  });

  $('#detail-colors').addEventListener('click', event => {
    const button = event.target.closest('[data-color-index]');
    if (!button) return;
    selectedColor = selectedProduct.colors[Number(button.dataset.colorIndex)].name;
    $('#selected-color').textContent = selectedColor;
    $$('#detail-colors button').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    updateAddButton();
  });

  $('#add-to-cart').addEventListener('click', async () => {
    if (!selectedProduct || !selectedSize || !selectedColor) return;
    const success = await mutateCart('POST', {
      product_id: selectedProduct.id, size: selectedSize, color: selectedColor, quantity: 1,
    });
    if (success) {
      $('#product-dialog').close();
      showToast('به سبد خرید اضافه شد.');
    }
  });

  $('#cart-toggle').addEventListener('click', () => showDialog('cart-dialog'));
  $('#cart-lines').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]');
    if (remove) mutateCart('DELETE', {key: remove.dataset.remove});
    const quantity = event.target.closest('[data-quantity]');
    if (quantity) mutateCart('PATCH', {key: quantity.dataset.quantity, quantity: Number(quantity.dataset.value)});
  });

  $('#checkout-button').addEventListener('click', () => showDialog('notice-dialog'));
  $('#footer-size-guide').addEventListener('click', () => showDialog('guide-dialog'));
  $('#detail-guide').addEventListener('click', () => showDialog('guide-dialog'));

  document.addEventListener('click', event => {
    if (categoryMenu.open && (!categoryMenu.contains(event.target) || event.target.closest('a'))) {
      categoryMenu.open = false;
    }
    if (event.target.closest('[data-open-guide]')) showDialog('guide-dialog');
    const product = event.target.closest('[data-open-product]');
    if (product) openProduct(Number(product.dataset.openProduct));
    const close = event.target.closest('[data-close-dialog]');
    if (close) document.getElementById(close.dataset.closeDialog).close();
  });

  for (const dialog of $$('dialog')) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }

  const syncHeader = () => $('#header').classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', syncHeader, {passive: true});
  syncHeader();

  searchInput.value = query;
  for (const link of $$('[data-collection]')) {
    if (link.dataset.collection !== activeCollection) {
      link.removeAttribute('aria-current');
      continue;
    }
    link.setAttribute('aria-current', 'page');
    if (activeCollection) {
      const title = link.textContent.trim();
      $('#collection-title').textContent = title;
      document.title = title + ' | Tehran Shop';
    }
  }
  if (grid && defaultSort === 'newest') {
    $('#sort-select').value = defaultSort;
    sortProducts(defaultSort);
  }
  renderProducts();
  updateThemeButtons();
  cartReady = syncCart();
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    try {
      const theme = localStorage.getItem('tehranshop:theme');
      if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    } catch {}
    updateThemeButtons();
    renderProducts();
    cartReady = syncCart();
  });
})();
