import { ROOT_KIND, ROOT_PUBLISHED_TOPIC, decodeRootPublished, fundSubject } from './registry';

// Evento real: la lista de proveedores del fondo de demostración, anclada el
// 2026-11-09 en Base Sepolia (tx 0x73a51858…f44b53).
const REGISTRO = '0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B';
const FONDO_DEMO = '7f24a907-0f2b-41f8-96bb-300365b24f99';
const LOG = {
  address: '0xcde0eed0e0c4876f1e9a57f49f5b8e4af06b350b',
  topics: [
    '0xbd1cfebfb5fb1f59afce0f90b2e468eecbb7570f3a52c44071e3fff3c1c9384d',
    '0x0000000000000000000000000000000000000000000000000000000000000003',
    '0x2d2c84167d23fce36e6c5feae8560a28dc43c0aaa40b4707d9060dda41a40e90',
    '0x08a1e8cdacf244fbf5a542ed44db672afbdb8f29da9d76dd5618cf68f0be8f4e',
  ],
  data:
    '0x0000000000000000000000000000000000000000000000000000000000000001' +
    '000000000000000000000000000000000000000000000000000000006af25077' +
    '0000000000000000000000003e10188f887bb3c621d7153ce7854f506033118d',
};

describe('lectura del registro en la cadena', () => {
  it('la firma del evento es la que emite el contrato', () => {
    expect(ROOT_PUBLISHED_TOPIC).toBe(LOG.topics[0]);
  });

  it('el identificador público del fondo es el que quedó en la cadena', () => {
    expect(fundSubject(FONDO_DEMO)).toBe(LOG.topics[3]);
  });

  it('lee la raíz, el fondo y el tipo de un evento real', () => {
    expect(decodeRootPublished(LOG, REGISTRO)).toEqual({
      value: LOG.topics[2],
      subject: LOG.topics[3],
      kind: ROOT_KIND.VendorSet,
    });
  });

  it('ignora un evento igual emitido por otro contrato', () => {
    expect(decodeRootPublished({ ...LOG, address: '0x' + '1'.repeat(40) }, REGISTRO)).toBeNull();
  });

  it('ignora otros eventos del registro', () => {
    const otro = { ...LOG, topics: ['0x' + 'a'.repeat(64), ...LOG.topics.slice(1)] };
    expect(decodeRootPublished(otro, REGISTRO)).toBeNull();
  });
});
