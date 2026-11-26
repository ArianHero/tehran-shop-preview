document.addEventListener('DOMContentLoaded', () => {
  const sizes = document.querySelector('#id_sizes');
  if (sizes) {
    const picker = document.createElement('div');
    picker.className = 'admin-size-options';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'سایزهای آماده');
    const selectedSizes = () => sizes.value.split(/[,،\n]+/).map(value => value.trim()).filter(Boolean);

    for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'تک‌سایز']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = size;
      const syncButton = () => button.setAttribute('aria-pressed', String(selectedSizes().includes(size)));
      button.addEventListener('click', () => {
        const selected = selectedSizes();
        sizes.value = (selected.includes(size) ? selected.filter(value => value !== size) : [...selected, size]).join('، ');
        sizes.dispatchEvent(new Event('input', {bubbles: true}));
      });
      sizes.addEventListener('input', syncButton);
      syncButton();
      picker.append(button);
    }
    sizes.after(picker);
  }

  function attachPreview(input, makeCaption, limit, otherInput) {
    input.classList.add('admin-upload-input');
    const preview = document.createElement('div');
    preview.className = 'admin-upload-preview';
    preview.setAttribute('aria-live', 'polite');
    input.after(preview);
    let previewUrls = [];

    function showUploads() {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      previewUrls = [];
      preview.replaceChildren();
      const files = Array.from(input.files);
      if (files.length > limit) {
        preview.textContent = 'حداکثر ۸ عکس در هر بار انتخاب کنید.';
        return;
      }
      files.forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        previewUrls.push(url);
        const photo = document.createElement('figure');
        const image = new Image();
        image.src = url;
        image.alt = file.name;
        const caption = document.createElement('figcaption');
        caption.textContent = makeCaption(index);
        photo.append(image, caption);
        preview.append(photo);
      });
    }

    input.addEventListener('change', showUploads);
    otherInput?.addEventListener('change', showUploads);
  }

  const uploads = document.querySelector('input#id_uploads');
  const replaceCover = document.querySelector('#id_replace_cover');
  if (uploads) {
    const hasUploadedCover = Boolean(document.querySelector('.admin-cover[data-uploaded-cover]'));
    attachPreview(uploads, index => index === 0 && (!hasUploadedCover || replaceCover?.checked) ? 'عکس اصلی' : 'عکس گالری', 8, replaceCover);
  }
  const poster = document.querySelector('#homepageposter_form input#id_image');
  if (poster) attachPreview(poster, () => 'پیش‌نمایش پوستر', 1);

  const regular = document.querySelector('#id_price');
  const sale = document.querySelector('#id_sale_price');
  if (!regular || !sale) return;
  const discount = document.createElement('output');
  discount.className = 'admin-discount';
  discount.setAttribute('for', 'id_price id_sale_price');
  sale.after(discount);
  const percent = new Intl.NumberFormat('fa-IR');
  function parse(input) {
    const value = input.value.trim().replace(/[۰-۹]/g, digit => digit.charCodeAt(0) - 0x06f0)
      .replace(/[٠-٩]/g, digit => digit.charCodeAt(0) - 0x0660);
    if (!/^(?:[0-9]+|[0-9]{1,3}(?:[,٬ ][0-9]{3})+)$/.test(value)) return NaN;
    return Number(value.replace(/[,٬ ]/g, ''));
  }
  function showDiscount() {
    const price = parse(regular);
    const salePrice = parse(sale);
    discount.textContent = salePrice > 0 && salePrice < price ? percent.format(Math.floor((price - salePrice) * 100 / price)) + '٪ تخفیف' : '';
  }
  regular.addEventListener('input', showDiscount);
  sale.addEventListener('input', showDiscount);
  showDiscount();
});
