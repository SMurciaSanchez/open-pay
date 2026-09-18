// Comprueba que .env carga bien SIN imprimir la llave privada:
// solo muestra la direccion derivada y su saldo.
import { ethers, network } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ Hardhat no cargo ninguna cuenta.");
    console.error("   Revisa DEPLOYER_PRIVATE_KEY en packages/contracts/.env");
    process.exitCode = 1;
    return;
  }
  const [deployer] = signers;
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Red:        ${network.name}`);
  console.log(`Direccion:  ${deployer.address}`);
  console.log(`Saldo:      ${ethers.formatEther(balance)} ETH`);

  const esperada = "0x3e10188f887Bb3C621D7153Ce7854F506033118D";
  console.log(
    deployer.address.toLowerCase() === esperada.toLowerCase()
      ? "✅ Es la wallet de deploy esperada."
      : `⚠️  NO coincide con la esperada (${esperada}).`
  );
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
