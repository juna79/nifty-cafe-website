(function(){
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  (function(){var tr=$('#stripTrack');if(tr){Array.prototype.slice.call(tr.children).forEach(function(n){var c=n.cloneNode(true);c.setAttribute('aria-hidden','true');c.tabIndex=-1;tr.appendChild(c)})}})();
  var PHONE='254115435374';

  // nav
  var nav=$('#nav'),burger=$('#burger'),links=$('#links');
  function sc(){nav.classList.toggle('scrolled',window.scrollY>30)}
  sc();window.addEventListener('scroll',sc,{passive:true});
  burger.addEventListener('click',function(){var o=links.classList.toggle('open');burger.setAttribute('aria-expanded',o)});
  $$('a',links).forEach(function(a){a.addEventListener('click',function(){links.classList.remove('open');burger.setAttribute('aria-expanded','false')})});

  // Nairobi time: open now + today's row
  function nairobi(){
    var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),o={};
    p.forEach(function(x){o[x.type]=x.value});
    var map={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    return {d:map[o.weekday],m:(+o.hour%24)*60+(+o.minute)};
  }
  function status(){
    var n=nairobi(),open=n.d!==1&&n.m>=510&&n.m<1260,el=$('#status'),t=$('#statusText');
    el.classList.toggle('closed',!open);
    if(open){t.textContent='Open now · until 9pm'}
    else if(n.d===1||(n.d===0&&n.m>=1260)){t.textContent='Closed · reopens Tuesday 8:30am'}
    else if(n.m>=1260){t.textContent='Closed · reopens tomorrow 8:30am'}
    else{t.textContent='Closed · opens today 8:30am'}
    $$('#hours tr').forEach(function(r){r.classList.toggle('today',+r.dataset.d===n.d)});
  }
  status();setInterval(status,60000);

  // menu filter
  var tabs=$$('.tab');
  tabs.forEach(function(t){t.addEventListener('click',function(){
    tabs.forEach(function(x){x.setAttribute('aria-selected',x===t)});
    var f=t.dataset.f;
    $$('#menuGrid .item').forEach(function(i){i.hidden=!(f==='all'||i.dataset.c===f)});
  })});

  // reveal
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  $$('.rv').forEach(function(e){io.observe(e)});

  // lightbox
  var lb=$('#lb'),lbI=$('#lbImg'),lbC=$('#lbCap'),orig=$$('#stripTrack .gl'),btns=orig.slice(0,orig.length/2),cur=0;
  function show(i){cur=(i+btns.length)%btns.length;var b=btns[cur],im=$('img',b);lbI.src=im.src;lbI.alt=im.alt;lbC.textContent=b.dataset.cap}
  orig.forEach(function(b,i){b.addEventListener('click',function(){show(i%btns.length);lb.showModal()})});
  $('#lbX').onclick=function(){lb.close()};
  $('#lbP').onclick=function(){show(cur-1)};
  $('#lbN').onclick=function(){show(cur+1)};
  lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('lb-in'))lb.close()});
  lb.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')show(cur-1);if(e.key==='ArrowRight')show(cur+1)});

  // scroll progress
  var prog=$('#prog');
  function pr(){var h=document.documentElement.scrollHeight-innerHeight;prog.style.transform='scaleX('+(h>0?scrollY/h:0)+')'}
  pr();window.addEventListener('scroll',pr,{passive:true});

  // statement word reveal
  var st=$('#statement');
  if(st){var words=st.textContent.trim().split(/\s+/);st.innerHTML=words.map(function(w){return '<span class="w">'+w+'</span> '}).join('');
    var ws=$$('.w',st);
    function sw(){var r=st.getBoundingClientRect(),p=(innerHeight*.85-r.top)/(r.height+innerHeight*.25);p=Math.max(0,Math.min(1,p));var n=Math.round(p*ws.length);ws.forEach(function(w,i){w.classList.toggle('on',i<n)})}
    sw();window.addEventListener('scroll',sw,{passive:true})}

  // stat counters
  var cio=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;cio.unobserve(e.target);
    var el=e.target,n=+el.dataset.n,dec=+(el.dataset.dec||0),pre=el.dataset.pre||'',suf=el.dataset.suf||'',t0=performance.now();
    (function f(t){var k=Math.min(1,(t-t0)/1400),v=n*(1-Math.pow(1-k,3));el.textContent=pre+v.toFixed(dec)+suf;if(k<1)requestAnimationFrame(f)})(t0)})},{threshold:.6});
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)$$('.stats b').forEach(function(b){cio.observe(b)});

  // hero parallax
  var stack=$('#stack');
  if(stack&&matchMedia('(hover:hover)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    var cards=$$('.pc',stack);
    $('.hero').addEventListener('mousemove',function(e){var x=(e.clientX/innerWidth-.5),y=(e.clientY/innerHeight-.5);
      cards.forEach(function(c){var d=+c.dataset.d;c.style.transform='translate('+(x*d)+'px,'+(y*d)+'px) rotate('+getComputedStyle(c).getPropertyValue('--r')+')'})});
  }

  // quick booking bar -> form
  var qd=$('#qd');qd.min=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  $('#qb').addEventListener('submit',function(e){e.preventDefault();
    if(qd.value){$('#bd').value=qd.value;$('#bd').dispatchEvent(new Event('change'))}
    $('#bg').value=$('#qg').value;
    $('#book').scrollIntoView({behavior:'smooth'});setTimeout(function(){$('#bn').focus({preventScroll:true})},700)});
  $('#qbToday').textContent=nairobi().d===1?'Closed today':'8:30am – 9pm';

  // booking form
  var bd=$('#bd'),bt=$('#bt'),warn=$('#warn');
  var now=new Date(),iso=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  bd.min=iso;
  for(var m=510;m<=1230;m+=30){
    var h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am',h12=((h+11)%12)+1,lab=h12+':'+(mm?'30':'00')+ap;
    var o=document.createElement('option');o.textContent=lab;if(lab==='1:00pm')o.selected=true;bt.appendChild(o);
  }
  function chk(){
    if(!bd.value){warn.classList.remove('show');return true}
    var d=new Date(bd.value+'T12:00:00').getDay();
    if(d===1){warn.textContent='We are closed on Mondays. Please pick Tuesday to Sunday.';warn.classList.add('show');return false}
    warn.classList.remove('show');return true;
  }
  bd.addEventListener('change',chk);
  $('#bookForm').addEventListener('submit',function(e){
    e.preventDefault();
    var name=$('#bn').value.trim();
    if(!name||!bd.value){warn.textContent='Please add your name and a date.';warn.classList.add('show');return}
    if(!chk())return;
    var d=new Date(bd.value+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
    var occ=$('#bo').value,note=$('#bm').value.trim();
    var msg='Hi Nifty! I would like to book a table.\n\nName: '+name+'\nGuests: '+$('#bg').value+'\nDate: '+d+'\nTime: '+bt.value+(occ?'\nOccasion: '+occ:'')+(note?'\nNotes: '+note:'')+'\n\nPlease confirm if you have space. Thank you!';
    window.open('https://wa.me/'+PHONE+'?text='+encodeURIComponent(msg),'_blank','noopener');
  });
  $('#yr').textContent=new Date().getFullYear();
})();
