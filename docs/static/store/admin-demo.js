(() => {
  'use strict';

  const storageKey = 'tehranshop:admin-demo:v1:' + new URL('.', location.href).pathname;
  const seed = JSON.parse(document.querySelector('#admin-demo-data').textContent);
  const number = new Intl.NumberFormat('fa-IR');
  const categories = new Map();
  const destinations = new Map();
  const $$ = selector => [...document.querySelectorAll(selector)];
  const $ = selector => document.querySelector(selector);
  const productForm = $('#demo-product-form');
  const posterForm = $('#demo-poster-form');
  const feedback = $('#demo-feedback');
  const search = $('#demo-search');
  const productFields = ['name', 'category', 'sizes', 'description', 'price', 'sale_price', 'position', 'active', 'is_new_collection', 'is_popular', 'show_in_slider'];
  const posterFields = ['title', 'destination', 'position', 'active'];

  for (const option of productForm.elements.category.options) categories.set(option.value, option.textContent);
  for (const option of posterForm.elements.destination.options) destinations.set(option.value, option.textContent);

  let state = readState();
  let filter = 'all';
  let editingProduct = null;
  let editingPoster = null;
  let productPhotos = [];
  let posterPhoto = '';
  let editorVersion = 0;

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved?.products) && Array.isArray(saved?.posters)) return saved;
    } catch {
      // The sample catalog remains available if this browser blocks storage.
    }
    return {products: seed.products, posters: seed.posters};
  }

  function el(tag, className, copy) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (copy !== undefined) node.textContent = copy;
    return node;
  }

  function cost(value) {
    return number.format(value) + ' تومان';
  }

  function readPrice(input) {
    const raw = input.trim();
    if (!raw) return null;
    const digits = raw.replace(/[۰-۹]/g, character => character.charCodeAt(0) - 0x06f0)
      .replace(/[٠-٩]/g, character => character.charCodeAt(0) - 0x0660);
    if (!/^(?:[0-9]+|[0-9]{1,3}(?:[,٬ ][0-9]{3})+)$/.test(digits)) return NaN;
    return Number(digits.replace(/[,٬ ]/g, ''));
  }

  function setFeedback(text) {
    feedback.textContent = text;
    feedback.hidden = !text;
  }

  function formError(form, text) {
    const line = form.querySelector('.demo-error');
    line.textContent = text;
    line.hidden = !text;
  }

  function showView(view) {
    editorVersion++;
    setFeedback('');
    for (const panel of $$('[data-panel]')) panel.hidden = panel.dataset.panel !== view;
    const currentView = {'product-editor': 'products', 'poster-editor': 'posters'}[view] || view;
    for (const button of $$('.demo-menu [data-view]')) {
      if (currentView === button.dataset.view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (view === 'products') renderProducts();
    if (view === 'posters') renderPosters();
    if (view === 'preview') renderPreview();
    const heading = $(`[data-panel="${view}"] h2`);
    heading.focus({preventScroll: true});
    heading.scrollIntoView({block: 'nearest'});
  }

  function image(source, className, alt = '') {
    const photo = el('img', className);
    photo.src = source;
    photo.alt = alt;
    photo.loading = 'lazy';
    return photo;
  }

  function editButton(kind, item, description) {
    const button = el('button', 'admin-item demo-item');
    button.type = 'button';
    button.dataset.editor = kind;
    button.dataset.itemId = item.id;
    const name = el('span', 'admin-item-name');
    name.append(el('strong', '', item.name || item.title), el('small', '', description));
    const status = el('span', 'admin-status ' + (item.active ? 'is-live' : 'is-draft'), item.active ? 'فعال' : 'پیش‌نویس');
    button.append(image(item.image, 'admin-thumb'), name, status, el('span', 'demo-edit-label', 'ویرایش ←'));
    return button;
  }

  const liveProducts = () => state.products.filter(product => product.active);
  const saleProducts = () => liveProducts().filter(product => product.sale_price != null);

  function renderProducts() {
    const lists = {
      all: state.products,
      live: liveProducts(),
      drafts: state.products.filter(product => !product.active),
      sales: saleProducts(),
    };
    for (const entry of $$('[data-total]')) entry.textContent = number.format(lists[entry.dataset.total].length);
    for (const button of $$('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));

    const term = search.value.trim().toLocaleLowerCase('fa');
    const matches = lists[filter].filter(product => (
      product.name + ' ' + categories.get(product.category)
    ).toLocaleLowerCase('fa').includes(term));
    const list = $('#demo-product-list');
    list.replaceChildren(...[...matches].sort((a, b) => b.id - a.id).map(product => editButton(
      'product', product, categories.get(product.category) + ' · ' + cost(product.sale_price ?? product.regular_price)
    )));
    if (!matches.length) list.append(el('p', 'demo-empty', 'محصولی در این فهرست نیست.'));
  }

  function renderPosters() {
    const list = $('#demo-poster-list');
    const posters = [...state.posters].sort((a, b) => a.position - b.position);
    list.replaceChildren(...posters.map(poster => editButton(
      'poster', poster, 'ترتیب ' + number.format(poster.position) + ' · ' + destinations.get(poster.destination)
    )));
    if (!posters.length) list.append(el('p', 'demo-empty', 'برای نمایش پوستر، «افزودن پوستر» را بزنید.'));
  }

  function previewRow(title, items) {
    const section = el('section', 'demo-collection');
    section.append(el('h3', '', title));
    if (!items.length) {
      section.append(el('p', 'demo-empty', 'هنوز مورد فعالی در این بخش نیست.'));
      return section;
    }
    const row = el('div', 'demo-preview-row');
    row.tabIndex = 0;
    row.setAttribute('aria-label', title);
    for (const item of items) {
      const card = el('button', 'demo-preview-card');
      card.type = 'button';
      card.dataset.editor = item.name ? 'product' : 'poster';
      card.dataset.itemId = item.id;
      const visual = el('span', 'demo-preview-visual');
      const photos = item.images || [item.image];
      visual.dataset.gallery = String(photos.length > 1);
      for (const source of photos) visual.append(image(source));
      card.append(visual, el('strong', '', item.name || item.title));
      card.append(el('small', item.sale_price != null ? 'admin-sale' : '',
        item.name ? cost(item.sale_price ?? item.regular_price) : destinations.get(item.destination)));
      row.append(card);
    }
    section.append(row);
    return section;
  }

  function renderPreview() {
    const active = liveProducts();
    const latest = [...active].sort((a, b) => b.id - a.id);
    const newCollection = latest.filter(product => product.is_new_collection);
    const featured = [
      ...active.filter(product => product.show_in_slider),
      ...state.posters.filter(poster => poster.active)
    ].sort((a, b) => a.position - b.position);
    $('#demo-preview-rows').replaceChildren(
      previewRow('اسلایدر بالای صفحه', featured),
      previewRow('جدیدترین‌ها', newCollection.length ? newCollection : latest),
      previewRow('پرطرفدارها', active.filter(product => product.is_popular)),
      previewRow('حراج', saleProducts()),
    );
  }

  function fillForm(form, fields, item) {
    form.reset();
    formError(form, '');
    if (!item) return;
    for (const field of fields) {
      const input = form.elements[field];
      if (input.type === 'checkbox') input.checked = Boolean(item[field]);
      else input.value = field === 'price' ? item.regular_price : item[field] ?? '';
    }
  }

  function openEditor(kind, id) {
    if (kind === 'product') {
      editingProduct = state.products.find(product => product.id === id) || null;
      productPhotos = editingProduct ? [...editingProduct.images] : [];
      fillForm(productForm, productFields, editingProduct);
      if (editingProduct) productForm.elements.sizes.value = editingProduct.sizes.join('، ');
      productForm.elements.sizes.dispatchEvent(new Event('input', {bubbles: true}));
      $('#product-editor-title').textContent = editingProduct ? 'ویرایش محصول' : 'افزودن محصول';
      renderPhotos();
    } else {
      editingPoster = state.posters.find(poster => poster.id === id) || null;
      posterPhoto = editingPoster?.image || '';
      fillForm(posterForm, posterFields, editingPoster);
      $('#poster-editor-title').textContent = editingPoster ? 'ویرایش پوستر' : 'افزودن پوستر';
      renderPhotos();
    }
    showView(kind + '-editor');
  }

  function renderPhotos() {
    const list = $('#demo-photo-list');
    list.replaceChildren();
    productPhotos.forEach((source, index) => {
      const photo = el('figure', 'demo-file-card');
      photo.append(image(source), el('figcaption', '', index ? 'عکس گالری' : 'عکس اصلی'));
      const remove = el('button', 'demo-remove', 'حذف عکس');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        productPhotos.splice(index, 1);
        renderPhotos();
        $('#demo-product-photos').focus();
      });
      photo.append(remove);
      list.append(photo);
    });
    $('#demo-poster-preview').replaceChildren(...(posterPhoto ? [image(posterPhoto, 'demo-poster-image')] : []));
  }

  async function preparePhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
      throw new Error('عکس JPG، PNG یا WebP تا ۱۲ مگابایت انتخاب کنید.');
    }
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error('این عکس باز نشد. فایل دیگری انتخاب کنید.');
    }
    try {
      const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', .8);
    } finally {
      bitmap.close();
    }
  }

  function bindUpload(selector, form, limit, onPhotos) {
    const input = $(selector);
    const save = form.querySelector('[type="submit"]');
    input.addEventListener('change', async () => {
      const files = [...input.files];
      input.value = '';
      if (!files.length) return;
      if (files.length > limit()) {
        formError(form, 'در هر محصول تا ۸ عکس می‌توانید ذخیره کنید.');
        return;
      }
      const version = editorVersion;
      input.disabled = save.disabled = true;
      formError(form, '');
      try {
        const photos = [];
        for (const file of files) {
          if (version !== editorVersion) return;
          photos.push(await preparePhoto(file));
        }
        if (version === editorVersion) {
          onPhotos(photos);
          renderPhotos();
        }
      } catch (error) {
        if (version === editorVersion) formError(form, error.message);
      } finally {
        input.disabled = save.disabled = false;
      }
    });
  }

  function saveItem(kind, item, form) {
    const items = state[kind];
    const next = {...state, [kind]: items.filter(row => row.id !== item.id).concat(item)};
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      formError(form, 'مرورگر نتوانست تغییرات را ذخیره کند. فضای ذخیره را بررسی کنید یا عکس کمتری انتخاب کنید.');
      return;
    }
    state = next;
    showView(kind);
    setFeedback(kind === 'products' ? 'محصول ذخیره شد.' : 'پوستر ذخیره شد.');
  }

  productForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = productForm.elements;
    const price = readPrice(fields.price.value);
    const sale = readPrice(fields.sale_price.value);
    const sizes = [...new Set(fields.sizes.value.split(/[,،\n]+/).map(size => size.trim()).filter(Boolean))];
    if (!fields.name.value.trim() || !fields.description.value.trim() || !sizes.length || sizes.some(size => size.length > 12)) {
      formError(productForm, 'نام، توضیح و حداقل یک سایز معتبر وارد کنید.');
      return;
    }
    if (!Number.isSafeInteger(price)) {
      formError(productForm, 'قیمت اصلی را به‌صورت عدد وارد کنید.');
      fields.price.focus();
      return;
    }
    if (sale !== null && (!Number.isSafeInteger(sale) || sale < 1 || sale >= price)) {
      formError(productForm, 'قیمت حراج باید بیشتر از صفر و کمتر از قیمت اصلی باشد.');
      fields.sale_price.focus();
      return;
    }
    if (!productPhotos.length) {
      formError(productForm, 'حداقل یک عکس اضافه کنید یا از عکس نمونه استفاده کنید.');
      $('#demo-product-photos').focus();
      return;
    }
    const item = {
      id: editingProduct?.id ?? state.products.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      name: fields.name.value.trim(),
      category: fields.category.value,
      sizes,
      description: fields.description.value.trim(),
      regular_price: price,
      sale_price: sale,
      active: fields.active.checked,
      is_new_collection: fields.is_new_collection.checked,
      is_popular: fields.is_popular.checked,
      show_in_slider: fields.show_in_slider.checked,
      position: Number(fields.position.value),
      image: productPhotos[0],
      images: [...productPhotos],
    };
    filter = 'all';
    search.value = '';
    saveItem('products', item, productForm);
  });

  posterForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = posterForm.elements;
    if (!fields.title.value.trim() || !posterPhoto) {
      formError(posterForm, 'عنوان پوستر و یک عکس وارد کنید.');
      return;
    }
    saveItem('posters', {
      id: editingPoster?.id ?? state.posters.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      title: fields.title.value.trim(),
      destination: fields.destination.value,
      position: Number(fields.position.value),
      active: fields.active.checked,
      image: posterPhoto,
    }, posterForm);
  });

  bindUpload('#demo-product-photos', productForm, () => 8 - productPhotos.length, photos => productPhotos.push(...photos));
  bindUpload('#demo-poster-photo', posterForm, () => 1, photos => { [posterPhoto] = photos; });
  $('#demo-sample-photo').addEventListener('click', () => {
    if (productPhotos.length >= 8) return;
    const sample = seed.products.find(product => product.category === productForm.elements.category.value) || seed.products[0];
    const source = sample?.image || 'static/store/assets/product-placeholder.svg';
    if (!productPhotos.includes(source)) productPhotos.push(source);
    formError(productForm, '');
    renderPhotos();
  });
  $('#demo-sample-poster').addEventListener('click', () => {
    posterPhoto = seed.posters[0]?.image || seed.sample_poster;
    formError(posterForm, '');
    renderPhotos();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.view) showView(button.dataset.view);
    if (button?.dataset.editor) openEditor(button.dataset.editor, Number(button.dataset.itemId));
    if (button?.dataset.filter) {
      filter = button.dataset.filter;
      renderProducts();
    }
  });

  search.addEventListener('input', renderProducts);
  const confirmation = $('#demo-reset-confirm');
  $('#demo-reset').addEventListener('click', () => {
    confirmation.returnValue = '';
    confirmation.showModal();
  });
  confirmation.addEventListener('close', () => {
    if (confirmation.returnValue !== 'reset') return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      setFeedback('در این مرورگر امکان بازنشانی وجود ندارد.');
      return;
    }
    state = readState();
    filter = 'all';
    search.value = '';
    showView('products');
    setFeedback('نمونه‌های اولیه برگردانده شدند.');
  });

  renderProducts();
})();
