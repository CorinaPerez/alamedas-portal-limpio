
/* Carga SQL.js desde CDN y funciones utilitarias */
const SQL_WASM_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/";
const SQL_READY = initSqlJs({ locateFile: file => SQL_WASM_CDN + file });

async function openDb() {
  const SQL = await SQL_READY;
  const resp = await fetch("data/alamedas.db", { cache: "no-store" });
  if (!resp.ok) throw new Error("No se pudo cargar la base de datos");
  const buf = await resp.arrayBuffer();
  return new SQL.Database(new Uint8Array(buf));
}

function queryAll(db, sql, params = []){
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function fmtDate(iso){
  const d = new Date(iso + "T00:00:00");
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${day}/${m}/${y}`;
}

function monthNameES(m){
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m];
}

/* Página: Inicio -> noticias recientes */
async function initInicio(){
  const db = await openDb();
  const rows = queryAll(db, "SELECT Fecha, Noticia FROM Noticias ORDER BY Fecha DESC LIMIT 3");
  const cont = document.getElementById("news");
  cont.innerHTML = "";
  rows.forEach(r => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `<time>${fmtDate(r.Fecha)}</time><div>${r.Noticia}</div>`;
    cont.appendChild(div);
  });
}

/* Página: Calendario */
function buildCalendarGrid(year, month){ // month 0-11
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // hacer lunes=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for(let i=0; i<startDay; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(new Date(year, month, d));
  while(cells.length % 7 !== 0) cells.push(null);
  return cells;
}

async function initCalendario(){
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  const selectMonth = document.getElementById("selMonth");
  const selectYear = document.getElementById("selYear");
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calTitle");
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("backdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  document.getElementById("closeModal").addEventListener("click", ()=> backdrop.classList.remove("show"));
  backdrop.addEventListener("click", (e)=>{ if(e.target === backdrop) backdrop.classList.remove("show"); });

  // Opciones de mes/año
  selectMonth.innerHTML = Array.from({length:12}, (_,i)=> `<option value="${i}">${monthNameES(i)}</option>`).join("");
  const years = [];
  for(let y=year-2; y<=year+2; y++) years.push(`<option value="${y}">${y}</option>`);
  selectYear.innerHTML = years.join("");

  selectMonth.value = String(month);
  selectYear.value = String(year);

  const db = await openDb();
  const events = queryAll(db, "SELECT Fecha, Titulo, Descripcion FROM Calendario");

  function render(){
    grid.innerHTML = "";
    title.textContent = `${monthNameES(month)} ${year}`;
    const cells = buildCalendarGrid(year, month);
    const evByDay = {};
    events.forEach(ev => {
      const d = new Date(ev.Fecha + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month){
        const key = d.getDate();
        (evByDay[key] ||= []).push(ev);
      }
    });
    cells.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "day";
      if (d){
        const dateDiv = document.createElement("div");
        dateDiv.className = "date";
        dateDiv.textContent = String(d.getDate());
        cell.appendChild(dateDiv);
        (evByDay[d.getDate()] || []).forEach(ev => {
          const eDiv = document.createElement("div");
          eDiv.className = "event";
          eDiv.textContent = ev.Titulo;
          eDiv.addEventListener("click", ()=>{
            modalTitle.textContent = ev.Titulo + " — " + fmtDate(ev.Fecha);
            modalText.textContent = ev.Descripcion;
            backdrop.classList.add("show");
          });
          cell.appendChild(eDiv);
        });
      }
      grid.appendChild(cell);
    });
  }

  selectMonth.addEventListener("change", ()=>{ month = Number(selectMonth.value); render(); });
  selectYear.addEventListener("change", ()=>{ year = Number(selectYear.value); render(); });
  render();
}

/* Página: Consulta de inquilinos y pagos */
function isValidDPI(s){
  // Validar 13 dígitos (se permite con o sin espacios/guiones)
  const digits = (s||"").replace(/[^0-9]/g,"");
  return digits.length === 13;
}
function normalizeDPI(s){ return (s||"").replace(/[^0-9]/g,""); }

async function initConsulta(){
  const db = await openDb();
  const form = document.getElementById("frmConsulta");
  const status = document.getElementById("status");
  const histBtn = document.getElementById("btnHistorial");
  const histStart = document.getElementById("histStart");
  const histEnd = document.getElementById("histEnd");
  const histOut = document.getElementById("historial");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  form.addEventListener("submit", (e)=> e.preventDefault());

  document.getElementById("btnConsultar").addEventListener("click", ()=> {
    status.textContent = "";
    status.className = "status";
    const dpi = normalizeDPI(document.getElementById("dpi").value);
    const casa = Number(document.getElementById("casa").value);
    const nombre = (document.getElementById("nombre").value || "").trim();
    const apellido = (document.getElementById("apellido").value || "").trim();
    const fnac = document.getElementById("fnac").value;

    // Validaciones básicas
    const errors = [];
    if (!isValidDPI(dpi)) errors.push("DPI debe tener 13 dígitos.");
    if (!casa) errors.push("Número de casa es requerido.");
    if (!nombre) errors.push("Primer nombre es requerido.");
    if (!apellido) errors.push("Primer apellido es requerido.");
    if (!fnac) errors.push("Fecha de nacimiento es requerida.");
    if (errors.length){
      status.textContent = errors.join(" ");
      status.classList.add("bad");
      return;
    }

    const rowsInq = queryAll(db,
      "SELECT * FROM Inquilino WHERE DPI=? AND PrimerNombre=? AND PrimerApellido=? AND FechaNacimiento=? AND NumeroCasa=?",
      [dpi, nombre, apellido, fnac, casa]
    );
    if (!rowsInq.length){
      status.textContent = "Datos del inquilino no coinciden con nuestros registros.";
      status.classList.add("bad");
      return;
    }

    const rowsPago = queryAll(db,
      "SELECT 1 FROM PagoDeCuotas WHERE NumeroCasa=? AND Anio=? AND Mes=? LIMIT 1",
      [casa, currentYear, currentMonth]
    );
    if (rowsPago.length){
      status.textContent = "Cuota de mantenimiento al día";
      status.classList.add("ok");
    } else {
      status.textContent = "Cuota de mantenimiento pendiente";
      status.classList.add("bad");
    }
  });

  histBtn.addEventListener("click", ()=>{
    histOut.innerHTML = "";
    const dpi = normalizeDPI(document.getElementById("dpi").value);
    const casa = Number(document.getElementById("casa").value);
    if (!isValidDPI(dpi) || !casa){
      histOut.innerHTML = "<div class='helper'>Complete DPI (13 dígitos) y Número de Casa para consultar historial.</div>";
      return;
    }
    const start = histStart.value ? new Date(histStart.value+"T00:00:00") : null;
    const end = histEnd.value ? new Date(histEnd.value+"T23:59:59") : null;

    let rows = queryAll(db,
      "SELECT Anio, Mes, FechaPago FROM PagoDeCuotas WHERE NumeroCasa=? ORDER BY Anio DESC, Mes DESC",
      [casa]
    );
    if (start || end){
      rows = rows.filter(r => {
        const d = new Date(r.FechaPago+"T00:00:00");
        return (!start || (d>=start)) && (!end || (d<=end));
      });
    }
    if (!rows.length){
      histOut.innerHTML = "<div class='helper'>Sin registros en el rango indicado.</div>";
      return;
    }
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.innerHTML = "<thead><tr><th style='text-align:left;padding:.4rem;border-bottom:1px solid #22314f'>Año</th><th style='text-align:left;padding:.4rem;border-bottom:1px solid #22314f'>Mes</th><th style='text-align:left;padding:.4rem;border-bottom:1px solid #22314f'>Fecha de Pago</th></tr></thead>";
    const tbody = document.createElement("tbody");
    rows.forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style='padding:.4rem;border-bottom:1px solid #22314f'>${r.Anio}</td>
                      <td style='padding:.4rem;border-bottom:1px solid #22314f'>${r.Mes}</td>
                      <td style='padding:.4rem;border-bottom:1px solid #22314f'>${fmtDate(r.FechaPago)}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    histOut.appendChild(table);
  });
}

window.AlApp = { initInicio, initCalendario, initConsulta };
