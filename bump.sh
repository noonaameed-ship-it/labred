#!/bin/sh
# Cambia la versión de css/js en index.html para que los navegadores descarguen lo nuevo.
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(css/app\.css|js/config\.js|js/content\.js|js/content0\.js|js/content2\.js|js/lab\.js|js/app\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
# La página revisa este archivo para avisar/actualizarse sola cuando hay versión nueva.
printf '{"v":"%s"}\n' "$V" > version.json
