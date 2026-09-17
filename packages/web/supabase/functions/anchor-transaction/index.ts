// Ancla una fila de Transaction en Base Sepolia via TransactionRegistry.
// Disparada por un Database Webhook de Supabase: INSERT sobre public."Transaction".
//
// Flujo:
//   1) Valida el secret del webhook (header X-Anchor-Secret).
//   2) Filtro: type TRANSFER o ENTITY_PAYMENT, status COMPLETED, onChainStatus PENDING.
//      Cualquier otra cosa se marca SKIPPED.
//   3a) Si es TRANSFER: computa txHash con senderId+receiverId y llama anchorTransaction.
//   3b) Si es ENTITY_PAYMENT: resuelve EntityReceiver.entityCode, computa txHash con
//       senderId+entityCode, entityId=keccak256(entityCode), y llama anchorEntityPayment
//       con metadata = description.
//   4) Actualiza la fila con onChainTxHash + onChainStatus=ANCHORED + anchoredAt.
//
// Fallos devuelven status 500 pero dejan la fila como FAILED para reintento manual.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.4";

const CONTRACT_ABI = [
  "function anchorTransaction(bytes32 txHash, uint128 amount, uint64 timestamp) external",
  "function anchorEntityPayment(bytes32 txHash, bytes32 entityId, uint128 amount, uint64 timestamp, string metadata) external",
];

type TransactionRow = {
  id: string;
  senderId: string;
  receiverId: string | null;
  entityReceiverId: string | null;
  isEntityPayment: boolean;
  amount: string | number;
  description: string | null;
  type: string;
  status: string;
  onChainStatus: string;
  createdAt: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: TransactionRow | null;
  old_record: TransactionRow | null;
};

function must(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const supabase = createClient(
  must("SUPABASE_URL"),
  must("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const provider = new ethers.JsonRpcProvider(must("BASE_SEPOLIA_RPC_URL"));
const signer = new ethers.Wallet(must("SIGNER_PRIVATE_KEY"), provider);
const contract = new ethers.Contract(must("CONTRACT_ADDRESS"), CONTRACT_ABI, signer);

const WEBHOOK_SECRET = must("WEBHOOK_SECRET");

function amountToMinorUnits(amount: string | number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const padded = (frac + "00").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(padded);
}

async function updateRow(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("Transaction").update(patch).eq("id", id);
  if (error) console.error(`Failed to update Transaction ${id}`, error);
}

async function anchorP2P(row: TransactionRow) {
  if (!row.receiverId) throw new Error("TRANSFER row missing receiverId");

  const amountCents = amountToMinorUnits(row.amount);
  const timestamp = BigInt(Math.floor(new Date(row.createdAt).getTime() / 1000));

  const txHash = ethers.solidityPackedKeccak256(
    ["string", "string", "uint128", "uint64"],
    [row.senderId, row.receiverId, amountCents, timestamp],
  );

  const tx = await contract.anchorTransaction(txHash, amountCents, timestamp);
  await tx.wait(1);
  return tx.hash as string;
}

async function anchorEntity(row: TransactionRow) {
  if (!row.entityReceiverId) throw new Error("ENTITY_PAYMENT row missing entityReceiverId");

  const { data: entity, error } = await supabase
    .from("EntityReceiver")
    .select("entityCode")
    .eq("id", row.entityReceiverId)
    .single();

  if (error || !entity?.entityCode) {
    throw new Error(`EntityReceiver ${row.entityReceiverId} not found: ${error?.message ?? "no entityCode"}`);
  }

  const amountCents = amountToMinorUnits(row.amount);
  const timestamp = BigInt(Math.floor(new Date(row.createdAt).getTime() / 1000));

  // Preimage consistent with P2P pattern: senderId + receiverKey + amount + timestamp.
  // For entities, receiverKey is the stable entityCode (not the DB UUID).
  const txHash = ethers.solidityPackedKeccak256(
    ["string", "string", "uint128", "uint64"],
    [row.senderId, entity.entityCode, amountCents, timestamp],
  );

  // entityId on-chain: keccak256 of the entityCode string, bytes32.
  const entityId = ethers.keccak256(ethers.toUtf8Bytes(entity.entityCode));
  const metadata = row.description ?? "";

  const tx = await contract.anchorEntityPayment(txHash, entityId, amountCents, timestamp, metadata);
  await tx.wait(1);
  return tx.hash as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (req.headers.get("x-anchor-secret") !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const row = payload.record;
  if (payload.type !== "INSERT" || payload.table !== "Transaction" || !row) {
    return new Response("ignored", { status: 200 });
  }

  const isAnchorableType = row.type === "TRANSFER" || row.type === "ENTITY_PAYMENT";
  if (!isAnchorableType || row.status !== "COMPLETED" || row.onChainStatus !== "PENDING") {
    await updateRow(row.id, { onChainStatus: "SKIPPED" });
    return new Response("skipped", { status: 200 });
  }

  try {
    const onChainTxHash = row.isEntityPayment
      ? await anchorEntity(row)
      : await anchorP2P(row);

    await updateRow(row.id, {
      onChainTxHash,
      onChainStatus: "ANCHORED",
      anchoredAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, onChainTxHash }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error(`Anchor failed for Transaction ${row.id}`, err);
    await updateRow(row.id, { onChainStatus: "FAILED" });
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
