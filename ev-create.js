(() => {
  const form = document.getElementById('vision-form');
  if (!form) return;
  document.querySelectorAll('.cv-product-select[data-package]').forEach(link => {
    link.addEventListener('click', () => {
      const option = Array.from(form.querySelectorAll('input[name="package"]')).find(input => input.value === link.dataset.package);
      if (option) { option.checked = true; option.dispatchEvent(new Event('change', {bubbles:true})); }
    });
  });
  const zone = form.querySelector('.upload-zone');
  const input = form.querySelector('input[type="file"]');
  const preview = form.querySelector('.upload-preview');
  function showPhoto(file) {
    if (preview && file) { preview.style.display = 'block'; preview.textContent = `Selected locally: ${file.name} · your photo stays on this device`; }
  }
  zone?.addEventListener('click', event => { if (event.target !== input && !event.target.closest('a')) input?.click(); });
  zone?.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input?.click(); } });
  ['dragenter','dragover'].forEach(type => zone?.addEventListener(type, event => { event.preventDefault(); zone.classList.add('dragover'); }));
  zone?.addEventListener('dragleave', event => { event.preventDefault(); zone.classList.remove('dragover'); });
  zone?.addEventListener('drop', event => {
    event.preventDefault(); zone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file && input) { const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files; showPhoto(file); }
  });
  input?.addEventListener('change', () => showPhoto(input.files?.[0]));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const request = {};
    ['package','name','email','favorite_colors','favorite_locations','favorite_imagery','favorite_landscapes','dream'].forEach(key => { request[key] = String(data.get(key) || ''); });
    request.at = new Date().toISOString();
    try { const saved = JSON.parse(localStorage.getItem('ev-vision-requests') || '[]'); localStorage.setItem('ev-vision-requests', JSON.stringify([...saved,request].slice(-20))); } catch {}
    const fields = form.querySelector('.form-fields'); const success = form.querySelector('.form-success');
    if (fields) fields.hidden = true; if (success) success.hidden = false;
    const subject = encodeURIComponent(`Vision request from ${request.name}`);
    const body = encodeURIComponent([`Package: ${request.package}`,`Name: ${request.name}`,`Email: ${request.email}`,`Favorite colors: ${request.favorite_colors}`,`Favorite locations: ${request.favorite_locations}`,`Favorite imagery: ${request.favorite_imagery}`,`Favorite landscapes: ${request.favorite_landscapes}`,'','Dream:',request.dream,'','Please also attach a clear photo if you chose a photo or video package.'].join('\n'));
    const email = success?.querySelector('[data-mailto]');

  });
})();
