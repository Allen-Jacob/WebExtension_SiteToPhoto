import {defaults, settings, plan} from './core.js';
import {capturePage} from './capture.js';
import {hostRequest, savePNG} from './native.js';
let busy = false;
async function status(tabId, text, title, color = '#2563eb') {
  await Promise.allSettled([
    chrome.action.setBadgeText({tabId, text}),
    chrome.action.setBadgeBackgroundColor({tabId, color}),
    chrome.action.setTitle({tabId, title})
  ]);
}
export async function capture(tab) {
  if (busy || !tab?.id) return;
  busy = true;
  const target = {tabId: tab.id};
  let attached = false, originalPosition;
  try {
    if (!/^https?:\/\//.test(tab.url || '')) throw new Error('Ouvrez une page web HTTP ou HTTPS pour la capturer.');
    await status(tab.id, '…', 'Capture de la page…');
    await chrome.storage.local.set({lastError:''});
    const saved = await chrome.storage.local.get(['settings', 'group']);
    const config = settings(saved.settings);
    const output = plan(tab.url, Date.now(), config, saved.group);
    try { await hostRequest({action:'ping'}); } catch (error) { throw new Error('Composant local indisponible : '+error.message); }
    try { originalPosition = await chrome.tabs.sendMessage(tab.id,{type:'get-position'}); } catch { throw new Error('Rechargez la page web pour activer la nouvelle version de Photo web.'); }
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    const image = await capturePage(target);
    await chrome.debugger.detach(target);
    attached = false;
    await chrome.tabs.sendMessage(tab.id,{type:'restore-position',...originalPosition});
    const savedFile = await savePNG(image, output.filename);
    await chrome.storage.local.set({group: output.group, last: {filename: savedFile.filename, path: savedFile.path, state: 'complete', at: Date.now()}, lastError: ''});
    await status(tab.id, '✓', savedFile.path);
    const receipt = {id:crypto.randomUUID(),filename:savedFile.filename};
    await chrome.storage.session.set({[`capture-${tab.id}`]:receipt});
    await chrome.tabs.sendMessage(tab.id,{type:'capture-saved',id:receipt.id,folder:savedFile.filename.split('/').slice(0,-1).join(' / ')}).catch(()=>{});
  } catch (error) {
    const message = error?.message || String(error);
    await chrome.storage.local.set({lastError: message});
    await status(tab.id, '!', `Capture impossible : ${message} — clic droit > Options`, '#b91c1c');
  } finally {
    if (attached) await chrome.debugger.detach(target).catch(() => {});
    if(originalPosition)await chrome.tabs.sendMessage(tab.id,{type:'restore-position',...originalPosition}).catch(()=>{});
    busy = false;
  }
}
chrome.action.onClicked.addListener(tab => { void capture(tab); });
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if(message?.type==='open-capture-folder' && sender.id===chrome.runtime.id && sender.tab && sender.frameId===0){
    void (async()=>{
      try{
        const key=`capture-${sender.tab.id}`;
        const stored=await chrome.storage.session.get(key);
        const receipt=stored[key];
        if(!receipt || receipt.id!==message.id)throw new Error('Cette confirmation a expiré. Utilisez le menu de Photo web.');
        await hostRequest({action:'reveal',filename:receipt.filename});
        reply({ok:true});
      }catch(error){reply({ok:false,error:error.message});}
    })();
    return true;
  }
  if (message?.type === 'capture' && sender.tab && sender.frameId === 0) {
    void chrome.tabs.query({active: true, lastFocusedWindow: true}).then(([active]) => {
      if (active?.id === sender.tab.id) return capture(active);
    });
  }
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'settings') void chrome.runtime.openOptionsPage();
  if (info.menuItemId === 'new-group') void chrome.storage.local.remove('group');
  if (info.menuItemId === 'show-last') void chrome.storage.local.get('last').then(({last}) => last?.filename && hostRequest({action:'reveal',filename:last.filename}));
});
chrome.runtime.onInstalled.addListener(async ({reason}) => {
  await chrome.contextMenus.removeAll();
  for (const [id, title] of [['settings','Réglages de Photo web'], ['new-group','Commencer un nouveau groupe'], ['show-last','Afficher la dernière image dans le Finder']]) {
    chrome.contextMenus.create({id, title, contexts: ['action']});
  }
  if (reason === 'install') {
    const current = await chrome.storage.local.get('settings');
    if (!current.settings) await chrome.storage.local.set({settings: defaults});
    await chrome.runtime.openOptionsPage();
  }
});

chrome.tabs.onRemoved.addListener(tabId=>{void chrome.storage.session.remove(`capture-${tabId}`);});
