# PacketPath

Aprende redes jugando: desde qué es un frame hasta configurar switches de **Cisco IOS, Aruba AOS-CX y Juniper Junos** en una consola simulada, con vista 3D del resultado.

- **Zona 0 · Fundamentos:** frame y MAC, MAC address table, VLAN. Teoría corta con animaciones.
- **Zona 1 · Switching básico:** Lab 1, tu primera VLAN entre dos switches, como ticket de soporte.
- Cada misión pide explicar el concepto con tus palabras (mínimo 40 palabras, se aprueba con 8/10).
- XP, rangos, estrellas, insignias, racha y ranking.

## Estructura

| Archivo | Qué tiene |
|---|---|
| `index.html` | La página |
| `css/app.css` | Estilos |
| `js/content.js` | **Contenido**: lecciones, quizzes, examen de ubicación, niveles. Aquí se corrigen textos. |
| `js/lab.js` | Simulador de consola de los tres vendors y vista 3D |
| `js/app.js` | Mapa, puntos, insignias, cuentas, ranking y feedback |
| `js/config.js` | URL y llave pública de Supabase, correos de administradores |
| `supabase/schema.sql` | Tablas y reglas de seguridad de la base de datos |

## Puesta en marcha

1. **Base de datos:** en Supabase → SQL Editor, pega y ejecuta `supabase/schema.sql`.
2. **Llave pública:** Supabase → Project Settings → API Keys → copia la *publishable key* (o la *anon public* en "Legacy API keys") y pégala en `js/config.js`.
3. **Login sin correos de confirmación (piloto):** Authentication → Sign In / Providers → Email → desactiva *Confirm email*.
4. **URL del sitio:** Authentication → URL Configuration → *Site URL* = la dirección de GitHub Pages.
5. **Publicar:** Settings → Pages → Deploy from a branch → `main` / root.

Para probar en tu computadora: `python3 -m http.server` en esta carpeta y abre http://localhost:8000.

## Ver el avance y el feedback

- Feedback: Supabase → Table Editor → `feedback`.
- Explicaciones de los alumnos: SQL Editor → `select * from explicaciones order by updated_at desc;`

## Contribuir

Correcciones de comandos, salidas de `show` más fieles al equipo real, nuevas lecciones o vendors: abre un issue o un pull request. Las salidas de los comandos son simuladas y simplificadas.

Licencia MIT.
