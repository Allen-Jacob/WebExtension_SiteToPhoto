// Capture actual visible surfaces: avoids repeated compositor tiles on Brave/macOS.
export async function capturePage(target) {
  const send = (method, params = {}) => chrome.debugger.sendCommand(target, method, params);
  const {frameTree} = await send('Page.getFrameTree');
  const {executionContextId} = await send('Page.createIsolatedWorld', {frameId: frameTree.frame.id, worldName: 'Photo web capture'});
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', {expression, contextId: executionContextId, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  let prepared = false;
  try {
    await evaluate(`(() => {
      globalThis.photoWeb = {x:scrollX, y:scrollY, hidden:[]};
      const s = document.createElement('style');
      s.textContent = '* { scroll-behavior:auto!important; scroll-snap-type:none!important; caret-color:transparent!important; } ::-webkit-scrollbar { display:none!important; } html { scrollbar-width:none!important; }';
      document.documentElement.appendChild(s); photoWeb.style=s;
      photoWeb.wait = () => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 180));
      photoWeb.size = () => ({width:Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0,innerWidth),height:Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0,innerHeight),vw:innerWidth,vh:innerHeight,x:scrollX,y:scrollY});
      return true;
    })()`);
    prepared = true;
    // Let lazy-loaded images and scroll-triggered sections render before measuring.
    let size = await evaluate('photoWeb.size()');
    for (let y = 0, steps = 0; y < size.height && steps < 80; y += size.vh, steps++) {
      if (size.height > 32767 || size.width * size.height > 60000000) throw new Error('Page trop grande pour une image.');
      size = await evaluate(`(async()=>{scrollTo(0,${y});await photoWeb.wait();return photoWeb.size();})()`);
    }
    size = await evaluate(`(async()=>{
      scrollTo(0,0);await photoWeb.wait();
      photoWeb.hidden=Array.from(document.querySelectorAll('*')).filter(el=>{
        const p=getComputedStyle(el).position, r=el.getBoundingClientRect();
        return p==='fixed'||(p==='sticky'&&r.top<innerHeight&&r.bottom>0);
      }).map(el=>({el,value:el.style.getPropertyValue('visibility'),priority:el.style.getPropertyPriority('visibility')}));
      return photoWeb.size();
    })()`);
    if(size.width>32767||size.height>32767||size.width*size.height>60000000)throw new Error('Page trop grande pour une image.');
    const canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d', {alpha:false});
    for(let y=0;y<size.height;y+=size.vh){
      for(let x=0;x<size.width;x+=size.vw){
        const position = await evaluate(`(async()=>{
          for(const h of photoWeb.hidden){if(${y}>0)h.el.style.setProperty('visibility','hidden','important');else if(h.value)h.el.style.setProperty('visibility',h.value,h.priority);else h.el.style.removeProperty('visibility');}
          scrollTo(${x},${y});await photoWeb.wait();return photoWeb.size();
        })()`);
        if (position.x > x + 1 || position.y > y + 1 || x-position.x >= size.vw || y-position.y >= size.vh) throw new Error('La page empêche le défilement nécessaire à la capture.');
        const shot = await send('Page.captureScreenshot', {format:'png',fromSurface:true,captureBeyondViewport:false});
        const blob = await (await fetch(`data:image/png;base64,${shot.data}`)).blob();
        const bitmap = await createImageBitmap(blob);
        const sx = bitmap.width / position.vw, sy = bitmap.height / position.vh;
        const w = Math.min(size.vw, size.width-x), h = Math.min(size.vh,size.height-y);
        ctx.drawImage(bitmap,(x-position.x)*sx,(y-position.y)*sy,w*sx,h*sy,x,y,w,h);
        bitmap.close();
      }
    }
    return await canvas.convertToBlob({type:'image/png'});
  } finally {
    if(prepared)await evaluate(`(()=>{for(const h of photoWeb.hidden){if(h.value)h.el.style.setProperty('visibility',h.value,h.priority);else h.el.style.removeProperty('visibility');}photoWeb.style.remove();scrollTo({left:photoWeb.x,top:photoWeb.y,behavior:'instant'});delete globalThis.photoWeb;})()`).catch(()=>{});
  }
}
