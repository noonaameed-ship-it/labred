/* PacketPath · Casos de cliente: caminas por el sitio, hablas con el cliente, propones, te aprueba la ventana y lo implementas. */
export function initRPG(X){
 const{THREE,scene,cam,ctl,canvas,stage,view,S,lbl,say,loadM,fly,VIEWS,sfx}=X;
 const R={on:false,c:null,stage:0,score:100,log:[],keys:{},joy:{x:0,y:0},asked:new Set(),npcs:[]};
 const B={x0:-2.85,x1:5.6,z0:-.7,z1:5.0};
 const OB=[[-1.45,1.45,-.55,.55],[1.75,4.45,-.35,1.55],[-.7,.1,1.7,2.3]];
 // ---------- personajes ----------
 const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.8});
 function person(shirt,pants,hair,skin){const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.15,.18,.55,14),M(shirt));body.position.y=1.0;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.15,18,14),M(skin||0xe0ac69));head.position.y=1.45;g.add(head);
  const hr=new THREE.Mesh(new THREE.SphereGeometry(.157,18,10,0,Math.PI*2,0,Math.PI*.55),M(hair));hr.position.y=1.47;hr.rotation.x=-.25;g.add(hr);
  for(const x of[-.055,.055]){const e=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),M(0x111111));e.position.set(x,1.47,.135);g.add(e)}
  const legs=[],arms=[];for(const x of[-.075,.075]){const p=new THREE.Group();p.position.set(x,.73,0);const l=new THREE.Mesh(new THREE.BoxGeometry(.11,.7,.13),M(pants));l.position.y=-.35;p.add(l);g.add(p);legs.push(p);
   const a=new THREE.Group();a.position.set(x*2.6,1.22,0);const am=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.09),M(shirt));am.position.y=-.24;a.add(am);g.add(a);arms.push(a)}
  scene.add(g);return{g,legs,arms,t:0}}
 function walkAnim(P,moving,dt){P.t+=dt*(moving?9:0);const k=moving?Math.sin(P.t)*.55:0;P.legs[0].rotation.x=k;P.legs[1].rotation.x=-k;P.arms[0].rotation.x=-k*.8;P.arms[1].rotation.x=k*.8}
 const me=person(0x0f766e,0x1f2937,0x2b1d14);me.g.visible=false;
 const meL={el:lbl('Tú','me'),obj:me.g,off:new THREE.Vector3(0,1.85,0)};
 // ---------- UI ----------
 stage.insertAdjacentHTML('beforeend',`<div class="s3joy" id="s3joy" hidden><i></i></div><button class="s3act" id="s3act" hidden>Hablar</button><div class="s3dlg" id="s3dlg" hidden></div><button class="btnl s3exit" id="s3exit" hidden>🚶 Salir del rack</button><div class="s3fade" id="s3fade" hidden></div>`);
 const joy=stage.querySelector('#s3joy'),act=stage.querySelector('#s3act'),dlg=stage.querySelector('#s3dlg'),exitB=stage.querySelector('#s3exit'),fade=stage.querySelector('#s3fade'),nextEl=view.querySelector('#s3next');
 const topBars=()=>view.querySelectorAll('.s3top');
 // joystick
 {let id=null,cx=0,cy=0;const knob=joy.querySelector('i');
  joy.addEventListener('pointerdown',e=>{id=e.pointerId;joy.setPointerCapture(id);const r=joy.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;mv(e);e.preventDefault()});
  const mv=e=>{if(e.pointerId!==id)return;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy),mx=42;if(d>mx){dx*=mx/d;dy*=mx/d}knob.style.transform=`translate(${dx}px,${dy}px)`;R.joy.x=dx/mx;R.joy.y=dy/mx};
  joy.addEventListener('pointermove',mv);const up=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';R.joy.x=R.joy.y=0};joy.addEventListener('pointerup',up);joy.addEventListener('pointercancel',up)}
 const typing=e=>e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');
 const kd=e=>{if(!R.on||typing(e)||!view.classList.contains('on'))return;const k=e.key.toLowerCase();
  if(!dlg.hidden){const n=+e.key;if(n>=1&&n<=6){const b=dlg.querySelectorAll('[data-o]')[n-1];if(b){b.click();e.preventDefault()}}else if((k===' '||k==='enter'||k==='e')&&dlg.querySelector('[data-c]')){dlg.querySelector('[data-c]').click();e.preventDefault()}return}
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){R.keys[k]=1;e.preventDefault()}
  if((k==='e'||k===' '||k==='enter')&&!act.hidden){act.click();e.preventDefault()}};
 const ku=e=>{R.keys[e.key.toLowerCase()]=0};addEventListener('keydown',kd);addEventListener('keyup',ku);
 X.onUnmount(()=>{removeEventListener('keydown',kd);removeEventListener('keyup',ku)});
 // ---------- diálogo ----------
 function talk(who,text,opts,cb){dlg.hidden=false;act.hidden=true;
  dlg.innerHTML=`<p class="s3who">${who}</p><p class="s3say">${text}</p>`+(opts?`<div class="s3opts">${opts.map((o,i)=>`<button data-o="${i}"><span>${i+1}</span>${o.t}</button>`).join('')}</div>`:`<button class="btn" data-c>Continuar ▸</button>`);
  if(opts)dlg.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>cb(opts[+b.dataset.o],+b.dataset.o)));else dlg.querySelector('[data-c]').addEventListener('click',()=>{dlg.hidden=true;cb&&cb()})}
 function seq(list,done){let i=0;const nx=()=>{if(i>=list.length)return done&&done();const[w,t]=list[i++];talk(w,t,null,nx)};nx()}
 const pts=(n,why)=>{R.score+=n;if(n)R.log.push([n,why])};
 // ---------- flujo del caso ----------
 function obj(t){nextEl.innerHTML='🎯 '+t;nextEl.hidden=false}
 function npc(def,pos,rot){const P=person(def.shirt,def.pants||0x334155,def.hair||0x3b2314,def.skin);P.g.position.set(...pos);P.g.rotation.y=rot||0;const L={el:lbl(def.name,'npc'),obj:P.g,off:new THREE.Vector3(0,1.9,0)};S.labels.push(L);P.L=L;P.def=def;R.npcs.push(P);return P}
 function clearNpcs(){R.npcs.forEach(P=>{scene.remove(P.g);P.L.el.remove();S.labels=S.labels.filter(x=>x!==P.L)});R.npcs=[]}
 function start(c){if(R.on)stop(true);R.on=true;R.c=c;R.stage=0;R.score=100;R.log=[];R.asked=new Set();R.prop=null;S.mode='walk';S.onWin=onImplWin;
  me.g.visible=true;me.g.position.set(4.7,0,4.3);me.g.rotation.y=Math.PI;if(!S.labels.includes(meL))S.labels.push(meL);meL.el.style.display='';
  R.boss=npc({name:'Beto · tu jefe',shirt:0x1d4ed8,hair:0x111111},[5.2,0,3.4],-Math.PI/2);
  R.cli=npc(c.client,c.client.pos||[2.3,0,2.35],c.client.rot!=null?c.client.rot:Math.PI*.8);
  R.sign=lbl(c.site,'rk site');S.labels.push(R.sLab={el:R.sign,p:new THREE.Vector3(4.9,2.5,4.95)});
  walkMode();night(false);obj('Habla con Beto, tu jefe, para recibir el caso. Acércate y presiona <b>E</b> (o el botón Hablar).');
  say('Caso: '+c.t+'. Muévete con WASD o las flechas (en el celular, con el joystick). Arrastra para girar la cámara.');rCase()}
 function stop(silent){R.on=false;stage.classList.remove('walk');S.mode=null;S.onWin=null;me.g.visible=false;meL.el.style.display='none';clearNpcs();if(R.sLab){R.sign.remove();S.labels=S.labels.filter(x=>x!==R.sLab);R.sLab=null}
  dlg.hidden=true;act.hidden=true;joy.hidden=true;exitB.hidden=true;night(false);rackModeUI(true);
  ctl.minAzimuthAngle=-1.15;ctl.maxAzimuthAngle=1.15;ctl.minDistance=.35;ctl.maxDistance=6.5;ctl.maxPolarAngle=Math.PI*.47}
 function walkMode(){S.mode='walk';stage.classList.add('walk');me.g.visible=true;meL.el.style.display='';rackModeUI(false);exitB.hidden=true;joy.hidden=!matchMedia('(pointer:coarse)').matches&&innerWidth>900;
  ctl.minAzimuthAngle=-Infinity;ctl.maxAzimuthAngle=Infinity;ctl.minDistance=2.2;ctl.maxDistance=5.5;ctl.maxPolarAngle=Math.PI*.44;
  const p=me.g.position;fly([p.x+.4,2.9,p.z+3.4].map((v,i)=>i===2?Math.min(v,B.z1+2.5):v),[p.x,1.1,p.z])}
 function rackModeUI(show){topBars().forEach(b=>b.style.display=show?'':'none');view.querySelector('#s3q').style.display=show?'':'none'}
 function night(on){scene.background.setHex(on?0x05080d:(X.dark?0x0b1312:0xdfe7e5));X.lights.forEach(l=>l.intensity=l.userData.base*(on?.55:1))}
 function near(P,d){return me.g.position.distanceTo(P.g.position)<(d||1.25)}
 const RACK=new THREE.Vector3(.4,0,1.0);
 function actionFor(){if(!R.on||S.mode!=='walk'||!dlg.hidden)return null;
  if(near(R.boss)&&R.stage===0)return['Hablar con Beto',brief];
  if(near(R.cli)&&(R.stage===1))return['Hablar con '+R.c.client.short,meet];
  if(near(R.cli)&&R.stage===4)return['Entregar el trabajo',signoff];
  if(near(R.cli)&&R.stage>=2&&R.stage<4)return['Hablar con '+R.c.client.short,()=>talk(R.c.client.name,R.stage===2?'Lo veo en la ventana que acordamos. ¡Gracias!':'¿Ya quedó? Avíseme cuando termine.',null)];
  if(near(R.boss)&&R.stage>0)return['Hablar con Beto',()=>talk('Beto · tu jefe',R.stage<2?'Escucha bien al cliente antes de proponer. Pregunta lo necesario, no vendas de más.':R.stage<4?'Ya tienes la ventana. Ve al rack y hazlo como lo propusiste.':'Ve con el cliente a entregarle.',null)];
  if(me.g.position.distanceTo(RACK)<1.5&&R.stage===2)return['Abrir el rack (empezar la ventana)',goWindow];
  if(me.g.position.distanceTo(RACK)<1.5&&R.stage===3)return['Volver al rack',enterRack];
  return null}
 function brief(){seq(R.c.brief.map(t=>['Beto · tu jefe',t]),()=>{R.stage=1;obj(`Ve con <b>${R.c.client.name}</b> (${R.c.client.where||'junto a los escritorios'}) y averigua qué necesita.`);rCase()})}
 function meet(){seq(R.c.intro.map(t=>[R.c.client.name,t]),ask)}
 function ask(){const Q=R.c.q.filter((x,i)=>!R.asked.has(i));const good=R.c.q.filter((x,i)=>R.asked.has(i)&&x.k==='good').length,need=R.c.q.filter(x=>x.k==='good').length;
  const opts=Q.map(x=>({t:x.t,x})).concat([{t:good>=need?'✅ Ya entendí. Le hago mi propuesta.':'Le hago mi propuesta (aunque me falte preguntar)',prop:1}]);
  talk('Tú','¿Qué le preguntas a '+R.c.client.short+'?',opts,(o)=>{if(o.prop){if(good<need){pts(-10,'Propusiste sin entender todo el requerimiento');talk(R.c.client.name,'Mmm… ¿y no me va a preguntar nada más? Siento que le falta información.',null,ask)}else propose();return}
   const i=R.c.q.indexOf(o.x);R.asked.add(i);if(o.x.k==='bad')pts(-8,'Pregunta o comentario fuera de lugar: '+o.x.t);if(o.x.k==='meh')pts(-3,'Pregunta que no aportaba: '+o.x.t);
   talk(R.c.client.name,o.x.a,null,ask);if(o.x.k==='good')R.log.push([0,'Buen dato: '+o.x.note])})}
 function propose(){talk('Tú','¿Qué le propones?',R.c.p.map(x=>({t:x.t,x})),o=>{if(!o.x.ok){pts(-15,'Propuesta incorrecta: '+o.x.t);talk(R.c.client.name,o.x.a,null,propose);return}
  R.prop=o.x;talk(R.c.client.name,o.x.a,null,()=>needs())})}
 function needs(){talk('Tú','¿Qué necesitas para hacerlo? (Elige lo que le pides al cliente)',R.c.m.map(x=>({t:x.t,x})),o=>{if(!o.x.ok){pts(-8,'Material mal pedido: '+o.x.t);talk(R.c.client.name,o.x.a,null,needs);return}talk(R.c.client.name,o.x.a,null,when)})}
 function when(){talk(R.c.client.name,'Va, me convence. ¿Cuándo lo hacen?',R.c.w.map(x=>({t:x.t,x})),o=>{if(!o.x.ok){pts(-10,'Ventana mal elegida: '+o.x.t);talk(R.c.client.name,o.x.a,null,when);return}
  R.win=o.x.when;talk(R.c.client.name,o.x.a,null,()=>{R.stage=2;sfx('ok');obj(`Propuesta aprobada ✔ Ventana: <b>${R.win}</b>. Cuando estés listo, ve al <b>rack</b> y presiona E para empezar la ventana.`);rCase()})})}
 function goWindow(){fade.hidden=false;fade.innerHTML=`<p>${R.win}</p><span>Ventana de mantenimiento autorizada por ${R.c.client.name}</span>`;night(true);setTimeout(()=>{fade.hidden=true;R.stage=3;enterRack()},1900)}
 function enterRack(){S.mode='rack';stage.classList.remove('walk');me.g.visible=false;meL.el.style.display='none';dlg.hidden=true;act.hidden=true;joy.hidden=true;rackModeUI(true);exitB.hidden=false;
  ctl.minAzimuthAngle=-1.15;ctl.maxAzimuthAngle=1.15;ctl.minDistance=.35;ctl.maxDistance=6.5;ctl.maxPolarAngle=Math.PI*.47;
  if(!R.implLoaded){R.implLoaded=true;loadM({...R.c.impl,id:'c-'+R.c.id,z:'Caso de cliente',caseBtn:'Ir con el cliente a entregar'})}else fly(VIEWS.all[0],VIEWS.all[1]);
  obj('Implementa lo que propusiste. Cuando termines, sal del rack y entrégale al cliente.')}
 function backFromRack(){walkMode();me.g.position.set(1.2,0,1.6);if(R.stage===4)obj(`Trabajo terminado ✔ Ve con <b>${R.c.client.name}</b> a entregarle.`);else obj('Aún no terminas la implementación. Vuelve al rack (E) cuando quieras.')}
 exitB.addEventListener('click',backFromRack);
 function onImplWin(m,score,pass){R.impl=score;R.stage=4;pts(-Math.round((100-score)*.5),score<100?`Implementación con ${score}/100 (pistas o cables equivocados)`:'');setTimeout(()=>{rCase();obj(`Implementación lista (${score}/100) ✔ Pulsa <b>🚶 Salir del rack</b> y entrégale a ${R.c.client.name}.`)},1200)}
 function signoff(){talk(R.c.client.name,R.c.s.q,R.c.s.o.map(x=>({t:x.t,x})),o=>{if(!o.x.ok){pts(-10,'Explicación al cliente poco clara');talk(R.c.client.name,o.x.a,null,signoff);return}
  talk(R.c.client.name,o.x.a,null,finish)})}
 function finish(){R.stage=5;const sc=Math.max(0,Math.min(100,R.score)),ok=sc>=70;X.prog(R.c.id,sc);sfx(ok?'win':'bad');
  dlg.hidden=false;dlg.innerHTML=`<p class="s3who">Caso cerrado · ${R.c.site}</p><p class="s3say"><b style="color:${ok?'var(--ok)':'var(--bad)'}">${sc}/100 ${ok?'· ¡Cliente satisfecho!':'· El cliente quedó con dudas'}</b></p><ul class="s3log">${R.log.filter(l=>l[1]).map(([n,t])=>`<li class="${n<0?'bad':'ok'}">${n<0?n:'✓'} ${t}</li>`).join('')}</ul><div class="s3opts"><button data-o="0"><span>1</span>Repetir el caso</button><button data-o="1"><span>2</span>Volver a las misiones</button></div>`;
  dlg.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.o==='0')start(R.c);else{stop();X.loadFirst()}}));obj(ok?'Caso cerrado ✔':'Caso cerrado: repítelo para mejorar tu calificación.')}
 function rCase(){const c=R.c;const st=['Recibir el caso con Beto','Entender qué necesita el cliente','Propuesta aprobada: ir al rack en la ventana','Implementar en el rack','Entregar al cliente','Caso cerrado'];
  X.task.innerHTML=`<p class="tid">Caso de cliente · ${c.site}</p><h3>${c.t}</h3><p>${c.sum}</p><ul class="s3tl">${st.map((t,i)=>`<li class="${i<R.stage?'ok':''}">${i<R.stage?'✓':i===R.stage?'▸':'○'} ${t}</li>`).join('')}</ul><p class="small">Muévete con <b>WASD</b> o las <b>flechas</b>, habla con <b>E</b>, elige respuestas con <b>1-4</b>. En el celular: joystick y botón Hablar.</p>`}
 // ---------- ciclo ----------
 const fw=new THREE.Vector3(),rt=new THREE.Vector3();
 function tick(dt){if(!R.on)return;const P=me.g;
  if(S.mode==='walk'&&dlg.hidden){let f=(R.keys.w||R.keys.arrowup?1:0)-(R.keys.s||R.keys.arrowdown?1:0)-R.joy.y,r=(R.keys.d||R.keys.arrowright?1:0)-(R.keys.a||R.keys.arrowleft?1:0)+R.joy.x;
   const m=Math.hypot(f,r);let moving=false;if(m>.1){f/=Math.max(1,m);r/=Math.max(1,m);cam.getWorldDirection(fw);fw.y=0;fw.normalize();rt.set(-fw.z,0,fw.x);
    const v=fw.multiplyScalar(f).add(rt.multiplyScalar(r)),sp=2.4*dt,nx=P.position.x+v.x*sp,nz=P.position.z+v.z*sp;
    const blocked=(x,z)=>x<B.x0||x>B.x1||z<B.z0||z>B.z1||OB.some(o=>x>o[0]-.2&&x<o[1]+.2&&z>o[2]-.2&&z<o[3]+.2)||R.npcs.some(n=>Math.hypot(n.g.position.x-x,n.g.position.z-z)<.45);
    const ox=P.position.x,oz=P.position.z;if(!blocked(nx,oz))P.position.x=nx;if(!blocked(P.position.x,nz))P.position.z=nz;
    moving=Math.hypot(P.position.x-ox,P.position.z-oz)>1e-4;if(moving){const a=Math.atan2(v.x,v.z);let d=a-P.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));P.rotation.y+=d*Math.min(1,dt*12)}
    const dx=P.position.x-ox,dz=P.position.z-oz;cam.position.x+=dx;cam.position.z+=dz;ctl.target.x+=dx;ctl.target.z+=dz}
   walkAnim(me,moving,dt);
   if(!S.anim){ctl.target.lerp(new THREE.Vector3(P.position.x,1.1,P.position.z),.15)}
   const a=actionFor();if(a){act.hidden=false;act.textContent=a[0]+' (E)';act.onclick=a[1]}else act.hidden=true}
  R.npcs.forEach(n=>{walkAnim(n,false,dt);if(near(n,2.2)&&S.mode==='walk'){const a=Math.atan2(P.position.x-n.g.position.x,P.position.z-n.g.position.z);let d=a-n.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));n.g.rotation.y+=d*Math.min(1,dt*5)}});
  if(S.mode==='walk'){cam.position.x=Math.max(B.x0-.2,Math.min(B.x1+3,cam.position.x));cam.position.z=Math.max(-.9,Math.min(B.z1+3,cam.position.z));cam.position.y=Math.max(.8,cam.position.y)}}
 const tp=(x,z)=>{me.g.position.set(x,0,z)};Object.assign(R,{start,stop,tick,backFromRack,tp});return R}
