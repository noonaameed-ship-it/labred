/* PacketPath · Sitio 3D: cuarto de telecomunicaciones con racks, puertos y cables que el alumno conecta. */
import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {VN,pn,mkDev,IF,run,prompt,banner,prioOf,G,SN,VSF,vsxState,svlFormed,stackRing,vcState,iccpUp,mcPairs} from './site3d-cli.js';
import {initRPG} from './site3d-rpg.js';

const COL={utp:0x2f7bf2,fibra:0xf59e0b,consola:0x7dd3fc,stack:0x7c3aed,horiz:0x6b7280};
const CABLE={utp:'UTP (cobre)',fibra:'Fibra',consola:'Consola',stack:'Stack'};
const KIND={rj45:'puerto RJ45 de cobre',sfp:'puerto SFP para fibra',con:'puerto de consola',usb:'puerto USB',pp:'puerto del patch panel',stk:'puerto de stack (StackWise; en el equipo real va atrás)'};
const DESK={'01':'D-01 · PC-VEN1','02':'D-02 · PC-RRH1','03':'D-03 · PC-VEN2','04':'D-04 · PC-RRH2'};
const pad=n=>String(n).padStart(2,'0');
const key=(a,b)=>[a,b].sort().join('|');

/* ---------- misiones ---------- */
import {MIS,CASES,ticketPre,FULL1,FULL2,FULL4,preCfg,VMIS} from './site3d-mis.js';

/* ---------- progreso ---------- */
const prog={get(){try{if(window.PP3D)return window.PP3D.get();return JSON.parse(localStorage.getItem('pp3d')||'{}')}catch(e){return{}}},
 set(id,stars){try{if(/^v/.test(id)){const p=this.get();p[id]=Math.max(p[id]||0,stars);if(window.PP3D)window.PP3D.done(id,stars);else localStorage.setItem('pp3d',JSON.stringify(p));const pr=[['v1','v2'],['v3','v4'],['v5','v6']].map(x=>Math.min(p[x[0]]||0,p[x[1]]||0));const best=Math.max(...pr);if(best>=70&&window.PP3D)window.PP3D.done('d5c',best);return}if(window.PP3D)return window.PP3D.done(id,stars);const p=this.get();p[id]=Math.max(p[id]||0,stars);localStorage.setItem('pp3d',JSON.stringify(p))}catch(e){}}};

let S=null;
const UNL={t1:'d0b',c1:'d3b',c2:'d5b',c3:'d3b'};
const isOpen=id=>{try{if(!window.PP3D)return true;if(/^d/.test(id))return window.PP3D.open(id);if(/^v/.test(id))return window.PP3D.open('d5c');return!UNL[id]||window.PP3D.passed(UNL[id])}catch(e){return true}};
const lockTxt=id=>/^v/.test(id)?'Se abre al llegar al ticket 3D-5C de la Zona 5':/^d/.test(id)?'Se abre cuando llegues a este ticket en tu mapa':'Se abre al aprobar '+(UNL[id]||'').replace(/^d(\d)(.)/,(m,z,l)=>'el Lab 3D-'+z+l.toUpperCase());
const PASS3=70;const scoreStars=sc=>sc>=90?3:sc>=80?2:sc>=70?1:0;
function badge(id,v){if(!v)return'';if(/^[dv]/.test(id)){const st=scoreStars(v);return st?'★'.repeat(st)+'☆'.repeat(3-st)+' '+v:'✗ '+v}return'★'.repeat(v)+'☆'.repeat(3-v)}
const getV=()=>{try{return localStorage.getItem('pp3dv')||'cisco'}catch(e){return'cisco'}};
export function unmount(){if(!S)return;(S.cleanup||[]).forEach(f=>{try{f()}catch(e){}});S.alive=false;cancelAnimationFrame(S.raf);S.ro&&S.ro.disconnect();S.renderer&&S.renderer.dispose();S=null}

export function mount(view,start){
 unmount();
 const done=prog.get();
 view.innerHTML=`<header class="band hero"><div class="in"><p class="crumb"><a href="#mapa">Mi red</a> / <a href="#arena">arena</a> / sitio 3D</p><h1>Labs 3D: el cuarto de telecom</h1><p>Un lab por zona. Llevas los cables (patch cords, fibra y consola) y configuras el switch por consola en Cisco, Aruba o Juniper. Gira con un dedo, acerca con dos y toca un equipo para verlo de cerca.</p></div></header>
 <div class="s3w"><div class="s3main"><div class="s3stage" id="s3stage"><canvas id="s3c" aria-label="Cuarto de telecomunicaciones en 3D"></canvas><div class="s3lbl" id="s3lbl"></div>
  <div class="s3bar s3top"><div class="s3seg" role="group" aria-label="Tipo de cable">${Object.entries(CABLE).map(([k,t])=>`<button data-cab="${k}" class="${k==='utp'?'on':''}"${k==='stack'?' hidden':''}><i style="background:#${COL[k].toString(16).padStart(6,'0')}"></i>${t}</button>`).join('')}</div>
  <div class="s3seg" role="group" aria-label="Vista"><button data-cam="all">Cuarto</button><button data-cam="mdf">MDF</button><button data-cam="idf">IDF</button><button data-cam="desk">Escritorios</button><button id="s3tidy" class="on" title="Peinar o desordenar los cables">🧹 Peinados</button></div></div>
  <div class="s3next" id="s3next"></div><button class="s3q" id="s3q" aria-label="Cómo se juega">?</button>
  <div class="s3help" id="s3help" hidden><div><h3>Cómo se juega</h3><ol><li><b>Lee la misión</b> (a la derecha o abajo): te dice qué cables poner y qué configurar.</li><li><b>Elige el tipo de cable</b> arriba: UTP (cobre), Fibra o Consola.</li><li><b>Toca el puerto de origen</b> (el que <span class="s3pulse">parpadea</span>) y luego el de destino. También puedes arrastrar.</li><li><b>Conecta la consola</b>: cable de consola del USB de la laptop al puerto CON azul del switch. Se abre la terminal.</li><li><b>Configura</b> con comandos reales. Si te atoras, abre 💡 Pistas.</li></ol><p class="small">Gira con un dedo o el mouse, acerca con dos dedos o la rueda. Los botones Cuarto, MDF, IDF y Escritorios te llevan a cada lugar.</p><button class="btn" id="s3hok">¡Entendido!</button></div></div>
  <div class="s3bar s3bot"><p id="s3msg">Elige el tipo de cable y toca un puerto para tomar el cable. Luego toca (o arrastra hasta) el otro puerto.</p><button class="btnl" id="s3del" hidden>Quitar cable</button><button class="btnl" id="s3cancel" hidden>Soltar cable</button><button class="btn" id="s3open" hidden>Abrir consola</button></div>
  <div class="s3con" id="s3con" hidden><div class="s3ch"><span id="s3ct">PuTTY</span><button id="s3tk" class="btnl">Tareas</button><button id="s3hb" class="btnl">💡 Pistas</button><button id="s3x" class="btnl">Volver al cuarto</button></div><div class="s3cb"><div class="s3term"><div class="s3out" id="s3out"></div><label class="s3in"><span id="s3pr"></span><input id="s3cmd" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Comando"></label></div><div class="s3hp" id="s3hp" hidden></div><div class="s3hp" id="s3tp" hidden></div></div></div></div></div>
 <aside class="s3side"><div class="card"><p class="tid">Fabricante de los switches</p><div class="s3seg s3ven">${Object.entries(VN).map(([k,t])=>`<button data-ven="${k}" class="${k===getV()?'on':''}">${t.split(' ')[0]}</button>`).join('')}</div><p class="tid" style="margin-top:12px">Misiones</p><div class="s3mis" id="s3mis">${MIS.map((m,i)=>isOpen(m.id)?`<button data-m="${i}"><span>${m.z}</span>${m.t}<em>${badge(m.id,done[m.id])}</em></button>`:`<button class="lk" disabled title="${lockTxt(m.id)}"><span>${m.z} · 🔒</span>${m.t}<em class="small">${lockTxt(m.id)}</em></button>`).join('')}</div></div>
 <div class="card"><p class="tid">Casos de cliente · modo libre</p><div class="s3mis">${CASES.map((c,i)=>isOpen(c.id)?`<button data-case="${i}"><span>${c.site}</span>${c.t}<em>${done[c.id]?(done[c.id]>=70?'✓ ':'✗ ')+done[c.id]:''}</em></button>`:`<button class="lk" disabled><span>${c.site} · 🔒</span>${c.t}<em class="small">${lockTxt(c.id)}</em></button>`).join('')}</div></div><div class="card" id="s3task"></div></aside></div>`;
 const stage=view.querySelector('#s3stage'),canvas=view.querySelector('#s3c'),msg=view.querySelector('#s3msg');
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false})}catch(e){stage.innerHTML='<p style="padding:20px">Tu navegador no tiene WebGL activado, así que no puede mostrar el sitio 3D. Prueba con Chrome, Edge o Safari actualizados.</p>';return}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const dark=matchMedia('(prefers-color-scheme: dark)').matches&&document.documentElement.dataset.theme!=='light'||document.documentElement.dataset.theme==='dark';
 const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x1f2b2a:0xdfe7e5);
 const cam=new THREE.PerspectiveCamera(45,1,0.05,60);
 const ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI*0.47;ctl.minPolarAngle=Math.PI*0.12;ctl.minAzimuthAngle=-.9;ctl.maxAzimuthAngle=.9;ctl.minDistance=0.35;ctl.maxDistance=6.5;ctl.screenSpacePanning=true;ctl.target.set(0.4,1.3,0);
 const hemi=new THREE.HemisphereLight(0xffffff,dark?0x1a2624:0x8a9a96,dark?1.6:1.9);scene.add(hemi);hemi.intensity*=1.25;
 const dl=new THREE.DirectionalLight(0xffffff,dark?1.9:1.7);dl.position.set(2,4,5);scene.add(dl);const fl2=new THREE.PointLight(0xbfeee6,dark?6:4,6,1.5);fl2.position.set(0,2.3,1.6);scene.add(fl2);
 S={alive:true,renderer,scene,cam,ctl,ports:{},cables:[],cab:'utp',carry:null,sel:null,mis:null,hint:0,anim:null,labels:[]};
 const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.15,...o});
 const box=(w,h,d,m,x,y,z,par)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(par||scene).add(b);return b};
 // cuarto
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(14,10),mat(dark?0x4a5654:0xc9d3d1,{roughness:.95}));fl.rotation.x=-Math.PI/2;scene.add(fl);
 const grid=new THREE.GridHelper(14,28,dark?0x5e6b69:0xaab6b3,dark?0x55625f:0xbfc9c6);grid.position.y=.002;scene.add(grid);
 box(14,4,.1,mat(dark?0x5a6866:0xe9efed),0,2,-1.2);box(.1,4,10,mat(dark?0x546260:0xe3eae8),-3.2,2,0);
 // escalerilla aérea y organizadores verticales
 {const m=mat(0x8a949b,{metalness:.6,roughness:.4});for(const z of[.22,.56])box(3.2,.025,.025,m,0,2.72,z);for(let x=-1.5;x<=1.51;x+=.25)box(.02,.02,.36,m,x,2.72,.39);
  for(const x of[-1.43,-.07,.07,1.43]){box(.1,2.4,.1,mat(0x1a1d20,{metalness:.3}),x,1.32,.47);for(let y=.25;y<2.5;y+=.1)box(.12,.012,.02,mat(0x2c3136),x,y,.53)}}
 const tray=box(4.4,.06,.35,mat(0x3f4a48,{metalness:.6}),1,2.75,-.75);
 // rack
 function rack(x,name){const g=new THREE.Group();g.position.set(x,0,0);scene.add(g);const m=mat(0x1b1f22,{metalness:.5,roughness:.5});
  for(const sx of[-.6,.6])for(const sz of[-.4,.4])box(.06,2.6,.06,m,sx,1.3,sz,g);
  box(1.26,.06,.86,m,0,2.6,0,g);box(1.26,.08,.86,m,0,.04,0,g);
  for(const sx of[-.56,.56])box(.03,2.4,.03,mat(0x9aa4ae,{metalness:.7}),sx,1.3,.38,g);
  S.labels.push({el:lbl(name,'rk'),p:new THREE.Vector3(x,2.75,.4)});return g}
 const lblBox=view.querySelector('#s3lbl');
 function lbl(t,c){const d=document.createElement('span');d.className='s3l '+(c||'');d.textContent=t;lblBox.appendChild(d);return d}
 const pickables=[],devs={};
 function port(dev,id,kind,x,y,par,label){const w=kind==='sfp'?.05:kind==='pp'?.034:.036,h=kind==='sfp'?.032:.028;
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.012),mat(kind==='sfp'?0x8b949b:kind==='con'?0x2563eb:kind==='usb'?0x334155:kind==='stk'?0x6d28d9:0x0d1114,{metalness:kind==='sfp'?.6:.1}));
  m.position.set(x,y,0);par.add(m);
  const led=new THREE.Mesh(new THREE.BoxGeometry(.01,.006,.004),new THREE.MeshBasicMaterial({color:0x223}));led.position.set(x-w*.3,y+(h/2+.007)*(y>=0?1:-1),.004);if(kind!=='pp'&&kind!=='usb')par.add(led);
  const P={id:dev+':'+id,dev,name:id,kind,mesh:m,led,label:label||id};m.userData.port=P;S.ports[P.id]=P;pickables.push(m);return P}
 function sw(name,par,y){const g=new THREE.Group();g.position.set(0,y,.42);par.add(g);
  const body=box(1.06,.09,.6,mat(/^CORE/.test(name)?0x23384a:0x24323a,{metalness:.4}),0,0,-.31,g);body.userData.dev=name;pickables.push(body);
  box(1.06,.09,.006,mat(/^CORE/.test(name)?0x2d4a63:0x30434d),0,0,0,g);
  for(let n=1;n<=24;n++){const col=(n-1)>>1,row=(n-1)%2;port(name,'Gi0/'+n,'rj45',-.36+col*.042+Math.floor(col/6)*.018,row?-.02:.021,g)}
  for(let n=1;n<=4;n++)port(name,'Te0/'+n,'sfp',.25+((n-1)>>1)*.062,(n-1)%2?-.02:.021,g);
  port(name,'CON','con',-.47,.0,g);
  if(/^ACC/.test(name)){port(name,'STK1','stk',.43,.0,g);port(name,'STK2','stk',.48,.0,g)}
  const nm=lbl(name,'dv');S.labels.push({el:nm,p:null,obj:g,off:new THREE.Vector3(-.42,.085,0)});devs[name]=g;return g}
 const mdf=rack(-.75,'MDF'),idf=rack(.75,'IDF');
 sw('CORE',mdf,1.62);sw('CORE2',mdf,1.50);
 box(1.06,.07,.2,mat(0x15181a),0,1.40,.33,mdf);box(1.06,.09,.5,mat(0x2a2f33),0,1.30,.15,mdf);box(1.06,.18,.55,mat(0x202426),0,.3,.12,mdf);// firewall y UPS de adorno
 S.labels.push({el:lbl('Firewall','dc'),p:new THREE.Vector3(-1.37,1.30,.42)},{el:lbl('UPS','dc'),p:new THREE.Vector3(-1.37,.3,.42)});
 {const g=new THREE.Group();g.position.set(0,1.86,.42);idf.add(g);const b=box(1.06,.09,.12,mat(0x2b2f33,{metalness:.4}),0,0,-.06,g);b.userData.dev='PP';pickables.push(b);
  for(let n=1;n<=24;n++){const P=port('PP',pad(n),'pp',-.42+(n-1)*.036+Math.floor((n-1)/6)*.012,0,g,'Puerto '+pad(n)+(DESK[pad(n)]?' → escritorio '+DESK[pad(n)]:''))}
  S.labels.push({el:lbl('Patch panel','dv'),p:null,obj:g,off:new THREE.Vector3(-.42,.085,0)});devs.PP=g}
 for(const y of[1.745,1.395]){box(1.06,.07,.2,mat(0x15181a),0,y,.33,idf);for(let x=-.48;x<=.49;x+=.06)box(.012,.07,.03,mat(0x2c3136),x,y,.45,idf)}box(1.06,.07,.2,mat(0x15181a),0,1.72,.33,mdf);for(let x=-.48;x<=.49;x+=.06)box(.012,.07,.03,mat(0x2c3136),x,1.72,.45,mdf);// organizadores horizontales
 sw('ACC1',idf,1.62);sw('ACC2',idf,1.48);
 // escritorios
 const desk=new THREE.Group();desk.position.set(3.1,0,.6);desk.rotation.y=-.55;scene.add(desk);
 box(2.2,.05,.8,mat(dark?0x3b3227:0xb08d62),0,.78,0,desk);for(const sx of[-1.05,1.05])box(.05,.78,.7,mat(0x2a2a2a),sx,.39,0,desk);
 box(2.2,.5,.04,mat(dark?0x1c2726:0xd5ddda),0,1.05,-.42,desk);
 ['01','02','03','04'].forEach((d,i)=>{const x=-.8+i*.53;box(.36,.24,.02,mat(0x111),x,1.1,-.1,desk);const sc=box(.33,.2,.005,new THREE.MeshBasicMaterial({color:0x0f766e}),x,1.1,-.088,desk);sc.userData.dev='DESK';
  box(.1,.03,.08,mat(0x222),x,.82,-.1,desk);box(.06,.06,.06,mat(0x555),x+.2,.85,.05,desk);
  box(.08,.08,.01,mat(0xf1f5f9),x,1.25,-.395,desk);
  S.labels.push({el:lbl('D-'+d,'dk'),p:null,obj:sc,off:new THREE.Vector3(0,.18,0)})});
 // carrito con laptop
 const cart=new THREE.Group();cart.position.set(-.3,0,2.0);scene.add(cart);
 box(.6,.04,.45,mat(0x4b5563,{metalness:.5}),0,.8,0,cart);box(.04,.8,.04,mat(0x4b5563),0,.4,0,cart);
 box(.36,.02,.25,mat(0x1f2937),0,.83,0,cart);const scr=box(.36,.22,.015,mat(0x1f2937),0,.94,-.12,cart);scr.rotation.x=-.25;
 const scrIn=box(.33,.19,.004,new THREE.MeshBasicMaterial({color:0x022c22}),0,.94,-.111,cart);scrIn.rotation.x=-.25;
 {const g=new THREE.Group();g.position.set(.19,.835,.02);g.rotation.y=Math.PI/2;cart.add(g);port('LAP','USB','usb',0,0,g,'USB de la laptop')}
 S.labels.push({el:lbl('Laptop de consola','dv'),p:new THREE.Vector3(-.3,1.2,2.0)});devs.LAP=cart;
 // cableado horizontal fijo: escritorios → bandeja → patch panel (por atrás)
 {const m=new THREE.MeshStandardMaterial({color:COL.horiz,roughness:.8});
  ['01','02','03','04'].forEach((d,i)=>{const wp=new THREE.Vector3(-.8+i*.53,1.25,-.39);desk.localToWorld(wp);
   const pts=[wp,new THREE.Vector3(wp.x,2.78,wp.z-.3),new THREE.Vector3(1.6,2.78,-.75+i*.03),new THREE.Vector3(.75+(-.42+i*.036),2.78,-.6),new THREE.Vector3(.75+(-.42+i*.036),1.86,.25)];
   scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.008,6),m))})}
 // ---------- cámara ----------
 const VIEWS={all:[[1.6,2.1,4.1],[.5,1.3,.3]],mdf:[[-.75,1.75,1.25],[-.75,1.6,.4]],idf:[[.75,1.8,1.35],[.75,1.65,.4]],desk:[[2.1,1.6,2.6],[3.1,1,.6]]};
 function fly(pos,tgt){S.anim={t0:performance.now(),p0:cam.position.clone(),t0v:ctl.target.clone(),p1:new THREE.Vector3(...pos),t1:new THREE.Vector3(...tgt)}}
 function focusDev(name){const g=devs[name];if(!g)return;const w=new THREE.Vector3();g.getWorldPosition(w);if(name==='LAP')fly([w.x+.5,w.y+1.2,w.z+.9],[w.x,w.y+.85,w.z]);else{const d=Math.max(.75,Math.min(2.2,.6/(Math.tan(Math.PI/8)*cam.aspect)));fly([w.x+.05,w.y+.08+d*.12,w.z+d],[w.x,w.y,w.z])}}
 cam.position.set(...VIEWS.all[0]);ctl.target.set(...VIEWS.all[1]);
 view.querySelector('#s3tidy').addEventListener('click',e=>{S.tidy=!S.tidy;e.currentTarget.classList.toggle('on',S.tidy);e.currentTarget.textContent=S.tidy?'🧹 Peinados':'🍝 Sin peinar';rebuildCables();say(S.tidy?'Cables peinados: salen al organizador horizontal, bajan por el organizador vertical y entre racks suben a la escalerilla. Así se ve un cuarto profesional y se encuentra cada cable en segundos.':'Así se ve un cuarto sin peinar: cables colgando frente a los equipos, imposibles de seguir y fáciles de jalar por accidente. Compáralo y vuelve a peinarlos.')});
 view.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>{const v=VIEWS[b.dataset.cam];fly(v[0],v[1])}));
 view.querySelectorAll('[data-cab]').forEach(b=>b.addEventListener('click',()=>{S.cab=b.dataset.cab;view.querySelectorAll('[data-cab]').forEach(x=>x.classList.toggle('on',x===b));if(S.carry){say(`Cambiaste a cable ${CABLE[S.cab]}. Vuelve a tomarlo del puerto.`);drop()}}));
 // ---------- cables ----------
 const pw=p=>{const v=new THREE.Vector3();p.mesh.getWorldPosition(v);return v};
 const out=p=>{const q=new THREE.Quaternion();p.mesh.getWorldQuaternion(q);return new THREE.Vector3(0,0,1).applyQuaternion(q)};
 function curve(a,da,b,db){const a1=a.clone().addScaledVector(da,.14),b1=b?b.clone().addScaledVector(db,.14):null;
  if(!b){return new THREE.CatmullRomCurve3([a,a1,a1.clone().lerp(a1,.5)])}
  const h=Math.hypot(a.x-b.x,a.z-b.z)+Math.abs(a.y-b.y)*.3,my=Math.max(.04,Math.min(a.y,b.y)-.06-.22*h);
  const m=a1.clone().lerp(b1,.5);m.y=my;m.z=Math.max(m.z,Math.max(a1.z,b1.z));return new THREE.CatmullRomCurve3([a,a1,m,b1,b],false,'centripetal')}
 const RX={CORE:-.75,CORE2:-.75,PP:.75,ACC1:.75,ACC2:.75},MG={CORE:1.72,CORE2:1.40,PP:1.745,ACC1:1.745,ACC2:1.395};S.tidy=true;
 function fillet(P){const r=[P[0]];for(let i=1;i<P.length-1;i++){const a=P[i-1],b=P[i],c=P[i+1],d1=b.clone().sub(a),d2=c.clone().sub(b),l1=d1.length(),l2=d2.length();if(l1<1e-4||l2<1e-4){r.push(b);continue}const k=Math.min(.035,l1/2.2,l2/2.2);r.push(b.clone().addScaledVector(d1,-k/l1),b.clone().addScaledVector(d2,k/l2))}r.push(P[P.length-1]);return new THREE.CatmullRomCurve3(r,false,'centripetal')}
 function tidyCurve(A,B,idx){const V=(x,y,z)=>new THREE.Vector3(x,y,z),o=((idx%7)-3)*.006;let a=pw(A),b=pw(B);
  const ra=RX[A.dev],rb=RX[B.dev];if(ra==null&&rb==null)return null;if(ra==null)return tidyCurve(B,A,idx);
  const zf=.5+o,a1=a.clone().addScaledVector(out(A),.05),ma=MG[A.dev]+o*.6,P=[a,a1,V(a.x,ma,zf)];
  if(rb!=null&&ra===rb){const mb=MG[B.dev]+o*.6,b1=b.clone().addScaledVector(out(B),.05);if(Math.abs(ma-mb)<.01)P.push(V(b.x,ma,zf));else{const side=(a.x+b.x)/2>ra?ra+.68:ra-.68;P.push(V(side,ma,zf),V(side,mb,zf),V(b.x,mb,zf))}P.push(V(b.x,mb,zf),b1,b)}
  else if(rb!=null){const sa=rb>ra?ra+.68:ra-.68,sb=rb>ra?rb-.68:rb+.68,mb=MG[B.dev]+o*.6,b1=b.clone().addScaledVector(out(B),.05),top=2.72+o*.5,zt=.39+o;P.push(V(sa,ma,zf),V(sa,top,zt),V(sb,top,zt),V(sb,mb,zf),V(b.x,mb,zf),b1,b)}
  else{const b1=b.clone().addScaledVector(out(B),.08),sa=b.x>ra?ra+.68:ra-.68;P.push(V(sa,ma,zf),V(sa,.04,zf),V(sa,.04,b1.z),V(b1.x,.04,b1.z),b1,b)}
  return fillet(P)}
 function cableCurve(A,B,idx){return(S.tidy&&tidyCurve(A,B,idx))||curve(pw(A),out(A),pw(B),out(B))}
 function rebuildCables(){S.cables.forEach((c,i)=>{scene.remove(c.mesh);c.mesh.geometry.dispose();const m=tube(cableCurve(S.ports[c.a],S.ports[c.b],i),c.type);m.userData.cable=c;c.mesh=m;scene.add(m)})}
 function tube(c,type,r){return new THREE.Mesh(new THREE.TubeGeometry(c,120,r||(type==='fibra'?.007:.009),8),new THREE.MeshStandardMaterial({color:COL[type],roughness:.55,emissive:COL[type],emissiveIntensity:.08}))}
 function addCable(a,b,type){const A=S.ports[a],B=S.ports[b];const m=tube(cableCurve(A,B,S.cables.length),type);scene.add(m);const c={a,b,type,mesh:m};m.userData.cable=c;S.cables.push(c);A.cable=c;B.cable=c;
  for(const P of[A,B]){const pl=new THREE.Mesh(new THREE.BoxGeometry(P.kind==='sfp'?.04:.03,P.kind==='sfp'?.024:.022,.04),new THREE.MeshStandardMaterial({color:type==='fibra'?0x1d4ed8:type==='consola'?0x7dd3fc:0x93c5fd,transparent:type==='utp',opacity:.85}));pl.position.copy(P.mesh.position);pl.position.z+=.022;P.mesh.parent.add(pl);(c.plugs=c.plugs||[]).push(pl)}
  leds();return c}
 function rmCable(c){scene.remove(c.mesh);c.mesh.geometry.dispose();(c.plugs||[]).forEach(p=>p.parent.remove(p));S.ports[c.a].cable=null;S.ports[c.b].cable=null;S.cables=S.cables.filter(x=>x!==c);leds()}
 function leds(){for(const P of Object.values(S.ports))P.led.material.color.setHex(P.cable?0x22c55e:0x1b2027)}
 // ---------- reglas ----------
 function why(A,B,t){const ks=[A.kind,B.kind].sort().join('+');
  if(A===B)return'Es el mismo puerto.';
  if(A.dev===B.dev&&A.dev!=='PP')return'Conectar un switch consigo mismo crea un bucle. Elige un puerto de otro equipo.';
  if(/stk/.test(ks)){if(ks!=='stk+stk')return'Los puertos de stack solo se unen con otros puertos de stack, con el cable StackWise.';if(t!=='stack')return'Para unir puertos de stack se usa el cable de stack (morado).';return''}
  if(ks==='pp+pp')return'Dos puertos del patch panel no se conectan entre sí: el patch cord va del patch panel al switch.';
  if(/con|usb/.test(ks)){if(ks!=='con+usb')return A.kind==='usb'||B.kind==='usb'?'La laptop se conecta al puerto CON de un switch, con cable de consola.':'El puerto CON es de administración: va a la laptop con cable de consola, no a la red.';if(t!=='consola')return'Para consola se usa el cable de consola (celeste), no '+CABLE[t]+'.';return''}
  if(ks==='sfp+sfp')return t==='fibra'?'':'Los puertos SFP llevan un transceptor y fibra óptica. Cambia el cable a Fibra.';
  if(/sfp/.test(ks))return'Un puerto SFP de fibra no se conecta con un puerto RJ45 de cobre. Une SFP con SFP (fibra) o RJ45 con RJ45 (UTP).';
  return t==='utp'?'':'Los puertos RJ45 y el patch panel son de cobre: usa cable UTP.'}
 function startOk(P,t){if(P.kind==='stk'&&t!=='stack')return'Ese es un '+KIND.stk+'. Elige el cable Stack primero.';if(P.kind!=='stk'&&t==='stack')return'El cable de stack solo va en los puertos STK de los switches.';if(P.kind==='sfp'&&t!=='fibra')return'Ese es un '+KIND.sfp+'. Elige el cable de Fibra primero.';if((P.kind==='rj45'||P.kind==='pp')&&t!=='utp')return'Ese es un '+KIND[P.kind]+'. Elige el cable UTP primero.';if((P.kind==='con'||P.kind==='usb')&&t!=='consola')return'Ese es un '+KIND[P.kind]+'. Elige el cable de Consola primero.';return''}
 const pname=P=>(P.dev==='PP'?'Patch panel '+P.name:P.dev==='LAP'?'Laptop USB':P.kind==='con'?P.dev+' consola (CON)':P.dev+' '+pn(S.V,P.name));
 const say=(t,k)=>{msg.textContent=t;msg.className=k||''};
 // ---------- interacción ----------
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let down=null;
 function hit(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
  const objs=pickables.concat(S.cables.map(c=>c.mesh));const h=ray.intersectObjects(objs,false)[0];if(h&&h.object.userData.port)return h.object;
  let best=null,bd=e.pointerType==='touch'?26:14;const v=new THREE.Vector3();for(const P of Object.values(S.ports)){P.mesh.getWorldPosition(v);if(v.distanceTo(cam.position)>4.5)continue;v.project(cam);if(v.z>1)continue;const dx=(v.x+1)/2*r.width-(e.clientX-r.left),dy=(1-v.y)/2*r.height-(e.clientY-r.top),dd=Math.hypot(dx,dy);if(dd<bd){bd=dd;best=P.mesh}}
  if(best&&!(h&&h.object.userData.cable&&bd>8))return best;return h?h.object:null}
 function grab(P){const err=startOk(P,S.cab);if(err){S.wrong=(S.wrong||0)+1;say(err,'bad');sfx('bad');return}
  if(P.cable){selCable(P.cable);return}
  S.carry={P,mesh:null};say(`Llevas un cable ${CABLE[S.cab]} desde ${pname(P)}. Toca el puerto de destino.`);view.querySelector('#s3cancel').hidden=false;sfx('tap')}
 function drop(){if(S.carry&&S.carry.mesh){scene.remove(S.carry.mesh);S.carry.mesh.geometry.dispose()}S.carry=null;view.querySelector('#s3cancel').hidden=true}
 function finish(P){const A=S.carry.P;if(P.cable&&P!==A){say(pname(P)+' ya tiene un cable. Quítalo primero si quieres cambiarlo.','bad');sfx('bad');return}
  const err=why(A,P,S.cab);if(err){S.wrong=(S.wrong||0)+1;say(err,'bad');sfx('bad');return}
  drop();addCable(A.id,P.id,S.cab);say(`Conectado: ${pname(A)} ↔ ${pname(P)} (${CABLE[S.cab]}).`,'ok');sfx('ok');check();if(S.cab==='consola')setTimeout(openCon,450)}
 function selCable(c){S.sel=c;S.cables.forEach(x=>x.mesh.material.emissiveIntensity=x===c?.9:.08);view.querySelector('#s3del').hidden=!c;if(c)say(`Cable ${CABLE[c.type]}: ${pname(S.ports[c.a])} ↔ ${pname(S.ports[c.b])}.`)}
 view.querySelector('#s3del').addEventListener('click',()=>{if(!S.sel)return;if(S.sel.type==='consola')closeCon();rmCable(S.sel);say('Cable quitado.');selCable(null);check()});
 view.querySelector('#s3cancel').addEventListener('click',()=>{drop();say('Soltaste el cable.')});
 canvas.addEventListener('pointerdown',e=>{if(S.mode==='walk'){down=null;return}const o=hit(e);down={x:e.clientX,y:e.clientY,o,t:performance.now()};if(o&&o.userData.port&&!S.carry){ctl.enabled=false;grab(o.userData.port);if(S.carry)S.carry.drag=true}},{capture:true});
 canvas.addEventListener('pointermove',e=>{if(S.mode==='walk')return;if(!S.carry){if(e.pointerType==='mouse'){const o=hit(e);canvas.style.cursor=o&&(o.userData.port||o.userData.cable||o.userData.dev)?'pointer':'grab';if(o&&o.userData.port&&!down){const P=o.userData.port;say(`${pname(P)} · ${P.label!==P.name?P.label+' · ':''}${KIND[P.kind]}${P.cable?' · conectado':''}`)}}return}
  const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
  const o=hit(e);let tp;if(o&&o.userData.port)tp=pw(o.userData.port).add(out(o.userData.port).multiplyScalar(.05));else{const A=pw(S.carry.P),pl=new THREE.Plane(new THREE.Vector3(0,0,1),-(A.z+.25));tp=new THREE.Vector3();if(!ray.ray.intersectPlane(pl,tp))return}
  const A=S.carry.P,c=new THREE.CatmullRomCurve3([pw(A),pw(A).addScaledVector(out(A),.12),tp]);
  if(S.carry.mesh){scene.remove(S.carry.mesh);S.carry.mesh.geometry.dispose()}S.carry.mesh=tube(c,S.cab);scene.add(S.carry.mesh)});
 canvas.addEventListener('pointerup',e=>{const d=down;down=null;ctl.enabled=true;if(!d||S.mode==='walk')return;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y)>8;const o=hit(e);
  if(S.carry&&S.carry.drag){S.carry.drag=false;if(o&&o.userData.port&&o.userData.port!==S.carry.P){finish(o.userData.port);return}return}
  if(moved)return;
  if(S.carry){if(o&&o.userData.port){if(o.userData.port===S.carry.P){drop();say('Soltaste el cable.');return}finish(o.userData.port)}else{drop();say('Soltaste el cable.')}return}
  if(o&&o.userData.cable){selCable(o.userData.cable);return}
  if(o&&o.userData.port&&o.userData.port.cable){selCable(o.userData.port.cable);return}
  selCable(null);if(o&&o.userData.dev&&o.userData.dev!=='DESK'){focusDev(o.userData.dev);say('Acercando '+(o.userData.dev==='PP'?'el patch panel':o.userData.dev)+'. Toca un puerto para tomar el cable.')}});
 const sfx=k=>{try{window.PPsfx&&window.PPsfx(k)}catch(e){}};
 // ---------- misiones ----------
 const task=view.querySelector('#s3task'),con=view.querySelector('#s3con'),cout=view.querySelector('#s3out'),cin=view.querySelector('#s3cmd'),cpr=view.querySelector('#s3pr'),hp=view.querySelector('#s3hp'),tp=view.querySelector('#s3tp'),openB=view.querySelector('#s3open');
 S.V=getV();
 const env={cabled:(dev,g)=>{const P=S.ports[dev+':'+g];return!!(P&&P.cable)},get devs(){return[S.D.CORE,S.D.ACC1,S.D.ACC2]},get D(){return S.D},link:(a,b)=>S.cables.some(c=>key(c.a,c.b)===key(a,b)),lagPeerOk:(d,g,m)=>m==='active'||m==='passive'};
 const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
 function conDev(){const c=S.ports['LAP:USB'].cable;if(!c)return null;const o=c.a==='LAP:USB'?c.b:c.a;return o.split(':')[0]}
 function print(lines){for(const l of lines){const d=document.createElement('div');if(typeof l==='string')d.textContent=l;else{d.textContent=l.t;d.className=l.c||''}cout.appendChild(d)}cout.scrollTop=cout.scrollHeight}
 function openCon(){const dn=conDev();if(!dn)return;const d=S.D[dn];S.cd=d;con.hidden=false;view.querySelector('#s3ct').textContent=`PuTTY · COM3 · ${dn} · ${VN[S.V]}`;
  if(!d.opened){d.opened=true;print(banner(d))}cpr.textContent=prompt(d)+' ';if(S.mis.con&&dn!==S.mis.con)print([{t:`[tutor] Estás en la consola de ${dn}, pero esta misión es en ${S.mis.con}. Mueve el cable de consola.`,c:'tut'}]);
  rTasks();setTimeout(()=>cin.focus({preventScroll:true}),50)}
 function closeCon(){con.hidden=true}
 view.querySelector('#s3x').addEventListener('click',closeCon);openB.addEventListener('click',openCon);
 view.querySelector('#s3hb').addEventListener('click',()=>{hp.hidden=!hp.hidden;tp.hidden=true;rHints()});
 view.querySelector('#s3tk').addEventListener('click',()=>{tp.hidden=!tp.hidden;hp.hidden=true;rTasks()});
 let hi=-1;cin.addEventListener('keydown',e=>{const d=S.cd;if(!d)return;
  if(e.key==='Enter'){const l=cin.value;cin.value='';hi=-1;print([{t:prompt(d)+' '+l,c:'cmdl'}]);if(d.v==='cisco'&&d.mode==='exec'&&!l.trim()&&!d.started){d.started=1}const o=run(d,l,env);print(o);cpr.textContent=prompt(d)+' ';check()}
  else if(e.key==='ArrowUp'){const h=d.hist;if(!h.length)return;hi=hi<0?h.length-1:Math.max(0,hi-1);cin.value=h[hi];e.preventDefault()}
  else if(e.key==='ArrowDown'){const h=d.hist;if(hi<0)return;hi=Math.min(h.length,hi+1);cin.value=h[hi]||'';e.preventDefault()}});
 cout.addEventListener('click',()=>cin.focus({preventScroll:true}));
 function rHints(){const m=S.mis;hp.innerHTML='<p class="tid">💡 Pistas</p>'+m.hints.map((h,i)=>`<div class="s3hl"><b>Pista ${i+1}</b>${i<S.hint?`<div>${h(S.V)}</div>`:i===S.hint?`<button class="btnl" data-h="${i}">Ver pista ${i+1}</button>`:'<div class="small">Se abre después de la anterior.</div>'}</div>`).join('')+'<p class="small">La pista 1 es gratis; la 2 resta 15 puntos y la 3, 25. Mínimo para aprobar: 70.</p>';
  hp.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{S.hint++;rHints();check(true)}))}
 function rTasks(){tp.innerHTML='<p class="tid">Tareas</p>'+task.querySelector('.s3tl').outerHTML;const t=task.querySelectorAll('.s3tl li'),ok=task.querySelectorAll('.s3tl li.ok').length;view.querySelector('#s3tk').textContent=`Tareas ${ok}/${t.length}`}
 S.rings=[];
 function ring(P){const g=new THREE.TorusGeometry(P.kind==='sfp'?.04:.03,.006,8,24),m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xfacc15,transparent:true,depthTest:false}));m.renderOrder=9;m.position.copy(P.mesh.position);m.position.z+=.012;P.mesh.parent.add(m);S.rings.push(m)}
 function clearRings(){S.rings.forEach(r=>{r.parent.remove(r);r.geometry.dispose()});S.rings=[]}
 const nextEl=view.querySelector('#s3next'),help=view.querySelector('#s3help');
 const showHelp=()=>{help.hidden=false};view.querySelector('#s3q').addEventListener('click',showHelp);view.querySelector('#s3hok').addEventListener('click',()=>{help.hidden=true;try{localStorage.setItem('pp3dh','1')}catch(e){}});
 try{if(!localStorage.getItem('pp3dh'))showHelp()}catch(e){}
 function nextStep(m,have,goalsOk){clearRings();let t='';
  const miss=m.req.find(([a,b,ty])=>{const c=have.get(key(a,b));return!(c&&c.type===ty)});
  if(miss){const[a,b,ty]=miss,A=S.ports[a],B=S.ports[b];
   if(m.pre!=='ticket'&&!m.noRing){const busy=[A,B].find(P=>P.cable&&key(P.cable.a,P.cable.b)!==key(a,b));
    t=busy?`👉 ${pname(busy)} tiene un cable que no va ahí: tócalo y pulsa "Quitar cable".`:`👉 Siguiente: cable <b>${CABLE[ty]}</b> de <b>${pname(A)}</b> a <b>${pname(B)}</b>. Los dos puertos parpadean en amarillo.`;
    if(S.cab!==ty&&!busy)t+=` Primero elige <b>${CABLE[ty]}</b> arriba.`;ring(A);ring(B)}
   else t='👉 Compara los cables con la lista de tareas: quita los que sobran y pon los que faltan.'}
  else{const g=(m.goals||[]).find(g=>!g.ok(S.D,env));if(g)t=con.hidden?`👉 Cables listos. Abre la consola de <b>${m.con}</b> y configura: ${esc(g.t(S.V))}.`:`👉 En la consola: ${esc(g.t(S.V))}.`}
  nextEl.innerHTML=t;nextEl.hidden=!t}
 function load(i){if(S.rpg&&S.rpg.on)S.rpg.stop();loadM(MIS[i])}
 function loadM(m){const i=MIS.indexOf(m);S.mis=m;S.hint=0;S.wrong=0;drop();selCable(null);closeCon();cout.innerHTML='';for(const c of S.cables.slice())rmCable(c);
  if(m.v)S.V=m.v;else S.V=getV();view.querySelectorAll('[data-ven]').forEach(x=>{x.classList.toggle('on',x.dataset.ven===S.V);x.disabled=!!m.v});{const sb=view.querySelector('[data-cab="stack"]');if(sb)sb.hidden=!m.stack}
  S.D={CORE:mkDev('CORE',S.V),CORE2:mkDev('CORE2',S.V),ACC1:mkDev('ACC1',S.V),ACC2:mkDev('ACC2',S.V)};m.cfg&&m.cfg(S.D);
  (m.pre==='ticket'?ticketPre():m.pre).forEach(([a,b,t])=>addCable(a,b,t));
  view.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));S.won=false;
  say('Misión: '+m.t+'. '+(m.req.length>1||!m.con?'Elige el cable y toca un puerto.':'Conecta la laptop a la consola de '+m.con+'.'));check(true);
  const fv=/^d0/.test(m.id)?'idf':'all';fly(VIEWS[fv][0],VIEWS[fv][1])}
 function check(silent){const m=S.mis;if(!m)return;const have=new Map(S.cables.map(c=>[key(c.a,c.b),c]));
  const need=new Set(m.req.concat(m.pre==='ticket'?[]:m.pre).map(([a,b])=>key(a,b)));
  const rows=m.req.map(([a,b,t])=>{const c=have.get(key(a,b)),ok=c&&c.type===t;return{ok,txt:`🔌 ${pname(S.ports[a])} → ${pname(S.ports[b])}`+(S.ports[a].dev==='PP'?` <span class="small">(${DESK[a.slice(3)]||''})</span>`:'')+` · ${CABLE[t]}`}});
  const cabOk=rows.every(r=>r.ok);
  const grows=(m.goals||[]).map(g=>({ok:cabOk&&g.ok(S.D,env),txt:'⌨️ '+esc(g.t(S.V))}));
  const extra=S.cables.filter(c=>!need.has(key(c.a,c.b))&&!(m.multiCon&&c.type==='consola'));
  const win=cabOk&&grows.every(r=>r.ok)&&!extra.length;
  const score=Math.max(0,100-(S.hint>=2?15:0)-(S.hint>=3?25:0)-Math.min(20,5*(S.wrong||0))),pass=score>=PASS3,isD=/^[dcv]/.test(m.id);
  if(win){clearRings();nextEl.innerHTML='✅ ¡Misión cumplida! Elige la siguiente misión.';nextEl.hidden=false}else nextStep(m,have);
  openB.hidden=!conDev()||!con.hidden;if(conDev())openB.textContent='Abrir consola de '+conDev();
  task.innerHTML=`<p class="tid">${m.z} · misión · ${VN[S.V]}</p><h3>${m.t}</h3><p>${m.story}</p><ul class="s3tl">${rows.concat(grows).map(r=>`<li class="${r.ok?'ok':''}">${r.ok?'✓':'○'} ${r.txt}</li>`).join('')}${extra.map(c=>`<li class="bad">✗ Sobra o está mal: ${pname(S.ports[c.a])} ↔ ${pname(S.ports[c.b])}</li>`).join('')}</ul>
  <div class="s3h">${m.hints.map((h,i)=>i<S.hint?`<div><b>Pista ${i+1}:</b> ${h(S.V)}</div>`:'').join('')}${S.hint<3&&!win?`<button class="btnl" id="s3hint">Ver pista ${S.hint+1} de 3</button>`:''}</div>
  ${win?`<div class="s3win${isD&&!pass?' s3fail':''}">${isD?`<b>${pass?'¡Lab aprobado!':'Lab terminado, pero no alcanza el mínimo'}</b><span>Calificación: <b>${score}/100</b> · mínimo para aprobar: ${PASS3} ${pass?'★'.repeat(scoreStars(score)):''}</span><span class="small">Pistas usadas: ${S.hint} · cables equivocados: ${S.wrong||0}</span>${pass?'':`<button class="btn" id="s3retry">Reintentar</button>`}`:`<b>¡Misión cumplida!</b> ${'★'.repeat(3-Math.min(S.hint,2))}${'☆'.repeat(Math.min(S.hint,2))}`}<p>${m.done}</p>${m.go?`<a class="btn" href="${m.go[0]}">${m.go[1]}</a>`:''}${MIS.indexOf(m)>=0&&MIS.indexOf(m)<MIS.length-1?`<button class="btnl" id="s3next">Siguiente misión</button>`:''}${m.caseBtn?`<button class="btn" id="s3back">${m.caseBtn}</button>`:''}</div>`:''}`;
  const hb=task.querySelector('#s3hint');if(hb)hb.addEventListener('click',()=>{S.hint++;check(true);if(!hp.hidden)rHints()});
  const rb=task.querySelector('#s3retry');if(rb)rb.addEventListener('click',()=>loadM(m));
  const nb=task.querySelector('#s3next');if(nb)nb.addEventListener('click',()=>load(MIS.indexOf(m)+1));
  const bb=task.querySelector('#s3back');if(bb)bb.addEventListener('click',()=>S.rpg&&S.rpg.backFromRack());
  if(!con.hidden)rTasks();
  if(win&&!S.won&&!silent){S.won=true;const stars=3-Math.min(S.hint,2);if(!/^c/.test(m.id))prog.set(m.id,isD?score:stars);if(S.onWin)S.onWin(m,score,pass);sfx(isD&&!pass?'bad':'win');say(isD?(pass?`¡Lab aprobado con ${score}/100! `+m.done:`Terminaste con ${score}/100; necesitas ${PASS3}. Reintenta con menos pistas.`):'¡Misión cumplida! '+m.done,isD&&!pass?'bad':'ok');
   if(!con.hidden)print([{t:isD?`[tutor] ✔ Lab terminado: ${score}/100 (mínimo ${PASS3}). `+(pass?m.done:'Reintenta con menos pistas.'):'[tutor] ✔ ¡Misión cumplida! '+m.done,c:isD&&!pass?'err':'win'}]);
   const b=view.querySelector(`[data-m="${MIS.indexOf(m)}"] em`);if(b)b.textContent=badge(m.id,prog.get()[m.id])}}
 view.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>load(+b.dataset.m)));
 view.querySelectorAll('[data-ven]').forEach(b=>b.addEventListener('click',()=>{S.V=b.dataset.ven;try{localStorage.setItem('pp3dv',S.V)}catch(e){}view.querySelectorAll('[data-ven]').forEach(x=>x.classList.toggle('on',x===b));load(MIS.indexOf(S.mis))}));
 [hemi,dl,fl2].forEach(l=>l.userData.base=l.intensity);S.cleanup=[];
 S.rpg=initRPG({THREE,scene,cam,ctl,canvas,stage,view,S,lbl,say,loadM,fly,VIEWS,sfx,dark,lights:[hemi,dl,fl2],task,prog:(id,sc)=>{prog.set(id,sc);const b=view.querySelector(`[data-case="${CASES.findIndex(c=>c.id===id)}"] em`);if(b)b.textContent=(sc>=70?'✓ ':'✗ ')+sc},onUnmount:f=>S.cleanup.push(f),loadFirst:()=>load(0)});
 view.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{view.querySelectorAll('[data-m],[data-case]').forEach(x=>x.classList.toggle('on',x===b));drop();selCable(null);closeCon();S.rpg.start(CASES[+b.dataset.case]);stage.scrollIntoView({block:'start',behavior:'smooth'})}));
 if(/^z\d$/.test(start||''))start='d'+start[1]+'a';if(start==='d5c'){const vv=getV();start={aruba:'v1',cisco:'v3',juniper:'v5'}[vv]}const ci=CASES.findIndex(c=>c.id===start&&isOpen(c.id));if(ci>=0){load(0);S.rpg.start(CASES[ci]);setTimeout(()=>stage.scrollIntoView({block:'start',behavior:'smooth'}),300)}const si=ci>=0?-2:MIS.findIndex(m=>m.id===start&&isOpen(m.id)),first=MIS.findIndex(m=>!m.v&&isOpen(m.id)&&(/^d/.test(m.id)?!(done[m.id]>=PASS3):!done[m.id]));const anyOpen=MIS.some(m=>isOpen(m.id)),lastOpen=MIS.map(m=>isOpen(m.id)).lastIndexOf(true);if(si!==-2)load(si>=0?si:first>=0?first:Math.max(0,lastOpen));if(!anyOpen&&ci<0){stage.insertAdjacentHTML('beforeend','<div class="s3help"><div><h3>🔒 Tus labs 3D se abren conforme avanzas</h3><p>Cada zona tiene dos labs 3D justo antes de su certificación. El primero, <b>3D-0A</b>, se abre al terminar los tickets de la Zona 0.</p><p class="small">Mientras tanto, puedes ver el cuarto de telecom: gira y acerca para conocer los racks.</p><a class="btn" href="#mapa">Ir a mi mapa</a> <button class="btnl" onclick="this.closest(\'.s3help\').remove()">Solo ver el cuarto</button></div></div>')}if(si>=0)setTimeout(()=>stage.scrollIntoView({block:'start',behavior:'smooth'}),300);
 // ---------- ciclo ----------
 const fit=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
 S.ro=new ResizeObserver(fit);S.ro.observe(stage);fit();
 const v3=new THREE.Vector3();
 let lt=performance.now();
 function loop(){if(!S||!S.alive)return;S.raf=requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(.05,(now-lt)/1000);lt=now;if(!view.classList.contains('on')){unmount();return}
  if(S.anim){const k=Math.min(1,(performance.now()-S.anim.t0)/650),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;cam.position.lerpVectors(S.anim.p0,S.anim.p1,e);ctl.target.lerpVectors(S.anim.t0v,S.anim.t1,e);if(k>=1)S.anim=null}
  if(S.rpg)S.rpg.tick(dt);
  if(S.mode!=='walk'){const t=ctl.target;t.x=Math.max(-1.8,Math.min(3.6,t.x));t.y=Math.max(.3,Math.min(2.4,t.y));t.z=Math.max(-.5,Math.min(2.2,t.z))}
  ctl.update();if(cam.position.z<-.6)cam.position.z=-.6;
  if(S.rings&&S.rings.length){const k=.5+.5*Math.sin(performance.now()/220);S.rings.forEach(r=>{r.material.opacity=.35+.6*k;r.scale.setScalar(1+.35*k)})}
  renderer.render(scene,cam);
  const w=stage.clientWidth,h=stage.clientHeight,d=cam.position.distanceTo(ctl.target);
  for(const L of S.labels){if(L.obj){L.obj.getWorldPosition(v3);if(L.off)v3.add(L.off)}else v3.copy(L.p);const dist=cam.position.distanceTo(v3);v3.project(cam);
   const vis=v3.z<1&&Math.abs(v3.x)<1.05&&Math.abs(v3.y)<1.05&&!(L.el.classList.contains('dc')&&d>4);L.el.style.display=vis?'':'none';if(vis)L.el.style.transform=`translate(${(v3.x+1)/2*w}px,${(1-v3.y)/2*h}px) translate(-50%,-50%)`;L.el.style.opacity=dist>7?.6:1}}
 loop();
 window.__s3={xy(id){const P=S.ports[id];const v=pw(P);v.project(cam);const r=canvas.getBoundingClientRect();return[r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]},focus:focusDev,cables:()=>S.cables.map(c=>[c.a,c.b,c.type]),cmd(l){cin.value=l;cin.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))},load,rpg:()=>S.rpg,tp:(x,z)=>S.rpg.tp(x,z),curReq:()=>S.mis.req.filter(r=>!S.cables.some(c=>key(c.a,c.b)===key(r[0],r[1]))),curHint:()=>S.mis.hints[2](S.V),tasks:()=>task.innerText,hint3:i=>MIS[i].hints[2](S.V),req:i=>MIS[i].req,open:openCon,out:()=>cout.innerText};
}
