export const defaults = {minutes: 5, folder: 'Photo web', key: 'F8'};
export function clean(value, fallback = 'page') {
  return String(value).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '').slice(0, 110) || fallback;
}
export function stamp(ms) {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3,'0')}`;
}
export function settings(raw = {}) {
  return {minutes: Math.min(120, Math.max(1, Number(raw.minutes) || 5)), folder: clean(raw.folder || defaults.folder), key: ['F6','F7','F8','F9',''].includes(raw.key) ? raw.key : 'F8'};
}
export function plan(url, now, config, previous) {
  const u = new URL(url);
  let path = u.pathname;
  try { path = decodeURIComponent(path); } catch {}
  const name = clean(u.host + (path === '/' ? '_accueil' : path.replaceAll('/', '_')));
  const reuse = previous?.format === 2 && previous.root === config.folder && previous.minutes === config.minutes && now >= previous.start && now < previous.start + config.minutes * 60000;
  const group = reuse ? previous : {format: 2, root: config.folder, minutes: config.minutes, start: now, name: `${clean(u.host)} - ${stamp(now)}`} ;
  return {group, filename: `${config.folder}/${group.name}/${name}_${stamp(now)}.png`};
}
