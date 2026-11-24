/* Examen de ubicación por zonas: 6 preguntas por zona (d: 0 básica, 1 media conceptual, 2 difícil con caso).
   Cada zona nueva agrega aquí su bloque y el examen crece solo. */
window.PLACEQ=window.PLACEQ||{};
Object.assign(window.PLACEQ,{
0:[
 {d:0,topic:'n0-1',q:'¿Qué equipo conecta redes distintas, como la oficina con internet?',o:['El router','El switch','El access point','El patch panel'],a:0},
 {d:0,topic:'n0-4',q:'¿Cuántos bits tiene una dirección IPv4?',o:['32','48','64','128'],a:0},
 {d:1,topic:'n0-5',q:'¿Por qué una videollamada usa UDP y una descarga usa TCP?',o:['La llamada no puede esperar reenvíos; la descarga necesita llegar completa','UDP es más seguro que TCP','TCP no soporta archivos grandes','La llamada necesita confirmar cada paquete'],a:0},
 {d:1,topic:'n0-4',q:'¿Qué diferencia de fondo hay entre la MAC y la IP?',o:['La MAC entrega dentro de la red local; la IP lleva el paquete entre redes','La MAC cambia en cada red; la IP nunca cambia','La IP la graba el fabricante en la tarjeta','Son el mismo dato escrito en otro formato'],a:0},
 {d:2,topic:'n0-9',q:'Caso: una PC tiene 192.168.20.31/24 y su gateway es correcto. El ping al gateway y a 10.0.5.20 responde, pero el ping a intranet.netcorp.mx dice que no encuentra el host. ¿Dónde está la falla?',o:['En la resolución de nombres (DNS)','En el cable de la PC','En el gateway','En la VLAN del puerto'],a:0},
 {d:2,topic:'n0-6',q:'Caso: un enlace entre dos switches funciona, pero lento y con errores. Un lado está fijo en 1000/full y el otro en auto. ¿Qué pasa?',o:['El lado en auto no puede negociar y cae en half duplex: hay un duplex mismatch','El cable es de una categoría incorrecta','La VLAN nativa no coincide','La tabla MAC está llena'],a:0}],
1:[
 {d:0,topic:'l0-1',q:'¿Con qué dato decide el switch por qué puerto mandar un frame?',o:['La MAC destino','La MAC origen','La IP destino','El puerto TCP'],a:0},
 {d:0,topic:'l0-3',q:'¿Cuántas VLAN lleva un access port?',o:['Una','Dos','Todas','Ninguna'],a:0},
 {d:1,topic:'l0-3',q:'¿Por qué el enlace entre dos switches que comparten varias VLAN se configura como trunk?',o:['Porque lleva varias VLAN y cada frame necesita su etiqueta para no mezclarse','Porque así el enlace va más rápido','Porque los access ports no funcionan entre switches','Porque el trunk asigna las IP'],a:0},
 {d:1,topic:'l0-2',q:'La tabla MAC está vacía y PC-A le escribe a PC-C. ¿Qué aprende el switch y qué hace con el frame?',o:['Aprende la MAC de PC-A y hace flooding','Aprende la MAC de PC-C y lo entrega directo','No aprende nada y lo descarta','Aprende las dos MAC y lo manda al router'],a:0},
 {d:2,topic:'lab1',q:'Caso: PC-A (VLAN 10, SW1) no hace ping a PC-B (VLAN 10, SW2). El trunk está arriba, pero en SW2 show vlan brief no muestra la VLAN 10. ¿Qué haces?',o:['Crear la VLAN 10 en SW2','Cambiar el trunk a access','Reiniciar SW2','Poner a PC-B en la VLAN 1'],a:0},
 {d:2,topic:'l0-4',q:'Caso: Gi0/7 aparece en err-disabled porque un usuario conectó un switchito de casa. ¿Qué haces?',o:['Quitar el switchito y luego shutdown / no shutdown en el puerto','Solo no shutdown, sin revisar nada','Cambiar el puerto a trunk','Borrar la VLAN del puerto'],a:0}],
2:[
 {d:0,topic:'i2-2',q:'¿Cuántos hosts útiles tiene una /26?',o:['62','64','30','126'],a:0},
 {d:0,topic:'i2-4',q:'¿Qué indica una IP 169.254.x.x en una laptop?',o:['Que no obtuvo IP del DHCP','Que tiene una IP pública','Que está en IPv6','Que tiene IP fija'],a:0},
 {d:1,topic:'i2-1',q:'¿Por qué una PC con el gateway en otra subred ve a su red pero no sale a otras?',o:['Solo entrega directo en su subred; para salir necesita un gateway dentro de ella','Porque el DNS falla','Porque la máscara /24 no permite salir','Porque el switch bloquea al gateway'],a:0},
 {d:1,topic:'i2-5',q:'¿Es obligatorio que la VLAN 30 use la red 192.168.30.0/24?',o:['No: es convención; lo obligatorio es que cada VLAN tenga su propia subred y su gateway dentro','Sí, lo exige 802.1Q','Sí, o el switch no puede conmutar','Solo en switches Cisco'],a:0},
 {d:2,topic:'i2-3',q:'Caso: necesitas 4 subredes de al menos 50 hosts a partir de 192.168.40.0/24. ¿Qué prefijo usas y cuál es el broadcast de la tercera subred?',o:['/26 · 192.168.40.191','/27 · 192.168.40.95','/26 · 192.168.40.127','/25 · 192.168.40.255'],a:0},
 {d:2,topic:'i2-2',q:'Caso: en una VLAN que usa 192.168.10.0/24, la impresora tiene 192.168.10.200 con máscara /25 y no le contesta a las PCs .20 y .35. ¿Por qué?',o:['Con /25 la impresora cree que .1 a .127 están en otra red y les responde por un gateway que no está en su subred','Porque la impresora necesita la IP .254','Porque el switch no aprende su MAC','Porque las PCs deben tener /25'],a:0}],
3:[
 {d:0,topic:'t3-1',q:'¿Qué agrega 802.1Q a un frame que sale por un trunk?',o:['Una etiqueta con el VLAN ID','La IP de destino','El puerto TCP','Una segunda MAC'],a:0},
 {d:0,topic:'t3-2',q:'¿Qué VLAN viaja sin etiqueta por un trunk 802.1Q?',o:['La nativa','La VLAN 4094','Todas','Ninguna'],a:0},
 {d:1,topic:'t3-2',q:'¿Por qué conviene una VLAN nativa dedicada y sin puertos, como la 999?',o:['Evita que lo que viaja sin etiqueta caiga en una VLAN de usuarios y dificulta la doble etiqueta','Hace el trunk más rápido','Porque la VLAN 1 no existe en Aruba','Porque lo exige DTP'],a:0},
 {d:1,topic:'t3-3',q:'Cisco show interfaces trunk: la VLAN 30 aparece en "allowed" pero no en "allowed and active". ¿Qué significa?',o:['La VLAN 30 no existe en ese switch','La 30 es la nativa','STP la está bloqueando','El trunk está apagado'],a:0},
 {d:2,topic:'tsh3',q:'Caso: ACC1 (Aruba) tiene vlan trunk native 999 y el CORE (Cisco) native vlan 1 en el mismo enlace; las VLAN 10 y 20 viajan etiquetadas. ¿Qué se rompe?',o:['Solo lo que va sin etiqueta: la 999 de un lado se mezcla con la 1 del otro; 10 y 20 siguen funcionando','Las VLAN 10 y 20 dejan de pasar','El enlace se apaga solo','Nada, porque son fabricantes distintos'],a:0},
 {d:2,topic:'t3-5',q:'Caso: el trunk del CORE (Cisco) hacia recepción no tiene lista de permitidas. ¿Cuál es el riesgo y la corrección?',o:['Pasan todas las VLAN, incluida la de servidores: se define switchport trunk allowed vlan solo con las necesarias','No pasa ninguna VLAN: hay que agregar la lista','Solo pasa la nativa: hay que cambiarla','Ninguno: Cisco poda solo'],a:0}]
});
