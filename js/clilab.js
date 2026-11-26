/* PacketPath · Labs de consola (sin 3D) de stack y multichasis.
   Los cables ya están conectados: aquí lo que importa es que la configuración quede bien.
   #consola            → lista
   #consola-v1 … v6    → práctica guiada (tareas y pistas)
   #consola-ciego      → a ciegas en tu fabricante (TK-5060, obligatorio antes de la certificación) */
import {VN,pn,mkDev,run,prompt,banner} from './site3d-cli.js';
import {VMIS,preCfg} from './site3d-mis.js';

const PASS=70,key=(a,b)=>[a,b].sort().join('|');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const VS={aruba:['v1','v2'],cisco:['v3','v4'],juniper:['v5','v6']};
const VNS={cisco:'Cisco',aruba:'Aruba',juniper:'Juniper'};
const CAB={utp:'UTP',fibra:'Fibra',stack:'Stack',consola:'Consola'};
const getV=()=>{try{return localStorage.getItem('pp3dv')||'cisco'}catch(e){return'cisco'}};
const setV=v=>{try{localStorage.setItem('pp3dv',v)}catch(e){}};
const P3=()=>window.PP3D||{get:()=>({}),open:()=>true,passed:()=>true,done:()=>{}};
const sfx=k=>{try{window.PPsfx&&window.PPsfx(k)}catch(e){}};
const noCon=t=>String(t).replace(/\s*\((?:mueve[^)]*)\)/gi,'').replace(/\(mueve el cable de consola\)/gi,'');
const DEVS=['CORE','CORE2','ACC1','ACC2'];
const POS={CORE:[150,46],CORE2:[410,46],ACC1:[150,196],ACC2:[410,196]};

const posOf=m=>m.pos||POS;
function devsOf(m){if(m.devs)return m.devs;const s=new Set();for(const[a,b]of m.req)for(const p of[a,b]){const d=p.split(':')[0];if(DEVS.includes(d))s.add(d)}if(m.con)s.add(m.con);return DEVS.filter(d=>s.has(d))}
function cablesOf(m){const pre=Array.isArray(m.pre)?m.pre:[];return m.req.concat(pre).filter(([a,b])=>!/^(LAP|PP):/.test(a)&&!/^(LAP|PP):/.test(b))}

/* ---------- VSF de 5 miembros en anillo (solo consola) ---------- */
const code=a=>'<pre class="s3code">'+a.join('\n')+'</pre>';
const SW5=['SW1','SW2','SW3','SW4','SW5'],has=(m,k,p)=>!!(m&&m.links[k]&&m.links[k].includes(p));
const vsfMem=(D,k)=>has(D.SW1.vsf.mem[k],1,49)&&has(D.SW1.vsf.mem[k],2,50);
const vsfJoin=(D,k)=>{const x=D['SW'+k];return has(x.vsf.mem[1],1,49)&&has(x.vsf.mem[1],2,50)&&x.vsf.renum&&x.vsf.num===k};
const vsfUp=(D,k)=>k===1?vsfMem(D,1):vsfMem(D,k)&&vsfJoin(D,k);
const V7={id:'v7',v:'aruba',z:'Zona 5 · Aruba',t:'VSF de 5 miembros en anillo',solo:true,devs:SW5,con:'SW1',
 pos:Object.fromEntries(SW5.map((d,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return[d,[Math.round(280+215*Math.cos(a)),Math.round(150+118*Math.sin(a))]]})),
 pl:(d,g)=>'1/1/'+(g==='Te0/25'?49:50),
 story:'Proyecto: el piso nuevo necesita 240 puertos. Son <b>cinco Aruba CX 6300</b> (SW1 a SW5) que deben quedar como <b>un solo switch VSF en anillo</b>. SW1 es el conductor (miembro 1) y SW2 el standby. Cada switch usa <code>1/1/49</code> como <b>link 1</b> y <code>1/1/50</code> como <b>link 2</b>; el cableado ya está hecho en anillo: el 50 de cada uno va al 49 del siguiente, y el 50 de SW5 regresa al 49 de SW1. SW2 a SW5 se unen como miembros 2 a 5. Detección de split por la red de administración.',
 req:SW5.map((d,i)=>[d+':Te0/26',SW5[(i+1)%5]+':Te0/25','fibra']),
 cfg:D=>{SW5.forEach(n=>preCfg(D[n],{host:n}))},
 goals:[{t:()=>'SW1: vsf member 1 a 5, cada uno con link 1 en N/1/49 y link 2 en N/1/50',ok:D=>[1,2,3,4,5].every(k=>vsfMem(D,k))},
  {t:()=>'SW1: vsf secondary-member 2 y vsf split-detect mgmt',ok:D=>D.SW1.vsf.sec===2&&D.SW1.vsf.split==='mgmt'},
  {t:()=>'SW1: guarda con write memory',ok:D=>D.SW1.saved&&!!D.SW1.vsf.mem[5]},
  ...[2,3,4,5].map(k=>({t:()=>`SW${k}: link 1 en 1/1/49, link 2 en 1/1/50 y vsf renumber-to ${k}`,ok:D=>vsfJoin(D,k)})),
  {t:()=>'SW1: verifica con show vsf (5 miembros, topología Ring)',ok:D=>!!D.SW1.ran.vsf&&[1,2,3,4,5].every(k=>vsfUp(D,k))&&D.SW1.vsf.sec===2}],
 show:(d,S)=>{const D=S.D;if(d.name!=='SW1'&&!d.vsf.renum)return['MAC Address          : 02:01:00:00:0'+d.name[2]+':00','Topology             : Standalone','Status               : No Split','','Mbr  Mac Address        Type    Status','---- ------------------ ------- ----------','1    0c:9d:92:a1:5'+d.name[2]+':00  JL668A  Conductor'];
  if(d.name!=='SW1')return['[tutor] Este switch ya es el miembro '+d.vsf.num+' del stack: el stack se administra desde la consola del conductor (SW1).'];
  const up=[1,2,3,4,5].map(k=>vsfUp(D,k)),n=up.filter(Boolean).length,ring=n===5,C=D.SW1;
  const L=['MAC Address          : 02:01:00:00:01:00','Secondary            : '+(C.vsf.sec||''),'Topology             : '+(ring?'Ring':n>1?'Chain':'Standalone'),'Status               : '+(ring||n<2?'No Split':'No Split'),'Split Detection Method : '+(C.vsf.split||'None'),'','Mbr  Mac Address        Type    Status','ID','---- ------------------ ------- ----------'];
  up.forEach((u,i)=>{const k=i+1;L.push(`${k}    ${u?'0c:9d:92:a1:5'+k+':00':'-                '}  JL668A  ${k===1?'Conductor':!u?'Not Present':C.vsf.sec===k?'Standby':'Member'}`)});
  const miss=up.map((u,i)=>u?0:i+1).filter(Boolean);
  if(miss.length)L.push({t:'[tutor] Faltan: '+miss.map(k=>!vsfMem(D,k)?`miembro ${k} (en SW1 declara vsf member ${k} con link 1 ${k}/1/49 y link 2 ${k}/1/50)`:`miembro ${k} (en SW${k}: link 1 1/1/49, link 2 1/1/50 y vsf renumber-to ${k})`).join('; ')+'.',c:'tut'});
  else L.push({t:'[tutor] Anillo completo: si se corta un cable, los 5 siguen juntos por el otro lado.',c:'tut'});return L},
 hints:[()=>'Dos partes. En el conductor (SW1) declaras los 5 miembros con sus dos links. Luego en cada switch nuevo declaras su propio link 1 y link 2 (todavía es "miembro 1") y lo renumeras a su número: se reinicia y se une al stack.',
  ()=>'Comandos: <code>vsf member N</code> → <code>type jl668a</code> → <code>link 1 N/1/49</code> → <code>link 2 N/1/50</code>; <code>vsf secondary-member 2</code>; <code>vsf split-detect mgmt</code>; <code>write memory</code>. En SW2…SW5: <code>vsf member 1</code>, sus links con <code>1/1/</code>, <code>end</code> y <code>vsf renumber-to N</code> (confirmas con y).',
  ()=>'<b>SW1:</b>'+code(['configure terminal',...[1,2,3,4,5].flatMap(k=>['vsf member '+k,'  type jl668a','  link 1 '+k+'/1/49','  link 2 '+k+'/1/50','  exit']),'vsf secondary-member 2','vsf split-detect mgmt','end','write memory'])+'<b>SW2</b> (y igual SW3, SW4, SW5 con su número):'+code(['configure terminal','vsf member 1','  link 1 1/1/49','  link 2 1/1/50','  end','vsf renumber-to 2','y'])+'<b>SW1:</b> <code>show vsf</code>'],
 done:'Cinco switches, una sola IP y una sola configuración: 240 puertos administrados como uno. En anillo, si se corta un enlace VSF el stack sigue unido por el otro lado; en cadena se partiría en dos.'};
const ALL=[...VMIS,V7];

/* Una "sesión" de lab: dispositivos, cables ya conectados y el entorno que leen los objetivos. */
function session(m,v){const D={};for(const n of(m.devs||DEVS))D[n]=mkDev(n,v);m.cfg&&m.cfg(D);
 const cab=m.req.concat(Array.isArray(m.pre)?m.pre:[]),set=new Set(cab.map(([a,b])=>key(a,b))),ports=new Set(cab.flatMap(([a,b])=>[a,b]));
 const env={cabled:(dev,g)=>ports.has(dev+':'+g),get devs(){return m.devs?m.devs.map(n=>D[n]):[D.CORE,D.ACC1,D.ACC2]},get D(){return D},link:(a,b)=>set.has(key(a,b)),lagPeerOk:(d,g,mm)=>mm==='active'||mm==='passive'};
 const devs=devsOf(m);
 return{m,v,D,env,devs,cur:devs.includes(m.con)?m.con:devs[0],out:Object.fromEntries(devs.map(d=>[d,[]])),hint:0,
  goals(){return(m.goals||[]).map(g=>({t:noCon(g.t(v)),ok:!!g.ok(D,env)}))}}}

function topo(S){const m=S.m,ds=S.devs,used=new Set(ds),lines=[];const cab=cablesOf(m).filter(([a,b])=>used.has(a.split(':')[0])&&used.has(b.split(':')[0]));
 const pairs={};for(const c of cab){const k=key(c[0].split(':')[0],c[1].split(':')[0]);(pairs[k]=pairs[k]||[]).push(c)}
 for(const[k,cs]of Object.entries(pairs)){const[A,B]=k.split('|');const[x1,y1]=posOf(m)[A],[x2,y2]=posOf(m)[B];cs.forEach((c,i)=>{const off=(i-(cs.length-1)/2)*17,dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L*off,ny=dx/L*off;
   const col=c[2]==='fibra'?'#f59e0b':c[2]==='stack'?'#a855f7':'#38bdf8',[a,b]=c[0].split(':')[0]===A?[c[0],c[1]]:[c[1],c[0]];
   const ex=Math.min(62/Math.max(Math.abs(dx/L),.01),20/Math.max(Math.abs(dy/L),.01))+26,PL=m.pl||((d,g)=>pn(S.v,g)),la=PL(a.split(':')[0],a.split(':')[1]),lb=PL(b.split(':')[0],b.split(':')[1]);
   lines.push(`<line x1="${x1+nx}" y1="${y1+ny}" x2="${x2+nx}" y2="${y2+ny}" stroke="${col}" stroke-width="3"${c[2]==='utp'?' stroke-dasharray="6 4"':''}/>`,
    `<text x="${x1+nx+dx/L*ex}" y="${y1+ny+dy/L*ex+4}" class="clp">${esc(la)}</text><text x="${x2+nx-dx/L*ex}" y="${y2+ny-dy/L*ex+4}" class="clp">${esc(lb)}</text>`)})}
 const nodes=ds.map(d=>{const[x,y]=posOf(m)[d];return`<g class="cln${d===S.cur?' on':''}" data-dev="${d}" tabindex="0" role="button" aria-label="Consola de ${d}"><rect x="${x-62}" y="${y-20}" width="124" height="40" rx="8"/><text x="${x}" y="${y+5}">${d}</text></g>`}).join('');
 const legend=[...new Set(cab.map(c=>c[2]))].map(t=>`<span class="cll cl-${t}">${CAB[t]}</span>`).join('');
 const ys=ds.map(d=>posOf(m)[d][1]),y0=Math.min(...ys)-40,y1=Math.max(...ys)+40;
 return`<svg viewBox="0 ${y0} 560 ${y1-y0}" class="cltopo" role="img" aria-label="Topología: ${ds.join(', ')}">${lines.join('')}${nodes}</svg><div class="cllg">${legend}<span class="small">Los cables ya están conectados. Toca un equipo para abrir su consola.</span></div>`}

export function mount(view,arg){
 if(view._clOff){view._clOff();view._clOff=null}
 if(/^v[1-7]$/.test(arg))return practice(view,ALL.find(m=>m.id===arg));
 if(arg==='ciego')return blind(view);
 return index(view)}

function head(crumb,h1,p){return`<header class="band hero"><div class="in"><p class="crumb">${crumb}</p><h1>${h1}</h1>${p?`<p>${p}</p>`:''}</div></header>`}

function index(view){const P=P3(),open0=P.open('d5c'),got=P.get(),v=getV();
 const card=m=>{const sc=got['c'+m.id],open=open0||!!(P.grant&&P.grant(m.id));return`<div class="card cli"><span class="tid">${m.z}${open?'':' · 🔒'}</span><b>${esc(m.t)}</b><span class="small">${sc!=null?(sc>=PASS?'✓ ':'✗ ')+sc+'/100':'Sin intentar'}</span><span class="clact">${open?`<a class="btnl" href="#consola-${m.id}">Abrir consola</a>${m.solo?'':`<a class="btn" href="#sitio-${m.id}">Verlo en 3D</a>`}`:'<span class="small">Se abre con 3D-5C</span>'}</span></div>`};
 view.innerHTML=head('<a href="#arena">Arena</a> / labs de consola','Labs de consola: stack y multichasis','Lo mismo que en el sitio 3D, pero sin cablear: los equipos ya están conectados y tú te concentras en la configuración. El 3D es para entender dónde va cada cable; esto es para que la configuración te salga bien a la primera.')+
 `<div class="lecw"><div class="card"><h3>Tu fabricante</h3><div class="z5v">${['cisco','aruba','juniper'].map(k=>`<button class="btn${k===v?' on':''}" data-v="${k}" aria-pressed="${k===v}">${VNS[k]}</button>`).join('')}<span class="small">El lab a ciegas (TK-5060) se hace en este fabricante.</span></div></div>
 ${['aruba','cisco','juniper'].map(vv=>`<h3 class="clh">${VNS[vv]}</h3><div class="clgrid">${[...VS[vv],...(vv==='aruba'?['v7']:[])].map(id=>card(ALL.find(m=>m.id===id))).join('')}</div>`).join('')}
 <div class="card"><h3>TK-5060 · Consola a ciegas</h3><p>Los dos labs de tu fabricante seguidos, sin pistas ni lista de tareas. Al final entregas y se califica. Mínimo ${PASS}/100. Es obligatorio antes de la certificación de la Zona 5.</p><a class="btnl" href="#consola-ciego">Ir al lab a ciegas</a></div></div>`;
 view.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{setV(b.dataset.v);index(view)})}

/* ---------- terminal compartida ---------- */
function term(view,S,onCmd){const box=view.querySelector('.clterm'),out=box.querySelector('.clout'),inp=box.querySelector('.clin'),pr=box.querySelector('.clpr'),title=box.querySelector('.cltt');
 function paint(){const d=S.D[S.cur];title.textContent=`PuTTY · COM3 · ${S.cur} · ${VN[S.v]}`;pr.textContent=prompt(d)+' ';out.innerHTML='';
  if(!d.opened){d.opened=true;S.out[S.cur].push(...banner(d))}
  for(const l of S.out[S.cur]){const e=document.createElement('div');if(typeof l==='string')e.textContent=l;else{e.textContent=l.t;e.className=l.c||''}out.appendChild(e)}
  out.scrollTop=out.scrollHeight;view.querySelectorAll('[data-tab]').forEach(t=>{t.classList.toggle('on',t.dataset.tab===S.cur);t.setAttribute('aria-selected',t.dataset.tab===S.cur)});view.querySelectorAll('.cln').forEach(n=>n.classList.toggle('on',n.dataset.dev===S.cur))}
 function to(dev){if(!S.devs.includes(dev))return;S.cur=dev;paint();inp.focus({preventScroll:true})}
 function exec(l){const d=S.D[S.cur];S.out[S.cur].push({t:prompt(d)+' '+l,c:'cmdl'});if(d.v==='cisco'&&d.mode==='exec'&&!l.trim()&&!d.started)d.started=1;if(S.m.show&&/^\s*(do\s+)?sh(ow?)?\s+vsf\b/i.test(l)&&d.mode!=='vsfm'){d.ran.vsf=1;S.out[S.cur].push(...S.m.show(d,S))}else S.out[S.cur].push(...run(d,l,S.env));if(S.out[S.cur].length>600)S.out[S.cur].splice(0,S.out[S.cur].length-600);paint();onCmd&&onCmd()}
 let hi=-1;inp.addEventListener('keydown',e=>{const d=S.D[S.cur];
  if(e.key==='Enter'){const l=inp.value;inp.value='';hi=-1;exec(l)}
  else if(e.key==='ArrowUp'){const h=d.hist;if(!h.length)return;hi=hi<0?h.length-1:Math.max(0,hi-1);inp.value=h[hi];e.preventDefault()}
  else if(e.key==='ArrowDown'){const h=d.hist;if(hi<0)return;hi=Math.min(h.length,hi+1);inp.value=h[hi]||'';e.preventDefault()}});
 out.addEventListener('click',()=>inp.focus({preventScroll:true}));
 view.querySelectorAll('[data-tab]').forEach(t=>t.addEventListener('click',()=>to(t.dataset.tab)));
 view.querySelectorAll('.cln').forEach(n=>{n.addEventListener('click',()=>to(n.dataset.dev));n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();to(n.dataset.dev)}})});
 paint();return{to,exec,paint}}

function termHTML(S){return`<div class="clterm"><div class="cltabs" role="tablist">${S.devs.map(d=>`<button role="tab" data-tab="${d}">${d}</button>`).join('')}</div><div class="cltt"></div><div class="clout" aria-live="polite"></div><label class="clrow"><span class="clpr"></span><input class="clin" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Comando"></label></div>`}

/* ---------- práctica guiada ---------- */
function practice(view,m){const P=P3();
 if(!P.open('d5c')&&!(P.grant&&P.grant(m.id))){view.innerHTML=head('<a href="#consola">Labs de consola</a>','🔒 Todavía no se abre','Los labs de consola de stack y multichasis se abren junto con el lab 3D 3D-5C de la Zona 5.')+'<div class="lecw"><div class="card"><a class="btn" href="#mapa">Ir a mi mapa</a></div></div>';return}
 const S=session(m,m.v);let won=false;
 view.innerHTML=head(`<a href="#consola">Labs de consola</a> / ${esc(m.z)}`,esc(m.t),'')+
 `<div class="lecw clw"><div class="card cls"><p class="tid">${esc(m.z)} · ${VN[m.v]} · práctica guiada</p><p>${m.story}</p>${topo(S)}</div>
  <div class="card clk"><h3>Tareas</h3><ul class="s3tl" id="clgoals"></ul><div id="clhints"></div><div id="clres"></div></div>
  <div class="clmain">${termHTML(S)}<p class="small">Tip: <kbd>↑</kbd> repite comandos, <code>?</code> muestra ayuda. ${m.solo?'':`<a href="#sitio-${m.id}">Ver esta misión en 3D</a>`}</p></div></div>`;
 const T=term(view,S,()=>check());
 function score(){return Math.max(0,100-(S.hint>=2?15:0)-(S.hint>=3?25:0))}
 function check(){const gs=S.goals(),all=gs.every(g=>g.ok);
  view.querySelector('#clgoals').innerHTML=gs.map(g=>`<li class="${g.ok?'ok':''}">${g.ok?'✓':'○'} ⌨️ ${esc(g.t)}</li>`).join('');
  view.querySelector('#clhints').innerHTML=`<div class="s3h">${m.hints.map((h,i)=>i<S.hint?`<div><b>Pista ${i+1}:</b> ${h(S.v)}</div>`:'').join('')}${S.hint<3&&!all?`<button class="btnl" id="clhint">Ver pista ${S.hint+1} de 3</button><span class="small"> La 1 es gratis; la 2 resta 15 y la 3, 25.</span>`:''}</div>`;
  const hb=view.querySelector('#clhint');if(hb)hb.onclick=()=>{S.hint++;check()};
  if(all&&!won){won=true;const sc=score();P.done('c'+m.id,sc);sfx(sc>=PASS?'win':'bad');
   const i=ALL.indexOf(m),nx=ALL[i+1];
   view.querySelector('#clres').innerHTML=`<div class="s3win${sc>=PASS?'':' s3fail'}"><b>${sc>=PASS?'¡Configuración correcta!':'Terminado, pero con muchas pistas'}</b><span>Calificación: <b>${sc}/100</b> · mínimo ${PASS}</span><p>${m.done}</p>${nx?`<a class="btnl" href="#consola-${nx.id}">Siguiente: ${esc(nx.t)}</a>`:''}<a class="btn" href="#consola-ciego">Ir al lab a ciegas</a></div>`;
   S.out[S.cur].push({t:`[tutor] ✔ Todo configurado: ${sc}/100. `+m.done.replace(/<[^>]+>/g,''),c:'win'});T.paint()}}
 check()}

/* ---------- a ciegas ---------- */
function blind(view){const P=P3(),v=getV(),k5=P.get().k5;
 view.innerHTML=head('<a href="#consola">Labs de consola</a> / TK-5060','Consola a ciegas: stack y multichasis','Dos labs seguidos en tu fabricante, sin pistas ni lista de tareas. Lee el ticket, configura los equipos y entrega. Se califica al final.')+
 `<div class="lecw"><div class="card"><h3>Elige tu fabricante</h3><div class="z5v">${['cisco','aruba','juniper'].map(k=>`<button class="btn${k===v?' on':''}" data-v="${k}" aria-pressed="${k===v}">${VNS[k]}</button>`).join('')}</div>
 <ul class="clsum">${VS[v].map(id=>{const m=VMIS.find(x=>x.id===id);return`<li><b>${esc(m.t)}</b></li>`}).join('')}</ul>
 <p class="small">Mínimo para aprobar: ${PASS}/100. Cada tarea vale lo mismo. ${k5!=null?`Tu mejor calificación: <b>${k5}/100</b>.`:''} ¿Quieres practicar antes? <a href="#consola-${VS[v][0]}">Práctica guiada de ${VNS[v]}</a>.</p>
 <button class="btnl" id="clgo">Empezar</button></div></div>`;
 view.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{setV(b.dataset.v);blind(view)});
 view.querySelector('#clgo').onclick=()=>runBlind(view,v)}

function runBlind(view,v){const P=P3(),ms=VS[v].map(id=>VMIS.find(m=>m.id===id)),SS=ms.map(m=>session(m,v)),t0=Date.now();let k=0,T=null,tm=null;
 function part(i){k=i;const S=SS[i],m=S.m;
  view.innerHTML=head(`<a href="#consola">Labs de consola</a> / TK-5060 · ${VNS[v]}`,`Parte ${i+1} de 2 · ${esc(m.t)}`,'')+
  `<div class="lecw clw"><div class="card cls"><p class="tid">Ticket · ${VN[v]} · sin pistas</p><p>${m.story}</p>${topo(S)}<p class="small">Todo lo que necesitas está en el ticket. Verifica con los comandos <code>show</code> antes de entregar.</p></div>
   <div class="card clbar clk"><span id="cltm">⏱ 0:00</span><div class="clparts">${ms.map((x,j)=>`<button class="btnl${j===i?' on':''}" data-part="${j}">Parte ${j+1}</button>`).join('')}</div><button class="btnl" id="clsend">Entregar los dos</button></div>
  <div class="clmain">${termHTML(S)}</div></div>`;
  T=term(view,S);
  view.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>part(+b.dataset.part));
  view.querySelector('#clsend').onclick=()=>{if(confirm('¿Entregar? Se califican las dos partes tal como están.'))grade()};tick()}
 function tick(){const e=view.querySelector('#cltm');if(!e){clearInterval(tm);return}const s=Math.floor((Date.now()-t0)/1000);e.textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
 tm=setInterval(tick,1000);view._clOff=()=>clearInterval(tm);
 function grade(){clearInterval(tm);const res=SS.map(S=>({m:S.m,gs:S.goals()})),all=res.flatMap(r=>r.gs),ok=all.filter(g=>g.ok).length,sc=Math.round(100*ok/all.length),pass=sc>=PASS;
  P.done('k5',sc);sfx(pass?'win':'bad');
  view.innerHTML=head(`<a href="#consola">Labs de consola</a> / TK-5060 · ${VNS[v]}`,pass?'¡Aprobado!':'Todavía no','')+
  `<div class="lecw"><div class="card"><div class="s3win${pass?'':' s3fail'}"><b>Calificación: ${sc}/100</b><span>${ok} de ${all.length} tareas correctas · mínimo ${PASS}</span></div>
  ${res.map(r=>`<h3>${esc(r.m.t)}</h3><ul class="s3tl">${r.gs.map(g=>`<li class="${g.ok?'ok':'bad'}">${g.ok?'✓':'✗'} ${esc(g.t)}</li>`).join('')}</ul>`).join('')}
  <p>${pass?'Tu configuración de stack y multichasis quedó bien. Ya puedes ir a la certificación de la Zona 5.':'Revisa las tareas en ✗, practica con la versión guiada y vuelve a intentarlo.'}</p>
  <div class="cta">${pass?'<a class="btnl" href="#examen-5">Ir a la certificación</a>':''}<a class="btn" href="#consola-ciego">Intentar otra vez</a>${ms.map(m=>`<a class="btn" href="#consola-${m.id}">Práctica: ${esc(m.t)}</a>`).join('')}</div></div></div>`}
 part(0)}

/* gancho para pruebas */
window.__cl={VMIS,ALL,session};
