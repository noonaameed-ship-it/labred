/* PacketPath · consola del Sitio 3D: mini-simulador de Cisco IOS, Aruba AOS-CX y Juniper Junos sobre un modelo neutro. */
export const VN={cisco:'Cisco IOS',aruba:'Aruba AOS-CX',juniper:'Juniper Junos'};
export function pn(v,g){let m=/^(Gi|Te)0\/(\d+)$/.exec(g);if(m){const n=+m[2];if(m[1]==='Gi')return v==='cisco'?'Gi0/'+n:v==='aruba'?'1/1/'+n:'ge-0/0/'+(n-1);return v==='cisco'?'Te0/'+n:v==='aruba'?'1/1/'+(24+n):'xe-0/1/'+(n-1)}
 if(m=/^Po(\d+)$/.exec(g))return v==='cisco'?'Port-channel'+m[1]:v==='aruba'?'lag'+m[1]:'ae'+m[1];if(m=/^Vl(\d+)$/.exec(g))return v==='juniper'?'irb.'+m[1]:(v==='cisco'?'Vlan':'vlan')+m[1];return g}
function pif(v,s){s=s.toLowerCase().replace(/\s+/g,'');let m;
 if(v==='cisco'){if(m=/^g[a-z]*0\/(\d+)$/.exec(s))return +m[1]>=1&&+m[1]<=24?'Gi0/'+(+m[1]):null;if(m=/^t[a-z]*0\/(\d+)$/.exec(s))return +m[1]>=1&&+m[1]<=4?'Te0/'+(+m[1]):null;if(m=/^po[a-z-]*(\d+)$/.exec(s))return'Po'+(+m[1]);if(m=/^vl[a-z]*(\d+)$/.exec(s))return'Vl'+(+m[1]);return null}
 if(v==='aruba'){if(m=/^1\/1\/(\d+)$/.exec(s)){const n=+m[1];return n>=1&&n<=24?'Gi0/'+n:n>=25&&n<=28?'Te0/'+(n-24):null}if(m=/^lag(\d+)$/.exec(s))return'Po'+(+m[1]);if(m=/^vlan(\d+)$/.exec(s))return'Vl'+(+m[1]);return null}
 if(m=/^ge-0\/0\/(\d+)$/.exec(s))return +m[1]<=23?'Gi0/'+(+m[1]+1):null;if(m=/^xe-0\/1\/(\d+)$/.exec(s))return +m[1]<=3?'Te0/'+(+m[1]+1):null;if(m=/^ae(\d+)$/.exec(s))return'Po'+(+m[1]);return null}
const ALLG=[...Array(24)].map((_,i)=>'Gi0/'+(i+1)).concat([1,2,3,4].map(n=>'Te0/'+n));
const clone=o=>JSON.parse(JSON.stringify(o));
const CORE_F=['host','vlans','ifs','lags','svi','gw','stp','aecount','l3'];
export function mkDev(name,v){const d={name,v,host:v==='cisco'?'Switch':'switch',vlans:{1:'default'},ifs:{},lags:{},svi:{},gw:null,stp:{mode:v==='cisco'?'pvst':v==='aruba'?'off':'rstp',prio:{}},aecount:0,l3:{},saved:true,mode:v==='cisco'?'exec':v==='aruba'?'priv':'op',ctx:null,cand:null,ran:{},hist:[]};return d}
export function IF(d,g){return d.ifs[g]||(d.ifs[g]={mode:null,access:1,allowed:null,native:1,desc:'',up:d.v!=='aruba',lag:null,lagMode:null,fam:false})}
export const RI=(d,g)=>d.ifs[g]||{mode:null,access:1,allowed:null,native:1,desc:'',up:d.v!=='aruba',lag:null,lagMode:null};
export function LG(d,n){return d.lags[n]||(d.lags[n]={mode:null,access:1,allowed:null,native:1,up:d.v!=='aruba',lacp:null,desc:''})}
const T=d=>d.v==='juniper'&&d.cand?d.cand:d;
const vlist=a=>{a=[...new Set(a)].sort((x,y)=>x-y);const r=[];for(let i=0;i<a.length;i++){let j=i;while(j+1<a.length&&a[j+1]===a[j]+1)j++;r.push(j>i+1?a[i]+'-'+a[j]:j===i+1?a[i]+','+a[j]:''+a[i]);i=j}return r.join(',')};
const plist=s=>{const r=[];for(const p of String(s).split(',')){const m=/^(\d+)(?:-(\d+))?$/.exec(p.trim());if(!m)return null;const a=+m[1],b=m[2]?+m[2]:a;if(a<1||b>4094||b<a)return null;for(let i=a;i<=b;i++)r.push(i)}return r};
// ---------- estado efectivo ----------
export function prioOf(d,vid){const p=d.stp.prio;return p[vid]!=null?p[vid]:p.all!=null?p.all:32768}
export function lagOf(d,g){const i=d.ifs[g];return i&&i.lag!=null?i.lag:null}
export function eff(d,g){const i=RI(d,g);const L=i.lag!=null&&d.lags[i.lag];if(L&&lagExists(d,i.lag))return{...L,up:L.up&&i.up,lagged:true};return i}
export function lagExists(d,n){return d.v!=='juniper'||d.aecount>n}
export function lagMode(d,g){const i=d.ifs[g];if(!i||i.lag==null)return null;if(d.v==='cisco')return i.lagMode||'on';const L=d.lags[i.lag];return L&&L.lacp||'on'}
function upOf(d,g,env){const i=RI(d,g);return i.up&&env.cabled(d.name,g)}
// ---------- utilidades de parseo ----------
const toks=l=>{const r=[];l.replace(/"([^"]*)"|(\S+)/g,(_,q,w)=>{r.push(q!=null?q:w)});return r};
function mt(tk,pat){const P=pat.split(' '),a=[];for(let i=0;i<P.length;i++){const p=P[i],t=tk[i];if(p==='**'){a.push(tk.slice(i).join(' '));return tk.length>i?a:null}if(t==null)return null;if(p==='*'){a.push(t);continue}const o=p.split('|');const w=o.find(x=>x.startsWith(t.toLowerCase()));if(!w)return null;a.push(w)}return tk.length===P.length?a:null}
const E=t=>({t,c:'err'}),U=t=>({t,c:'tut'});
const ipok=s=>/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s)&&s.split('.').every(x=>+x<=255);
const m2l=m=>{if(!ipok(m))return null;const b=m.split('.').map(x=>(+x).toString(2).padStart(8,'0')).join('');return /^1*0*$/.test(b)?b.indexOf('0')<0?32:b.indexOf('0'):null};
const l2m=l=>[0,1,2,3].map(i=>{const b=Math.max(0,Math.min(8,l-i*8));return 256-Math.pow(2,8-b)}).join('.');
export function prompt(d){const h=d.host;if(d.v==='juniper')return'admin@'+h+(d.mode==='cfg'?'#':'>');
 if(d.v==='cisco')return h+{exec:'>',priv:'#',conf:'(config)#',if:'(config-if)#',range:'(config-if-range)#',vlan:'(config-vlan)#'}[d.mode];
 return h+{priv:'#',conf:'(config)#',if:d.ctx&&/^Po/.test(d.ctx[0])?'(config-lag-if)#':d.ctx&&/^Vl/.test(d.ctx[0])?'(config-if-vlan)#':'(config-if)#',vlan:'(config-vlan-'+(d.ctx||'')+')#'}[d.mode]}
export function banner(d){if(d.v==='cisco')return['','Press RETURN to get started.','',U('[tutor] Consola por cable de consola: 9600 baudios, 8N1. Escribe ? para ver los comandos.')];
 if(d.v==='aruba')return['','(C) Copyright 2017-2026 Hewlett Packard Enterprise Development LP','','We\'d like to keep you up to date about:','  * Software feature updates','','switch login: admin','Password:',U('[tutor] En el laboratorio el usuario admin no tiene contraseña. Escribe ? para ver los comandos.')];
 return['','--- JUNOS 23.4R2 Kernel 64-bit','',U('[tutor] Ya estás en la CLI de Junos (modo operativo, >). Escribe ? para ver los comandos.')]}
// ---------- ejecutar ----------
export function run(d,line,env){line=line.trim();const out=[];if(!line)return out;d.hist.push(line);
 if(line==='?'||/\s\?$/.test(line))return help(d);
 try{if(d.v==='cisco')cisco(d,line,env,out);else if(d.v==='aruba')aruba(d,line,env,out);else junos(d,line,env,out)}catch(e){out.push(E('% Error interno: '+e.message))}
 return out}
function help(d){const H={cisco:{exec:['enable','show interfaces status','show vlan brief'],priv:['configure terminal','show running-config','show vlan brief','show interfaces status','show interfaces trunk','show ip interface brief','show spanning-tree','show etherchannel summary','write memory','disable'],conf:['hostname <nombre>','vlan <id>','interface <puerto>','interface range <puertos>','interface vlan <id>','interface port-channel <n>','ip default-gateway <ip>','spanning-tree mode rapid-pvst','spanning-tree vlan <lista> priority <n>','spanning-tree vlan <lista> root primary','end','do <comando>'],vlan:['name <nombre>','exit'],if:['switchport mode access|trunk','switchport access vlan <id>','switchport trunk allowed vlan <lista>','switchport trunk native vlan <id>','channel-group <n> mode active|passive|on','description <texto>','shutdown / no shutdown','ip address <ip> <máscara>','exit','end']},
 aruba:{priv:['configure terminal','show running-config','show vlan','show interface brief','show lacp interfaces','show spanning-tree','show ip interface brief','write memory'],conf:['hostname <nombre>','vlan <id>','interface <1/1/N>','interface lag <n>','interface vlan <id>','ip route 0.0.0.0/0 <gateway>','spanning-tree','spanning-tree priority <0-15>','end'],vlan:['name <nombre>','exit'],if:['no shutdown','vlan access <id>','vlan trunk native <id>','vlan trunk allowed <lista>','lag <n>','lacp mode active|passive','description <texto>','ip address <ip>/<prefijo>','exit','end']},
 juniper:{op:['configure','show interfaces terse','show vlans','show configuration','show lacp interfaces','show spanning-tree bridge'],cfg:['set system host-name <nombre>','set vlans <NOMBRE> vlan-id <id>','set interfaces <puerto> unit 0 family ethernet-switching interface-mode access|trunk','set interfaces <puerto> unit 0 family ethernet-switching vlan members <vlan>','set interfaces <puerto> native-vlan-id <id>','set interfaces irb unit <id> family inet address <ip>/<prefijo>','set vlans <NOMBRE> l3-interface irb.<id>','set routing-options static route 0.0.0.0/0 next-hop <ip>','set protocols rstp bridge-priority <4k…>','set chassis aggregated-devices ethernet device-count <n>','set interfaces <puerto> ether-options 802.3ad ae<n>','set interfaces ae<n> aggregated-ether-options lacp active','delete <ruta>','commit','run show …','exit']}};
 const k=d.v==='cisco'?(d.mode==='range'?'if':d.mode):d.mode;return[U('Comandos disponibles aquí:')].concat((H[d.v][k]||[]).map(x=>'  '+x))}
function dirty(d){d.saved=false}
/* ===== Cisco IOS ===== */
function cisco(d,line,env,out){env0=env;let tk=toks(line),a;
 if(d.mode!=='exec'&&d.mode!=='priv'&&(a=mt(tk,'do **')))return cShow(d,a[1],env,out,true);
 if(d.mode==='exec'){if(mt(tk,'enable'))return d.mode='priv';if(a=mt(tk,'show **'))return cShow(d,a[1],env,out);if(mt(tk,'exit|logout'))return;if(mt(tk,'configure terminal')||mt(tk,'configure')){out.push(E('% Invalid input detected at \'^\' marker.'),U('[tutor] Primero entra al modo privilegiado con enable (el prompt cambia de > a #).'));return}return bad(out,line)}
 if(d.mode==='priv'){if(mt(tk,'configure terminal')||mt(tk,'configure')){out.push('Enter configuration commands, one per line.  End with CNTL/Z.');return d.mode='conf'}
  if(a=mt(tk,'show **'))return cShow(d,a[1],env,out);if(mt(tk,'write memory')||mt(tk,'write')||mt(tk,'copy running-config startup-config')){out.push('Building configuration...','[OK]');d.saved=true;return}
  if(mt(tk,'disable'))return d.mode='exec';if(mt(tk,'exit|logout'))return d.mode='exec';if(mt(tk,'enable'))return;return bad(out,line)}
 if(mt(tk,'end')){d.mode='priv';d.ctx=null;return}
 if(mt(tk,'exit')){d.mode=d.mode==='conf'?'priv':'conf';d.ctx=null;return}
 if(d.mode==='vlan'&&(a=mt(tk,'name *'))){d.vlans[d.ctx]=a[1];dirty(d);return}
 if((d.mode==='if'||d.mode==='range')&&cIf(d,tk,out))return;
 if(cConf(d,tk,out,line))return;
 return bad(out,line)}
function bad(out,line){out.push(E('% Invalid input detected at \'^\' marker.'),U('[tutor] Revisa la ortografía o escribe ? para ver los comandos de este modo.'))}
function cConf(d,tk,out,line){let a;
 if(a=mt(tk,'hostname *')){d.host=a[1];dirty(d);d.mode='conf';return 1}
 if(a=mt(tk,'vlan *')){const l=plist(a[1]);if(!l){out.push(E('% Invalid input'));return 1}l.forEach(v=>{if(!d.vlans[v])d.vlans[v]='VLAN'+String(v).padStart(4,'0')});d.mode='vlan';d.ctx=l[0];dirty(d);return 1}
 if(a=mt(tk,'no vlan *')){(plist(a[2])||[]).forEach(v=>{if(v!==1)delete d.vlans[v]});dirty(d);return 1}
 if(a=mt(tk,'interface range **')){const r=a[2].replace(/\s+/g,''),m=/^([a-z]+)0\/(\d+)-(?:[a-z]+0\/)?(\d+)$/i.exec(r);if(!m){out.push(E('% Invalid input'));return 1}const L=[];for(let n=+m[2];n<=+m[3];n++){const g=pif('cisco',m[1]+'0/'+n);if(!g){out.push(E('% Invalid input'));return 1}L.push(g)}d.ctx=L;d.mode='range';return 1}
 if(a=mt(tk,'interface **')){const g=pif('cisco',a[1]);if(!g){out.push(E('% Invalid input detected at \'^\' marker.'),U('[tutor] En este switch los puertos son g0/1 … g0/24 y te0/1 … te0/4.'));return 1}
  if(/^Po/.test(g))LG(d,+g.slice(2));if(/^Vl/.test(g)){const v=+g.slice(2);d.svi[v]=d.svi[v]||{ip:null,len:null,up:false}}d.ctx=[g];d.mode='if';return 1}
 if(a=mt(tk,'ip default-gateway *')){if(!ipok(a[2])){out.push(E('% Invalid input'));return 1}d.gw=a[2];dirty(d);d.mode='conf';return 1}
 if(a=mt(tk,'spanning-tree mode *')){const m=['pvst','rapid-pvst','mst'].find(x=>x.startsWith(a[2].toLowerCase()));if(!m){out.push(E('% Invalid input'));return 1}d.stp.mode=m;dirty(d);d.mode='conf';return 1}
 if(a=mt(tk,'spanning-tree vlan * priority *')){const l=plist(a[2]),p=+a[4];if(!l||p%4096||p<0||p>61440){out.push(E('% Bridge Priority must be in increments of 4096.'),E('% Allowed values are: 0 4096 8192 … 61440'));return 1}l.forEach(v=>d.stp.prio[v]=p);dirty(d);d.mode='conf';return 1}
 if(a=mt(tk,'spanning-tree vlan * root primary')){const l=plist(a[2]);if(!l){out.push(E('% Invalid input'));return 1}l.forEach(v=>d.stp.prio[v]=24576);dirty(d);d.mode='conf';return 1}
 return 0}
function cIf(d,tk,out){let a;const C=d.ctx;const each=f=>{C.forEach(g=>{if(/^Po/.test(g))f(LG(d,+g.slice(2)),g);else if(/^Gi|^Te/.test(g))f(IF(d,g),g)});dirty(d);return 1};const isV=/^Vl/.test(C[0]);
 if(isV){const s=d.svi[+C[0].slice(2)];if(a=mt(tk,'ip address * *')){const l=m2l(a[3]);if(!ipok(a[2])||l==null){out.push(E('% Invalid input'));return 1}s.ip=a[2];s.len=l;dirty(d);return 1}if(mt(tk,'no shutdown')){s.up=true;dirty(d);out.push('%LINK-5-CHANGED: Interface '+pn('cisco',C[0])+', changed state to up');return 1}if(mt(tk,'shutdown')){s.up=false;dirty(d);return 1}if(mt(tk,'description **'))return 1;return 0}
 if(a=mt(tk,'switchport mode *')){const m=['access','trunk'].find(x=>x.startsWith(a[2].toLowerCase()));if(!m){out.push(E('% Invalid input'));return 1}return each(i=>i.mode=m)}
 if(a=mt(tk,'switchport access vlan *')){const v=+a[3];if(!(v>=1&&v<=4094)){out.push(E('% Invalid input'));return 1}if(!d.vlans[v]){d.vlans[v]='VLAN'+String(v).padStart(4,'0');out.push('% Access VLAN does not exist. Creating vlan '+v)}return each(i=>i.access=v)}
 if(a=mt(tk,'switchport trunk allowed vlan add *')){const l=plist(a[5]);if(!l){out.push(E('% Invalid input'));return 1}return each(i=>i.allowed=[...new Set((i.allowed||[]).concat(l))])}
 if(a=mt(tk,'switchport trunk allowed vlan *')){if(/^all$/i.test(a[4]))return each(i=>i.allowed=null);const l=plist(a[4]);if(!l){out.push(E('% Invalid input'));return 1}return each(i=>i.allowed=l)}
 if(a=mt(tk,'switchport trunk native vlan *')){const v=+a[4];if(!(v>=1&&v<=4094)){out.push(E('% Invalid input'));return 1}return each(i=>i.native=v)}
 if(mt(tk,'switchport trunk encapsulation dot1q')||mt(tk,'switchport')||mt(tk,'switchport nonegotiate'))return 1;
 if(a=mt(tk,'description **'))return each(i=>i.desc=a[1]);
 if(mt(tk,'no shutdown')){each(i=>i.up=true);C.forEach(g=>{if(/^Po/.test(g)||env0.cabled(d.name,g))out.push('%LINK-3-UPDOWN: Interface '+longIf(g)+', changed state to up')});return 1}
 if(mt(tk,'shutdown')){each(i=>i.up=false);C.forEach(g=>out.push('%LINK-5-CHANGED: Interface '+longIf(g)+', changed state to administratively down'));return 1}
 if(mt(tk,'spanning-tree portfast')||mt(tk,'spanning-tree portfast edge'))return each(i=>i.pf=true);
 if(a=mt(tk,'channel-group * mode *')){const n=+a[1],m=['active','passive','on','auto','desirable'].find(x=>x.startsWith(a[3].toLowerCase()));if(!(n>=1&&n<=48)||!m){out.push(E('% Invalid input'));return 1}if(m==='auto'||m==='desirable')out.push(U('[tutor] auto/desirable es PAgP, propietario de Cisco. Para LACP usa active o passive.'));
  if(C.some(g=>/^Po|^Vl/.test(g))){out.push(E('% Invalid input'));return 1}if(!d.lags[n]){const L=LG(d,n);const f=IF(d,C[0]);L.mode=f.mode;L.allowed=f.allowed;L.native=f.native;L.access=f.access;out.push('Creating a port-channel interface Port-channel '+n)}return each(i=>{i.lag=n;i.lagMode=m})}
 if(mt(tk,'no channel-group'))return each(i=>{i.lag=null;i.lagMode=null});
 return 0}
let env0={cabled:()=>true};
const longIf=g=>g.replace(/^Gi/,'GigabitEthernet').replace(/^Te/,'TenGigabitEthernet').replace(/^Po/,'Port-channel');
function cShow(d,what,env,out,doCmd){env0=env;const w=what.toLowerCase().split(/\s+/),k=(...p)=>p.every((x,i)=>w[i]&&x.startsWith(w[i]))&&w.length===p.length;
 if(k('running-config')||k('run'))return out.push(...cRun(d));
 if(k('vlan','brief')||k('vlan')){d.ran.vlan=1;out.push('','VLAN Name                             Status    Ports','---- -------------------------------- --------- -------------------------------');for(const v of Object.keys(d.vlans).map(Number).sort((a,b)=>a-b)){const ps=ALLG.filter(g=>{const e=eff(d,g);return e.mode!=='trunk'&&!(RI(d,g).lag!=null)&&(e.access||1)===v}).map(g=>pn('cisco',g));const ch=[];for(let i=0;i<Math.max(1,ps.length);i+=4)ch.push(ps.slice(i,i+4).join(', '));ch.forEach((c,i)=>out.push(i?' '.repeat(48)+c:String(v).padEnd(5)+d.vlans[v].slice(0,32).padEnd(33)+'active    '+c))}return}
 if(k('interfaces','status')){d.ran.ifs=1;out.push('','Port      Name               Status       Vlan       Duplex  Speed Type');for(const g of ALLG){const i=RI(d,g),e=eff(d,g),st=!i.up?'disabled':env.cabled(d.name,g)?'connected':'notconnect';out.push(pn('cisco',g).padEnd(10)+(i.desc||'').slice(0,18).padEnd(19)+st.padEnd(13)+(e.mode==='trunk'?'trunk':String(e.access||1)).padEnd(11)+(st==='connected'?'a-full  ':'  auto  ')+(st==='connected'?(g[0]==='T'?'a-10G':'a-1000'):'  auto').padEnd(6)+' '+(g[0]==='T'?'SFP-10GBase-SR':'10/100/1000BaseTX'))}
  Object.keys(d.lags).forEach(n=>out.push(('Po'+n).padEnd(10)+''.padEnd(19)+(ALLG.some(g=>lagOf(d,g)==+n&&lagUpPair(d,g,env))?'connected':'notconnect').padEnd(13)+(d.lags[n].mode==='trunk'?'trunk':String(d.lags[n].access))));return}
 if(k('ip','interface','brief')){d.ran.ip=1;out.push('Interface              IP-Address      OK? Method Status                Protocol');Object.keys(d.svi).forEach(v=>{const s=d.svi[v];out.push(('Vlan'+v).padEnd(23)+(s.ip||'unassigned').padEnd(16)+'YES '+(s.ip?'manual ':'unset  ')+(s.up?'up':'administratively down').padEnd(22)+(s.up&&Object.values(d.ifs).length?'up':'down'))});ALLG.forEach(g=>{const i=RI(d,g),u=i.up&&env.cabled(d.name,g);out.push(longIf(g).padEnd(23)+'unassigned      YES unset  '+(i.up?u?'up':'down':'administratively down').padEnd(22)+(u?'up':'down'))});return}
 if(k('interfaces','trunk')){d.ran.trunk=1;const tr=ALLG.filter(g=>RI(d,g).lag==null&&RI(d,g).mode==='trunk'&&upOf(d,g,env)).map(g=>[pn('cisco',g),RI(d,g)]).concat(Object.keys(d.lags).filter(n=>d.lags[n].mode==='trunk'&&ALLG.some(g=>lagOf(d,g)==+n&&lagUpPair(d,g,env))).map(n=>['Po'+n,d.lags[n]]));
  out.push('','Port        Mode             Encapsulation  Status        Native vlan');tr.forEach(([n,i])=>out.push(n.padEnd(12)+'on               802.1q         trunking      '+i.native));out.push('','Port        Vlans allowed on trunk');tr.forEach(([n,i])=>out.push(n.padEnd(12)+(i.allowed?vlist(i.allowed):'1-4094')));out.push('','Port        Vlans allowed and active in management domain');tr.forEach(([n,i])=>out.push(n.padEnd(12)+vlist(Object.keys(d.vlans).map(Number).filter(v=>!i.allowed||i.allowed.includes(v)))));return}
 if(k('spanning-tree')||k('spanning-tree','summary')){d.ran.stp=1;return out.push(...stpShow(d,env))}
 if(k('etherchannel','summary')){d.ran.lacp=1;out.push('Flags:  D - down        P - bundled in port-channel','        I - stand-alone s - suspended','        S - Layer2      U - in use','','Number of channel-groups in use: '+Object.keys(d.lags).length,'','Group  Port-channel  Protocol    Ports','------+-------------+-----------+-----------------------------------------------');for(const n of Object.keys(d.lags)){const ms=ALLG.filter(g=>lagOf(d,g)==+n),any=ms.some(g=>lagUpPair(d,g,env));out.push(String(n).padEnd(7)+('Po'+n+'(S'+(any?'U':'D')+')').padEnd(14)+(ms.some(g=>RI(d,g).lagMode!=='on')?'LACP':'-').padEnd(12)+ms.map(g=>pn('cisco',g)+'('+(lagUpPair(d,g,env)?'P':RI(d,g).up?'I':'D')+')').join(' '))}return}
 if(k('version'))return out.push('Cisco IOS Software, Version 15.2(7)E8','cisco WS-C2960X-24TD-L (APM86XXX) processor','24 Gigabit Ethernet interfaces','4 Ten Gigabit Ethernet interfaces');
 out.push(E('% Invalid input detected at \'^\' marker.'),U('[tutor] Prueba: show running-config, show vlan brief, show interfaces status, show interfaces trunk, show spanning-tree, show etherchannel summary.'))}
export function lagUpPair(d,g,env){const i=RI(d,g);if(!i.up||!env.cabled(d.name,g))return false;if(i.lag==null)return true;const m=lagMode(d,g);if(!lagExists(d,i.lag))return false;const L=d.lags[i.lag];if(L&&!L.up)return false;return env.lagPeerOk?env.lagPeerOk(d,g,m):(m==='active'||m==='passive')}
function cRun(d){const r=['Building configuration...','','Current configuration : 2048 bytes','!','version 15.2','hostname '+d.host,'!'];if(d.stp.mode!=='pvst')r.push('spanning-tree mode '+d.stp.mode);Object.keys(d.stp.prio).forEach(v=>r.push('spanning-tree vlan '+v+' priority '+d.stp.prio[v]));r.push('!');
 for(const v of Object.keys(d.vlans))if(v!=='1')r.push('vlan '+v,' name '+d.vlans[v],'!');
 for(const n of Object.keys(d.lags)){const L=d.lags[n];r.push('interface Port-channel'+n);if(L.mode)r.push(' switchport mode '+L.mode);if(L.mode==='trunk'&&L.allowed)r.push(' switchport trunk allowed vlan '+vlist(L.allowed));if(L.native!==1)r.push(' switchport trunk native vlan '+L.native);r.push('!')}
 for(const g of ALLG){const i=d.ifs[g];r.push('interface '+longIf(g));if(i){if(i.desc)r.push(' description '+i.desc);if(i.mode==='access'||(i.mode==null&&i.access!==1))r.push(' switchport access vlan '+i.access);if(i.mode)r.push(' switchport mode '+i.mode);if(i.allowed)r.push(' switchport trunk allowed vlan '+vlist(i.allowed));if(i.native!==1)r.push(' switchport trunk native vlan '+i.native);if(i.lag!=null)r.push(' channel-group '+i.lag+' mode '+i.lagMode);if(!i.up)r.push(' shutdown')}r.push('!')}
 r.push('interface Vlan1',' no ip address','!');for(const v of Object.keys(d.svi)){const s=d.svi[v];r.push('interface Vlan'+v,s.ip?' ip address '+s.ip+' '+l2m(s.len):' no ip address');if(!s.up)r.push(' shutdown');r.push('!')}
 if(d.gw)r.push('ip default-gateway '+d.gw,'!');r.push('end');return r}
/* ===== STP compartido ===== */
export function stpShow(d,env){const r=[];const vs=Object.keys(d.vlans).map(Number).filter(v=>v!==1&&v<999).concat([]).slice(0,4);const all=env.devs;
 if(d.v==='aruba'&&d.stp.mode==='off')return[U('[tutor] Spanning Tree está apagado en este switch. Se enciende con: spanning-tree (en configuración).')];
 for(const v of(vs.length?vs:[1])){const ps=all.map(x=>({x,p:prioOf(x,v)+(x.v==='cisco'?v:0),mac:MAC[x.name]})).sort((a,b)=>a.p-b.p||(a.mac<b.mac?-1:1));const root=ps[0],me=ps.find(p=>p.x===d);
  if(d.v==='cisco')r.push('','VLAN'+String(v).padStart(4,'0'),'  Spanning tree enabled protocol '+(d.stp.mode==='rapid-pvst'?'rstp':'ieee'),'  Root ID    Priority    '+root.p,'             Address     '+root.mac,root.x===d?'             This bridge is the root':'             Cost        2',' ','  Bridge ID  Priority    '+me.p+'  (priority '+(me.p-v)+' sys-id-ext '+v+')','             Address     '+me.mac);
  else if(d.v==='aruba')r.push('','VLAN '+v,'Root ID    Priority   : '+root.p,'           MAC-Address: '+root.mac,root.x===d?'           This bridge is the root':'           Root Port  : uplink','Bridge ID  Priority   : '+me.p,'           MAC-Address: '+me.mac);
  else{r.push('','STP bridge parameters','Routing instance name               : GLOBAL','  Root ID                           : '+(root.p/1024|0)+'K.'+root.mac.replace(/\./g,'').replace(/(..)(?=.)/g,'$1:'),'  Local bridge ID                   : '+(me.p/1024|0)+'K.'+me.mac.replace(/\./g,'').replace(/(..)(?=.)/g,'$1:'),root.x===d?'  This bridge is the root':'  Root port                         : xe-0/1/0');break}}
 return r}
export const MAC={CORE:'0c9d.92a1.3c00',ACC1:'0c9d.92a1.5e00',ACC2:'0018.b9f0.1a00'};
/* ===== Aruba AOS-CX ===== */
function aruba(d,line,env,out){let tk=toks(line),a;
 if(a=mt(tk,'show **'))return aShow(d,a[1],env,out);
 if(mt(tk,'write memory')||mt(tk,'write mem')||mt(tk,'copy running-config startup-config')){out.push('Copying configuration: [Success]');d.saved=true;return}
 if(d.mode==='priv'){if(mt(tk,'configure terminal')||mt(tk,'configure')||mt(tk,'conf')){return d.mode='conf'}if(mt(tk,'exit'))return;if(mt(tk,'enable'))return out.push(U('[tutor] En Aruba AOS-CX ya entras con privilegios (#). Sigue con configure terminal.'));return bad(out,line)}
 if(mt(tk,'end')){d.mode='priv';d.ctx=null;return}if(mt(tk,'exit')){d.mode=d.mode==='conf'?'priv':'conf';d.ctx=null;return}
 if(d.mode==='vlan'&&(a=mt(tk,'name *'))){d.vlans[d.ctx]=a[1];dirty(d);return}
 if(d.mode==='if'&&aIf(d,tk,out,env))return;
 if(a=mt(tk,'hostname *')){d.host=a[1];dirty(d);d.mode='conf';return}
 if(a=mt(tk,'vlan *')){const l=plist(a[1]);if(!l)return bad(out,line);l.forEach(v=>{if(!d.vlans[v])d.vlans[v]='VLAN'+v});d.mode='vlan';d.ctx=l[0];dirty(d);return}
 if(a=mt(tk,'no vlan *')){(plist(a[2])||[]).forEach(v=>{if(v!==1)delete d.vlans[v]});dirty(d);return}
 if(a=mt(tk,'interface **')){const s=a[1].replace(/\s+/g,'');let L;const m=/^1\/1\/(\d+)-1\/1\/(\d+)$/.exec(s);if(m){L=[];for(let n=+m[1];n<=+m[2];n++)L.push(pif('aruba','1/1/'+n))}else{const g=pif('aruba',s);L=g?[g]:null}
  if(!L||L.some(x=>!x)){out.push(E('Invalid input: '+a[1]),U('[tutor] Los puertos de Aruba se escriben 1/1/N (1 a 24 cobre, 25 a 28 SFP); también lag N y vlan N.'));return}
  if(/^Po/.test(L[0]))LG(d,+L[0].slice(2));if(/^Vl/.test(L[0])){const v=+L[0].slice(2);if(!d.vlans[v]){out.push(E('VLAN '+v+' does not exist.'),U('[tutor] Primero crea la VLAN con vlan '+v+'.'));return}d.svi[v]=d.svi[v]||{ip:null,len:null,up:true}}d.ctx=L;d.mode='if';return}
 if(a=mt(tk,'ip route * *')){if(a[2]!=='0.0.0.0/0'||!ipok(a[3]))return bad(out,line);d.gw=a[3];dirty(d);d.mode='conf';return}
 if(mt(tk,'spanning-tree')){d.stp.mode='mstp';dirty(d);d.mode='conf';return}
 if(a=mt(tk,'spanning-tree mode *')){d.stp.mode=/^r/.test(a[2])?'rpvst':'mstp';dirty(d);return}
 if(a=mt(tk,'spanning-tree priority *')){const p=+a[2];if(!(p>=0&&p<=15)){out.push(E('Invalid input: '+a[2]),U('[tutor] En Aruba la prioridad va de 0 a 15 y se multiplica por 4096: priority 1 = 4096.'));return}d.stp.prio.all=p*4096;if(d.stp.mode==='off')d.stp.mode='mstp';dirty(d);d.mode='conf';return}
 if(a=mt(tk,'spanning-tree vlan * priority *')){const l=plist(a[2]),p=+a[4];if(!l||!(p>=0&&p<=15))return bad(out,line);l.forEach(v=>d.stp.prio[v]=p*4096);dirty(d);return}
 return bad(out,line)}
function aIf(d,tk,out,env){let a;const C=d.ctx,isV=/^Vl/.test(C[0]);const each=f=>{C.forEach(g=>f(/^Po/.test(g)?LG(d,+g.slice(2)):IF(d,g)));dirty(d);return 1};
 if(isV){const s=d.svi[+C[0].slice(2)];if(a=mt(tk,'ip address *')){const m=/^([\d.]+)\/(\d+)$/.exec(a[2]);if(!m||!ipok(m[1])||+m[2]>32){out.push(E('Invalid input: '+a[2]),U('[tutor] En Aruba la IP va con prefijo: ip address 192.168.99.11/24'));return 1}s.ip=m[1];s.len=+m[2];dirty(d);return 1}if(mt(tk,'no shutdown')){s.up=true;return 1}if(mt(tk,'shutdown')){s.up=false;dirty(d);return 1}return 0}
 if(mt(tk,'no shutdown'))return each(i=>i.up=true);if(mt(tk,'shutdown'))return each(i=>i.up=false);
 if(mt(tk,'no routing')||mt(tk,'routing'))return 1;
 if(a=mt(tk,'vlan access *')){const v=+a[2];if(!d.vlans[v]){out.push(E('VLAN '+v+' does not exist.'),U('[tutor] En Aruba primero se crea la VLAN (vlan '+v+') y luego se asigna.'));return 1}return each(i=>{i.mode='access';i.access=v})}
 if(a=mt(tk,'vlan trunk native *')){const v=+a[3];if(!d.vlans[v]){out.push(E('VLAN '+v+' does not exist.'),U('[tutor] Crea la VLAN '+v+' antes de usarla como nativa.'));return 1}return each(i=>{i.mode='trunk';i.native=v})}
 if(a=mt(tk,'vlan trunk allowed *')){if(/^all$/i.test(a[3]))return each(i=>{i.mode='trunk';i.allowed=null});const l=plist(a[3]);if(!l){out.push(E('Invalid input: '+a[3]));return 1}const miss=l.filter(v=>!d.vlans[v]);if(miss.length){out.push(E('VLAN '+miss[0]+' does not exist.'));return 1}return each(i=>{i.mode='trunk';i.allowed=[...new Set((i.allowed||[]).concat(l))]})}
 if(a=mt(tk,'description **'))return each(i=>i.desc=a[1]);
 if(a=mt(tk,'lag *')){if(C.some(g=>!/^Gi|^Te/.test(g)))return 0;const n=+a[1];if(!d.lags[n]){out.push(E('LAG '+n+' does not exist.'),U('[tutor] Crea primero la interfaz: interface lag '+n+'.'));return 1}return each(i=>i.lag=n)}
 if(mt(tk,'no lag'))return each(i=>i.lag=null);
 if(a=mt(tk,'lacp mode *')){if(!/^Po/.test(C[0]))return 0;const m=['active','passive'].find(x=>x.startsWith(a[2].toLowerCase()));if(!m)return 0;return each(L=>L.lacp=m)}
 return 0}
function aShow(d,what,env,out){const w=what.toLowerCase().split(/\s+/),k=(...p)=>p.every((x,i)=>w[i]&&x.startsWith(w[i]))&&w.length===p.length;
 if(k('running-config')){out.push('Current configuration:','!','hostname '+d.host);if(d.stp.mode!=='off'){out.push('spanning-tree');if(d.stp.prio.all!=null)out.push('spanning-tree priority '+d.stp.prio.all/4096)}
  for(const v of Object.keys(d.vlans))out.push('vlan '+v,'    name '+d.vlans[v]);for(const n of Object.keys(d.lags)){const L=d.lags[n];out.push('interface lag '+n,L.up?'    no shutdown':'    shutdown');if(L.lacp)out.push('    lacp mode '+L.lacp);aVl(L,out)}
  for(const g of ALLG){const i=d.ifs[g];if(!i)continue;out.push('interface '+pn('aruba',g));if(i.desc)out.push('    description '+i.desc);out.push(i.up?'    no shutdown':'    shutdown');if(i.lag!=null)out.push('    lag '+i.lag);else aVl(i,out)}
  for(const v of Object.keys(d.svi)){const s=d.svi[v];out.push('interface vlan '+v);if(s.ip)out.push('    ip address '+s.ip+'/'+s.len)}if(d.gw)out.push('ip route 0.0.0.0/0 '+d.gw);return}
 if(k('vlan')){d.ran.vlan=1;out.push('','--------------------------------------------------------------------------------','VLAN  Name                              Status  Reason          Type      Interfaces','--------------------------------------------------------------------------------');for(const v of Object.keys(d.vlans).map(Number).sort((a,b)=>a-b)){const ps=ALLG.filter(g=>{const e=eff(d,g);return d.ifs[g]&&(e.mode==='trunk'?(!e.allowed||e.allowed.includes(v)):e.access===v)}).map(g=>pn('aruba',g)).concat(Object.keys(d.lags).filter(n=>{const L=d.lags[n];return L.mode==='trunk'&&(!L.allowed||L.allowed.includes(v))}).map(n=>'lag'+n));out.push(String(v).padEnd(6)+d.vlans[v].slice(0,32).padEnd(34)+'up      ok              static    '+(ps.join(',')||'-'))}return}
 if(k('interface','brief')){d.ran.ifs=1;out.push('--------------------------------------------------------------------------------------------------','Port       Native  Mode   Type           Enabled Status  Reason                  Speed','           VLAN                                                                    (Mb/s)','--------------------------------------------------------------------------------------------------');
  for(const g of ALLG){const i=RI(d,g),e=eff(d,g),u=i.up&&env.cabled(d.name,g);out.push(pn('aruba',g).padEnd(11)+String(e.mode==='trunk'?e.native:e.access).padEnd(8)+(e.mode||'access').padEnd(7)+(g[0]==='T'?'SFP+DA10':'1GbT').padEnd(15)+(i.up?'yes':'no').padEnd(8)+(u?'up':'down').padEnd(8)+(!i.up?'Administratively down':u?'':'Waiting for link').padEnd(24)+(u?(g[0]==='T'?'10000':'1000'):'--'))}
  for(const n of Object.keys(d.lags)){const L=d.lags[n],u=ALLG.some(g=>lagOf(d,g)==+n&&lagUpPair(d,g,env));out.push(('lag'+n).padEnd(11)+String(L.mode==='trunk'?L.native:L.access).padEnd(8)+(L.mode||'access').padEnd(7)+'--'.padEnd(15)+(L.up?'yes':'no').padEnd(8)+(u?'up':'down').padEnd(8)+(L.up?'':'Administratively down'))}return}
 if(k('lacp','interfaces')||k('lacp','aggregates')){d.ran.lacp=1;const mem=ALLG.filter(g=>lagOf(d,g)!=null);out.push('','State abbreviations :','A - Active        P - Passive      F - Aggregable I - Individual','S - Short-timeout L - Long-timeout N - InSync     O - OutofSync','C - Collecting    D - Distributing','','Intf       Aggr       Port  State','           Name       Id','-----------------------------------');mem.forEach(g=>{const m=lagMode(d,g),u=lagUpPair(d,g,env);out.push(pn('aruba',g).padEnd(11)+('lag'+lagOf(d,g)).padEnd(11)+String(ALLG.indexOf(g)+1).padEnd(6)+(m==='on'?'static':(m==='active'?'A':'P')+'L'+(u?'FNCD':'IO')))});if(!mem.length)out.push('(sin puertos en LAG)');return}
 if(k('spanning-tree')){d.ran.stp=1;return out.push(...stpShow(d,env))}
 if(k('ip','interface','brief')){d.ran.ip=1;out.push('Interface       IP Address          Interface Status','                                    link/admin');Object.keys(d.svi).forEach(v=>{const s=d.svi[v];out.push(('vlan'+v).padEnd(16)+(s.ip?s.ip+'/'+s.len:'No Address').padEnd(20)+(s.up?'up/up':'down/down'))});return}
 out.push(E('Invalid input: '+what),U('[tutor] Prueba: show running-config, show vlan, show interface brief, show lacp interfaces, show spanning-tree.'))}
function aVl(i,out){if(i.mode==='trunk'){out.push('    vlan trunk native '+i.native,'    vlan trunk allowed '+(i.allowed?vlist(i.allowed):'all'))}else if(i.mode==='access')out.push('    vlan access '+i.access)}
/* ===== Juniper Junos ===== */
function jn(d,v){return d.vlans[v]}
function junos(d,line,env,out){let tk=toks(line.replace(/\[|\]/g,m=>' '+m+' ')),a;
 if(d.mode==='op'){if(mt(tk,'configure')||mt(tk,'edit')){d.cand=clone(pick(d));d.mode='cfg';out.push('Entering configuration mode','',{t:'[edit]',c:'dim'});return}if(a=mt(tk,'show **'))return jShow(d,a[1],env,out,d);if(mt(tk,'exit|quit'))return;
  if(tk[0]&&/^set|^delete|^commit/.test(tk[0])){out.push(E('unknown command.'),U('[tutor] set, delete y commit se usan en modo configuración: escribe configure.'));return}return out.push(E('unknown command.'))}
 if(a=mt(tk,'run show **'))return jShow(d,a[2],env,out,d);
 if(mt(tk,'show')||mt(tk,'show | compare')||mt(tk,'show configuration')){return jConf(d.cand,out)}
 if(mt(tk,'commit')||mt(tk,'commit check')||mt(tk,'commit and-quit')||mt(tk,'commit confirmed')){const err=jCheck(d.cand);if(err.length){out.push(...err.map(E),E('error: configuration check-out failed'));return}if(/check/.test(line)){out.push('configuration check succeeds');return}Object.assign(d,clone(d.cand));d.cand=clone(pick(d));d.saved=true;out.push('commit complete');if(/and-quit/.test(line)){d.mode='op';d.cand=null;out.push('Exiting configuration mode')}return}
 if(mt(tk,'exit')||mt(tk,'quit')||mt(tk,'exit configuration-mode')){if(JSON.stringify(d.cand)!==JSON.stringify(pick(d)))out.push(U('[tutor] Ojo: hay cambios sin commit. En Junos no se aplican hasta que escribes commit.'));d.mode='op';out.push('Exiting configuration mode');return}
 if(mt(tk,'rollback')||mt(tk,'rollback 0')){d.cand=clone(pick(d));out.push('load complete');return}
 if(tk[0]==='set'){const r=jSet(d,d.cand,tk.slice(1));if(r){out.push(E(r));return}d.saved=false;out.push({t:'[edit]',c:'dim'});return}
 if(tk[0]==='delete'){const r=jDel(d.cand,tk.slice(1));if(r)out.push(E(r));else{d.saved=false;out.push({t:'[edit]',c:'dim'})}return}
 out.push(E('unknown command.'),U('[tutor] En modo configuración usa set …, delete …, commit o run show ….'))}
const pick=d=>{const o={};CORE_F.forEach(k=>o[k]=d[k]);return o};
function jSet(d,c,t){const s=t.join(' ');let m;
 if(m=/^system host-name (\S+)$/.exec(s)){c.host=m[1];return}
 if(m=/^vlans (\S+) vlan-id (\d+)$/.exec(s)){const v=+m[2];if(!(v>=1&&v<=4094))return'syntax error.';for(const k of Object.keys(c.vlans))if(c.vlans[k]===m[1]&&+k!==v&&k!=='1')delete c.vlans[k];c.vlans[v]=m[1];return}
 if(m=/^vlans (\S+) l3-interface irb\.(\d+)$/.exec(s)){c.l3=c.l3||{};c.l3[m[1]]=+m[2];return}
 if(m=/^interfaces (\S+) unit 0 family ethernet-switching interface-mode (access|trunk)$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error, expecting <interface-name>.';const i=/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g);i.mode=m[2];if(!/^Po/.test(g))i.fam=true;return}
 if(m=/^interfaces (\S+) unit 0 family ethernet-switching vlan members (.+)$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error, expecting <interface-name>.';const names=m[2].replace(/[\[\]]/g,' ').trim().split(/\s+/);const i=/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g);if(!/^Po/.test(g))i.fam=true;i.mem=[...new Set((i.mem||[]).concat(names))];return}
 if(m=/^interfaces (\S+) native-vlan-id (\d+)$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';const i=/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g);i.native=+m[2];return}
 if(m=/^interfaces (\S+) description (.+)$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';(/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g)).desc=m[2];return}
 if(m=/^interfaces (\S+) disable$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';(/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g)).up=false;return}
 if(m=/^interfaces (\S+) ether-options 802\.3ad ae(\d+)$/.exec(s)){const g=pif('juniper',m[1]);if(!g||/^Po/.test(g))return'syntax error.';IF(c,g).lag=+m[2];LG(c,+m[2]);return}
 if(m=/^interfaces ae(\d+) aggregated-ether-options lacp (active|passive)$/.exec(s)){LG(c,+m[1]).lacp=m[2];return}
 if(m=/^interfaces irb unit (\d+) family inet address ([\d.]+)\/(\d+)$/.exec(s)){if(!ipok(m[2])||+m[3]>32)return'syntax error.';c.svi[+m[1]]={ip:m[2],len:+m[3],up:true};return}
 if(m=/^routing-options static route 0\.0\.0\.0\/0 next-hop ([\d.]+)$/.exec(s)){if(!ipok(m[1]))return'syntax error.';c.gw=m[1];return}
 if(m=/^protocols rstp bridge-priority (\d+)(k?)$/.exec(s)){const p=+m[1]*(m[2]?1024:1);if(p%4096||p>61440)return'error: bridge-priority must be a multiple of 4k (0 - 60k)';c.stp.prio.all=p;return}
 if(/^protocols rstp( interface \S+)?$/.test(s)){c.stp.mode='rstp';return}
 if(m=/^chassis aggregated-devices ethernet device-count (\d+)$/.exec(s)){c.aecount=+m[1];return}
 return'syntax error.'}
function jDel(c,t){const s=t.join(' ');let m;
 if(m=/^interfaces (\S+) unit 0$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';const i=/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g);i.mode=null;i.mem=null;i.fam=false;i.native=1;return}
 if(m=/^interfaces (\S+) disable$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';(/^Po/.test(g)?LG(c,+g.slice(2)):IF(c,g)).up=true;return}
 if(m=/^interfaces (\S+) ether-options$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';IF(c,g).lag=null;return}
 if(m=/^interfaces (\S+)$/.exec(s)){const g=pif('juniper',m[1]);if(!g)return'syntax error.';if(/^Po/.test(g))delete c.lags[+g.slice(2)];else delete c.ifs[g];return}
 if(m=/^vlans (\S+)$/.exec(s)){for(const k of Object.keys(c.vlans))if(c.vlans[k]===m[1]&&k!=='1')delete c.vlans[k];return}
 return'warning: statement not found'}
// resuelve vlan members (nombres o números) a ids; devuelve errores de commit
function jCheck(c){const err=[];const byName=n=>{if(/^\d+$/.test(n))return +n;const k=Object.keys(c.vlans).find(k=>c.vlans[k]===n);return k!=null?+k:null};
 const fix=(i,where)=>{if(!i.mem)return;const ids=i.mem.map(byName);const bad=i.mem.filter((n,j)=>ids[j]==null||!c.vlans[ids[j]]);if(bad.length){err.push(`[edit interfaces ${where} unit 0 family ethernet-switching]`,`  'vlan members ${bad[0]}'`,`    VLAN ${bad[0]} no existe: créala con set vlans ${bad[0]} vlan-id <id>`);return}
  if(i.mode==='trunk')i.allowed=ids;else{i.mode=i.mode||'access';i.access=ids[0]}};
 for(const g of Object.keys(c.ifs)){const i=c.ifs[g];if(i.lag!=null&&i.fam){err.push(`[edit interfaces ${pn('juniper',g)}]`,`  '${pn('juniper',g)}' is a member of ae${i.lag}: remove 'unit 0' (delete interfaces ${pn('juniper',g)} unit 0)`,'    Aggregated member interfaces cannot have logical units')}fix(i,pn('juniper',g))}
 for(const n of Object.keys(c.lags))fix(c.lags[n],'ae'+n);return err}
function jConf(c,out){out.push(...jCfgLines(c))}
function jCfgLines(c){const r=[];r.push('system {','    host-name '+c.host+';','}');if(c.aecount)r.push('chassis {','    aggregated-devices {','        ethernet {','            device-count '+c.aecount+';','        }','    }','}');
 r.push('interfaces {');const ifb=(name,i,isL)=>{r.push('    '+name+' {');if(i.desc)r.push('        description "'+i.desc+'";');if(!i.up)r.push('        disable;');if(i.lag!=null&&!isL)r.push('        ether-options {','            802.3ad ae'+i.lag+';','        }');if(isL&&i.lacp)r.push('        aggregated-ether-options {','            lacp {','                '+i.lacp+';','            }','        }');if(i.native!==1)r.push('        native-vlan-id '+i.native+';');if(i.mode||i.mem)r.push('        unit 0 {','            family ethernet-switching {',...(i.mode?['                interface-mode '+i.mode+';']:[]),...(i.mem?['                vlan {','                    members '+(i.mem.length>1?'[ '+i.mem.join(' ')+' ]':i.mem[0])+';','                }']:[]),'            }','        }');r.push('    }')};
 for(const g of ALLG)if(c.ifs[g])ifb(pn('juniper',g),c.ifs[g]);for(const n of Object.keys(c.lags))ifb('ae'+n,c.lags[n],true);
 if(Object.keys(c.svi).length){r.push('    irb {');for(const v of Object.keys(c.svi))r.push('        unit '+v+' {','            family inet {','                address '+c.svi[v].ip+'/'+c.svi[v].len+';','            }','        }');r.push('    }')}r.push('}');
 if(c.stp.prio.all!=null)r.push('protocols {','    rstp {','        bridge-priority '+(c.stp.prio.all/1024)+'k;','    }','}');if(c.gw)r.push('routing-options {','    static {','        route 0.0.0.0/0 next-hop '+c.gw+';','    }','}');
 r.push('vlans {');for(const v of Object.keys(c.vlans))if(v!=='1'){r.push('    '+c.vlans[v]+' {','        vlan-id '+v+';');const l3=c.l3&&c.l3[c.vlans[v]];if(l3!=null)r.push('        l3-interface irb.'+l3+';');r.push('    }')}r.push('}');return r}
function jShow(d,what,env,out){const w=what.toLowerCase().split(/\s+/),k=(...p)=>p.every((x,i)=>w[i]&&x.startsWith(w[i]))&&w.length===p.length;
 if(k('configuration'))return out.push(...jCfgLines(d));
 if(k('interfaces','terse')){d.ran.ifs=1;out.push('Interface               Admin Link Proto    Local                 Remote');for(const g of ALLG){const i=RI(d,g),u=i.up&&env.cabled(d.name,g);out.push(pn('juniper',g).padEnd(24)+(i.up?'up':'down').padEnd(6)+(u?'up':'down'));if(i.lag!=null)out.push((pn('juniper',g)+'.0').padEnd(24)+(i.up?'up':'down').padEnd(6)+(u?'up':'down').padEnd(5)+'aenet    --> ae'+i.lag);else if(d.ifs[g]&&d.ifs[g].mode)out.push((pn('juniper',g)+'.0').padEnd(24)+(i.up?'up':'down').padEnd(6)+(u?'up':'down').padEnd(5)+'eth-switch')}
  for(const n of Object.keys(d.lags))if(lagExists(d,+n)){const u=ALLG.some(g=>lagOf(d,g)==+n&&lagUpPair(d,g,env));out.push(('ae'+n).padEnd(24)+'up    '+(u?'up':'down'))}
  for(const v of Object.keys(d.svi))out.push(('irb.'+v).padEnd(24)+'up    up   inet     '+d.svi[v].ip+'/'+d.svi[v].len);return}
 if(k('vlans')){d.ran.vlan=1;out.push('','Routing instance        VLAN name             Tag          Interfaces');for(const v of Object.keys(d.vlans).map(Number).sort((a,b)=>a-b)){const ps=ALLG.filter(g=>{const e=eff(d,g);return d.ifs[g]&&e.mode&&(e.mode==='trunk'?(e.allowed||[]).includes(v):e.access===v)&&RI(d,g).lag==null}).map(g=>pn('juniper',g)+'.0').concat(Object.keys(d.lags).filter(n=>{const L=d.lags[n];return L.mode==='trunk'&&(L.allowed||[]).includes(v)}).map(n=>'ae'+n+'.0'));out.push('default-switch'.padEnd(24)+d.vlans[v].padEnd(22)+String(v).padEnd(13)+(ps.join(', ')||''))}return}
 if(k('lacp','interfaces')){d.ran.lacp=1;const mem=ALLG.filter(g=>lagOf(d,g)!=null);if(!mem.length)return out.push('(no hay interfaces agregadas con LACP)');for(const n of new Set(mem.map(g=>lagOf(d,g)))){if(!lagExists(d,n)){out.push('warning: lacp subsystem not running - not needed by configuration.');continue}out.push('Aggregated interface: ae'+n,'    LACP state:       Role   Exp   Def  Dist  Col  Syn  Aggr  Timeout  Activity');mem.filter(g=>lagOf(d,g)===n).forEach(g=>{const u=lagUpPair(d,g,env),m=lagMode(d,g);out.push('      '+pn('juniper',g).padEnd(15)+' Actor    No    No   '+(u?'Yes   Yes  Yes  ':'No    No   No   ')+' Yes     Fast    '+(m==='active'?'Active':m==='passive'?'Passive':'--'))})}return}
 if(k('spanning-tree','bridge')){d.ran.stp=1;return out.push(...stpShow(d,env))}
 out.push(E('syntax error, expecting <command>.'),U('[tutor] Prueba: show interfaces terse, show vlans, show configuration, show lacp interfaces, show spanning-tree bridge.'))}
// ---------- utilidades para metas ----------
export const G={
 access:(d,g,v)=>{const i=d.ifs[g];return!!i&&i.lag==null&&i.mode!=='trunk'&&(i.access===v)&&i.up},
 trunk:(d,g,vs,nat)=>{const i=d.ifs[g];return!!i&&i.mode==='trunk'&&!!i.allowed&&vs.every(v=>i.allowed.includes(v))&&(nat==null||i.native===nat)&&i.up},
 vlan:(d,v,n)=>!!d.vlans[v]&&(!n||d.vlans[v].toUpperCase()===n),
 svi:(d,v,ip,len)=>{const s=d.svi[v];return!!s&&s.ip===ip&&s.len===len&&s.up&&(d.v!=='juniper'||(d.l3&&d.l3[d.vlans[v]]===v))},
 lag:(d,gs)=>{const n=lagOf(d,gs[0]);if(n==null||!gs.every(g=>lagOf(d,g)===n&&d.ifs[g].up))return null;if(!lagExists(d,n))return null;const m=lagMode(d,gs[0]);return m==='active'||m==='passive'?n:null},
 lagTrunk:(d,gs,vs)=>{const n=lagOf(d,gs[0]);const L=n!=null&&lagExists(d,n)&&d.lags[n];return!!L&&L.mode==='trunk'&&!!L.allowed&&vs.every(v=>L.allowed.includes(v))&&L.up}};
