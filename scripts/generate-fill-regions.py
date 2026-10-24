"""Build deterministic bounded components from render-fill-source.mjs output.
Dependencies: Pillow, numpy, scipy. Runtime is dependency-free static JS.
Never flood through number text: only original line art and closure seams.
"""
from PIL import Image, ImageDraw
import numpy as np,json,glob,os
from scipy.ndimage import label,distance_transform_edt
all_regions={};extra_labels={};thumbs=[]
for path in sorted(glob.glob('/tmp/lcg-fill/*.png')):
 if not os.path.isfile(path[:-4]+'.json'):continue
 ident=os.path.basename(path)[:-4];im=Image.open(path).convert('RGBA');a=np.array(im);cc,n=label(a[:,:,3]<32);g=json.load(open(path[:-4]+'.json')); components={}
 for l in g['labels']:
  c=int(cc[l['y'],l['x']]);assert c and c!=int(cc[0,0]),(ident,'unbounded/line seed',l)
  if c in components:assert components[c]['number']==l['number'],(ident,'color conflict',l)
  else:components[c]={'id':str(len(components)+1),'number':l['number'],'seeds':[]}
  components[c]['seeds'].append([l['x'],l['y']])
 extras=[]
 for c in range(1,n+1):
  if c in components or c==int(cc[0,0]):continue
  mask=cc==c;area=int(np.sum(mask))
  # Tiny eye dots and hairline slivers are decorative, not child-sized regions.
  if area<200:continue
  d=distance_transform_edt(mask);y,x=np.unravel_index(np.argmax(d),d.shape);radius=float(d[y,x])
  if radius<3:continue
  nearest=min(g['labels'],key=lambda l:(l['x']-x)**2+(l['y']-y)**2);num=nearest['number']
  if ident=='rainbow':num=1 if x<265 or x>735 else 2 if x<325 or x>675 else 3
  if ident=='longneck':num=3
  if ident=='rocket':num=5
  if ident=='apple':num=3
  if ident=='cat' and area<300:num=2
  extras.append({'x':int(x),'y':int(y),'number':num,'size':max(16,min(24,int(radius*1.4)))})
  components[c]={'id':str(len(components)+1),'number':num,'seeds':[[int(x),int(y)]]}
 extra_labels[ident]=extras
 output=[];paint=Image.new('RGBA',im.size,'white');pd=ImageDraw.Draw(paint)
 for c,r in components.items():
  mask=cc==c;ys,xs=np.where(mask);spans=[]
  assert len(xs)<400000 and not np.any(mask[0,:]) and not np.any(mask[-1,:]) and not np.any(mask[:,0]) and not np.any(mask[:,-1]),(ident,'leak')
  for y in range(int(ys.min()),int(ys.max())+1):
   row=np.pad(mask[y].astype(np.int8),(1,1));diff=np.diff(row);starts=np.where(diff==1)[0];ends=np.where(diff==-1)[0]
   for x1,x2 in zip(starts,ends):spans.append([y,int(x1),int(x2)]);pd.line((int(x1),y,int(x2)-1,y),fill=next(p['color'] for p in g['palette'] if p['number']==r['number']))
  r.update(bounds=[int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1],spans=spans);output.append(r)
 paint.alpha_composite(im);paint.thumbnail((250,225));tile=Image.new('RGB',(250,250),'white');tile.paste(paint,(0,20));ImageDraw.Draw(tile).text((5,3),ident,fill='black');thumbs.append(tile);all_regions[ident]=output
with open('dist/fill-regions.js','w') as f:
 f.write('// Generated bounded regions from original SVG line art; x2 is exclusive.\nconst regions='+json.dumps(all_regions,separators=(',',':'))+';\n')
 f.write('const extraLabels='+json.dumps(extra_labels,separators=(',',':'))+';\nexport function getExtraFillLabels(pattern){return extraLabels[pattern]||[]}\n')
 f.write('''export function getFillRegions(pattern){return regions[pattern]||[]}
export function regionAt(pattern,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=1000||y>=900)return null;
 x=Math.floor(x);y=Math.floor(y);
 for(const r of getFillRegions(pattern)){const [x1,y1,x2,y2]=r.bounds;if(x<x1||x>=x2||y<y1||y>=y2)continue;
  // Binary search to first span on requested scanline.
  let low=0,high=r.spans.length;while(low<high){const m=(low+high)>>>1;if(r.spans[m][0]<y)low=m+1;else high=m}
  for(let i=low;i<r.spans.length&&r.spans[i][0]===y;i++){const s=r.spans[i];if(x>=s[1]&&x<s[2])return r}
 }return null;
}
''')
sheet=Image.new('RGB',(1500,750),'#f4f4f4')
for i,im in enumerate(thumbs):sheet.paste(im,((i%6)*250,(i//6)*250))
sheet.save('/tmp/lcg-fill-contact.png')
print('Generated',sum(map(len,all_regions.values())),'bounded regions across',len(all_regions),'templates')
