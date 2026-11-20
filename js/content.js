/* LabRed: contenido de lecciones, examen y niveles.
   Edita este archivo para corregir textos o agregar lecciones. */
/* ---------- contenido ---------- */
const LEVELS=[
 {n:0,t:'Fundamentos',d:'Qué viaja por el cable, cómo piensa un switch y qué es una VLAN. Teoría corta, con animaciones.',items:[{id:'l0-1',t:'El frame y la dirección MAC',h:'#leccion-0-1'},{id:'l0-2',t:'Cómo aprende un switch',h:'#leccion-0-2'},{id:'l0-3',t:'VLAN: varias redes en un switch',h:'#leccion-0-3'},{id:'x0',t:'Certificación de la Zona 0',h:'#examen-0',exam:true}]},
 {n:1,t:'Switching básico',d:'Tu primera VLAN entre dos switches, en consola real de Cisco, Aruba o Juniper.',items:[{id:'lab1',t:'Lab: tu primera VLAN entre dos switches',h:'#lab-1'},{id:'x1',t:'Certificación de la Zona 1',h:'#examen-1',exam:true}]},
 {n:2,t:'Trunks y VLAN nativa',d:'Varias VLAN en un mismo trunk y qué pasa cuando la nativa no coincide.',soon:true},
 {n:3,t:'Spanning Tree',d:'Encontrar al root bridge y entender por qué se bloquea un puerto.',soon:true},
 {n:4,t:'Agregación con LACP',d:'Juntar varios cables como si fueran uno.',soon:true},
 {n:5,t:'Ruteo entre VLAN',d:'Hacer que VLANs distintas se hablen con SVI.',soon:true}
];
const TITLES=[[0,'Becario de redes'],[150,'Técnico de cableado'],[400,'Técnico NOC'],[800,'Ingeniero de redes jr'],[1500,'Ingeniero de redes']];
const rankTitle=p=>TITLES.filter(t=>p>=t[0]).pop()[1];
const MAC={A:'00:1a:2b:00:00:0a',B:'00:1a:2b:00:00:0b',C:'00:1a:2b:00:00:0c',D:'00:1a:2b:00:00:0d'};
const PORTN={A:1,B:2,C:3,D:4};

const VOCAB={
'0-1':[['Frame','trama: el "sobre" que viaja por el cable'],['NIC','tarjeta de red'],['MAC address','dirección física de 48 bits'],['OUI','parte de la MAC que identifica al fabricante'],['Destination / Source MAC','MAC destino / MAC origen'],['Payload','los datos que lleva el frame'],['FCS','código para detectar frames dañados']],
'0-2':[['MAC address table','tabla donde el switch anota qué MAC está en qué puerto'],['Learning','aprender la MAC origen y su puerto'],['Forwarding','reenviar un frame por el puerto correcto'],['Flooding','copiar un frame por todos los puertos menos el de entrada'],['Broadcast','frame para todos (ff:ff:ff:ff:ff:ff)'],['Unicast','frame para un solo destino'],['Aging','tiempo tras el cual una entrada expira']],
'0-3':[['VLAN','red virtual dentro de un switch'],['Broadcast domain','hasta dónde llega un broadcast'],['Access port','puerto que pertenece a una sola VLAN'],['Trunk','enlace que lleva varias VLAN'],['Tag 802.1Q','etiqueta de 4 bytes con el número de VLAN'],['Tagged / Untagged','con tag / sin tag'],['VID','VLAN ID: el número de VLAN (1 a 4094)']]};
const LES={
'0-1':{id:'l0-1',lv:0,k:1,t:'El frame y la dirección MAC',
 body:['Cuando una computadora manda algo por la red no manda "archivos": manda <strong>frames</strong> (en español, frames). Un frame es como un sobre: por fuera lleva la dirección de quien la recibe y la de quien la manda; por dentro, los datos.',
  'Esas direcciones son <strong>direcciones MAC</strong>. Cada tarjeta de red (NIC) trae una de fábrica: 48 bits escritos como 12 dígitos hexadecimales, por ejemplo <code>00:1a:2b:00:00:0a</code>. La primera mitad identifica al fabricante (se llama OUI) y la segunda a la tarjeta.',
  'El <strong>switch</strong> es el cartero del edificio. Lee la MAC destino de cada sobre y lo entrega solo por el puerto donde vive ese equipo. Dale a "Enviar" para verlo, y toca cada parte del frame para saber qué es.'],
 fig:'frame',
 real:'<h3>Así lo ves en la vida real</h3><p>La MAC viene impresa en el tag del equipo y cada vendor la escribe distinto, aunque sea la misma: Cisco usa <code>001a.2b00.000a</code>; Aruba AOS-CX y Juniper usan <code>00:1a:2b:00:00:0a</code>. Si capturas tráfico con Wireshark, cada paquete muestra arriba la sección "Ethernet II" con Destination y Source: es exactamente este sobre.</p>',
 quiz:[{q:'¿Qué dirección mira el switch para decidir por qué puerto mandar un frame?',o:['La MAC origen','La MAC destino','La IP destino','El número de puerto TCP'],a:1,why:'El switch trabaja en capa 2: decide con la MAC destino. La IP la usa el router, en capa 3.'},
  {q:'¿Cuántos bits tiene una dirección MAC?',o:['32','64','48','128'],a:2,why:'48 bits, que se escriben como 12 dígitos hexadecimales. 32 bits es IPv4 y 128 es IPv6.'}],
 exp:{q:'Con tus palabras: ¿qué es una dirección MAC y qué hace un switch cuando le llega un frame?',
  ideas:['La MAC identifica a una tarjeta o interfaz de red, viene de fábrica y tiene 48 bits','Un frame lleva MAC destino, MAC origen y los datos','El switch lee la MAC destino y manda el frame solo por el puerto donde está ese equipo','Trabaja en la red local, capa 2; no usa direcciones IP para esto'],
  short:['qué identifica la MAC','qué lleva un frame','que el switch decide con la MAC destino','que es capa 2 / red local'],
  kw:[['tarjeta','interfaz','fabrica','identific','48'],['frame','sobre','origen'],['destino'],['capa 2','local','enlace','lan']],
  model:'La MAC es la dirección de fábrica de cada tarjeta de red (48 bits). Cada frame lleva la MAC de quien lo recibe y la de quien lo manda. El switch lee la MAC destino y entrega el frame solo por el puerto donde está ese equipo.'}},
'0-2':{id:'l0-2',lv:0,k:2,t:'Cómo aprende un switch',
 body:['Un switch recién encendido no sabe dónde está nadie. Aprende escuchando: cada vez que le llega un frame, anota la <strong>MAC origen</strong> y el <strong>puerto</strong> por donde entró. Esa lista es la <strong>MAC address table</strong> (tabla de direcciones MAC; también le dicen tabla CAM).',
  'Para reenviar mira la MAC destino. Si ya la tiene en la tabla, manda el frame solo por ese puerto (<strong>forwarding</strong>). Si no la conoce, o si es un broadcast (<code>ff:ff:ff:ff:ff:ff</code>), hace <strong>flooding</strong> (inundación): lo copia por todos los puertos menos por el que llegó. Los equipos que no son el destino lo descartan.',
  'Las entradas expiran si un equipo deja de hablar; a eso se le llama <strong>aging</strong> (300 segundos por defecto en los tres vendors). Así, si mueves una PC de puerto, el switch se entera solo. Juega abajo: manda frames y mira cómo se llena la tabla.'],
 fig:'learn',
 real:'<h3>Así lo ves en la vida real</h3><p>El comando cambia por vendor, la idea es la misma:</p><pre>Cisco IOS      show mac address-table\nAruba AOS-CX   show mac-address-table\nJuniper Junos  show ethernet-switching table</pre><p>En el trabajo esto se usa todos los días para encontrar en qué puerto está conectado un equipo: buscas su MAC en la tabla y sigues el cable.</p>',
 quiz:[{q:'Al switch le llega un frame para una MAC que no está en su tabla. ¿Qué hace?',o:['Lo descarta','Lo manda por todos los puertos menos por el que llegó','Lo regresa al que lo mandó','Le pregunta al router'],a:1,why:'Eso es flooding (inundación). Cuando el destino conteste, el switch aprenderá su puerto y la próxima vez irá directo.'},
  {q:'¿Con qué dato llena el switch su MAC address table?',o:['Con la MAC origen y el puerto por donde entró el frame','Con la MAC destino','Con la IP de cada equipo','Se la configura el administrador'],a:0,why:'Aprende del remitente: si un frame de la MAC X entró por el puerto 3, entonces X vive en el puerto 3.'}],
 exp:{q:'Con tus palabras: ¿cómo llena un switch su MAC address table y qué hace cuando no conoce el destino de un frame?',
  ideas:['Aprende de la MAC origen de cada frame y el puerto por donde entró','Si conoce la MAC destino, reenvía solo por ese puerto','Si no la conoce o es broadcast, hace flooding por todos los puertos menos el de entrada','Las entradas caducan con el tiempo (aging)'],
  short:['que aprende de la MAC origen y el puerto','reenvío directo cuando conoce el destino','el flooding si no lo conoce','el aging de las entradas'],
  kw:[['origen','remitente'],['solo por','directo','unicast','ese puerto'],['inund','flood','todos los puertos','broadcast'],['caduc','aging','envejec','expira','300']],
  model:'El switch anota la MAC origen de cada frame junto con el puerto por donde entró. Cuando la MAC destino está en la tabla, manda el frame solo por ese puerto; si no está o es broadcast, lo copia por todos los puertos menos el de entrada. Las entradas caducan si el equipo deja de hablar.'}},
'0-3':{id:'l0-3',lv:0,k:3,t:'VLAN: varias redes en un switch',
 body:['Un broadcast llega a todos los puertos de un switch. En una oficina grande eso es ruido y riesgo: Ventas no tiene por qué ver el tráfico de las cámaras.',
  'Una <strong>VLAN</strong> parte un switch en varios switches virtuales. Cada <strong>access port</strong> (access port) pertenece a una VLAN y los frames, incluidos los broadcast, solo viajan entre puertos de la misma VLAN. Para pasar de una VLAN a otra hace falta un router (capa 3); eso llega en el Nivel 5.',
  'Cuando dos switches comparten varias VLAN por un solo cable, ese enlace es un <strong>trunk</strong> (trunk). Ahí cada frame lleva un <strong>tag</strong> (tag) <strong>802.1Q</strong> de 4 bytes con el número de VLAN, para que el otro switch sepa a cuál pertenece. Toca las PCs para cambiarlas de VLAN y manda un broadcast.'],
 fig:'vlan',
 real:'<h3>Así lo ves en la vida real</h3><p>En una empresa típica hay una VLAN para PCs, otra para teléfonos IP, otra para cámaras y otra para invitados del Wi-Fi. Del rack de cada piso sale un trunk hacia el core que lleva todas. Eso es justo lo que configuras en el Lab 1: una VLAN, dos access ports y un trunk.</p>',
 quiz:[{q:'PC-A está en la VLAN 10 y manda un broadcast. ¿Quién lo recibe?',o:['Todas las PCs del switch','Solo las PCs de la VLAN 10','Solo el router','Nadie, los broadcast se bloquean'],a:1,why:'Cada VLAN es su propio broadcast domain. Las PCs de otras VLAN ni se enteran.'},
  {q:'¿Para qué sirve un puerto trunk?',o:['Para conectar una sola PC más rápido','Para llevar varias VLAN por un mismo cable, agregando a los frames un tag 802.1Q','Para conectar a internet','Para apagar las VLAN que no se usan'],a:1,why:'El trunk lleva varias VLAN entre switches (o hacia un router o un servidor). El tag 802.1Q indica a qué VLAN pertenece cada frame.'}],
 exp:{q:'Con tus palabras: ¿qué es una VLAN y por qué un enlace trunk necesita etiquetar los frames?',
  ideas:['Una VLAN separa un switch en redes lógicas independientes (broadcast domains distintos)','Equipos en VLAN distintas no se comunican en capa 2; hace falta un router','Un trunk lleva varias VLAN por un solo enlace','El tag 802.1Q indica a qué VLAN pertenece cada frame para que el otro switch la ponga en la VLAN correcta'],
  short:['que separa redes o broadcast domains','que entre VLANs hace falta un router','que el trunk lleva varias VLAN','qué hace el tag 802.1Q'],
  kw:[['separ','divid','broadcast','virtual','aisl'],['router','capa 3','no se comunican','no se ven'],['varias vlan','multiples vlan','varias redes','un solo cable','mismo cable'],['tag','802.1q','tag','identific']],
  model:'Una VLAN divide un switch en redes lógicas separadas: el tráfico y los broadcast de una no llegan a la otra, y para comunicarlas hace falta un router. Un trunk lleva varias VLAN por un mismo cable, así que cada frame lleva un tag 802.1Q con su número de VLAN para que el otro switch sepa dónde ponerla.'}}
};
const ALT={
'l0-1':{fig:'Vuelve a la animación, dale a "Enviar" y toca las partes Destination MAC y Source MAC del frame. Fíjate cuál de las dos usa el switch para decidir.',
 analog:'Piensa en el correo de un edificio de departamentos. Cada departamento tiene un número que nunca cambia (eso es la MAC). Cada carta es un sobre con el número de quien la recibe y el de quien la manda (eso es el frame). El conserje de la entrada (el switch) no abre la carta: solo lee el número del destinatario y la sube a ese departamento, sin molestar a los demás.',
 guide:['¿Qué identifica una MAC y de dónde sale?','¿Qué lleva un frame además de los datos?','¿Qué parte del frame lee el switch y qué hace con ella?','¿Esto pasa en la red local o en internet? ¿En qué capa?']},
'l0-2':{fig:'Vuelve a la animación, dale a "Borrar tabla" y manda de PC-A a PC-C. Luego manda de PC-C a PC-A. Compara qué pasó la primera vez y la segunda, y mira qué fila apareció en la tabla en cada envío.',
 analog:'Imagina a un recepcionista nuevo en un hotel. No conoce a nadie. Cada vez que alguien baja a recepción, anota "esta persona viene del cuarto 3". Si le llega un paquete para alguien que aún no conoce, toca en todos los cuartos preguntando (eso es el flooding). Cuando ya sabe en qué cuarto está, lo sube directo. Y si un huésped no aparece en días, lo borra de su libreta (eso es el aging).',
 guide:['¿De qué dato del frame aprende el switch: origen o destino?','¿Qué guarda junto a esa MAC?','¿Qué hace si ya conoce el destino?','¿Qué hace si no lo conoce o si es broadcast? ¿Por qué puerto NO la manda?','¿Las entradas duran para siempre?']},
'l0-3':{fig:'Vuelve a la animación: pon tres PCs en la VLAN 10 y una en la 20, y manda un broadcast desde cada una. Después toca el segmento 802.1Q del frame y lee qué número lleva adentro.',
 analog:'Piensa en un edificio donde trabajan varias empresas. Cada empresa tiene sus oficinas y nadie entra a las de otra (eso es una VLAN). Para comunicarse entre empresas tienen que pasar por la recepción principal (el router). El elevador sube gente de todas las empresas, así que cada quien lleva un gafete con el nombre de su empresa: al llegar a su piso, el guardia ve el gafete y sabe a qué oficina mandarlo. El elevador es el trunk y el gafete es el tag 802.1Q.',
 guide:['¿Qué separa una VLAN? ¿Qué pasa con un broadcast?','¿Pueden hablar dos PCs de VLAN distintas sin ayuda? ¿Qué necesitan?','¿Qué lleva un trunk que no lleva un access port?','¿Qué información va en el tag y para qué la usa el otro switch?']},
'lab1':{fig:'Vuelve a la consola del lab y ejecuta "show interfaces trunk" (Cisco), "show vlan" (Aruba) o "run show vlans" (Juniper). Fíjate qué VLAN aparecen en el trunk y cuáles en el puerto de la PC.',
 analog:'El cable entre SW1 y SW2 es como el elevador del edificio: hoy solo sube gente de Ventas, pero mañana subirán de Compras, de Cámaras y de Invitados. Por eso cada quien lleva gafete (tag 802.1Q). La PC, en cambio, está dentro de la oficina de Ventas: ahí nadie necesita gafete.',
 guide:['¿Cuántas VLAN puede llevar un trunk y cuántas un access port?','¿Qué le pasa al frame al entrar al trunk y al salir hacia la PC?','¿Qué tiene que existir y estar permitido en los dos switches?','¿Funcionaría un enlace de acceso con una sola VLAN? ¿Y con dos?']}
};
const LABEXP={q:'En el Lab 1, ¿por qué el enlace entre SW1 y SW2 se configura como trunk? ¿Qué viaja distinto por ese cable comparado con el puerto de la PC?',
 ideas:['El trunk puede llevar varias VLAN por un solo enlace','Por el trunk los frames de la VLAN 10 viajan con tag (tagged) 802.1Q; hacia la PC salen sin tag (untagged)','El otro switch usa el tag para meter el frame en la VLAN correcta, y la VLAN debe existir y estar permitida en ambos lados','Bonus: con una sola VLAN un enlace de acceso también funcionaría, pero no escala cuando agregas más VLAN'],
 short:['que lleva varias VLAN','el tag 802.1Q en el trunk y sin tag (untagged) hacia la PC','que la VLAN debe existir y estar permitida en ambos','por qué no basta un acceso'],
 kw:[['varias vlan','multiples','varias redes'],['tag','802.1q','tag'],['permit','exist','ambos','los dos'],['acceso tambien','una sola vlan','escal']],
 model:'El trunk permite que varias VLAN compartan el cable entre switches. Por ahí los frames de la VLAN 10 viajan con tag (tagged) 802.1Q; hacia la PC salen sin tag (untagged) por el access port. El switch de enfrente lee el tag para meter el frame en la VLAN 10, que debe existir y estar permitida en los dos lados.'};

const PLACE=[
 {lv:0,q:'¿Qué identifica una dirección MAC?',o:['Una red completa','Una tarjeta o interfaz de red','Un sitio web','A un usuario'],a:1},
 {lv:0,q:'¿En qué capa del modelo OSI trabaja principalmente un switch de acceso?',o:['Capa 1, física','Capa 2, enlace de datos','Capa 3, red','Capa 7, aplicación'],a:1},
 {lv:0,q:'¿Qué hace un switch con un frame cuyo destino no conoce?',o:['Lo descarta','Lo manda por todos los puertos menos por el que llegó','Lo manda al gateway','Lo guarda hasta conocer el destino'],a:1},
 {lv:1,q:'Un access port…',o:['Lleva varias VLAN con tag','Pertenece a una sola VLAN y manda frames sin tag (untagged)','Solo sirve para administrar el switch','Siempre está en la VLAN 1'],a:1},
 {lv:1,q:'¿Qué estándar tag los frames en un trunk?',o:['IEEE 802.3ad','IEEE 802.1D','IEEE 802.1Q','IEEE 802.11'],a:2},
 {lv:1,q:'Dos PCs en la VLAN 10, en switches distintos, no se ven. El trunk está arriba. ¿Qué revisas primero?',o:['Que la VLAN 10 exista en ambos switches y esté permitida en el trunk','El cable de consola','La prioridad de STP','El DNS'],a:0},
 {lv:2,q:'En un trunk 802.1Q, ¿cómo viajan los frames de la VLAN nativa?',o:['Con doble tag','Sin tag','Cifradas','No viajan'],a:1},
 {lv:2,q:'¿Qué pasa si la VLAN nativa no coincide en los dos extremos de un trunk?',o:['El trunk se apaga siempre','El tráfico sin tag (untagged) termina en VLANs distintas en cada lado','Nada, se ignora','Se duplica el ancho de banda'],a:1},
 {lv:2,q:'En STP, ¿cómo se elige el root bridge?',o:['El de más puertos','El de menor bridge ID (prioridad + MAC)','El más nuevo','El que tenga más VLAN'],a:1}
];


/* Identificador de ticket y tipo de equipo de cada misión en el mapa */
const TID={'l0-1':'L0-01','l0-2':'L0-02','l0-3':'L0-03','x0':'CERT-0','lab1':'TK-1042','x1':'CERT-1'};
const GLYPH={'l0-1':'pc','l0-2':'sw','l0-3':'vlan','x0':'cert','lab1':'pair','x1':'cert',z2:'rack',z3:'stp',z4:'lacp',z5:'router'};

/* Certificaciones de zona: preguntas al azar del banco, opciones barajadas, con tiempo. Se aprueba con 90%. */
const EXAMS={
x0:{zone:0,t:'Certificación de la Zona 0: Fundamentos',n:10,min:12,pool:[
 {q:'¿Qué identifica una dirección MAC?',o:['Una tarjeta o interfaz de red (NIC)','Una red completa','Un usuario','Un sitio web'],a:0,topic:'l0-1'},
 {q:'¿Cuántos bits tiene una dirección MAC?',o:['48','32','64','128'],a:0,topic:'l0-1'},
 {q:'¿Qué indica el OUI de una MAC?',o:['El fabricante de la tarjeta','La VLAN del puerto','La IP del equipo','El número de puerto'],a:0,topic:'l0-1'},
 {q:'¿Qué campo del frame usa el switch para decidir el puerto de salida?',o:['Destination MAC','Source MAC','EtherType','FCS'],a:0,topic:'l0-1'},
 {q:'¿Para qué sirve el FCS de un frame?',o:['Detectar si el frame llegó dañado','Indicar la VLAN','Cifrar los datos','Indicar la prioridad'],a:0,topic:'l0-1'},
 {q:'Un frame trae EtherType 0x0800. ¿Qué lleva en el payload?',o:['Un paquete IPv4','Un paquete IPv6','Un mensaje ARP','Una etiqueta 802.1Q'],a:0,topic:'l0-1'},
 {q:'¿Con qué información aprende el switch su MAC address table?',o:['Source MAC y el puerto por donde entró el frame','Destination MAC y el puerto de salida','La IP del equipo','Se configura a mano siempre'],a:0,topic:'l0-2'},
 {q:'Llega un frame unicast para una MAC que no está en la tabla. ¿Qué hace el switch?',o:['Flooding por todos los puertos de esa VLAN menos el de entrada','Lo descarta','Lo regresa al origen','Lo manda solo al puerto 1'],a:0,topic:'l0-2'},
 {q:'¿Cuál es la MAC de broadcast?',o:['ff:ff:ff:ff:ff:ff','00:00:00:00:00:00','01:00:5e:00:00:01','La MAC del switch'],a:0,topic:'l0-2'},
 {q:'¿Qué es el aging en la MAC address table?',o:['Las entradas expiran si esa MAC deja de enviar tráfico','El tiempo que tarda el switch en encender','La vida útil del cable','El tiempo de un ping'],a:0,topic:'l0-2'},
 {q:'Mueves una PC del puerto 3 al puerto 7 del mismo switch. ¿Qué pasa con la tabla?',o:['Se actualiza cuando la PC envía un frame por el puerto 7','Se queda en el puerto 3 para siempre','El switch se reinicia','Hay que borrar la tabla a mano'],a:0,topic:'l0-2'},
 {q:'El switch conoce la Destination MAC de un frame. ¿Por dónde lo manda?',o:['Solo por el puerto asociado a esa MAC','Por todos los puertos','Por el puerto de entrada','Por ninguno'],a:0,topic:'l0-2'},
 {q:'¿Qué separa una VLAN?',o:['Broadcast domains: el broadcast de una VLAN no llega a otra','Velocidades de los puertos','Tipos de cable','Direcciones MAC de fábrica'],a:0,topic:'l0-3'},
 {q:'PC-A está en la VLAN 10 y PC-B en la VLAN 20, en el mismo switch, sin router. ¿Se pueden hacer ping?',o:['No: están en VLANs distintas y hace falta un router (capa 3)','Sí, porque están en el mismo switch','Sí, si están en el mismo cable','Solo si el switch se reinicia'],a:0,topic:'l0-3'},
 {q:'¿Qué hace un trunk?',o:['Lleva varias VLAN por un mismo enlace usando tags 802.1Q','Conecta una sola PC','Une dos VLANs en una','Apaga las VLANs sin uso'],a:0,topic:'l0-3'},
 {q:'¿Cuánto mide el tag 802.1Q y cuántos bits tiene el VID?',o:['4 bytes; VID de 12 bits','2 bytes; VID de 8 bits','6 bytes; VID de 16 bits','1 byte; VID de 4 bits'],a:0,topic:'l0-3'},
 {q:'¿Cómo salen los frames por un access port hacia una PC?',o:['Untagged (sin tag)','Con tag 802.1Q','Cifrados','Duplicados'],a:0,topic:'l0-3'},
 {q:'¿Qué rango de VLAN ID se puede usar en 802.1Q?',o:['1 a 4094','0 a 255','1 a 1024','1 a 65535'],a:0,topic:'l0-3'}
]},
x1:{zone:1,t:'Certificación de la Zona 1: Switching básico',n:10,min:12,pool:[
 {q:'Cisco IOS: ¿qué par de comandos deja Gi0/1 como access en la VLAN 10?',o:['switchport mode access y switchport access vlan 10','vlan access 10','set interfaces ge-0/0/1 vlan 10','switchport trunk vlan 10'],a:0,topic:'lab1'},
 {q:'Aruba AOS-CX: ¿qué comando pone una interfaz como access en la VLAN 10?',o:['vlan access 10','switchport access vlan 10','set vlan members 10','access vlan 10 enable'],a:0,topic:'lab1'},
 {q:'Aruba AOS-CX: ¿qué comando permite la VLAN 10 en un trunk?',o:['vlan trunk allowed 10','switchport trunk allowed vlan 10','set trunk 10','trunk vlan 10 allow'],a:0,topic:'lab1'},
 {q:'Juniper Junos: ¿cómo creas la VLAN VENTAS con ID 10?',o:['set vlans VENTAS vlan-id 10','vlan 10 name VENTAS','create vlan VENTAS 10','set vlan-id 10 VENTAS'],a:0,topic:'lab1'},
 {q:'Juniper Junos: configuraste todo con set pero el ping no funciona. ¿Qué te falta muy probablemente?',o:['commit','write memory','reload','no shutdown'],a:0,topic:'lab1'},
 {q:'Juniper Junos: estás en modo configuración y quieres ver las VLANs operativas. ¿Qué escribes?',o:['run show vlans','show vlans brief','do show vlan','display vlans'],a:0,topic:'lab1'},
 {q:'Cisco IOS: ¿qué comando muestra los trunks y las VLANs permitidas?',o:['show interfaces trunk','show vlan trunk','show trunk all','show running trunk'],a:0,topic:'lab1'},
 {q:'Cisco IOS: escribes switchport access vlan 10 y la VLAN 10 no existe. ¿Qué pasa?',o:['El switch la crea automáticamente y avisa','Da error y no hace nada','Usa la VLAN 1','Apaga el puerto'],a:0,topic:'lab1'},
 {q:'¿Puede formarse un trunk 802.1Q entre un Cisco y un Juniper?',o:['Sí, 802.1Q es un estándar IEEE','No, cada vendor usa su propio protocolo','Solo con un cable especial','Solo si ambos tienen la misma versión'],a:0,topic:'lab1'},
 {q:'El trunk está up, pero en un lado la VLAN 10 no está en la lista de permitidas. ¿Qué pasa con el tráfico de la VLAN 10?',o:['No cruza ese trunk','Cruza sin tag','Se convierte a la VLAN 1','Cruza normal'],a:0,topic:'lab1'},
 {q:'Si no cambias nada, ¿cuál es la VLAN nativa de un trunk 802.1Q?',o:['VLAN 1, que viaja sin tag','VLAN 10','La VLAN más alta','No existe VLAN nativa'],a:0,topic:'lab1'},
 {q:'Cisco IOS: ¿cómo guardas la configuración para que sobreviva un reinicio?',o:['copy running-config startup-config (o write memory)','commit','save all','exit'],a:0,topic:'lab1'},
 {q:'En el Lab 1, ¿por qué el enlace entre switches se configura como trunk?',o:['Para que pueda llevar varias VLAN con tag, hoy la 10 y mañana más','Porque es más rápido','Porque las PCs lo necesitan','Porque así se apaga STP'],a:0,topic:'lab1'},
 {q:'Junos: tu PC está en ge-0/0/1. ¿Qué dos cosas necesita esa interfaz en el lab?',o:['interface-mode access y vlan members VENTAS','interface-mode trunk y native-vlan 10','solo description','vlan-id 10 y commit check'],a:0,topic:'lab1'}
]}};
