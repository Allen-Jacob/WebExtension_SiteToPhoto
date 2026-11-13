(() => {
  let key = 'F8', toast;
  function clearToast() { toast?.remove(); toast = null; }
  function showToast(message) {
    clearToast();
    toast = document.createElement('div');
    toast.id = 'photo-web-notification';
    toast.style.cssText = 'all:initial!important;position:fixed!important;right:24px!important;bottom:24px!important;z-index:2147483647!important;display:block!important;max-width:calc(100vw - 32px)!important;';
    const shadow = toast.attachShadow({mode:'open'});
    const style = document.createElement('style');
    style.textContent = `:host{color-scheme:light}*{box-sizing:border-box}.card{font:14px/1.45 system-ui,sans-serif;background:#fff;color:#17251f;border:1px solid #dce8df;border-radius:14px;padding:18px;width:330px;max-width:calc(100vw - 32px);box-shadow:0 8px 32px #0002}.heading{display:flex;align-items:center;gap:10px;padding-right:20px;font-weight:650;font-size:15px}.check{display:grid;place-items:center;background:#e5f4e9;color:#21733b;width:27px;height:27px;border-radius:50%;font-size:17px}.detail{margin:9px 0 15px;color:#617069;font-size:12px;overflow-wrap:anywhere}button{font:600 13px system-ui;cursor:pointer;border:0;border-radius:7px}.open{padding:10px 14px;background:#203d2c;color:white}.close{position:absolute;top:13px;right:13px;color:#617069;background:transparent;padding:6px;font-size:18px;line-height:1}button:focus-visible{outline:3px solid #6ea17c;outline-offset:3px}button:hover{filter:brightness(.9)}.error{color:#a52828;margin:8px 0 0;font-size:12px}`;
    const card=document.createElement('section'); card.className='card';card.setAttribute('aria-label','Photo web');
    const heading=document.createElement('div');heading.className='heading';heading.setAttribute('role','status');
    const check=document.createElement('span');check.className='check';check.textContent='✓';check.setAttribute('aria-hidden','true');
    const title=document.createElement('span');title.textContent='Photo enregistrée';heading.append(check,title);
    const detail=document.createElement('p');detail.className='detail';detail.textContent=message.folder;
    const open=document.createElement('button');open.className='open';open.type='button';open.textContent='Ouvrir le dossier';
    const close=document.createElement('button');close.className='close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Fermer la confirmation');
    const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');error.hidden=true;
    close.addEventListener('click',clearToast);
    open.addEventListener('click',async event=>{
      if(!event.isTrusted)return;
      open.disabled=true;
      try { const response=await chrome.runtime.sendMessage({type:'open-capture-folder',id:message.id});if(!response?.ok)throw new Error(response?.error || 'Impossible d’ouvrir le dossier.'); }
      catch(e){error.hidden=false;error.textContent=e.message;}
      finally{open.disabled=false;}
    });
    card.append(heading,detail,open,close,error);shadow.append(style,card);document.documentElement.appendChild(toast);
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === 'get-position') { clearToast(); reply({x:scrollX,y:scrollY}); }
    if (message?.type === 'capture-saved') { showToast(message); reply({ok:true}); }
    if (message?.type === 'restore-position' && Number.isFinite(message.x) && Number.isFinite(message.y)) {
      setTimeout(() => requestAnimationFrame(() => { scrollTo({left:message.x,top:message.y,behavior:'instant'}); reply({ok:true,x:scrollX,y:scrollY}); }), 350);
      return true;
    }
  });
  chrome.storage.local.get('settings').then(result => { key = result.settings?.key ?? 'F8'; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) key = changes.settings.newValue?.key ?? 'F8';
  });
  window.addEventListener('keydown', event => {
    if (!event.isTrusted || !key || event.key !== key || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.composedPath().some(el => el instanceof HTMLElement && (el.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.getAttribute('role') === 'textbox'))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    chrome.runtime.sendMessage({type: 'capture'}).catch(() => {});
  }, true);
})();
