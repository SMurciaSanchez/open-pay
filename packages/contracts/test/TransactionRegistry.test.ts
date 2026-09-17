import { expect } from "chai";
import { ethers } from "hardhat";
import { TransactionRegistry } from "../typechain-types";

describe("TransactionRegistry", () => {
  let registry: TransactionRegistry;
  let owner: any;
  let signer: any;
  let stranger: any;

  beforeEach(async () => {
    [owner, signer, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TransactionRegistry");
    registry = await Factory.deploy();
  });

  it("deployer is owner and authorized signer", async () => {
    expect(await registry.owner()).to.equal(owner.address);
    expect(await registry.authorizedSigners(owner.address)).to.be.true;
  });

  it("emits TransactionAnchored when owner anchors a P2P tx", async () => {
    const txHash = ethers.keccak256(ethers.toUtf8Bytes("sender|receiver|1000|1700000000"));
    const amount = 1000;
    const timestamp = 1700000000;

    await expect(registry.anchorTransaction(txHash, amount, timestamp))
      .to.emit(registry, "TransactionAnchored")
      .withArgs(txHash, amount, timestamp, owner.address);
  });

  it("reverts when unauthorized address tries to anchor", async () => {
    const txHash = ethers.keccak256(ethers.toUtf8Bytes("whatever"));
    await expect(
      registry.connect(stranger).anchorTransaction(txHash, 100, 1700000000)
    ).to.be.revertedWithCustomError(registry, "NotAuthorizedSigner");
  });

  it("owner can authorize a new signer", async () => {
    await expect(registry.authorizeSigner(signer.address))
      .to.emit(registry, "SignerAuthorized")
      .withArgs(signer.address);
    expect(await registry.authorizedSigners(signer.address)).to.be.true;
  });

  it("authorized signer can anchor after being authorized", async () => {
    await registry.authorizeSigner(signer.address);
    const txHash = ethers.keccak256(ethers.toUtf8Bytes("x"));
    await expect(registry.connect(signer).anchorTransaction(txHash, 50, 1))
      .to.emit(registry, "TransactionAnchored")
      .withArgs(txHash, 50, 1, signer.address);
  });

  it("non-owner cannot authorize signers", async () => {
    await expect(
      registry.connect(stranger).authorizeSigner(stranger.address)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });

  it("owner can revoke a signer", async () => {
    await registry.authorizeSigner(signer.address);
    await registry.revokeSigner(signer.address);
    expect(await registry.authorizedSigners(signer.address)).to.be.false;
  });

  it("emits EntityPaymentAnchored for entity payments", async () => {
    const txHash = ethers.keccak256(ethers.toUtf8Bytes("entity-tx"));
    const entityId = ethers.keccak256(ethers.toUtf8Bytes("DIAN-IMPUESTOS-2026"));
    const metadata = "Pago predial 2026";

    await expect(
      registry.anchorEntityPayment(txHash, entityId, 50000, 1700000000, metadata)
    )
      .to.emit(registry, "EntityPaymentAnchored")
      .withArgs(txHash, entityId, 50000, 1700000000, metadata);
  });

  it("rejects zero address for authorizeSigner", async () => {
    await expect(
      registry.authorizeSigner(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");
  });

  it("transferOwnership moves ownership", async () => {
    await expect(registry.transferOwnership(signer.address))
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(owner.address, signer.address);
    expect(await registry.owner()).to.equal(signer.address);
  });
});
