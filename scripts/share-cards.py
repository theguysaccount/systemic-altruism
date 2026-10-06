"""Create new branded, page-specific social artwork (never edit a source image)."""
import json, hashlib, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
routes=json.loads((root/'dist/routes.json').read_text())
registry=json.loads((root/'data/registry/manifest.json').read_text())
profiles=json.loads((root/'data/charities.json').read_text())['charities']
profile_by_path={'/charities/'+c['id']+'/':c for c in profiles}
out=root/'public/share';out.mkdir(exist_ok=True)
fonts={
 'sans':['/System/Library/Fonts/Supplemental/Arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
 'bold':['/System/Library/Fonts/Supplemental/Arial Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
 'serif':['/System/Library/Fonts/Supplemental/Georgia.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf']
}
def font(size,style='sans'):
 p=next((Path(p) for p in fonts[style] if Path(p).exists()),None)
 return ImageFont.truetype(str(p),size) if p else ImageFont.load_default(size=size)
def wrap(draw,text,face,width):
 lines=[];current=''
 for word in text.split():
  candidate=(current+' '+word).strip()
  if draw.textlength(candidate,font=face)>width and current:lines.append(current);current=word
  else:current=candidate
 if current:lines.append(current)
 return lines
paper='#f5f5ed';green='#164b38';ink='#172b28';lime='#d5ed74';muted='#5b6a65'
for route in routes:
 im=Image.new('RGB',(1200,630),paper);d=ImageDraw.Draw(im)
 # Full-height network panel, with a quiet technical grid and an intentional path.
 d.rectangle((810,0,1200,630),fill=green)
 for x in range(830,1200,35):d.line((x,0,x,630),fill='#204f3f',width=1)
 for y in range(20,630,35):d.line((810,y,1200,y),fill='#204f3f',width=1)
 d.ellipse((55,44,96,85),fill=green)
 d.line((66,73,84,55),fill=lime,width=3);d.line((73,55,84,55,84,66),fill=lime,width=3)
 d.text((112,50),'SYSTEMIC ALTRUISM',font=font(23,'bold'),fill=ink)
 d.rounded_rectangle((660,49,740,81),radius=16,fill='#e6ecd9')
 d.text((680,55),'BETA',font=font(15,'bold'),fill=green)
 d.line((56,113,750,113),fill='#d3d9cc',width=1)
 path=route['path'];c=profile_by_path.get(path)
 if path=='/':
  topic='THE CHARITY TRACKER';lines=['Giving that','changes the','system.'];size=78
  caption=f"Search {registry['recordCount']:,} IRS-listed organizations."
  second='Compare mechanisms. Inspect evidence. Make better judgments.'
 elif path=='/directory/':
  topic='THE CHARITY INDEX';lines=['A bigger map.','A better','starting point.'];size=73
  caption=f"{registry['recordCount']:,} organizations. One open index."
  second='Search by name, location, cause or EIN.'
 else:
  topic=(c['category'].upper() if c else {'/methodology/':'THE METHOD','/data/':'OPEN DATA','/about/':'ABOUT THE PROJECT'}.get(path,'THE CHARITY TRACKER'))
  size=65;lines=wrap(d,route['title'],font(size,'serif'),670)
  while len(lines)>4:
   size-=3;lines=wrap(d,route['title'],font(size,'serif'),670)
  caption='Mechanisms, evidence and the questions that remain.' if c else route['description']
  second='Preliminary assessment · Sources and uncertainty included' if c else 'Open code · Visible evidence · Transparent limits'
 d.text((58,143),topic,font=font(15,'bold'),fill=muted)
 y=179
 for line in lines:
  d.text((55,y),line,font=font(size,'serif'),fill=green);y+=size+5
 caplines=wrap(d,caption,font(21),675)
 for i,line in enumerate(caplines[:2]):d.text((58,481+i*27),line,font=font(21),fill=ink)
 d.text((58,541),second,font=font(16),fill=muted)
 d.line((58,581,750,581),fill='#d3d9cc')
 d.text((58,596),'charities.systemicaltruism.com',font=font(15,'bold'),fill=green)
 # Per-page evidence-network composition; distinct entity cards retain their topic.
 seed=hashlib.sha256(path.encode()).digest()
 d.text((850,52),'A SYSTEMIC LENS',font=font(15,'bold'),fill=lime)
 d.text((850,80),'Change the conditions.',font=font(16),fill='#c2d2b7')
 cx,cy=1000,310
 for radius in (105,146):
  for a in range(0,360,7):
   x=cx+radius*math.cos(math.radians(a));y=cy+radius*math.sin(math.radians(a))
   d.ellipse((x-1,y-1,x+1,y+1),fill='#517563')
 nodes=[(902,224),(1100,217),(900,396),(1111,393)]
 labels=['RULES','INCENTIVES','INSTITUTIONS','COMMUNITY']
 for i,((x,y),label) in enumerate(zip(nodes,labels)):
  y+=seed[i]%17-8
  d.line((cx,cy,x,y),fill='#84a88c',width=2)
  d.ellipse((x-13,y-13,x+13,y+13),fill='#bad197')
  tx=x-d.textlength(label,font=font(11,'bold'))/2
  d.text((tx,y+23),label,font=font(11,'bold'),fill='#dbe8d0')
 d.ellipse((cx-38,cy-38,cx+38,cy+38),fill=lime)
 d.line((cx-14,cy+14,cx+15,cy-15),fill=green,width=4)
 d.line((cx-2,cy-15,cx+15,cy-15,cx+15,cy+2),fill=green,width=4)
 d.rounded_rectangle((850,492,1155,568),radius=7,outline='#75936d',width=1)
 d.text((869,507),'EVIDENCE BEFORE CERTAINTY',font=font(13,'bold'),fill=lime)
 d.text((869,534),'An open map of possible change.',font=font(14),fill='#dbe8d0')
 im.save(out/(route['card']+'.png'),optimize=True)
# Preserve earlier card URLs for existing cached previews; new pages use v2 URLs.
print(f'Created {len(routes)} intentional 1200×630 share cards')
