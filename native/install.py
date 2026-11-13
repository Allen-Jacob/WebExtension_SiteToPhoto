#!/usr/bin/python3
import hashlib,json,pathlib,sys
extension=pathlib.Path(__file__).resolve().parent.parent
# Chromium derives the unpacked-extension ID from its absolute path.
digest=hashlib.sha256(str(extension).encode()).hexdigest()[:32]
identifier=''.join(chr(ord('a')+int(c,16)) for c in digest)
profile=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path.home()/'Library/Application Support/BraveSoftware/Brave-Browser'
host=extension/'native/host.py';host.chmod(0o755)
folder=profile/'NativeMessagingHosts';folder.mkdir(parents=True,exist_ok=True)
manifest={'name':'ca.jacoballen.photo_web','description':'Enregistrement local des captures Photo web dans Documents','path':str(host),'type':'stdio','allowed_origins':[f'chrome-extension://{identifier}/']}
(folder/'ca.jacoballen.photo_web.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Composant installé pour {identifier} dans {folder}')

if len(sys.argv)==1 and sys.platform=='darwin':
    chrome=pathlib.Path.home()/'Library/Application Support/Google/Chrome/NativeMessagingHosts'
    chrome.mkdir(parents=True,exist_ok=True)
    (chrome/'ca.jacoballen.photo_web.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Manifest macOS compatible Brave installé dans '+str(chrome))
