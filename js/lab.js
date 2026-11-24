/* PacketPath: simulador de consola (Cisco IOS, Aruba AOS-CX, Juniper Junos) y vista 3D */
{
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const VEND={
  cisco:{label:'Cisco IOS',pc:'GigabitEthernet0/1',up:'GigabitEthernet0/24',pcS:'Gi0/1',upS:'Gi0/24',phys:{pc:1,up:24},color:0x3c5a78},
  aruba:{label:'Aruba AOS-CX',pc:'1/1/1',up:'1/1/24',pcS:'1/1/1',upS:'1/1/24',phys:{pc:1,up:24},color:0xc9cfd5},
  juniper:{label:'Juniper Junos',pc:'ge-0/0/1',up:'ge-0/0/23',pcS:'ge-0/0/1',upS:'ge-0/0/23',phys:{pc:2,up:24},color:0x2b2e33}
};
const ports=v=>{const a=[];for(let i=1;i<=24;i++)a.push(v==='cisco'?'GigabitEthernet0/'+i:v==='aruba'?'1/1/'+i:'ge-0/0/'+(i-1));return a};
const shortIf=n=>n.replace('GigabitEthernet','Gi');
function normIf(v,s){
  s=String(s).trim();
  if(v==='cisco'){const m=s.match(/^(g[a-z]*)(\d+\/\d+)$/i);if(!m||!'gigabitethernet'.startsWith(m[1].toLowerCase()))return null;const n='GigabitEthernet'+m[2];return ports(v).includes(n)?n:null}
  if(v==='juniper')s=s.replace(/\.0$/,'');
  return ports(v).includes(s)?s:null;
}
const parseList=s=>{const o=[];for(const p of s.split(',')){const m=p.match(/^(\d+)(?:-(\d+))?$/);if(!m)return null;const a=+m[1],b=+(m[2]||m[1]);for(let i=a;i<=b&&i<=4094;i++)o.push(i)}return [...new Set(o)].sort((a,b)=>a-b)};
const rangeStr=arr=>{const a=[...new Set(arr)].sort((x,y)=>x-y),o=[];for(let i=0;i<a.length;i++){let j=i;while(a[j+1]===a[j]+1)j++;o.push(j>i?a[i]+'-'+a[j]:''+a[i]);i=j}return o.join(',')};
const allows=(i,id)=>i.allowed==='all'||i.allowed.includes(id);
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- devices ---------- */
function mkSwitch(name,vendor){
  const sw={type:'sw',name,host:name,vendor,lines:[],hist:[],hp:0,ctx:{}};
  sw.mode={cisco:'user',aruba:'priv',juniper:'op'}[vendor];
  if(vendor==='juniper'){sw.act={vlans:{default:{id:1}},ifs:{}};sw.cand=clone(sw.act)}
  else{sw.vlans={1:vendor==='cisco'?'default':'DEFAULT_VLAN_1'};sw.ifs={};
    for(const n of ports(vendor))sw.ifs[n]=vendor==='cisco'?{mode:'dynamic',access:1,allowed:'all',native:1,up:true,desc:''}:{mode:'access',access:1,allowed:[],native:1,up:false,desc:''}}
  tut(sw,`${name} · ${VEND[vendor].label} · consola simulada. Escribe ? para ver comandos.`);
  return sw;
}
const mkPC=(name,ip,peer)=>{const p={type:'pc',name,ip,len:24,gw:ip.replace(/\d+$/,'1'),peer,lines:[],hist:[],hp:0};tut(p,`${name} · ${ip}/24 · comandos: ping, ipconfig, cls${SC.kind!=='l2'?', netsh':''}`);return p};
let S1,S2,PCA,PCB,devs,cur,done=false,busy=false;
let SC={kind:'l2',vid:10,name:'VENTAS',exam:false};
const L3=()=>SC.kind==='l3';
const NET=()=>'192.168.'+SC.vid+'.';
const LS={err:0,hints:new Set(),fails:0,t0:Date.now(),paste:0};window.LAB_STATS=LS;
const labScore=()=>Math.max(0,100-10*LS.hints.size-5*LS.fails);window.LAB_SCORE=labScore;
function reset(){if(TP()){buildT(topoDef(SC.topo,SC.seed,SC.vend));devs=[...T.sws,...T.pcs];S1=T.sws[0];S2=T.sws[1];done=false;LS.err=0;LS.hints=new Set();LS.fails=0;LS.t0=Date.now();LS.paste=0;$('#done').classList.remove('show');cur=null;select(T.sws[0]);return}S1=mkSwitch('SW1',$('#v1').value);S2=mkSwitch('SW2',$('#v2').value);if(L3()){preL2(S1);preL2(S2);PCA=mkPC('PC-A',NET()+'11',NET()+'3');PCB=mkPC('PC-B','192.168.'+(SC.vid+100)+'.12',NET()+'2');PCB.gw='192.168.'+(SC.vid+100)+'.1'}else{PCA=mkPC('PC-A',NET()+'11',NET()+'12');PCB=mkPC('PC-B',NET()+'12',NET()+'11')}devs=[S1,S2,PCA,PCB];done=false;LS.err=0;LS.hints=new Set();LS.fails=0;LS.t0=Date.now();LS.paste=0;$('#done').classList.remove('show');select(cur?devs.find(d=>d.name===cur.name):S1)}
/* Autoguardado del lab en práctica: sobrevive a recargar la página o salir y volver */
const LKEY=()=>'labred_lab_'+(window.LABRED_UID||'')+'_'+(TP()?SC.topo:SC.kind);
function saveLab(){if(SC.exam||!S1)return;try{if(done){localStorage.removeItem(LKEY());return}if(TP()){localStorage.setItem(LKEY(),JSON.stringify({seed:SC.seed,T,cur:cur&&cur.name,LS:{err:LS.err,hints:[...LS.hints],fails:LS.fails,t0:LS.t0,paste:LS.paste}}));return}localStorage.setItem(LKEY(),JSON.stringify({vid:SC.vid,name:SC.name,S1,S2,PCA,PCB,cur:cur&&cur.name,LS:{err:LS.err,hints:[...LS.hints],fails:LS.fails,t0:LS.t0,paste:LS.paste}}))}catch(e){}}
function loadLab(){if(SC.exam)return false;try{const o=JSON.parse(localStorage.getItem(LKEY())||'null');if(TP()){if(!o||o.seed!==SC.seed||!o.T)return false;T=o.T;devs=[...T.sws,...T.pcs];S1=T.sws[0];S2=T.sws[1];done=false;Object.assign(LS,o.LS,{hints:new Set(o.LS.hints||[])});$('#done').classList.remove('show');select(devs.find(d=>d.name===o.cur)||T.sws[0]);return true}if(!o||o.vid!==SC.vid||o.name!==SC.name||!o.S1)return false;
  S1=o.S1;S2=o.S2;PCA=o.PCA;PCB=o.PCB;devs=[S1,S2,PCA,PCB];done=false;$('#v1').value=S1.vendor;$('#v2').value=S2.vendor;
  Object.assign(LS,o.LS,{hints:new Set(o.LS.hints||[])});$('#done').classList.remove('show');select(devs.find(d=>d.name===o.cur)||S1);return true}catch(e){return false}}
const clearLab=()=>{try{localStorage.removeItem(LKEY())}catch(e){}};
const other=sw=>sw===S1?S2:S1;
function push(d,t,c){if(SC.exam){t=(Array.isArray(t)?t:[t]).filter(x=>!(x&&typeof x==='object'&&x.c==='tut')&&!(typeof x==='string'&&c==='tut'));if(c==='tut')return}(Array.isArray(t)?t:[t]).forEach(x=>d.lines.push(typeof x==='object'?x:{t:x,c}));if(d.lines.length>600)d.lines.splice(0,d.lines.length-600)}
const tut=(d,t)=>push(d,'[tutor] '+t,'tut');

/* ---------- effective state (vendor-agnostic) ---------- */
function eff(sw){
  if(sw.vendor!=='juniper')return{vlans:sw.vlans,ifs:sw.ifs};
  const a=sw.act,ids={},vl={};
  for(const[n,v]of Object.entries(a.vlans))if(v.id){ids[n]=v.id;vl[v.id]=n}
  const ifs={};
  for(const n of ports('juniper')){const c=a.ifs[n]||{};const up=!c.disable;
    if(!c.es){ifs[n]={up,mode:'access',access:1,allowed:[],native:1};continue}
    const mode=c.mode||'access';const m=(c.members||[]).map(x=>/^\d+$/.test(x)?+x:x==='all'?'all':ids[x]).filter(x=>x!==undefined);
    ifs[n]={up,mode,access:mode==='access'?(m[0]||1):1,allowed:m.includes('all')?'all':m.filter(x=>x!=='all'),native:c.native||1}}
  return{vlans:vl,ifs};
}
function linkUp(sw,n){if(TP())return tLinkUp(sw,n);const v=VEND[sw.vendor];if(!eff(sw).ifs[n]?.up)return false;if(n===v.pc)return true;if(n===v.up){const o=other(sw);return !!eff(o).ifs[VEND[o.vendor].up].up}return false}
/* ---------- Lab 2: capa 3 (SVI, IP de las PCs) ---------- */
function preL2(sw){const V=SC.vid,N=SC.name,v=VEND[sw.vendor];
  if(sw.vendor==='juniper'){sw.act.vlans[N]={id:V};sw.act.ifs[v.pc]={es:true,mode:'access',members:[N]};sw.act.ifs[v.up]={es:true,mode:'trunk',members:[N]};sw.cand=clone(sw.act)}
  else{sw.vlans[V]=N;Object.assign(sw.ifs[v.pc],{mode:'access',access:V,up:true});Object.assign(sw.ifs[v.up],{mode:'trunk',allowed:[V],native:1,up:true})}
  tut(sw,`La capa 2 ya está lista: VLAN ${V} (${N}), puerto de la PC en access y trunk hacia el otro switch. Tu trabajo es la IP.`)}
const ip2n=ip=>ip.split('.').reduce((a,b)=>a*256+(+b),0);
const isIP=s=>/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s)&&s.split('.').every(x=>+x<=255);
const mask2len=m=>{if(!isIP(m))return null;const b=ip2n(m).toString(2).padStart(32,'0');return/^1*0*$/.test(b)?b.indexOf('0')<0?32:b.indexOf('0'):null};
const len2mask=l=>[0,1,2,3].map(i=>{const b=Math.max(0,Math.min(8,l-8*i));return 256-Math.pow(2,8-b)}).join('.');
const sameNet=(a,b,len)=>len===0||Math.floor(ip2n(a)/Math.pow(2,32-len))===Math.floor(ip2n(b)/Math.pow(2,32-len));
function svis(sw){if(sw.vendor!=='juniper')return Object.values(sw.ifs).filter(i=>i.svi).map(i=>({vid:i.vid,ip:i.ip,len:i.len,up:!!(i.up&&i.ip&&sw.vlans[i.vid])}));
  const a=sw.act,o=[];for(const[u,c]of Object.entries(a.irb||{})){const vl=Object.values(a.vlans).find(v=>v.l3==='irb.'+u),ad=c.addr&&c.addr.split('/');o.push({vid:vl?vl.id:+u,ip:ad?ad[0]:null,len:ad?+ad[1]:null,up:!!(ad&&vl)})}return o}
const sviOf=sw=>svis(sw).find(x=>x.up&&x.vid===SC.vid);
function l2c(sw){const e=eff(sw),v=VEND[sw.vendor],p=e.ifs[v.pc],u=e.ifs[v.up],V=SC.vid;return{pc:p.up&&p.mode==='access'&&p.access===V&&!!e.vlans[V],up:u.up&&u.mode==='trunk'&&allows(u,V)&&!!e.vlans[V]}}
function endpoints(){const t=l2c(S1).up&&l2c(S2).up&&linkUp(S1,VEND[S1.vendor].up),o=[];
  if(PCA)o.push({dev:PCA,ip:PCA.ip,len:PCA.len,side:l2c(S1).pc?1:0});if(PCB)o.push({dev:PCB,ip:PCB.ip,len:PCB.len,side:l2c(S2).pc?2:0});
  for(const[sw,n]of[[S1,1],[S2,2]]){const x=sviOf(sw);if(x)o.push({dev:sw,ip:x.ip,len:x.len,side:n})}return{o,t}}
function reach(dev,ip){const{o,t}=endpoints(),src=o.find(e=>e.dev===dev);if(!src)return{ok:false,why:'nosrc'};if(ip===src.ip)return{ok:true};
  if(!sameNet(src.ip,ip,src.len))return{ok:false,why:'offnet'};const dst=o.find(e=>e.ip===ip&&e.dev!==dev);if(!dst||!src.side||!dst.side)return{ok:false,why:'nohost'};
  if(src.side!==dst.side&&!t)return{ok:false,why:'nol2'};if(!sameNet(dst.ip,src.ip,dst.len))return{ok:false,why:'noreply'};return{ok:true}}
function swPing(sw,ip){const x=TP()?svis(sw).find(s=>s.up):sviOf(sw),r=x?(TP()?reachT(sw,ip):reach(sw,ip)):{ok:false},n=sw.vendor==='juniper'?4:5;
  if(sw.vendor==='cisco')return['Type escape sequence to abort.',`Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`,{t:(r.ok?'!':'.').repeat(5),c:r.ok?'okl':'err'},`Success rate is ${r.ok?100:0} percent (${r.ok?5:0}/5)${r.ok?', round-trip min/avg/max = 1/1/2 ms':''}`].concat(x?[]:[{t:'[tutor] Este switch todavía no tiene una SVI con IP encendida en la VLAN '+SC.vid+'.',c:'tut'}]);
  if(sw.vendor==='aruba')return[`PING ${ip} (${ip}) 100(128) bytes of data.`,...(r.ok?[1,2,3,4,5].map(i=>({t:`108 bytes from ${ip}: icmp_seq=${i} ttl=64 time=0.${400+i*37} ms`,c:'okl'})):[]),'',`--- ${ip} ping statistics ---`,{t:`5 packets transmitted, ${r.ok?5:0} received, ${r.ok?0:100}% packet loss`,c:r.ok?'okl':'err'}].concat(x?[]:[{t:'[tutor] Este switch todavía no tiene una SVI con IP en la VLAN '+SC.vid+'.',c:'tut'}]);
  return[`PING ${ip} (${ip}): 56 data bytes`,...[0,1,2,3].map(i=>r.ok?{t:`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=1.${200+i*31} ms`,c:'okl'}:{t:`Request timeout for icmp_seq ${i}`,c:'err'}),'',`--- ${ip} ping statistics ---`,`4 packets transmitted, ${r.ok?4:0} packets received, ${r.ok?0:100}% packet loss`].concat(x?[]:[{t:'[tutor] Este switch todavía no tiene una irb con IP ligada a la VLAN '+SC.name+'.',c:'tut'}])}
const SVIHINT=(sw,n)=>{const V=SC.vid,N=SC.name,ip=NET()+n;return{cisco:`enable\nconfigure terminal\ninterface vlan ${V}\n ip address ${ip} 255.255.255.0\n no shutdown`,aruba:`configure terminal\ninterface vlan ${V}\n ip address ${ip}/24`,juniper:`configure\nset interfaces irb unit ${V} family inet address ${ip}/24\nset vlans ${N} l3-interface irb.${V}\ncommit`}[sw.vendor]};
const PCHINT=()=>`netsh interface ip set address "Ethernet0" static ${NET()}12 255.255.255.0 ${NET()}1`;
function checks(){if(TP())return tChecks();
  if(L3()){const r=[];for(const[sw,n]of[[S1,'2'],[S2,'3']]){const x=sviOf(sw);r.push({who:sw,k:'svi',t:`Interfaz VLAN ${SC.vid} (SVI) con IP ${NET()}${n}/24, encendida`,ok:!!x&&x.ip===NET()+n&&x.len===24,hint:SVIHINT(sw,n)})}
    r.push({who:PCB,k:'pcip',t:`IP de PC-B en la red de su VLAN: ${NET()}12, máscara 255.255.255.0`,ok:PCB.ip===NET()+'12'&&PCB.len===24,hint:PCHINT()});return r}
  const r=[];
  for(const sw of[S1,S2]){const e=eff(sw),v=VEND[sw.vendor],p=e.ifs[v.pc],u=e.ifs[v.up];
    const V=SC.vid,H=HINTF()[sw.vendor];r.push({who:sw,k:'vlan',t:`VLAN ${V} creada con nombre ${SC.name}`,ok:!!e.vlans[V]&&e.vlans[V].toUpperCase()===SC.name,hint:H.vlan});
    r.push({who:sw,k:'pc',t:`${v.pcS} hacia la PC: acceso, VLAN ${V}, encendido`,ok:p.up&&p.mode==='access'&&p.access===V&&!!e.vlans[V],hint:H.pc});
    r.push({who:sw,k:'up',t:`${v.upS} hacia el otro switch: trunk que permite la VLAN ${V}`,ok:u.up&&u.mode==='trunk'&&allows(u,V)&&!!e.vlans[V],hint:H.up})}
  return r;
}
const allOk=()=>TP()?tAllOk():L3()?checks().every(c=>c.ok)&&reach(PCB,NET()+'2').ok:checks().every(c=>c.ok)&&linkUp(S1,VEND[S1.vendor].up);
const HINTF=()=>{const V=SC.vid,N=SC.name;return{
  cisco:{vlan:`enable\nconfigure terminal\nvlan ${V}\n name ${N}`,pc:`interface g0/1\n switchport mode access\n switchport access vlan ${V}`,up:`interface g0/24\n switchport mode trunk`},
  aruba:{vlan:`configure terminal\nvlan ${V}\n name ${N}`,pc:`interface 1/1/1\n no shutdown\n vlan access ${V}`,up:`interface 1/1/24\n no shutdown\n vlan trunk allowed ${V}`},
  juniper:{vlan:`configure\nset vlans ${N} vlan-id ${V}\ncommit`,pc:`set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access\nset interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members ${N}\ncommit`,up:`set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk\nset interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members ${N}\ncommit`}}};

/* ---------- command tables (Cisco / Aruba) ---------- */
const TY={ip:s=>isIP(s),mask:s=>mask2len(s)!==null,cidr:s=>{const m=s.match(/^([\d.]+)\/(\d{1,2})$/);return!!m&&isIP(m[1])&&+m[2]<=32},svi:s=>/^vlan\d+$/i.test(s)&&+s.slice(4)>=1&&+s.slice(4)<=4094,vid:s=>/^\d+$/.test(s)&&+s>=1&&+s<=4094,word:s=>s.length>0,vlist:s=>!!parseList(s),arange:s=>/^1\/1\/\d+-(1\/1\/)?\d+(,1\/1\/\d+(-(1\/1\/)?\d+)?)*$/.test(s),if:(s,v)=>!!normIf(v,s)};
const linkMsg=(n,up)=>up?[`%LINK-3-UPDOWN: Interface ${n}, changed state to up`,`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${n}, changed state to up`]:[`%LINK-5-CHANGED: Interface ${n}, changed state to administratively down`];
const cIf=sw=>sw.ifs[sw.ctx.if];
const C_SHOW=[['show running-config interface <if>',(sw,[i])=>xRunIf(sw,normIf('cisco',i))],['show interfaces <if>',(sw,[i])=>xIfDetail(sw,normIf('cisco',i))],['show interfaces <if> switchport',(sw,[i])=>xSwitchport(sw,normIf('cisco',i))],['show interfaces <if> status',(sw,[i])=>{const n=normIf('cisco',i);const r=cShowStatus(sw);return r.slice(0,2).concat(r.filter(l=>l.startsWith(shortIf(n)+' ')))}],['show interfaces <if> trunk',(sw,[i])=>{const s=shortIf(normIf('cisco',i));const r=cShowTrunk(sw);return r.filter(l=>typeof l!=='string'||!/^Gi/.test(l)||l.startsWith(s+' '))}],
 ['show interfaces description',sw=>xIfDesc(sw)],['show mac address-table',sw=>xMac(sw)],['show mac address-table dynamic',sw=>xMac(sw)],['show mac address-table vlan <vid>',(sw,[v])=>xMac(sw,{vlan:+v})],['show mac address-table interface <if>',(sw,[i])=>xMac(sw,{port:normIf('cisco',i)})],['show mac-address-table',sw=>xMac(sw)],
 ['show vlan id <vid>',(sw,[v])=>{const r=cShowVlan(sw),row=r.find(l=>l.startsWith(v+' ')&&!/^100[2-5]/.test(l));return row?r.slice(0,3).concat([row]):['VLAN id '+v+' not found in current VLAN database']}],['show vlan name <word>',(sw,[n])=>{const r=cShowVlan(sw),row=r.find(l=>l.slice(5,38).trim().toUpperCase()===n.toUpperCase());return row?r.slice(0,3).concat([row]):['VLAN '+n+' not found in current VLAN database']}],
 ['show cdp neighbors',sw=>xCdp(sw)],['show lldp neighbors',sw=>sw.lldp?xLldp(sw):[{t:'% LLDP is not enabled',c:'err'},{t:'[tutor] En Cisco LLDP viene apagado. Se activa en configuración global con: lldp run',c:'tut'}]],['show version',sw=>xVer(sw)],['show startup-config',sw=>sw.startup||['startup-config is not present']],['show spanning-tree',()=>[{t:'[tutor] Spanning Tree se ve a fondo en la Zona 4. Aquí todavía no hay enlaces redundantes.',c:'tut'}]],['show spanning-tree vlan <vid>',()=>[{t:'[tutor] Spanning Tree se ve a fondo en la Zona 4. Aquí todavía no hay enlaces redundantes.',c:'tut'}]],
 ['ping <ip>',(sw,[ip])=>swPing(sw,ip)],['show ip interface brief',sw=>ipBrief(sw)],['show vlan brief',sw=>cShowVlan(sw)],['show vlan',sw=>cShowVlan(sw)],['show interfaces trunk',sw=>cShowTrunk(sw)],['show interfaces status',sw=>cShowStatus(sw)],['show running-config',sw=>cRun(sw)]];
const CIS={
  user:[['enable',sw=>{sw.mode='priv'}],['exit',()=>{}],...C_SHOW],
  priv:[['configure terminal',sw=>{sw.mode='config';return['Enter configuration commands, one per line.  End with CNTL/Z.']}],['disable',sw=>{sw.mode='user'}],['write',sw=>{sw.startup=cRun(sw).slice(2);return['Building configuration...','[OK]']}],['write memory',sw=>{sw.startup=cRun(sw).slice(2);return['Building configuration...','[OK]']}],['copy running-config startup-config',sw=>{sw.startup=cRun(sw).slice(2);return['Destination filename [startup-config]? ','Building configuration...','[OK]']}],['exit',sw=>{sw.mode='user'}],...C_SHOW],
  config:[['vlan <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])sw.vlans[id]='VLAN'+String(id).padStart(4,'0');sw.ctx.vlan=id;sw.mode='config-vlan'}],
    ['no vlan <vid>',(sw,[id])=>{id=+id;if(id===1)return['%Default VLAN 1 may not be deleted.'];delete sw.vlans[id]}],
    ['interface <if>',(sw,[i])=>{delete sw.ctx.range;sw.ctx.if=normIf('cisco',i);sw.mode='config-if'}],
    ['interface range <rest>',(sw,[r])=>{const L=xRange('cisco',r);if(!L)return[{t:"% Invalid input detected at '^' marker.",c:'err'},{t:'[tutor] Ejemplo: interface range g0/1 - 4  (o g0/1-4, g0/10)',c:'tut'}];sw.ctx.range=L;sw.ctx.if=L[0];sw.mode='config-if'}],
    ['lldp run',sw=>{sw.lldp=true}],['no lldp run',sw=>{sw.lldp=false}],
    ['interface vlan <vid>',(sw,[id])=>enterSvi(sw,+id)],['interface <svi>',(sw,[x])=>enterSvi(sw,+x.slice(4))],
    ['hostname <word>',(sw,[h])=>{sw.host=h}],['end',sw=>{sw.mode='priv'}],['exit',sw=>{sw.mode='priv'}],
    ['do <rest>',(sw,[r])=>{const m=sw.mode;sw.mode='priv';const o=runTable(sw,r);sw.mode=m;return o}]],
  'config-vlan':[['name <word>',(sw,[n])=>{sw.vlans[sw.ctx.vlan]=n}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]],
  'config-if':[['switchport mode access',sw=>{cIf(sw).mode='access'}],['switchport mode trunk',sw=>{cIf(sw).mode='trunk'}],
    ['switchport access vlan <vid>',(sw,[id])=>{id=+id;cIf(sw).access=id;if(!sw.vlans[id]){sw.vlans[id]='VLAN'+String(id).padStart(4,'0');return['% Access VLAN does not exist. Creating vlan '+id]}}],
    ['no switchport access vlan',sw=>{cIf(sw).access=1}],
    ['switchport trunk allowed vlan <vlist>',(sw,[l])=>{cIf(sw).allowed=parseList(l)}],
    ['switchport trunk allowed vlan add <vlist>',(sw,[l])=>{const i=cIf(sw);if(i.allowed!=='all')i.allowed=[...new Set(i.allowed.concat(parseList(l)))].sort((a,b)=>a-b)}],
    ['switchport trunk allowed vlan remove <vlist>',(sw,[l])=>{const i=cIf(sw),rm=parseList(l);const base=i.allowed==='all'?parseList('1-4094'):i.allowed;i.allowed=base.filter(x=>!rm.includes(x))}],
    ['switchport trunk allowed vlan all',sw=>{cIf(sw).allowed='all'}],['switchport trunk allowed vlan none',sw=>{cIf(sw).allowed=[]}],
    ['switchport trunk native vlan <vid>',(sw,[id])=>{cIf(sw).native=+id}],['switchport trunk encapsulation dot1q',()=>{}],
    ['shutdown',sw=>{const i=cIf(sw);if(i.up){i.up=false;return linkMsg(sw.ctx.if,false)}}],
    ['no shutdown',sw=>{const i=cIf(sw);if(!i.up){i.up=true;if(i.svi)return linkMsg(sw.ctx.if,true);if(linkUp(sw,sw.ctx.if))return linkMsg(sw.ctx.if,true)}}],
    ['ip address <ip> <mask>',(sw,[ip,m])=>{const i=cIf(sw);if(!i.svi)return[{t:'% IP addresses may not be configured on L2 links.',c:'err'},{t:'[tutor] En un switch de capa 2 la IP va en la interfaz vlan (SVI), no en el puerto físico.',c:'tut'}];i.ip=ip;i.len=mask2len(m)}],
    ['ip address <cidr>',()=>[{t:'% Invalid input detected.',c:'err'},{t:'[tutor] En Cisco IOS la máscara se escribe completa: ip address '+NET()+'2 255.255.255.0',c:'tut'}]],
    ['no ip address',sw=>{const i=cIf(sw);if(i.svi){i.ip=null;i.len=null}}],
    ['description <rest>',(sw,[d])=>{cIf(sw).desc=d}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]]
};
const A_SHOW=[['show running-config interface <if>',(sw,[i])=>xRunIf(sw,normIf('aruba',i))],['show running-config current-context',sw=>sw.mode==='config-if'&&!cIf(sw).svi?xRunIf(sw,sw.ctx.if):aRun(sw)],['show interface <if>',(sw,[i])=>xIfDetail(sw,normIf('aruba',i))],['show vlan <vid>',(sw,[v])=>{const r=aShowVlan(sw),row=r.find(l=>l.startsWith(v+' '));return row?r.slice(0,4).concat([row]):['VLAN '+v+' does not exist.']}],
 ['show mac-address-table',sw=>xMac(sw)],['show mac-address-table vlan <vid>',(sw,[v])=>xMac(sw,{vlan:+v})],['show lldp neighbor-info',sw=>xLldp(sw)],['show version',sw=>xVer(sw)],['show startup-config',sw=>sw.startup||['No saved configuration.']],['show interface description',sw=>xIfDesc(sw)],
 ['ping <ip>',(sw,[ip])=>swPing(sw,ip)],['show ip interface brief',sw=>ipBrief(sw)],['show vlan',sw=>aShowVlan(sw)],['show interface brief',sw=>aShowBrief(sw)],['show running-config',sw=>aRun(sw)]];
const ARU={
  priv:[['configure terminal',sw=>{sw.mode='config'}],['write memory',sw=>{sw.startup=aRun(sw);return['Copying configuration: [Success]']}],['copy running-config startup-config',sw=>{sw.startup=aRun(sw);return['Copying configuration: [Success]']}],['exit',()=>{}],...A_SHOW],
  config:[['vlan <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])sw.vlans[id]='VLAN'+id;sw.ctx.vlan=id;sw.mode='config-vlan'}],
    ['no vlan <vid>',(sw,[id])=>{id=+id;if(id===1)return['VLAN 1 no se puede borrar.'];delete sw.vlans[id]}],
    ['interface <if>',(sw,[i])=>{delete sw.ctx.range;sw.ctx.if=normIf('aruba',i);sw.mode='config-if'}],
    ['interface <arange>',(sw,[r])=>{const L=xRange('aruba',r);if(!L)return[{t:'Invalid input: '+r,c:'err'}];sw.ctx.range=L;sw.ctx.if=L[0];sw.mode='config-if'}],
    ['interface vlan <vid>',(sw,[id])=>enterSvi(sw,+id)],['interface <svi>',(sw,[x])=>enterSvi(sw,+x.slice(4))],
    ['hostname <word>',(sw,[h])=>{sw.host=h}],['end',sw=>{sw.mode='priv'}],['exit',sw=>{sw.mode='priv'}],...A_SHOW],
  'config-vlan':[['name <word>',(sw,[n])=>{sw.vlans[sw.ctx.vlan]=n}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]],
  'config-if':[['no shutdown',sw=>{cIf(sw).up=true}],['shutdown',sw=>{cIf(sw).up=false}],
    ['ip address <cidr>',(sw,[c])=>{const i=cIf(sw);if(!i.svi)return[{t:'Invalid input: ip',c:'err'},{t:'[tutor] En este lab la IP va en la interfaz vlan (SVI), no en el puerto físico.',c:'tut'}];const[a,l]=c.split('/');i.ip=a;i.len=+l}],
    ['ip address <ip> <mask>',()=>[{t:'Invalid input: '+'mask',c:'err'},{t:'[tutor] En Aruba AOS-CX la IP se escribe con prefijo: ip address '+NET()+'2/24',c:'tut'}]],
    ['no ip address',sw=>{const i=cIf(sw);if(i.svi){i.ip=null;i.len=null}}],
    ['vlan access <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])return[{t:`[tutor] La VLAN ${id} no existe en este switch. Créala primero con "vlan ${id}".`,c:'tut'}];const i=cIf(sw);i.mode='access';i.access=id}],
    ['no vlan access',sw=>{cIf(sw).access=1}],
    ['vlan trunk allowed <vlist>',(sw,[l])=>{const i=cIf(sw);if(i.mode!=='trunk'){i.mode='trunk';i.allowed=[]}if(i.allowed!=='all')i.allowed=[...new Set(i.allowed.concat(parseList(l)))].sort((a,b)=>a-b)}],
    ['vlan trunk allowed all',sw=>{const i=cIf(sw);i.mode='trunk';i.allowed='all'}],
    ['no vlan trunk allowed <vlist>',(sw,[l])=>{const i=cIf(sw),rm=parseList(l);if(i.allowed!=='all')i.allowed=i.allowed.filter(x=>!rm.includes(x))}],
    ['vlan trunk native <vid>',(sw,[id])=>{const i=cIf(sw);if(i.mode!=='trunk'){i.mode='trunk';i.allowed=[]}i.native=+id}],
    ['no routing',()=>{}],['description <rest>',(sw,[d])=>{cIf(sw).desc=d}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]]
};
function enterSvi(sw,id){const k='Vlan'+id;if(!sw.ifs[k])sw.ifs[k]={svi:true,vid:id,ip:null,len:null,up:sw.vendor==='aruba',desc:'',mode:'svi',access:0,allowed:[],native:1};sw.ctx.if=k;sw.mode='config-if';
  if(!sw.vlans[id])return[{t:`[tutor] Ojo: la VLAN ${id} no existe en este switch; la SVI no subirá hasta que exista.`,c:'tut'}]}
function ipBrief(sw){const S=Object.values(sw.ifs).filter(i=>i.svi);if(sw.vendor==='cisco'){const st=i=>!i.up?'administratively down down    ':sw.vlans[i.vid]?'up                    up      ':'up                    down    ';
    return['Interface              IP-Address      OK? Method Status                Protocol','Vlan1                  unassigned      YES unset  administratively down down    ',...S.map(i=>('Vlan'+i.vid).padEnd(23)+(i.ip||'unassigned').padEnd(16)+'YES '+(i.ip?'manual ':'unset  ')+st(i)),...(TP()?Object.keys(T.att[sw.name]):[VEND.cisco.pc,VEND.cisco.up]).map(n=>shortIf(n).padEnd(23)+'unassigned'.padEnd(16)+'YES unset  '+(linkUp(sw,n)?'up                    up      ':'down                  down    '))]}
  return['','Interface       IP Address          Interface Status','                                    link/admin','--------------- ------------------- --------------------',...S.map(i=>('vlan'+i.vid).padEnd(16)+(i.ip?i.ip+'/'+i.len:'No Address').padEnd(20)+(i.up&&sw.vlans[i.vid]?'up/up':i.up?'down/up':'down/down'))]}
const MODE_ES={user:'usuario (>)',priv:'privilegiado (#)',config:'configuración global','config-vlan':'configuración de VLAN','config-if':'configuración de interfaz',op:'operacional (>)',conf:'configuración (#)'};
function tbl(sw,mode=sw.mode){const V=sw.vendor==='cisco'?CIS:ARU;let own=V[mode]||[];if(mode.startsWith('config-')){const ps=new Set(own.map(x=>x[0]));own=own.concat(V.config.filter(x=>!ps.has(x[0])))}return own}
function tokOk(p,t,v){if(p==='<rest>')return true;if(p[0]==='<')return TY[p.slice(1,-1)](t,v);return p.startsWith(t.toLowerCase())}
function tryPat(pat,toks,v){const pt=pat.split(' '),args=[];let score=0;
  for(let i=0;i<pt.length;i++){const p=pt[i],t=toks[i];if(t===undefined)return{inc:true,fail:i};
    if(p==='<rest>'){args.push(toks.slice(i).join(' '));return{args,score}}
    if(!tokOk(p,t,v))return{fail:i};if(p[0]==='<')args.push(t);else score+=p===t.toLowerCase()?2:1}
  if(toks.length>pt.length)return{fail:pt.length};return{args,score}}
function prep(sw,line){return sw.vendor==='cisco'?line.replace(/\b(g[a-z]*)\s+(\d+\/\d+)/gi,'$1$2'):line}
function runTable(sw,line,echoLen){
  line=prep(sw,line.trim());const toks=line.split(/\s+/);let best=[],bs=-1,inc=false,maxFail=0;
  for(const[p,h]of tbl(sw)){const r=tryPat(p,toks,sw.vendor);if(r.args){if(r.score>bs){bs=r.score;best=[[p,h,r.args]]}else if(r.score===bs)best.push([p,h,r.args])}else{if(r.inc)inc=true;maxFail=Math.max(maxFail,r.fail)}}
  const cis=sw.vendor==='cisco';
  if(best.length===1){const o=best[0][1](sw,best[0][2]);return o||[]}
  if(best.length>1)return[{t:cis?`% Ambiguous command:  "${line}"`:'Ambiguous command.',c:'err'}];
  if(inc)return[{t:cis?'% Incomplete command.':'Command incomplete.',c:'err'}];
  const out=[];
  if(cis){let pos=0;for(let i=0;i<maxFail&&i<toks.length;i++)pos+=toks[i].length+1;out.push({t:' '.repeat((echoLen||0)+pos)+'^',c:'err'},{t:"% Invalid input detected at '^' marker.",c:'err'})}
  else out.push({t:'Invalid input: '+(toks[maxFail]||toks[0]),c:'err'});
  const modes=Object.keys(cis?CIS:ARU).filter(m=>m!==sw.mode&&tbl(sw,m).some(([p])=>tryPat(p,toks,sw.vendor).args));
  if(modes.length)out.push({t:`[tutor] Ese comando existe en modo ${MODE_ES[modes[0]]}. Ahora estás en modo ${MODE_ES[sw.mode]}.`,c:'tut'});
  return out;
}

/* ---------- show outputs: Cisco ---------- */
function cShowVlan(sw){const r=['','VLAN Name                             Status    Ports','---- -------------------------------- --------- -------------------------------'];
  for(const id of Object.keys(sw.vlans).map(Number).sort((a,b)=>a-b)){const ps=ports('cisco').filter(n=>{const i=sw.ifs[n];return i.mode!=='trunk'&&i.access===id}).map(shortIf),ch=[];
    for(let k=0;k<ps.length;k+=4)ch.push(ps.slice(k,k+4).join(', '));
    r.push(String(id).padEnd(5)+sw.vlans[id].slice(0,32).padEnd(33)+'active    '+(ch[0]||''));ch.slice(1).forEach(c=>r.push(' '.repeat(48)+c))}
  return r.concat(['1002 fddi-default                     act/unsup','1003 token-ring-default               act/unsup','1004 fddinet-default                  act/unsup','1005 trnet-default                    act/unsup'])}
function cdpMis(sw){if(!TP())return[];const o=[];for(const[n,a]of Object.entries(T.att[sw.name])){if(!a.sw)continue;const nb=swByName(a.sw),i=sw.ifs[n],j=eff(nb).ifs[a.port];if(nb.vendor!=='cisco'||!i||i.mode!=='trunk'||!j||j.mode!=='trunk'||!linkUp(sw,n))continue;if((i.native||1)!==(j.native||1))o.push({t:`%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on ${shortIf(n)} (${i.native||1}), with ${nb.name} ${shortIf(a.port)} (${j.native||1}).`,c:'err'})}return o}
function cShowTrunk(sw){const t=ports('cisco').filter(n=>sw.ifs[n].mode==='trunk'&&linkUp(sw,n));if(!t.length)return cdpMis(sw);
  const al=i=>i.allowed==='all'?'1-4094':(rangeStr(i.allowed)||'none');const act=i=>rangeStr(Object.keys(sw.vlans).map(Number).filter(x=>x<1002&&allows(i,x)))||'none';
  return[...cdpMis(sw),'','Port        Mode             Encapsulation  Status        Native vlan',...t.map(n=>shortIf(n).padEnd(12)+'on'.padEnd(17)+'802.1q'.padEnd(15)+'trunking'.padEnd(14)+sw.ifs[n].native),'','Port        Vlans allowed on trunk',...t.map(n=>shortIf(n).padEnd(12)+al(sw.ifs[n])),'','Port        Vlans allowed and active in management domain',...t.map(n=>shortIf(n).padEnd(12)+act(sw.ifs[n]))]}
function cShowStatus(sw){return['','Port      Name               Status       Vlan       Duplex  Speed Type',...ports('cisco').map(n=>{const i=sw.ifs[n],c=linkUp(sw,n);return shortIf(n).padEnd(10)+i.desc.slice(0,18).padEnd(19)+(!i.up?'disabled':c?'connected':'notconnect').padEnd(13)+(i.mode==='trunk'?'trunk':''+i.access).padEnd(11)+(c?'a-full':'auto').padEnd(8)+(c?'a-1000':'auto').padEnd(6)+'10/100/1000BaseTX'})]}
function cRun(sw){const r=['Building configuration...','','Current configuration : 1873 bytes','!','version 15.2','!','hostname '+sw.host,'!'];
  for(const id of Object.keys(sw.vlans).map(Number).sort((a,b)=>a-b))if(id!==1){r.push('vlan '+id);if(sw.vlans[id]!=='VLAN'+String(id).padStart(4,'0'))r.push(' name '+sw.vlans[id]);r.push('!')}
  for(const n of ports('cisco')){const i=sw.ifs[n];r.push('interface '+n);if(i.desc)r.push(' description '+i.desc);if(i.native!==1)r.push(' switchport trunk native vlan '+i.native);if(i.allowed!=='all')r.push(' switchport trunk allowed vlan '+(rangeStr(i.allowed)||'none'));if(i.access!==1)r.push(' switchport access vlan '+i.access);if(i.mode!=='dynamic')r.push(' switchport mode '+i.mode);if(!i.up)r.push(' shutdown');r.push('!')}
  for(const i of Object.values(sw.ifs).filter(i=>i.svi)){r.push('interface Vlan'+i.vid);if(i.ip)r.push(' ip address '+i.ip+' '+len2mask(i.len));else r.push(' no ip address');if(!i.up)r.push(' shutdown');r.push('!')}
  return r.concat(['line con 0','!','end'])}
/* ---------- show outputs: Aruba ---------- */
const aNum=l=>l.map(n=>+n.split('/')[2]);const aRange=nums=>rangeStr(nums).split(',').filter(Boolean).map(x=>x.split('-').map(y=>'1/1/'+y).join('-')).join(',');
function aShowVlan(sw){const d='-'.repeat(86);const r=['',d,'VLAN  Name                              Status  Reason          Type      Interfaces',d];
  for(const id of Object.keys(sw.vlans).map(Number).sort((a,b)=>a-b)){const m=ports('aruba').filter(n=>{const i=sw.ifs[n];return i.mode==='access'?i.access===id:(allows(i,id)||i.native===id)});
    r.push(String(id).padEnd(6)+sw.vlans[id].slice(0,32).padEnd(34)+'up      ok              '+(id===1?'default':'static').padEnd(10)+aRange(aNum(m)))}
  return r}
function aShowBrief(sw){const d='-'.repeat(92);return['',d,'Port      Native  Mode    Type      Enabled Status  Reason                  Speed','          VLAN                                                            (Mb/s)',d,
  ...ports('aruba').map(n=>{const i=sw.ifs[n],c=linkUp(sw,n);return n.padEnd(10)+String(i.mode==='trunk'?i.native:i.access).padEnd(8)+i.mode.padEnd(8)+'1GbT'.padEnd(10)+(i.up?'yes':'no').padEnd(8)+(c?'up':'down').padEnd(8)+(!i.up?'Administratively down':c?'':'Waiting for link').padEnd(24)+(c?'1000':'--')})]}
function aRun(sw){const r=['Current configuration:','!','!Version ArubaOS-CX (simulado)','hostname '+sw.host,'!'];
  for(const id of Object.keys(sw.vlans).map(Number).sort((a,b)=>a-b)){r.push('vlan '+id);if(id!==1&&sw.vlans[id]!=='VLAN'+id)r.push('    name '+sw.vlans[id])}
  for(const n of ports('aruba')){const i=sw.ifs[n];r.push('interface '+n);if(i.desc)r.push('    description '+i.desc);r.push(i.up?'    no shutdown':'    shutdown');
    if(i.mode==='access')r.push('    vlan access '+i.access);else{r.push('    vlan trunk native '+i.native);r.push('    vlan trunk allowed '+(i.allowed==='all'?'all':rangeStr(i.allowed)))}}
  for(const i of Object.values(sw.ifs).filter(i=>i.svi)){r.push('interface vlan '+i.vid);if(i.ip)r.push('    ip address '+i.ip+'/'+i.len);if(!i.up)r.push('    shutdown')}
  return r}

/* ---------- Juniper ---------- */
const jPrompt=sw=>'admin@'+sw.host+(sw.mode==='op'?'> ':'# ');
function kw(t,opts){if(t===undefined)return undefined;t=t.toLowerCase();if(opts.includes(t))return t;const m=opts.filter(o=>o.startsWith(t));return m.length===1?m[0]:null}
function jPath(toks){
  const a=kw(toks[0],['vlans','interfaces']);if(a===undefined)return{inc:1};if(!a)return{err:0};
  if(a==='vlans'){const name=toks[1];if(!name)return{inc:1};if(toks.length===2)return{vlan:name};
    const b=kw(toks[2],['vlan-id','description','l3-interface']);if(!b)return{err:2};
    if(b==='description')return{vlan:name,desc:toks.slice(3).join(' ')};
    if(b==='l3-interface'){const x=toks[3];if(x===undefined)return{inc:1};if(!/^irb\.\d+$/.test(x))return{err:3,tut:'Se escribe como irb.10 (irb, punto y la unidad).'};return{vlan:name,l3:x}}
    const id=toks[3];if(id===undefined)return{inc:1};if(!TY.vid(id))return{err:3,msg:'value is not within range (1..4094)'};if(toks.length>4)return{err:4};return{vlan:name,vid:+id}}
  if(toks[1]&&toks[1].toLowerCase()==='irb'){if(toks.length===2)return{irb:null};const u=kw(toks[2],['unit']);if(!u)return{err:2};const n=toks[3];if(n===undefined)return{inc:1};if(!/^\d+$/.test(n))return{err:3};
    if(toks.length===4)return{irb:n};if(!kw(toks[4],['family']))return{err:4};const f=kw(toks[5],['inet','inet6']);if(f===undefined)return{inc:1};if(f!=='inet')return{err:5,tut:'En este lab usa family inet (IPv4).'};
    if(toks.length===6)return{irb:n};if(!kw(toks[6],['address']))return{err:6};const ad=toks[7];if(ad===undefined)return{inc:1};if(!TY.cidr(ad))return{err:7,msg:'invalid ip address or prefix',tut:'Se escribe con prefijo: '+NET()+'2/24'};return{irb:n,addr:ad}}
  const ifn=normIf('juniper',toks[1]||'');if(!toks[1])return{inc:1};if(!ifn)return{err:1,msg:`invalid interface type in '${toks[1]}'`};
  if(toks.length===2)return{if:ifn};
  const c=kw(toks[2],['unit','disable','description','native-vlan-id']);if(!c)return{err:2};
  if(c==='disable')return{if:ifn,disable:true};if(c==='description')return{if:ifn,desc:toks.slice(3).join(' ')};
  if(c==='native-vlan-id'){const id=toks[3];if(id===undefined)return{if:ifn,native:-1};if(!TY.vid(id))return{err:3,msg:'value is not within range (1..4094)',tut:'native-vlan-id lleva el número de la VLAN, por ejemplo 999.'};if(toks.length>4)return{err:4};return{if:ifn,native:+id}}
  if(toks[3]===undefined)return{inc:1};if(toks[3]!=='0')return{err:3,tut:'En este lab usa unit 0.'};if(toks.length===4)return{if:ifn};
  const d=kw(toks[4],['family']);if(!d)return{err:4};
  const e=kw(toks[5],['ethernet-switching','inet']);if(e===undefined)return{inc:1};if(!e)return{err:5};
  if(e==='inet')return{err:5,tut:'Para switching de capa 2 se usa family ethernet-switching.'};
  if(toks.length===6)return{if:ifn,es:true};
  const f=kw(toks[6],['interface-mode','vlan','port-mode']);if(!f)return{err:6};
  if(f==='port-mode')return{err:6,tut:'port-mode es de Junos sin ELS; en un EX2300 se usa interface-mode.'};
  if(f==='interface-mode'){const g=kw(toks[7],['access','trunk']);if(g===undefined)return{inc:1};if(!g)return{err:7};return{if:ifn,mode:g}}
  const h=kw(toks[7],['members']);if(h===undefined)return{inc:1};if(!h)return{err:7};
  const mem=toks.slice(8).join(' ').replace(/[\[\]]/g,' ').trim().split(/\s+/).filter(Boolean);
  return{if:ifn,members:mem,mpath:true};
}
function jErr(sw,line,toks,r){const out=[];let pos=jPrompt(sw).length+line.indexOf(toks[0]);
  const body=toks.slice(1);let off=line.indexOf(toks[1]??'',toks[0].length);
  if(r.err>=0){let p=line.indexOf(toks[0])+toks[0].length;for(let i=0;i<=r.err&&i<body.length;i++){p=line.indexOf(body[i],p);if(i<r.err)p+=body[i].length}pos=jPrompt(sw).length+p}
  out.push({t:' '.repeat(pos)+'^',c:'err'},{t:r.msg?r.msg:'syntax error.',c:'err'});if(r.tut)out.push({t:'[tutor] '+r.tut,c:'tut'});return out}
function jSetLines(cfg){const o=[];for(const[n,v]of Object.entries(cfg.vlans)){if(v.id)o.push(`set vlans ${n} vlan-id ${v.id}`);else o.push(`set vlans ${n}`);if(v.l3)o.push(`set vlans ${n} l3-interface ${v.l3}`)}
  for(const[u,c]of Object.entries(cfg.irb||{}))o.push(`set interfaces irb unit ${u}`+(c.addr?` family inet address ${c.addr}`:''));
  for(const n of ports('juniper')){const c=cfg.ifs[n];if(!c)continue;const b=`set interfaces ${n} unit 0 family ethernet-switching`;if(c.disable)o.push(`set interfaces ${n} disable`);if(c.desc)o.push(`set interfaces ${n} description "${c.desc}"`);if(c.native)o.push(`set interfaces ${n} native-vlan-id ${c.native}`);
    if(c.es&&!c.mode&&!(c.members||[]).length)o.push(b);if(c.mode)o.push(b+' interface-mode '+c.mode);(c.members||[]).forEach(m=>o.push(b+' vlan members '+m))}return o}
function jTree(cfg,part){const o=[],I=n=>' '.repeat(n*4);
  if(part!=='vlans'){const ifl=ports('juniper').filter(n=>cfg.ifs[n]);if(ifl.length||Object.keys(cfg.irb||{}).length){o.push('interfaces {');for(const n of ifl){const c=cfg.ifs[n];o.push(I(1)+n+' {');if(c.desc)o.push(I(2)+`description "${c.desc}";`);if(c.disable)o.push(I(2)+'disable;');if(c.native)o.push(I(2)+'native-vlan-id '+c.native+';');
    if(c.es){o.push(I(2)+'unit 0 {',I(3)+'family ethernet-switching {');if(c.mode)o.push(I(4)+'interface-mode '+c.mode+';');const m=c.members||[];if(m.length){o.push(I(4)+'vlan {',I(5)+'members '+(m.length>1?'[ '+m.join(' ')+' ]':m[0])+';',I(4)+'}')}o.push(I(3)+'}',I(2)+'}')}o.push(I(1)+'}')}
    const ir=Object.entries(cfg.irb||{});if(ir.length){o.push(I(1)+'irb {');for(const[u,c]of ir){o.push(I(2)+'unit '+u+' {');if(c.addr)o.push(I(3)+'family inet {',I(4)+'address '+c.addr+';',I(3)+'}');o.push(I(2)+'}')}o.push(I(1)+'}')}o.push('}')}}
  if(part!=='interfaces'){o.push('vlans {');for(const[n,v]of Object.entries(cfg.vlans)){o.push(I(1)+n+' {');if(v.id)o.push(I(2)+'vlan-id '+v.id+';');if(v.l3)o.push(I(2)+'l3-interface '+v.l3+';');o.push(I(1)+'}')}o.push('}')}
  return o}
function jCheck(cfg){const e=[];for(const n of ports('juniper')){const c=cfg.ifs[n];if(!c||!c.es)continue;const m=c.members||[];
    for(const x of m)if(x!=='all'&&!/^\d+$/.test(x)&&!cfg.vlans[x])e.push(`[edit interfaces ${n} unit 0 family ethernet-switching vlan members]`,`  'members ${x}'`,`    VLAN ${x} is not defined`);
    if((c.mode||'access')==='access'&&m.length>1)e.push(`[edit interfaces ${n} unit 0 family ethernet-switching]`,'  Access interface can have only one VLAN member');}
  for(const[n,v]of Object.entries(cfg.vlans))if(!v.id)e.push(`[edit vlans ${n}]`,"  'vlan-id' is required in this lab");
  for(const[n,v]of Object.entries(cfg.vlans))if(v.l3&&!(cfg.irb&&cfg.irb[v.l3.split('.')[1]]))e.push(`[edit vlans ${n}]`,`  'l3-interface ${v.l3}'`,'    Interface not defined');
  return e}
function jShowVlans(sw){const a=sw.act,r=['','Routing instance        VLAN name             Tag          Interfaces'],e=eff(sw);
  for(const[n,v]of Object.entries(a.vlans).sort((x,y)=>x[0].localeCompare(y[0]))){r.push('default-switch'.padEnd(24)+n.padEnd(22)+String(v.id||'').padEnd(13));
    for(const p of ports('juniper')){const i=e.ifs[p];if((i.mode==='access'&&i.access===v.id)||(i.mode==='trunk'&&allows(i,v.id))){const cfgd=a.ifs[p]&&a.ifs[p].es;if(!cfgd&&v.id===1&&p!==VEND.juniper.pc&&p!==VEND.juniper.up)continue;r.push(' '.repeat(59)+p+'.0'+(linkUp(sw,p)?'*':''))}}}
  return r}
function jEsIf(sw){const a=sw.act,e=eff(sw),nm=id=>(Object.entries(a.vlans).find(([k,v])=>v.id===id)||[String(id)])[0],r=['Routing Instance Name : default-switch','','Logical         Vlan          TAG     MAC     STP         Tagging','interface       members               limit   state'];
  for(const p of ports('juniper')){const c=a.ifs[p];if(!c||!c.es)continue;const i=e.ifs[p],up=linkUp(sw,p);r.push((p+'.0').padEnd(48)+(i.mode==='trunk'?'tagged':'untagged'));
    const ids=i.mode==='access'?[i.access]:(i.allowed==='all'?Object.values(a.vlans).map(v=>v.id).filter(Boolean):i.allowed.slice());if(i.mode==='trunk'&&i.native>1&&!ids.includes(i.native))ids.push(i.native);
    for(const id of ids.sort((x,y)=>x-y))r.push(' '.repeat(16)+nm(id).slice(0,13).padEnd(14)+String(id).padEnd(8)+'294912  '+(up?'Forwarding':'Discarding').padEnd(12)+(i.mode==='trunk'&&id!==i.native?'tagged':'untagged'))}
  return r}
function jTerse(sw){const sv=svis(sw);return['Interface               Admin Link Proto    Local                 Remote',...ports('juniper').flatMap(p=>{const i=eff(sw).ifs[p],l=linkUp(sw,p)?'up':'down',ad=i.up?'up':'down';return[p.padEnd(24)+ad.padEnd(6)+l,(p+'.0').padEnd(24)+ad.padEnd(6)+l.padEnd(5)+'eth-switch']}),...(sv.length?['irb'.padEnd(24)+'up    up']:[]),...Object.keys(sw.act.irb||{}).map(u=>{const x=sv.find(y=>String(y.vid)===u||y.ip&&sw.act.irb[u].addr&&sw.act.irb[u].addr.startsWith(y.ip))||{};return('irb.'+u).padEnd(24)+'up    '+(x.up?'up  ':'down')+' inet     '+(sw.act.irb[u].addr||'')})]}
const J_OP=[['show configuration interfaces <if>',(sw,[i])=>jBlock(jTree(sw.act,'interfaces'),normIf('juniper',i))],['show configuration interfaces',sw=>jTree(sw.act,'interfaces')],['show configuration vlans',sw=>jTree(sw.act,'vlans')],['show configuration vlans <word>',(sw,[n])=>jBlock(jTree(sw.act,'vlans'),n)],
 ['show interfaces <if> terse',(sw,[i])=>{const n=normIf('juniper',i);const r=jTerse(sw);return[r[0],...r.filter(l=>typeof l==='string'&&(l.startsWith(n+' ')||l.startsWith(n+'.0')))]}],['show interfaces <if>',(sw,[i])=>xIfDetail(sw,normIf('juniper',i))],['show interfaces descriptions',sw=>xIfDesc(sw)],
 ['show ethernet-switching table',sw=>xMac(sw)],['show ethernet-switching interface <if>',(sw,[i])=>{const n=normIf('juniper',i),r=jEsIf(sw);const k=r.findIndex(l=>l.startsWith(n+'.0'));if(k<0)return r.slice(0,4);let e=k+1;while(e<r.length&&r[e].startsWith(' '))e++;return r.slice(0,4).concat(r.slice(k,e))}],
 ['show vlans <word>',(sw,[n])=>{const r=jShowVlans(sw);const k=r.findIndex(l=>l.slice(24,46).trim().toLowerCase()===n.toLowerCase());if(k<0)return['error: vlan '+n+' does not exist'];let e=k+1;while(e<r.length&&r[e].startsWith(' '))e++;return r.slice(0,2).concat(r.slice(k,e))}],
 ['show lldp neighbors',sw=>xLldp(sw)],['show version',sw=>xVer(sw)],['ping <ip>',(sw,[ip])=>swPing(sw,ip)],['ping <ip> count <word>',(sw,[ip])=>swPing(sw,ip)],['configure',sw=>{sw.mode='conf';return['Entering configuration mode','','[edit]']}],['show vlans',jShowVlans],['show configuration',sw=>jTree(sw.act)],['show interfaces terse',jTerse],['show ethernet-switching interfaces',jEsIf],['exit',()=>{}],['quit',()=>{}]];
function jOp(sw,line,echo){const toks=line.split(/\s+/);let best=null;
  for(const[p,h]of J_OP){const r=tryPat(p,toks,'juniper');if(r.args&&(!best||r.score>best.s))best={h,s:r.score,a:r.args}}
  if(best)return best.h(sw,best.a)||[];
  if(/^(set|delete|commit)\b/.test(line))return[{t:'                ^',c:'err'},{t:"unknown command.",c:'err'},{t:"[tutor] Ese comando es de modo configuración. Entra con 'configure'.",c:'tut'}];
  return[{t:' '.repeat(jPrompt(sw).length)+'^',c:'err'},{t:"unknown command.",c:'err'}]}
function jExec(sw,line){
  if(sw.mode==='op')return jOp(sw,line);
  let toks=line.split(/\s+/);const v=kw(toks[0],['set','delete','commit','show','run','exit','quit','rollback','top','edit','up']);const E=sw.jedit||[];const ed=['','[edit'+(E.length?' '+E.join(' '):'')+']'];
  if(v==='edit'){const r=jPath(E.concat(toks.slice(1)));if(r.inc&&!toks[1])return ed;if(r.err!==undefined)return jErr(sw,line,toks,{err:r.err-E.length,msg:r.msg,tut:r.tut}).concat(ed);sw.jedit=E.concat(toks.slice(1).map((t,i)=>i===0&&!E.length?(kw(t,['vlans','interfaces'])||t):t));return['','[edit '+sw.jedit.join(' ')+']']}
  if(v==='top'){sw.jedit=[];return['','[edit]']}
  if(v==='up'){sw.jedit=E.length>2?E.slice(0,-2):E.length?E.slice(0,-1).length===1?[]:E.slice(0,-1):[];return['','[edit'+(sw.jedit.length?' '+sw.jedit.join(' '):'')+']']}
  if((v==='exit'||v==='quit')&&E.length&&!/configuration-mode/.test(line)){sw.jedit=[];return['','[edit]']}
  if((v==='set'||v==='delete')&&E.length)toks=[toks[0],...E,...toks.slice(1)];
  if(v==='commit'&&toks[1]&&/^and-quit$/i.test(toks[1])){const e=jCheck(sw.cand);if(e.length)return e.map(t=>({t,c:'err'})).concat([{t:'error: configuration check-out failed',c:'err'}],ed);(sw.jhist=sw.jhist||[]).unshift(clone(sw.act));sw.jhist.length=Math.min(sw.jhist.length,5);sw.act=clone(sw.cand);sw.jedit=[];sw.mode='op';return['commit complete','Exiting configuration mode']}
  if(v==='commit'&&!(toks[1]&&'check'.startsWith(toks[1].toLowerCase()))){const e=jCheck(sw.cand);if(!e.length){(sw.jhist=sw.jhist||[]).unshift(clone(sw.act));sw.jhist.length=Math.min(sw.jhist.length,5)}
   if(toks[1]&&/^confirmed$/i.test(toks[1])&&!e.length){sw.act=clone(sw.cand);return['commit confirmed will be automatically rolled back in '+(toks[2]||10)+' minutes unless confirmed','commit complete',{t:'[tutor] En producción, si pierdes acceso no confirmas y el equipo regresa solo a la configuración anterior. Confirma con otro commit.',c:'tut'}].concat(ed)}}
  if(v==='rollback'&&toks[1]&&/^[1-5]$/.test(toks[1])){const h=(sw.jhist||[])[+toks[1]-1];if(!h)return[{t:'error: rollback '+toks[1]+' does not exist',c:'err'}].concat(ed);sw.cand=clone(h);return['load complete',{t:'[tutor] Cargaste la versión de hace '+toks[1]+' commit(s). Revisa con show | compare y aplica con commit.',c:'tut'}].concat(ed)}
  if(v==='show'&&E.length&&!toks[1]){return jBlockPath(jTree(sw.cand,E[0]==='vlans'?'vlans':'interfaces'),E).concat(ed)}
  if(!v)return jErr(sw,line,toks,{err:-1}).concat(ed);
  if(v==='run')return jOp(sw,toks.slice(1).join(' ')).concat(ed);
  if(v==='top'||v==='edit')return ed;
  if(v==='exit'||v==='quit'){const ch=JSON.stringify(sw.cand)!==JSON.stringify(sw.act);sw.mode='op';return(ch?['The configuration has been changed but not committed']:[]).concat(['Exiting configuration mode'])}
  if(v==='rollback'){sw.cand=clone(sw.act);return['load complete'].concat(ed)}
  if(v==='commit'){const e=jCheck(sw.cand);if(e.length)return e.map(t=>({t,c:'err'})).concat([{t:'error: configuration check-out failed',c:'err'}],ed);
    if(toks[1]&&'check'.startsWith(toks[1].toLowerCase()))return['configuration check succeeds'].concat(ed);sw.act=clone(sw.cand);return['commit complete'].concat(ed)}
  if(v==='show'){const rest=toks.slice(1).join(' ');
    if(/^\|\s*c/.test(rest)){const a=new Set(jSetLines(sw.act)),c=new Set(jSetLines(sw.cand));const d=[...c].filter(x=>!a.has(x)).map(x=>'+ '+x).concat([...a].filter(x=>!c.has(x)).map(x=>'- '+x));return(d.length?['[edit]',...d]:[]).concat(ed)}
    if(/^\|\s*d/.test(rest))return jSetLines(sw.cand).concat(ed);
    const p=kw(toks[1],['vlans','interfaces']);return jTree(sw.cand,p||undefined).concat(p==='vlans'?[{t:"[tutor] Esto es la configuración candidata. Para ver el estado real: run show vlans",c:'tut'}]:[],ed)}
  const r=jPath(toks.slice(1));
  if(r.inc)return[{t:'missing argument.',c:'err'}].concat(ed);
  if(r.err!==undefined)return jErr(sw,line,toks,r).concat(ed);
  const C=sw.cand;
  if(v==='set'){
    if(r.irb!==undefined){if(r.irb===null)return ed;C.irb=C.irb||{};C.irb[r.irb]=C.irb[r.irb]||{};if(r.addr)C.irb[r.irb].addr=r.addr}
    else if(r.vlan){C.vlans[r.vlan]=C.vlans[r.vlan]||{};if(r.vid)C.vlans[r.vlan].id=r.vid;if(r.l3)C.vlans[r.vlan].l3=r.l3}
    else{if(r.native===-1||(r.mpath&&!r.members.length))return[{t:'missing argument.',c:'err'}].concat(ed);const c=C.ifs[r.if]=C.ifs[r.if]||{};if(r.native)c.native=r.native;if(r.disable)c.disable=true;if(r.desc)c.desc=r.desc.replace(/"/g,'');if(r.es||r.mode||r.members)c.es=true;if(r.mode)c.mode=r.mode;if(r.members)c.members=[...new Set((c.members||[]).concat(r.members))]}
  }else{
    if(r.irb!==undefined){if(C.irb){if(r.irb===null)delete C.irb;else if(r.addr&&C.irb[r.irb])delete C.irb[r.irb].addr;else delete C.irb[r.irb]}}
    else if(r.vlan){if(r.vid)delete(C.vlans[r.vlan]||{}).id;else if(r.l3)delete(C.vlans[r.vlan]||{}).l3;else delete C.vlans[r.vlan]}
    else{const c=C.ifs[r.if];if(c){if(r.native)delete c.native;else if(r.disable)delete c.disable;else if(r.mode)delete c.mode;else if(r.members)c.members=r.members.length?(c.members||[]).filter(x=>!r.members.includes(x)):[];else if(r.es)delete C.ifs[r.if];else if(Object.keys(r).length===1)delete C.ifs[r.if]}}
  }
  return ed;
}

/* ---------- help & completion ---------- */
const DESC={ping:'Probar conectividad',ip:'Configuración IP',address:'Dirección IP','<ip>':'Dirección IP, ej. 192.168.10.2','<mask>':'Máscara, ej. 255.255.255.0','<cidr>':'IP con prefijo, ej. 192.168.10.2/24','<svi>':'Interfaz vlan, ej. vlan10',enable:'Entrar a modo privilegiado',configure:'Entrar a modo de configuración',show:'Mostrar información',vlan:'VLAN',interface:'Seleccionar interfaz',interfaces:'Interfaces',switchport:'Configurar puerto de switch',name:'Nombre de la VLAN',shutdown:'Apagar la interfaz',no:'Negar un comando',exit:'Salir del modo actual',end:'Volver a modo privilegiado',do:'Ejecutar comando de modo privilegiado',mode:'Modo del puerto',access:'Access port (una VLAN)',trunk:'Trunk (varias VLAN con tag)',allowed:'VLANs permitidas',native:'VLAN nativa',add:'Agregar a la lista',remove:'Quitar de la lista',all:'Todas',none:'Ninguna',brief:'Resumen',status:'Estado de puertos','running-config':'Configuración activa',terminal:'Desde la terminal',hostname:'Nombre del equipo',description:'Descripción',write:'Guardar configuración',memory:'En memoria de arranque',copy:'Copiar archivos',disable:'Salir de modo privilegiado',encapsulation:'Encapsulación',dot1q:'IEEE 802.1Q',routing:'Ruteo en la interfaz','<vid>':'ID de VLAN (1-4094)','<if>':'Interfaz','<word>':'Texto','<vlist>':'Lista de VLANs, ej. 10,20-30','<rest>':'Texto o comando','startup-config':'Configuración de arranque'};
const J_HELP={op:[['configure','Entrar a modo configuración'],['show','Mostrar información (vlans, configuration, interfaces terse)'],['exit','Salir']],conf:[['set','Agregar configuración'],['delete','Borrar configuración'],['commit','Aplicar la configuración candidata'],['show','Ver configuración candidata ( | compare para ver cambios)'],['run','Ejecutar comando operacional'],['rollback','Descartar cambios sin commit'],['exit','Salir de modo configuración']]};
function helpList(sw,body){const endsSpace=body===''||/\s$/.test(body);const toks=body.trim()?prep(sw,body.trim()).split(/\s+/):[];const k=endsSpace?toks.length:toks.length-1,part=endsSpace?'':toks[toks.length-1].toLowerCase();const m=new Map();
  for(const[p]of tbl(sw)){const pt=p.split(' ');let ok=true;for(let i=0;i<k;i++){if(!pt[i]||!tokOk(pt[i],toks[i],sw.vendor)){ok=false;break}if(pt[i]==='<rest>'){ok=false;break}}if(!ok)continue;
    if(pt.length===k){if(endsSpace)m.set('<cr>','');continue}const nx=pt[k];
    if(ARGS[nx]){for(const[a,b]of ARGS[nx](sw.vendor,part,endsSpace))m.set(a,b);continue}
    if(nx[0]==='<'){if(endsSpace)m.set(nx,DESC[nx]||'')}else if(nx.startsWith(part))m.set(nx,DESC[nx]||'')}
  return{m,part,endsSpace}}
/* Ayuda real para nombres de interfaz: "interface ?", "interface gi?" y Tab */
const ARGS={'<svi>':()=>[],
 '<if>':(v,part,sp)=>{const P=ports(v);
  if(v==='cisco'){if(sp)return[['GigabitEthernet','Puerto físico: GigabitEthernet0/1 a 0/24 (abreviado: g0/1)']];const m=part.match(/^(g[a-z]*)(\d.*)?$/i);if(!m||!'gigabitethernet'.startsWith(m[1].toLowerCase()))return[];
   if(!m[2])return[['GigabitEthernet','Puerto físico: GigabitEthernet0/1 a 0/24']];return P.filter(n=>n.slice(15).startsWith(m[2])).map(n=>[n,''])}
  if(sp)return[[v==='aruba'?'1/1/<1-24>':'<interfaz>',v==='aruba'?'Puerto físico, ej. 1/1/1':'']];return P.filter(n=>n.startsWith(part)).map(n=>[n,''])}};
/* Junos: árbol de comandos para ? y Tab, según el contexto */
const JT={vlans:{d:'VLANs',arg:{n:'<nombre>',d:'Nombre de la VLAN, por ejemplo VENTAS',list:d=>Object.keys(d.cand.vlans),next:{'vlan-id':{d:'Número de la VLAN',arg:{n:'<1-4094>',d:'VLAN ID'}},'l3-interface':{d:'Interfaz de capa 3 (SVI) de la VLAN',arg:{n:'irb.<unidad>',d:'Por ejemplo irb.10',list:d=>Object.keys(d.cand.irb||{}).map(u=>'irb.'+u)}},description:{d:'Descripción',arg:{n:'<texto>',d:'Texto libre'}}}}},
 interfaces:{d:'Interfaces del equipo',arg:{n:'<interfaz>',d:'De ge-0/0/0 a ge-0/0/23, o irb',list:()=>ports('juniper').concat(['irb']),alt:{irb:{unit:{d:'Unidad lógica (usa el número de la VLAN)',arg:{n:'<unidad>',d:'Por ejemplo 10',next:{family:{d:'Familia de protocolo',next:{inet:{d:'IPv4',next:{address:{d:'Dirección IP con prefijo',arg:{n:'<ip/prefijo>',d:'Por ejemplo 192.168.10.2/24'}}}}}}}}}}},next:{unit:{d:'Unidad lógica de la interfaz',arg:{n:'0',d:'Unidad 0 (la que se usa en switching)',list:()=>['0'],next:{family:{d:'Familia de protocolo',next:{'ethernet-switching':{d:'Switching de capa 2 (VLANs)',next:{'interface-mode':{d:'Modo del puerto',next:{access:{d:'Una sola VLAN, sin tag'},trunk:{d:'Varias VLAN con tag 802.1Q'}}},vlan:{d:'Pertenencia a VLAN',next:{members:{d:'VLANs del puerto',arg:{n:'<vlan>',d:'Nombre o número de VLAN',list:d=>Object.keys(d.cand.vlans)}}}}}}}}}}},disable:{d:'Apagar la interfaz'},'native-vlan-id':{d:'VLAN nativa del trunk (sin tag)',arg:{n:'<1-4094>',d:'VLAN ID, por ejemplo 999'}},description:{d:'Descripción',arg:{n:'<texto>',d:'Texto libre'}}}}}};
function jWalk(d,toks){let node=JT,arg=null;
 for(const t of toks){if(arg){node=(arg.alt&&arg.alt[t.toLowerCase()])||arg.next||null;arg=null;continue}
  if(!node)return{end:true};const ks=Object.keys(node),k=ks.includes(t.toLowerCase())?t.toLowerCase():(ks.filter(x=>x.startsWith(t.toLowerCase())).length===1?ks.find(x=>x.startsWith(t.toLowerCase())):null);
  if(!k)return{bad:t};const e=node[k];if(e.arg){arg=e.arg}else node=e.next||null}
 if(arg)return{arg};if(!node)return{end:true};return{node}}
function jOptions(d,toks,part){
 const top=d.mode==='op'?[['configure','Entrar a modo configuración'],['show','Mostrar información'],['exit','Salir']]:[['set','Agregar configuración'],['delete','Borrar configuración'],['commit','Aplicar la configuración candidata'],['show','Ver la configuración candidata ( | compare para ver los cambios)'],['run','Ejecutar un comando operacional'],['rollback','Descartar los cambios sin commit'],['exit','Salir de modo configuración']];
 const opSub={show:[['vlans','VLANs y sus interfaces (o show vlans <nombre>)'],['configuration','Configuración activa (| display set para verla en líneas set)'],['interfaces','Interfaces: terse, descriptions o una en detalle (ge-0/0/1)'],['ethernet-switching','Capa 2: table (MAC) o interface'],['lldp','Vecinos LLDP: show lldp neighbors'],['version','Modelo y versión de Junos']],configure:[]};if(d.mode==='op')top.splice(2,0,['ping','Probar conectividad: ping <ip>']);
 if(!toks.length)return top.filter(([k])=>k.startsWith(part));
 const c0=toks[0].toLowerCase();
 if(d.mode==='conf'&&/^(set|delete)$/.test(c0)){const w=jWalk(d,toks.slice(1));if(w.bad)return null;if(w.end)return[['<Enter>','Ejecutar']];
  if(w.arg){const L=w.arg.list?w.arg.list(d):[];const hits=L.filter(x=>x.toLowerCase().startsWith(part));return hits.length&&part?hits.map(x=>[x,'']):[[w.arg.n,w.arg.d]]}
  return Object.entries(w.node).filter(([k])=>k.startsWith(part)).map(([k,v])=>[k,v.d])}
 if(c0==='show'||(c0==='run'&&toks[1]==='show'))return toks.length===(c0==='run'?2:1)?opSub.show.filter(([k])=>k.startsWith(part)):[['<Enter>','Ejecutar']];
 return[['<Enter>','Ejecutar']]}
function help(d,val){
  push(d,prompt(d)+val+'?','cmd');
  if(d.type==='pc'){push(d,['ping <ip>   Probar conectividad','ipconfig    Ver la IP','cls         Limpiar pantalla'].concat(L3()||TP()?['netsh interface ip set address "Ethernet0" static <ip> <máscara> <gateway>','            Cambiar la IP de la PC']:[]));return}
  if(d.vendor==='juniper'){const endsSpace=val===''||/\s$/.test(val),toks=val.trim()?val.trim().split(/\s+/):[],part=endsSpace?'':toks.pop().toLowerCase();
    const o=jOptions(d,toks,part);if(!o||!o.length){push(d,{t:'syntax error, expecting <command>.',c:'err'});return}
    push(d,['Possible completions:',...o.map(([a,b])=>'  '+a.padEnd(22)+' '+b)]);return}
  const{m}=helpList(d,val);if(!m.size)push(d,{t:'% Unrecognized command',c:'err'});else push(d,[...m].map(([a,b])=>'  '+a.padEnd(18)+b))}
function complete(d,val){if(d.type==='pc'||!val||/\s$/.test(val))return val;
  if(d.vendor==='juniper'){const toks=val.trim().split(/\s+/),part=toks.pop();const o=(jOptions(d,toks,part.toLowerCase())||[]).filter(([k])=>k[0]!=='<');
    if(o.length===1)return val.slice(0,val.length-part.length)+o[0][0]+' ';
    if(o.length>1){let p=o[0][0];for(const[k]of o)while(!k.startsWith(p))p=p.slice(0,-1);if(p.length>part.length)return val.slice(0,val.length-part.length)+p}
    return val}
  const{m,part}=helpList(d,val);const ks=[...m.keys()].filter(x=>x[0]!=='<'&&x.toLowerCase().startsWith(part.replace(/^g[a-z]*(?=\d)/i,'gigabitethernet')));
  if(ks.length===1)return val.slice(0,val.length-part.length)+ks[0]+(ks[0]==='GigabitEthernet'?'':' ');
  if(ks.length>1){let p=ks[0];for(const k of ks)while(!k.toLowerCase().startsWith(p.toLowerCase()))p=p.slice(0,-1);if(p.length>part.length)return val.slice(0,val.length-part.length)+p}return val}

/* ---------- prompt / exec ---------- */
function prompt(d){if(d.type==='pc')return 'C:\\>';if(d.vendor==='juniper')return jPrompt(d);
  const h=d.host;if(d.vendor==='cisco')return h+{user:'>',priv:'#',config:'(config)#','config-vlan':'(config-vlan)#','config-if':d.ctx.range?'(config-if-range)#':'(config-if)#'}[d.mode];
  return h+{priv:'#',config:'(config)#','config-vlan':`(config-vlan-${d.ctx.vlan})#`,'config-if':'(config-if)#'}[d.mode]}
/* ---------- comandos avanzados y atajos reales (para quien ya sabe) ---------- */
const xMacOf=(n,v)=>{let h=7;for(const c of n)h=(h*31+c.charCodeAt(0))>>>0;const b=[0xa4,0xbb,(h>>16)&255,(h>>8)&255,h&255,0x11];return v==='cisco'?[0,2,4].map(k=>(b[k]*256+b[k+1]).toString(16).padStart(4,'0')).join('.'):b.map(x=>x.toString(16).padStart(2,'0')).join(':')};
const xSw=n=>TP()?swByName(n):[S1,S2].find(s=>s&&s.name===n);
function xNb(sw){if(TP())return Object.entries(T.att[sw.name]).map(([port,a])=>({port,sw:a.sw,rport:a.port,pc:a.pc}));const v=VEND[sw.vendor],o=other(sw),pc=sw===S1?PCA:PCB;return[{port:v.pc,pc:pc&&pc.name},{port:v.up,sw:o.name,rport:VEND[o.vendor].up}]}
const xPcVlan=name=>{const p=TP()?pcByName(name):[PCA,PCB].find(x=>x&&x.name===name);return p&&p.vlan};
function xMacRows(sw){const out=[],seen=new Set(),E=eff(sw);
 const walk=(s,inPort,from,depth,vset)=>{for(const nb of xNb(s)){if(!linkUp(s,nb.port))continue;const i=eff(s).ifs[nb.port];if(!i)continue;
   if(nb.pc){const vl=i.mode==='access'?i.access:(i.native||1);if(vset&&!vset(vl))continue;const k=nb.pc;if(!seen.has(k)){seen.add(k);out.push({mac:nb.pc,vlan:vl,port:inPort||nb.port})}}
   else if(nb.sw&&nb.sw!==from&&depth<4&&i.mode==='trunk'){const o=xSw(nb.sw);if(!o)continue;const j=eff(o).ifs[nb.rport];if(!j||j.mode!=='trunk')continue;const ok=vl=>allows(i,vl)&&allows(j,vl)&&(!vset||vset(vl));walk(o,inPort||nb.port,s.name,depth+1,ok)}}};
 walk(sw,null,null,0,null);return out.filter(r=>E.vlans[r.vlan]!==undefined||r.vlan===1)}
function xMac(sw,f={}){const R=xMacRows(sw).filter(r=>(!f.vlan||r.vlan===f.vlan)&&(!f.port||r.port===f.port)).sort((a,b)=>a.vlan-b.vlan),v=sw.vendor;
 if(v==='cisco')return['          Mac Address Table','-------------------------------------------','','Vlan    Mac Address       Type        Ports','----    -----------       --------    -----',...R.map(r=>String(r.vlan).padStart(4)+'    '+xMacOf(r.mac,v)+'    DYNAMIC     '+shortIf(r.port)),'Total Mac Addresses for this criterion: '+R.length];
 if(v==='aruba')return['','MAC age-time            : 300 seconds','Number of MAC addresses : '+R.length,'','MAC Address          VLAN     Type                      Port','--------------------------------------------------------------',...R.map(r=>xMacOf(r.mac,v).padEnd(21)+String(r.vlan).padEnd(9)+'dynamic'.padEnd(26)+r.port)];
 const nm=id=>(Object.entries(sw.act.vlans).find(([k,x])=>x.id===id)||[String(id)])[0];
 return['','MAC flags (S - static MAC, D - dynamic MAC)','Ethernet switching table : '+R.length+' entries, '+R.length+' learned','Routing instance : default-switch','   Vlan                MAC                 MAC      Logical','   name                address             flags    interface',...R.map(r=>'   '+nm(r.vlan).slice(0,19).padEnd(20)+xMacOf(r.mac,v).padEnd(20)+'D        '+r.port+'.0')]}
function xRunIf(sw,n){if(!n)return[];if(sw.vendor==='cisco'){const r=cRun(sw),k=r.indexOf('interface '+n);let e=k+1;while(e<r.length&&r[e]!=='!')e++;return['Building configuration...','','Current configuration : '+(40+r.slice(k,e).join('').length)+' bytes','!',...r.slice(k,e),'end']}
 const r=aRun(sw),k=r.indexOf('interface '+n);let e=k+1;while(e<r.length&&r[e].startsWith(' '))e++;return[...r.slice(k,e),'    exit']}
function xIfDetail(sw,n){if(!n)return[];const i=eff(sw).ifs[n],c=linkUp(sw,n),d=(sw.vendor==='juniper'?((sw.act.ifs[n]||{}).desc):(sw.ifs[n]||{}).desc)||'';
 if(sw.vendor==='cisco')return[`${n} is ${!i.up?'administratively down, line protocol is down (disabled)':c?'up, line protocol is up (connected)':'down, line protocol is down (notconnect)'}`,`  Hardware is Gigabit Ethernet, address is ${xMacOf(sw.name+n,'cisco')} (bia ${xMacOf(sw.name+n,'cisco')})`,...(d?['  Description: '+d]:[]),'  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,',`  ${c?'Full-duplex, 1000Mb/s':'Auto-duplex, Auto-speed'}, media type is 10/100/1000BaseTX`,'  5 minute input rate 0 bits/sec, 0 packets/sec','     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored'];
 if(sw.vendor==='aruba')return[`Interface ${n} is ${c?'up':'down'}`,` Admin state is ${i.up?'up':'down'}`,...(c?[]:[' State information: '+(i.up?'Waiting for link':'Administratively down')]),` Link state: ${c?'up':'down'}`,...(d?[' Description: '+d]:[]),` Hardware: Ethernet, MAC Address: ${xMacOf(sw.name+n,'aruba')}`,' MTU 1500',' Type 1GbT',` Speed ${c?'1000':'0'} Mb/s`,...(i.mode==='trunk'?[' VLAN Mode: native-untagged',` Native VLAN: ${i.native||1}`,` Allowed VLAN List: ${i.allowed==='all'?'all':rangeStr(i.allowed)||'none'}`]:[' VLAN Mode: access',` Access VLAN: ${i.access}`])];
 return[`Physical interface: ${n}, ${i.up?'Enabled':'Administratively down'}, Physical link is ${c?'Up':'Down'}`,...(d?[`  Description: ${d}`]:[]),'  Link-level type: Ethernet, MTU: 1514, Speed: 1000mbps, Duplex: Full-Duplex',`  Current address: ${xMacOf(sw.name+n,'juniper')}`,'',`  Logical interface ${n}.0 (Index 555) (SNMP ifIndex 520)`,`    Flags: ${c?'Up':'Device-Down'} SNMP-Traps 0x0 Encapsulation: Ethernet-Bridge`,`    Protocol eth-switch, MTU: 1514`]}
function xSwitchport(sw,n){if(!n)return[];const i=sw.ifs[n],nm=id=>sw.vlans[id]?` (${sw.vlans[id]})`:' (Inactive)',c=linkUp(sw,n);
 return['Name: '+shortIf(n),'Switchport: Enabled','Administrative Mode: '+(i.mode==='dynamic'?'dynamic auto':i.mode==='trunk'?'trunk':'static access'),'Operational Mode: '+(!c?'down':i.mode==='trunk'?'trunk':'static access'),'Administrative Trunking Encapsulation: dot1q','Negotiation of Trunking: '+(i.mode==='trunk'?'On':'Off'),'Access Mode VLAN: '+i.access+nm(i.access),'Trunking Native Mode VLAN: '+(i.native||1)+nm(i.native||1),'Trunking VLANs Enabled: '+(i.allowed==='all'?'ALL':rangeStr(i.allowed)||'NONE')]}
function xIfDesc(sw){const v=sw.vendor,P=ports(v).filter(n=>{const d=v==='juniper'?(sw.act.ifs[n]||{}).desc:(sw.ifs[n]||{}).desc;return v!=='juniper'||d}),D=n=>(v==='juniper'?(sw.act.ifs[n]||{}).desc:sw.ifs[n].desc)||'';
 if(v==='cisco')return['Interface                      Status         Protocol Description',...P.map(n=>{const i=sw.ifs[n],c=linkUp(sw,n);return shortIf(n).padEnd(31)+(!i.up?'admin down':c?'up':'down').padEnd(15)+(c?'up':'down').padEnd(9)+D(n)})];
 if(v==='aruba')return['','Port      Admin   Link    Description','-------------------------------------------',...P.map(n=>{const i=sw.ifs[n];return n.padEnd(10)+(i.up?'up':'down').padEnd(8)+(linkUp(sw,n)?'up':'down').padEnd(8)+D(n)})];
 return P.length?['Interface       Admin Link Description',...P.map(n=>n.padEnd(16)+(eff(sw).ifs[n].up?'up':'down').padEnd(6)+(linkUp(sw,n)?'up':'down').padEnd(5)+D(n))]:[]}
function xCdp(sw){const L=xNb(sw).filter(x=>x.sw&&linkUp(sw,x.port)),C=L.filter(x=>{const o=xSw(x.sw);return o&&o.vendor==='cisco'});
 const r=['Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge','                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone','','Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID',...C.map(x=>x.sw.padEnd(17)+('Gig '+x.port.slice(15)).padEnd(18)+'150'.padEnd(16)+'S I'.padEnd(6)+'WS-C2960X '+'Gig '+x.rport.slice(15)),'','Total cdp entries displayed : '+C.length];
 if(L.length>C.length)r.push({t:'[tutor] CDP es de Cisco: los vecinos Aruba o Juniper no aparecen aquí. Para verlos se usa LLDP (lldp run y luego show lldp neighbors).',c:'tut'});return r}
function xLldp(sw){const L=xNb(sw).filter(x=>x.sw&&linkUp(sw,x.port)).map(x=>({...x,o:xSw(x.sw)})).filter(x=>x.o&&(x.o.vendor!=='cisco'||x.o.lldp)),v=sw.vendor,pid=x=>x.o.vendor==='cisco'?shortIf(x.rport):x.rport;
 if(v==='cisco')return['Capability codes:','    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device','','Device ID           Local Intf     Hold-time  Capability      Port ID',...L.map(x=>x.sw.padEnd(20)+shortIf(x.port).padEnd(15)+'120'.padEnd(11)+'B'.padEnd(16)+pid(x)),'','Total entries displayed: '+L.length,...(xNb(sw).some(x=>x.sw&&xSw(x.sw)&&xSw(x.sw).vendor==='cisco'&&!xSw(x.sw).lldp)?[{t:'[tutor] Los vecinos Cisco solo aparecen si también tienen lldp run.',c:'tut'}]:[])];
 if(v==='aruba')return['','LLDP Neighbor Information','=========================','','Total Neighbor Entries          : '+L.length,'','LOCAL-PORT  CHASSIS-ID         PORT-ID                     PORT-DESC     TTL   SYS-NAME','------------------------------------------------------------------------------------------',...L.map(x=>x.port.padEnd(12)+xMacOf(x.sw,'aruba').padEnd(19)+pid(x).padEnd(28)+pid(x).padEnd(14)+'120   '+x.sw)];
 return['Local Interface    Parent Interface    Chassis Id          Port info          System Name',...L.map(x=>x.port.padEnd(19)+'-'.padEnd(20)+xMacOf(x.sw,'juniper').padEnd(20)+pid(x).padEnd(19)+x.sw)]}
function xVer(sw){return sw.vendor==='cisco'?['Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.2(7)E8, RELEASE SOFTWARE (fc1)',sw.host+' uptime is 3 days, 4 hours, 12 minutes','System image file is "flash:c2960x-universalk9-mz.152-7.E8.bin"','','Model number                    : WS-C2960X-24TS-L']:sw.vendor==='aruba'?['-----------------------------------------------------------------------------','ArubaOS-CX','(c) Copyright 2017-2026 Hewlett Packard Enterprise Development LP','-----------------------------------------------------------------------------','Version      : PL.10.13.1000','Build Date   : 2026-06-02','Platform     : 6100 (JL678A)']:['Hostname: '+sw.host,'Model: ex2300-24t','Junos: 22.4R3-S2','JUNOS OS Kernel 64-bit  [20240510]']}
function xRange(v,s){const L=[];for(let p of s.split(',')){p=p.trim();if(!p)continue;
  if(v==='cisco'){const m=p.match(/^(?:g[a-z]*)?\s*0\/(\d+)\s*(?:-\s*(?:(?:g[a-z]*)?\s*0\/)?(\d+))?$/i);if(!m)return null;for(let k=+m[1];k<=+(m[2]||m[1]);k++){const n='GigabitEthernet0/'+k;if(!ports('cisco').includes(n))return null;L.push(n)}}
  else{const m=p.match(/^1\/1\/(\d+)(?:-(?:1\/1\/)?(\d+))?$/);if(!m)return null;for(let k=+m[1];k<=+(m[2]||m[1]);k++){const n='1/1/'+k;if(!ports('aruba').includes(n))return null;L.push(n)}}}
 return L.length?[...new Set(L)]:null}
function jBlock(lines,key){const k=lines.findIndex(l=>typeof l==='string'&&l.trim()===key+' {');if(k<0)return[];const ind=lines[k].match(/^ */)[0].length;let e=k+1;while(e<lines.length&&!(lines[e].match(/^ */)[0].length===ind&&lines[e].trim()==='}'))e++;return lines.slice(k+1,e).map(l=>l.slice(ind+4))}
function jBlockPath(lines,E){let L=lines.slice(1,-1).map(l=>l.slice(4));for(const k of E.slice(1)){const b=jBlock(L,k);if(!b.length)return[];L=b}return L}
/* filtros con | : include/exclude/begin/section (Cisco/Aruba), match/except/count/display set (Junos) */
function xPipe(d,line){
 const parts=line.split(/\s+\|\s+/);if(parts.length<2)return null;
 let base=parts[0],F=parts.slice(1);
 if(d.vendor==='juniper'&&d.mode==='conf'&&/^show$/i.test(base)&&/^(c|co|com|comp|compa|compar|compare|d|di|dis|disp|displ|displa|display)\b/i.test(F[0])){base=base+' | '+F[0];F=F.slice(1);if(!F.length)return null}
 let out;
 if(d.vendor==='juniper'&&F.length&&/^display\s+set$/i.test(F[0])&&/^(run\s+)?sh\w*\s+conf\w*$/i.test(base)){out=jSetLines(d.act);F=F.slice(1)}
 else out=d.vendor==='juniper'?jExec(d,base):runTable(d,base,prompt(d).length);
 if(out.some(x=>x&&x.c==='err'))return out;
 for(const f of F){const m=f.trim().match(/^(\S+)\s*(.*)$/),k=(m[1]||'').toLowerCase(),arg=(m[2]||'').trim().replace(/^"|"$/g,'');const T=x=>typeof x==='string'?x:x.t;const isTxt=x=>typeof x==='string'||(x&&!x.c);
  const re=()=>{try{return new RegExp(arg,'i')}catch(e){return new RegExp(arg.replace(/[.*+?^${}()[\]\\]/g,'\\$&'),'i')}};
  if(/^(i|in|inc|incl|inclu|includ|include|m|ma|mat|matc|match)$/.test(k)){const r=re();out=out.filter(x=>!isTxt(x)||r.test(T(x)))}
  else if(/^(e|ex|exc|excl|exclu|exclud|exclude|except)$/.test(k)){const r=re();out=out.filter(x=>!isTxt(x)||!r.test(T(x)))}
  else if(/^(b|be|beg|begi|begin)$/.test(k)){const r=re(),i=out.findIndex(x=>isTxt(x)&&r.test(T(x)));out=i<0?[]:out.slice(i)}
  else if(/^(s|se|sec|sect|secti|sectio|section)$/.test(k)&&d.vendor!=='juniper'){const r=re(),o=[];let blk=[];const fl=()=>{if(blk.some(x=>r.test(T(x))))o.push(...blk);blk=[]};for(const x of out){if(!isTxt(x))continue;const t=T(x);if(!/^\s/.test(t)){fl();blk=[x]}else blk.push(x)}fl();out=o}
  else if(k==='count'&&d.vendor==='juniper'){out=['Count: '+out.filter(isTxt).filter(x=>T(x)!==''&&!/^\[edit/.test(T(x))).length+' lines']}
  else if(k==='no-more'){}
  else return[{t:d.vendor==='juniper'?'syntax error, expecting <command>.':"% Invalid input detected at '^' marker.",c:'err'},{t:'[tutor] Filtros: '+(d.vendor==='juniper'?'| match texto · | except texto · | count · | display set':d.vendor==='cisco'?'| include texto · | exclude texto · | begin texto · | section texto':'| include texto · | exclude texto · | begin texto'),c:'tut'}]}
 return out}
function exec(d,raw){
  const echo=prompt(d);push(d,echo+raw,'cmd');const line=raw.trim();if(line){d.hist.push(raw);d.hp=d.hist.length}
  if(!line)return;
  if(d.type==='pc')return pcExec(d,line);
  let o=xPipe(d,line);
  if(!o&&d.vendor!=='juniper'&&d.mode==='config-if'&&d.ctx.range&&!/^(int|inte|inter|interf|interfa|interfac|interface|exit|end|do|show|sh)\b/i.test(line)){o=[];const seen=new Set();for(const n of d.ctx.range){d.ctx.if=n;const r=runTable(d,line,echo.length);for(const x of r){const k=typeof x==='string'?x:x.t;if(!seen.has(k)){seen.add(k);o.push(x)}}if(d.mode!=='config-if')break}}
  if(!o)o=d.vendor==='juniper'?jExec(d,line):runTable(d,line,echo.length);
  if(d.mode!=='config-if'&&d.ctx)delete d.ctx.range;
  if(o.some(x=>x&&x.c==='err'))LS.err++;push(d,o);
}
function pcExec(p,line){
  const[c,arg]=line.split(/\s+/);const cl=c.toLowerCase();
  if(cl==='cls'){p.lines=[];return}
  if(cl==='ipconfig'){push(p,['','Ethernet adapter Ethernet0:','','   IPv4 Address. . . . . . . . . . . : '+p.ip,'   Subnet Mask . . . . . . . . . . . : '+len2mask(p.len),'   Default Gateway . . . . . . . . . : '+(L3()||TP()?p.gw||'':'')]);return}
  if(cl==='netsh'&&(L3()||TP())){const m=line.match(/^netsh\s+int(?:erface)?\s+ip(?:v4)?\s+set\s+address\s+(?:name=)?"?[^"]*?"?\s+(?:source=)?static\s+(\S+)\s+(\S+)(?:\s+(\S+))?\s*$/i);
    if(!m){push(p,[{t:'The syntax supplied for this command is not valid. Check help for the correct syntax.',c:'err'},{t:'[tutor] '+(TP()?pcHint(p):PCHINT()),c:'tut'}]);LS.err++;return}
    const[,ip,mk,gw]=m,l=mask2len(mk);if(!isIP(ip)||l===null||(gw&&!isIP(gw))){push(p,{t:'The parameter is incorrect.',c:'err'});LS.err++;return}
    p.ip=ip;p.len=l;p.gw=gw||'';push(p,'');tut(p,`Nueva IP: ${ip}/${l}${gw?' · gateway '+gw:''}. Revisa con ipconfig.`);return}
  if(cl!=='ping'){push(p,`'${c}' is not recognized as an internal or external command.`,'err');return}
  if(!arg||!/^\d+\.\d+\.\d+\.\d+$/.test(arg)){push(p,'Ping request could not find host '+(arg||'')+'. Please check the name and try again.','err');return}
  if(TP())return tPing(p,arg);if(L3())return pcPing3(p,arg);
  const ok=arg===p.ip||(arg===p.peer&&allOk());const inNet=arg.startsWith(NET());
  push(p,['','Pinging '+arg+' with 32 bytes of data:']);busy=true;render();let i=0;
  drawScore();const tick=()=>{if(i<4){push(p,inNet?(ok?`Reply from ${arg}: bytes=32 time=${i?1:2}ms TTL=128`:'Request timed out.'):'PING: transmit failed. General failure.',ok?'okl':'err');i++;render();setTimeout(tick,ok?380:700)}
    else{push(p,['','Ping statistics for '+arg+':',`    Packets: Sent = 4, Received = ${ok?4:0}, Lost = ${ok?0:4} (${ok?0:100}% loss),`]);
      if(!ok&&arg===p.peer){LS.fails++}if(!ok&&arg===p.peer)tut(p,'Sin respuesta. Revisa la lista de objetivos: algo en SW1 o SW2 aún no está listo.');
      busy=false;render();drawScore();if(ok&&arg===p.peer)win()}};
  setTimeout(tick,500);
}

function pcPing3(p,arg){const r=reach(p,arg),goal=p===PCB&&arg===NET()+'2',gwOk=p.gw&&sameNet(p.ip,p.gw,p.len);
  push(p,['','Pinging '+arg+' with 32 bytes of data:']);busy=true;render();let i=0;
  const tick=()=>{if(i<4){push(p,r.ok?{t:`Reply from ${arg}: bytes=32 time=${i?1:2}ms TTL=255`,c:'okl'}:{t:r.why==='offnet'&&!gwOk?'PING: transmit failed. General failure.':'Request timed out.',c:'err'});i++;render();setTimeout(tick,r.ok?380:650)}
    else{push(p,['','Ping statistics for '+arg+':',`    Packets: Sent = 4, Received = ${r.ok?4:0}, Lost = ${r.ok?0:4} (${r.ok?0:100}% loss),`]);
      if(!r.ok&&goal){LS.fails++;tut(p,r.why==='offnet'?`${arg} no está en la red de esta PC (${p.ip}/${p.len}). Revisa su IP con ipconfig.`:'Sin respuesta. Revisa la lista de objetivos: algo en SW1 o SW2 aún no está listo.')}
      busy=false;render();drawScore();if(r.ok&&goal&&allOk())win()}};
  setTimeout(tick,500)}

/* ================= Labs por topología: varios switches y varias VLAN ================= */
const TP=()=>SC.kind==='topo';
let T=null;
const SLOT={cisco:{p1:['GigabitEthernet0/1','Gi0/1',1],p2:['GigabitEthernet0/2','Gi0/2',2],u1:['GigabitEthernet0/24','Gi0/24',24],u2:['GigabitEthernet0/23','Gi0/23',23]},
 aruba:{p1:['1/1/1','1/1/1',1],p2:['1/1/2','1/1/2',2],u1:['1/1/24','1/1/24',24],u2:['1/1/23','1/1/23',23]},
 juniper:{p1:['ge-0/0/1','ge-0/0/1',2],p2:['ge-0/0/2','ge-0/0/2',3],u1:['ge-0/0/23','ge-0/0/23',24],u2:['ge-0/0/22','ge-0/0/22',23]}};
const PN=(sw,s)=>SLOT[sw.vendor][s][0],PSh=(sw,s)=>SLOT[sw.vendor][s][1];
const VPAIRS=[[10,'VENTAS',20,'RRHH'],[30,'CAMARAS',40,'SOPORTE'],[50,'COMPRAS',60,'CONTABILIDAD'],[70,'VOZ',80,'INVITADOS'],[110,'ALMACEN',120,'GERENCIA']];
const rng=seed=>{let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const swByName=n=>T.sws.find(s=>s.name===n),pcByName=n=>T.pcs.find(p=>p.name===n);
const tnet=v=>'192.168.'+v.id+'.';
/* Definición: posiciones, enlaces, intención (cómo debe quedar), qué viene hecho y qué se rompe */
const Z3=id=>/^(lab3|lab3b|tsh3|pro2|pro3|lab3c|tsh3b)$/.test(id);const L2T=id=>/^(lab1c|tsh1b)$/.test(id);const PRO=id=>/^pro\d$/.test(id),CLK=id=>PRO(id)||id==='plab';
const TKN={tsh1:[1,1050],lab1b:[1,1043],lab2:[2,2001],lab2b:[2,2002],tsh2:[2,2050],lab3:[3,3001],lab3b:[3,3002],tsh3:[3,3050],plab:[0,1000],lab1c:[1,1060],tsh1b:[1,1070],lab3c:[3,3060],tsh3b:[3,3070],pro1:[2,9101],pro2:[3,9201],pro3:[3,9301]};const BLIND={plab:1,lab1b:1,lab2b:1,lab3b:1,pro1:1,pro2:1,pro3:1};
const SIMB={sim1:'lab1b',sim2:'lab2',sim3:'lab3'};
function topoDef(id,seed,forceV){if(SIMB[id]){const d=topoDef(SIMB[id],seed,forceV);d.sim=id;d.blind=false;return d}const R=rng(seed),pick=a=>a[Math.floor(R()*a.length)],VS=['cisco','aruba','juniper'];
 const P=pick(VPAIRS),A={id:P[0],name:P[1]},B={id:P[2],name:P[3]},three=!/^(tsh1|lab1b|plab)$/.test(id);
 const sws=three?[{name:'CORE',x:300,y:70,lab:'top'},{name:'ACC1',x:160,y:192,lab:'left'},{name:'ACC2',x:440,y:192,lab:'right'}]:[{name:'SW1',x:170,y:78,lab:'top'},{name:'SW2',x:430,y:78,lab:'top'}];
 sws.forEach((s,i)=>s.vendor=forceV&&forceV[i]||pick(VS));
 const acc=three?['ACC1','ACC2']:['SW1','SW2'],pcs=[];
 acc.forEach((s,i)=>{const sx=sws.find(x=>x.name===s);[[A,'p1'],[B,'p2']].forEach(([v,slot],j)=>pcs.push({name:'PC-'+v.name.slice(0,3)+(i+1),sw:s,slot,vlan:v,ip:tnet(v)+(11+i),x:sx.x+(j?58:-58),y:sx.y+(three?118:138)}))});
 const links=three?[{a:'CORE',as:'u1',b:'ACC1',bs:'u1'},{a:'CORE',as:'u2',b:'ACC2',bs:'u1'}]:[{a:'SW1',as:'u1',b:'SW2',bs:'u1'}];
 const intent={};for(const s of sws)intent[s.name]={vlans:[A,B],access:{},trunk:{},svi:{}};
 for(const p of pcs)intent[p.sw].access[p.slot]=p.vlan;
 for(const l of links){intent[l.a].trunk[l.as]=[A,B];intent[l.b].trunk[l.bs]=[A,B]}
 if(three&&id!=='tsh0'&&!L2T(id)){intent.CORE.svi[A.id]=tnet(A)+'2';intent.CORE.svi[B.id]=tnet(B)+'2'}
 const NAT={id:999,name:'NATIVA',user:true},C={id:150,name:'SERVIDORES'};
 if(Z3(id)){for(const s of sws){const I=intent[s.name];I.vlans=s.name==='CORE'?[A,B,C,NAT]:[A,B,NAT];I.native=NAT;I.deny=[C]}}
 const d={id,seed,A,B,C:Z3(id)?C:null,NAT:Z3(id)?NAT:null,zone:TKN[id][0],tk:TKN[id][1],blind:!!BLIND[id],three,sws,pcs,links,intent,pre:{},faults:[],brokenPC:null,goals:[]};
 const pa=pcs.filter(p=>p.vlan===A),pb=pcs.filter(p=>p.vlan===B);
 d.goals.push({from:pa[0].name,to:pa[1].ip,label:`${pa[0].name} → ${pa[1].name}`},{from:pb[0].name,to:pb[1].ip,label:`${pb[0].name} → ${pb[1].name}`});
 if(id==='lab1b'||id==='plab'){for(const s of sws)d.pre[s.name]={};return d}
 if(id==='lab3'||id==='lab3b'){for(const s of sws)d.pre[s.name]=s.name==='CORE'?{vl:true,svi:true}:{vl:true,acc:true};
  d.goals.push({from:pa[1].name,to:tnet(A)+'2',label:`${pa[1].name} → CORE (${tnet(A)}2)`},{from:pb[0].name,to:tnet(B)+'2',label:`${pb[0].name} → CORE (${tnet(B)}2)`});return d}
 const coreGoals=()=>d.goals.push({from:pa[1].name,to:tnet(A)+'2',label:`${pa[1].name} → CORE (${tnet(A)}2)`},{from:pb[0].name,to:tnet(B)+'2',label:`${pb[0].name} → CORE (${tnet(B)}2)`});
 if(id==='pro3'){for(const s of sws)d.pre[s.name]={};coreGoals();return d}
 if(id==='lab1c'){for(const s of sws)d.pre[s.name]={};return d}
 if(id==='tsh1b'){for(const s of sws)d.pre[s.name]={l2:true};
  for(let tries=0;tries<60;tries++){const ks=['vlanmiss','accwrong','trunkprune','portdown','uplinkaccess'].map(x=>[R(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]),used=new Set(),ch=[];
   for(const k of ks.concat(ks)){if(ch.length>=4)break;const f=mkFault(k,d,R);if(!f||used.has(f.tgt))continue;used.add(f.tgt);ch.push(f)}if(ch.length===4){d.faults=ch;break}}
  return d}
 if(id==='lab3c'){for(const s of sws)d.pre[s.name]={l2:true,svi:true};coreGoals();const F=[];
  for(const s of sws)F.push({k:'vlanmiss',sk:'vlan',tgt:s.name+':vlan999',sw:s.name,v:NAT,lbl:s.name,task:`Crear la VLAN 999 (NATIVA)`,fixed:`${s.name}: VLAN 999 NATIVA creada`,hint:tHint(s,'vlan',{v:NAT})});
  for(const l of links)for(const side of['a','b']){const sn=l[side],slot=l[side+'s'],s=sws.find(x=>x.name===sn),o=side==='a'?l.b:l.a;F.push({k:'nativemis',sk:'nat',tgt:sn+':'+slot+':nat',sw:sn,slot,v:{id:1,name:'default'},lbl:sn,task:`Trunk hacia ${o}: nativa 999 (hoy es la 1)`,fixed:`${sn}: trunk hacia ${o} con nativa 999`,hint:tHint(s,'native',{slot,v:NAT})})}
  const core=sws.find(x=>x.name==='CORE');for(const l of links){const slot=l.as,n=PN(core,slot);F.push({k:'trunkleak',sk:'up',tgt:'CORE:'+slot+':leak',sw:'CORE',slot,v:C,lbl:'CORE',task:`Trunk hacia ${l.b}: quitar la VLAN ${C.id} (${C.name})`,fixed:`CORE: la VLAN ${C.id} ya no baja a ${l.b}`,hint:core.vendor==='cisco'?`configure terminal\ninterface ${PSh(core,slot)}\n switchport trunk allowed vlan ${A.id},${B.id}`:core.vendor==='aruba'?`configure terminal\ninterface ${n}\n no vlan trunk allowed ${C.id}`:`configure\ndelete interfaces ${n} unit 0 family ethernet-switching vlan members ${C.name}\ncommit`})}
  d.faults=F.filter(f=>f.k==='trunkleak').concat(F.filter(f=>f.k!=='trunkleak'));return d}
 if(id==='tsh3b'){for(const s of sws)d.pre[s.name]={l2:true,svi:true};coreGoals();
  for(let tries=0;tries<80;tries++){const ks=['nativemis'].concat(['trunkleak','trunkprune','uplinkaccess','vlanmiss','portdown','svishut','pcip'].map(x=>[R(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])),used=new Set(),ch=[];
   for(const k of ks){if(ch.length>=4)break;const f=mkFault(k,d,R);if(!f||used.has(f.tgt))continue;used.add(f.tgt);ch.push(f)}if(ch.length===4&&ch[0].k==='nativemis'){d.faults=ch;break}}
  return d}
 if(id==='pro1'||id==='pro2'){for(const s of sws)d.pre[s.name]={l2:true,svi:true};coreGoals();
  const L3F=/^(pcip|pcmask|sviwrong|svishut)$/;
  for(let tries=0;tries<80;tries++){const base=id==='pro2'?['nativemis','trunkleak']:[],pool=id==='pro2'?['trunkprune','uplinkaccess','vlanmiss','portdown','pcip','svishut','accwrong']:['vlanmiss','accwrong','trunkprune','portdown','pcip','pcmask','sviwrong','svishut','uplinkaccess'];
   const ks=base.concat(pool.map(x=>[R(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])),used=new Set(),ch=[];
   for(const k of ks){if(ch.length>=4)break;const f=mkFault(k,d,R);if(!f||used.has(f.tgt))continue;if(id==='pro2'&&ch.length<2&&f.k!==k)continue;used.add(f.tgt);ch.push(f)}
   if(ch.length===4&&(id==='pro2'||(ch.some(f=>L3F.test(f.k))&&ch.some(f=>!L3F.test(f.k))))&&(id!=='pro2'||(ch[0].k==='nativemis'&&ch[1].k==='trunkleak'))){d.faults=ch;break}}
  return d}
 if(id==='tsh3'){for(const s of sws)d.pre[s.name]={l2:true,svi:true};
  d.goals.push({from:pa[1].name,to:tnet(A)+'2',label:`${pa[1].name} → CORE (${tnet(A)}2)`},{from:pb[0].name,to:tnet(B)+'2',label:`${pb[0].name} → CORE (${tnet(B)}2)`});
  for(let tries=0;tries<40;tries++){const used=new Set(),ch=[];for(const k of['nativemis','trunkleak',pick(['trunkprune','uplinkaccess','vlanmiss','portdown','pcip'])]){const f=mkFault(k,d,R);if(!f||used.has(f.tgt))break;used.add(f.tgt);ch.push(f)}if(ch.length===3){d.faults=ch;break}}
  return d}
 if(id==='lab2'||id==='lab2b'){const blank=pick(acc);d.blank=blank;for(const s of sws)d.pre[s.name]=s.name===blank?{}:{l2:true};
  const bp=pick(pcs);d.brokenPC=bp.name;d.goals.push({from:bp.name,to:tnet(bp.vlan)+'2',label:`${bp.name} → CORE (${tnet(bp.vlan)}2)`})}
 else{for(const s of sws)d.pre[s.name]={l2:true,svi:true};
  if(three){d.goals.push({from:pa[1].name,to:tnet(A)+'2',label:`${pa[1].name} → CORE (${tnet(A)}2)`},{from:pb[0].name,to:tnet(B)+'2',label:`${pb[0].name} → CORE (${tnet(B)}2)`})}
  const cat=['vlanmiss','accwrong','trunkprune','portdown'].concat(three?['pcip','pcmask','sviwrong','svishut']:[]);
  const chosen=[],used=new Set();const shuffled=cat.map(x=>[R(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  for(const k of shuffled){if(chosen.length>=3)break;const f=mkFault(k,d,R);if(!f||used.has(f.tgt))continue;used.add(f.tgt);chosen.push(f)}
  if(three&&!chosen.some(f=>/^(pcip|pcmask|sviwrong|svishut)$/.test(f.k))){const f=mkFault(pick(['pcip','sviwrong']),d,R);if(f&&!used.has(f.tgt)){chosen.pop();chosen.push(f)}}
  d.faults=chosen}
 return d}
function mkFault(k,d,R){const pick=a=>a[Math.floor(R()*a.length)],acc=d.three?['ACC1','ACC2']:['SW1','SW2'];
 if(k==='vlanmiss'){const s=pick(acc),v=pick([d.A,d.B]);return{k,tgt:s+':vlan'+v.id,sw:s,v,hint:`Revisa las VLAN que existen en ${s} (show vlan / show vlans).`,fixed:`${s}: la VLAN ${v.id} (${v.name}) faltaba`}}
 if(k==='accwrong'){const p=pick(d.pcs),o=p.vlan===d.A?d.B:d.A;return{k,tgt:p.sw+':'+p.slot,pc:p.name,sw:p.sw,slot:p.slot,v:p.vlan,o,hint:`Revisa en qué VLAN está el puerto de ${p.name} en ${p.sw}.`,fixed:`${p.sw}: el puerto de ${p.name} estaba en la VLAN ${o.id}`}}
 if(k==='trunkprune'){const l=pick(d.links),side=pick(['a','b']),s=l[side],slot=l[side+'s'],v=pick([d.A,d.B]);return{k,tgt:s+':'+slot,sw:s,slot,v,hint:`Revisa qué VLAN deja pasar el trunk de ${s} (show interfaces trunk / show vlan / show vlans).`,fixed:`${s}: el trunk no dejaba pasar la VLAN ${v.id}`}}
 if(k==='portdown'){const p=pick(d.pcs);return{k,tgt:p.sw+':'+p.slot,pc:p.name,sw:p.sw,slot:p.slot,hint:`Revisa el estado del puerto de ${p.name} en ${p.sw} (show interfaces status / show interface brief / show interfaces terse).`,fixed:`${p.sw}: el puerto de ${p.name} estaba apagado`}}
 if(k==='pcip'){const p=pick(d.pcs);return{k,tgt:p.name,pc:p.name,bad:'192.168.'+((p.vlan.id+100)%250)+'.'+p.ip.split('.')[3],hint:`Revisa la IP de ${p.name} con ipconfig.`,fixed:`${p.name} tenía una IP de otra red`}}
 if(k==='pcmask'){const p=pick(d.pcs);return{k,tgt:p.name,pc:p.name,len:30,hint:`Revisa la máscara de ${p.name} con ipconfig.`,fixed:`${p.name} tenía la máscara 255.255.255.252`}}
 if(k==='sviwrong'){const v=pick([d.A,d.B]);return{k,tgt:'CORE:svi'+v.id,v,bad:'192.168.'+((v.id+100)%250)+'.2',hint:'Revisa las IP de las interfaces vlan del CORE (show ip interface brief / show interfaces terse).',fixed:`CORE: la SVI de la VLAN ${v.id} tenía una IP de otra red`}}
 if(k==='nativemis'){const l=pick(d.links),side=pick(['a','b']),s=l[side],slot=l[side+'s'],v=pick([d.A,d.B]);return{k,tgt:s+':'+slot,sw:s,slot,v,hint:`Compara la VLAN nativa en los DOS extremos del trunk de ${s} (show interfaces trunk / show interface brief / show ethernet-switching interfaces).`,fixed:`${s}: la VLAN nativa del trunk era la ${v.id}, no la 999`}}
 if(k==='trunkleak'){const l=pick(d.links),slot=l.as;return{k,tgt:'CORE:'+slot,sw:'CORE',slot,v:d.C,hint:`Revisa qué VLAN deja pasar cada trunk del CORE. ¿Alguno lleva la VLAN ${d.C.id} (${d.C.name}) hacia acceso?`,fixed:`CORE: el trunk hacia ${l.b} dejaba pasar la VLAN ${d.C.id} (${d.C.name})`}}
 if(k==='uplinkaccess'){const l=pick(d.links),side=pick(['a','b']),s=l[side],slot=l[side+'s'],v=pick([d.A,d.B]);return{k,tgt:s+':'+slot,sw:s,slot,v,hint:`Revisa el modo del puerto de ${s} que va hacia el otro switch (show interfaces status / show interface brief / show ethernet-switching interfaces).`,fixed:`${s}: el puerto entre switches estaba en modo access, no trunk`}}
 if(k==='svishut'){const v=pick([d.A,d.B]);return{k,tgt:'CORE:svi'+v.id,v,hint:'Revisa que las interfaces vlan del CORE estén arriba (show ip interface brief / show interfaces terse).',fixed:`CORE: la SVI de la VLAN ${v.id} estaba ${''}apagada o sin ligar`}}
 return null}
/* API de configuración por vendor (para dejar cosas hechas y para romperlas) */
const CF={
 vlan(sw,v,on){if(sw.vendor==='juniper'){if(on)sw.act.vlans[v.name]=Object.assign(sw.act.vlans[v.name]||{},{id:v.id});else delete sw.act.vlans[v.name]}else{if(on)sw.vlans[v.id]=v.name;else delete sw.vlans[v.id]}},
 access(sw,slot,v){const n=PN(sw,slot);if(sw.vendor==='juniper'){const c=sw.act.ifs[n]=sw.act.ifs[n]||{};Object.assign(c,{es:true,mode:'access',members:[v.name]})}else Object.assign(sw.ifs[n],{mode:'access',access:v.id,up:true})},
 trunk(sw,slot,vs,nat){const n=PN(sw,slot),nv=nat?nat.id:1;if(sw.vendor==='juniper'){const c=sw.act.ifs[n]=sw.act.ifs[n]||{};Object.assign(c,{es:true,mode:'trunk',members:vs.map(v=>v.name)});if(nat)c.native=nv;else delete c.native}else Object.assign(sw.ifs[n],{mode:'trunk',allowed:vs.map(v=>v.id).sort((a,b)=>a-b),native:nv,up:true})},
 native(sw,slot,id){const n=PN(sw,slot);if(sw.vendor==='juniper'){const c=sw.act.ifs[n]=sw.act.ifs[n]||{};c.native=id}else sw.ifs[n].native=id},
 up(sw,slot,on){const n=PN(sw,slot);if(sw.vendor==='juniper'){const c=sw.act.ifs[n]=sw.act.ifs[n]||{};if(on)delete c.disable;else c.disable=true}else sw.ifs[n].up=on},
 svi(sw,v,ip,on){if(sw.vendor==='juniper'){sw.act.irb=sw.act.irb||{};sw.act.irb[v.id]={addr:ip+'/24'};const vl=sw.act.vlans[v.name];if(vl){if(on)vl.l3='irb.'+v.id;else delete vl.l3}}
  else sw.ifs['Vlan'+v.id]={svi:true,vid:v.id,ip,len:24,up:on,desc:'',mode:'svi',access:0,allowed:[],native:1}},
 sync(sw){if(sw.vendor==='juniper')sw.cand=clone(sw.act)}};
function buildT(def){const t={...def,sws:[],pcs:[],att:{},pinged:{}};
 for(const s of def.sws){const sw=mkSwitch(s.name,s.vendor);sw.tx=s.x;sw.ty=s.y;sw.lab=s.lab;t.sws.push(sw);t.att[s.name]={}}
 T=t;
 for(const l of def.links){const a=swByName(l.a),b=swByName(l.b);t.att[l.a][PN(a,l.as)]={sw:l.b,port:PN(b,l.bs)};t.att[l.b][PN(b,l.bs)]={sw:l.a,port:PN(a,l.as)}}
 for(const p of def.pcs){const sw=swByName(p.sw),pc=mkPC(p.name,p.ip,'');pc.len=24;pc.gw=tnet(p.vlan)+'1';pc.vlan=p.vlan;pc.want=p.ip;pc.sw=p.sw;pc.slot=p.slot;pc.tx=p.x;pc.ty=p.y;t.pcs.push(pc);t.att[p.sw][PN(sw,p.slot)]={pc:p.name}}
 for(const sw of t.sws){const I=def.intent[sw.name],pre=def.pre[sw.name]||{};
  if(pre.l2){I.vlans.forEach(v=>CF.vlan(sw,v,true));for(const[s,v]of Object.entries(I.access))CF.access(sw,s,v);for(const[s,vs]of Object.entries(I.trunk))CF.trunk(sw,s,vs,I.native)}
  else{if(pre.vl)I.vlans.filter(v=>!v.user).forEach(v=>CF.vlan(sw,v,true));if(pre.acc)for(const[s,v]of Object.entries(I.access))CF.access(sw,s,v)}
  if(pre.svi)for(const[vid,ip]of Object.entries(I.svi))CF.svi(sw,vid==def.A.id?def.A:def.B,ip,true);CF.sync(sw)}
 if(def.brokenPC){const p=pcByName(def.brokenPC);p.ip='192.168.'+((p.vlan.id+100)%250)+'.'+p.want.split('.')[3];p.gw='192.168.'+((p.vlan.id+100)%250)+'.1'}
 for(const f of def.faults){const sw=f.sw&&swByName(f.sw),pc=f.pc&&pcByName(f.pc);
  if(f.k==='vlanmiss'){CF.vlan(sw,f.v,false)}
  else if(f.k==='accwrong'){CF.access(sw,f.slot,f.o)}
  else if(f.k==='trunkprune'){const I=def.intent[f.sw].trunk[f.slot];CF.trunk(sw,f.slot,I.filter(v=>v!==f.v))}
  else if(f.k==='portdown'){CF.up(sw,f.slot,false)}
  else if(f.k==='nativemis'){if(f.v.id===1&&sw.vendor==='juniper'){const c=sw.act.ifs[PN(sw,f.slot)];if(c)delete c.native}else CF.native(sw,f.slot,f.v.id)}
  else if(f.k==='trunkleak'){const I=def.intent.CORE;CF.trunk(sw,f.slot,I.trunk[f.slot].concat([def.C]),I.native)}
  else if(f.k==='uplinkaccess'){CF.access(sw,f.slot,f.v)}
  else if(f.k==='pcip'){pc.ip=f.bad}
  else if(f.k==='pcmask'){pc.len=f.len}
  else if(f.k==='sviwrong'){CF.svi(swByName('CORE'),f.v,f.bad,true)}
  else if(f.k==='svishut'){CF.svi(swByName('CORE'),f.v,tnet(f.v)+'2',false)}
  if(sw)CF.sync(sw)}
 if(def.id==='plab'){for(const sw of t.sws)tut(sw,'Switch en blanco. Es tu lab de ubicación: sin pistas, solo el objetivo y los pings.')}
 else if(def.id==='lab3c'){for(const sw of t.sws)tut(sw,'Red en producción: funciona, pero no cumple las reglas de Seguridad. Cambia sin tumbar a nadie.')}
 else if(def.id==='lab1b'||def.id==='pro3'||def.id==='lab1c'){for(const sw of t.sws)tut(sw,'Switch en blanco. Solo tienes el objetivo y los pings.')}
 else if(def.id==='lab2'||def.id==='lab2b'){const core=swByName('CORE');tut(core,`Este switch ya tiene la capa 2 lista (VLAN ${def.A.id} y ${def.B.id}, trunks). Te falta su IP en cada VLAN.`);const ok=t.sws.find(s=>s.name!==def.blank&&s.name!=='CORE');if(ok)tut(ok,'Este switch ya está configurado. Úsalo de referencia con show running-config.');tut(swByName(def.blank),'Este switch está en blanco: aquí va tu configuración de capa 2.')}
 else if(def.id==='lab3'||def.id==='lab3b'){for(const sw of t.sws)tut(sw,sw.name==='CORE'?`Ya tiene las VLAN ${def.A.id}, ${def.B.id} y ${def.C.id} (${def.C.name}) y sus IP. Faltan los trunks.`:`Ya tiene las VLAN ${def.A.id} y ${def.B.id} y los puertos de las PCs. Falta el trunk hacia el CORE.`)}
 else for(const sw of t.sws)tut(sw,'Este switch ya estaba configurado… pero algo se movió. Investiga con comandos show.');
 return t}
function tLinkUp(sw,n){const e=eff(sw).ifs[n];if(!e||!e.up)return false;const a=T.att[sw.name][n];if(!a)return false;if(a.pc)return true;const o=swByName(a.sw);return !!(eff(o).ifs[a.port]&&eff(o).ifs[a.port].up)}
/* Cómo sale la VLAN V por el puerto n: 'T' con tag 802.1Q, 'U' sin tag (access o nativa del trunk), null si no sale.
   Un enlace lleva la VLAN solo si los dos lados la mandan igual: si un lado la manda sin tag (nativa) y el otro con tag, se rompe. */
const carry=(sw,n,V)=>{const e=eff(sw),i=e.ifs[n];if(!i||!e.vlans[V])return null;if(i.mode==='trunk'){const nat=i.native||1;if(nat===V)return(allows(i,V)||sw.vendor!=='cisco')?'U':null;return allows(i,V)?'T':null}return(i.access===V)?'U':null};
function comps(V){const par={};const f=x=>par[x]===undefined||par[x]===x?(par[x]=x):(par[x]=f(par[x]));for(const s of T.sws)par[s.name]=s.name;
 for(const s of T.sws)for(const[n,a]of Object.entries(T.att[s.name])){if(!a.sw||!tLinkUp(s,n))continue;const o=swByName(a.sw),c1=carry(s,n,V),c2=carry(o,a.port,V);if(c1&&c1===c2)par[f(s.name)]=f(o.name)}
 return f}
function tEndpoints(){const o=[],F={};const cf=V=>F[V]||(F[V]=comps(V));
 for(const p of T.pcs){const sw=swByName(p.sw),n=PN(sw,p.slot),e=eff(sw).ifs[n];let V=null;if(tLinkUp(sw,n)&&e.mode!=='trunk'&&eff(sw).vlans[e.access])V=e.access;o.push({dev:p,ip:p.ip,len:p.len,V,comp:V?cf(V)(sw.name):null})}
 for(const sw of T.sws)for(const x of svis(sw))if(x.up)o.push({dev:sw,ip:x.ip,len:x.len,V:x.vid,comp:cf(x.vid)(sw.name)});return o}
function reachT(dev,ip){const E=tEndpoints(),mine=E.filter(e=>e.dev===dev);if(!mine.length)return{ok:false,why:'nosrc'};if(mine.some(e=>e.ip===ip))return{ok:true};
 const src=mine.find(e=>sameNet(e.ip,ip,e.len));if(!src)return{ok:false,why:'offnet'};if(!src.V)return{ok:false,why:'nol2'};
 const dst=E.find(e=>e.ip===ip&&e.dev!==dev);if(!dst)return{ok:false,why:'nohost'};if(dst.V!==src.V||dst.comp!==src.comp)return{ok:false,why:'nol2'};
 if(!sameNet(dst.ip,src.ip,dst.len))return{ok:false,why:'noreply'};return{ok:true}}
/* Objetivos y pistas */
const vlist=vs=>vs.map(v=>v.id).join(',');
function tHint(sw,k,a){const V=a.v,c=sw.vendor;
 if(k==='vlan')return c==='juniper'?`configure\nset vlans ${V.name} vlan-id ${V.id}\ncommit`:`configure terminal\nvlan ${V.id}\n name ${V.name}`;
 if(k==='access'){const n=PN(sw,a.slot);return c==='cisco'?`configure terminal\ninterface ${PSh(sw,a.slot)}\n switchport mode access\n switchport access vlan ${V.id}`:c==='aruba'?`configure terminal\ninterface ${n}\n no shutdown\n vlan access ${V.id}`:`configure\ndelete interfaces ${n} unit 0 family ethernet-switching vlan members\nset interfaces ${n} unit 0 family ethernet-switching interface-mode access\nset interfaces ${n} unit 0 family ethernet-switching vlan members ${V.name}\ncommit`}
 if(k==='trunk'){const n=PN(sw,a.slot);return c==='cisco'?`configure terminal\ninterface ${PSh(sw,a.slot)}\n switchport mode trunk\n switchport trunk allowed vlan ${vlist(a.vs)}`:c==='aruba'?`configure terminal\ninterface ${n}\n no shutdown\n vlan trunk allowed ${vlist(a.vs)}`:`configure\nset interfaces ${n} unit 0 family ethernet-switching interface-mode trunk\n${a.vs.map(v=>`set interfaces ${n} unit 0 family ethernet-switching vlan members ${v.name}`).join('\n')}\ncommit`}
 if(k==='native'){const n=PN(sw,a.slot);return c==='cisco'?`configure terminal\ninterface ${PSh(sw,a.slot)}\n switchport trunk native vlan ${V.id}`:c==='aruba'?`configure terminal\ninterface ${n}\n vlan trunk native ${V.id}`:`configure\nset interfaces ${n} native-vlan-id ${V.id}\ncommit`}
 if(k==='svi')return c==='cisco'?`configure terminal\ninterface vlan ${V.id}\n ip address ${a.ip} 255.255.255.0\n no shutdown`:c==='aruba'?`configure terminal\ninterface vlan ${V.id}\n ip address ${a.ip}/24\n no shutdown`:`configure\nset interfaces irb unit ${V.id} family inet address ${a.ip}/24\nset vlans ${V.name} l3-interface irb.${V.id}\ncommit`}
const pcHint=p=>`netsh interface ip set address "Ethernet0" static ${p.want} 255.255.255.0 ${tnet(p.vlan)}1`;
function tChecks(){const r=[];
 if(T.faults.length){T.faults.forEach((f,i)=>{const ok=faultFixed(f);r.push({who:{name:f.lbl||('Falla '+(i+1)),type:'x'},k:f.sk||'fault',t:ok?f.fixed+(f.task?'':' · corregida'):(f.task||'Escondida en algún lugar de la red'),ok,hint:f.hint})});return r}
 for(const sw of T.sws){const I=T.intent[sw.name],pre=T.pre[sw.name]||{},e=eff(sw);
  if(!pre.l2){for(const v of I.vlans){if(pre.vl&&!v.user)continue;r.push({who:sw,k:'vlan',t:v.user?`VLAN ${v.id} (${v.name}) creada: será la nativa de los trunks`:`VLAN ${v.id} creada con nombre ${v.name}`,ok:!!e.vlans[v.id]&&String(e.vlans[v.id]).toUpperCase()===v.name,hint:tHint(sw,'vlan',{v})})}
   if(!pre.acc)for(const[s,v]of Object.entries(I.access)){const p=T.pcs.find(x=>x.sw===sw.name&&x.slot===s),n=PN(sw,s),i=e.ifs[n];r.push({who:sw,k:'pc',t:`${PSh(sw,s)} hacia ${p.name}: acceso, VLAN ${v.id}, encendido`,ok:i.up&&i.mode==='access'&&i.access===v.id&&!!e.vlans[v.id],hint:tHint(sw,'access',{slot:s,v})})}
   for(const[s,vs]of Object.entries(I.trunk)){const n=PN(sw,s),i=e.ifs[n],o=T.att[sw.name][n].sw,dn=I.deny||[];r.push({who:sw,k:'up',t:dn.length?`${PSh(sw,s)} hacia ${o}: trunk solo con las VLAN ${vlist(vs)} (la ${dn.map(v=>v.id).join(',')} no pasa)`:`${PSh(sw,s)} hacia ${o}: trunk con las VLAN ${vlist(vs)}`,ok:i.up&&i.mode==='trunk'&&vs.every(v=>allows(i,v.id)&&!!e.vlans[v.id])&&!dn.some(v=>allows(i,v.id)),hint:tHint(sw,'trunk',{slot:s,vs})});
    if(I.native)r.push({who:sw,k:'nat',t:`${PSh(sw,s)} hacia ${o}: VLAN nativa ${I.native.id}`,ok:i.mode==='trunk'&&(i.native||1)===I.native.id,hint:tHint(sw,'native',{slot:s,v:I.native})})}}
  if(!pre.svi)for(const[vid,ip]of Object.entries(I.svi)){const v=+vid===T.A.id?T.A:T.B;r.push({who:sw,k:'svi',t:`Interfaz VLAN ${v.id} (SVI) con IP ${ip}/24, encendida`,ok:svis(sw).some(x=>x.vid===v.id&&x.up&&x.ip===ip&&x.len===24),hint:tHint(sw,'svi',{v,ip})})}}
 for(const p of T.pcs)if(p.name===T.brokenPC)r.push({who:p,k:'pcip',t:`IP de ${p.name} en su VLAN: ${p.want}/24, gateway ${tnet(p.vlan)}1`,ok:p.ip===p.want&&p.len===24&&p.gw===tnet(p.vlan)+'1',hint:pcHint(p)});
 return r}
function faultFixed(f){const sw=f.sw&&swByName(f.sw),pc=f.pc&&pcByName(f.pc),e=sw&&eff(sw);
 if(f.k==='vlanmiss')return!!e.vlans[f.v.id];
 if(f.k==='accwrong'){const i=e.ifs[PN(sw,f.slot)];return i.mode==='access'&&i.access===f.v.id}
 if(f.k==='trunkprune'){const i=e.ifs[PN(sw,f.slot)];return i.mode==='trunk'&&allows(i,f.v.id)}
 if(f.k==='portdown')return!!e.ifs[PN(sw,f.slot)].up;
 if(f.k==='nativemis'){const i=e.ifs[PN(sw,f.slot)];return i.mode==='trunk'&&(i.native||1)===999}
 if(f.k==='trunkleak'){const i=e.ifs[PN(sw,f.slot)];return!allows(i,f.v.id)}
 if(f.k==='uplinkaccess'){const i=e.ifs[PN(sw,f.slot)],I=T.intent[f.sw];return i.mode==='trunk'&&I.trunk[f.slot].every(v=>allows(i,v.id))&&(!I.native||(i.native||1)===I.native.id)}
 if(f.k==='pcip')return pc.ip===pc.want;
 if(f.k==='pcmask')return pc.len===24;
 if(f.k==='sviwrong'||f.k==='svishut')return svis(swByName('CORE')).some(x=>x.vid===f.v.id&&x.up&&x.ip===tnet(f.v)+'2'&&x.len===24);
 return true}
const tGoalsDone=()=>T.goals.every((g,i)=>T.pinged[i]);
const tAllOk=()=>tChecks().every(c=>c.ok)&&tGoalsDone();
function tSolutions(){const o=[];for(const sw of T.sws){const I=T.intent[sw.name],pre=T.pre[sw.name]||{},L=[];
  if(T.faults.length){for(const f of T.faults.filter(f=>f.sw===sw.name||(f.v&&/svi/.test(f.k)&&sw.name==='CORE')).sort((x,y)=>(x.k==='vlanmiss'?0:1)-(y.k==='vlanmiss'?0:1))){if(f.k==='vlanmiss')L.push(tHint(sw,'vlan',{v:f.v}));if(f.k==='accwrong')L.push(tHint(sw,'access',{slot:f.slot,v:f.v}));if(f.k==='trunkprune')L.push(tHint(sw,'trunk',{slot:f.slot,vs:I.trunk[f.slot]}));if(f.k==='nativemis')L.push(tHint(sw,'native',{slot:f.slot,v:T.NAT}));if(f.k==='uplinkaccess'){L.push(tHint(sw,'trunk',{slot:f.slot,vs:I.trunk[f.slot]}));if(I.native)L.push(tHint(sw,'native',{slot:f.slot,v:I.native}))}if(f.k==='trunkleak')L.push(sw.vendor==='cisco'?`configure terminal\ninterface ${PSh(sw,f.slot)}\n switchport trunk allowed vlan ${vlist(I.trunk[f.slot])}`:sw.vendor==='aruba'?`configure terminal\ninterface ${PN(sw,f.slot)}\n no vlan trunk allowed ${f.v.id}`:`configure\ndelete interfaces ${PN(sw,f.slot)} unit 0 family ethernet-switching vlan members ${f.v.name}\ncommit`);if(f.k==='portdown')L.push(sw.vendor==='cisco'?`configure terminal\ninterface ${PSh(sw,f.slot)}\n no shutdown`:sw.vendor==='aruba'?`configure terminal\ninterface ${PN(sw,f.slot)}\n no shutdown`:`configure\ndelete interfaces ${PN(sw,f.slot)} disable\ncommit`);if(/svi/.test(f.k))L.push(tHint(sw,'svi',{v:f.v,ip:tnet(f.v)+'2'}))}}
  else{if(!pre.l2){I.vlans.filter(v=>!pre.vl||v.user).forEach(v=>L.push(tHint(sw,'vlan',{v})));if(!pre.acc)for(const[s,v]of Object.entries(I.access))L.push(tHint(sw,'access',{slot:s,v}));for(const[s,vs]of Object.entries(I.trunk)){L.push(tHint(sw,'trunk',{slot:s,vs}));if(I.native)L.push(tHint(sw,'native',{slot:s,v:I.native}))}}if(!pre.svi)for(const[vid,ip]of Object.entries(I.svi))L.push(tHint(sw,'svi',{v:+vid===T.A.id?T.A:T.B,ip}))}
  if(L.length)o.push({t:sw.name+' · '+VEND[sw.vendor].label,s:(sw.vendor==='cisco'?'enable\n':'')+L.map(x=>x.replace(/^configure terminal\n|^configure\n/,'').replace(/\ncommit$/,'')).join('\n').replace(/^/,sw.vendor==='juniper'?'configure\n':'configure terminal\n')+(sw.vendor==='juniper'?'\ncommit':'\nend\nwrite memory')})}
 for(const p of T.pcs)if(p.name===T.brokenPC||T.faults.some(f=>f.pc===p.name&&/pc/.test(f.k)))o.push({t:p.name,s:pcHint(p)});return o}
function tPing(p,arg){const r=reachT(p,arg),gi=T.goals.findIndex(g=>g.from===p.name&&g.to===arg),gwOk=p.gw&&sameNet(p.ip,p.gw,p.len);
 push(p,['','Pinging '+arg+' with 32 bytes of data:']);busy=true;render();let i=0;
 const tick=()=>{if(i<4){push(p,r.ok?{t:`Reply from ${arg}: bytes=32 time=${i?1:2}ms TTL=${/\.2$/.test(arg)?255:128}`,c:'okl'}:{t:r.why==='offnet'&&!gwOk?'PING: transmit failed. General failure.':'Request timed out.',c:'err'});i++;render();setTimeout(tick,r.ok?330:600)}
  else{push(p,['','Ping statistics for '+arg+':',`    Packets: Sent = 4, Received = ${r.ok?4:0}, Lost = ${r.ok?0:4} (${r.ok?0:100}% loss),`]);
   if(gi>=0){if(r.ok){T.pinged[gi]=true;const left=T.goals.filter((g,k)=>!T.pinged[k]);if(left.length&&!SC.exam)tut(p,`Objetivo cumplido. Te faltan: ${left.map(g=>g.label).join(' · ')}`)}
    else{LS.fails++;if(!SC.exam)tut(p,r.why==='offnet'?`${arg} no está en la red de esta PC (${p.ip}/${p.len}). Revisa ipconfig.`:r.why==='nol2'?'No hay camino de capa 2: revisa VLANs, puertos de acceso y trunks en el recorrido.':'Nadie responde con esa IP en esta VLAN. ¿Ya tiene su IP el destino?')}}
   busy=false;render();drawScore();if(r.ok&&tAllOk())win()}};
 setTimeout(tick,450)}
function drawTopoT(){const big=T.three,H=big?380:300;$('#topo').setAttribute('viewBox',big?'12 6 576 372':'40 10 520 290');
 const clip=(a,b,hw,hh)=>{const dx=b.x-a.x,dy=b.y-a.y,s=Math.min(dx?hw/Math.abs(dx):1e9,dy?hh/Math.abs(dy):1e9);return{x:a.x+dx*s,y:a.y+dy*s}};
 const L=[],LED=[],TX=[];
 const tx=(x,y,s,an='middle',sz=12,col='var(--mut)',mono=true)=>`<text x="${x}" y="${y}" text-anchor="${an}" font-size="${sz}" ${mono?'font-family="IBM Plex Mono,monospace"':''} fill="${col}">${s}</text>`;
 const drawn=new Set();
 for(const sw of T.sws)for(const[n,a]of Object.entries(T.att[sw.name])){const A={x:sw.tx,y:sw.ty};let B,up=tLinkUp(sw,n),tr=false,key;
  if(a.pc){const p=pcByName(a.pc);B={x:p.tx,y:p.ty};key=sw.name+n}else{const o=swByName(a.sw);B={x:o.tx,y:o.ty};key=[sw.name+n,o.name+a.port].sort().join('|');if(drawn.has(key))continue;tr=!SC.exam&&up&&eff(sw).ifs[n].mode==='trunk'&&eff(o).ifs[a.port].mode==='trunk'}
  drawn.add(key);const p1=clip(A,B,47,17),p2=a.pc?clip(B,A,26,20):clip(B,A,47,17);
  L.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${up?(tr?'var(--trunk)':'var(--blue)'):'#9aa4ad'}" stroke-width="${tr?6:3.5}" ${up?'':'stroke-dasharray="6 5"'} stroke-linecap="round"/>`);
  LED.push(`<circle cx="${p1.x}" cy="${p1.y}" r="4.5" fill="${up?'var(--ok)':'#9aa4ad'}"/>`);
  const m={x:p1.x+(p2.x-p1.x)*(a.pc?.5:.3),y:p1.y+(p2.y-p1.y)*(a.pc?.5:.3)},side=(p2.x>=p1.x?1:-1);TX.push(tx(m.x+(a.pc?side*8:0),m.y+(a.pc?4:-8),PSh(sw,Object.keys(SLOT[sw.vendor]).find(k=>PN(sw,k)===n)),a.pc?(side>0?'start':'end'):'middle',11));
  if(!a.pc){const o=swByName(a.sw),q={x:p2.x+(p1.x-p2.x)*.3,y:p2.y+(p1.y-p2.y)*.3};LED.push(`<circle cx="${p2.x}" cy="${p2.y}" r="4.5" fill="${up?'var(--ok)':'#9aa4ad'}"/>`);TX.push(tx(q.x,q.y-8,PSh(o,Object.keys(SLOT[o.vendor]).find(k=>PN(o,k)===a.port)),'middle',11))}}
 const swG=d=>{const x=d.tx,y=d.ty,col=d.vendor==='aruba'?'#d7dce1':d.vendor==='juniper'?'#2b2e33':'#3c5a78',sv=svis(d).filter(s=>s.up).map(s=>'.'+s.ip.split('.')[3]+'/v'+s.vid).join(' ');
  const lx=d.lab==='left'?x-56:d.lab==='right'?x+56:x,ly=d.lab==='top'?y-46:y-6,an=d.lab==='left'?'end':d.lab==='right'?'start':'middle';
  return`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-52}" y="${y-24}" width="104" height="48" rx="9" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-46}" y="${y-16}" width="92" height="32" rx="5" fill="${col}"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${x-38+i*9.5}" y="${y-6}" width="6" height="5" fill="#111"/><rect x="${x-38+i*9.5}" y="${y+2}" width="6" height="5" fill="#111"/>`).join('')}
   <text x="${lx}" y="${ly}" text-anchor="${an}" font-size="15" font-weight="600" fill="currentColor">${d.name}</text><text x="${lx}" y="${ly+16}" text-anchor="${an}" font-size="12" fill="var(--mut)">${VEND[d.vendor].label}</text>${sv?tx(d.lab==='top'?x+54:lx,d.lab==='top'?y+4:ly+31,'SVI '+sv,d.lab==='top'?'start':an,11,'var(--ok)'):''}</g>`};
 const pcG=d=>{const x=d.tx,y=d.ty;return`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-36}" y="${y-26}" width="72" height="80" rx="9" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-24}" y="${y-20}" width="48" height="32" rx="3" fill="#1d252c"/><rect x="${x-20}" y="${y-16}" width="40" height="24" fill="${done?'#16a35c':'#2f6fd6'}"/><rect x="${x-4}" y="${y+12}" width="8" height="7" fill="#55606a"/><rect x="${x-14}" y="${y+19}" width="28" height="4" rx="2" fill="#55606a"/><text x="${x}" y="${y+40}" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">${d.name}</text>${tx(x,y+55,d.ip.replace('192.168.','…')+(d.len!==24?'/'+d.len:''),'middle',11)}</g>`};
 $('#topo').innerHTML=`<g style="color:var(--ink)" font-family="IBM Plex Sans,sans-serif">${L.join('')}${LED.join('')}${TX.join('')}${T.sws.map(swG).join('')}${T.pcs.map(pcG).join('')}</g>`}

/* ---------- UI ---------- */
const out=$('#out'),cmd=$('#cmd');
function select(d){cur=d;cmd.value='';render();}
function render(){
  out.innerHTML=cur.lines.map(l=>l.c?`<span class="${l.c}">${esc(l.t)}</span>`:esc(l.t)).join('\n');out.scrollTop=out.scrollHeight;
  $('#pr').textContent=busy?'':prompt(cur);cmd.disabled=busy;
  $('#tinfo').textContent=cur.type==='pc'?cur.name+' · '+cur.ip:cur.name+' · '+VEND[cur.vendor].label+' · modo '+MODE_ES[cur.mode];
  $('#tabs').innerHTML=devs.map(d=>`<button role="tab" aria-selected="${d===cur}" data-dev="${d.name}">${d.name}</button>`).join('');
  drawTopo();drawChecks();clearTimeout(render._t);render._t=setTimeout(saveLab,300);
}
function drawTopo(){if(TP())return drawTopoT();$('#topo').setAttribute('viewBox','0 0 560 190');
  const a=VEND[S1.vendor],b=VEND[S2.vendor],e1=eff(S1),e2=eff(S2);
  const l1=linkUp(S1,a.pc),l2=linkUp(S2,b.pc),lt=linkUp(S1,a.up),tr=!SC.exam&&lt&&e1.ifs[a.up].mode==='trunk'&&e2.ifs[b.up].mode==='trunk';
  const ln=(x1,x2,on,col,w)=>`<line x1="${x1}" y1="80" x2="${x2}" y2="80" stroke="${on?col:'#9aa4ad'}" stroke-width="${w}" ${on?'':'stroke-dasharray="6 5"'} stroke-linecap="round"/>`;
  const led=(x,on)=>`<circle cx="${x}" cy="80" r="5" fill="${on?'var(--ok)':'#9aa4ad'}"/>`;
  const sw=(d,x,v)=>`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-52}" y="52" width="104" height="56" rx="10" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-46}" y="64" width="92" height="32" rx="5" fill="${d.vendor==='aruba'?'#d7dce1':d.vendor==='juniper'?'#2b2e33':'#3c5a78'}"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${x-38+i*9.5}" y="74" width="6" height="5" fill="#111"/><rect x="${x-38+i*9.5}" y="82" width="6" height="5" fill="#111"/>`).join('')}<text x="${x}" y="130" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor">${d.name}</text><text x="${x}" y="149" text-anchor="middle" font-size="13" fill="var(--mut)">${v.label}</text>${L3()?`<text x="${x}" y="168" text-anchor="middle" font-size="12" font-family="IBM Plex Mono,monospace" fill="${sviOf(d)?'var(--ok)':'var(--mut)'}">SVI ${sviOf(d)?'.'+sviOf(d).ip.split('.')[3]:'sin IP'}</text>`:''}</g>`;
  const pc=(d,x)=>`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-38}" y="50" width="76" height="60" rx="10" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-24}" y="58" width="48" height="32" rx="3" fill="#1d252c"/><rect x="${x-20}" y="62" width="40" height="24" fill="${done?'#16a35c':'#2f6fd6'}"/><rect x="${x-4}" y="90" width="8" height="8" fill="#55606a"/><rect x="${x-14}" y="98" width="28" height="4" rx="2" fill="#55606a"/><text x="${x}" y="130" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor">${d.name}</text><text x="${x}" y="149" text-anchor="middle" font-size="13" fill="var(--mut)">${d.ip.replace('192.168.','…')}</text></g>`;
  const t=(x,y,s,an)=>`<text x="${x}" y="${y}" text-anchor="${an}" font-size="13" font-family="IBM Plex Mono,monospace" fill="var(--mut)">${s}</text>`;
  $('#topo').innerHTML=`<g style="color:var(--ink)" font-family="IBM Plex Sans,sans-serif">${ln(76,133,l1,'var(--blue)',4)}${ln(237,323,lt,tr?'var(--trunk)':'var(--blue)',tr?7:4)}${ln(427,484,l2,'var(--blue)',4)}${led(133,l1)}${led(237,lt)}${led(323,lt)}${led(427,l2)}
  ${t(133,40,a.pcS,'end')}${t(237,40,a.upS,'start')}${t(323,178,b.upS,'end')}${t(427,178,b.pcS,'start')}
  ${pc(PCA,45)}${sw(S1,185,a)}${sw(S2,375,b)}${pc(PCB,515)}</g>`;
}
const mmss=ms=>{const t=Math.max(0,Math.floor(ms/1000));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
setInterval(()=>{if(TP()&&T&&CLK(T.id)&&!done&&!SC.exam){const e=$('#lclock');if(e)e.textContent=mmss(Date.now()-LS.t0)}},1000);
function drawScore(){const e=$('#lscore');if(e&&TP()&&T&&CLK(T.id)&&!SC.exam){e.innerHTML=`<span class="lclockw">${'⏱'} <b id="lclock" class="mono">${mmss(Date.now()-LS.t0)}</b></span> Puntaje: <strong>${labScore()}/100</strong> · necesitas ${T.id==='plab'?80:90}. Cada ping fallido a la lista resta 5. Equivocarte de comando no resta.`;return}if(e)e.innerHTML=`Puntaje del ticket: <strong>${labScore()}/100</strong> · necesitas 90. Restan: ver un comando en las pistas (−10) y cada ping fallido al objetivo (−5). Abrir la pista y leer la pregunta guía es gratis. Equivocarte de comando no resta: ${LS.err?`llevas ${LS.err} y está bien, así se aprende.`:'así se aprende.'}`}
const SOC={vlan:'¿Ya existe esa VLAN en este switch? Revísalo con show vlan (en Juniper: show vlans). La VLAN se crea en cada switch: no viaja sola.',pc:'¿En qué VLAN está el puerto que va hacia la PC? ¿Está en modo access y encendido? El diagrama te dice qué puerto es.',up:'¿El puerto entre switches es trunk? ¿Deja pasar todas las VLAN que necesitas? Si solo lleva una, la otra no cruza.',svi:'¿Este switch ya tiene una interfaz vlan con una IP de esa red? En Cisco nace apagada; en Juniper hay que ligarla a la VLAN.',pcip:'Compara la IP de la PC (ipconfig) con la red de su VLAN: ¿coincide el tercer número? ¿Y la máscara y el gateway?',nat:'La nativa es la VLAN que viaja SIN etiqueta por el trunk. Debe ser la misma en los dos extremos; si no, la VLAN que un lado manda sin etiqueta llega al otro como si fuera de otra VLAN.',fault:'Haz los pings de la lista: ¿cuál falla? Eso te dice qué VLAN y qué tramo revisar. Luego ve de abajo hacia arriba: puerto, VLAN, trunk, IP.'};
function drawChecks(){
  const cs=checks();
  if(TP()&&T.blind&&!SC.exam){const n=cs.filter(c=>c.ok).length;$('#chk').innerHTML=`<li class="${n===cs.length?'ok':''}"><span class="dot"></span><div><div class="sw">Configuración</div>${n} de ${cs.length} requisitos listos. Sin pistas: revisa con show.</div></li>`+T.goals.map((g,i)=>`<li class="${T.pinged[i]?'ok':''}"><span class="dot"></span><div><div class="sw">${g.from} · ping</div>${g.label} <code>${g.to}</code></div></li>`).join('');
   const nn=[];for(const sw of T.sws)if(sw.vendor==='juniper'&&JSON.stringify(sw.cand)!==JSON.stringify(sw.act))nn.push(`<p class="warn">${sw.name} tiene cambios sin commit: aún no se aplican.</p>`);$('#notes').innerHTML=nn.join('');drawScore();return}
  $('#chk').innerHTML=cs.map((c,i)=>`<li class="${c.ok?'ok':''}"><span class="dot" aria-hidden="true"></span><div><div class="sw">${c.who.name}${c.who.type==='sw'?' · '+VEND[c.who.vendor].label:''}</div>${c.t}<span class="sr">${c.ok?' (listo)':''}</span><details><summary>Pista</summary><p class="soc">${esc(SOC[c.k]||'Revisa este punto con comandos show.')}</p>${LS.hints.has(i)?`<code>${esc(c.hint)}</code>`:`<button class="hcmd" data-h="${i}">${c.k==='fault'?'Dime dónde buscar':'Ver el comando'} (−10)</button>`}</details></div></li>`).join('')+
    (TP()?T.goals.map((g,i)=>`<li class="${T.pinged[i]?'ok':''}"><span class="dot"></span><div><div class="sw">${g.from} · ping</div>${g.label} <code>${g.to}</code></div></li>`).join(''):L3()?`<li class="${done?'ok':''}"><span class="dot"></span><div><div class="sw">PC-B</div>Ping exitoso a SW1 (${NET()}2)</div></li>`:`<li class="${done?'ok':''}"><span class="dot"></span><div><div class="sw">PC-A</div>Ping exitoso a PC-B</div></li>`);
  const n=[];for(const sw of(TP()?T.sws:[S1,S2]))if(sw.vendor==='juniper'&&JSON.stringify(sw.cand)!==JSON.stringify(sw.act))n.push(`<p class="warn">${sw.name} tiene cambios sin commit: aún no se aplican.</p>`);
  if(!done&&cs.every(c=>c.ok))n.push(TP()?`<p class="tip">${T.faults.length?'Corregiste las fallas.':'Todo parece listo.'} Ahora haz los pings de la lista desde cada PC.</p>`:L3()?`<p class="tip">Todo parece listo. Ve a PC-B y escribe <code>ping ${NET()}2</code>.</p>`:`<p class="tip">Todo parece listo. Ve a PC-A y escribe <code>ping ${NET()}12</code>.</p>`);
  $('#notes').innerHTML=n.join('');
  $('#chk').querySelectorAll('details').forEach((dt,i)=>{if(drawChecks.open&&drawChecks.open.has(i))dt.open=true;dt.addEventListener('toggle',()=>{drawChecks.open=drawChecks.open||new Set();dt.open?drawChecks.open.add(i):drawChecks.open.delete(i)})});$('#chk').querySelectorAll('.hcmd').forEach(b=>b.addEventListener('click',()=>{LS.hints.add(+b.dataset.h);drawChecks();drawScore()}));drawScore();
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-dev]');if(t&&!busy){select(devs.find(d=>d.name===t.dataset.dev));if(matchMedia('(min-width:901px)').matches)cmd.focus()}});
$('#topo').addEventListener('keydown',e=>{if(e.key==='Enter'){const t=e.target.closest('[data-dev]');if(t)select(devs.find(d=>d.name===t.dataset.dev))}});
cmd.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const v=cmd.value;cmd.value='';exec(cur,v);render()}
  else if(e.key==='Tab'){e.preventDefault();cmd.value=complete(cur,cmd.value)}
  else if(e.key==='ArrowUp'){e.preventDefault();hist(-1)}else if(e.key==='ArrowDown'){e.preventDefault();hist(1)}
  else if(e.key==='z'&&e.ctrlKey&&cur.type==='sw'&&cur.vendor!=='juniper'&&cur.mode.startsWith('config')){e.preventDefault();push(cur,prompt(cur)+'^Z','cmd');cur.mode='priv';render()}
});
['paste','drop'].forEach(ev=>cmd.addEventListener(ev,e=>{e.preventDefault();LS.paste++;tut(cur,'En PacketPath los comandos se escriben, no se pegan: así se te quedan en la memoria.');render()}));
cmd.addEventListener('input',()=>{if(cmd.value.endsWith('?')){const v=cmd.value.slice(0,-1);help(cur,v);cmd.value=v;render()}});
function hist(dir){const h=cur.hist;if(!h.length)return;cur.hp=Math.max(0,Math.min(h.length,cur.hp+dir));cmd.value=h[cur.hp]||''}
for(const b of document.querySelectorAll('.keys button'))b.addEventListener('click',()=>{const k=b.dataset.k;if(k==='?'){help(cur,cmd.value);render()}else if(k==='tab')cmd.value=complete(cur,cmd.value);else hist(k==='up'?-1:1);cmd.focus()});
$('#clr').addEventListener('click',()=>{cur.lines=[];render()});
$('#rst').addEventListener('click',()=>{clearLab();reset()});
addEventListener('lab-reset',()=>{clearLab();reset();scrollTo(0,0)});
const TK0=document.querySelector('.ticket p').innerHTML,GOAL0=document.querySelector('.goal').innerHTML,H0=document.querySelector('#v-lab1 header h1').textContent,TKH0=document.querySelector('.ticket .tk').textContent,
 CR0=$('#labcrumb').innerHTML,GU0=$('#labguide').innerHTML,TB0=$('#labtbl').innerHTML,LG0=$('#lableg').innerHTML;
const GU3=()=>`<summary>Antes de empezar: cómo se resuelve este ticket</summary><ol class="pasos"><li><strong>La capa 2 ya está hecha:</strong> la VLAN ${SC.vid} existe en los dos switches, los puertos de las PCs son access y el enlace entre switches es trunk. No la toques.</li><li><strong>Crea la SVI</strong> de la VLAN ${SC.vid} en cada switch y ponle su IP: SW1 <code>${NET()}2/24</code> y SW2 <code>${NET()}3/24</code>.</li><li><strong>Revisa PC-B con <code>ipconfig</code>:</strong> su IP no es de la subred que el plan le da a su VLAN. Corrígelo con <code>netsh</code>.</li><li><strong>Prueba:</strong> desde PC-B haz <code>ping ${NET()}2</code>. Desde los switches también puedes hacer <code>ping</code>.</li></ol>
 <table class="stack"><thead><tr><th>Vendor</th><th>Crear la SVI con IP</th><th>Detalle importante</th></tr></thead><tbody>
 <tr><td>Cisco IOS</td><td><code>interface vlan ${SC.vid}</code><br><code>ip address ${NET()}2 255.255.255.0</code><br><code>no shutdown</code></td><td>La SVI nace apagada: sin <code>no shutdown</code> no responde. La máscara se escribe completa.</td></tr>
 <tr><td>Aruba AOS-CX</td><td><code>interface vlan ${SC.vid}</code><br><code>ip address ${NET()}2/24</code></td><td>La IP se escribe con prefijo (/24).</td></tr>
 <tr><td>Juniper Junos</td><td><code>set interfaces irb unit ${SC.vid} family inet address ${NET()}2/24</code><br><code>set vlans ${SC.name} l3-interface irb.${SC.vid}</code></td><td>La irb se liga a la VLAN con <code>l3-interface</code> y nada se aplica sin <code>commit</code>.</td></tr></tbody></table>
 <p class="small">Revisa con <code>show ip interface brief</code> (Cisco y Aruba) o <code>show interfaces terse</code> (Juniper).</p>`;
const TB3=`<thead><tr><th>Concepto</th><th>Cisco IOS</th><th>Aruba AOS-CX</th><th>Juniper Junos</th></tr></thead><tbody>
 <tr><td>Crear la SVI</td><td><code>interface vlan 10</code></td><td><code>interface vlan 10</code></td><td><code>irb unit 10</code></td></tr>
 <tr><td>Poner la IP</td><td><code>ip address 192.168.10.2 255.255.255.0</code></td><td><code>ip address 192.168.10.2/24</code></td><td><code>family inet address 192.168.10.2/24</code></td></tr>
 <tr><td>Encenderla / ligarla</td><td><code>no shutdown</code></td><td>Encendida por defecto</td><td><code>set vlans VENTAS l3-interface irb.10</code></td></tr>
 <tr><td>Revisar</td><td><code>show ip interface brief</code></td><td><code>show ip interface brief</code></td><td><code>show interfaces terse</code></td></tr>
 <tr><td>Probar</td><td><code>ping 192.168.10.3</code></td><td><code>ping 192.168.10.3</code></td><td><code>ping 192.168.10.3 count 4</code></td></tr></tbody>`;
function texts(cfg){const V=SC.vid,N=SC.name,lab=cfg&&cfg.label||'Ventas',l3=L3();
 if(!l3)return{p:`"Necesitamos que el área de ${lab} tenga su propia red: la VLAN ${V} (${N}), con una PC en cada piso." Configura SW1 y SW2 para que PC-A (${NET()}11) y PC-B (${NET()}12) se vean${SC.exam?'. Sin pistas ni guía: como en el trabajo.':' a través del enlace entre switches.'}`,goal:`PC-A (${NET()}11) hace ping a PC-B (${NET()}12) en la VLAN ${V} (${N}).`};
 return{p:`"Queremos administrar los switches de ${lab} desde la red, y la PC del segundo piso dice que no ve a nadie." La capa 2 ya está lista (VLAN ${V}, ${N}). Dale a SW1 la IP ${NET()}2/24 y a SW2 la ${NET()}3/24 en la SVI de la VLAN ${V}, y arregla la IP de PC-B.${SC.exam?' Sin pistas ni guía.':' El ticket se cierra cuando PC-B hace ping a SW1 y explicas lo que hiciste.'}`,goal:`PC-B (${NET()}12) hace ping a SW1 (${NET()}2) en la VLAN ${V} (${N}).`}}
const subV=(h,lab)=>SC.vid===10?h:h.replace(/192\.168\.10\./g,NET()).replace(/(VLAN |vlan |vlan-id |access |allowed )10\b/g,'$1'+SC.vid).replace(/VENTAS/g,SC.name).replace(/Gerencia de Ventas|Ventas/g,lab||SC.name);
function setKind(cfg,tkLabel){document.body.classList.toggle('labtopo',TP());if(!TP())document.body.classList.remove('labblind');if(TP()){const X=topoTexts();document.querySelector('.ticket p').innerHTML=X.p;document.querySelector('.goal').innerHTML=X.goal;document.querySelector('#v-lab1 header h1').textContent=X.h;document.querySelector('.ticket .tk').textContent=tkLabel||X.tk;$('#labcrumb').innerHTML=T.sim?`<a href="#examen-${T.zone}">Certificación Zona ${T.zone}</a> / simulacro`:T.id==='plab'?`<a href="#ubicacion">Examen de ubicación</a> / lab práctico`:PRO(T.id)?`<a href="#arena">Arena</a> / labs pro / PRO-${T.id.slice(3)}`:`<a href="#mapa">Mi red</a> / Zona ${T.zone} / TK-${T.tk}`;document.body.classList.toggle('labblind',!!T.blind&&!SC.exam);$('#labguide').innerHTML=X.guide;$('#labguide').open=!SC.exam;$('#labtbl').innerHTML=TBT;$('#lableg').innerHTML=LG0;return}const l3=L3(),TX=texts(cfg);document.querySelector('.ticket p').innerHTML=(!l3&&!SC.exam&&SC.vid===10)?TK0:TX.p;document.querySelector('.goal').innerHTML=(!l3&&!SC.exam&&SC.vid===10)?GOAL0:TX.goal;
 document.querySelector('#v-lab1 header h1').textContent=SC.exam?'Certificación: parte práctica':l3?'IP de administración en los switches':H0;
 document.querySelector('.ticket .tk').textContent=tkLabel||(l3?'Ticket #2001 · prioridad media · de: '+(cfg&&cfg.label||'Ventas'):subV(TKH0,cfg&&cfg.label));
 $('#labcrumb').innerHTML=l3?'<a href="#mapa">Mi red</a> / Zona 2 / TK-2001':CR0;$('#labguide').innerHTML=l3?GU3():subV(GU0,cfg&&cfg.label);$('#labtbl').innerHTML=l3?TB3:subV(TB0,cfg&&cfg.label);
 $('#lableg').innerHTML=l3?'<span><b style="background:#4f9bff"></b>Frame untagged (access port)</span><span><b style="background:#ffc61a"></b>Frame tagged 802.1Q (trunk)</span><span><b style="background:#e9eef2"></b>Hacia la SVI de SW1 (capa 3)</span>':subV(LG0);
 $('#labguide').open=!SC.exam}

const SHOWT=`<table class="stack"><thead><tr><th>Para revisar…</th><th>Cisco IOS</th><th>Aruba AOS-CX</th><th>Juniper Junos</th></tr></thead><tbody>
 <tr><td>Qué VLAN existen y qué puertos tienen</td><td><code>show vlan brief</code></td><td><code>show vlan</code></td><td><code>show vlans</code></td></tr>
 <tr><td>Trunks y VLAN permitidas</td><td><code>show interfaces trunk</code></td><td><code>show running-config</code></td><td><code>show configuration</code></td></tr>
 <tr><td>Puertos arriba o abajo</td><td><code>show interfaces status</code></td><td><code>show interface brief</code></td><td><code>show interfaces terse</code></td></tr>
 <tr><td>IP de las interfaces vlan</td><td><code>show ip interface brief</code></td><td><code>show ip interface brief</code></td><td><code>show interfaces terse</code></td></tr>
 <tr><td>Toda la configuración</td><td><code>show running-config</code></td><td><code>show running-config</code></td><td><code>show configuration</code></td></tr></tbody></table>`;
const TRK3=`<table class="stack"><thead><tr><th>Concepto</th><th>Cisco IOS</th><th>Aruba AOS-CX</th><th>Juniper Junos</th></tr></thead><tbody>
 <tr><td>VLAN nativa dedicada</td><td><code>vlan 999</code><br><code> name NATIVA</code></td><td><code>vlan 999</code><br><code> name NATIVA</code></td><td><code>set vlans NATIVA vlan-id 999</code></td></tr>
 <tr><td>Modo trunk</td><td><code>switchport mode trunk</code></td><td>(lo pone <code>vlan trunk …</code>)<br><code>no shutdown</code></td><td><code>… interface-mode trunk</code></td></tr>
 <tr><td>Solo ciertas VLAN</td><td><code>switchport trunk allowed vlan 10,20</code><br><small>reemplaza la lista</small></td><td><code>vlan trunk allowed 10,20</code><br><small>agrega; quita con <code>no vlan trunk allowed 30</code></small></td><td><code>… vlan members VENTAS</code><br><code>… vlan members RRHH</code></td></tr>
 <tr><td>Nativa</td><td><code>switchport trunk native vlan 999</code></td><td><code>vlan trunk native 999</code></td><td><code>set interfaces ge-0/0/23 native-vlan-id 999</code></td></tr>
 <tr><td>Revisar</td><td><code>show interfaces trunk</code></td><td><code>show interface brief</code><br><code>show vlan</code></td><td><code>show ethernet-switching interfaces</code></td></tr></tbody></table>`;
const SHOWT3=`<table class="stack"><thead><tr><th>Para revisar…</th><th>Cisco IOS</th><th>Aruba AOS-CX</th><th>Juniper Junos</th></tr></thead><tbody>
 <tr><td>Modo, permitidas y nativa del trunk</td><td><code>show interfaces trunk</code></td><td><code>show interface brief</code> y <code>show running-config</code></td><td><code>show ethernet-switching interfaces</code></td></tr>
 <tr><td>Qué VLAN existen y en qué puertos</td><td><code>show vlan brief</code></td><td><code>show vlan</code></td><td><code>show vlans</code></td></tr>
 <tr><td>Puertos arriba o abajo</td><td><code>show interfaces status</code></td><td><code>show interface brief</code></td><td><code>show interfaces terse</code></td></tr>
 <tr><td>IP de las PCs y del CORE</td><td colspan="3"><code>ipconfig</code> en la PC · <code>show ip interface brief</code> o <code>show interfaces terse</code> en el CORE</td></tr></tbody></table>`;
const TBT=`<thead><tr><th>Concepto</th><th>Cisco IOS</th><th>Aruba AOS-CX</th><th>Juniper Junos</th></tr></thead><tbody>
 <tr><td>Trunk con dos VLAN</td><td><code>switchport mode trunk</code><br><code>switchport trunk allowed vlan 10,20</code></td><td><code>no shutdown</code><br><code>vlan trunk allowed 10,20</code></td><td><code>… interface-mode trunk</code><br><code>… vlan members VENTAS</code><br><code>… vlan members RRHH</code></td></tr>
 <tr><td>Agregar una VLAN a un trunk</td><td><code>switchport trunk allowed vlan add 20</code></td><td><code>vlan trunk allowed 20</code></td><td><code>set … vlan members RRHH</code></td></tr>
 <tr><td>IP en una VLAN (SVI)</td><td><code>interface vlan 10</code><br><code>ip address 192.168.10.2 255.255.255.0</code><br><code>no shutdown</code></td><td><code>interface vlan 10</code><br><code>ip address 192.168.10.2/24</code></td><td><code>set interfaces irb unit 10 family inet address 192.168.10.2/24</code><br><code>set vlans VENTAS l3-interface irb.10</code></td></tr>
 <tr><td>Encender un puerto</td><td><code>no shutdown</code></td><td><code>no shutdown</code></td><td><code>delete interfaces ge-0/0/1 disable</code></td></tr></tbody>`;
function topoTexts(){const X=topoTexts0();if(T.sim&&!SC.exam){X.h='Simulacro: '+X.h.replace(/^A ciegas: /,'');X.tk='Simulacro de la certificación de la Zona '+T.zone;X.guide=`<summary>Cómo funciona el simulacro</summary><p>Es el mismo tipo de lab que la parte práctica de la certificación de la Zona ${T.zone}, con otros vendors y otras VLAN. La diferencia: aquí sí tienes la lista de objetivos y pistas (cada comando que ves resta 10). En el examen no habrá nada de eso.</p><p>Meta: resolverlo sin abrir pistas. Cuando lo logres en los tres simulacros, estás listo.</p>${X.guide.includes('<ol')?X.guide.replace(/^<summary>.*?<\/summary>/,''):''}`}return X}
function topoTexts0(){const A=T.A,B=T.B,vs=T.sws.map(s=>`${s.name}: ${VEND[s.vendor].label}`).join(' · '),g=T.goals.map(x=>`<li><code>${x.from}</code> → <code>${x.to}</code></li>`).join('');
 const BLG=n=>`<summary>Modo a ciegas: qué cuenta</summary><p>Aquí no hay pasos, ni checklist, ni pistas: solo el objetivo y los pings. Es la prueba real de que sabes configurar sin copiar. Si te atoras, regresa a ${n} y vuelve.</p><p>Los comandos con error no restan.</p>`;
 const PROG=`<summary>Lab pro: qué cuenta</summary><p>Sin pasos, sin checklist y sin pistas: solo el ticket, los pings y el reloj. El tiempo no te quita puntos, pero queda como tu récord. Cada ping fallido a la lista resta 5.</p><p>Al terminar verás qué estaba mal y la solución de cada switch.</p>`;
 if(T.id==='plab')return{h:'Examen de ubicación: lab práctico',tk:`Lab de ubicación · ${VEND[T.sws[0].vendor].label}`,
  p:`Dos switches <strong>${VEND[T.sws[0].vendor].label}</strong> en blanco. ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}) tienen una PC en cada switch. Crea las dos VLAN con su nombre en los dos switches, pon cada PC en su VLAN y deja el enlace entre ellos como trunk con las dos. Sin pistas: así se ve si ya sabes configurar.`,
  goal:'Los pings de la lista funcionan. Necesitas 80 o más: cada ping fallido resta 5.',guide:`<summary>Qué cuenta</summary><p>Es el mismo trabajo del lab a ciegas de la Zona 1. Se califica el resultado: que los pings funcionen. Escribe <code>?</code> si olvidas un comando; equivocarte de comando no resta.</p>`};
 if(T.id==='lab1c')return{h:'Tres switches: el edificio',tk:`Ticket #${T.tk} · prioridad media · de: Gerencia de TI`,
  p:`"Ya tenemos el edificio completo: un CORE en el site y un switch de acceso en cada piso." Los tres switches están <strong>en blanco</strong>. ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}) tienen una PC en cada piso. Crea las dos VLAN en los <strong>tres</strong> switches (también en el CORE, aunque no tenga PCs), pon cada PC en su VLAN y deja los dos enlaces hacia el CORE como trunk con las dos VLAN.`,
  goal:`Los pings de la lista funcionan entre pisos. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se resuelve este ticket</summary><ol class="pasos"><li><strong>El CORE también necesita las VLAN:</strong> aunque no tenga PCs, el tráfico de ACC1 a ACC2 pasa por él. Una VLAN que no existe en el CORE no cruza.</li><li><strong>En ACC1 y ACC2:</strong> crea las VLAN, pon el puerto de cada PC en access en su VLAN y el uplink como trunk con las dos.</li><li><strong>En el CORE:</strong> crea las VLAN y pon <em>los dos</em> puertos hacia los pisos como trunk con las dos VLAN.</li><li><strong>Revisa</strong> con <code>show vlan brief</code> / <code>show vlan</code> / <code>show vlans</code> y con <code>show interfaces trunk</code> (Cisco). En Aruba no olvides <code>no shutdown</code>; en Juniper, <code>commit</code>.</li><li><strong>Prueba:</strong><ul>${g}</ul></li></ol>${SHOWT}`};
 if(T.id==='tsh1b')return{h:'Troubleshooting: el edificio',tk:`Ticket #${T.tk} · prioridad ALTA · de: Mesa de ayuda`,
  p:`"${A.name} y ${B.name} no se ven entre pisos." Ayer funcionaba; en la noche alguien hizo cambios en el CORE y en los pisos. Hay <strong>4 fallas</strong> de capa 1 y capa 2 repartidas en los tres switches. Encuéntralas con <code>show</code>, corrígelas y comprueba con los pings.`,
  goal:`Las 4 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se busca una falla en tres switches</summary><ol class="pasos"><li><strong>Divide el camino:</strong> PC → ACC → CORE → ACC → PC. Revisa tramo por tramo.</li><li><strong>En cada switch:</strong> ¿el puerto está arriba? (<code>show interfaces status</code>) ¿en la VLAN correcta? ¿la VLAN existe? ¿el uplink es trunk y la deja pasar?</li><li><strong>No olvides el CORE:</strong> si le falta una VLAN o un trunk no la deja pasar, ningún piso la ve.</li><li>Cada pista dice <em>dónde</em> buscar y cuesta 10 puntos.</li></ol>${SHOWT}<p>Los pings que deben funcionar:</p><ul>${g}</ul>`};
 if(T.id==='lab3c')return{h:'Ventana de cambios: nativa 999 y poda',tk:`Cambio #${T.tk} · ventana: domingo 2:00 a 4:00 · de: Seguridad informática`,
  p:`La red de ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}) <strong>funciona</strong>, pero no cumple las reglas: los trunks usan la VLAN 1 como nativa y el CORE deja bajar la VLAN ${T.C.id} (${T.C.name}) a los pisos. Corrígelo en producción: crea la <strong>VLAN 999 NATIVA</strong> en los tres switches, pon la nativa 999 en los <strong>4 extremos</strong> de trunk y quita la ${T.C.id} de los trunks del CORE. Al final, todo debe seguir funcionando.`,
  goal:`Las 9 tareas de la lista hechas y los pings funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se hace un cambio en producción</summary><ol class="pasos"><li><strong>Primero prueba que todo funciona</strong> (los pings): así sabes que lo que se rompa después lo rompiste tú.</li><li><strong>Crea la VLAN 999</strong> en los tres switches antes de usarla como nativa.</li><li><strong>Cambia la nativa enlace por enlace:</strong> los dos extremos de un trunk, luego el siguiente. Mientras un enlace tenga nativas distintas, lo que viaja sin etiqueta se mezcla.</li><li><strong>Poda en el CORE:</strong> solo ${A.id} y ${B.id} hacia los pisos. En Cisco reescribe la lista; en Aruba <code>no vlan trunk allowed ${T.C.id}</code>; en Juniper borra ese miembro.</li><li><strong>Verifica y vuelve a probar</strong> con los pings. En el trabajo, si algo falla, se regresa al plan anterior (rollback) antes de que acabe la ventana.</li></ol>${SHOWT3}<p>Los pings que deben seguir funcionando:</p><ul>${g}</ul>`};
 if(T.id==='tsh3b')return{h:'Troubleshooting: el reporte de auditoría',tk:`Ticket #${T.tk} · prioridad ALTA · de: Auditoría y Mesa de ayuda`,
  p:`"Seguridad encontró una nativa distinta en un trunk y la mesa de ayuda tiene quejas de ${A.name} y ${B.name}." Las reglas de la casa: trunks solo con ${A.id} y ${B.id}, nativa 999 en los dos extremos, la ${T.C.id} (${T.C.name}) no sale del CORE, y el CORE con IP en cada VLAN. Hay <strong>4 fallas</strong>.`,
  goal:`Las 4 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: el método</summary><ol class="pasos"><li><strong>Ping primero</strong> para ver qué VLAN y qué tramo fallan.</li><li><strong>Las 3 preguntas</strong> en cada trunk: ¿trunk en los dos lados? ¿permitida y activa? ¿misma nativa?</li><li><strong>Luego capa 1 y capa 3:</strong> ¿puertos arriba? ¿la IP de las PCs y del CORE es de su red? ¿la SVI está encendida?</li><li>Cada pista dice dónde buscar y cuesta 10 puntos.</li></ol>${SHOWT3}<p>Los pings que deben funcionar:</p><ul>${g}</ul>`};
 if(T.id==='pro1')return{h:'Incidente P1: la red completa',tk:`Incidente #${T.tk} · prioridad CRÍTICA · de: Dirección`,
  p:`"Lunes 8:05. Nadie de ${A.name} ni de ${B.name} trabaja: no se ven entre pisos y no llegan al core." El fin de semana tocaron la red y nadie documentó nada. Hay <strong>4 fallas</strong> repartidas entre capa 1, capa 2 y capa 3 (puertos, VLAN, trunks, IP de las PCs y del CORE). Encuéntralas solo con <code>show</code>, <code>ipconfig</code> y <code>ping</code>.`,
  goal:`Las 4 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,guide:PROG};
 if(T.id==='pro2')return{h:'Incidente P1: auditoría de trunks',tk:`Incidente #${T.tk} · prioridad CRÍTICA · de: Seguridad informática`,
  p:`"Auditoría externa mañana a las 9:00." La regla de la casa: trunks con <strong>solo</strong> las VLAN ${A.id} y ${B.id}, nativa <strong>999</strong> en los dos extremos, y la VLAN ${T.C.id} (${T.C.name}) <strong>nunca</strong> sale del CORE. Hoy hay <strong>4 fallas</strong>: unas rompen pings y otras solo se ven leyendo la configuración. Encuéntralas todas.`,
  goal:`Las 4 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,guide:PROG};
 if(T.id==='pro3')return{h:'Piso nuevo desde cero',tk:`Proyecto #${T.tk} · entrega hoy · de: Gerencia de TI`,
  p:`"Llegaron tres switches nuevos para el piso de ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id})." Los tres vienen <strong>en blanco</strong>. Déjalos listos con las reglas de la casa: las VLAN con su nombre, cada PC en su VLAN, trunks con <strong>solo</strong> ${A.id} y ${B.id}, nativa <strong>999 (NATIVA)</strong> en los dos extremos, la VLAN ${T.C.id} (${T.C.name}) creada en el CORE pero sin salir de él, y el CORE con IP en cada VLAN (${tnet(A)}2 y ${tnet(B)}2).`,
  goal:`Todo configurado según las reglas y los pings de la lista funcionan. Vendors: ${vs}.`,guide:PROG};
 if(T.id==='lab1b')return{h:'A ciegas: dos VLAN, dos switches',tk:`Ticket #${T.tk} · prioridad media · de: Gerencia`,
  p:`"Llegaron ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}): una PC de cada área en cada piso." Los dos switches están <strong>en blanco</strong>. Crea las dos VLAN con su nombre, pon cada PC en su VLAN y deja el enlace entre switches como trunk con las dos. Sin guía ni pistas: como en el trabajo.`,
  goal:`Los pings de la lista funcionan. Vendors: ${vs}.`,guide:BLG('TK-1042 y TK-1050')};
 if(T.id==='lab2b'){const okAcc=T.sws.find(s=>s.name!==T.blank&&s.name!=='CORE').name;return{h:'A ciegas: dos áreas, tres switches',tk:`Ticket #${T.tk} · prioridad alta · de: Gerencia de ${A.name[0]+A.name.slice(1).toLowerCase()}`,
  p:`"Se abrió otro piso: ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id})." <strong>${T.blank}</strong> está en blanco; ${okAcc} y el CORE ya tienen la capa 2. Configura ${T.blank}, dale al CORE una IP en cada VLAN (${tnet(A)}2 y ${tnet(B)}2) y encuentra la PC que tiene mal su IP. Sin guía ni pistas.`,
  goal:`Los pings de la lista funcionan. Vendors: ${vs}.`,guide:BLG('TK-2001')}};
 if(T.id==='lab2'){const okAcc=T.sws.find(s=>s.name!==T.blank&&s.name!=='CORE').name;return{h:SC.exam?'Certificación: parte práctica':'Dos áreas, tres switches',tk:`Ticket #2001 · prioridad alta · de: Gerencia de ${A.name[0]+A.name.slice(1).toLowerCase()}`,
  p:`"Abrimos el segundo piso: ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}) en dos switches de acceso conectados a un core." El CORE y ${okAcc} ya tienen la capa 2. Configura <strong>${T.blank}</strong> (las dos VLAN, los puertos de las PCs y el trunk), dale al <strong>CORE</strong> una IP en cada VLAN (${tnet(A)}2 y ${tnet(B)}2) y corrige la IP de <strong>${T.brokenPC}</strong>.${SC.exam?' Sin pistas ni guía.':''}`,
  goal:`Los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se resuelve este ticket</summary><ol class="pasos"><li><strong>Mira cómo está ${okAcc}:</strong> abre su consola y usa <code>show running-config</code> (o <code>show configuration</code> en Juniper). ${T.blank} debe quedar igual, pero con su propio vendor.</li><li><strong>En ${T.blank}:</strong> crea las VLAN ${A.id} (${A.name}) y ${B.id} (${B.name}), pon cada PC en su VLAN como access y haz el puerto hacia el CORE un trunk que permita las dos.</li><li><strong>En el CORE:</strong> crea la SVI de cada VLAN con su IP: ${tnet(A)}2/24 y ${tnet(B)}2/24.</li><li><strong>En ${T.brokenPC}:</strong> revisa <code>ipconfig</code>: su IP no es de su VLAN. Corrígela con <code>netsh</code>.</li><li><strong>Prueba</strong> con estos pings:<ul>${g}</ul></li></ol>${SHOWT}`}}
 if(T.id==='lab3'||T.id==='lab3b'){const C=T.C,blind=T.blind&&!SC.exam;return{h:SC.exam?'Certificación: parte práctica':blind?'A ciegas: los trunks del edificio':'Trunks con VLAN nativa y poda',tk:`Ticket #${T.tk} · prioridad alta · de: Seguridad informática`,
  p:`"Auditoría encontró trunks que dejan pasar <em>todas</em> las VLAN y usan la VLAN 1 como nativa. Eso se cierra hoy." ${A.name} (VLAN ${A.id}) y ${B.name} (VLAN ${B.id}) ya están en los switches de acceso, y el CORE tiene además la VLAN ${C.id} (${C.name}), que <strong>no debe salir del CORE</strong>. Configura los <strong>4 extremos de trunk</strong>: solo las VLAN ${A.id} y ${B.id}, y como nativa la <strong>VLAN 999 (NATIVA)</strong>, que debes crear en los tres switches.${SC.exam||blind?' Sin guía ni pistas: como en el trabajo.':''}`,
  goal:`Trunks con solo ${A.id},${B.id}, nativa 999 en ambos extremos y los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:blind?`<summary>Modo a ciegas: qué cuenta</summary><p>Aquí no hay pasos, ni checklist, ni pistas: solo el objetivo y los pings. Es la prueba real de que sabes configurar un trunk sin copiar. Si te atoras, regresa al lab guiado (TK-3001) y vuelve.</p><p>Al terminar verás qué te faltó. Los comandos con error no restan.</p>`
  :`<summary>Antes de empezar: cómo se resuelve este ticket</summary><ol class="pasos"><li><strong>Crea la VLAN 999 con nombre NATIVA</strong> en los tres switches. No lleva PCs: solo existe para ser la nativa y que nada viaje sin etiqueta por la VLAN 1.</li><li><strong>En cada extremo de trunk</strong> (dos en el CORE, uno en cada acceso): modo trunk, permitidas <strong>solo ${A.id} y ${B.id}</strong>, y nativa 999.</li><li><strong>Ojo con Cisco:</strong> un trunk permite <em>todas</em> las VLAN por defecto. Si no escribes la lista, la ${C.id} se escapa. En Aruba los puertos vienen apagados: <code>no shutdown</code>.</li><li><strong>Revisa</strong> con <code>show interfaces trunk</code> (Cisco), <code>show interface brief</code> (Aruba) o <code>show ethernet-switching interfaces</code> (Juniper). La nativa debe ser la misma en los dos extremos.</li><li><strong>Prueba</strong> con los pings:<ul>${g}</ul></li></ol>${TRK3}`}}
 if(T.id==='tsh3')return{h:SC.exam?'Certificación: parte práctica':'Troubleshooting: los trunks del edificio',tk:`Ticket #${T.tk} · prioridad ALTA · de: Mesa de ayuda y Seguridad`,
  p:`"${A.name} y ${B.name} no se ven entre pisos y una parte no llega al core. Además, Seguridad reporta que la VLAN ${T.C.id} (${T.C.name}) aparece donde no debe." La regla de la casa: trunks con solo las VLAN ${A.id} y ${B.id}, nativa 999 en los dos extremos. Hay <strong>3 fallas</strong>: encuéntralas con <code>show</code>, corrígelas y comprueba con los pings.`,
  goal:`Las 3 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se busca una falla de trunk</summary><ol class="pasos"><li><strong>Ping primero:</strong> si una VLAN cruza y la otra no por el mismo enlace, el problema es de ese trunk (lista de permitidas o nativa).</li><li><strong>Compara los dos extremos</strong> de cada trunk: modo, VLAN permitidas y nativa deben coincidir. Si la nativa no coincide, la VLAN que va sin etiqueta de un lado llega con etiqueta del otro y se pierde.</li><li><strong>Cisco te avisa:</strong> entre dos Cisco verás <code>%CDP-4-NATIVE_VLAN_MISMATCH</code>. Con Aruba o Juniper no hay aviso: tienes que comparar tú.</li><li><strong>Lo de Seguridad no se ve con ping:</strong> revisa qué VLAN lleva cada trunk del CORE.</li></ol>${SHOWT3}<p>Los pings que deben funcionar:</p><ul>${g}</ul>`};
 return{h:SC.exam?'Certificación: parte práctica':T.three?'Troubleshooting: la red del segundo piso':'Troubleshooting: VLANs entre dos switches',tk:`Ticket #${T.three?2050:1050} · prioridad ALTA · de: Mesa de ayuda`,
  p:`"Desde el lunes ${A.name} y ${B.name} se quejan: no se ven entre pisos${T.three?' y no llegan al core':''}." La red estaba funcionando y alguien movió algo. Hay <strong>3 fallas escondidas</strong>: encuéntralas con comandos <code>show</code> y <code>ipconfig</code>, corrígelas y comprueba con los pings.`,
  goal:`Las 3 fallas corregidas y los pings de la lista funcionan. Vendors: ${vs}.`,
  guide:`<summary>Antes de empezar: cómo se busca una falla</summary><ol class="pasos"><li><strong>Empieza por el síntoma:</strong> haz los pings de la lista y fíjate cuáles fallan. Eso te dice qué VLAN y qué parte de la red revisar.</li><li><strong>Revisa de abajo hacia arriba:</strong> ¿el puerto está arriba? (capa 1) ¿está en la VLAN correcta? ¿el trunk la deja pasar? ¿la VLAN existe en ese switch? (capa 2) ¿la IP y la máscara son de su red? (capa 3)</li><li><strong>Compara</strong> un switch que funciona con uno que no: la diferencia suele ser la falla.</li><li>Cada pista dice <em>dónde</em> buscar, no el comando, y cuesta 10 puntos.</li></ol>${SHOWT}<p>Los pings que deben funcionar:</p><ul>${g}</ul>`}}
window.LAB={
 start(cfg){if(cfg.kind==='topo'){SC={kind:'topo',topo:cfg.topo,seed:cfg.seed,vid:0,name:'',exam:true};document.body.classList.add('labexam');cur=null;reset();setKind(null,`${cfg.cert||'CERT'} · de: Mesa de ayuda`);drawSol();return}SC={kind:cfg.kind||'l2',vid:cfg.vid,name:cfg.name,exam:true};$('#v1').value=cfg.v1;$('#v2').value=cfg.v2;$('#v1').disabled=$('#v2').disabled=true;document.body.classList.add('labexam');
  setKind(cfg,`${cfg.cert||'CERT-1'} · de: ${cfg.label}`);cur=null;reset();drawSol()},
 stop(){if(!SC.exam)return;T=null;SC={kind:'l2',vid:10,name:'VENTAS',exam:false};$('#v1').disabled=$('#v2').disabled=false;document.body.classList.remove('labexam');setKind(null);cur=null;reset()},
 practice(cfg){if(SC.exam)return;if(cfg&&cfg.kind==='topo'){if(TP()&&T&&!done&&SC.topo===cfg.topo&&SC.seed===cfg.seed&&devs.some(d=>d.hist&&d.hist.length)){saveLab();return}SC={kind:'topo',topo:cfg.topo,seed:cfg.seed,vend:cfg.vend||null,vid:0,name:'',exam:false};cur=null;if(!loadLab())reset();setKind(null);drawSol();return}if(TP()){T=null;SC={kind:'l2',vid:10,name:'VENTAS',exam:false}}const kind=cfg&&cfg.kind||'l2',def=!cfg||!cfg.vid||cfg.vid===10;if(S1&&!done&&devs.some(d=>d.hist&&d.hist.length)&&SC.kind===kind&&SC.vid===(def?10:cfg.vid)&&SC.name===(def?'VENTAS':cfg.name)){saveLab();return}SC={kind,vid:def?10:cfg.vid,name:def?'VENTAS':cfg.name,exam:false};
  setKind(def?null:cfg);cur=null;if(!loadLab())reset();drawSol()},
 setOwnerCheck(fn){if(!OWNCHK&&typeof fn==='function')OWNCHK=fn},dbg(){if(!OWN())return null;return TP()?T.faults.map(f=>({k:f.k,sw:f.sw,pc:f.pc,slot:f.slot,v:f.v&&f.v.id,ok:faultFixed(f)})):null},solution(v){return OWN()||done?SOLF()[v]:null},solutions(){return OWN()||done?(TP()?tSolutions():null):null},preview(id,seed){const d=topoDef(id,seed);return{id,sws:d.sws.map(s=>({name:s.name,vendor:VEND[s.vendor].label})),A:d.A,B:d.B,C:d.C,blank:d.blank,broken:d.brokenPC,faults:d.faults.length}},scenario(){return TP()?{...SC,desc:`VLAN ${T.A.id} (${T.A.name}) y ${T.B.id} (${T.B.name})`}:{...SC}},vendors(){return TP()?T.sws.map(s=>s.vendor):[S1.vendor,S2.vendor]},
 passed(){return checks().filter(c=>c.ok).length+(TP()?Object.keys(T.pinged).length:0)},total(){return checks().length+(TP()?T.goals.length:0)},score:()=>labScore()};
for(const id of['#v1','#v2'])$(id).addEventListener('change',()=>{if(TP())return;const i=id==='#v1'?0:1,n=mkSwitch(i?'SW2':'SW1',$(id).value);if(L3())preL2(n);devs[i]=n;if(i)S2=n;else S1=n;if(cur.name===n.name)cur=n;done=false;$('#done').classList.remove('show');render()});

/* ---------- solutions ---------- */
const SOLF=()=>{const V=SC.vid,N=SC.name;if(L3()){const pc=`\n\n! PC-B:\n${PCHINT()}`;return{cisco:`! SW1 (en SW2 usa ${NET()}3)\nenable\nconfigure terminal\ninterface vlan ${V}\n ip address ${NET()}2 255.255.255.0\n no shutdown\n end\nwrite memory`+pc,aruba:`! SW1 (en SW2 usa ${NET()}3)\nconfigure terminal\ninterface vlan ${V}\n ip address ${NET()}2/24\n end\nwrite memory`+pc,juniper:`# SW1 (en SW2 usa ${NET()}3)\nconfigure\nset interfaces irb unit ${V} family inet address ${NET()}2/24\nset vlans ${N} l3-interface irb.${V}\ncommit`+pc}}return{cisco:`enable
configure terminal
vlan ${V}
 name ${N}
 exit
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan ${V}
 exit
interface GigabitEthernet0/24
 switchport mode trunk
 switchport trunk allowed vlan ${V}
 end
write memory`,aruba:`configure terminal
vlan ${V}
 name ${N}
 exit
interface 1/1/1
 no shutdown
 vlan access ${V}
 exit
interface 1/1/24
 no shutdown
 vlan trunk native 1
 vlan trunk allowed ${V}
 end
write memory`,juniper:`configure
set vlans ${N} vlan-id ${V}
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members ${N}
set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members ${N}
commit`}};
let SOL=SOLF();
let OWNCHK=null;const OWN=()=>{try{return!!(OWNCHK&&OWNCHK())}catch(e){return false}};
const drawSol=()=>{if(!done&&!OWN()){$('#sol').innerHTML='';SOL={};return}if(TP()){const L=tSolutions();$('#sol').innerHTML=L.map(x=>`<div><h3>${esc(x.t)}</h3><pre>${esc(x.s)}</pre></div>`).join('');return}SOL=SOLF();$('#sol').innerHTML=Object.entries(SOL).map(([k,s])=>`<div><h3>${VEND[k].label}<button class="btn" data-copy="${k}">Copiar</button></h3><pre>${esc(s)}</pre></div>`).join('')};drawSol();
$('#sol').addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;try{await navigator.clipboard.writeText(SOL[b.dataset.copy]);b.textContent='Copiado'}catch{b.textContent='Selecciona el texto'}setTimeout(()=>b.textContent='Copiar',1600)});

/* ---------- 3D ---------- */
let G=null;
function win(){if(done)return;done=true;clearLab();drawSol();if(SC.exam){dispatchEvent(new CustomEvent('lab-done',{detail:{kind:SC.kind,exam:true,score:labScore(),err:LS.err,fails:LS.fails,ms:Date.now()-LS.t0,paste:LS.paste,mixed:TP()?new Set(T.sws.map(x=>x.vendor)).size>1:S1.vendor!==S2.vendor}}));render();return}dispatchEvent(new CustomEvent('lab-done',{detail:{pro:TP()&&PRO(T.id),topo:TP()?T.id:null,kind:SC.kind,mixed:TP()?new Set(T.sws.map(x=>x.vendor)).size>1:S1.vendor!==S2.vendor,score:labScore(),err:LS.err,hints:LS.hints.size,fails:LS.fails,ms:Date.now()-LS.t0,paste:LS.paste}}));render();$('#done').classList.add('show');build3D();setTimeout(()=>$('#done').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}),300)}
function textTex(lines,w,h,bg,fg,size){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}x.fillStyle=fg;x.font=`500 ${size}px IBM Plex Mono, monospace`;x.textBaseline='top';lines.forEach((l,i)=>x.fillText(l,10,8+i*(size+6)));const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}

function build3DT(){
  const box=$('#g3d');if(G){cancelAnimationFrame(G.raf);G.ro.disconnect();G.R.dispose();G.R.domElement.remove();G=null}
  if(!window.THREE){box.insertAdjacentHTML('beforeend','<p style="color:#fff;padding:20px">No se pudo cargar la vista 3D.</p>');return}
  const K=THREE,R=new K.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));box.prepend(R.domElement);
  const sc=new K.Scene(),cam=new K.PerspectiveCamera(38,1,.1,200);sc.add(new K.HemisphereLight(0xdfe9f3,0x1a2026,.85));const dl=new K.DirectionalLight(0xffffff,.75);dl.position.set(6,12,10);sc.add(dl);
  const M=(c,o={})=>new K.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:.2},o)),V3=(x,y,z)=>new K.Vector3(x,y,z);
  const add=(g,m,x,y,z)=>{const o=new K.Mesh(g,m);o.position.set(x,y,z);sc.add(o);return o};
  const fl=add(new K.PlaneGeometry(60,30),M(0x222a31,{roughness:1}),0,0,0);fl.rotation.x=-Math.PI/2;
  const rk=M(0x15191d,{metalness:.6,roughness:.5});for(const x of[-2.7,2.7])for(const z of[-1.5,1.5])add(new K.BoxGeometry(.16,5.4,.16),rk,x,2.7,z);for(const y of[.08,5.4])add(new K.BoxGeometry(5.6,.14,3.2),rk,0,y,0);
  const P={},pp=[];
  T.sws.forEach((d,k)=>{const y=4.2-k*.75,v=VEND[d.vendor];add(new K.BoxGeometry(5,.44,2.7),M(v.color,{metalness:.45,roughness:.45}),0,y,0);
    add(new K.PlaneGeometry(1.7,.34),new K.MeshBasicMaterial({map:textTex([d.name+'  '+v.label],512,100,null,d.vendor==='aruba'?'#1d252c':'#eef3f7',40),transparent:true}),-1.55,y,1.36);
    const pos=[];for(let i=1;i<=24;i++){const col=(i-1)%12,row=i<=12?0:1,x=-.45+col*.27,py=y+(row?-.09:.09);add(new K.BoxGeometry(.21,.14,.04),M(0x0a0c0e),x,py,1.36);pos[i]=V3(x,py,1.39)}
    P[d.name]={};for(const sl of Object.keys(SLOT[d.vendor])){const ph=SLOT[d.vendor][sl][2];P[d.name][sl]=pos[ph];if(T.att[d.name][PN(d,sl)]){const l=add(new K.BoxGeometry(.06,.03,.02),new K.MeshBasicMaterial({color:0x2cff8a}),pos[ph].x+.07,pos[ph].y+(ph<=12?.09:-.09),1.39);pp.push(l)}}});
  const PCP={};T.pcs.forEach((d,k)=>{const n=T.pcs.length,x=(k-(n-1)/2)*4.2,z=4.2,tm=M(0x6b5844,{roughness:.9});add(new K.BoxGeometry(3,.12,1.8),tm,x,2.0,z);for(const dx of[-1.35,1.35])for(const dz of[-.7,.7])add(new K.BoxGeometry(.1,2,.1),tm,x+dx,1,z+dz);
    add(new K.BoxGeometry(1.7,1.05,.08),M(0x14181c),x,2.75,z-.3);add(new K.PlaneGeometry(1.56,.92),new K.MeshBasicMaterial({map:textTex([d.name,d.ip,'ping OK'],512,300,'#0b1a12','#5fe39a',40)}),x,2.75,z-.255);PCP[d.name]=V3(x,2.3,z-.6)});
  const tube=(pts,col)=>{const c=new K.CatmullRomCurve3(pts);sc.add(new K.Mesh(new K.TubeGeometry(c,60,.04,8,false),M(col,{roughness:.5})));return c};
  const C={};
  for(const d of T.pcs){const a=PCP[d.name],b=P[d.sw][d.slot];C[d.name]=tube([a,V3(a.x*.8,1.6,3.2),V3(b.x+(a.x>0?.6:-.6),b.y-.3,2.2),V3(b.x,b.y,1.8),b],0x2f7bf2)}
  for(const l of T.links){const a=P[l.a][l.as],b=P[l.b][l.bs];C[l.a+'|'+l.b]=tube([a,V3(a.x+.5,a.y,1.9),V3(a.x+1.1,(a.y+b.y)/2,2.2),V3(b.x+.5,b.y,1.9),b],0xf2b705)}
  const swPath=(s1,s2)=>{const q=[[s1]],seen=new Set([s1]);while(q.length){const pth=q.shift(),x=pth[pth.length-1];if(x===s2)return pth;for(const l of T.links){const y=l.a===x?l.b:l.b===x?l.a:null;if(y&&!seen.has(y)){seen.add(y);q.push(pth.concat(y))}}}return[s1]};
  const routes=T.goals.map(g=>{const src=pcByName(g.from),dst=T.pcs.find(p=>p.ip===g.to),dsw=dst?dst.sw:'CORE',path=swPath(src.sw,dsw),pts=[...C[src.name].getPoints(40)];
    for(let i=0;i+1<path.length;i++){const l=T.links.find(l=>(l.a===path[i]&&l.b===path[i+1])||(l.b===path[i]&&l.a===path[i+1])),c=C[l.a+'|'+l.b].getPoints(30);pts.push(...(l.a===path[i]?c:c.reverse()))}
    if(dst)pts.push(...C[dst.name].getPoints(40).reverse());return pts});
  const pk=routes.map(()=>{const m=new K.Mesh(new K.SphereGeometry(.11,16,12),new K.MeshBasicMaterial({color:0xffffff}));sc.add(m);return m});
  const st={th:.2,ph:1.1,r:20,auto:!matchMedia('(prefers-reduced-motion:reduce)').matches,tgt:V3(0,2.6,1.5)},ptrs=new Map();let pd=0;
  R.domElement.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,[e.clientX,e.clientY]);st.auto=false;R.domElement.setPointerCapture(e.pointerId)});
  R.domElement.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const[px,py]=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===1){st.th-=(e.clientX-px)*.008;st.ph=Math.max(.35,Math.min(1.5,st.ph-(e.clientY-py)*.006))}else if(ptrs.size===2){const[a,b]=[...ptrs.values()],dd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)st.r=Math.max(8,Math.min(34,st.r*(pd/dd)));pd=dd}});
  const up=e=>{ptrs.delete(e.pointerId);pd=0};R.domElement.addEventListener('pointerup',up);R.domElement.addEventListener('pointercancel',up);
  R.domElement.addEventListener('wheel',e=>{e.preventDefault();st.r=Math.max(8,Math.min(34,st.r*(1+e.deltaY*.001)))},{passive:false});
  const ro=new ResizeObserver(()=>{const w=box.clientWidth,h=box.clientHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()});ro.observe(box);
  const loop=now=>{if(st.auto)st.th=.2+Math.sin(now/5000)*.5;cam.position.set(st.tgt.x+st.r*Math.sin(st.ph)*Math.sin(st.th),st.tgt.y+st.r*Math.cos(st.ph),st.tgt.z+st.r*Math.sin(st.ph)*Math.cos(st.th));cam.lookAt(st.tgt);
    pk.forEach((m,i)=>{const r=routes[i],full=r.concat(r.slice().reverse()),f=((now/4600)+i/pk.length)%1;m.position.copy(full[Math.floor(f*(full.length-1))]);m.material.color.setHex(i%2?0xffc61a:0x7fb6ff)});
    pp.forEach((l,i)=>l.material.color.setHex(Math.sin(now/90+i*1.7)>-.2?0x2cff8a:0x0c4020));R.render(sc,cam);G.raf=requestAnimationFrame(loop)};
  G={R,ro,raf:0};G.raf=requestAnimationFrame(loop)}
function build3D(){if(TP())return build3DT();
  const box=$('#g3d');if(G){cancelAnimationFrame(G.raf);G.ro.disconnect();G.R.dispose();G.R.domElement.remove();G=null}
  if(!window.THREE){box.insertAdjacentHTML('beforeend','<p style="color:#fff;padding:20px">No se pudo cargar la vista 3D.</p>');return}
  const T=THREE,R=new T.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));box.prepend(R.domElement);
  const sc=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.1,200);
  sc.add(new T.HemisphereLight(0xdfe9f3,0x1a2026,.85));const dl=new T.DirectionalLight(0xffffff,.75);dl.position.set(6,12,10);sc.add(dl);
  const M=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:.2},o));
  const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);sc.add(o);return o};
  const fl=add(new T.PlaneGeometry(60,30),M(0x222a31,{roughness:1}),0,0,0);fl.rotation.x=-Math.PI/2;
  const rk=M(0x15191d,{metalness:.6,roughness:.5});
  for(const x of[-2.7,2.7])for(const z of[-1.5,1.5])add(new T.BoxGeometry(.16,5.4,.16),rk,x,2.7,z);
  for(const y of[.08,5.4])add(new T.BoxGeometry(5.6,.14,3.2),rk,0,y,0);
  for(const x of[-2.55,2.55])add(new T.BoxGeometry(.12,5.2,.05),M(0x2a3036,{metalness:.7}),x,2.7,1.45);
  const pp=[];
  function sw(d,y){const v=VEND[d.vendor];add(new T.BoxGeometry(5,.44,2.7),M(v.color,{metalness:.45,roughness:.45}),0,y,0);
    const lb=add(new T.PlaneGeometry(1.7,.34),new T.MeshBasicMaterial({map:textTex([d.name+'  '+v.label],512,100,null,d.vendor==='aruba'?'#1d252c':'#eef3f7',40),transparent:true}),-1.55,y,1.36);
    const pos=[];for(let i=1;i<=24;i++){const col=(i-1)%12,row=i<=12?0:1,x=-.45+col*.27,py=y+(row?-.09:.09);add(new T.BoxGeometry(.21,.14,.04),M(0x0a0c0e),x,py,1.36);pos[i]=new T.Vector3(x,py,1.39)}
    for(const i of[v.phys.pc,v.phys.up]){const l=add(new T.BoxGeometry(.06,.03,.02),new T.MeshBasicMaterial({color:0x2cff8a}),pos[i].x+.07,pos[i].y+(i<=12?.09:-.09),1.39);pp.push(l)}
    return{pos,v}}
  const A=sw(S1,3.3),B=sw(S2,2.62);
  function pcAt(x,d,ok){const tm=M(0x6b5844,{roughness:.9});add(new T.BoxGeometry(3,.12,1.8),tm,x,2.0,1.6);for(const dx of[-1.35,1.35])for(const dz of[.85,2.35])add(new T.BoxGeometry(.1,2,.1),tm,x+dx,1,dz);
    add(new T.BoxGeometry(1.7,1.05,.08),M(0x14181c),x,2.75,1.3);add(new T.BoxGeometry(.12,.5,.12),M(0x3a4148),x,2.25,1.3);
    add(new T.PlaneGeometry(1.56,.92),new T.MeshBasicMaterial({map:textTex([d.name+'  C:\\>ping '+d.peer,'Reply from '+d.peer+':','  bytes=32 time=1ms TTL=128','Reply from '+d.peer+':','  bytes=32 time=1ms TTL=128'],512,300,'#0b1a12','#5fe39a',30)}),x,2.75,1.345);
    add(new T.BoxGeometry(.5,.9,1),M(0x2b3138),x+1.05,2.51,1.6);return new T.Vector3(x+1.05,2.3,1.1)}
  const pa=pcAt(-7.2,PCA),pb=pcAt(7.2,PCB);
  const V3=(x,y,z)=>new T.Vector3(x,y,z);
  const ca=new T.CatmullRomCurve3([pa,V3(-5.8,1.5,1.9),V3(-3.4,1.9,2.2),V3(A.pos[A.v.phys.pc].x-.3,A.pos[A.v.phys.pc].y-.2,2.0),V3(A.pos[A.v.phys.pc].x,A.pos[A.v.phys.pc].y,1.8),A.pos[A.v.phys.pc]]);
  const pB=B.pos[B.v.phys.pc],cb=new T.CatmullRomCurve3([pb,V3(5.8,1.5,1.9),V3(3.6,1.7,2.3),V3(.8,1.9,2.25),V3(pB.x,pB.y-.25,1.9),pB]);
  const ta=A.pos[A.v.phys.up],tb=B.pos[B.v.phys.up],ct=new T.CatmullRomCurve3([ta,V3(ta.x,ta.y,1.8),V3(ta.x+.7,(ta.y+tb.y)/2,2.1),V3(tb.x,tb.y,1.8),tb]);
  for(const[c,col]of[[ca,0x2f7bf2],[cb,0x2f7bf2],[ct,0xf2b705]])sc.add(new T.Mesh(new T.TubeGeometry(c,80,.045,8,false),M(col,{roughness:.5})));
  const seg=(pts,col)=>pts.map(p=>({p,col}));const lin=(a,b,n)=>Array.from({length:n},(_,i)=>a.clone().lerp(b,i/(n-1)).add(V3(0,0,.06)));
  const path=[...seg(ca.getPoints(90),0x4f9bff),...seg(lin(A.pos[A.v.phys.pc],ta,26),0xe9eef2),...seg(ct.getPoints(50),0xffc61a),...seg(lin(tb,pB,26),0xe9eef2),...seg(cb.getPoints(110).reverse(),0x4f9bff)];
  const full=path.concat(path.slice().reverse());
  const pk=[0,1,2].map(()=>{const m=new T.Mesh(new T.SphereGeometry(.1,16,12),new T.MeshBasicMaterial({color:0xffffff}));sc.add(m);return m});
  const st={th:.35,ph:1.15,r:17,auto:!matchMedia('(prefers-reduced-motion:reduce)').matches,tgt:V3(0,2.4,0)};
  const ptrs=new Map();let pd=0;
  R.domElement.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,[e.clientX,e.clientY]);st.auto=false;R.domElement.setPointerCapture(e.pointerId)});
  R.domElement.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const[px,py]=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    if(ptrs.size===1){st.th-=(e.clientX-px)*.008;st.ph=Math.max(.35,Math.min(1.5,st.ph-(e.clientY-py)*.006))}
    else if(ptrs.size===2){const[a,b]=[...ptrs.values()],dd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)st.r=Math.max(7,Math.min(30,st.r*(pd/dd)));pd=dd}});
  const up=e=>{ptrs.delete(e.pointerId);pd=0};R.domElement.addEventListener('pointerup',up);R.domElement.addEventListener('pointercancel',up);
  R.domElement.addEventListener('wheel',e=>{e.preventDefault();st.r=Math.max(7,Math.min(30,st.r*(1+e.deltaY*.001)))},{passive:false});
  const ro=new ResizeObserver(()=>{const w=box.clientWidth,h=box.clientHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()});ro.observe(box);
  let t0=performance.now();
  const loop=now=>{const dt=(now-t0)/1000;t0=now;if(st.auto)st.th=.35+Math.sin(now/5000)*.45;
    cam.position.set(st.tgt.x+st.r*Math.sin(st.ph)*Math.sin(st.th),st.tgt.y+st.r*Math.cos(st.ph),st.tgt.z+st.r*Math.sin(st.ph)*Math.cos(st.th));cam.lookAt(st.tgt);
    pk.forEach((m,i)=>{const f=((now/4200)+i/3)%1,q=full[Math.floor(f*(full.length-1))];m.position.copy(q.p);m.material.color.setHex(q.col)});
    pp.forEach((l,i)=>{l.material.color.setHex(Math.sin(now/90+i*1.7)>-.2?0x2cff8a:0x0c4020)});
    R.render(sc,cam);G.raf=requestAnimationFrame(loop)};
  G={R,ro,raf:0};G.raf=requestAnimationFrame(loop);
}
reset();
}
