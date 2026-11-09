import { netoDe, parseExtracto, parseFecha, parseMonto } from './csv';

describe('parseMonto', () => {
  it.each([
    ['5000000', 5000000],
    ['5.000.000', 5000000],
    ['5.000.000,00', 5000000],
    ['5,000,000.50', 5000000.5],
    ['5.000', 5000],
    ['5000,5', 5000.5],
    ['5000.50', 5000.5],
    ['$ 12.500', 12500],
    ['-12.500', -12500],
    ['(12.500)', -12500],
    ['', 0],
  ])('%s → %s', (texto, esperado) => {
    expect(parseMonto(texto)).toBe(esperado);
  });

  it('rechaza lo que no es un monto', () => {
    expect(() => parseMonto('cinco mil')).toThrow();
    expect(() => parseMonto('5.000,123')).toThrow();
  });
});

describe('parseFecha', () => {
  it('acepta los dos formatos', () => {
    expect(parseFecha('2026-11-09')).toBe('2026-11-09');
    expect(parseFecha('9/11/2026')).toBe('2026-11-09');
    expect(parseFecha('09-11-2026')).toBe('2026-11-09');
  });
  it('rechaza fechas que no existen', () => {
    expect(() => parseFecha('2026-02-30')).toThrow();
    expect(() => parseFecha('ayer')).toThrow();
  });
});

describe('parseExtracto', () => {
  const csv = [
    'fecha;referencia;descripcion;debito;credito',
    '2026-11-03;REF001;"Donación; primer desembolso";;100.000.000',
    '2026-11-09;REF002;Pago proveedor;5.000.000;',
    '2026-11-09;REF003;Comisión;12.500,00;',
  ].join('\r\n');

  it('lee débitos y créditos con punto y coma', () => {
    const movs = parseExtracto(csv);
    expect(movs).toHaveLength(3);
    expect(movs[0]).toEqual({
      postedOn: '2026-11-03',
      direction: 'CREDIT',
      amount: 100000000,
      bankReference: 'REF001',
      description: 'Donación; primer desembolso',
    });
    expect(movs[1].direction).toBe('DEBIT');
    expect(movs[1].amount).toBe(5000000);
    expect(netoDe(movs)).toBe(94987500);
  });

  it('lee una columna valor con signo, separada por comas y con tildes en la cabecera', () => {
    const movs = parseExtracto('Fecha,Referencia,Descripción,Valor\n09/11/2026,A1,Pago,-5000000\n');
    expect(movs).toEqual([
      { postedOn: '2026-11-09', direction: 'DEBIT', amount: 5000000, bankReference: 'A1', description: 'Pago' },
    ]);
  });

  it('dice en qué línea está el error', () => {
    expect(() => parseExtracto('fecha,referencia,valor\n2026-11-09,A1,100\n2026-13-09,A2,100')).toThrow(/Línea 3/);
    expect(() => parseExtracto('fecha,referencia,valor\n2026-11-09,A1,100\n2026-11-09,A1,100')).toThrow(/repetida/);
    expect(() => parseExtracto('fecha,referencia,debito,credito\n2026-11-09,A1,100,100')).toThrow(/a la vez/);
  });

  it('exige las columnas mínimas', () => {
    expect(() => parseExtracto('fecha,valor\n2026-11-09,100')).toThrow(/referencia/);
    expect(() => parseExtracto('fecha,referencia\n2026-11-09,A1')).toThrow(/monto/);
    expect(() => parseExtracto('fecha,referencia,valor')).toThrow(/no tiene movimientos/);
  });
});
