/**
 * Lector del extracto bancario en CSV.
 *
 * Cada banco exporta distinto, así que OpenPay pide un formato propio y simple.
 * Primera fila con los nombres de columna (en cualquier orden):
 *
 *   fecha, referencia, descripcion, debito, credito
 *
 * o, en vez de debito/credito, una sola columna `valor` con signo (negativo =
 * salida). Separador coma o punto y coma. Fechas AAAA-MM-DD o DD/MM/AAAA.
 * Montos como los escribe el banco: 5000000, 5.000.000 o 5.000.000,00.
 *
 * No toca la red ni la base: es una función pura para poder probarla.
 */

export interface MovimientoCsv {
  postedOn: string; // AAAA-MM-DD
  direction: 'DEBIT' | 'CREDIT';
  amount: number; // pesos, positivo, con centavos
  bankReference: string;
  description: string;
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizar = (s: string) => sinTildes(s).trim().toLowerCase();

/** Monto como lo escribe un banco colombiano o una hoja de cálculo. */
export function parseMonto(texto: string): number {
  let s = texto.replace(/[$\s]/g, '');
  if (s === '') return 0;
  let signo = 1;
  if (/^\(.*\)$/.test(s)) {
    signo = -1;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    signo = -signo;
    s = s.slice(1);
  }
  if (!/^[0-9.,]+$/.test(s)) throw new Error(`"${texto}" no es un monto`);

  const puntos = (s.match(/\./g) ?? []).length;
  const comas = (s.match(/,/g) ?? []).length;
  let decimal: '.' | ',' | null = null;
  if (puntos && comas) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  } else if (puntos === 1 || comas === 1) {
    // Un solo separador: es decimal si lo siguen uno o dos dígitos (5000,50);
    // si lo siguen tres, es de miles (5.000).
    const sep = puntos ? '.' : ',';
    if (/^\d{1,2}$/.test(s.split(sep)[1])) decimal = sep;
  }

  let entero = s;
  let fraccion = '';
  if (decimal) {
    const i = s.lastIndexOf(decimal);
    entero = s.slice(0, i);
    fraccion = s.slice(i + 1);
    if (!/^\d{1,2}$/.test(fraccion)) throw new Error(`"${texto}" tiene más de dos decimales`);
  }
  entero = entero.replace(/[.,]/g, '');
  if (!/^\d+$/.test(entero)) throw new Error(`"${texto}" no es un monto`);
  return signo * Number(`${entero}.${fraccion || '0'}`);
}

/** AAAA-MM-DD, DD/MM/AAAA o DD-MM-AAAA → AAAA-MM-DD. */
export function parseFecha(texto: string): string {
  const s = texto.trim();
  let a: string, m: string, d: string;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (r) {
    [, a, m, d] = r;
  } else {
    r = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (!r) throw new Error(`"${texto}" no es una fecha (usa AAAA-MM-DD o DD/MM/AAAA)`);
    [, d, m, a] = r;
  }
  const iso = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const fecha = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== iso) {
    throw new Error(`"${texto}" no es una fecha válida`);
  }
  return iso;
}

/** Parte una línea respetando comillas dobles ("a;b" es un solo campo). */
function partir(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (enComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === sep) {
      campos.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos.map((x) => x.trim());
}

export function parseExtracto(texto: string): MovimientoCsv[] {
  const lineas = texto
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(({ l }) => l.trim() !== '');
  if (lineas.length < 2) throw new Error('El archivo no tiene movimientos.');

  const cabecera = lineas[0].l;
  const sep = cabecera.split(';').length > cabecera.split(',').length ? ';' : ',';
  const columnas = partir(cabecera, sep).map(normalizar);
  const col = (nombre: string) => columnas.indexOf(nombre);

  const iFecha = col('fecha');
  const iRef = col('referencia');
  const iDesc = col('descripcion');
  const iDeb = col('debito');
  const iCred = col('credito');
  const iValor = col('valor');

  if (iFecha < 0 || iRef < 0) {
    throw new Error('Faltan columnas: el archivo necesita al menos "fecha" y "referencia".');
  }
  if (iValor < 0 && (iDeb < 0 || iCred < 0)) {
    throw new Error('Faltan columnas de monto: "debito" y "credito", o una sola "valor" con signo.');
  }

  const referencias = new Set<string>();
  return lineas.slice(1).map(({ l, n }) => {
    const campos = partir(l, sep);
    try {
      const referencia = campos[iRef] ?? '';
      if (!referencia) throw new Error('falta la referencia');
      if (referencias.has(referencia)) throw new Error(`la referencia "${referencia}" está repetida`);
      referencias.add(referencia);

      let neto: number;
      if (iValor >= 0) {
        neto = parseMonto(campos[iValor] ?? '');
      } else {
        const debito = Math.abs(parseMonto(campos[iDeb] ?? ''));
        const credito = Math.abs(parseMonto(campos[iCred] ?? ''));
        if (debito > 0 && credito > 0) throw new Error('trae débito y crédito a la vez');
        neto = credito - debito;
      }
      if (neto === 0) throw new Error('el monto es cero');

      return {
        postedOn: parseFecha(campos[iFecha] ?? ''),
        direction: neto < 0 ? 'DEBIT' : 'CREDIT',
        amount: Math.round(Math.abs(neto) * 100) / 100,
        bankReference: referencia,
        description: iDesc >= 0 ? campos[iDesc] ?? '' : '',
      } as MovimientoCsv;
    } catch (e) {
      throw new Error(`Línea ${n}: ${(e as Error).message}`);
    }
  });
}

/** Lo que los movimientos le suman al saldo: créditos menos débitos. */
export function netoDe(movs: MovimientoCsv[]): number {
  const centavos = movs.reduce(
    (s, m) => s + (m.direction === 'CREDIT' ? 1 : -1) * Math.round(m.amount * 100),
    0,
  );
  return centavos / 100;
}
