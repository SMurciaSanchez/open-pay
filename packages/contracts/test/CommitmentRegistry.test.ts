import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

const PAYMENT_BATCH = 0;
const VENDOR_SET = 1;
const RULE_SET = 2;
const VERIFICATION_KEY = 3;

const SUBJECT = ethers.keccak256(ethers.toUtf8Bytes('fondo-salud-publico'));
const ROOT_A = ethers.keccak256(ethers.toUtf8Bytes('raiz-a'));
const ROOT_B = ethers.keccak256(ethers.toUtf8Bytes('raiz-b'));
const ZERO_BYTES32 = ethers.ZeroHash;

describe('CommitmentRegistry', () => {
  async function deploy() {
    const [owner, publisher, extraño, nuevoDueño] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('CommitmentRegistry');
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, publisher, extraño, nuevoDueño };
  }

  describe('despliegue', () => {
    it('deja al que despliega como dueño y como publicador', async () => {
      const { registry, owner } = await loadFixture(deploy);
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.isPublisher(owner.address)).to.equal(true);
      expect(await registry.rootCount()).to.equal(0n);
    });
  });

  describe('publicar raíces', () => {
    it('ancla una raíz y la deja consultable', async () => {
      const { registry, owner } = await loadFixture(deploy);

      await expect(registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A))
        .to.emit(registry, 'RootPublished')
        .withArgs(0n, ROOT_A, SUBJECT, PAYMENT_BATCH, anyUint, owner.address);

      expect(await registry.rootCount()).to.equal(1n);
      expect(await registry.isKnownRoot(ROOT_A)).to.equal(true);

      const raíz = await registry.rootAt(0);
      expect(raíz.value).to.equal(ROOT_A);
      expect(raíz.subject).to.equal(SUBJECT);
      expect(raíz.kind).to.equal(BigInt(PAYMENT_BATCH));
      expect(raíz.publisher).to.equal(owner.address);
      expect(raíz.publishedAt).to.be.greaterThan(0n);
    });

    it('numera las raíces en orden', async () => {
      const { registry } = await loadFixture(deploy);
      await registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A);
      await registry.publishRoot(VENDOR_SET, SUBJECT, ROOT_B);
      expect(await registry.rootCount()).to.equal(2n);
      expect((await registry.rootAt(1)).kind).to.equal(BigInt(VENDOR_SET));
    });

    it('acepta los cuatro tipos de raíz', async () => {
      const { registry } = await loadFixture(deploy);
      for (const [i, kind] of [PAYMENT_BATCH, VENDOR_SET, RULE_SET, VERIFICATION_KEY].entries()) {
        const root = ethers.keccak256(ethers.toUtf8Bytes(`raiz-${i}`));
        await registry.publishRoot(kind, SUBJECT, root);
        expect((await registry.rootAt(i)).kind).to.equal(BigInt(kind));
      }
    });

    it('no ancla la misma raíz dos veces', async () => {
      const { registry } = await loadFixture(deploy);
      await registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A);
      await expect(registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A))
        .to.be.revertedWithCustomError(registry, 'RootAlreadyPublished')
        .withArgs(ROOT_A);
    });

    it('no ancla la raíz vacía', async () => {
      const { registry } = await loadFixture(deploy);
      await expect(
        registry.publishRoot(PAYMENT_BATCH, SUBJECT, ZERO_BYTES32),
      ).to.be.revertedWithCustomError(registry, 'ZeroRoot');
    });

    it('un desconocido no publica', async () => {
      const { registry, extraño } = await loadFixture(deploy);
      await expect(
        registry.connect(extraño).publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A),
      ).to.be.revertedWithCustomError(registry, 'NotPublisher');
    });

    it('lo que se ancló no se puede cambiar: no existe función para hacerlo', async () => {
      const { registry } = await loadFixture(deploy);
      const funciones = registry.interface.fragments
        .filter((f): f is any => f.type === 'function')
        .map((f) => f.name);
      expect(funciones).to.not.include.members(['updateRoot', 'removeRoot', 'setRoot']);
      // Tampoco hay forma de borrar el registro entero
      expect(funciones.some((n) => /destroy|selfdestruct|clear|reset/i.test(n))).to.equal(false);
    });

    it('solo recibe bytes32: ningún monto ni texto cabe en el contrato', async () => {
      const { registry } = await loadFixture(deploy);
      const publish = registry.interface.getFunction('publishRoot');
      const tipos = publish!.inputs.map((i) => i.type);
      expect(tipos).to.deep.equal(['uint8', 'bytes32', 'bytes32']);
      // Ninguna función del contrato acepta texto ni números de monto
      const entradas = registry.interface.fragments
        .filter((f): f is any => f.type === 'function')
        .flatMap((f) => f.inputs.map((i: any) => i.type));
      expect(entradas.some((t) => t === 'string' || t.startsWith('uint128') || t === 'bytes')).to.equal(false);
    });
  });

  describe('lectura pública', () => {
    it('cualquiera puede verificar una raíz sin ser publicador', async () => {
      const { registry, extraño } = await loadFixture(deploy);
      await registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A);
      expect(await registry.connect(extraño).isKnownRoot(ROOT_A)).to.equal(true);
      expect(await registry.connect(extraño).isKnownRoot(ROOT_B)).to.equal(false);
    });

    it('publishedAt devuelve cero para una raíz que nunca se ancló', async () => {
      const { registry } = await loadFixture(deploy);
      expect(await registry.publishedAt(ROOT_B)).to.equal(0n);
      await registry.publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_B);
      expect(await registry.publishedAt(ROOT_B)).to.be.greaterThan(0n);
    });

    it('pedir una raíz que no existe falla claro', async () => {
      const { registry } = await loadFixture(deploy);
      await expect(registry.rootAt(0)).to.be.revertedWithCustomError(registry, 'NoSuchRoot');
    });
  });

  describe('quién puede publicar', () => {
    it('el dueño autoriza y revoca', async () => {
      const { registry, publisher } = await loadFixture(deploy);

      await expect(registry.authorizePublisher(publisher.address))
        .to.emit(registry, 'PublisherAuthorized')
        .withArgs(publisher.address);
      await registry.connect(publisher).publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A);

      await expect(registry.revokePublisher(publisher.address))
        .to.emit(registry, 'PublisherRevoked')
        .withArgs(publisher.address);
      await expect(
        registry.connect(publisher).publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_B),
      ).to.be.revertedWithCustomError(registry, 'NotPublisher');
    });

    it('revocar a un publicador no borra lo que ya ancló', async () => {
      const { registry, publisher } = await loadFixture(deploy);
      await registry.authorizePublisher(publisher.address);
      await registry.connect(publisher).publishRoot(PAYMENT_BATCH, SUBJECT, ROOT_A);
      await registry.revokePublisher(publisher.address);
      expect(await registry.isKnownRoot(ROOT_A)).to.equal(true);
    });

    it('un desconocido no autoriza publicadores', async () => {
      const { registry, extraño } = await loadFixture(deploy);
      await expect(
        registry.connect(extraño).authorizePublisher(extraño.address),
      ).to.be.revertedWithCustomError(registry, 'NotOwner');
    });

    it('no autoriza la dirección cero', async () => {
      const { registry } = await loadFixture(deploy);
      await expect(
        registry.authorizePublisher(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });
  });

  describe('traspaso de dueño en dos pasos', () => {
    it('el nuevo dueño tiene que aceptar', async () => {
      const { registry, owner, nuevoDueño } = await loadFixture(deploy);

      await expect(registry.transferOwnership(nuevoDueño.address))
        .to.emit(registry, 'OwnershipTransferStarted')
        .withArgs(owner.address, nuevoDueño.address);
      expect(await registry.owner()).to.equal(owner.address);

      await expect(registry.connect(nuevoDueño).acceptOwnership())
        .to.emit(registry, 'OwnershipTransferred')
        .withArgs(owner.address, nuevoDueño.address);
      expect(await registry.owner()).to.equal(nuevoDueño.address);
      expect(await registry.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it('nadie más puede aceptar el traspaso', async () => {
      const { registry, extraño, nuevoDueño } = await loadFixture(deploy);
      await registry.transferOwnership(nuevoDueño.address);
      await expect(
        registry.connect(extraño).acceptOwnership(),
      ).to.be.revertedWithCustomError(registry, 'NotPendingOwner');
    });

    it('una dirección mal tecleada no deja el registro sin dueño', async () => {
      const { registry, owner, nuevoDueño } = await loadFixture(deploy);
      await registry.transferOwnership(nuevoDueño.address);
      // El dueño se da cuenta y apunta a otra parte antes de que acepten
      await registry.transferOwnership(owner.address);
      await expect(
        registry.connect(nuevoDueño).acceptOwnership(),
      ).to.be.revertedWithCustomError(registry, 'NotPendingOwner');
      expect(await registry.owner()).to.equal(owner.address);
    });
  });
});

/** Comodín para el `publishedAt` del evento, que es la hora del bloque. */
const anyUint = (value: bigint) => typeof value === 'bigint' && value > 0n;
