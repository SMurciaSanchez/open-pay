/**
 * Imprime la huella de la clave de verificación, para anclarla en
 * CommitmentRegistry con RootKind.VerificationKey.
 *
 *   npx ts-node src/vkey-hash.ts
 *
 * Es lo que permite que quien entra al portal público no tenga que creerle al
 * portal: compara esta huella con la anclada en la cadena y, si coinciden, sabe
 * que la clave con la que verificó es la que la organización publicó.
 */
import { VKEY_PATH, loadVerificationKey, verificationKeyHash } from './prove';

function main() {
  let vkey: unknown;
  try {
    vkey = loadVerificationKey();
  } catch {
    console.error(`No se encontró la clave de verificación en ${VKEY_PATH}.`);
    console.error('Generala con: npm run build');
    process.exit(1);
  }

  const huella = verificationKeyHash(vkey);

  console.log('Clave de verificación:', VKEY_PATH);
  console.log('Huella (SHA-256 del JSON canónico):');
  console.log(huella);
  console.log();
  console.log('Para anclarla:');
  console.log(`  publishRoot(RootKind.VerificationKey, <subject del fondo>, ${huella})`);
}

main();
