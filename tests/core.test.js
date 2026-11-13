import test from 'node:test';
import assert from 'node:assert/strict';
import {settings, plan, clean} from '../core.js';
test('cinq minutes fixes, même groupe entre différents sites', () => {
  const config = settings(), start = 1000000;
  const a = plan('https://jacobholland.com/about?token=secret#top', start, config);
  const b = plan('http://localhost:3000/contact', start + 299999, config, a.group);
  const c = plan('https://example.com/', start + 300000, config, b.group);
  assert.deepEqual(a.group, b.group);
  assert.notEqual(c.group.name, a.group.name);
  assert.match(a.filename, /jacobholland.com_about_/);
  assert.ok(!a.filename.includes('secret'));
  assert.match(b.filename, /localhost_3000_contact/);
});
test('réglages, URL encodées et chemins sans traversée', () => {
  assert.equal(settings({minutes:-1}).minutes, 1);
  assert.equal(settings({minutes:999}).minutes, 120);
  assert.equal(settings({key:'A'}).key,'F8');
  assert.equal(settings({key:''}).key,'');
  assert.equal(clean('../test/a'), '_test_a');
  const p = plan('https://exemple.com/caf%C3%A9/%2F', 10000, settings());
  assert.equal(p.filename.split('/').length,3);
  assert.match(p.filename, /café/);
});
test('changement de durée ou de dossier ouvre un groupe', () => {
  const first = plan('https://a.com', 100000, settings());
  for (const config of [settings({minutes:10}), settings({folder:'Images'})]) {
    assert.notEqual(plan('https://a.com', 100001, config, first.group).group.name, first.group.name);
  }
});

test('nom du site pour les nouveaux groupes et migration des anciens',()=>{
 const a=plan('https://jacoballen.ca/about',100000,settings());
 assert.match(a.group.name,/^jacoballen\.ca - /);
 const old={...a.group,format:undefined,name:'Session_old'};
 assert.match(plan('https://second.ca',100001,settings(),old).group.name,/^second\.ca - /);
});
