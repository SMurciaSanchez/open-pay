import { createCipheriv, randomBytes } from 'crypto';
import { BANK_KEY_ID, decryptBankValue, encryptBankValue } from './bankCrypto';

const maestra = Buffer.alloc(32, 7);
const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

describe('cifrado de datos bancarios', () => {
  it('lo cifrado se vuelve a leer con la misma organización y el mismo campo', () => {
    const c = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    expect(decryptBankValue(maestra, ORG_A, 'account-number', BANK_KEY_ID, c)).toBe('00123456789');
  });

  it('el mismo texto no da dos veces el mismo cifrado', () => {
    const a = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    const b = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    expect(a.equals(b)).toBe(false);
  });

  it('un cifrado copiado a otra organización no descifra', () => {
    const c = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    expect(() => decryptBankValue(maestra, ORG_B, 'account-number', BANK_KEY_ID, c)).toThrow();
  });

  it('un cifrado movido a otro campo de la misma organización no descifra', () => {
    const c = encryptBankValue(maestra, ORG_A, 'movement-description', 'Pago a Juan Pérez');
    expect(() => decryptBankValue(maestra, ORG_A, 'account-number', BANK_KEY_ID, c)).toThrow();
  });

  it('cada organización cifra con su propia llave, no con la maestra', () => {
    const c = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    // Con el formato viejo (llave maestra directa, dato asociado = organización) no abre.
    expect(() => decryptBankValue(maestra, ORG_A, 'account-number', 'bank-v1', c)).toThrow();
  });

  it('lo cifrado con el formato anterior (bank-v1) se sigue leyendo', () => {
    const nonce = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', maestra, nonce);
    cifrador.setAAD(Buffer.from(ORG_A, 'utf8'));
    const cuerpo = Buffer.concat([cifrador.update('TRF-0002 Droguería', 'utf8'), cifrador.final()]);
    const viejo = Buffer.concat([nonce, cuerpo, cifrador.getAuthTag()]);
    expect(decryptBankValue(maestra, ORG_A, 'movement-description', 'bank-v1', viejo)).toBe('TRF-0002 Droguería');
  });

  it('una versión de llave desconocida se rechaza', () => {
    const c = encryptBankValue(maestra, ORG_A, 'account-number', '1');
    expect(() => decryptBankValue(maestra, ORG_A, 'account-number', 'bank-v9', c)).toThrow(/desconocida/);
  });

  it('un cifrado alterado se rechaza', () => {
    const c = encryptBankValue(maestra, ORG_A, 'account-number', '00123456789');
    c[c.length - 1] ^= 1;
    expect(() => decryptBankValue(maestra, ORG_A, 'account-number', BANK_KEY_ID, c)).toThrow();
  });
});
