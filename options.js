import {settings} from './core.js';
import {hostRequest} from './native.js';
const $ = id => document.getElementById(id);
const stored = await chrome.storage.local.get('settings');
const config = settings(stored.settings);
for (const id of ['minutes', 'folder', 'key']) $(id).value = config[id];
$('key-label').textContent = config.key || '⌘ ⇧ Y';
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  const folder = $('folder').value.trim();
  if (!folder || /[<>:"/\\|?*\u0000-\u001f]/.test(folder) || /^\.+$/.test(folder)) { $('saved').textContent = 'Choisissez un nom de dossier simple.'; return; }
  const value = settings({minutes: $('minutes').value, folder, key: $('key').value});
  await chrome.storage.local.set({settings: value});
  $('key-label').textContent = value.key || '⌘ ⇧ Y';
  $('saved').textContent = 'Enregistré.';
});
$('check-host').onclick = async () => { try { const result=await hostRequest({action:'ping'}); $('host-state').textContent='Connecté — '+result.root; } catch { $('host-state').textContent='Composant local absent. Exécutez native/install.py puis rechargez l’extension.'; } };
$('shortcuts').onclick = () => chrome.tabs.create({url: 'brave://extensions/shortcuts'});
$('new-group').onclick = async () => { await chrome.storage.local.remove('group'); $('saved').textContent = 'La prochaine capture ouvrira un nouveau groupe.'; };
$('show-last').onclick = async () => {
  const {last} = await chrome.storage.local.get('last');
  if (last?.filename) { try { await hostRequest({action:'reveal',filename:last.filename}); } catch(error) { $('error').textContent = error.message; } }
};
async function refresh() {
  const {last, lastError} = await chrome.storage.local.get(['last','lastError']);
  $('last').textContent = last ? `${last.state === 'complete' ? 'Enregistrée' : last.state === 'interrupted' ? 'Interrompue' : 'Enregistrement en cours'} : ${last.path || last.filename}` : 'Aucune capture pour le moment.';
  $('error').textContent = lastError || '';
  $('show-last').disabled = !last;
}
chrome.storage.onChanged.addListener(refresh);
await refresh();
