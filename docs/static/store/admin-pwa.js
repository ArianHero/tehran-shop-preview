(() => {
  const worker = document.currentScript.dataset.adminWorker;
  const standalone = matchMedia('(display-mode: standalone)');
  let prompt;
  let install;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event;
  });

  window.addEventListener('appinstalled', () => {
    prompt = undefined;
    if (install) install.hidden = true;
  });

  document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator && window.isSecureContext && worker) {
      navigator.serviceWorker.register(worker).catch(error => console.warn('Admin service worker:', error));
    }

    install = document.querySelector('[data-admin-install]');
    if (!install || standalone.matches || navigator.standalone) return;
    install.hidden = false;
    const help = document.querySelector('[data-admin-install-help]');
    install.addEventListener('click', async () => {
      if (!prompt) {
        help.hidden = !help.hidden;
        return;
      }
      const current = prompt;
      prompt = undefined;
      try {
        await current.prompt();
        const {outcome} = await current.userChoice;
        install.hidden = outcome === 'accepted';
        help.hidden = true;
      } catch {
        help.hidden = false;
      }
    });
  });
})();
