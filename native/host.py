#!/usr/bin/python3
"""Native Messaging host: writes PNGs only beneath ~/Documents, no network."""
import base64,json,os,pathlib,re,struct,subprocess,sys,tempfile
ROOT=pathlib.Path.home()/'Documents'
MAX_BYTES=180*1024*1024

def destination(relative):
    if not isinstance(relative,str): raise ValueError('Nom de fichier manquant.')
    parts=relative.split('/')
    if len(parts)!=3 or not (parts[1].startswith('Session_') or re.fullmatch(r'.+ - \d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}',parts[1])) or not parts[2].endswith('.png'): raise ValueError('Chemin de capture invalide.')
    if any(not p or p in ('.','..') or '\\' in p or '\x00' in p or len(p)>220 for p in parts): raise ValueError('Chemin invalide.')
    target=ROOT.joinpath(*parts)
    if not target.resolve().is_relative_to(ROOT.resolve()): raise ValueError('Le dossier doit rester dans Documents.')
    if any(p.is_symlink() for p in [target,target.parent,target.parent.parent]): raise ValueError('Les liens symboliques ne sont pas acceptés.')
    return target

class Writer:
    def __init__(self): self.file=None;self.temp=None;self.target=None;self.total=0
    def cleanup(self):
        if self.file:self.file.close();self.file=None
        if self.temp:self.temp.unlink(missing_ok=True);self.temp=None
    def handle(self,m):
        action=m.get('action')
        if action=='ping':return {'ok':True,'root':str(ROOT)}
        if action=='reveal':
            target=destination(m.get('filename'))
            if not target.is_file():raise ValueError('Image introuvable.')
            subprocess.run(['/usr/bin/open','-R',str(target)],check=True)
            return {'ok':True}
        if action=='begin':
            self.cleanup();self.total=0;self.target=destination(m.get('filename'))
            self.target.parent.mkdir(parents=True,exist_ok=True)
            fd,tmp=tempfile.mkstemp(prefix='.photo-web-',suffix='.tmp',dir=self.target.parent)
            self.temp=pathlib.Path(tmp);self.file=os.fdopen(fd,'wb')
            return {'ok':True}
        if action=='chunk':
            if not self.file:raise ValueError('Aucune capture en cours.')
            data=base64.b64decode(m.get('data',''),validate=True)
            if self.total==0 and not data.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('PNG invalide.')
            self.total+=len(data)
            if self.total>MAX_BYTES:raise ValueError('Image trop volumineuse.')
            self.file.write(data);return {'ok':True}
        if action=='finish':
            if not self.file or self.total<24:raise ValueError('Image incomplète.')
            self.file.flush();os.fsync(self.file.fileno());self.file.close();self.file=None
            target=self.target
            for n in range(10000):
                candidate=target if n==0 else target.with_name(f'{target.stem}_{n}.png')
                try:os.link(self.temp,candidate);break
                except FileExistsError:continue
            else:raise ValueError('Trop de fichiers de même nom.')
            self.temp.unlink();self.temp=None
            return {'ok':True,'path':str(candidate),'filename':str(candidate.relative_to(ROOT))}
        raise ValueError('Action inconnue.')

def read_exact(n):
    data=bytearray()
    while len(data)<n:
        chunk=sys.stdin.buffer.read(n-len(data))
        if not chunk:raise EOFError()
        data.extend(chunk)
    return bytes(data)

def main():
    writer=Writer()
    try:
        while True:
            try:
                n=struct.unpack('=I',read_exact(4))[0]
                if n>1024*1024:break
                message=json.loads(read_exact(n));result=writer.handle(message)
            except EOFError:break
            except Exception as error:
                writer.cleanup();result={'ok':False,'error':str(error)}
            encoded=json.dumps(result).encode();sys.stdout.buffer.write(struct.pack('=I',len(encoded))+encoded);sys.stdout.buffer.flush()
    finally:writer.cleanup()
if __name__=='__main__':main()
