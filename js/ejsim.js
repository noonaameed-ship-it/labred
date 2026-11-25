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

var SIMS={tcp:tcp};
var hq;function obs(){clearTimeout(hq);hq=setTimeout(function(){window.hydrateEj(document)},80)}
if(window.MutationObserver)document.addEventListener('DOMContentLoaded',function(){new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)if(ms[i].addedNodes.length){obs();return}}).observe(document.body,{childList:true,subtree:true})});
window.hydrateEj=function(root){(root||document).querySelectorAll('.ejsim:not([data-on])').forEach(function(el){el.dataset.on=1;var f=SIMS[el.dataset.sim];if(f)f(el)});(root||document).querySelectorAll('.ejr:not([data-st])').forEach(stepper)};
})();
