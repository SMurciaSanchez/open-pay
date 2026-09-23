// Ancla las dos raíces que usa una prueba ZK: la del lote de pagos
// (PaymentBatch) y la del conjunto de proveedores autorizados (VendorSet).
//
// Por defecto es un simulacro y toma la prueba de la demo. Para enviar de verdad:
//
//   CONFIRMAR=si npx hardhat run scripts/anchor-proof-roots.ts --network baseSepolia
//
// Variables opcionales: PRUEBA (ruta al JSON de la prueba) y FONDO (etiqueta
// pública del fondo, de la que sale el subject).
//
// Las raíces ancladas no se pueden borrar ni repetir. Las que ya estén se
// saltan, así que correrlo dos veces no gasta de más.
import { readFileSync } from "fs";
import { resolve } from "path";
import { ethers, network } from "hardhat";

const REGISTRY =
  process.env.REGISTRY_ADDRESS || "0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B";
const PRUEBA = resolve(
  process.env.PRUEBA || resolve(__dirname, "../../circuits/build/demo-proof.json"),
);
const ETIQUETA_FONDO = process.env.FONDO || "openpay:fondo:demo";
const SUBJECT = ethers.keccak256(ethers.toUtf8Bytes(ETIQUETA_FONDO));

const RootKind = { PaymentBatch: 0, VendorSet: 1 } as const;

// Las señales públicas vienen en decimal; el registro guarda bytes32.
const aBytes32 = (decimal: string) => ethers.toBeHex(BigInt(decimal), 32);

async function main() {
  const { claim, publicSignals } = JSON.parse(readFileSync(PRUEBA, "utf8"));

  // Lo que se ancla tiene que ser lo que la prueba compromete de verdad, no lo
  // que dice el resumen legible.
  if (claim.batchRoot !== publicSignals[0] || claim.vendorSetRoot !== publicSignals[1]) {
    console.error("❌ El claim no coincide con las señales públicas de la prueba. No se ancla nada.");
    process.exitCode = 1;
    return;
  }

  const raíces = [
    { nombre: "Lote de pagos", kind: RootKind.PaymentBatch, valor: aBytes32(claim.batchRoot) },
    { nombre: "Proveedores", kind: RootKind.VendorSet, valor: aBytes32(claim.vendorSetRoot) },
  ];

  console.log(`Red:       ${network.name}`);
  console.log(`Registro:  ${REGISTRY}`);
  console.log(`Prueba:    ${PRUEBA}`);
  console.log(`Subject:   ${SUBJECT}  (keccak256("${ETIQUETA_FONDO}"))`);

  const [signer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("CommitmentRegistry", REGISTRY, signer);

  if (!(await registry.isPublisher(signer.address))) {
    console.error(`\n❌ ${signer.address} no está autorizada a publicar en el registro.`);
    process.exitCode = 1;
    return;
  }

  const pendientes = [];
  for (const r of raíces) {
    const anclada = await registry.isKnownRoot(r.valor);
    console.log(`${r.nombre.padEnd(14)} ${r.valor}  ${anclada ? "ya anclada" : "pendiente"}`);
    if (!anclada) pendientes.push(r);
  }
  if (pendientes.length === 0) {
    console.log("\n✅ No hay nada que anclar.");
    return;
  }

  for (const r of pendientes) {
    const gas = await registry.publishRoot.estimateGas(r.kind, SUBJECT, r.valor);
    console.log(`Gas est. (${r.nombre}): ${gas}`);
  }

  if (process.env.CONFIRMAR !== "si") {
    console.log("\nSimulacro: no se envió nada. Para anclar, repetir con CONFIRMAR=si.");
    return;
  }

  // Una por una y esperando cada recibo: así el nonce no se pisa.
  for (const r of pendientes) {
    const tx = await registry.publishRoot(r.kind, SUBJECT, r.valor);
    const recibo = await tx.wait();
    const evento = recibo?.logs
      .map((log) => registry.interface.parseLog(log))
      .find((e) => e?.name === "RootPublished");
    console.log(
      `\n✅ ${r.nombre}: índice ${evento?.args.index}, bloque ${recibo?.blockNumber}` +
        `\n   https://sepolia.basescan.org/tx/${tx.hash}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
