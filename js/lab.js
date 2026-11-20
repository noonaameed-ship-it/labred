/* LabRed: simulador de consola (Cisco IOS, Aruba AOS-CX, Juniper Junos) y vista 3D */
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
const mkPC=(name,ip,peer)=>{const p={type:'pc',name,ip,peer,lines:[],hist:[],hp:0};tut(p,`${name} · ${ip}/24 · comandos: ping, ipconfig, cls`);return p};
let S1,S2,PCA,PCB,devs,cur,done=false,busy=false;
let SC={vid:10,name:'VENTAS',exam:false};
const NET=()=>'192.168.'+SC.vid+'.';
const LS={err:0,hints:new Set(),fails:0,t0:Date.now(),paste:0};window.LAB_STATS=LS;
const labScore=()=>Math.max(0,100-Math.min(20,LS.err)-10*LS.hints.size-5*LS.fails);window.LAB_SCORE=labScore;
function reset(){S1=mkSwitch('SW1',$('#v1').value);S2=mkSwitch('SW2',$('#v2').value);PCA=mkPC('PC-A',NET()+'11',NET()+'12');PCB=mkPC('PC-B',NET()+'12',NET()+'11');devs=[S1,S2,PCA,PCB];done=false;LS.err=0;LS.hints=new Set();LS.fails=0;LS.t0=Date.now();LS.paste=0;$('#done').classList.remove('show');select(cur?devs.find(d=>d.name===cur.name):S1)}
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
    if(!c.es){ifs[n]={up,mode:'access',access:1,allowed:[]};continue}
    const mode=c.mode||'access';const m=(c.members||[]).map(x=>/^\d+$/.test(x)?+x:x==='all'?'all':ids[x]).filter(x=>x!==undefined);
    ifs[n]={up,mode,access:mode==='access'?(m[0]||1):1,allowed:m.includes('all')?'all':m.filter(x=>x!=='all')}}
  return{vlans:vl,ifs};
}
function linkUp(sw,n){const v=VEND[sw.vendor];if(!eff(sw).ifs[n]?.up)return false;if(n===v.pc)return true;if(n===v.up){const o=other(sw);return !!eff(o).ifs[VEND[o.vendor].up].up}return false}
function checks(){
  const r=[];
  for(const sw of[S1,S2]){const e=eff(sw),v=VEND[sw.vendor],p=e.ifs[v.pc],u=e.ifs[v.up];
    const V=SC.vid;r.push({sw,k:'vlan',t:`VLAN ${V} creada con nombre ${SC.name}`,ok:!!e.vlans[V]&&e.vlans[V].toUpperCase()===SC.name});
    r.push({sw,k:'pc',t:`${v.pcS} hacia la PC: acceso, VLAN ${V}, encendido`,ok:p.up&&p.mode==='access'&&p.access===V&&!!e.vlans[V]});
    r.push({sw,k:'up',t:`${v.upS} hacia el otro switch: trunk que permite la VLAN ${V}`,ok:u.up&&u.mode==='trunk'&&allows(u,V)&&!!e.vlans[V]})}
  return r;
}
const allOk=()=>checks().every(c=>c.ok)&&linkUp(S1,VEND[S1.vendor].up);
const HINT={
  cisco:{vlan:'enable\nconfigure terminal\nvlan 10\n name VENTAS',pc:'interface g0/1\n switchport mode access\n switchport access vlan 10',up:'interface g0/24\n switchport mode trunk'},
  aruba:{vlan:'configure terminal\nvlan 10\n name VENTAS',pc:'interface 1/1/1\n no shutdown\n vlan access 10',up:'interface 1/1/24\n no shutdown\n vlan trunk allowed 10'},
  juniper:{vlan:'configure\nset vlans VENTAS vlan-id 10\ncommit',pc:'set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access\nset interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members VENTAS\ncommit',up:'set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk\nset interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members VENTAS\ncommit'}
};

/* ---------- command tables (Cisco / Aruba) ---------- */
const TY={vid:s=>/^\d+$/.test(s)&&+s>=1&&+s<=4094,word:s=>s.length>0,vlist:s=>!!parseList(s),if:(s,v)=>!!normIf(v,s)};
const linkMsg=(n,up)=>up?[`%LINK-3-UPDOWN: Interface ${n}, changed state to up`,`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${n}, changed state to up`]:[`%LINK-5-CHANGED: Interface ${n}, changed state to administratively down`];
const cIf=sw=>sw.ifs[sw.ctx.if];
const C_SHOW=[['show vlan brief',sw=>cShowVlan(sw)],['show vlan',sw=>cShowVlan(sw)],['show interfaces trunk',sw=>cShowTrunk(sw)],['show interfaces status',sw=>cShowStatus(sw)],['show running-config',sw=>cRun(sw)]];
const CIS={
  user:[['enable',sw=>{sw.mode='priv'}],['exit',()=>{}],...C_SHOW],
  priv:[['configure terminal',sw=>{sw.mode='config';return['Enter configuration commands, one per line.  End with CNTL/Z.']}],['disable',sw=>{sw.mode='user'}],['write',()=>['Building configuration...','[OK]']],['write memory',()=>['Building configuration...','[OK]']],['copy running-config startup-config',()=>['Destination filename [startup-config]? ','Building configuration...','[OK]']],['exit',sw=>{sw.mode='user'}],...C_SHOW],
  config:[['vlan <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])sw.vlans[id]='VLAN'+String(id).padStart(4,'0');sw.ctx.vlan=id;sw.mode='config-vlan'}],
    ['no vlan <vid>',(sw,[id])=>{id=+id;if(id===1)return['%Default VLAN 1 may not be deleted.'];delete sw.vlans[id]}],
    ['interface <if>',(sw,[i])=>{sw.ctx.if=normIf('cisco',i);sw.mode='config-if'}],
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
    ['no shutdown',sw=>{const i=cIf(sw);if(!i.up){i.up=true;if(linkUp(sw,sw.ctx.if))return linkMsg(sw.ctx.if,true)}}],
    ['description <rest>',(sw,[d])=>{cIf(sw).desc=d}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]]
};
const A_SHOW=[['show vlan',sw=>aShowVlan(sw)],['show interface brief',sw=>aShowBrief(sw)],['show running-config',sw=>aRun(sw)]];
const ARU={
  priv:[['configure terminal',sw=>{sw.mode='config'}],['write memory',()=>['Copying configuration: [Success]']],['exit',()=>{}],...A_SHOW],
  config:[['vlan <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])sw.vlans[id]='VLAN'+id;sw.ctx.vlan=id;sw.mode='config-vlan'}],
    ['no vlan <vid>',(sw,[id])=>{id=+id;if(id===1)return['VLAN 1 no se puede borrar.'];delete sw.vlans[id]}],
    ['interface <if>',(sw,[i])=>{sw.ctx.if=normIf('aruba',i);sw.mode='config-if'}],
    ['hostname <word>',(sw,[h])=>{sw.host=h}],['end',sw=>{sw.mode='priv'}],['exit',sw=>{sw.mode='priv'}],...A_SHOW],
  'config-vlan':[['name <word>',(sw,[n])=>{sw.vlans[sw.ctx.vlan]=n}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]],
  'config-if':[['no shutdown',sw=>{cIf(sw).up=true}],['shutdown',sw=>{cIf(sw).up=false}],
    ['vlan access <vid>',(sw,[id])=>{id=+id;if(!sw.vlans[id])return[{t:`[tutor] La VLAN ${id} no existe en este switch. Créala primero con "vlan ${id}".`,c:'tut'}];const i=cIf(sw);i.mode='access';i.access=id}],
    ['no vlan access',sw=>{cIf(sw).access=1}],
    ['vlan trunk allowed <vlist>',(sw,[l])=>{const i=cIf(sw);if(i.mode!=='trunk'){i.mode='trunk';i.allowed=[]}if(i.allowed!=='all')i.allowed=[...new Set(i.allowed.concat(parseList(l)))].sort((a,b)=>a-b)}],
    ['vlan trunk allowed all',sw=>{const i=cIf(sw);i.mode='trunk';i.allowed='all'}],
    ['no vlan trunk allowed <vlist>',(sw,[l])=>{const i=cIf(sw),rm=parseList(l);if(i.allowed!=='all')i.allowed=i.allowed.filter(x=>!rm.includes(x))}],
    ['vlan trunk native <vid>',(sw,[id])=>{const i=cIf(sw);if(i.mode!=='trunk'){i.mode='trunk';i.allowed=[]}i.native=+id}],
    ['no routing',()=>{}],['description <rest>',(sw,[d])=>{cIf(sw).desc=d}],['exit',sw=>{sw.mode='config'}],['end',sw=>{sw.mode='priv'}]]
};
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
function cShowTrunk(sw){const t=ports('cisco').filter(n=>sw.ifs[n].mode==='trunk'&&linkUp(sw,n));if(!t.length)return[];
  const al=i=>i.allowed==='all'?'1-4094':(rangeStr(i.allowed)||'none');const act=i=>rangeStr(Object.keys(sw.vlans).map(Number).filter(x=>x<1002&&allows(i,x)))||'none';
  return['','Port        Mode             Encapsulation  Status        Native vlan',...t.map(n=>shortIf(n).padEnd(12)+'on'.padEnd(17)+'802.1q'.padEnd(15)+'trunking'.padEnd(14)+sw.ifs[n].native),'','Port        Vlans allowed on trunk',...t.map(n=>shortIf(n).padEnd(12)+al(sw.ifs[n])),'','Port        Vlans allowed and active in management domain',...t.map(n=>shortIf(n).padEnd(12)+act(sw.ifs[n]))]}
function cShowStatus(sw){return['','Port      Name               Status       Vlan       Duplex  Speed Type',...ports('cisco').map(n=>{const i=sw.ifs[n],c=linkUp(sw,n);return shortIf(n).padEnd(10)+i.desc.slice(0,18).padEnd(19)+(!i.up?'disabled':c?'connected':'notconnect').padEnd(13)+(i.mode==='trunk'?'trunk':''+i.access).padEnd(11)+(c?'a-full':'auto').padEnd(8)+(c?'a-1000':'auto').padEnd(6)+'10/100/1000BaseTX'})]}
function cRun(sw){const r=['Building configuration...','','Current configuration : 1873 bytes','!','version 15.2','!','hostname '+sw.host,'!'];
  for(const id of Object.keys(sw.vlans).map(Number).sort((a,b)=>a-b))if(id!==1){r.push('vlan '+id);if(sw.vlans[id]!=='VLAN'+String(id).padStart(4,'0'))r.push(' name '+sw.vlans[id]);r.push('!')}
  for(const n of ports('cisco')){const i=sw.ifs[n];r.push('interface '+n);if(i.desc)r.push(' description '+i.desc);if(i.native!==1)r.push(' switchport trunk native vlan '+i.native);if(i.allowed!=='all')r.push(' switchport trunk allowed vlan '+(rangeStr(i.allowed)||'none'));if(i.access!==1)r.push(' switchport access vlan '+i.access);if(i.mode!=='dynamic')r.push(' switchport mode '+i.mode);if(!i.up)r.push(' shutdown');r.push('!')}
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
  return r}

/* ---------- Juniper ---------- */
const jPrompt=sw=>'admin@'+sw.host+(sw.mode==='op'?'> ':'# ');
function kw(t,opts){if(t===undefined)return undefined;t=t.toLowerCase();if(opts.includes(t))return t;const m=opts.filter(o=>o.startsWith(t));return m.length===1?m[0]:null}
function jPath(toks){
  const a=kw(toks[0],['vlans','interfaces']);if(a===undefined)return{inc:1};if(!a)return{err:0};
  if(a==='vlans'){const name=toks[1];if(!name)return{inc:1};if(toks.length===2)return{vlan:name};
    const b=kw(toks[2],['vlan-id','description']);if(!b)return{err:2};
    if(b==='description')return{vlan:name,desc:toks.slice(3).join(' ')};
    const id=toks[3];if(id===undefined)return{inc:1};if(!TY.vid(id))return{err:3,msg:'value is not within range (1..4094)'};if(toks.length>4)return{err:4};return{vlan:name,vid:+id}}
  const ifn=normIf('juniper',toks[1]||'');if(!toks[1])return{inc:1};if(!ifn)return{err:1,msg:`invalid interface type in '${toks[1]}'`};
  if(toks.length===2)return{if:ifn};
  const c=kw(toks[2],['unit','disable','description']);if(!c)return{err:2};
  if(c==='disable')return{if:ifn,disable:true};if(c==='description')return{if:ifn,desc:toks.slice(3).join(' ')};
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
function jSetLines(cfg){const o=[];for(const[n,v]of Object.entries(cfg.vlans)){if(v.id)o.push(`set vlans ${n} vlan-id ${v.id}`);else o.push(`set vlans ${n}`)}
  for(const n of ports('juniper')){const c=cfg.ifs[n];if(!c)continue;const b=`set interfaces ${n} unit 0 family ethernet-switching`;if(c.disable)o.push(`set interfaces ${n} disable`);if(c.desc)o.push(`set interfaces ${n} description "${c.desc}"`);
    if(c.es&&!c.mode&&!(c.members||[]).length)o.push(b);if(c.mode)o.push(b+' interface-mode '+c.mode);(c.members||[]).forEach(m=>o.push(b+' vlan members '+m))}return o}
function jTree(cfg,part){const o=[],I=n=>' '.repeat(n*4);
  if(part!=='vlans'){const ifl=ports('juniper').filter(n=>cfg.ifs[n]);if(ifl.length){o.push('interfaces {');for(const n of ifl){const c=cfg.ifs[n];o.push(I(1)+n+' {');if(c.desc)o.push(I(2)+`description "${c.desc}";`);if(c.disable)o.push(I(2)+'disable;');
    if(c.es){o.push(I(2)+'unit 0 {',I(3)+'family ethernet-switching {');if(c.mode)o.push(I(4)+'interface-mode '+c.mode+';');const m=c.members||[];if(m.length){o.push(I(4)+'vlan {',I(5)+'members '+(m.length>1?'[ '+m.join(' ')+' ]':m[0])+';',I(4)+'}')}o.push(I(3)+'}',I(2)+'}')}o.push(I(1)+'}')}o.push('}')}}
  if(part!=='interfaces'){o.push('vlans {');for(const[n,v]of Object.entries(cfg.vlans)){o.push(I(1)+n+' {');if(v.id)o.push(I(2)+'vlan-id '+v.id+';');o.push(I(1)+'}')}o.push('}')}
  return o}
function jCheck(cfg){const e=[];for(const n of ports('juniper')){const c=cfg.ifs[n];if(!c||!c.es)continue;const m=c.members||[];
    for(const x of m)if(x!=='all'&&!/^\d+$/.test(x)&&!cfg.vlans[x])e.push(`[edit interfaces ${n} unit 0 family ethernet-switching vlan members]`,`  'members ${x}'`,`    VLAN ${x} is not defined`);
    if((c.mode||'access')==='access'&&m.length>1)e.push(`[edit interfaces ${n} unit 0 family ethernet-switching]`,'  Access interface can have only one VLAN member');}
  for(const[n,v]of Object.entries(cfg.vlans))if(!v.id)e.push(`[edit vlans ${n}]`,"  'vlan-id' is required in this lab");
  return e}
function jShowVlans(sw){const a=sw.act,r=['','Routing instance        VLAN name             Tag          Interfaces'],e=eff(sw);
  for(const[n,v]of Object.entries(a.vlans).sort((x,y)=>x[0].localeCompare(y[0]))){r.push('default-switch'.padEnd(24)+n.padEnd(22)+String(v.id||'').padEnd(13));
    for(const p of ports('juniper')){const i=e.ifs[p];if((i.mode==='access'&&i.access===v.id)||(i.mode==='trunk'&&allows(i,v.id))){const cfgd=a.ifs[p]&&a.ifs[p].es;if(!cfgd&&v.id===1&&p!==VEND.juniper.pc&&p!==VEND.juniper.up)continue;r.push(' '.repeat(59)+p+'.0'+(linkUp(sw,p)?'*':''))}}}
  return r}
function jTerse(sw){return['Interface               Admin Link Proto    Local                 Remote',...ports('juniper').flatMap(p=>{const i=eff(sw).ifs[p],l=linkUp(sw,p)?'up':'down',ad=i.up?'up':'down';return[p.padEnd(24)+ad.padEnd(6)+l,(p+'.0').padEnd(24)+ad.padEnd(6)+l.padEnd(5)+'eth-switch']})]}
const J_OP=[['configure',sw=>{sw.mode='conf';return['Entering configuration mode','','[edit]']}],['show vlans',jShowVlans],['show configuration',sw=>jTree(sw.act)],['show interfaces terse',jTerse],['exit',()=>{}],['quit',()=>{}]];
function jOp(sw,line,echo){const toks=line.split(/\s+/);let best=null;
  for(const[p,h]of J_OP){const r=tryPat(p,toks,'juniper');if(r.args&&(!best||r.score>best.s))best={h,s:r.score}}
  if(best)return best.h(sw)||[];
  if(/^(set|delete|commit)\b/.test(line))return[{t:'                ^',c:'err'},{t:"unknown command.",c:'err'},{t:"[tutor] Ese comando es de modo configuración. Entra con 'configure'.",c:'tut'}];
  return[{t:' '.repeat(jPrompt(sw).length)+'^',c:'err'},{t:"unknown command.",c:'err'}]}
function jExec(sw,line){
  if(sw.mode==='op')return jOp(sw,line);
  const toks=line.split(/\s+/),v=kw(toks[0],['set','delete','commit','show','run','exit','quit','rollback','top','edit']);const ed=['','[edit]'];
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
    if(r.vlan){C.vlans[r.vlan]=C.vlans[r.vlan]||{};if(r.vid)C.vlans[r.vlan].id=r.vid}
    else{const c=C.ifs[r.if]=C.ifs[r.if]||{};if(r.disable)c.disable=true;if(r.desc)c.desc=r.desc.replace(/"/g,'');if(r.es||r.mode||r.members)c.es=true;if(r.mode)c.mode=r.mode;if(r.members)c.members=[...new Set((c.members||[]).concat(r.members))]}
  }else{
    if(r.vlan){if(r.vid)delete(C.vlans[r.vlan]||{}).id;else delete C.vlans[r.vlan]}
    else{const c=C.ifs[r.if];if(c){if(r.disable)delete c.disable;else if(r.mode)delete c.mode;else if(r.members)c.members=(c.members||[]).filter(x=>!r.members.includes(x));else if(r.es)delete C.ifs[r.if];else if(Object.keys(r).length===1)delete C.ifs[r.if]}}
  }
  return ed;
}

/* ---------- help & completion ---------- */
const DESC={enable:'Entrar a modo privilegiado',configure:'Entrar a modo de configuración',show:'Mostrar información',vlan:'VLAN',interface:'Seleccionar interfaz',interfaces:'Interfaces',switchport:'Configurar puerto de switch',name:'Nombre de la VLAN',shutdown:'Apagar la interfaz',no:'Negar un comando',exit:'Salir del modo actual',end:'Volver a modo privilegiado',do:'Ejecutar comando de modo privilegiado',mode:'Modo del puerto',access:'Access port (una VLAN)',trunk:'Trunk (varias VLAN con tag)',allowed:'VLANs permitidas',native:'VLAN nativa',add:'Agregar a la lista',remove:'Quitar de la lista',all:'Todas',none:'Ninguna',brief:'Resumen',status:'Estado de puertos','running-config':'Configuración activa',terminal:'Desde la terminal',hostname:'Nombre del equipo',description:'Descripción',write:'Guardar configuración',memory:'En memoria de arranque',copy:'Copiar archivos',disable:'Salir de modo privilegiado',encapsulation:'Encapsulación',dot1q:'IEEE 802.1Q',routing:'Ruteo en la interfaz','<vid>':'ID de VLAN (1-4094)','<if>':'Interfaz','<word>':'Texto','<vlist>':'Lista de VLANs, ej. 10,20-30','<rest>':'Texto o comando','startup-config':'Configuración de arranque'};
const J_HELP={op:[['configure','Entrar a modo configuración'],['show','Mostrar información (vlans, configuration, interfaces terse)'],['exit','Salir']],conf:[['set','Agregar configuración'],['delete','Borrar configuración'],['commit','Aplicar la configuración candidata'],['show','Ver configuración candidata ( | compare para ver cambios)'],['run','Ejecutar comando operacional'],['rollback','Descartar cambios sin commit'],['exit','Salir de modo configuración']]};
function helpList(sw,body){const endsSpace=body===''||/\s$/.test(body);const toks=body.trim()?prep(sw,body.trim()).split(/\s+/):[];const k=endsSpace?toks.length:toks.length-1,part=endsSpace?'':toks[toks.length-1].toLowerCase();const m=new Map();
  for(const[p]of tbl(sw)){const pt=p.split(' ');let ok=true;for(let i=0;i<k;i++){if(!pt[i]||!tokOk(pt[i],toks[i],sw.vendor)){ok=false;break}if(pt[i]==='<rest>'){ok=false;break}}if(!ok)continue;
    if(pt.length===k){if(endsSpace)m.set('<cr>','');continue}const nx=pt[k];if(nx[0]==='<'){if(endsSpace)m.set(nx,DESC[nx]||'')}else if(nx.startsWith(part))m.set(nx,DESC[nx]||'')}
  return{m,part,endsSpace}}
/* Junos: árbol de comandos para ? y Tab, según el contexto */
const JT={vlans:{d:'VLANs',arg:{n:'<nombre>',d:'Nombre de la VLAN, por ejemplo VENTAS',next:{'vlan-id':{d:'Número de la VLAN',arg:{n:'<1-4094>',d:'VLAN ID'}},description:{d:'Descripción',arg:{n:'<texto>',d:'Texto libre'}}}}},
 interfaces:{d:'Interfaces del equipo',arg:{n:'<interfaz>',d:'De ge-0/0/0 a ge-0/0/23',list:()=>ports('juniper'),next:{unit:{d:'Unidad lógica de la interfaz',arg:{n:'0',d:'Unidad 0 (la que se usa en switching)',list:()=>['0'],next:{family:{d:'Familia de protocolo',next:{'ethernet-switching':{d:'Switching de capa 2 (VLANs)',next:{'interface-mode':{d:'Modo del puerto',next:{access:{d:'Una sola VLAN, sin tag'},trunk:{d:'Varias VLAN con tag 802.1Q'}}},vlan:{d:'Pertenencia a VLAN',next:{members:{d:'VLANs del puerto',arg:{n:'<vlan>',d:'Nombre o número de VLAN',list:d=>Object.keys(d.cand.vlans)}}}}}}}}}}},disable:{d:'Apagar la interfaz'},description:{d:'Descripción',arg:{n:'<texto>',d:'Texto libre'}}}}}};
function jWalk(d,toks){let node=JT,arg=null;
 for(const t of toks){if(arg){node=arg.next||null;arg=null;continue}
  if(!node)return{end:true};const ks=Object.keys(node),k=ks.includes(t.toLowerCase())?t.toLowerCase():(ks.filter(x=>x.startsWith(t.toLowerCase())).length===1?ks.find(x=>x.startsWith(t.toLowerCase())):null);
  if(!k)return{bad:t};const e=node[k];if(e.arg){arg=e.arg}else node=e.next||null}
 if(arg)return{arg};if(!node)return{end:true};return{node}}
function jOptions(d,toks,part){
 const top=d.mode==='op'?[['configure','Entrar a modo configuración'],['show','Mostrar información'],['exit','Salir']]:[['set','Agregar configuración'],['delete','Borrar configuración'],['commit','Aplicar la configuración candidata'],['show','Ver la configuración candidata ( | compare para ver los cambios)'],['run','Ejecutar un comando operacional'],['rollback','Descartar los cambios sin commit'],['exit','Salir de modo configuración']];
 const opSub={show:[['vlans','VLANs y sus interfaces'],['configuration','Configuración activa'],['interfaces','Estado de interfaces (terse)']],configure:[]};
 if(!toks.length)return top.filter(([k])=>k.startsWith(part));
 const c0=toks[0].toLowerCase();
 if(d.mode==='conf'&&/^(set|delete)$/.test(c0)){const w=jWalk(d,toks.slice(1));if(w.bad)return null;if(w.end)return[['<Enter>','Ejecutar']];
  if(w.arg){const L=w.arg.list?w.arg.list(d):[];const hits=L.filter(x=>x.toLowerCase().startsWith(part));return hits.length&&part?hits.map(x=>[x,'']):[[w.arg.n,w.arg.d]]}
  return Object.entries(w.node).filter(([k])=>k.startsWith(part)).map(([k,v])=>[k,v.d])}
 if(c0==='show'||(c0==='run'&&toks[1]==='show'))return toks.length===(c0==='run'?2:1)?opSub.show.filter(([k])=>k.startsWith(part)):[['<Enter>','Ejecutar']];
 return[['<Enter>','Ejecutar']]}
function help(d,val){
  push(d,prompt(d)+val+'?','cmd');
  if(d.type==='pc'){push(d,['ping <ip>   Probar conectividad','ipconfig    Ver la IP','cls         Limpiar pantalla']);return}
  if(d.vendor==='juniper'){const endsSpace=val===''||/\s$/.test(val),toks=val.trim()?val.trim().split(/\s+/):[],part=endsSpace?'':toks.pop().toLowerCase();
    const o=jOptions(d,toks,part);if(!o||!o.length){push(d,{t:'syntax error, expecting <command>.',c:'err'});return}
    push(d,['Possible completions:',...o.map(([a,b])=>'  '+a.padEnd(22)+' '+b)]);return}
  const{m}=helpList(d,val);if(!m.size)push(d,{t:'% Unrecognized command',c:'err'});else push(d,[...m].map(([a,b])=>'  '+a.padEnd(18)+b))}
function complete(d,val){if(d.type==='pc'||!val||/\s$/.test(val))return val;
  if(d.vendor==='juniper'){const toks=val.trim().split(/\s+/),part=toks.pop();const o=(jOptions(d,toks,part.toLowerCase())||[]).filter(([k])=>k[0]!=='<');
    if(o.length===1)return val.slice(0,val.length-part.length)+o[0][0]+' ';
    if(o.length>1){let p=o[0][0];for(const[k]of o)while(!k.startsWith(p))p=p.slice(0,-1);if(p.length>part.length)return val.slice(0,val.length-part.length)+p}
    return val}
  const{m,part}=helpList(d,val);const ks=[...m.keys()].filter(x=>x[0]!=='<');if(ks.length===1)return val.slice(0,val.length-part.length)+ks[0]+' ';return val}

/* ---------- prompt / exec ---------- */
function prompt(d){if(d.type==='pc')return 'C:\\>';if(d.vendor==='juniper')return jPrompt(d);
  const h=d.host;if(d.vendor==='cisco')return h+{user:'>',priv:'#',config:'(config)#','config-vlan':'(config-vlan)#','config-if':'(config-if)#'}[d.mode];
  return h+{priv:'#',config:'(config)#','config-vlan':`(config-vlan-${d.ctx.vlan})#`,'config-if':'(config-if)#'}[d.mode]}
function exec(d,raw){
  const echo=prompt(d);push(d,echo+raw,'cmd');const line=raw.trim();if(line){d.hist.push(raw);d.hp=d.hist.length}
  if(!line)return;
  if(d.type==='pc')return pcExec(d,line);
  const o=d.vendor==='juniper'?jExec(d,line):runTable(d,line,echo.length);if(o.some(x=>x&&x.c==='err'))LS.err++;push(d,o);
}
function pcExec(p,line){
  const[c,arg]=line.split(/\s+/);const cl=c.toLowerCase();
  if(cl==='cls'){p.lines=[];return}
  if(cl==='ipconfig'){push(p,['','Ethernet adapter Ethernet0:','','   IPv4 Address. . . . . . . . . . . : '+p.ip,'   Subnet Mask . . . . . . . . . . . : 255.255.255.0','   Default Gateway . . . . . . . . . :']);return}
  if(cl!=='ping'){push(p,`'${c}' is not recognized as an internal or external command.`,'err');return}
  if(!arg||!/^\d+\.\d+\.\d+\.\d+$/.test(arg)){push(p,'Ping request could not find host '+(arg||'')+'. Please check the name and try again.','err');return}
  const ok=arg===p.ip||(arg===p.peer&&allOk());const inNet=arg.startsWith(NET());
  push(p,['','Pinging '+arg+' with 32 bytes of data:']);busy=true;render();let i=0;
  drawScore();const tick=()=>{if(i<4){push(p,inNet?(ok?`Reply from ${arg}: bytes=32 time=${i?1:2}ms TTL=128`:'Request timed out.'):'PING: transmit failed. General failure.',ok?'okl':'err');i++;render();setTimeout(tick,ok?380:700)}
    else{push(p,['','Ping statistics for '+arg+':',`    Packets: Sent = 4, Received = ${ok?4:0}, Lost = ${ok?0:4} (${ok?0:100}% loss),`]);
      if(!ok&&arg===p.peer){LS.fails++}if(!ok&&arg===p.peer)tut(p,'Sin respuesta. Revisa la lista de objetivos: algo en SW1 o SW2 aún no está listo.');
      busy=false;render();drawScore();if(ok&&arg===p.peer)win()}};
  setTimeout(tick,500);
}

/* ---------- UI ---------- */
const out=$('#out'),cmd=$('#cmd');
function select(d){cur=d;cmd.value='';render();}
function render(){
  out.innerHTML=cur.lines.map(l=>l.c?`<span class="${l.c}">${esc(l.t)}</span>`:esc(l.t)).join('\n');out.scrollTop=out.scrollHeight;
  $('#pr').textContent=busy?'':prompt(cur);cmd.disabled=busy;
  $('#tinfo').textContent=cur.type==='pc'?cur.name+' · '+cur.ip:cur.name+' · '+VEND[cur.vendor].label+' · modo '+MODE_ES[cur.mode];
  $('#tabs').innerHTML=devs.map(d=>`<button role="tab" aria-selected="${d===cur}" data-dev="${d.name}">${d.name}</button>`).join('');
  drawTopo();drawChecks();
}
function drawTopo(){
  const a=VEND[S1.vendor],b=VEND[S2.vendor],e1=eff(S1),e2=eff(S2);
  const l1=linkUp(S1,a.pc),l2=linkUp(S2,b.pc),lt=linkUp(S1,a.up),tr=!SC.exam&&lt&&e1.ifs[a.up].mode==='trunk'&&e2.ifs[b.up].mode==='trunk';
  const ln=(x1,x2,on,col,w)=>`<line x1="${x1}" y1="80" x2="${x2}" y2="80" stroke="${on?col:'#9aa4ad'}" stroke-width="${w}" ${on?'':'stroke-dasharray="6 5"'} stroke-linecap="round"/>`;
  const led=(x,on)=>`<circle cx="${x}" cy="80" r="5" fill="${on?'var(--ok)':'#9aa4ad'}"/>`;
  const sw=(d,x,v)=>`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-52}" y="52" width="104" height="56" rx="10" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-46}" y="64" width="92" height="32" rx="5" fill="${d.vendor==='aruba'?'#d7dce1':d.vendor==='juniper'?'#2b2e33':'#3c5a78'}"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${x-38+i*9.5}" y="74" width="6" height="5" fill="#111"/><rect x="${x-38+i*9.5}" y="82" width="6" height="5" fill="#111"/>`).join('')}<text x="${x}" y="130" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor">${d.name}</text><text x="${x}" y="149" text-anchor="middle" font-size="13" fill="var(--mut)">${v.label}</text></g>`;
  const pc=(d,x)=>`<g class="dev" data-dev="${d.name}" tabindex="0" role="button" aria-label="Abrir consola de ${d.name}"><rect class="hit" x="${x-38}" y="50" width="76" height="60" rx="10" fill="transparent" stroke="${cur===d?'var(--blue)':'transparent'}" stroke-width="2"/><rect x="${x-24}" y="58" width="48" height="32" rx="3" fill="#1d252c"/><rect x="${x-20}" y="62" width="40" height="24" fill="${done?'#16a35c':'#2f6fd6'}"/><rect x="${x-4}" y="90" width="8" height="8" fill="#55606a"/><rect x="${x-14}" y="98" width="28" height="4" rx="2" fill="#55606a"/><text x="${x}" y="130" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor">${d.name}</text><text x="${x}" y="149" text-anchor="middle" font-size="13" fill="var(--mut)">${d.ip.replace('192.168.','…')}</text></g>`;
  const t=(x,y,s,an)=>`<text x="${x}" y="${y}" text-anchor="${an}" font-size="13" font-family="IBM Plex Mono,monospace" fill="var(--mut)">${s}</text>`;
  $('#topo').innerHTML=`<g style="color:var(--ink)" font-family="IBM Plex Sans,sans-serif">${ln(76,133,l1,'var(--blue)',4)}${ln(237,323,lt,tr?'var(--trunk)':'var(--blue)',tr?7:4)}${ln(427,484,l2,'var(--blue)',4)}${led(133,l1)}${led(237,lt)}${led(323,lt)}${led(427,l2)}
  ${t(133,40,a.pcS,'end')}${t(237,40,a.upS,'start')}${t(323,178,b.upS,'end')}${t(427,178,b.pcS,'start')}
  ${pc(PCA,45)}${sw(S1,185,a)}${sw(S2,375,b)}${pc(PCB,515)}</g>`;
}
function drawScore(){const e=$('#lscore');if(e)e.innerHTML=`Puntaje del ticket: <strong>${labScore()}/100</strong> · necesitas 90. Restan: errores de comando (−1, máx −20), cada pista (−10), cada ping fallido (−5).`}
function drawChecks(){
  const cs=checks();
  $('#chk').innerHTML=cs.map(c=>`<li class="${c.ok?'ok':''}"><span class="dot" aria-hidden="true"></span><div><div class="sw">${c.sw.name} · ${VEND[c.sw.vendor].label}</div>${c.t}<span class="sr">${c.ok?' (listo)':''}</span><details><summary>Pista</summary><code>${esc(HINT[c.sw.vendor][c.k])}</code></details></div></li>`).join('')+
    `<li class="${done?'ok':''}"><span class="dot"></span><div><div class="sw">PC-A</div>Ping exitoso a PC-B</div></li>`;
  const n=[];for(const sw of[S1,S2])if(sw.vendor==='juniper'&&JSON.stringify(sw.cand)!==JSON.stringify(sw.act))n.push(`<p class="warn">${sw.name} tiene cambios sin commit: aún no se aplican.</p>`);
  if(!done&&cs.every(c=>c.ok))n.push('<p class="tip">Todo parece listo. Ve a PC-A y escribe <code>ping ${NET()}12</code>.</p>');
  $('#notes').innerHTML=n.join('');
  $('#chk').querySelectorAll('details').forEach((dt,i)=>{dt.addEventListener('toggle',()=>{if(dt.open){LS.hints.add(i);drawScore()}})});drawScore();
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-dev]');if(t&&!busy){select(devs.find(d=>d.name===t.dataset.dev));if(matchMedia('(min-width:901px)').matches)cmd.focus()}});
$('#topo').addEventListener('keydown',e=>{if(e.key==='Enter'){const t=e.target.closest('[data-dev]');if(t)select(devs.find(d=>d.name===t.dataset.dev))}});
cmd.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const v=cmd.value;cmd.value='';exec(cur,v);render()}
  else if(e.key==='Tab'){e.preventDefault();cmd.value=complete(cur,cmd.value)}
  else if(e.key==='ArrowUp'){e.preventDefault();hist(-1)}else if(e.key==='ArrowDown'){e.preventDefault();hist(1)}
  else if(e.key==='z'&&e.ctrlKey&&cur.type==='sw'&&cur.vendor!=='juniper'&&cur.mode.startsWith('config')){e.preventDefault();push(cur,prompt(cur)+'^Z','cmd');cur.mode='priv';render()}
});
['paste','drop'].forEach(ev=>cmd.addEventListener(ev,e=>{e.preventDefault();LS.paste++;tut(cur,'En LabRed los comandos se escriben, no se pegan: así se te quedan en la memoria.');render()}));
cmd.addEventListener('input',()=>{if(cmd.value.endsWith('?')){const v=cmd.value.slice(0,-1);help(cur,v);cmd.value=v;render()}});
function hist(dir){const h=cur.hist;if(!h.length)return;cur.hp=Math.max(0,Math.min(h.length,cur.hp+dir));cmd.value=h[cur.hp]||''}
for(const b of document.querySelectorAll('.keys button'))b.addEventListener('click',()=>{const k=b.dataset.k;if(k==='?'){help(cur,cmd.value);render()}else if(k==='tab')cmd.value=complete(cur,cmd.value);else hist(k==='up'?-1:1);cmd.focus()});
$('#clr').addEventListener('click',()=>{cur.lines=[];render()});
$('#rst').addEventListener('click',()=>{reset()});
addEventListener('lab-reset',()=>{reset();scrollTo(0,0)});
const TK0=document.querySelector('.ticket p').innerHTML,GOAL0=document.querySelector('.goal').innerHTML,H0=document.querySelector('#v-lab1 header h1').textContent,TKH0=document.querySelector('.ticket .tk').textContent;
window.LAB={
 start(cfg){SC={vid:cfg.vid,name:cfg.name,exam:true};$('#v1').value=cfg.v1;$('#v2').value=cfg.v2;$('#v1').disabled=$('#v2').disabled=true;document.body.classList.add('labexam');
  document.querySelector('.ticket p').innerHTML=`"Necesitamos que el área de ${cfg.label} tenga su propia red: la VLAN ${cfg.vid} (${cfg.name}), con una PC en cada piso." Configura SW1 y SW2 para que PC-A (${NET()}11) y PC-B (${NET()}12) se vean. Sin pistas ni guía: como en el trabajo.`;
  document.querySelector('.goal').innerHTML=`PC-A (${NET()}11) hace ping a PC-B (${NET()}12) en la VLAN ${cfg.vid} (${cfg.name}).`;document.querySelector('#v-lab1 header h1').textContent='Certificación: parte práctica';document.querySelector('.ticket .tk').textContent=`CERT-1 · de: ${cfg.label}`;cur=null;reset()},
 stop(){if(!SC.exam)return;SC={vid:10,name:'VENTAS',exam:false};$('#v1').disabled=$('#v2').disabled=false;document.body.classList.remove('labexam');document.querySelector('.ticket p').innerHTML=TK0;document.querySelector('.goal').innerHTML=GOAL0;document.querySelector('#v-lab1 header h1').textContent=H0;document.querySelector('.ticket .tk').textContent=TKH0;cur=null;reset()},
 passed(){return checks().filter(c=>c.ok).length},total(){return checks().length},score:()=>labScore()};
for(const id of['#v1','#v2'])$(id).addEventListener('change',()=>{const i=id==='#v1'?0:1,n=mkSwitch(i?'SW2':'SW1',$(id).value);devs[i]=n;if(i)S2=n;else S1=n;if(cur.name===n.name)cur=n;done=false;$('#done').classList.remove('show');render()});

/* ---------- solutions ---------- */
const SOL={cisco:`enable
configure terminal
vlan 10
 name VENTAS
 exit
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 10
 exit
interface GigabitEthernet0/24
 switchport mode trunk
 switchport trunk allowed vlan 10
 end
write memory`,aruba:`configure terminal
vlan 10
 name VENTAS
 exit
interface 1/1/1
 no shutdown
 vlan access 10
 exit
interface 1/1/24
 no shutdown
 vlan trunk native 1
 vlan trunk allowed 10
 end
write memory`,juniper:`configure
set vlans VENTAS vlan-id 10
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members VENTAS
set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members VENTAS
commit`};
$('#sol').innerHTML=Object.entries(SOL).map(([k,s])=>`<div><h3>${VEND[k].label}<button class="btn" data-copy="${k}">Copiar</button></h3><pre>${esc(s)}</pre></div>`).join('');
$('#sol').addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;try{await navigator.clipboard.writeText(SOL[b.dataset.copy]);b.textContent='Copiado'}catch{b.textContent='Selecciona el texto'}setTimeout(()=>b.textContent='Copiar',1600)});

/* ---------- 3D ---------- */
let G=null;
function win(){if(done)return;done=true;if(SC.exam){dispatchEvent(new CustomEvent('lab-done',{detail:{exam:true,score:labScore(),err:LS.err,fails:LS.fails,ms:Date.now()-LS.t0,paste:LS.paste,mixed:S1.vendor!==S2.vendor}}));render();return}dispatchEvent(new CustomEvent('lab-done',{detail:{mixed:S1.vendor!==S2.vendor,score:labScore(),err:LS.err,hints:LS.hints.size,fails:LS.fails,ms:Date.now()-LS.t0,paste:LS.paste}}));render();$('#done').classList.add('show');build3D();setTimeout(()=>$('#done').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}),300)}
function textTex(lines,w,h,bg,fg,size){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}x.fillStyle=fg;x.font=`500 ${size}px IBM Plex Mono, monospace`;x.textBaseline='top';lines.forEach((l,i)=>x.fillText(l,10,8+i*(size+6)));const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
function build3D(){
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
