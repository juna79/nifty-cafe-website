import base64,io
from PIL import Image
import os
HERE=os.path.dirname(os.path.abspath(__file__))
R=os.path.join(HERE,'photos')+'/'
def uri(f,w,q=82):
    im=Image.open(f if f.startswith('/') else R+f).convert('RGB')
    if im.width>w: im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'JPEG',quality=q,optimize=True,progressive=True)
    return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
imgs={'hero':('cocktails.jpg',640),'wine':('wine.jpg',640),'fish':('fish.jpg',640),'burger':('burger.jpg',640),
 'brunch':('brunch.jpg',640),'play':('play.jpg',640),'pizzat':(R+'pizza-table.jpg',640),'balcony':(R+'balcony.jpg',420),'logo':('logo.jpg',420),'logo_s':('logo.jpg',128)}
# menu: (name, desc, price, cat, tags)
M=[('Beef samosas','4 pieces','500','bites',''),('Feta samosas','4 pieces','600','bites','V'),
('Chicken spring rolls','','600','bites',''),('Nacho chips','Guacamole or salsa','550','bites','V'),
('Halloumi Caesar salad','','800','light','V'),('Chickpea & black bean salad','','750','light','V'),
('Caprese sandwich & fries','','850','light','V'),('Grilled pesto chicken panini','','950','light',''),
('Deep-fried chicken','Fries & garden salad','900','mains',''),
('Crispy honey sesame chicken','Rice & Taiwanese cabbage','1,300','mains','P'),
('Beef meatballs','Marinara sauce','1,200','mains',''),('Beef burger','','850','mains',''),
('Coconut & beans curry','Chapati or rice','700','mains','V'),
('Fish fingers & chips','Kids menu','600','kids',''),('Hotdog on a bun & chips','Kids menu','550','kids','')]
h=''
for n,d,p,c,t in M:
    tag=('<span class="tag">Vegetarian</span>' if 'V' in t else '')+('<span class="tag pop">Guest favourite</span>' if 'P' in t else '')
    h+=f'      <div class="item" data-c="{c}"><h3>{n.replace("&","&amp;")}{tag}</h3><span class="price"><small>KSh</small>{p}</span>'+(f'<p>{d.replace("&","&amp;")}</p>' if d else '')+'</div>\n'
G=[('hero','p','Cheers to the view'),('pizzat','p','Fresh from the oven'),('wine','p','A better pour'),('Q1','q',''),('burger','p','Burger & fries'),('fish','p','Fish, chips and salad'),('brunch','p','Brunch time'),('Q2','w',''),('play','p','Room to roam: the kids\' play tower')]
def gal():
    o=''
    for k,t,c in G:
        if t=='p': o+=f'      <button class="gl" data-cap="{c}"><img src="__IMG_{k}__" alt="{c}" loading="lazy"></button>\n'
        elif t=='q': o+='      <div class="gq" aria-hidden="true">Good food. Good people. Good vibes.</div>\n'
        else: o+='      <div class="gq w" aria-hidden="true"><img src="__IMG_logo__" alt=""></div>\n'
    return o
g=gal()
s=open(os.path.join(HERE,'template.html')).read().replace('__MENU__',h).replace('__GALLERY__',g)
import re
D={k:uri(f,min(w,520) if k not in('logo','logo_s') else w,76 if k!='balcony' else 68) for k,(f,w) in imgs.items()}
s=re.sub(r'<img([^>]*?) data-k="(\w+)"',lambda m:f'<img{m.group(1)} src="{D[m.group(2)]}"',s)
s=re.sub(r'<img([^>]*?) src="__IMG_(\w+)__"',lambda m:f'<img{m.group(1)} src="{D[m.group(2)]}"',s)
s=s.replace('url(__IMG_balcony__)','url('+D['balcony']+')')
s=s.replace('data-bg="balcony"','style="background-image:url('+D['balcony']+')"')
s=s.replace('href="__IMG_logo_s__"','href="'+D['logo_s']+'"')
assert '__IMG_' not in s,re.findall(r'__IMG_\w+__',s)[:3]
open(os.path.join(HERE,'..','index.html'),'w').write(s)
print(len(s)//1024,'KB')
