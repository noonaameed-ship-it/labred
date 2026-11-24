/* PacketPath · Sitio 3D: cuarto de telecomunicaciones con racks, puertos y cables que el alumno conecta. */
import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {VN,pn,mkDev,IF,run,prompt,banner,prioOf,G} from './site3d-cli.js';

const COL={utp:0x2f7bf2,fibra:0xf59e0b,consola:0x7dd3fc,horiz:0x6b7280};
const CABLE={utp:'UTP (cobre)',fibra:'Fibra',consola:'Consola'};
const KIND={rj45:'puerto RJ45 de cobre',sfp:'puerto SFP para fibra',con:'puerto de consola',usb:'puerto USB',pp:'puerto del patch panel'};
const DESK={'01':'D-01 · PC-VEN1','02':'D-02 · PC-RRH1','03':'D-03 · PC-VEN2','04':'D-04 · PC-RRH2'};
const pad=n=>String(n).padStart(2,'0');
const key=(a,b)=>[a,b].sort().join('|');

/* ---------- misiones ---------- */
const FULL1=[['PP:01','ACC1:Gi0/1','utp'],['PP:02','ACC1:Gi0/2','utp'],['PP:03','ACC2:Gi0/1','utp'],['PP:04','ACC2:Gi0/2','utp']];
const FULL2=[['ACC1:Te0/1','CORE:Te0/1','fibra'],['ACC2:Te0/1','CORE:Te0/2','fibra']];
const FULL4=[['ACC1:Te0/2','CORE:Te0/3','fibra'],['ACC2:Te0/2','CORE:Te0/4','fibra']];
const CON=d=>[['LAP:USB',d+':CON','consola']];
const VV={10:'VENTAS',20:'RRHH'};
// configuración previa neutra
function preCfg(d,o){const v=d.v;if(o.host)d.host=o.host;Object.assign(d.vlans,o.vlans||{});
 for(const[g,vid]of Object.entries(o.access||{})){const i=IF(d,g);i.mode='access';i.access=vid;i.up=true;if(v==='juniper'){i.fam=true;i.mem=[d.vlans[vid]]}}
 for(const[g,[vs,nat]]of Object.entries(o.trunk||{})){const i=IF(d,g);i.mode='trunk';i.allowed=vs.slice();i.native=nat||1;i.up=true;if(v==='juniper'){i.fam=true;i.mem=vs.map(x=>d.vlans[x])}}
 for(const g of o.up||[])IF(d,g).up=true;
 for(const[vid,[ip,len]]of Object.entries(o.svi||{})){d.svi[vid]={ip,len,up:true};if(v==='juniper')d.l3[d.vlans[vid]]=+vid}
 if(o.gw)d.gw=o.gw;if(o.stp&&v==='aruba')d.stp.mode='mstp';d.saved=true}
const UP4=['Gi0/1','Gi0/2','Gi0/3','Gi0/4'];
const BASE1={host:'ACC1',vlans:VV,access:{'Gi0/1':10,'Gi0/2':20}};
const BASEC={host:'CORE',vlans:VV,trunk:{'Te0/1':[[10,20]],'Te0/2':[[10,20]],'Te0/3':[[10,20]],'Te0/4':[[10,20]]},stp:1};
const BASE2={host:'ACC2',vlans:VV,access:{'Gi0/1':10,'Gi0/2':20},trunk:{'Te0/1':[[10,20]],'Te0/2':[[10,20]]},stp:1};
const SAVE=v=>v==='juniper'?'commit':'write memory';
const SH={ifs:{cisco:'show interfaces status',aruba:'show interface brief',juniper:'show interfaces terse'},stp:{cisco:'show spanning-tree',aruba:'show spanning-tree',juniper:'show spanning-tree bridge'},lacp:{cisco:'show etherchannel summary',aruba:'show lacp interfaces',juniper:'show lacp interfaces'}};
const saveGoal=n=>({t:v=>v==='juniper'?'Aplica los cambios con commit':'Guarda la configuración ('+SAVE(v)+')',ok:D=>{const d=D[n];return d.saved&&(d.v!=='juniper'||!d.cand||JSON.stringify(d.cand)===JSON.stringify(pickCfg(d)))}});
const pickCfg=d=>{const o={};['host','vlans','ifs','lags','svi','gw','stp','aecount','l3'].forEach(k=>o[k]=d[k]);return o};
const code=a=>'<pre class="s3code">'+a.join('\n')+'</pre>';
const MIS=[
 {id:'z0',z:'Zona 0',t:'Enciende el piso',con:'ACC1',
  story:'Primer día en NetCorp. El cableado horizontal de los cuatro escritorios ya llega al patch panel (puertos 01 a 04). Lupita: "D-01 y D-02 van a ACC1, D-03 y D-04 a ACC2. Después conecta la laptop a la consola de ACC1 y revisa que los puertos estén arriba."',
  pre:[],req:FULL1.concat(CON('ACC1')),
  cfg:D=>{preCfg(D.ACC1,{host:'ACC1',up:UP4});preCfg(D.ACC2,{host:'ACC2',up:UP4});preCfg(D.CORE,{host:'CORE'})},
  goals:[{t:v=>'En la consola de ACC1, revisa el estado de los puertos con '+SH.ifs[v],ok:D=>!!D.ACC1.ran.ifs}],
  hints:[v=>'Los patch cords son de cobre (UTP): 01 y 02 a los primeros puertos de ACC1; 03 y 04 a los de ACC2 (el switch de abajo en el IDF). Luego, con el cable de consola, une el USB de la laptop con el puerto CON de ACC1.',
   v=>v==='cisco'?'En Cisco entras en modo usuario (>). Usa enable y luego el show que lista los puertos con su estado.':v==='aruba'?'En Aruba ya entras con privilegios (#). Usa el show que resume las interfaces.':'En Junos estás en modo operativo (>). Usa el show que lista las interfaces en formato corto.',
   v=>code(v==='cisco'?['enable','show interfaces status']:[SH.ifs[v]])+'Busca que los puertos de los escritorios digan <b>connected</b> / <b>up</b>.'],
  done:'Los cuatro escritorios tienen enlace y lo comprobaste desde la consola: así se verifica la capa física.'},
 {id:'z1',z:'Zona 1',t:'Switch nuevo para VENTAS',con:'ACC1',
  story:'ACC1 llegó de fábrica. Lupita: "Ponle nombre ACC1, crea la VLAN 10 VENTAS y la 20 RRHH, deja el escritorio D-01 en VENTAS y D-02 en RRHH, y guarda. Sin IP todavía: entra por consola."',
  pre:FULL1,req:CON('ACC1'),
  cfg:D=>{preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  goals:[{t:()=>'Nombre del equipo: ACC1',ok:D=>D.ACC1.host.toUpperCase()==='ACC1'},
   {t:()=>'VLAN 10 VENTAS y VLAN 20 RRHH',ok:D=>G.vlan(D.ACC1,10,'VENTAS')&&G.vlan(D.ACC1,20,'RRHH')},
   {t:v=>pn(v,'Gi0/1')+' (D-01) en acceso a la VLAN 10'+(v==='aruba'?', encendido':''),ok:D=>G.access(D.ACC1,'Gi0/1',10)},
   {t:v=>pn(v,'Gi0/2')+' (D-02) en acceso a la VLAN 20'+(v==='aruba'?', encendido':''),ok:D=>G.access(D.ACC1,'Gi0/2',20)},saveGoal('ACC1')],
  hints:[v=>'Orden de trabajo: nombre, VLAN con su nombre, puertos de acceso y guardar. Un switch sin guardar pierde todo al reiniciar.',
   v=>v==='cisco'?'Comandos: enable, configure terminal, hostname, vlan / name, interface g0/1, switchport mode access, switchport access vlan, write memory.':v==='aruba'?'Comandos: configure terminal, hostname, vlan / name, interface 1/1/1, no shutdown (en Aruba los puertos vienen apagados), vlan access, write memory.':'Comandos: configure, set system host-name, set vlans NOMBRE vlan-id, set interfaces … family ethernet-switching interface-mode access y vlan members, commit.',
   v=>code(v==='cisco'?['enable','configure terminal','hostname ACC1','vlan 10',' name VENTAS','vlan 20',' name RRHH','interface g0/1',' switchport mode access',' switchport access vlan 10','interface g0/2',' switchport mode access',' switchport access vlan 20','end','write memory']:v==='aruba'?['configure terminal','hostname ACC1','vlan 10','  name VENTAS','vlan 20','  name RRHH','interface 1/1/1','  no shutdown','  vlan access 10','interface 1/1/2','  no shutdown','  vlan access 20','end','write memory']:['configure','set system host-name ACC1','set vlans VENTAS vlan-id 10','set vlans RRHH vlan-id 20','set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access','set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members VENTAS','set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access','set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members RRHH','commit'])],
  done:'ACC1 tiene nombre, VLAN y puertos de acceso, y la configuración quedó guardada.',go:['#lab-1','Seguir practicando en el simulador']},
 {id:'z2',z:'Zona 2',t:'IP de gestión para ACC1',con:'ACC1',
  story:'Beto no quiere bajar al cuarto cada vez que hay que revisar ACC1. "Dale una IP de gestión en la VLAN 99 (GESTION): 192.168.99.11 con máscara /24, y el gateway 192.168.99.1. Así entramos por SSH desde el NOC."',
  pre:FULL1,req:CON('ACC1'),
  cfg:D=>{preCfg(D.ACC1,BASE1);preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  goals:[{t:()=>'VLAN 99 con nombre GESTION',ok:D=>G.vlan(D.ACC1,99,'GESTION')},
   {t:v=>(v==='juniper'?'irb.99':'Interfaz vlan 99')+' con 192.168.99.11/24'+(v==='cisco'?' y encendida':v==='juniper'?' y ligada a la VLAN (l3-interface)':''),ok:D=>G.svi(D.ACC1,99,'192.168.99.11',24)},
   {t:v=>'Gateway por defecto 192.168.99.1'+(v==='cisco'?' (ip default-gateway)':' (ruta 0.0.0.0/0)'),ok:D=>D.ACC1.gw==='192.168.99.1'},saveGoal('ACC1')],
  hints:[v=>'Un switch de capa 2 solo necesita una IP para administrarse: va en una interfaz virtual de la VLAN de gestión. /24 es lo mismo que 255.255.255.0.',
   v=>v==='cisco'?'Crea la VLAN 99, entra a interface vlan 99, pon ip address con máscara completa y no shutdown; el gateway va en modo global con ip default-gateway.':v==='aruba'?'Crea la VLAN 99, entra a interface vlan 99 y pon la IP con prefijo (/24); el gateway es una ruta: ip route 0.0.0.0/0.':'Crea la VLAN, pon la IP en irb unit 99, liga la VLAN con l3-interface irb.99 y agrega la ruta estática por defecto.',
   v=>code(v==='cisco'?['enable','configure terminal','vlan 99',' name GESTION','interface vlan 99',' ip address 192.168.99.11 255.255.255.0',' no shutdown','exit','ip default-gateway 192.168.99.1','end','write memory']:v==='aruba'?['configure terminal','vlan 99','  name GESTION','interface vlan 99','  ip address 192.168.99.11/24','exit','ip route 0.0.0.0/0 192.168.99.1','end','write memory']:['configure','set vlans GESTION vlan-id 99','set interfaces irb unit 99 family inet address 192.168.99.11/24','set vlans GESTION l3-interface irb.99','set routing-options static route 0.0.0.0/0 next-hop 192.168.99.1','commit'])],
  done:'ACC1 ya se puede administrar por la red. La consola queda para emergencias.'},
 {id:'z3',z:'Zona 3',t:'Uplink trunk al CORE',con:'ACC1',
  story:'Los escritorios de VENTAS y RRHH no llegan al resto de la red. Beto: "Pon la fibra de ACC1 Te0/1 al CORE Te0/1 (y la de ACC2 al CORE Te0/2). Luego configura en ACC1 el uplink como trunk: solo VLAN 10 y 20, y nativa 999 (NATIVA), que nadie usa."',
  pre:FULL1,req:FULL2.concat(CON('ACC1')),
  cfg:D=>{preCfg(D.ACC1,BASE1);preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  goals:[{t:()=>'VLAN 999 con nombre NATIVA',ok:D=>G.vlan(D.ACC1,999,'NATIVA')},
   {t:v=>pn(v,'Te0/1')+' en trunk solo con VLAN 10 y 20',ok:D=>G.trunk(D.ACC1,'Te0/1',[10,20])&&D.ACC1.ifs['Te0/1'].allowed.every(x=>[10,20,999].includes(x))},
   {t:v=>pn(v,'Te0/1')+' con VLAN nativa 999',ok:D=>G.trunk(D.ACC1,'Te0/1',[10,20],999)},saveGoal('ACC1')],
  hints:[v=>'Los SFP solo aceptan fibra. En el trunk se limitan las VLAN permitidas y se cambia la nativa a una VLAN sin uso, por seguridad (contra VLAN hopping).',
   v=>v==='cisco'?'En la interfaz te0/1: switchport mode trunk, switchport trunk allowed vlan y switchport trunk native vlan.':v==='aruba'?'El uplink es 1/1/25. Enciéndelo y usa vlan trunk native y vlan trunk allowed (la VLAN 999 debe existir).':'El uplink es xe-0/1/0: interface-mode trunk, vlan members [ VENTAS RRHH ] y native-vlan-id 999 (a nivel de interfaz).',
   v=>code(v==='cisco'?['enable','configure terminal','vlan 999',' name NATIVA','interface te0/1',' switchport mode trunk',' switchport trunk allowed vlan 10,20',' switchport trunk native vlan 999','end','write memory']:v==='aruba'?['configure terminal','vlan 999','  name NATIVA','interface 1/1/25','  no shutdown','  vlan trunk native 999','  vlan trunk allowed 10,20','end','write memory']:['configure','set vlans NATIVA vlan-id 999','set interfaces xe-0/1/0 unit 0 family ethernet-switching interface-mode trunk','set interfaces xe-0/1/0 unit 0 family ethernet-switching vlan members [ VENTAS RRHH ]','set interfaces xe-0/1/0 native-vlan-id 999','commit'])],
  done:'El uplink lleva solo las VLAN necesarias y la nativa ya no es la 1.',go:['#lab-3','Practicar trunks en el simulador']},
 {id:'z4',z:'Zona 4',t:'El CORE como root bridge',con:'CORE',
  story:'Pusiste un segundo uplink por redundancia y ahora hay bucles físicos: Spanning Tree bloquea un cable. Pero el root bridge quedó en ACC2, el switch más viejo (MAC más baja). Lupita: "Cablea los segundos uplinks y haz al CORE root de las VLAN 10 y 20."',
  pre:FULL1.concat(FULL2),req:FULL4.concat(CON('CORE')),
  cfg:D=>{preCfg(D.ACC1,{...BASE1,trunk:{'Te0/1':[[10,20]],'Te0/2':[[10,20]]},stp:1});preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  goals:[{t:v=>v==='cisco'?'Spanning Tree en modo rapid-pvst':v==='aruba'?'Spanning Tree activado':'RSTP activo (ya viene en Junos)',ok:D=>D.CORE.v==='cisco'?D.CORE.stp.mode==='rapid-pvst':D.CORE.v==='aruba'?D.CORE.stp.mode!=='off':true},
   {t:()=>'El CORE es root de las VLAN 10 y 20 (prioridad menor a 32768)',ok:D=>[10,20].every(v=>prioOf(D.CORE,v)<32768)},
   {t:v=>'Comprueba quién es root con '+SH.stp[v],ok:D=>!!D.CORE.ran.stp&&[10,20].every(v=>prioOf(D.CORE,v)<32768)},saveGoal('CORE')],
  hints:[v=>'Gana el root el switch con menor bridge ID: primero la prioridad y, si empatan, la MAC más baja. Por eso ganó ACC2. Baja la prioridad del CORE.',
   v=>v==='cisco'?'spanning-tree mode rapid-pvst y spanning-tree vlan 10,20 priority 4096 (múltiplos de 4096).':v==='aruba'?'Activa spanning-tree y usa spanning-tree priority 1 (en Aruba se multiplica por 4096).':'set protocols rstp bridge-priority 4k y commit.',
   v=>code(v==='cisco'?['enable','configure terminal','spanning-tree mode rapid-pvst','spanning-tree vlan 10,20 priority 4096','end','show spanning-tree','write memory']:v==='aruba'?['configure terminal','spanning-tree','spanning-tree priority 1','end','show spanning-tree','write memory']:['configure','set protocols rstp bridge-priority 4k','commit','run show spanning-tree bridge'])],
  done:'El CORE es el root: el tráfico sigue el camino corto y el cable bloqueado queda donde tú decidiste.',go:['#lab-4','Practicar Spanning Tree en el simulador']},
 {id:'z5',z:'Zona 5',t:'LAG de ACC1 al CORE',con:'ACC1',
  story:'Con STP, uno de los dos uplinks de ACC1 está bloqueado sin hacer nada. Beto: "El CORE ya tiene su lado listo con LACP activo. Junta en ACC1 los dos uplinks (Te0/1 y Te0/2, hoy de fábrica) en un LAG con LACP y pásale las VLAN 10 y 20."',
  pre:FULL1.concat(FULL2,FULL4),req:CON('ACC1'),
  cfg:D=>{preCfg(D.ACC1,BASE1);preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  goals:[{t:v=>pn(v,'Te0/1')+' y '+pn(v,'Te0/2')+' en el mismo LAG con LACP'+(v==='juniper'?' (con device-count)':v==='aruba'?' (lag encendido)':''),ok:D=>G.lag(D.ACC1,['Te0/1','Te0/2'])!=null},
   {t:()=>'El LAG en trunk con VLAN 10 y 20',ok:D=>G.lagTrunk(D.ACC1,['Te0/1','Te0/2'],[10,20])},
   {t:v=>'Comprueba los dos miembros con '+SH.lacp[v],ok:D=>!!D.ACC1.ran.lacp&&G.lag(D.ACC1,['Te0/1','Te0/2'])!=null},saveGoal('ACC1')],
  hints:[v=>'Un LAG junta los dos cables en un enlace lógico: STP deja de bloquear y se usan los dos. Las VLAN se configuran en la interfaz del LAG, no en los puertos.',
   v=>v==='cisco'?'interface range te0/1 - 2 con channel-group 1 mode active; luego interface port-channel 1 en trunk.':v==='aruba'?'Crea interface lag 1 (no shutdown, lacp mode active, trunk) y mete 1/1/25 y 1/1/26 con lag 1.':'device-count en chassis, ether-options 802.3ad ae0 en xe-0/1/0 y xe-0/1/1, lacp active y el trunk en ae0.',
   v=>code(v==='cisco'?['enable','configure terminal','interface range te0/1 - 2',' channel-group 1 mode active','exit','interface port-channel 1',' switchport mode trunk',' switchport trunk allowed vlan 10,20','end','show etherchannel summary','write memory']:v==='aruba'?['configure terminal','interface lag 1','  no shutdown','  lacp mode active','  vlan trunk native 1','  vlan trunk allowed 10,20','interface 1/1/25','  no shutdown','  lag 1','interface 1/1/26','  no shutdown','  lag 1','end','show lacp interfaces','write memory']:['configure','set chassis aggregated-devices ethernet device-count 1','set interfaces xe-0/1/0 ether-options 802.3ad ae0','set interfaces xe-0/1/1 ether-options 802.3ad ae0','set interfaces ae0 aggregated-ether-options lacp active','set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk','set interfaces ae0 unit 0 family ethernet-switching vlan members [ VENTAS RRHH ]','commit','run show lacp interfaces'])],
  done:'Dos cables, un enlace lógico: más capacidad y si se corta uno, el piso ni lo nota.',go:['#lab-5','Practicar LAG en el simulador']},
 {id:'t1',z:'Troubleshooting',t:'Ticket: alguien movió cables',
  story:'Ticket #8812: "Después de la limpieza del cuarto, D-02 y D-03 no tienen red y todo el piso de ACC2 está aislado." Encuentra los cables mal puestos, quítalos y deja todo como estaba documentado.',
  pre:'ticket',req:FULL1.concat(FULL2,FULL4),goals:[],
  cfg:D=>{preCfg(D.ACC1,BASE1);preCfg(D.ACC2,BASE2);preCfg(D.CORE,BASEC)},
  hints:[()=>'Compara cada cable con la documentación de la lista de tareas. Toca un cable para ver sus extremos y quitarlo.',()=>'Revisa el patch panel: un patch cord quedó en el switch equivocado y otro en un puerto que no es el suyo.',()=>'En la fibra: a ACC2 le falta un uplink y dos uplinks quedaron cruzados en los puertos del CORE (Te0/1 es de ACC1, Te0/2 de ACC2).'],
  done:'Ticket cerrado. Así se diagnostica la capa 1: lo documentado contra lo que hay de verdad.'}
];
function ticketPre(){const r=FULL1.concat(FULL2,FULL4).map(x=>x.slice());
 r[1]=['PP:02','ACC1:Gi0/12','utp'];r[2]=['PP:03','ACC1:Gi0/3','utp'];
 r.splice(r.findIndex(x=>x[0]==='ACC2:Te0/1'),1);
 const i=r.findIndex(x=>x[0]==='ACC2:Te0/2');r[i]=['ACC2:Te0/2','CORE:Te0/1','fibra'];
 const j=r.findIndex(x=>x[1]==='CORE:Te0/1'&&x[0]==='ACC1:Te0/1');r[j]=['ACC1:Te0/1','CORE:Te0/2','fibra'];
 return r}

/* ---------- progreso ---------- */
const prog={get(){try{if(window.PP3D)return window.PP3D.get();return JSON.parse(localStorage.getItem('pp3d')||'{}')}catch(e){return{}}},
 set(id,stars){try{if(window.PP3D)return window.PP3D.done(id,stars);const p=this.get();p[id]=Math.max(p[id]||0,stars);localStorage.setItem('pp3d',JSON.stringify(p))}catch(e){}}};

let S=null;
const getV=()=>{try{return localStorage.getItem('pp3dv')||'cisco'}catch(e){return'cisco'}};
export function unmount(){if(!S)return;S.alive=false;cancelAnimationFrame(S.raf);S.ro&&S.ro.disconnect();S.renderer&&S.renderer.dispose();S=null}

export function mount(view,start){
 unmount();
 const done=prog.get();
 view.innerHTML=`<header class="band hero"><div class="in"><p class="crumb"><a href="#mapa">Mi red</a> / <a href="#arena">arena</a> / sitio 3D</p><h1>Labs 3D: el cuarto de telecom</h1><p>Un lab por zona. Llevas los cables (patch cords, fibra y consola) y configuras el switch por consola en Cisco, Aruba o Juniper. Gira con un dedo, acerca con dos y toca un equipo para verlo de cerca.</p></div></header>
 <div class="s3w"><div class="s3main"><div class="s3stage" id="s3stage"><canvas id="s3c" aria-label="Cuarto de telecomunicaciones en 3D"></canvas><div class="s3lbl" id="s3lbl"></div>
  <div class="s3bar s3top"><div class="s3seg" role="group" aria-label="Tipo de cable">${Object.entries(CABLE).map(([k,t])=>`<button data-cab="${k}" class="${k==='utp'?'on':''}"><i style="background:#${COL[k].toString(16).padStart(6,'0')}"></i>${t}</button>`).join('')}</div>
  <div class="s3seg" role="group" aria-label="Vista"><button data-cam="all">Cuarto</button><button data-cam="mdf">MDF</button><button data-cam="idf">IDF</button><button data-cam="desk">Escritorios</button></div></div>
  <div class="s3bar s3bot"><p id="s3msg">Elige el tipo de cable y toca un puerto para tomar el cable. Luego toca (o arrastra hasta) el otro puerto.</p><button class="btnl" id="s3del" hidden>Quitar cable</button><button class="btnl" id="s3cancel" hidden>Soltar cable</button><button class="btn" id="s3open" hidden>Abrir consola</button></div>
  <div class="s3con" id="s3con" hidden><div class="s3ch"><span id="s3ct">PuTTY</span><button id="s3tk" class="btnl">Tareas</button><button id="s3hb" class="btnl">💡 Pistas</button><button id="s3x" class="btnl">Volver al cuarto</button></div><div class="s3cb"><div class="s3term"><div class="s3out" id="s3out"></div><label class="s3in"><span id="s3pr"></span><input id="s3cmd" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Comando"></label></div><div class="s3hp" id="s3hp" hidden></div><div class="s3hp" id="s3tp" hidden></div></div></div></div></div>
 <aside class="s3side"><div class="card"><p class="tid">Fabricante de los switches</p><div class="s3seg s3ven">${Object.entries(VN).map(([k,t])=>`<button data-ven="${k}" class="${k===getV()?'on':''}">${t.split(' ')[0]}</button>`).join('')}</div><p class="tid" style="margin-top:12px">Misiones</p><div class="s3mis" id="s3mis">${MIS.map((m,i)=>`<button data-m="${i}"><span>${m.z}</span>${m.t}<em>${done[m.id]?'★'.repeat(done[m.id])+'☆'.repeat(3-done[m.id]):''}</em></button>`).join('')}</div></div>
 <div class="card" id="s3task"></div></aside></div>`;
 const stage=view.querySelector('#s3stage'),canvas=view.querySelector('#s3c'),msg=view.querySelector('#s3msg');
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false})}catch(e){stage.innerHTML='<p style="padding:20px">Tu navegador no tiene WebGL activado, así que no puede mostrar el sitio 3D. Prueba con Chrome, Edge o Safari actualizados.</p>';return}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const dark=matchMedia('(prefers-color-scheme: dark)').matches&&document.documentElement.dataset.theme!=='light'||document.documentElement.dataset.theme==='dark';
 const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x0b1312:0xdfe7e5);
 const cam=new THREE.PerspectiveCamera(45,1,0.05,60);
 const ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI*0.49;ctl.minDistance=0.35;ctl.maxDistance=9;ctl.target.set(0.4,1.3,0);
 scene.add(new THREE.HemisphereLight(0xffffff,dark?0x1a2624:0x8a9a96,dark?1.6:1.9));
 const dl=new THREE.DirectionalLight(0xffffff,dark?1.9:1.7);dl.position.set(2,4,5);scene.add(dl);const fl2=new THREE.PointLight(0xbfeee6,dark?6:4,6,1.5);fl2.position.set(0,2.3,1.6);scene.add(fl2);
 S={alive:true,renderer,scene,cam,ctl,ports:{},cables:[],cab:'utp',carry:null,sel:null,mis:null,hint:0,anim:null,labels:[]};
 const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.15,...o});
 const box=(w,h,d,m,x,y,z,par)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(par||scene).add(b);return b};
 // cuarto
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(14,10),mat(dark?0x16201f:0xc9d3d1,{roughness:.95}));fl.rotation.x=-Math.PI/2;scene.add(fl);
 const grid=new THREE.GridHelper(14,28,dark?0x2a3a38:0xaab6b3,dark?0x1e2b29:0xbfc9c6);grid.position.y=.002;scene.add(grid);
 box(14,4,.1,mat(dark?0x13201e:0xe9efed),0,2,-1.2);box(.1,4,10,mat(dark?0x111c1b:0xe3eae8),-3.2,2,0);
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
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.012),mat(kind==='sfp'?0x8b949b:kind==='con'?0x2563eb:kind==='usb'?0x334155:0x0d1114,{metalness:kind==='sfp'?.6:.1}));
  m.position.set(x,y,0);par.add(m);
  const led=new THREE.Mesh(new THREE.BoxGeometry(.01,.006,.004),new THREE.MeshBasicMaterial({color:0x223}));led.position.set(x-w*.3,y+(h/2+.007)*(y>=0?1:-1),.004);if(kind!=='pp'&&kind!=='usb')par.add(led);
  const P={id:dev+':'+id,dev,name:id,kind,mesh:m,led,label:label||id};m.userData.port=P;S.ports[P.id]=P;pickables.push(m);return P}
 function sw(name,par,y){const g=new THREE.Group();g.position.set(0,y,.42);par.add(g);
  const body=box(1.06,.09,.6,mat(name==='CORE'?0x23384a:0x24323a,{metalness:.4}),0,0,-.31,g);body.userData.dev=name;pickables.push(body);
  box(1.06,.09,.006,mat(name==='CORE'?0x2d4a63:0x30434d),0,0,0,g);
  for(let n=1;n<=24;n++){const col=(n-1)>>1,row=(n-1)%2;port(name,'Gi0/'+n,'rj45',-.36+col*.042+Math.floor(col/6)*.018,row?-.02:.021,g)}
  for(let n=1;n<=4;n++)port(name,'Te0/'+n,'sfp',.25+((n-1)>>1)*.062,(n-1)%2?-.02:.021,g);
  port(name,'CON','con',-.47,.0,g);
  const nm=lbl(name,'dv');S.labels.push({el:nm,p:null,obj:g,off:new THREE.Vector3(-.42,.085,0)});devs[name]=g;return g}
 const mdf=rack(-.75,'MDF'),idf=rack(.75,'IDF');
 sw('CORE',mdf,1.62);
 box(1.06,.09,.5,mat(0x2a2f33),0,1.46,.15,mdf);box(1.06,.18,.55,mat(0x202426),0,.3,.12,mdf);// firewall y UPS de adorno
 S.labels.push({el:lbl('Firewall','dc'),p:new THREE.Vector3(-1.37,1.46,.42)},{el:lbl('UPS','dc'),p:new THREE.Vector3(-1.37,.3,.42)});
 {const g=new THREE.Group();g.position.set(0,1.86,.42);idf.add(g);const b=box(1.06,.09,.12,mat(0x2b2f33,{metalness:.4}),0,0,-.06,g);b.userData.dev='PP';pickables.push(b);
  for(let n=1;n<=24;n++){const P=port('PP',pad(n),'pp',-.42+(n-1)*.036+Math.floor((n-1)/6)*.012,0,g,'Puerto '+pad(n)+(DESK[pad(n)]?' → escritorio '+DESK[pad(n)]:''))}
  S.labels.push({el:lbl('Patch panel','dv'),p:null,obj:g,off:new THREE.Vector3(-.42,.085,0)});devs.PP=g}
 box(1.06,.07,.2,mat(0x15181a),0,1.745,.33,idf);// organizador
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
 view.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>{const v=VIEWS[b.dataset.cam];fly(v[0],v[1])}));
 view.querySelectorAll('[data-cab]').forEach(b=>b.addEventListener('click',()=>{S.cab=b.dataset.cab;view.querySelectorAll('[data-cab]').forEach(x=>x.classList.toggle('on',x===b));if(S.carry){say(`Cambiaste a cable ${CABLE[S.cab]}. Vuelve a tomarlo del puerto.`);drop()}}));
 // ---------- cables ----------
 const pw=p=>{const v=new THREE.Vector3();p.mesh.getWorldPosition(v);return v};
 const out=p=>{const q=new THREE.Quaternion();p.mesh.getWorldQuaternion(q);return new THREE.Vector3(0,0,1).applyQuaternion(q)};
 function curve(a,da,b,db){const a1=a.clone().addScaledVector(da,.14),b1=b?b.clone().addScaledVector(db,.14):null;
  if(!b){return new THREE.CatmullRomCurve3([a,a1,a1.clone().lerp(a1,.5)])}
  const h=Math.hypot(a.x-b.x,a.z-b.z)+Math.abs(a.y-b.y)*.3,my=Math.max(.04,Math.min(a.y,b.y)-.06-.22*h);
  const m=a1.clone().lerp(b1,.5);m.y=my;m.z=Math.max(m.z,Math.max(a1.z,b1.z));return new THREE.CatmullRomCurve3([a,a1,m,b1,b],false,'centripetal')}
 function tube(c,type,r){return new THREE.Mesh(new THREE.TubeGeometry(c,64,r||(type==='fibra'?.007:.009),8),new THREE.MeshStandardMaterial({color:COL[type],roughness:.55,emissive:COL[type],emissiveIntensity:.08}))}
 function addCable(a,b,type){const A=S.ports[a],B=S.ports[b];const m=tube(curve(pw(A),out(A),pw(B),out(B)),type);scene.add(m);const c={a,b,type,mesh:m};m.userData.cable=c;S.cables.push(c);A.cable=c;B.cable=c;
  for(const P of[A,B]){const pl=new THREE.Mesh(new THREE.BoxGeometry(P.kind==='sfp'?.04:.03,P.kind==='sfp'?.024:.022,.04),new THREE.MeshStandardMaterial({color:type==='fibra'?0x1d4ed8:type==='consola'?0x7dd3fc:0x93c5fd,transparent:type==='utp',opacity:.85}));pl.position.copy(P.mesh.position);pl.position.z+=.022;P.mesh.parent.add(pl);(c.plugs=c.plugs||[]).push(pl)}
  leds();return c}
 function rmCable(c){scene.remove(c.mesh);c.mesh.geometry.dispose();(c.plugs||[]).forEach(p=>p.parent.remove(p));S.ports[c.a].cable=null;S.ports[c.b].cable=null;S.cables=S.cables.filter(x=>x!==c);leds()}
 function leds(){for(const P of Object.values(S.ports))P.led.material.color.setHex(P.cable?0x22c55e:0x1b2027)}
 // ---------- reglas ----------
 function why(A,B,t){const ks=[A.kind,B.kind].sort().join('+');
  if(A===B)return'Es el mismo puerto.';
  if(A.dev===B.dev&&A.dev!=='PP')return'Conectar un switch consigo mismo crea un bucle. Elige un puerto de otro equipo.';
  if(ks==='pp+pp')return'Dos puertos del patch panel no se conectan entre sí: el patch cord va del patch panel al switch.';
  if(/con|usb/.test(ks)){if(ks!=='con+usb')return A.kind==='usb'||B.kind==='usb'?'La laptop se conecta al puerto CON de un switch, con cable de consola.':'El puerto CON es de administración: va a la laptop con cable de consola, no a la red.';if(t!=='consola')return'Para consola se usa el cable de consola (celeste), no '+CABLE[t]+'.';return''}
  if(ks==='sfp+sfp')return t==='fibra'?'':'Los puertos SFP llevan un transceptor y fibra óptica. Cambia el cable a Fibra.';
  if(/sfp/.test(ks))return'Un puerto SFP de fibra no se conecta con un puerto RJ45 de cobre. Une SFP con SFP (fibra) o RJ45 con RJ45 (UTP).';
  return t==='utp'?'':'Los puertos RJ45 y el patch panel son de cobre: usa cable UTP.'}
 function startOk(P,t){if(P.kind==='sfp'&&t!=='fibra')return'Ese es un '+KIND.sfp+'. Elige el cable de Fibra primero.';if((P.kind==='rj45'||P.kind==='pp')&&t!=='utp')return'Ese es un '+KIND[P.kind]+'. Elige el cable UTP primero.';if((P.kind==='con'||P.kind==='usb')&&t!=='consola')return'Ese es un '+KIND[P.kind]+'. Elige el cable de Consola primero.';return''}
 const pname=P=>(P.dev==='PP'?'Patch panel '+P.name:P.dev==='LAP'?'Laptop USB':P.kind==='con'?P.dev+' consola (CON)':P.dev+' '+pn(S.V,P.name));
 const say=(t,k)=>{msg.textContent=t;msg.className=k||''};
 // ---------- interacción ----------
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let down=null;
 function hit(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
  const objs=pickables.concat(S.cables.map(c=>c.mesh));const h=ray.intersectObjects(objs,false)[0];if(h&&h.object.userData.port)return h.object;
  let best=null,bd=e.pointerType==='touch'?26:14;const v=new THREE.Vector3();for(const P of Object.values(S.ports)){P.mesh.getWorldPosition(v);if(v.distanceTo(cam.position)>4.5)continue;v.project(cam);if(v.z>1)continue;const dx=(v.x+1)/2*r.width-(e.clientX-r.left),dy=(1-v.y)/2*r.height-(e.clientY-r.top),dd=Math.hypot(dx,dy);if(dd<bd){bd=dd;best=P.mesh}}
  if(best&&!(h&&h.object.userData.cable&&bd>8))return best;return h?h.object:null}
 function grab(P){const err=startOk(P,S.cab);if(err){say(err,'bad');sfx('bad');return}
  if(P.cable){selCable(P.cable);return}
  S.carry={P,mesh:null};say(`Llevas un cable ${CABLE[S.cab]} desde ${pname(P)}. Toca el puerto de destino.`);view.querySelector('#s3cancel').hidden=false;sfx('tap')}
 function drop(){if(S.carry&&S.carry.mesh){scene.remove(S.carry.mesh);S.carry.mesh.geometry.dispose()}S.carry=null;view.querySelector('#s3cancel').hidden=true}
 function finish(P){const A=S.carry.P;if(P.cable&&P!==A){say(pname(P)+' ya tiene un cable. Quítalo primero si quieres cambiarlo.','bad');sfx('bad');return}
  const err=why(A,P,S.cab);if(err){say(err,'bad');sfx('bad');return}
  drop();addCable(A.id,P.id,S.cab);say(`Conectado: ${pname(A)} ↔ ${pname(P)} (${CABLE[S.cab]}).`,'ok');sfx('ok');check();if(S.cab==='consola')setTimeout(openCon,450)}
 function selCable(c){S.sel=c;S.cables.forEach(x=>x.mesh.material.emissiveIntensity=x===c?.9:.08);view.querySelector('#s3del').hidden=!c;if(c)say(`Cable ${CABLE[c.type]}: ${pname(S.ports[c.a])} ↔ ${pname(S.ports[c.b])}.`)}
 view.querySelector('#s3del').addEventListener('click',()=>{if(!S.sel)return;if(S.sel.type==='consola')closeCon();rmCable(S.sel);say('Cable quitado.');selCable(null);check()});
 view.querySelector('#s3cancel').addEventListener('click',()=>{drop();say('Soltaste el cable.')});
 canvas.addEventListener('pointerdown',e=>{const o=hit(e);down={x:e.clientX,y:e.clientY,o,t:performance.now()};if(o&&o.userData.port&&!S.carry){ctl.enabled=false;grab(o.userData.port);if(S.carry)S.carry.drag=true}},{capture:true});
 canvas.addEventListener('pointermove',e=>{if(!S.carry){if(e.pointerType==='mouse'){const o=hit(e);canvas.style.cursor=o&&(o.userData.port||o.userData.cable||o.userData.dev)?'pointer':'grab';if(o&&o.userData.port&&!down){const P=o.userData.port;say(`${pname(P)} · ${P.label!==P.name?P.label+' · ':''}${KIND[P.kind]}${P.cable?' · conectado':''}`)}}return}
  const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
  const o=hit(e);let tp;if(o&&o.userData.port)tp=pw(o.userData.port).add(out(o.userData.port).multiplyScalar(.05));else{const A=pw(S.carry.P),pl=new THREE.Plane(new THREE.Vector3(0,0,1),-(A.z+.25));tp=new THREE.Vector3();if(!ray.ray.intersectPlane(pl,tp))return}
  const A=S.carry.P,c=new THREE.CatmullRomCurve3([pw(A),pw(A).addScaledVector(out(A),.12),tp]);
  if(S.carry.mesh){scene.remove(S.carry.mesh);S.carry.mesh.geometry.dispose()}S.carry.mesh=tube(c,S.cab);scene.add(S.carry.mesh)});
 canvas.addEventListener('pointerup',e=>{const d=down;down=null;ctl.enabled=true;if(!d)return;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y)>8;const o=hit(e);
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
 const env={cabled:(dev,g)=>{const P=S.ports[dev+':'+g];return!!(P&&P.cable)},get devs(){return[S.D.CORE,S.D.ACC1,S.D.ACC2]},lagPeerOk:(d,g,m)=>m==='active'||m==='passive'};
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
 function rHints(){const m=S.mis;hp.innerHTML='<p class="tid">💡 Pistas</p>'+m.hints.map((h,i)=>`<div class="s3hl"><b>Pista ${i+1}</b>${i<S.hint?`<div>${h(S.V)}</div>`:i===S.hint?`<button class="btnl" data-h="${i}">Ver pista ${i+1}</button>`:'<div class="small">Se abre después de la anterior.</div>'}</div>`).join('')+'<p class="small">Cada pista después de la primera quita una estrella.</p>';
  hp.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{S.hint++;rHints();check(true)}))}
 function rTasks(){tp.innerHTML='<p class="tid">Tareas</p>'+task.querySelector('.s3tl').outerHTML;const t=task.querySelectorAll('.s3tl li'),ok=task.querySelectorAll('.s3tl li.ok').length;view.querySelector('#s3tk').textContent=`Tareas ${ok}/${t.length}`}
 function load(i){const m=MIS[i];S.mis=m;S.hint=0;drop();selCable(null);closeCon();cout.innerHTML='';for(const c of S.cables.slice())rmCable(c);
  S.D={CORE:mkDev('CORE',S.V),ACC1:mkDev('ACC1',S.V),ACC2:mkDev('ACC2',S.V)};m.cfg&&m.cfg(S.D);
  (m.pre==='ticket'?ticketPre():m.pre).forEach(([a,b,t])=>addCable(a,b,t));
  view.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));S.won=false;
  say('Misión: '+m.t+'. '+(m.req.length>1||!m.con?'Elige el cable y toca un puerto.':'Conecta la laptop a la consola de '+m.con+'.'));check(true);
  const fv=m.id==='z0'?'idf':'all';fly(VIEWS[fv][0],VIEWS[fv][1])}
 function check(silent){const m=S.mis;if(!m)return;const have=new Map(S.cables.map(c=>[key(c.a,c.b),c]));
  const need=new Set(m.req.concat(m.pre==='ticket'?[]:m.pre).map(([a,b])=>key(a,b)));
  const rows=m.req.map(([a,b,t])=>{const c=have.get(key(a,b)),ok=c&&c.type===t;return{ok,txt:`🔌 ${pname(S.ports[a])} → ${pname(S.ports[b])}`+(S.ports[a].dev==='PP'?` <span class="small">(${DESK[a.slice(3)]||''})</span>`:'')+` · ${CABLE[t]}`}});
  const cabOk=rows.every(r=>r.ok);
  const grows=(m.goals||[]).map(g=>({ok:cabOk&&g.ok(S.D),txt:'⌨️ '+esc(g.t(S.V))}));
  const extra=S.cables.filter(c=>!need.has(key(c.a,c.b)));
  const win=cabOk&&grows.every(r=>r.ok)&&!extra.length;
  openB.hidden=!conDev()||!con.hidden;if(conDev())openB.textContent='Abrir consola de '+conDev();
  task.innerHTML=`<p class="tid">${m.z} · misión · ${VN[S.V]}</p><h3>${m.t}</h3><p>${m.story}</p><ul class="s3tl">${rows.concat(grows).map(r=>`<li class="${r.ok?'ok':''}">${r.ok?'✓':'○'} ${r.txt}</li>`).join('')}${extra.map(c=>`<li class="bad">✗ Sobra o está mal: ${pname(S.ports[c.a])} ↔ ${pname(S.ports[c.b])}</li>`).join('')}</ul>
  <div class="s3h">${m.hints.map((h,i)=>i<S.hint?`<div><b>Pista ${i+1}:</b> ${h(S.V)}</div>`:'').join('')}${S.hint<3&&!win?`<button class="btnl" id="s3hint">Ver pista ${S.hint+1} de 3</button>`:''}</div>
  ${win?`<div class="s3win"><b>¡Misión cumplida!</b> ${'★'.repeat(3-Math.min(S.hint,2))}${'☆'.repeat(Math.min(S.hint,2))}<p>${m.done}</p>${m.go?`<a class="btn" href="${m.go[0]}">${m.go[1]}</a>`:''}${MIS.indexOf(m)<MIS.length-1?`<button class="btnl" id="s3next">Siguiente misión</button>`:''}</div>`:''}`;
  const hb=task.querySelector('#s3hint');if(hb)hb.addEventListener('click',()=>{S.hint++;check(true);if(!hp.hidden)rHints()});
  const nb=task.querySelector('#s3next');if(nb)nb.addEventListener('click',()=>load(MIS.indexOf(m)+1));
  if(!con.hidden)rTasks();
  if(win&&!S.won&&!silent){S.won=true;const stars=3-Math.min(S.hint,2);prog.set(m.id,stars);sfx('win');say('¡Misión cumplida! '+m.done,'ok');
   if(!con.hidden)print([{t:'[tutor] ✔ ¡Misión cumplida! '+m.done,c:'win'}]);
   const b=view.querySelector(`[data-m="${MIS.indexOf(m)}"] em`);if(b){const st=Math.max(stars,prog.get()[m.id]||0);b.textContent='★'.repeat(st)+'☆'.repeat(3-st)}}}
 view.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>load(+b.dataset.m)));
 view.querySelectorAll('[data-ven]').forEach(b=>b.addEventListener('click',()=>{S.V=b.dataset.ven;try{localStorage.setItem('pp3dv',S.V)}catch(e){}view.querySelectorAll('[data-ven]').forEach(x=>x.classList.toggle('on',x===b));load(MIS.indexOf(S.mis))}));
 const si=MIS.findIndex(m=>m.id===start),first=MIS.findIndex(m=>!done[m.id]);load(si>=0?si:first<0?0:first);if(si>=0)setTimeout(()=>stage.scrollIntoView({block:'start',behavior:'smooth'}),300);
 // ---------- ciclo ----------
 const fit=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
 S.ro=new ResizeObserver(fit);S.ro.observe(stage);fit();
 const v3=new THREE.Vector3();
 function loop(){if(!S||!S.alive)return;S.raf=requestAnimationFrame(loop);if(!view.classList.contains('on')){unmount();return}
  if(S.anim){const k=Math.min(1,(performance.now()-S.anim.t0)/650),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;cam.position.lerpVectors(S.anim.p0,S.anim.p1,e);ctl.target.lerpVectors(S.anim.t0v,S.anim.t1,e);if(k>=1)S.anim=null}
  ctl.update();renderer.render(scene,cam);
  const w=stage.clientWidth,h=stage.clientHeight,d=cam.position.distanceTo(ctl.target);
  for(const L of S.labels){if(L.obj){L.obj.getWorldPosition(v3);if(L.off)v3.add(L.off)}else v3.copy(L.p);const dist=cam.position.distanceTo(v3);v3.project(cam);
   const vis=v3.z<1&&Math.abs(v3.x)<1.05&&Math.abs(v3.y)<1.05&&!(L.el.classList.contains('dc')&&d>4);L.el.style.display=vis?'':'none';if(vis)L.el.style.transform=`translate(${(v3.x+1)/2*w}px,${(1-v3.y)/2*h}px) translate(-50%,-50%)`;L.el.style.opacity=dist>7?.6:1}}
 loop();
 window.__s3={xy(id){const P=S.ports[id];const v=pw(P);v.project(cam);const r=canvas.getBoundingClientRect();return[r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]},focus:focusDev,cables:()=>S.cables.map(c=>[c.a,c.b,c.type]),cmd(l){cin.value=l;cin.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))},load,tasks:()=>task.innerText,hint3:i=>MIS[i].hints[2](S.V),req:i=>MIS[i].req,open:openCon,out:()=>cout.innerText};
}
