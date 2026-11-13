export const HOST = 'ca.jacoballen.photo_web';
export async function hostRequest(message) {
  const result = await chrome.runtime.sendNativeMessage(HOST,message);
  if(!result?.ok)throw new Error(result?.error || 'Le composant local Photo web ne répond pas.');
  return result;
}
export async function savePNG(blob, filename) {
  const port=chrome.runtime.connectNative(HOST);
  let pending, closed=false;
  const disconnect=()=>{closed=true;if(pending){pending.reject(new Error(chrome.runtime.lastError?.message || 'Connexion locale interrompue.'));pending=null;}};
  port.onDisconnect.addListener(disconnect);
  port.onMessage.addListener(result=>{if(pending){const {resolve,reject}=pending;pending=null;result.ok?resolve(result):reject(new Error(result.error));}});
  const request=message=>new Promise((resolve,reject)=>{
    if(closed)return reject(new Error('Composant local indisponible. Relancez son installation.'));
    pending={resolve,reject};port.postMessage(message);
  });
  try{
    await request({action:'begin',filename});
    const bytes=new Uint8Array(await blob.arrayBuffer());
    for(let i=0;i<bytes.length;i+=384*1024){
      const chunk=bytes.subarray(i,i+384*1024);
      let binary='';for(let j=0;j<chunk.length;j+=8192)binary+=String.fromCharCode(...chunk.subarray(j,j+8192));
      await request({action:'chunk',data:btoa(binary)});
    }
    return await request({action:'finish'});
  }finally{port.disconnect();}
}
