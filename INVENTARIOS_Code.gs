// =====================================================
// APP DE INVENTARIOS · Clean My BnB  (proyecto separado)
// Usa el MISMO archivo Admin y la MISMA carpeta de Drive que el Hub.
// =====================================================
// Archivo Admin: de aquí se leen STAFF_WEST / STAFF_EAST, CLIENTES y UNIDADES (los mismos que usa el Hub)
const ADMIN_SS_ID     = '1HM4u90QDP4NoWNsPMK_QbCoJwqGpfJd9jcwJTki5v5Y';
// Archivo donde se GUARDAN los inventarios (INV_REGISTRO, INV_DETALLE, INV_ERRORES y los REPORTE_*).
// Si algún día quieres East en otro archivo, cambia solo el ID de EAST.
const INV_SS_IDS = {
  WEST: '10L9qef4BtO7u1RLtluiikdTvTK485Ql6JSZw1MLomD8',   // WEST INVENTORIES
  EAST: '10L9qef4BtO7u1RLtluiikdTvTK485Ql6JSZw1MLomD8'    // por ahora, el mismo archivo
};
const DRIVE_FOLDER_ID = '1Hk9fwc4lKXC7dkJbdwP51Ue29E80LjUi';
const TIMEZONE        = 'America/Toronto';
const ADMIN_PASS      = 'Lancelot';
// Pega aquí el URL /exec de tu app principal (Hub) para mostrar el botón "Hub". Vacío = no se muestra.
const HUB_URL         = '';
const LOGO_URL        = 'https://i.postimg.cc/TY4rPG9j/bnblogo.png';
const MAX_FOTOS       = 6;
const TEST_CLEANER    = 'PRUEBA SISTEMA';   // los inventarios de prueba no cuentan en reportes ni comparaciones

// Grupos de clientes para los reportes.
// Un cliente entra al grupo si su nombre contiene alguna de estas palabras (sin importar mayúsculas).
// "peter" solo se busca en el nombre del CLIENTE (no en el edificio "101 Peter").
const GRUPOS_REPORTE = [
  // pdfNombre = cómo aparece el cliente en el PDF que se le envía
  { id: 'rp', nombre: 'Return Policy + Mason PM + Peter', pdfNombre: 'Return Policy', palabras: ['return policy', 'mason', 'peter'] }
];

const TIPO_LBL = { supplies: 'SUPPLIES', linen: 'LINEN', cutlery: 'KITCHEN' };     // código interno (no cambiar: así se guarda en la hoja)
const TIPO_ARCHIVO = { supplies: 'SUPPLIES', linen: 'BED LINEN', cutlery: 'KITCHEN' }; // nombre en archivos de Drive
const TIPO_NOMBRE = { supplies: 'SUPPLIES', linen: 'ROPA DE CAMA (BED LINEN)', cutlery: 'COCINA (KITCHEN)' }; // títulos de reportes

// Registro maestro: UNA fila por inventario (con la "foto" completa en JSON para comparar)
const LOG_TAB = 'INV_REGISTRO';
const LOG_HEADER = ['ID', 'Guardado', 'Fecha', 'Side', 'Tipo', 'Cleaner', 'Cliente', 'Building', 'Unit', 'Tamaño cama',
  'Artículos', 'Total piezas', 'En cero', 'Por pedir', 'Checklist en NO', 'Cambios vs anterior', 'ID anterior', 'Fecha anterior',
  'Notas', 'PDF', 'Fotos', 'Carpeta Drive', 'JSON'];
// Detalle: UNA fila por artículo de cada inventario, con valor anterior y diferencia
const DET_TAB = 'INV_DETALLE';
const DET_HEADER = ['ID', 'Fecha', 'Side', 'Tipo', 'Cliente', 'Building', 'Unit', 'Cleaner', 'Tamaño cama',
  'Sección', 'Artículo', 'Control', 'Valor', 'Valor anterior', 'Diferencia', 'Cambio'];
// Errores: si algo falla al guardar, aquí queda anotado qué y por qué
const ERR_TAB = 'INV_ERRORES';
const ERR_HEADER = ['Fecha', 'Paso', 'Cleaner', 'Building', 'Unit', 'Tipo', 'Error', 'Detalle'];

const UNIDADES_HEADER = ['Building', 'Unit', 'Client', 'Side', 'Last Supplies', 'Last Linen', 'Last Kitchen', 'Total Inventories'];

// Artículos que se cuentan en cada reporte, en orden (nombres tal como se guardan)
const REPORT_ITEMS = {
  linen: ['Flat Sheets', 'Fitted Sheets', 'Pillowcases', 'Pillows', 'Duvet Covers', 'Duvets / Comforters',
    'Bath Towels', 'Hand Towels', 'Grey Face Towels', 'Bath Mats'],
  supplies: ['Toilet Paper (rolls)', 'Paper Towel (rolls)', 'Body Wash (bottle)', 'Shampoo (bottle)', 'Conditioner (bottle)',
    'Hand Soap (refill bottle)', 'Garbage Bags (kitchen)', 'Garbage Bags (washroom)', 'Light Bulbs', 'Batteries (AA)', 'Batteries (AAA)', 'Fob Batteries'],
  cutlery: ['Dinner Forks', 'Salad / Dessert Forks', 'Dinner Knives', 'Steak Knives', 'Tablespoons / Soup Spoons', 'Teaspoons',
    'Dinner Plates', 'Side Plates', 'Bowls', 'Mugs', 'Drinking Glasses', 'Wine Glasses']
};
const REPORT_TAB = { linen: 'REPORTE_LINEN', supplies: 'REPORTE_SUPPLIES', cutlery: 'REPORTE_KITCHEN' };

// ===== MÍNIMOS DE ROPA DE CAMA (par) =====
// Cada cama lleva lo puesto + 1 cambio para el siguiente turno. Los bath mats no llevan cambio.
// Camas y baños de cada unidad: pestaña CUARTOS del archivo Admin ("1+1" = 2 camas; "0" = estudio = 1 cama).
const PAR_POR_CAMA = {
  'Flat Sheets': 2,          // 1 puesta + 1 cambio
  'Fitted Sheets': 2,        // 1 puesta + 1 cambio
  'Pillowcases': 8,          // 4 puestas + 4 cambio
  'Pillows': 4,
  'Duvet Covers': 2,         // 1 puesta + 1 cambio
  'Duvets / Comforters': 1,
  'Bath Towels': 2,          // 1 + 1 cambio
  'Hand Towels': 2,
  'Grey Face Towels': 2
};
const PAR_POR_BANO = { 'Bath Mats': 1 };   // 1 por baño completo (los medios baños no cuentan)
const CUARTOS_TAB = 'CUARTOS';

function parseCamas(txt) {
  const t = String(txt === undefined || txt === null ? '' : txt).trim();
  if (!t) return null;
  const nums = t.match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  const n = nums.reduce((a, x) => a + Number(x), 0);
  return n > 0 ? n : 1;                      // "0" = estudio con 1 cama
}
function parseBanos(txt) {
  const n = parseFloat(String(txt === undefined || txt === null ? '' : txt).replace(',', '.'));
  if (isNaN(n)) return null;
  return Math.max(1, Math.floor(n));         // 1.5 -> 1 baño completo
}

// { 'BUILDING|UNIT': { camasTxt, banosTxt, camas, banos } } desde la pestaña CUARTOS
function cuartosMap() {
  const out = {};
  const sh = adminSS().getSheetByName(CUARTOS_TAB);
  if (!sh || sh.getLastRow() < 2) return out;
  const data = sh.getDataRange().getDisplayValues();
  const h = data[0].map(x => String(x).trim().toLowerCase());
  const iB = h.indexOf('building'), iU = h.indexOf('unit'), iBed = h.indexOf('bedrooms'), iBa = h.indexOf('bathrooms');
  for (let i = 1; i < data.length; i++) {
    const b = data[i][iB], u = data[i][iU];
    if (!invNorm(b) || !invNorm(u)) continue;
    const ct = iBed > -1 ? String(data[i][iBed]).trim() : '', bt = iBa > -1 ? String(data[i][iBa]).trim() : '';
    out[invKey(b, u)] = { camasTxt: ct, banosTxt: bt, camas: parseCamas(ct), banos: parseBanos(bt) };
  }
  return out;
}

function parDeUnidad(items, info) {
  if (!info || !info.camas) return null;
  return items.map(it => {
    if (PAR_POR_CAMA[it] !== undefined) return PAR_POR_CAMA[it] * info.camas;
    if (PAR_POR_BANO[it] !== undefined) return info.banos ? PAR_POR_BANO[it] * info.banos : null;
    return null;
  });
}

// Registro SEPARADO por tipo: una fila por inventario y UNA COLUMNA POR ARTÍCULO (fácil de leer y comparar)
const TIPO_TAB = { linen: 'INV_LINEN', supplies: 'INV_SUPPLIES', cutlery: 'INV_KITCHEN' };
function tipoBaseHeader(tipo) {
  return ['ID', 'Fecha', 'Side', 'Cleaner', 'Cliente', 'Building', 'Unit']
    .concat(tipo === 'linen' ? ['Tamaño cama'] : [])
    .concat(['Total piezas', 'En cero'])
    .concat(tipo === 'supplies' ? ['Por pedir', 'Checklist en NO'] : [])
    .concat(['Cambios vs anterior', 'Notas', 'PDF', 'Fotos']);
}

// ==========================================
// ENTRADA WEB  (?side=west|east&lang=en|es)
// ==========================================
function doGet(e) {
  const p = (e && e.parameter) || {};
  const side = String(p.side || '').toLowerCase();
  const t = HtmlService.createTemplateFromFile('Index');
  t.boot = JSON.stringify({
    side: (side === 'west' || side === 'east') ? side : '',
    lang: String(p.lang || '').toLowerCase() === 'es' ? 'es' : 'en',
    hub: HUB_URL
  });
  return t.evaluate()
    .setTitle('Clean My BnB | Inventories')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// UTILIDADES
// ==========================================
let _ss = null;
function adminSS() { return _ss || (_ss = SpreadsheetApp.openById(ADMIN_SS_ID)); }
const _invSS = {};
function invSSId(side) { return INV_SS_IDS[String(side || '').toUpperCase()] || INV_SS_IDS.WEST; }
function invSS(side) { const id = invSSId(side); return _invSS[id] || (_invSS[id] = SpreadsheetApp.openById(id)); }
// Archivos de inventarios distintos (si West y East son el mismo, solo uno)
function invSSList() {
  const seen = {}, out = [];
  ['WEST', 'EAST'].forEach(sd => { const id = invSSId(sd); if (!seen[id]) { seen[id] = true; out.push(invSS(sd)); } });
  return out;
}
// Los reportes se guardan en el archivo de la zona elegida (o en el de West si son ambas)
function reportSS(side) { return invSS(side || 'WEST'); }

function invNorm(s) { return String(s === undefined || s === null ? '' : s).split(/\s+/).filter(String).join(' '); }
function invKey(b, u) { return invNorm(b).toUpperCase() + '|' + invNorm(u).toUpperCase(); }
function fmtDate(v) { return v instanceof Date ? Utilities.formatDate(v, TIMEZONE, 'yyyy-MM-dd') : String(v || '').slice(0, 10); }
function fechaDate(str) { const p = String(str).split('-'); return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); }
function hoyStr() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'); }
function mostrar(v) { return (v === undefined || v === null || v === '') ? '-' : String(v); }
function limpiarNombre(s) { return String(s).split('/').join('-').split(':').join('-'); }
function esLocker(u) { return String(u).toUpperCase().indexOf('STORAGE') === 0; }

function getOrCreateFolder(parent, name) {
  const f = parent.getFoldersByName(name);
  return f.hasNext() ? f.next() : parent.createFolder(name);
}

// Devuelve la pestaña y se asegura de que tenga TODOS los encabezados (repara pestañas vacías o creadas a mano)
function sheetWithHeader(name, header, book) {
  const s = book || adminSS();
  let sh = s.getSheetByName(name);
  if (!sh) sh = s.insertSheet(name);
  const lastCol = sh.getLastColumn();
  const first = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(x => String(x).trim()) : [];
  if (!first.some(String)) {
    if (sh.getLastRow() > 0) sh.insertRowBefore(1);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#A6FDFF');
    sh.setFrozenRows(1);
    return sh;
  }
  const faltan = header.filter(h => first.indexOf(h) === -1);
  if (faltan.length) sh.getRange(1, first.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#A6FDFF');
  return sh;
}

// Mapa nombre de columna -> índice (para no depender del orden de las columnas)
function headerMap(sh) {
  const h = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(x => String(x).trim());
  const m = {};
  h.forEach((x, i) => { if (x && m[x] === undefined) m[x] = i; });
  return { h: h, m: m };
}
function rowFromObj(hm, obj) { return hm.h.map(name => (obj[name] !== undefined ? obj[name] : '')); }

function logError(paso, d, e) {
  try {
    d = d || {};
    let book;
    try { book = invSS(d.side); } catch (x) { book = adminSS(); }
    const sh = sheetWithHeader(ERR_TAB, ERR_HEADER, book);
    sh.appendRow(rowFromObj(headerMap(sh), {
      'Fecha': new Date(), 'Paso': paso, 'Cleaner': d.cleaner || '', 'Building': d.building || '', 'Unit': d.unit ? "'" + d.unit : '',
      'Tipo': d.tipo || '', 'Error': String(e && e.message ? e.message : e).slice(0, 2000), 'Detalle': String(e && e.stack ? e.stack : '').slice(0, 2000)
    }));
  } catch (x) { console.error('No se pudo anotar el error: ' + x); }
  console.error('[' + paso + '] ' + (e && e.message ? e.message : e));
}

// ==========================================
// LISTAS: personal, clientes y unidades
// ==========================================
function getInvLists(force) {
  const cache = CacheService.getScriptCache();
  if (!force) { try { const hit = cache.get('INV_LISTS_V2'); if (hit) return JSON.parse(hit); } catch (e) {} }
  const errors = [];
  function safe(fn, label) { try { return fn(); } catch (e) { errors.push(label + ': ' + e.message); return []; } }
  const out = {
    west: safe(() => staffNames('STAFF_WEST'), 'STAFF_WEST'),
    east: safe(() => staffNames('STAFF_EAST'), 'STAFF_EAST'),
    clientes: safe(clientNames, 'CLIENTES'),
    unidades: safe(unidadesList, 'UNIDADES'),
    grupos: GRUPOS_REPORTE.map(g => ({ id: g.id, nombre: g.nombre })),
    ts: Date.now()
  };
  if (errors.length) out.error = errors.join(' | ');
  else { try { cache.put('INV_LISTS_V2', JSON.stringify(out), 300); } catch (e) {} }
  return out;
}

function staffNames(tab) {
  const sh = adminSS().getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return [];
  const set = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(r => { const n = String(r[0]).trim().toUpperCase(); if (n) set[n] = true; });
  return Object.keys(set).sort((a, b) => a.localeCompare(b));
}

function clientNames() {
  const sh = adminSS().getSheetByName('CLIENTES');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(r => String(r[0]).trim()).filter(String).sort((a, b) => a.localeCompare(b));
}

function unidadesSheet() { return sheetWithHeader('UNIDADES', UNIDADES_HEADER); }

function unidadesList() {
  const data = unidadesSheet().getDataRange().getDisplayValues();
  const h = data[0].map(x => String(x).trim());
  const iB = h.indexOf('Building'), iU = h.indexOf('Unit'), iC = h.indexOf('Client'), iS = h.indexOf('Side');
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const b = invNorm(data[i][iB]), u = invNorm(data[i][iU]);
    if (b && u) out.push([b, u, iC > -1 ? invNorm(data[i][iC]) : '', iS > -1 ? invNorm(data[i][iS]).toUpperCase() : '']);
  }
  return out;
}

// ==========================================
// LECTURA DEL REGISTRO
// ==========================================
function leerRegistros(filtro) {
  const out = [];
  invSSList().forEach((book, bi) => leerRegistrosDe(book, bi, filtro, out));
  return out;
}

function leerRegistrosDe(book, bi, filtro, out) {
  const sh = book.getSheetByName(LOG_TAB);
  if (!sh || sh.getLastRow() < 2) return out;
  const hm = headerMap(sh), m = hm.m;
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, hm.h.length).getValues();
  const g = (r, name) => (m[name] === undefined ? '' : r[m[name]]);
  data.forEach((r, i) => {
    if (!String(g(r, 'ID'))) return;
    const o = {
      row: bi * 1000000 + i + 2, id: String(g(r, 'ID')), guardado: g(r, 'Guardado') instanceof Date ? g(r, 'Guardado').getTime() : 0,
      fecha: fmtDate(g(r, 'Fecha')), side: String(g(r, 'Side')).toUpperCase(), tipo: String(g(r, 'Tipo')).toUpperCase(),
      cleaner: String(g(r, 'Cleaner') || ''), cliente: invNorm(g(r, 'Cliente')), building: invNorm(g(r, 'Building')), unit: invNorm(g(r, 'Unit')),
      size: String(g(r, 'Tamaño cama') || ''), notas: String(g(r, 'Notas') || ''), pdf: String(g(r, 'PDF') || ''),
      fotos: String(g(r, 'Fotos') || '').split('\n').filter(String), folder: String(g(r, 'Carpeta Drive') || ''),
      cambios: String(g(r, 'Cambios vs anterior') || ''), piezas: g(r, 'Total piezas'), cero: g(r, 'En cero'),
      pedir: g(r, 'Por pedir'), checkNo: g(r, 'Checklist en NO'), json: String(g(r, 'JSON') || '')
    };
    if (!filtro || filtro(o)) out.push(o);
  });
  return out;
}

// Convierte el JSON guardado en { items, custom, values{nombre: valor} }
function snapDe(reg) {
  let snap = {};
  try { snap = JSON.parse(reg.json || '{}'); } catch (e) {}
  const values = {};
  (snap.items || []).forEach(it => { values[it.k] = it.v; });
  (snap.custom || []).forEach(c => { values[c.n] = c.v; });
  return { items: snap.items || [], custom: snap.custom || [], values: values };
}

function ordenarRecientes(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  if (a.guardado !== b.guardado) return b.guardado - a.guardado;
  return b.row - a.row;
}

// ==========================================
// INVENTARIO ANTERIOR (para comparar)
// En linen se compara con el anterior del MISMO tamaño de cama.
// ==========================================
function buscarAnterior(building, unit, tipo, fechaMax, size) {
  const key = invKey(building, unit), tl = TIPO_LBL[tipo];
  const list = leerRegistros(r => r.tipo === tl && invKey(r.building, r.unit) === key &&
    r.cleaner.toUpperCase() !== TEST_CLEANER &&
    (!fechaMax || r.fecha <= fechaMax) &&
    (tipo !== 'linen' || !size || !r.size || r.size === size));
  if (!list.length) return null;
  list.sort(ordenarRecientes);
  const reg = list[0], s = snapDe(reg);
  return { id: reg.id, fecha: reg.fecha, cleaner: reg.cleaner, size: reg.size, notas: reg.notas, pdf: reg.pdf,
    items: s.items, custom: s.custom, values: s.values };
}

// La app lo llama al elegir unidad, para mostrar "Antes: X" junto a cada artículo
function getUltimoInventario(building, unit, tipo, fecha, size) {
  try { return buscarAnterior(building, unit, tipo, fecha, size) || { none: true }; }
  catch (e) { logError('anterior', { building: building, unit: unit, tipo: tipo }, e); return { error: e.toString() }; }
}

function comparar(kind, actual, anterior, hayAnterior) {
  if (!hayAnterior) return { prev: '', dif: '', cambio: 'PRIMERO' };
  if (anterior === undefined || anterior === null || anterior === '') return { prev: '', dif: '', cambio: 'SIN DATO' };
  if (kind === 'count') {
    const dif = Math.round(((Number(actual) || 0) - (Number(anterior) || 0)) * 100) / 100;
    return { prev: Number(anterior) || 0, dif: dif, cambio: dif > 0 ? 'SUBIÓ' : dif < 0 ? 'BAJÓ' : 'IGUAL' };
  }
  return { prev: anterior, dif: '', cambio: String(actual) === String(anterior) ? 'IGUAL' : 'CAMBIÓ' };
}

// ==========================================
// GUARDAR INVENTARIO
// Orden: 1) registro  2) detalle  3) PDF y fotos en Drive  4) UNIDADES.
// Si falla el PDF o Drive, el inventario YA quedó registrado y el error se anota en INV_ERRORES.
// ==========================================
function guardarInventario(d) {
  let paso = 'inicio';
  const avisos = [];
  const lock = LockService.getScriptLock();
  try {
    d = d || {};
    lock.waitLock(30000);
    paso = 'validar';
    if (!TIPO_LBL[d.tipo]) throw new Error('Tipo de inventario inválido: ' + d.tipo);
    if (!d.cleaner || !d.building || !d.unit || !d.fecha) throw new Error('Faltan datos (cleaner, edificio, unidad o fecha)');
    const side = String(d.side || '').toUpperCase();
    const now = new Date();
    const esPrueba = String(d.cleaner).toUpperCase() === TEST_CLEANER;

    paso = 'unidad';
    const u = resolverUnidad(d, side, esPrueba);
    const building = u.building, unit = u.unit, client = u.client;

    const id = /^INV-[0-9A-Z-]{6,40}$/.test(String(d.id || ''))
      ? String(d.id)
      : 'INV-' + Utilities.formatDate(now, TIMEZONE, 'yyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);

    paso = 'comparar';
    let prev = null;
    try { prev = buscarAnterior(building, unit, d.tipo, d.fecha, d.size); }
    catch (e) { logError('comparar', d, e); avisos.push('No se pudo comparar con el anterior'); }
    const prevVals = prev ? prev.values : null;
    const all = (d.items || []).map(it => ({ sec: it.sectionEn, key: String(it.key), kind: it.kind, col: it.colKey, v: it.value }))
      .concat((d.custom || []).filter(c => c && c.name)
        .map(c => ({ sec: 'Additional items', key: invNorm(c.name), kind: 'count', col: 'qty', v: Number(c.value) || 0, custom: true })));

    let piezas = 0, cero = 0, pedir = 0, checkNo = 0;
    const cambios = [];
    all.forEach(it => {
      const cmp = comparar(it.kind, it.v, prevVals ? prevVals[it.key] : undefined, !!prevVals);
      it.prev = cmp.prev; it.dif = cmp.dif; it.cambio = cmp.cambio;
      if (it.kind === 'count') { piezas += Number(it.v) || 0; if (!(Number(it.v) > 0)) cero++; }
      if (it.col === 'order' && it.v === 'YES') pedir++;
      if (it.col === 'status' && it.v === 'NO') checkNo++;
      if (cmp.cambio === 'BAJÓ' || cmp.cambio === 'SUBIÓ' || cmp.cambio === 'CAMBIÓ') cambios.push(it.key + ': ' + mostrar(cmp.prev) + ' → ' + mostrar(it.v));
    });
    piezas = Math.round(piezas * 100) / 100;
    const resumenCambios = !prev ? 'Primer inventario de este tipo en la unidad'
      : (cambios.length ? cambios.length + ' cambio(s): ' + cambios.join('; ') : 'Sin cambios');

    // 1) REGISTRO (lo más importante: se escribe antes que cualquier otra cosa)
    paso = 'registro';
    const snap = {
      v: 1, id: id, fecha: d.fecha, tipo: d.tipo, side: side, size: d.size || '', notas: d.notas || '',
      items: all.filter(x => !x.custom).map(x => ({ s: x.sec, k: x.key, t: x.kind, c: x.col, v: x.v })),
      custom: all.filter(x => x.custom).map(x => ({ n: x.key, v: x.v }))
    };
    const fecha = fechaDate(d.fecha);
    const regSh = sheetWithHeader(LOG_TAB, LOG_HEADER, invSS(side));
    const regHm = headerMap(regSh);
    regSh.appendRow(rowFromObj(regHm, {
      'ID': id, 'Guardado': now, 'Fecha': fecha, 'Side': side, 'Tipo': TIPO_LBL[d.tipo], 'Cleaner': d.cleaner, 'Cliente': client,
      'Building': building, 'Unit': "'" + unit, 'Tamaño cama': d.size || '', 'Artículos': all.length, 'Total piezas': piezas,
      'En cero': cero, 'Por pedir': pedir, 'Checklist en NO': checkNo, 'Cambios vs anterior': resumenCambios.slice(0, 5000),
      'ID anterior': prev ? prev.id : '', 'Fecha anterior': prev ? prev.fecha : '', 'Notas': d.notas || '',
      'PDF': 'Generando...', 'Fotos': '', 'Carpeta Drive': '', 'JSON': JSON.stringify(snap)
    }));
    SpreadsheetApp.flush();
    const regRow = regSh.getLastRow();

    // 2) DETALLE
    paso = 'detalle';
    try {
      const detSh = sheetWithHeader(DET_TAB, DET_HEADER, invSS(side));
      const detHm = headerMap(detSh);
      const rows = all.map(x => rowFromObj(detHm, {
        'ID': id, 'Fecha': fecha, 'Side': side, 'Tipo': TIPO_LBL[d.tipo], 'Cliente': client, 'Building': building, 'Unit': "'" + unit,
        'Cleaner': d.cleaner, 'Tamaño cama': d.size || '', 'Sección': x.sec, 'Artículo': x.key,
        'Control': x.kind === 'count' ? 'Cantidad' : (x.col === 'order' ? '¿Pedir?' : 'Estado'),
        'Valor': x.v, 'Valor anterior': x.prev, 'Diferencia': x.dif, 'Cambio': x.cambio
      }));
      if (rows.length) detSh.getRange(detSh.getLastRow() + 1, 1, rows.length, detHm.h.length).setValues(rows);
    } catch (e) { logError('detalle', d, e); avisos.push('No se guardó el detalle: ' + e.message); }

    // 3) DRIVE: PDF y fotos en INVENTARIOS / Cliente / Building - Unit
    paso = 'drive';
    let pdfUrl = 'Sin PDF', folderUrl = '';
    const fotos = [];
    try {
      const parent = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const unitFolder = getOrCreateFolder(
        getOrCreateFolder(getOrCreateFolder(parent, 'INVENTARIOS'), client || 'SIN CLIENTE'),
        limpiarNombre(building + ' - ' + unit));
      folderUrl = unitFolder.getUrl();
      const base = limpiarNombre(d.fecha + '_' + TIPO_ARCHIVO[d.tipo] + (d.size ? '_' + d.size : '') + '_' + building + ' ' + unit + '_' + id);
      try {
        const html = String(d.html || '<p>' + id + '</p>').split(LOGO_URL).join(logoDataUri());
        const pdf = Utilities.newBlob(html, MimeType.HTML, base + '.html').getAs(MimeType.PDF).setName(base + '.pdf');
        pdfUrl = unitFolder.createFile(pdf).getUrl();
      } catch (e) { pdfUrl = 'Error PDF: ' + e.message; logError('pdf', d, e); avisos.push('No se generó el PDF'); }
      (d.fotos || []).slice(0, MAX_FOTOS).forEach((f, i) => {
        try {
          const blob = Utilities.newBlob(Utilities.base64Decode(f.b64), f.type || 'image/jpeg', base + '_foto' + (i + 1) + '.jpg');
          fotos.push(unitFolder.createFile(blob).getUrl());
        } catch (e) { logError('foto ' + (i + 1), d, e); }
      });
    } catch (e) { pdfUrl = 'Error Drive: ' + e.message; logError('drive', d, e); avisos.push('No se pudo usar la carpeta de Drive'); }

    paso = 'links';
    try {
      const set = (name, val) => { if (regHm.m[name] !== undefined) regSh.getRange(regRow, regHm.m[name] + 1).setValue(val); };
      set('PDF', pdfUrl); set('Fotos', fotos.join('\n')); set('Carpeta Drive', folderUrl);
    } catch (e) { logError('links', d, e); }

    // 4) REGISTRO SEPARADO POR TIPO (INV_LINEN / INV_SUPPLIES / INV_KITCHEN)
    paso = 'registro por tipo';
    try {
      escribirFilaTipo(invSS(side), d.tipo, {
        id: id, fecha: fecha, side: side, cleaner: d.cleaner, cliente: client, building: building, unit: unit, size: d.size || '',
        piezas: piezas, cero: cero, pedir: pedir, checkNo: checkNo, cambios: resumenCambios, notas: d.notas || '',
        pdf: pdfUrl, fotos: fotos.join('\n'), items: snap.items, custom: snap.custom
      });
    } catch (e) { logError('registro por tipo', d, e); avisos.push('No se escribió en ' + TIPO_TAB[d.tipo] + ': ' + e.message); }

    // 5) UNIDADES (última fecha y total)
    if (!esPrueba) { try { actualizarUnidad(u, d, pdfUrl); } catch (e) { logError('unidades', d, e); } }

    return {
      success: true, id: id, pdfUrl: pdfUrl, client: client, cambios: resumenCambios, avisos: avisos,
      prevFecha: prev ? prev.fecha : '', fotos: fotos.length, folder: folderUrl
    };
  } catch (e) {
    logError(paso, d, e);
    return { success: false, error: 'Paso "' + paso + '": ' + (e && e.message ? e.message : e) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// Busca la unidad en UNIDADES; si no existe ("Otra"), la agrega
function resolverUnidad(d, side, esPrueba) {
  const sh = unidadesSheet();
  const data = sh.getDataRange().getDisplayValues();
  const h = data[0].map(x => String(x).trim());
  const iB = h.indexOf('Building'), iU = h.indexOf('Unit'), iC = h.indexOf('Client'), iT = h.indexOf('Total Inventories');
  const building = invNorm(d.building), unit = invNorm(d.unit), client = invNorm(d.client);
  for (let i = 1; i < data.length; i++) {
    if (invKey(data[i][iB], data[i][iU]) === invKey(building, unit)) {
      return {
        building: invNorm(data[i][iB]), unit: invNorm(data[i][iU]),
        client: (iC > -1 ? invNorm(data[i][iC]) : '') || client,
        row: i + 1, total: iT > -1 ? (Number(data[i][iT]) || 0) : 0
      };
    }
  }
  if (esPrueba) return { building: building, unit: unit, client: client || 'PRUEBA', row: 0, total: 0 };
  sh.appendRow(h.map(x => x === 'Building' ? building : x === 'Unit' ? "'" + unit : x === 'Client' ? client
    : x === 'Side' ? side : x === 'Total Inventories' ? 0 : ''));
  try { CacheService.getScriptCache().remove('INV_LISTS_V2'); } catch (e) {}
  return { building: building, unit: unit, client: client, row: sh.getLastRow(), total: 0 };
}

// Escribe una fila en la pestaña del tipo. Si la pestaña es nueva, primero copia ahí los inventarios
// de ese tipo que ya estaban en INV_REGISTRO (para no perder los anteriores).
function escribirFilaTipo(book, tipo, o) {
  const name = TIPO_TAB[tipo];
  const nueva = !book.getSheetByName(name);
  const keys = (o.items || []).map(it => it.k);
  const sh = sheetWithHeader(name, tipoBaseHeader(tipo).concat(keys, ['Artículos adicionales']), book);
  if (nueva) {
    const prevRows = leerRegistrosDe(book, 0, r => r.tipo === TIPO_LBL[tipo] && r.id !== o.id, [])
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.row - b.row));
    prevRows.forEach(r => {
      let snap = {};
      try { snap = JSON.parse(r.json || '{}'); } catch (e) {}
      appendFilaTipo(sh, tipo, {
        id: r.id, fecha: fechaDate(r.fecha), side: r.side, cleaner: r.cleaner, cliente: r.cliente, building: r.building, unit: r.unit,
        size: r.size, piezas: r.piezas, cero: r.cero, pedir: r.pedir, checkNo: r.checkNo, cambios: r.cambios, notas: r.notas,
        pdf: r.pdf, fotos: r.fotos.join('\n'), items: snap.items || [], custom: snap.custom || []
      });
    });
  }
  appendFilaTipo(sh, tipo, o);
}

function appendFilaTipo(sh, tipo, o) {
  const items = o.items || [];
  // Si aparecen artículos nuevos, se agregan como columnas al final
  const hm0 = headerMap(sh);
  const faltan = items.map(it => it.k).filter(k => hm0.m[k] === undefined);
  if (faltan.length) sh.getRange(1, hm0.h.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#A6FDFF');
  const hm = faltan.length ? headerMap(sh) : hm0;
  const obj = {
    'ID': o.id, 'Fecha': o.fecha, 'Side': o.side, 'Cleaner': o.cleaner, 'Cliente': o.cliente, 'Building': o.building,
    'Unit': "'" + o.unit, 'Tamaño cama': o.size || '', 'Total piezas': o.piezas, 'En cero': o.cero, 'Por pedir': o.pedir,
    'Checklist en NO': o.checkNo, 'Cambios vs anterior': String(o.cambios || '').slice(0, 5000), 'Notas': o.notas,
    'PDF': o.pdf, 'Fotos': o.fotos,
    'Artículos adicionales': (o.custom || []).map(c => c.n + ': ' + c.v).join('; ')
  };
  items.forEach(it => { obj[it.k] = it.v; });
  sh.appendRow(rowFromObj(hm, obj));
}

// Rehace INV_LINEN / INV_SUPPLIES / INV_KITCHEN desde INV_REGISTRO (ejecútala si borraste o desordenaste esas pestañas)
function reconstruirRegistrosPorTipo() {
  const out = [];
  invSSList().forEach(book => {
    Object.keys(TIPO_TAB).forEach(tipo => {
      const old = book.getSheetByName(TIPO_TAB[tipo]);
      const regs = leerRegistrosDe(book, 0, r => r.tipo === TIPO_LBL[tipo] && r.cleaner.toUpperCase() !== TEST_CLEANER, [])
        .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.row - b.row));
      if (old) book.deleteSheet(old);
      if (!regs.length) { out.push(book.getName() + ' · ' + TIPO_TAB[tipo] + ': sin inventarios'); return; }
      const first = JSON.parse(regs[0].json || '{}');
      const sh = sheetWithHeader(TIPO_TAB[tipo], tipoBaseHeader(tipo).concat((first.items || []).map(it => it.k), ['Artículos adicionales']), book);
      regs.forEach(r => {
        let snap = {};
        try { snap = JSON.parse(r.json || '{}'); } catch (e) {}
        appendFilaTipo(sh, tipo, {
          id: r.id, fecha: fechaDate(r.fecha), side: r.side, cleaner: r.cleaner, cliente: r.cliente, building: r.building, unit: r.unit,
          size: r.size, piezas: r.piezas, cero: r.cero, pedir: r.pedir, checkNo: r.checkNo, cambios: r.cambios, notas: r.notas,
          pdf: r.pdf, fotos: r.fotos.join('\n'), items: snap.items || [], custom: snap.custom || []
        });
      });
      out.push(book.getName() + ' · ' + TIPO_TAB[tipo] + ': ' + regs.length + ' inventarios');
    });
  });
  console.log(out.join('\n'));
  return out.join('\n');
}

function actualizarUnidad(u, d, pdfUrl) {
  if (!u.row) return;
  const sh = unidadesSheet();
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(x => String(x).trim());
  const col = { supplies: h.indexOf('Last Supplies') + 1, linen: h.indexOf('Last Linen') + 1, cutlery: h.indexOf('Last Kitchen') + 1 }[d.tipo];
  const label = d.fecha + (d.size ? ' (' + d.size + ')' : '');
  if (col > 0) sh.getRange(u.row, col).setValue(String(pdfUrl).indexOf('http') === 0 ? '=HYPERLINK("' + pdfUrl + '","' + label + '")' : label);
  const cT = h.indexOf('Total Inventories') + 1;
  if (cT > 0) sh.getRange(u.row, cT).setValue((u.total || 0) + 1);
}

// El conversor HTML→PDF de Google no descarga imágenes externas: se incrusta el logo
function logoDataUri() {
  const c = CacheService.getScriptCache();
  try { const hit = c.get('INV_LOGO_B64'); if (hit) return hit; } catch (e) {}
  try {
    const r = UrlFetchApp.fetch(LOGO_URL, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return LOGO_URL;
    const type = r.getHeaders()['Content-Type'] || 'image/png';
    const uri = 'data:' + type + ';base64,' + Utilities.base64Encode(r.getContent());
    if (uri.length < 95000) { try { c.put('INV_LOGO_B64', uri, 21600); } catch (e) {} }
    return uri;
  } catch (e) { return LOGO_URL; }
}

// ==========================================
// HISTORIAL Y COMPARACIÓN DE UNA UNIDAD (requiere contraseña admin)
// ==========================================
function getHistorialUnidad(building, unit, tipo, pass) {
  if (pass !== ADMIN_PASS) return { error: 'DENIED' };
  if (!TIPO_LBL[tipo]) return { error: 'Tipo inválido' };
  try {
    const key = invKey(building, unit), tl = TIPO_LBL[tipo];
    const found = leerRegistros(r => r.tipo === tl && invKey(r.building, r.unit) === key && r.cleaner.toUpperCase() !== TEST_CLEANER);
    found.sort(ordenarRecientes);
    const rows = found.map(x => ({
      id: x.id, fecha: x.fecha, cleaner: x.cleaner, size: x.size, notas: x.notas, pdf: x.pdf, fotos: x.fotos, folder: x.folder,
      cambios: x.cambios, piezas: x.piezas, cero: x.cero, pedir: x.pedir, checkNo: x.checkNo
    }));
    const cols = [], map = {}, order = [];
    found.slice(0, 8).forEach((x, ci) => {
      const s = snapDe(x);
      cols.push({ id: x.id, fecha: x.fecha, cleaner: x.cleaner, size: x.size });
      s.items.map(it => ({ s: it.s, k: it.k, t: it.t }))
        .concat(s.custom.map(c => ({ s: 'Additional items', k: c.n, t: 'count' })))
        .forEach(it => {
          if (!map[it.k]) { map[it.k] = { sec: it.s, key: it.k, kind: it.t, vals: {} }; order.push(it.k); }
          map[it.k].vals[ci] = s.values[it.k];
        });
    });
    const items = order.map(k => {
      const it = map[k], v = [];
      for (let i = 0; i < cols.length; i++) v.push(it.vals[i] === undefined ? null : it.vals[i]);
      return { sec: it.sec, key: it.key, kind: it.kind, vals: v };
    });
    return { rows: rows, cols: cols, items: items };
  } catch (e) { logError('historial', { building: building, unit: unit, tipo: tipo }, e); return { error: e.message }; }
}

// ==========================================
// REPORTES POR TIPO (Linen / Supplies / Kitchen): general, por cliente y por unidad
// opts: { tipo: 'linen'|'supplies'|'cutlery', filtro: 'rp' (grupo) | 'all' | 'c:<cliente>', side: '' | 'WEST' | 'EAST' }
// ==========================================
function contienePalabra(texto, palabra) {
  const t = ' ' + String(texto).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, ' ') + ' ';
  const p = ' ' + String(palabra).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, ' ').trim() + ' ';
  return t.indexOf(p) !== -1;
}

function filtroCliente(filtro) {
  filtro = String(filtro || 'all');
  if (filtro === 'all') return { nombre: 'Todos los clientes', pdf: 'All clients', fn: () => true };
  if (filtro.indexOf('c:') === 0) {
    const c = invNorm(filtro.slice(2)).toUpperCase();
    return { nombre: invNorm(filtro.slice(2)), pdf: invNorm(filtro.slice(2)), fn: x => invNorm(x).toUpperCase() === c };
  }
  const g = GRUPOS_REPORTE.filter(x => x.id === filtro)[0] || GRUPOS_REPORTE[0];
  return { nombre: g.nombre, pdf: g.pdfNombre || g.nombre, fn: x => g.palabras.some(p => contienePalabra(x, p)) };
}

function getReporte(opts, pass) {
  if (pass !== ADMIN_PASS) return { error: 'DENIED' };
  try { return calcReporte(opts || {}); }
  catch (e) { logError('reporte', { tipo: opts && opts.tipo }, e); return { error: e.message }; }
}
// Nombres anteriores (compatibilidad)
function getReporteLinen(opts, pass) { return getReporte(Object.assign({ tipo: 'linen' }, opts || {}), pass); }
function exportarReporteLinen(opts, html, pass) { return exportarReporte(Object.assign({ tipo: 'linen' }, opts || {}), html, pass); }

function calcReporte(opts) {
  const tipo = TIPO_LBL[opts.tipo] ? opts.tipo : 'linen';
  const tl = TIPO_LBL[tipo];
  const porCama = tipo === 'linen';
  const F = filtroCliente(opts.filtro);
  const side = String(opts.side || '').toUpperCase();
  const hoy = hoyStr();
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const r2 = v => Math.round(v * 100) / 100;

  // Unidades del filtro (pestaña UNIDADES)
  const units = {}, enUnidades = {};
  unidadesList().forEach(r => {
    const k = invKey(r[0], r[1]);
    enUnidades[k] = true;
    if (side && r[3] && r[3] !== side) return;
    if (!F.fn(r[2])) return;
    units[k] = { b: r[0], u: r[1], c: r[2] || 'SIN CLIENTE', s: r[3] };
  });

  // Inventarios de este tipo agrupados por unidad (+ tamaño de cama en linen)
  const grupos = {};
  leerRegistros(r => r.tipo === tl && r.cleaner.toUpperCase() !== TEST_CLEANER).forEach(r => {
    const k = invKey(r.building, r.unit);
    if (!units[k]) {
      if (enUnidades[k]) return;
      if (side && r.side && r.side !== side) return;
      if (!F.fn(r.cliente)) return;
      units[k] = { b: r.building, u: r.unit, c: r.cliente || 'SIN CLIENTE', s: r.side };
    }
    const gk = k + '|' + (porCama ? (r.size || '') : '');
    (grupos[gk] = grupos[gk] || []).push(r);
  });

  const items = (REPORT_ITEMS[tipo] || []).slice();
  const filas = [], contadas = {};
  Object.keys(grupos).forEach(gk => {
    const list = grupos[gk].sort(ordenarRecientes);
    const last = list[0], prev = list[1] || null;
    const sl = snapDe(last), sp = prev ? snapDe(prev) : null;
    const k = gk.split('|').slice(0, 2).join('|');
    contadas[k] = true;
    sl.items.forEach(it => { if (it.t === 'count' && items.indexOf(it.k) === -1) items.push(it.k); });
    filas.push({ k: k, u: units[k], last: last, prev: prev, sl: sl, sp: sp, n: list.length });
  });

  const zeros = () => items.map(() => 0);
  const dias = f => Math.round((fechaDate(hoy) - fechaDate(f)) / 86400000);
  const pedirItems = {}, checkItems = {}, ordenPedir = [], ordenCheck = [];

  const perUnit = filas.map(f => {
    const vals = items.map(it => (f.sl.values[it] === undefined ? null : Number(f.sl.values[it]) || 0));
    const diffs = items.map((it, i) => {
      if (!f.sp || vals[i] === null) return null;
      const pv = f.sp.values[it];
      if (pv === undefined || pv === null || pv === '') return null;
      return r2(vals[i] - (Number(pv) || 0));
    });
    const label = f.u.b + ' ' + (esLocker(f.u.u) ? '(Locker)' : f.u.u);
    const pedir = [], check = [];
    f.sl.items.forEach(it => {
      if (it.c === 'order' && it.v === 'YES') {
        pedir.push(it.k);
        if (!pedirItems[it.k]) { pedirItems[it.k] = []; ordenPedir.push(it.k); }
        pedirItems[it.k].push({ client: f.u.c, unit: label });
      }
      if (it.c === 'status' && it.v === 'NO') {
        check.push(it.k);
        if (!checkItems[it.k]) { checkItems[it.k] = []; ordenCheck.push(it.k); }
        checkItems[it.k].push({ client: f.u.c, unit: label });
      }
    });
    const total = vals.reduce((a, v) => a + (v || 0), 0);
    const hasD = diffs.some(x => x !== null);
    return {
      client: f.u.c, building: f.u.b, unit: f.u.u, side: f.u.s, locker: esLocker(f.u.u), size: porCama ? f.last.size : '',
      fecha: f.last.fecha, dias: dias(f.last.fecha), cleaner: f.last.cleaner, pdf: f.last.pdf, id: f.last.id,
      prevFecha: f.prev ? f.prev.fecha : '', n: f.n, vals: vals, diffs: diffs, total: r2(total),
      totalDiff: hasD ? r2(diffs.reduce((a, v) => a + (v || 0), 0)) : null,
      bajas: r2(diffs.reduce((a, v) => a + (v < 0 ? -v : 0), 0)),
      ceros: vals.filter(v => v === 0).length,
      pedir: pedir, check: check,
      otros: f.sl.custom.map(c => c.n + ': ' + c.v).join(', '), notas: f.last.notas
    };
  });
  perUnit.sort((a, b) => coll.compare(a.client, b.client) || coll.compare(a.building, b.building) || coll.compare(a.unit, b.unit) || coll.compare(a.size, b.size));

  const sinInventario = Object.keys(units).filter(k => !contadas[k]).map(k => ({
    client: units[k].c, building: units[k].b, unit: units[k].u, side: units[k].s, locker: esLocker(units[k].u)
  })).sort((a, b) => coll.compare(a.client, b.client) || coll.compare(a.building, b.building) || coll.compare(a.unit, b.unit));

  // Por cliente
  const pc = {};
  Object.keys(units).forEach(k => {
    const c = units[k].c;
    if (!pc[c]) pc[c] = { client: c, units: 0, contadas: 0, sin: 0, totals: zeros(), total: 0, bajas: 0, ceros: 0, pedir: 0, check: 0, ultima: '' };
    pc[c].units++;
    if (contadas[k]) pc[c].contadas++; else pc[c].sin++;
  });
  perUnit.forEach(r => {
    const c = pc[r.client];
    r.vals.forEach((v, i) => { c.totals[i] += v || 0; });
    c.total += r.total; c.bajas += r.bajas; c.ceros += r.ceros; c.pedir += r.pedir.length; c.check += r.check.length;
    if (r.fecha > c.ultima) c.ultima = r.fecha;
  });
  const perClient = Object.keys(pc).map(k => pc[k]).sort((a, b) => b.units - a.units || coll.compare(a.client, b.client));
  perClient.forEach(c => { c.totals = c.totals.map(r2); c.total = r2(c.total); c.bajas = r2(c.bajas); });

  // Por edificio (junta todas las unidades del edificio, de cualquier cliente del filtro)
  const pb = {}, bKey = b => invNorm(b).toUpperCase();
  Object.keys(units).forEach(k => {
    const kb = bKey(units[k].b);
    if (!pb[kb]) pb[kb] = { building: units[k].b, units: 0, contadas: 0, sin: 0, clients: [], totals: zeros(), total: 0, bajas: 0, ceros: 0, pedir: 0, check: 0, ultima: '' };
    const B = pb[kb];
    B.units++;
    if (contadas[k]) B.contadas++; else B.sin++;
    if (B.clients.indexOf(units[k].c) === -1) B.clients.push(units[k].c);
  });
  perUnit.forEach(r => {
    const B = pb[bKey(r.building)];
    r.vals.forEach((v, i) => { B.totals[i] += v || 0; });
    B.total += r.total; B.bajas += r.bajas; B.ceros += r.ceros; B.pedir += r.pedir.length; B.check += r.check.length;
    if (r.fecha > B.ultima) B.ultima = r.fecha;
  });
  const perBuilding = Object.keys(pb).map(k => pb[k]).sort((a, b) => b.units - a.units || coll.compare(a.building, b.building));
  perBuilding.forEach(B => { B.totals = B.totals.map(r2); B.total = r2(B.total); B.bajas = r2(B.bajas); B.clients.sort((a, b) => coll.compare(a, b)); });

  // General
  const totals = zeros(), cambio = items.map(() => null), unidadesEnCero = zeros();
  perUnit.forEach(r => r.vals.forEach((v, i) => {
    totals[i] += v || 0;
    if (v === 0) unidadesEnCero[i]++;
    if (r.diffs[i] !== null) cambio[i] = (cambio[i] || 0) + r.diffs[i];
  }));
  // Nivel UNIDAD (suma los tamaños de cama) + mínimos (par) y faltantes — solo ropa de cama
  let porUnidad = null, parResumen = null;
  if (porCama) {
    let cm = {};
    try { cm = cuartosMap(); } catch (e) { logError('cuartos', {}, e); }
    const pu = {};
    Object.keys(units).forEach(k => {
      const info = esLocker(units[k].u) ? null : (cm[k] || null);
      pu[k] = {
        client: units[k].c, building: units[k].b, unit: units[k].u, side: units[k].s, locker: esLocker(units[k].u),
        camasTxt: info ? info.camasTxt : '', banosTxt: info ? info.banosTxt : '', camas: info ? info.camas : null, banos: info ? info.banos : null,
        counted: false, fecha: '', sizes: [], have: null, par: parDeUnidad(items, info)
      };
    });
    perUnit.forEach(r => {
      const k = invKey(r.building, r.unit), U = pu[k];
      if (!U) return;
      U.counted = true;
      if (r.fecha > U.fecha) U.fecha = r.fecha;
      if (r.size && U.sizes.indexOf(r.size) === -1) U.sizes.push(r.size);
      if (!U.have) U.have = items.map(() => 0);
      r.vals.forEach((v, i) => { U.have[i] += v || 0; });
    });
    porUnidad = Object.keys(pu).map(k => {
      const U = pu[k];
      U.falta = (U.counted && U.par) ? U.par.map((p, i) => (p === null ? null : Math.max(0, r2(p - U.have[i])))) : null;
      U.totalFalta = U.falta ? r2(U.falta.reduce((a, v) => a + (v || 0), 0)) : null;
      return U;
    }).sort((a, b) => coll.compare(a.building, b.building) || coll.compare(a.unit, b.unit));
    const sumOf = key => items.map((_, i) => r2(porUnidad.reduce((a, U) => a + ((U[key] && U[key][i]) || 0), 0)));
    parResumen = {
      conCuartos: porUnidad.filter(U => U.par).length,
      contadasConPar: porUnidad.filter(U => U.par && U.counted).length,
      parTotal: items.map((_, i) => r2(porUnidad.reduce((a, U) => a + (U.counted && U.par && U.par[i] ? U.par[i] : 0), 0))),
      faltaTotal: sumOf('falta'),
      reglasCama: PAR_POR_CAMA, reglasBano: PAR_POR_BANO
    };
  }

  const nUnits = Object.keys(units).length, nCont = Object.keys(contadas).length;
  const lista = (obj, orden) => orden.map(k => ({ item: k, units: obj[k] }))
    .sort((a, b) => b.units.length - a.units.length || coll.compare(a.item, b.item));
  return {
    tipo: tipo, tipoLbl: tl, porCama: porCama,
    filtro: F.nombre, filtroPdf: F.pdf, side: side, generado: Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm'),
    items: items,
    resumen: {
      units: nUnits, contadas: nCont, sin: nUnits - nCont, cobertura: nUnits ? Math.round(nCont * 100 / nUnits) : 0,
      clientes: perClient.length, inventarios: perUnit.reduce((a, r) => a + r.n, 0),
      piezas: r2(totals.reduce((a, v) => a + v, 0)),
      bajas: r2(perUnit.reduce((a, r) => a + r.bajas, 0)),
      viejas: perUnit.filter(r => r.dias > 30).length,
      pedir: perUnit.reduce((a, r) => a + r.pedir.length, 0),
      unidadesPedir: perUnit.filter(r => r.pedir.length).length,
      check: perUnit.reduce((a, r) => a + r.check.length, 0),
      unidadesCheck: perUnit.filter(r => r.check.length).length,
      totals: totals.map(r2), cambio: cambio.map(v => (v === null ? null : r2(v))), enCero: unidadesEnCero
    },
    porUnidad: porUnidad, par: parResumen,
    porPedir: lista(pedirItems, ordenPedir),
    checklistNo: lista(checkItems, ordenCheck),
    perClient: perClient, perBuilding: perBuilding, perUnit: perUnit, sinInventario: sinInventario
  };
}

// Guarda el reporte: pestaña REPORTE_<TIPO> (se reescribe) + PDF en Drive (INVENTARIOS / REPORTES <TIPO>)
function exportarReporte(opts, html, pass) {
  if (pass !== ADMIN_PASS) return { error: 'DENIED' };
  try {
    const r = calcReporte(opts || {});
    const sh = escribirReporteEnHoja(r);
    let pdfUrl = '';
    try {
      const folder = getOrCreateFolder(getOrCreateFolder(DriveApp.getFolderById(DRIVE_FOLDER_ID), 'INVENTARIOS'), 'REPORTES ' + TIPO_ARCHIVO[r.tipo]);
      const name = limpiarNombre('Reporte ' + TIPO_ARCHIVO[r.tipo] + ' - ' + r.filtro + (r.side ? ' - ' + r.side : '') + ' - ' + r.generado.replace(' ', '_'));
      const doc = String(html || '').split(LOGO_URL).join(logoDataUri());
      pdfUrl = folder.createFile(Utilities.newBlob(doc, MimeType.HTML, name + '.html').getAs(MimeType.PDF).setName(name + '.pdf')).getUrl();
    } catch (e) { logError('reporte pdf', { tipo: r.tipo }, e); pdfUrl = 'Error PDF: ' + e.message; }
    return { success: true, pdfUrl: pdfUrl, sheetUrl: reportSS(r.side).getUrl() + '#gid=' + sh.getSheetId(), tab: REPORT_TAB[r.tipo] };
  } catch (e) { logError('reporte exportar', { tipo: opts && opts.tipo }, e); return { error: e.message }; }
}

// PDF para enviar al cliente (resumen por edificio). Se guarda en INVENTARIOS / REPORTES <TIPO> / PARA CLIENTES
function guardarPdfCliente(opts, html, pass) {
  if (pass !== ADMIN_PASS) return { error: 'DENIED' };
  try {
    opts = opts || {};
    const tipo = TIPO_LBL[opts.tipo] ? opts.tipo : 'linen';
    const F = filtroCliente(opts.filtro);
    const titulo = { linen: 'Bed Linen Summary', supplies: 'Supplies Summary', cutlery: 'Kitchen Summary' }[tipo];
    const folder = getOrCreateFolder(getOrCreateFolder(getOrCreateFolder(DriveApp.getFolderById(DRIVE_FOLDER_ID), 'INVENTARIOS'),
      'REPORTES ' + TIPO_ARCHIVO[tipo]), 'PARA CLIENTES');
    const name = limpiarNombre(F.pdf + ' - ' + titulo + (opts.side ? ' - ' + String(opts.side).toUpperCase() : '') + ' - ' + hoyStr());
    const doc = String(html || '').split(LOGO_URL).join(logoDataUri());
    const file = folder.createFile(Utilities.newBlob(doc, MimeType.HTML, name + '.html').getAs(MimeType.PDF).setName(name + '.pdf'));
    return { success: true, pdfUrl: file.getUrl(), name: name + '.pdf', folder: folder.getUrl() };
  } catch (e) { logError('pdf cliente', { tipo: opts && opts.tipo }, e); return { error: e.message }; }
}

function escribirReporteEnHoja(r) {
  const ss = reportSS(r.side);
  const tabName = REPORT_TAB[r.tipo] || 'REPORTE_LINEN';
  let sh = ss.getSheetByName(tabName);
  if (!sh) sh = ss.insertSheet(tabName);
  sh.clear();
  const W = Math.max(12, 8 + r.items.length + 6);
  const rows = [], bold = [];
  const pad = a => { const x = a.slice(0, W); while (x.length < W) x.push(''); return x; };
  const titulo = t => { rows.push(pad([t])); bold.push(rows.length); };
  const encab = a => { rows.push(pad(a)); bold.push(rows.length); };
  const nv = v => (v === null || v === undefined ? '' : v);
  const S = r.resumen;

  titulo('REPORTE DE ' + TIPO_NOMBRE[r.tipo] + ' · ' + r.filtro + (r.side ? ' · ' + r.side : ''));
  rows.push(pad(['Generado', r.generado]));
  rows.push(pad(['Unidades', S.units, 'Con inventario', S.contadas, 'Sin inventario', S.sin, 'Cobertura %', S.cobertura]));
  rows.push(pad(['Piezas totales', S.piezas, 'Bajas vs anterior', S.bajas, 'Conteos con +30 días', S.viejas]));
  if (r.tipo === 'supplies') rows.push(pad(['Artículos por pedir', S.pedir, 'Unidades que piden', S.unidadesPedir, 'Checklist en NO', S.check, 'Unidades con NO', S.unidadesCheck]));
  rows.push(pad(['']));

  titulo('TOTALES GENERALES');
  encab(['Artículo', 'Total actual', 'Cambio vs anterior', 'Unidades en cero']);
  r.items.forEach((it, i) => rows.push(pad([it, S.totals[i], nv(S.cambio[i]), S.enCero[i]])));
  rows.push(pad(['']));

  if (r.tipo === 'supplies') {
    titulo('POR PEDIR (unidades que marcaron "Order more: YES")');
    encab(['Artículo', 'Unidades', 'Dónde']);
    if (!r.porPedir.length) rows.push(pad(['Nada por pedir']));
    r.porPedir.forEach(x => rows.push(pad([x.item, x.units.length, x.units.map(u => u.unit + ' (' + u.client + ')').join(' · ')])));
    rows.push(pad(['']));
    titulo('CHECKLIST DE SALIDA EN "NO"');
    encab(['Punto', 'Unidades', 'Dónde']);
    if (!r.checklistNo.length) rows.push(pad(['Todo en orden']));
    r.checklistNo.forEach(x => rows.push(pad([x.item, x.units.length, x.units.map(u => u.unit + ' (' + u.client + ')').join(' · ')])));
    rows.push(pad(['']));
  }

  titulo('POR CLIENTE');
  encab(['Cliente', 'Unidades', 'Con inventario', 'Sin inventario', 'Último conteo'].concat(r.items, ['Total piezas', 'Bajas'],
    r.tipo === 'supplies' ? ['Por pedir', 'Checklist NO'] : []));
  r.perClient.forEach(c => rows.push(pad([c.client, c.units, c.contadas, c.sin, c.ultima].concat(c.totals, [c.total, c.bajas],
    r.tipo === 'supplies' ? [c.pedir, c.check] : []))));
  rows.push(pad(['']));

  titulo('POR EDIFICIO');
  encab(['Edificio', 'Clientes', 'Unidades', 'Con inventario', 'Sin inventario', 'Último conteo'].concat(r.items, ['Total piezas', 'Bajas'],
    r.tipo === 'supplies' ? ['Por pedir', 'Checklist NO'] : []));
  (r.perBuilding || []).forEach(B => rows.push(pad([B.building, B.clients.join(', '), B.units, B.contadas, B.sin, B.ultima].concat(B.totals, [B.total, B.bajas],
    r.tipo === 'supplies' ? [B.pedir, B.check] : []))));
  rows.push(pad(['']));

  titulo('POR UNIDAD (último inventario' + (r.porCama ? ' de cada unidad y tamaño de cama)' : ' de cada unidad)'));
  const collH = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  r.perUnit = r.perUnit.slice().sort((a, b) => collH.compare(a.building, b.building) || collH.compare(a.unit, b.unit) || collH.compare(a.size, b.size));
  encab(['Cliente', 'Building', 'Unit', 'Side', 'Cama', 'Fecha', 'Días', 'Cleaner'].concat(r.items,
    ['Total', 'Cambio vs anterior', 'Fecha anterior'], r.tipo === 'supplies' ? ['Por pedir', 'Checklist NO'] : [], ['Otros', 'Notas', 'PDF']));
  r.perUnit.forEach(u => rows.push(pad([u.client, u.building, "'" + u.unit, u.side, u.size, u.fecha, u.dias, u.cleaner]
    .concat(u.vals.map(nv), [u.total, nv(u.totalDiff), u.prevFecha],
      r.tipo === 'supplies' ? [u.pedir.join(', '), u.check.join(', ')] : [], [u.otros, u.notas, u.pdf]))));
  rows.push(pad(['']));

  if (r.porUnidad) {
    titulo('MÍNIMOS Y FALTANTES POR UNIDAD (lo puesto + 1 cambio por cama; 1 bath mat por baño)');
    encab(['Side', 'Building', 'Unit', 'Cliente', 'Bedrooms', 'Bathrooms', 'Contada'].concat(r.items.map(it => 'Falta ' + it), ['Total faltante']));
    r.porUnidad.forEach(U => rows.push(pad([U.side, U.building, "'" + U.unit, U.client, U.camasTxt, U.banosTxt, U.counted ? U.fecha : 'No']
      .concat(U.falta ? U.falta.map(v => (v === null ? '' : v)) : r.items.map(() => ''), [U.totalFalta === null ? '' : U.totalFalta]))));
    rows.push(pad(['']));
  }

  titulo('SIN INVENTARIO DE ' + TIPO_NOMBRE[r.tipo] + ' (' + r.sinInventario.length + ')');
  encab(['Cliente', 'Building', 'Unit', 'Side']);
  r.sinInventario.forEach(u => rows.push(pad([u.client, u.building, "'" + u.unit, u.side])));

  sh.getRange(1, 1, rows.length, W).setValues(rows);
  bold.forEach(n => sh.getRange(n, 1, 1, W).setFontWeight('bold').setBackground('#E6FCFD'));
  sh.getRange(1, 1).setFontSize(13);
  return sh;
}

// ==========================================
// DIAGNÓSTICO — ejecútalas desde el editor (menú ▶ Ejecutar) para dar permisos y ver qué falla
// ==========================================
function probarInventarios() {
  const out = [];
  const ok = (n, f) => { try { const r = f(); out.push('✅ ' + n + (r !== undefined ? ': ' + r : '')); } catch (e) { out.push('❌ ' + n + ': ' + e.message); } };
  ok('Archivo Admin', () => adminSS().getName());
  ok('Pestaña UNIDADES', () => unidadesList().length + ' unidades');
  ok('Personal West / East', () => staffNames('STAFF_WEST').length + ' / ' + staffNames('STAFF_EAST').length);
  invSSList().forEach(book => {
    ok('Archivo de inventarios', () => book.getName());
    ok('  INV_REGISTRO', () => (sheetWithHeader(LOG_TAB, LOG_HEADER, book).getLastRow() - 1) + ' inventarios guardados');
    ok('  INV_DETALLE', () => (sheetWithHeader(DET_TAB, DET_HEADER, book).getLastRow() - 1) + ' filas');
    ok('  INV_ERRORES', () => (sheetWithHeader(ERR_TAB, ERR_HEADER, book).getLastRow() - 1) + ' errores anotados');
    Object.keys(TIPO_TAB).forEach(t => ok('  ' + TIPO_TAB[t], () => {
      const sh = book.getSheetByName(TIPO_TAB[t]);
      return sh ? (sh.getLastRow() - 1) + ' inventarios' : 'se crea sola con el primer inventario de ' + TIPO_LBL[t];
    }));
  });
  ok('Carpeta de Drive', () => DriveApp.getFolderById(DRIVE_FOLDER_ID).getName());
  ok('Conversión a PDF', () => { Utilities.newBlob('<p>ok</p>', MimeType.HTML, 't.html').getAs(MimeType.PDF); return 'OK'; });
  ok('Logo para PDF', () => (logoDataUri().indexOf('data:') === 0 ? 'OK' : 'no se pudo incrustar (el PDF sale sin logo)'));
  const txt = out.join('\n');
  console.log(txt);
  return txt;
}

// Guarda un inventario de PRUEBA (cleaner "PRUEBA SISTEMA", unidad "PRUEBA 000").
// No cuenta en reportes, historial ni comparaciones; puedes borrar la fila de INV_REGISTRO después.
function probarGuardado() {
  const r = guardarInventario({
    tipo: 'linen', side: 'WEST', cleaner: TEST_CLEANER, fecha: hoyStr(), building: 'PRUEBA', unit: '000', client: 'PRUEBA', size: 'Queen',
    items: [{ key: 'Bath Towels', sectionEn: 'Towels', colKey: 'qty', kind: 'count', value: 4 }],
    custom: [], notas: 'Prueba del sistema', html: '<h1>Prueba</h1>'
  });
  console.log(JSON.stringify(r, null, 2));
  return r;
}
