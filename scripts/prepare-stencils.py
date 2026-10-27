from pathlib import Path
import json,gzip,xml.etree.ElementTree as ET,hashlib,sys
from concurrent.futures import ThreadPoolExecutor
if len(sys.argv)!=2:raise SystemExit('Usage: python3 scripts/prepare-stencils.py /path/to/processed-svg-folder')
SRC=Path(sys.argv[1])
OUT=Path('public/stencils');OUT.mkdir(exist_ok=True)
NS='http://www.w3.org/2000/svg';ET.register_namespace('',NS)
def convert(p):
 root=ET.fromstring(p.read_bytes());root.set('fill','#000');root.set('stroke','none')
 for el in root.iter():
  if el.tag.endswith('path'):el.set('fill','#000');el.attrib.pop('stroke',None)
 for attr in ['stroke-width','stroke-linecap','stroke-linejoin']:root.attrib.pop(attr,None)
 data=ET.tostring(root,encoding='utf-8');id=hashlib.sha256(p.name.encode()).hexdigest()[:16]
 (OUT/(id+'.svg.gz')).write_bytes(gzip.compress(data,compresslevel=9,mtime=0))
 return {'id':id,'name':p.name.rsplit('.',2)[0],'source':p.name,'viewBox':root.get('viewBox')}
with ThreadPoolExecutor(max_workers=8) as pool:items=list(pool.map(convert,sorted(SRC.glob('*.svg'))))
Path('lib/stencils.json').write_text(json.dumps(items,separators=(',',':')))
print(len(items),'SVGs prepared;',sum(p.stat().st_size for p in OUT.glob('*'))//1024//1024,'MiB compressed')
