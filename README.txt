# Portal "Alamedas de Santa Ana"

Este es un proyecto estático (HTML/CSS/JS) que usa [sql.js](https://sql.js.org/) para leer una base de datos SQLite en el navegador.

## Estructura
- `index.html` — Página inicial con noticias (lee las 3 más recientes de la tabla `Noticias`).
- `calendar.html` — Calendario de actividades (tabla `Calendario`).
- `consulta.html` — Consulta de inquilinos y pagos (tablas `Inquilino` y `PagoDeCuotas`).
- `assets/styles.css` — Estilos responsivos.
- `assets/app.js` — Lógica de carga de base de datos y render.
- `data/alamedas.db` — Base de datos de ejemplo.
- `_headers` — Configuración opcional para Netlify para servir el `.db` con el MIME Type correcto.

## Editar datos con DB Browser for SQLite
1. Abra `data/alamedas.db` con **DB Browser for SQLite**.
2. Edite o inserte registros en estas tablas:
   - `Noticias(Fecha TEXT YYYY-MM-DD, Noticia TEXT)`
   - `Calendario(Fecha TEXT YYYY-MM-DD, Titulo TEXT, Descripcion TEXT)`
   - `Inquilino(DPI TEXT, PrimerNombre TEXT, PrimerApellido TEXT, FechaNacimiento TEXT YYYY-MM-DD, NumeroCasa INTEGER)`
   - `PagoDeCuotas(NumeroCasa INTEGER, Anio INTEGER, Mes INTEGER 1..12, FechaPago TEXT YYYY-MM-DD)`
3. Guarde los cambios y suba de nuevo `alamedas.db` a su hosting/IIS en la carpeta `data/`.

## IIS (Windows) rápido
1. Active **IIS** en *Activar o desactivar características de Windows*.
   - Características mínimas: **Servidor web (IIS) → Servicios World Wide Web → Características de desarrollo de aplicaciones → Contenido estático (Static Content)**.
   - Opcional pero útil: **Exploración de directorios**, **IIS Management Console**.
2. Copie esta carpeta en `C:\inetpub\wwwroot\alamedas_portal`.
3. En **Administrador de IIS**:
   - Seleccione **Sitio web predeterminado** → **Tipos MIME** → **Agregar**:
     - Extensión: `.db` — Tipo MIME: `application/vnd.sqlite3`
     - (Opcional) Extensión: `.wasm` — Tipo MIME: `application/wasm`
   - (Opcional) Establezca `index.html` como Documento predeterminado.
4. Navegue a `http://localhost/alamedas_portal/`.

## Free hosting (Netlify)
1. Cree una cuenta en Netlify.
2. Arrastre y suelte la carpeta `alamedas_portal` en Netlify (*Deploy site*).
3. Asegúrese de que el archivo `_headers` se suba junto con `data/alamedas.db`. Esto fuerza el Content-Type correcto.
4. Abra la URL que Netlify le asigne.

¡Listo!