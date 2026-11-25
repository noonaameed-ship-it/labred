/* PacketPath · ejemplos resueltos interactivos: simuladores "pruébalo tú" y ejemplos paso a paso. */
(function(){
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};

/* ---------- TCP: abre la intranet ---------- */
function tcp(el){
 var L='192.168.10.57',S='10.0.5.20',SP=51515;
 var st={step:0,rows:[['TCP',L+':51514','10.0.5.30:443','ESTABLISHED','Correo']],errs:0};
 el.innerHTML='<div class="tsim">'
  +'<p class="tsh">🧪 Pruébalo tú: arma la conexión paso a paso</p>'
  +'<div class="tnet"><div class="tdev"><div class="tbrow"><span class="ttab">✉ Correo</span><span class="ttab on" id="ttab">⌛ intranet.netcorp.mx</span></div><b>💻 Tu laptop</b><code>'+L+'</code></div>'
  +'<div class="tcline"><span class="tpkt" id="tpkt" hidden></span></div>'
  +'<div class="tdev"><b>🖥 Servidor intranet</b><code>'+S+'</code><span class="small">Escucha en el puerto 443 (HTTPS)</span></div></div>'
  +'<div class="tpanel" id="tpanel"></div>'
  +'<p class="tnh">netstat -an en tu laptop</p><div class="tnsw"><table class="tns tdone"><thead><tr><th>Proto</th><th>Local</th><th>Remoto</th><th>Estado</th></tr></thead><tbody id="tns"></tbody></table></div>'
  +'</div>';
 var P=el.querySelector('#tpanel'),pk=el.querySelector('#tpkt'),ns=el.querySelector('#tns'),tab=el.querySelector('#ttab');
 function rNs(){ns.innerHTML=st.rows.map(function(r){return'<tr class="'+(r[4]==='Intranet'?'new':'')+'"><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td class="'+(r[3]==='ESTABLISHED'?'ok':'')+'">'+r[3]+'</td></tr>'}).join('')}
 function fly(dir,label,cls,cb){pk.hidden=false;pk.className='tpkt '+(cls||'');pk.textContent=label;var w=Math.max(0,pk.parentNode.clientWidth-pk.offsetWidth);pk.style.transition='none';pk.style.transform='translateX('+(dir>0?0:w)+'px)';pk.getBoundingClientRect();pk.style.transition='transform .9s ease-in-out';pk.style.transform='translateX('+(dir>0?w:0)+'px)';setTimeout(function(){pk.hidden=true;cb&&cb()},950)}
 function msg(t,k){var m=P.querySelector('.tmsg');if(m){m.className='tmsg '+(k||'');m.innerHTML=t}}
 function choose(q,opts,ok,why,cb){P.innerHTML='<p class="tq">'+q+'</p><div class="topts">'+opts.map(function(o,i){return'<button data-i="'+i+'">'+o+'</button>'}).join('')+'</div><p class="tmsg"></p>';
  P.querySelectorAll('[data-i]').forEach(function(b){b.addEventListener('click',function(){var i=+b.dataset.i;if(i===ok){P.querySelectorAll('button').forEach(function(x){x.disabled=true});b.classList.add('ok');msg('✔ '+why[i],'ok');setTimeout(cb,700)}else{st.errs++;b.classList.add('bad');b.disabled=true;msg('✗ '+why[i],'bad')}})})}
 function s1(){P.innerHTML='<p class="tq"><b>Paso 1 · Arma el primer segmento.</b> El navegador quiere abrir <code>https://intranet.netcorp.mx</code>. Tu PC ya eligió un puerto de origen al azar: <code>'+SP+'</code>.</p>'
  +'<div class="tform"><label>Puerto destino<select id="tdp"><option value="">elige…</option><option>53</option><option>80</option><option>443</option><option>3389</option></select></label>'
  +'<label>Transporte<select id="ttr"><option value="">elige…</option><option>TCP</option><option>UDP</option></select></label>'
  +'<label>Bandera<select id="tfl"><option value="">elige…</option><option>SYN</option><option>ACK</option><option>FIN</option></select></label>'
  +'<button class="btn" id="tsend">Enviar ▸</button></div><p class="tmsg"></p>';
  P.querySelector('#tsend').addEventListener('click',function(){var dp=P.querySelector('#tdp').value,tr=P.querySelector('#ttr').value,fl=P.querySelector('#tfl').value;
   if(!dp||!tr||!fl)return msg('Llena los tres campos.','bad');
   if(dp!=='443'){st.errs++;return msg('✗ '+({53:'53 es DNS: sirve para preguntar la IP del nombre, no para abrir la página.',80:'80 es HTTP sin cifrar. La dirección empieza con <b>https</b>.',3389:'3389 es escritorio remoto (RDP), no una página web.'})[dp],'bad')}
   if(tr!=='TCP'){st.errs++;return msg('✗ HTTPS necesita que no se pierda nada y llegue en orden: eso lo garantiza TCP, no UDP.','bad')}
   if(fl!=='SYN'){st.errs++;return msg('✗ Toda conexión TCP empieza pidiendo permiso: la primera bandera siempre es <b>SYN</b>.','bad')}
   P.querySelectorAll('select,button').forEach(function(x){x.disabled=true});msg('Enviando…');
   st.rows.push(['TCP',L+':'+SP,S+':443','SYN_SENT','Intranet']);rNs();
   fly(1,'SYN · '+L+':'+SP+' → '+S+':443','syn',function(){fly(-1,'SYN-ACK · '+S+':443 → '+L+':'+SP,'syn',s2)})})}
 function s2(){choose('<b>Paso 2 · El servidor contestó SYN-ACK</b> ("sí, conectemos"). ¿Qué le responde tu laptop para cerrar el saludo?',['SYN otra vez','ACK','FIN','Nada, ya está conectado'],1,
  ['El SYN ya se mandó; repetirlo reiniciaría el saludo.','Correcto: SYN → SYN-ACK → <b>ACK</b>. Es el saludo de tres pasos (three-way handshake).','FIN sirve para cerrar una conexión, no para abrirla.','Falta confirmar: sin el ACK final el servidor no sabe que recibiste su respuesta.'],
  function(){fly(1,'ACK · '+L+':'+SP+' → '+S+':443','syn',function(){st.rows[1][3]='ESTABLISHED';rNs();s3()})})}
 function s3(){P.innerHTML='<p class="tq"><b>Paso 3 · Conexión ESTABLISHED.</b> Mira el netstat: ya aparece. Ahora pide la página.</p><button class="btn" id="tget">Enviar GET / ▸</button><p class="tmsg"></p>';
  P.querySelector('#tget').addEventListener('click',function(){this.disabled=true;var n=0;
   fly(1,'GET / · :'+SP+' → :443','dat',function seg(){n++;if(n>3){s4();return}fly(-1,'Página '+n+'/3 · :443 → :'+SP,'dat',function(){fly(1,'ACK '+n+' · confirmo','ack',seg)})})})}
 function s4(){choose('<b>Paso 4 · Llegó la página.</b> Tienes dos pestañas abiertas con el mismo tipo de servidor (HTTPS). ¿Cómo sabe tu PC que estos datos son de la pestaña de la intranet y no del correo?',['Por el puerto destino 443','Por el puerto local 51515','Por la MAC del servidor','No lo sabe: los manda a las dos'],1,
  ['Las dos conexiones van al puerto 443 remoto: eso no las distingue.','Correcto: cada pestaña tiene su propio puerto local. Correo usa 51514 e intranet 51515.','La MAC solo sirve dentro de la red local; además, sería la misma para las dos respuestas.','TCP entrega cada segmento a una sola conexión, identificada por IP y puerto de los dos lados.'],
  function(){tab.textContent='✔ intranet.netcorp.mx';tab.classList.add('done');
   P.innerHTML='<div class="twin"><b>¡Lo armaste!</b> '+(st.errs?'Con '+st.errs+' intento'+(st.errs>1?'s':'')+' fallido'+(st.errs>1?'s':'')+'. ':'Sin errores. ')+'Resumen: puerto origen al azar ('+SP+') → destino 443 por TCP; saludo SYN, SYN-ACK, ACK; datos confirmados; la respuesta vuelve a tu puerto local y así llega a la pestaña correcta.</div><button class="btnl" id="tagain">Repetir</button>';
   P.querySelector('#tagain').addEventListener('click',function(){tcp(el)})})}
 rNs();s1()}

/* ---------- ejemplos paso a paso (genérico) ---------- */
function stepper(box){var ol=box.querySelector('ol.pasos,ul.pasos');if(!ol||box.querySelector('.ejsim')||box.dataset.st)return;var li=[].slice.call(ol.children);if(li.length<3)return;box.dataset.st=1;
 var i=1;var bar=document.createElement('div');bar.className='ejnav';bar.innerHTML='<button class="btnl" data-n>Siguiente paso ▸ <span></span></button><button class="lnk" data-a>Ver todo</button>';ol.after(bar);
 function r(){li.forEach(function(x,k){x.hidden=k>=i;if(k===i-1&&i>1)x.classList.add('ejnew')});bar.querySelector('span').textContent='('+i+'/'+li.length+')';if(i>=li.length)bar.remove()}
 bar.querySelector('[data-n]').addEventListener('click',function(){i++;r()});bar.querySelector('[data-a]').addEventListener('click',function(){i=li.length;r()});r()}

/* ---------- motores genéricos ---------- */
function shell(el,title){el.innerHTML='<div class="tsim"><p class="tsh">🧪 '+(title||'Pruébalo tú')+'</p><div class="xb"></div></div>';return el.querySelector('.xb')}
function done(B,txt,again){var d=document.createElement('div');d.innerHTML='<div class="twin"><b>¡Listo!</b> '+txt+'</div><button class="btnl">Repetir</button>';B.appendChild(d);d.querySelector('button').addEventListener('click',again)}
// quiz: pasos con pregunta; cada paso puede traer contexto (html)
function quiz(el,D){var B=shell(el,D.title),i=0,errs=0;
 function step(){if(i>=D.q.length){B.innerHTML='';done(B,(errs?'Con '+errs+' error'+(errs>1?'es':'')+'. ':'Sin errores. ')+(D.end||''),function(){quiz(el,D)});return}
  var Q=D.q[i];B.innerHTML='<p class="xprog">Paso '+(i+1)+' de '+D.q.length+'</p>'+(Q.ctx?'<div class="xctx">'+Q.ctx+'</div>':'')+'<p class="tq">'+Q.q+'</p><div class="topts">'+Q.o.map(function(o,k){return'<button data-k="'+k+'">'+o+'</button>'}).join('')+'</div><p class="tmsg"></p>';
  B.querySelectorAll('[data-k]').forEach(function(b){b.addEventListener('click',function(){var k=+b.dataset.k,m=B.querySelector('.tmsg');var w=(Q.w&&Q.w[k])||'';
   if(k===Q.a){B.querySelectorAll('[data-k]').forEach(function(x){x.disabled=true});b.classList.add('ok');m.className='tmsg ok';m.innerHTML='✔ '+(Q.y||w||'Correcto.');var n=document.createElement('button');n.className='btn';n.textContent=i+1<D.q.length?'Siguiente ▸':'Terminar ▸';n.addEventListener('click',function(){i++;step()});B.appendChild(n)}
   else{errs++;b.classList.add('bad');b.disabled=true;m.className='tmsg bad';m.innerHTML='✗ '+(w||'No es así; vuelve a pensarlo.')}})})}
 step()}
// order: tocar las líneas en el orden correcto
function order(el,D){var B=shell(el,D.title),errs=0,pos=0,L=D.lines.map(function(t,i){return{t:t,i:i}}),sh=L.slice().sort(function(){return Math.random()-.5});
 B.innerHTML='<p class="tq">'+D.q+'</p><pre class="ejcli xbuilt"></pre><div class="xpool">'+sh.map(function(x){return'<button data-i="'+x.i+'">'+esc(x.t)+'</button>'}).join('')+'</div><p class="tmsg"></p>';
 var out=B.querySelector('.xbuilt'),m=B.querySelector('.tmsg');out.textContent=D.start||'';
 B.querySelectorAll('[data-i]').forEach(function(b){b.addEventListener('click',function(){var i=+b.dataset.i;
  if(i===pos||D.lines[i]===D.lines[pos]){b.disabled=true;b.classList.add('ok');out.textContent+=(out.textContent?'\n':'')+(D.prefix?D.prefix(pos):'')+D.lines[pos];m.className='tmsg ok';m.innerHTML=D.why&&D.why[pos]?'✔ '+D.why[pos]:'';pos++;
   if(pos>=D.lines.length){B.querySelector('.xpool').remove();done(B,(errs?'Con '+errs+' error'+(errs>1?'es':'')+'. ':'Orden perfecto. ')+(D.end||''),function(){order(el,D)})}}
  else{errs++;b.classList.add('bad');setTimeout(function(){b.classList.remove('bad')},500);m.className='tmsg bad';m.innerHTML='✗ '+(D.hint&&D.hint[pos]?D.hint[pos]:'Ese no va todavía. ¿Qué tiene que pasar antes?')}})})}
// sort: clasificar tarjetas en dos o más cajas
function sort(el,D){var B=shell(el,D.title),errs=0,left=D.items.length;
 B.innerHTML='<p class="tq">'+D.q+'</p><div class="xcard"></div><div class="xbk">'+D.b.map(function(t,k){return'<button data-b="'+k+'">'+t+'</button>'}).join('')+'</div><p class="tmsg"></p><div class="xres"></div>';
 var it=D.items.slice().sort(function(){return Math.random()-.5}),c=0,card=B.querySelector('.xcard'),m=B.querySelector('.tmsg'),res=B.querySelector('.xres');
 function show(){if(c>=it.length){B.querySelector('.xbk').remove();card.remove();done(B,(errs?'Con '+errs+' error'+(errs>1?'es':'')+'. ':'Todo bien clasificado. ')+(D.end||''),function(){sort(el,D)});return}card.innerHTML=it[c][0]}
 B.querySelectorAll('[data-b]').forEach(function(b){b.addEventListener('click',function(){var k=+b.dataset.b,x=it[c];if(k===x[1]){m.className='tmsg ok';m.innerHTML='✔ '+(x[2]||'');res.insertAdjacentHTML('beforeend','<span class="xchip">'+D.b[k].split(' ')[0]+' · '+x[0]+'</span>');c++;show()}else{errs++;m.className='tmsg bad';m.innerHTML='✗ '+(x[2]?'Piénsalo otra vez: '+x[2].replace(/^[^:]*:\s*/,''):'No va ahí.')}})});show()}
// bits: prende bits para formar un número, luego pregunta
function bits(el,D){var B=shell(el,D.title),v=[128,64,32,16,8,4,2,1],on=v.map(function(){return 0});
 B.innerHTML='<p class="tq">Prende los bits que suman <b>'+D.n+'</b>. Empieza por la izquierda y pregúntate: ¿cabe?</p><div class="xbits">'+v.map(function(x,i){return'<button data-i="'+i+'"><small>'+x+'</small><b>0</b></button>'}).join('')+'</div><p class="xsum"></p><p class="tmsg"></p>';
 var sum=B.querySelector('.xsum'),m=B.querySelector('.tmsg');
 function r(){var s=0;on.forEach(function(o,i){if(o)s+=v[i]});sum.innerHTML='Suma: <b>'+s+'</b> · binario <code>'+on.join('')+'</code>';
  if(s===D.n){B.querySelectorAll('.xbits button').forEach(function(b){b.disabled=true});m.className='tmsg ok';m.innerHTML='✔ '+D.n+' = <code>'+on.join('')+'</code>.';setTimeout(function(){var d=document.createElement('div');B.appendChild(d);quiz(d,{title:'Ahora en hexadecimal',q:D.after,end:D.end})},500)}else if(s>D.n){m.className='tmsg bad';m.innerHTML='Te pasaste: quita el bit más pequeño que hayas prendido de más.'}else{m.className='tmsg';m.textContent='Te faltan '+(D.n-s)+'.'}}
 B.querySelectorAll('[data-i]').forEach(function(b){b.addEventListener('click',function(){var i=+b.dataset.i;on[i]^=1;b.classList.toggle('on',!!on[i]);b.querySelector('b').textContent=on[i];r()})});r()}
// subnet: elige el prefijo
function subnet(el,D){var B=shell(el,D.title),p=27;
 B.innerHTML='<p class="tq">'+D.q+'</p><div class="xsn"><button data-d="-1">−</button><b class="xpf"></b><button data-d="1">+</button></div><table class="tns tdone xst"><tr><td>Máscara</td><td class="xm"></td></tr><tr><td>Hosts útiles</td><td class="xh"></td></tr><tr><td>¿Alcanza para '+D.need+'?</td><td class="xa"></td></tr></table><button class="btn xok">Elegir este prefijo</button><p class="tmsg"></p>';
 function mask(l){return[0,1,2,3].map(function(i){var b=Math.max(0,Math.min(8,l-i*8));return 256-Math.pow(2,8-b)}).join('.')}
 function r(){var h=Math.pow(2,32-p)-2;B.querySelector('.xpf').textContent='/'+p;B.querySelector('.xm').textContent=mask(p);B.querySelector('.xh').textContent=h;var a=B.querySelector('.xa');a.textContent=h>=D.need?'Sí':'No';a.className='xa '+(h>=D.need?'ok':'bad')}
 B.querySelectorAll('[data-d]').forEach(function(b){b.addEventListener('click',function(){p=Math.max(20,Math.min(30,p+ +b.dataset.d));r()})});
 B.querySelector('.xok').addEventListener('click',function(){var h=Math.pow(2,32-p)-2,m=B.querySelector('.tmsg');if(h<D.need){m.className='tmsg bad';m.innerHTML='✗ /'+p+' da '+h+' hosts: no alcanza para '+D.need+'. Baja el número del prefijo (más bits de host).'}else if(p!==D.best){m.className='tmsg bad';m.innerHTML='✗ Alcanza, pero desperdicias '+(h-D.need)+' direcciones. Busca la más justa.'}else{this.disabled=true;m.className='tmsg ok';m.innerHTML='✔ /'+p+' ('+mask(p)+') da '+h+' hosts: la más justa.';done(B,D.end,function(){subnet(el,D)})}});r()}
// mac: el switch aprende
function mac(el,D){var B=shell(el,D.title),T={},i=0,errs=0;
 B.innerHTML='<div class="xmac"><div><p class="tnh">Tabla MAC del switch</p><table class="tns tdone"><thead><tr><th>MAC</th><th>Puerto</th></tr></thead><tbody class="xmt"><tr><td colspan="2">(vacía)</td></tr></tbody></table></div><div class="xmq"></div></div>';
 var tb=B.querySelector('.xmt'),Q=B.querySelector('.xmq');
 function rt(){var k=Object.keys(T);tb.innerHTML=k.length?k.map(function(x){return'<tr class="new"><td>'+x+'</td><td>'+T[x]+'</td></tr>'}).join(''):'<tr><td colspan="2">(vacía)</td></tr>'}
 function step(){if(i>=D.f.length){Q.innerHTML='';done(Q,(errs?'Con '+errs+' error'+(errs>1?'es':'')+'. ':'')+D.end,function(){mac(el,D)});return}var F=D.f[i],ph=0;
  function ask(){var q=ph===0?{q:'<b>Trama '+(i+1)+':</b> '+F.d+'<br>¿Qué anota el switch en su tabla?',o:F.lo,a:F.la,w:F.lw}:{q:'¿Y por dónde la manda?',o:F.fo,a:F.fa,w:F.fw};
   Q.innerHTML='<p class="tq">'+q.q+'</p><div class="topts">'+q.o.map(function(o,k){return'<button data-k="'+k+'">'+o+'</button>'}).join('')+'</div><p class="tmsg"></p>';
   Q.querySelectorAll('[data-k]').forEach(function(b){b.addEventListener('click',function(){var k=+b.dataset.k,m=Q.querySelector('.tmsg');if(k===q.a){if(ph===0){T[F.mac]=F.port;rt()}m.className='tmsg ok';m.innerHTML='✔ '+(q.w[k]||'');Q.querySelectorAll('[data-k]').forEach(function(x){x.disabled=true});setTimeout(function(){if(ph===0){ph=1;ask()}else{i++;step()}},900)}else{errs++;b.classList.add('bad');b.disabled=true;m.className='tmsg bad';m.innerHTML='✗ '+(q.w[k]||'')}})})}
  ask()}
 rt();step()}
// diag: ejecuta comandos y diagnostica
function diag(el,D){var B=shell(el,D.title),ran={};
 B.innerHTML='<p class="tq">'+D.q+'</p><div class="xcmds">'+D.c.map(function(c,k){return'<button data-c="'+k+'">'+esc(c[0])+'</button>'}).join('')+'</div><pre class="ejcli xterm">'+esc(D.prompt||'C:\\>')+' </pre><div class="xdx"></div>';
 var t=B.querySelector('.xterm'),dx=B.querySelector('.xdx');
 B.querySelectorAll('[data-c]').forEach(function(b){b.addEventListener('click',function(){var c=D.c[+b.dataset.c];ran[+b.dataset.c]=1;b.classList.add('ok');t.textContent+=c[0]+'\n'+c[1]+'\n\n'+(D.prompt||'C:\\>')+' ';t.scrollTop=t.scrollHeight;
  if(Object.keys(ran).length>=D.min&&!dx.innerHTML){quiz(dx,{title:'¿Cuál es tu diagnóstico?',q:[D.dq],end:D.end})}})})}
// hash: reparte flujos en un LAG
function hash(el,D){var B=shell(el,D.title),fl=[],mode='l3';
 B.innerHTML='<p class="tq">'+D.q+'</p><div class="xhb"><button data-a="1">+ 1 copia de respaldo (1 conexión)</button><button data-a="8">+ respaldo con 8 conexiones</button><button data-a="u">+ 20 usuarios</button><button data-a="r">Reiniciar</button></div><label class="xhm">Hash del LAG: <select><option value="l3">IP origen/destino (capa 3)</option><option value="l4">IP + puertos (capa 4)</option></select></label><div class="xlinks"><div><b>Cable 1</b><div class="xbar"><i></i></div><span></span></div><div><b>Cable 2</b><div class="xbar"><i></i></div><span></span></div></div><p class="tmsg"></p><div class="xhq"></div>';
 var bars=B.querySelectorAll('.xlinks>div'),m=B.querySelector('.tmsg');
 function h(f){var k=f.src+'|'+f.dst+(mode==='l4'?'|'+f.sp:'');var x=0;for(var i=0;i<k.length;i++)x=(x*31+k.charCodeAt(i))>>>0;return x%2}
 function r(){var load=[0,0],n=[0,0];fl.forEach(function(f){var c=h(f);load[c]+=f.bw;n[c]++});[0,1].forEach(function(c){var pct=Math.min(100,load[c]/10);bars[c].querySelector('i').style.width=pct+'%';bars[c].querySelector('span').textContent=n[c]+' flujos · '+(load[c]/1000).toFixed(2)+' Gbps'+(load[c]>1000?' (saturado)':'')})}
 B.querySelector('select').addEventListener('change',function(){mode=this.value;r();m.className='tmsg';m.innerHTML=mode==='l4'?'Con capa 4 los puertos también cuentan: conexiones distintas entre los mismos equipos pueden ir por cables distintos.':'Con capa 3 todo lo que va entre las mismas dos IP cae en el mismo cable.'});
 B.querySelectorAll('[data-a]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.a;if(a==='r'){fl=[];r();return}
  if(a==='1')fl.push({src:'10.0.10.5',dst:'10.0.5.40',sp:50001,bw:1000});
  if(a==='8')for(var i=0;i<8;i++)fl.push({src:'10.0.10.5',dst:'10.0.5.40',sp:50100+i,bw:125});
  if(a==='u')for(var j=0;j<20;j++)fl.push({src:'10.0.10.'+(20+j),dst:'10.0.5.'+(10+j%4),sp:52000+j,bw:40});r();
  if(a==='1'&&!B.querySelector('.xhq').innerHTML)setTimeout(function(){quiz(B.querySelector('.xhq'),{title:'Entonces…',q:D.after,end:D.end})},400)})});r()}

var SIMS={tcp:tcp};
var hq;function obs(){clearTimeout(hq);hq=setTimeout(function(){window.hydrateEj(document)},80)}
if(window.MutationObserver)document.addEventListener('DOMContentLoaded',function(){new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)if(ms[i].addedNodes.length){obs();return}}).observe(document.body,{childList:true,subtree:true})});
var ENG={quiz:quiz,order:order,sort:sort,bits:bits,subnet:subnet,mac:mac,diag:diag,hash:hash};
function auto(box){if(box.dataset.ej||box.querySelector('.ejsim'))return;var h=box.querySelector('.ejh');if(!h)return;var t=h.textContent.replace(/^Ejemplo resuelto · /,'').trim(),txt=box.textContent;var D=(window.EJDATA||{})[t];if(D&&D.alt&&D.alt.test&&!D.alt.test(txt))D=(window.EJDATA||{})[t+'#2'];if(!D)return;box.dataset.ej=1;box.dataset.st=1;
 var keep=D.keep==null?1:D.keep,kids=[].slice.call(box.children).filter(function(x){return x!==h}),det=document.createElement('details');det.className='ejres';det.innerHTML='<summary>Ver la solución explicada</summary>';kids.slice(keep).forEach(function(x){det.appendChild(x)});if(D.intro){var p=document.createElement('p');p.innerHTML=D.intro;h.after(p)}var el=document.createElement('div');el.className='ejsim';box.insertBefore(el,kids[keep]?null:null);box.appendChild(el);if(det.children.length>1)box.appendChild(det);ENG[D.t](el,D)}
window.hydrateEj=function(root){(root||document).querySelectorAll('.ejsim:not([data-on])').forEach(function(el){el.dataset.on=1;var f=SIMS[el.dataset.sim];if(f)f(el)});(root||document).querySelectorAll('.ejr:not([data-ej])').forEach(auto);(root||document).querySelectorAll('.ejr:not([data-st])').forEach(stepper)};
})();
