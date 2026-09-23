// Ancla la huella de la clave de verificación ZK en CommitmentRegistry.
//
// Por defecto es un simulacro: calcula la huella, revisa el estado del registro
// y estima el gas, pero NO envía nada. Para enviar de verdad:
//
//   CONFIRMAR=si npx hardhat run scripts/anchor-vkey.ts --network baseSepolia
//
// Una raíz anclada no se puede borrar ni repetir, así que el script se niega a
// enviar si la huella que calcula no coincide con la esperada o si ya está.
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ethers, network } from "hardhat";

const REGISTRY =
  process.env.REGISTRY_ADDRESS || "0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B";

// La que sirve el portal público: es la que la gente va a comparar.
const VKEY_PATH = resolve(__dirname, "../../web/public/zk/verification_key.json");

// Huella del circuito de 64 hojas (commit da4d612). Si el archivo da otra, algo
// cambió desde entonces y hay que mirar antes de anclar.
const HUELLA_ESPERADA =
  "0x8c8b7d9d715ac44dad2eb1b79d2aaa483107b50c6d4e90a91117ce1ab84700c9";

// La clave no es de un fondo sino del circuito, que comparten todos. Por eso el
// subject es una etiqueta pública y fija: cualquiera puede recalcularla.
const ETIQUETA_SUBJECT = "openpay:circuito:authorized_within_budget";
const SUBJECT = ethers.keccak256(ethers.toUtf8Bytes(ETIQUETA_SUBJECT));

const RootKind = { VerificationKey: 3 } as const;

// Mismo JSON canónico que packages/circuits/src/prove.ts y web/src/lib/zk/verify.ts.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

async function main() {
  const vkey = JSON.parse(readFileSync(VKEY_PATH, "utf8"));
  const huella =
    "0x" + createHash("sha256").update(JSON.stringify(sortKeys(vkey)), "utf8").digest("hex");

  console.log(`Red:       ${network.name}`);
  console.log(`Registro:  ${REGISTRY}`);
  console.log(`Clave:     ${VKEY_PATH}`);
  console.log(`Huella:    ${huella}`);
  console.log(`Subject:   ${SUBJECT}  (keccak256("${ETIQUETA_SUBJECT}"))`);

  if (huella !== HUELLA_ESPERADA) {
    console.error(`\n❌ La huella no coincide con la esperada (${HUELLA_ESPERADA}).`);
    console.error("   No se ancla nada. Revisa qué cambió en la clave.");
    process.exitCode = 1;
    return;
  }

  const [signer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("CommitmentRegistry", REGISTRY, signer);

  if (await registry.isKnownRoot(huella)) {
    const cuando = await registry.publishedAt(huella);
    console.log(`\n✅ Ya estaba anclada (${new Date(Number(cuando) * 1000).toISOString()}).`);
    return;
  }
  if (!(await registry.isPublisher(signer.address))) {
    console.error(`\n❌ ${signer.address} no está autorizada a publicar en el registro.`);
    process.exitCode = 1;
    return;
  }

  const gas = await registry.publishRoot.estimateGas(RootKind.VerificationKey, SUBJECT, huella);
  const saldo = await ethers.provider.getBalance(signer.address);
  console.log(`Firmante:  ${signer.address} (${ethers.formatEther(saldo)} ETH)`);
  console.log(`Gas est.:  ${gas}`);

  if (process.env.CONFIRMAR !== "si") {
    console.log("\nSimulacro: no se envió nada. Para anclar, repetir con CONFIRMAR=si.");
    return;
  }

  const tx = await registry.publishRoot(RootKind.VerificationKey, SUBJECT, huella);
  console.log(`\nEnviada:   ${tx.hash}`);
  const recibo = await tx.wait();
  // Del evento y no de rootCount(): el RPC público puede ir un bloque atrasado.
  const evento = recibo?.logs
    .map((log) => registry.interface.parseLog(log))
    .find((e) => e?.name === "RootPublished");
  const indice = evento?.args.index;
  console.log(`Bloque:    ${recibo?.blockNumber}`);
  console.log(`Índice:    ${indice}`);
  console.log(`✅ Huella anclada. Compárala en https://sepolia.basescan.org/tx/${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
