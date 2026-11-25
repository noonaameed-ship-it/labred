/* PacketPath · Labs 3D dentro del track: 2 por zona, obligatorios, antes de la certificación. */
(function(){
window.D3PASS=70;
window.D3={
 d0a:{z:0,t:'Lab 3D: conecta los escritorios'},d0b:{z:0,t:'Lab 3D: encuentra el cable malo'},
 d1a:{z:1,t:'Lab 3D: configura un switch nuevo'},d1b:{z:1,t:'Lab 3D: el switch del segundo piso'},
 d2a:{z:2,t:'Lab 3D: IP de gestión al switch'},d2b:{z:2,t:'Lab 3D: gestión de ACC2 y verificación'},
 d3a:{z:3,t:'Lab 3D: sube el piso al CORE (trunk)'},d3b:{z:3,t:'Lab 3D: el otro lado del trunk'},
 d4a:{z:4,t:'Lab 3D: el CORE como root bridge'},d4b:{z:4,t:'Lab 3D: root de respaldo'},
 d5a:{z:5,t:'Lab 3D: junta dos cables en un LAG'},d5b:{z:5,t:'Lab 3D: el LAG del lado del CORE'},
 d5c:{z:5,t:'Lab 3D: stack y multichasis en tu fabricante'}};
for(const[id,o]of Object.entries(D3)){const L=LEVELS[o.z];if(!L||!L.items)continue;if(L.items.some(i=>i.id===id))continue;
 const ix=L.items.findIndex(i=>i.exam);const it={id,t:o.t,h:'#sitio-'+id,d3:true};if(ix<0)L.items.push(it);else L.items.splice(ix,0,it)}
Object.assign(TID,Object.fromEntries(Object.keys(D3).map(id=>[id,'3D-'+id.slice(1).toUpperCase()])));
Object.assign(GLYPH,Object.fromEntries(Object.keys(D3).map(id=>[id,'txt:3D'])));
})();
