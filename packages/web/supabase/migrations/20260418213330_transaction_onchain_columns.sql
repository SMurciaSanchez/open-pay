-- Anclaje on-chain: columnas para rastrear el estado de cada Transaction en Base Sepolia.
-- onChainStatus se llena async por la Edge Function anchor-transaction disparada por webhook.
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "onChainTxHash" TEXT,
  ADD COLUMN IF NOT EXISTS "onChainStatus" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("onChainStatus" IN ('PENDING', 'ANCHORED', 'FAILED', 'SKIPPED')),
  ADD COLUMN IF NOT EXISTS "anchoredAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS transaction_onchain_status_idx
  ON "Transaction" ("onChainStatus")
  WHERE "onChainStatus" = 'PENDING';
