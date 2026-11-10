import { publicChainMessage, publicDbError } from './errors';

describe('errores de la base que se le muestran al usuario', () => {
  it('un mensaje nuestro (RAISE EXCEPTION) pasa tal cual', () => {
    expect(publicDbError({ code: 'P0001', message: 'El mes todavía no ha cerrado' })).toEqual({
      mensaje: 'El mes todavía no ha cerrado',
      status: 400,
    });
  });

  it('"No autorizado" es un 403', () => {
    expect(publicDbError({ code: 'P0001', message: 'No autorizado' }).status).toBe(403);
  });

  it('falta de permiso o RLS es un 403 sin detalles', () => {
    const r = publicDbError({ code: '42501', message: 'permission denied for table Payment' });
    expect(r).toEqual({ mensaje: 'Tu rol no permite hacer esto.', status: 403 });
    expect(
      publicDbError({ message: 'new row violates row-level security policy for table "Budget"' }).status,
    ).toBe(403);
  });

  it('un token vencido es un 401', () => {
    expect(publicDbError({ code: 'PGRST301', message: 'JWT expired' }).status).toBe(401);
  });

  it('un error interno de Postgres no llega al usuario', () => {
    const r = publicDbError({ code: '42703', message: 'column "salt" of relation "Payment" does not exist' });
    expect(r.status).toBe(500);
    expect(r.mensaje).not.toMatch(/salt|Payment|column/);
  });

  it('un error sin código tampoco', () => {
    expect(publicDbError({ message: 'connection to 10.0.0.5 refused' }).mensaje).not.toMatch(/10\.0\.0\.5/);
  });
});

describe('errores de la cadena que se le muestran al usuario', () => {
  it('el resumen corto de ethers pasa', () => {
    expect(publicChainMessage({ shortMessage: 'insufficient funds for intrinsic transaction cost' })).toMatch(
      /insufficient funds/,
    );
  });

  it('un mensaje con la dirección del nodo no pasa', () => {
    const m = publicChainMessage({
      message: 'server response 429 (requestUrl="https://base.example/v2/CLAVE-SECRETA")',
    });
    expect(m).not.toMatch(/CLAVE-SECRETA|https?:/);
  });

  it('ni aunque venga en el resumen corto', () => {
    expect(publicChainMessage({ shortMessage: 'bad response from https://base.example/v2/CLAVE' })).not.toMatch(
      /CLAVE/,
    );
  });
});
