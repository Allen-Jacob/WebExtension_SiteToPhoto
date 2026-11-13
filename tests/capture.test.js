import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePage} from '../capture.js';
let y=0,restored=false,fail=false;const draws=[];
const size=()=>({width:800,height:1900,vw:800,vh:600,x:0,y});
globalThis.chrome={debugger:{async sendCommand(target,method,args){
 if(method==='Page.getFrameTree')return {frameTree:{frame:{id:'frame'}}};
 if(method==='Page.createIsolatedWorld')return {executionContextId:12};
 if(method==='Runtime.evaluate'){
  if(args.expression.includes('delete globalThis.photoWeb')){restored=true;return {result:{value:true}};}
  const scroll=args.expression.match(/scrollTo\(0,(\d+)\)/);if(scroll)y=Math.min(Number(scroll[1]),1300);
  return {result:{value:size()}};
 }
 if(method==='Page.captureScreenshot'){
  assert.equal(args.captureBeyondViewport,false);
  if(fail)throw new Error('Capture interrompue');
  return {data:'YQ=='};
 }
 throw Error(method);
}}};
globalThis.OffscreenCanvas=class{constructor(w,h){assert.equal(w,800);assert.equal(h,1900);}getContext(){return {drawImage(...args){draws.push(args.slice(1));}};}async convertToBlob(){return new Blob(['png']);}};
globalThis.createImageBitmap=async()=>({width:800,height:600,close(){}});
test('assemble les portions visibles, recadre la dernière sans répétition et restaure la page',async()=>{
 await capturePage({tabId:1});
 assert.equal(draws.length,4);
 assert.deepEqual(draws[3],[0,500,800,100,0,1800,800,100]);
 assert.equal(restored,true);
});
test('restaure également la page après un échec',async()=>{
 restored=false;fail=true;
 await assert.rejects(capturePage({tabId:1}),/interrompue/);
 assert.equal(restored,true);
});
