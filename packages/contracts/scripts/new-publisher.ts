// Separa la billetera que publica de la billetera dueña del registro.
//
// Por qué: el servidor web necesita una llave para anclar raíces. Si esa llave
// es la del dueño del contrato y se filtra, quien la tenga puede autorizar
// publicadores propios y quedarse con el registro. Con una billetera aparte,
// lo peor que puede pasar es que publique raíces, y el dueño la revoca.
//
// Qué hace, en este orden:
//   1. Comprueba que la cuenta de packages/contracts/.env es la dueña.
//   2. Crea una billetera nueva (la llave nunca se imprime).
//   3. La autoriza como publicadora (authorizePublisher) y espera la confirmación.
//   4. Le pasa un poco de ETH para el gas.
//   5. Escribe su llave en packages/web/.env.local como PUBLISHER_PRIVATE_KEY.
//
// Sin CONFIRMAR=1 solo revisa y dice qué haría: no envía nada ni toca archivos.
//
//   npx hardhat run scripts/new-publisher.ts --network baseSepolia
//   CONFIRMAR=1 npx hardhat run scripts/new-publisher.ts --network baseSepolia
//
// Después: copiar la llave nueva de .env.local a Vercel (PUBLISHER_PRIVATE_KEY).
// La llave del dueño se queda solo en packages/contracts/.env.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ethers, network } from "hardhat";

const ENV_WEB = path.resolve(__dirname, "..", "..", "web", ".env.local");
const VARIABLE = "PUBLISHER_PRIVATE_KEY";
// Cada anclaje cuesta unos 0,000003 ETH en Base Sepolia: esto alcanza para decenas.
const FONDEO = ethers.parseEther(process.env.FONDEO_ETH ?? "0.0001");

const ABI = [
  "function owner() view returns (address)",
  "function isPublisher(address) view returns (bool)",
  "function authorizePublisher(address publisher)",
];

function leerEnv(): string[] {
  if (!existsSync(ENV_WEB)) throw new Error(`No existe ${ENV_WEB}`);
  return readFileSync(ENV_WEB, "utf8").split(/\r?\n/);
}

const valorDe = (lineas: string[], nombre: string) =>
  lineas.find((l) => l.startsWith(`${nombre}=`))?.slice(nombre.length + 1).trim() ?? "";

async function main() {
  const confirmar = process.env.CONFIRMAR === "1";
  const [dueño] = await ethers.getSigners();
  if (!dueño) throw new Error("Hardhat no cargó ninguna cuenta: revisa DEPLOYER_PRIVATE_KEY en packages/contracts/.env");

  const lineas = leerEnv();
  const direccion = valorDe(lineas, "NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS");
  if (!ethers.isAddress(direccion)) throw new Error("Falta NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS en packages/web/.env.local");
  const registro = new ethers.Contract(direccion, ABI, dueño);

  console.log(`Red:       ${network.name}`);
  console.log(`Registro:  ${direccion}`);
  console.log(`Dueño:     ${await registro.owner()}`);
  console.log(`Tu cuenta: ${dueño.address}`);
  if ((await registro.owner()).toLowerCase() !== dueño.address.toLowerCase()) {
    throw new Error("La cuenta de packages/contracts/.env no es la dueña del registro: no puede autorizar publicadores.");
  }

  // ¿Qué hay hoy en la web?
  const actual = valorDe(lineas, VARIABLE).replace(/^0x/, "");
  if (actual) {
    if (!/^[0-9a-fA-F]{64}$/.test(actual)) throw new Error(`${VARIABLE} de .env.local no tiene forma de llave.`);
    const direccionActual = new ethers.Wallet("0x" + actual).address;
    if (direccionActual.toLowerCase() !== dueño.address.toLowerCase()) {
      const autorizada = await registro.isPublisher(direccionActual);
      const saldo = await ethers.provider.getBalance(direccionActual);
      console.log(`\nLa web ya usa una billetera distinta de la dueña: ${direccionActual}`);
      console.log(`  autorizada como publicadora: ${autorizada ? "sí" : "NO"}`);
      console.log(`  saldo: ${ethers.formatEther(saldo)} ETH`);
      console.log("No hay nada que hacer. (Para reemplazarla, borra la línea de .env.local y vuelve a correr.)");
      return;
    }
    console.log("\nLa web usa hoy la llave de la dueña. Se va a reemplazar por una billetera nueva.");
    console.log("(La llave de la dueña sigue en packages/contracts/.env: no se pierde.)");
  } else {
    console.log(`\nLa web no tiene ${VARIABLE}. Se va a crear una billetera nueva.`);
  }

  const saldoDueño = await ethers.provider.getBalance(dueño.address);
  console.log(`\nSaldo de la dueña: ${ethers.formatEther(saldoDueño)} ETH`);
  console.log(`Se le pasarán a la nueva: ${ethers.formatEther(FONDEO)} ETH`);
  if (saldoDueño < FONDEO + ethers.parseEther("0.00002")) {
    throw new Error("La dueña no tiene saldo suficiente para fondear y pagar el gas. Pide ETH de prueba en el faucet de Coinbase o baja FONDEO_ETH.");
  }

  if (!confirmar) {
    console.log("\nRevisión terminada: todo listo. No se envió nada ni se tocó ningún archivo.");
    console.log("Para hacerlo de verdad:");
    console.log("  CONFIRMAR=1 npx hardhat run scripts/new-publisher.ts --network baseSepolia");
    return;
  }

  const nueva = ethers.Wallet.createRandom();
  console.log(`\nBilletera nueva: ${nueva.address}`);

  console.log("Autorizándola como publicadora...");
  const tx1 = await registro.authorizePublisher(nueva.address);
  await tx1.wait(1);
  console.log(`  listo: ${tx1.hash}`);
  if (!(await registro.isPublisher(nueva.address))) throw new Error("La transacción se confirmó pero la billetera no quedó autorizada.");

  console.log("Pasándole ETH para el gas...");
  const tx2 = await dueño.sendTransaction({ to: nueva.address, value: FONDEO });
  await tx2.wait(1);
  console.log(`  listo: ${tx2.hash}`);

  // Solo ahora, con todo confirmado, se cambia la llave que usa la web.
  const linea = `${VARIABLE}=${nueva.privateKey.replace(/^0x/, "")}`;
  const i = lineas.findIndex((l) => l.startsWith(`${VARIABLE}=`));
  if (i >= 0) lineas[i] = linea;
  else lineas.push(linea);
  const temporal = ENV_WEB + ".tmp";
  writeFileSync(temporal, lineas.join("\n"));
  renameSync(temporal, ENV_WEB);

  console.log(`\n✅ ${VARIABLE} de packages/web/.env.local ahora es la billetera nueva.`);
  console.log(`   Dirección: ${nueva.address}`);
  console.log(`   Saldo:     ${ethers.formatEther(await ethers.provider.getBalance(nueva.address))} ETH`);
  console.log("\nFalta, a mano:");
  console.log("  - Reiniciar el servidor local (npm run dev) para que tome la llave nueva.");
  console.log(`  - En Vercel, poner ${VARIABLE} con el valor de .env.local (NO la de packages/contracts/.env).`);
  console.log("  - Guardar copia de packages/web/.env.local: esta llave solo existe ahí.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
});
