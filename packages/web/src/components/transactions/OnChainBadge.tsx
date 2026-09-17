'use client';

import { ShieldCheck, Loader2, ShieldAlert, ShieldOff, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { OnChainStatus } from '@/lib/api/transactions';

const BASESCAN_TX_URL = 'https://sepolia.basescan.org/tx/';

interface OnChainBadgeProps {
  status?: OnChainStatus | null;
  txHash?: string | null;
  anchoredAt?: string | null;
  variant?: 'compact' | 'detailed';
}

const STATUS_META: Record<
  OnChainStatus,
  { label: string; tooltip: string; Icon: typeof ShieldCheck; classes: string }
> = {
  ANCHORED: {
    label: 'Verificado on-chain',
    tooltip: 'Hash registrado en Base Sepolia. Haz clic para verificar en Basescan.',
    Icon: ShieldCheck,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  PENDING: {
    label: 'Anclando',
    tooltip: 'La transacción se está registrando en la blockchain.',
    Icon: Loader2,
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  FAILED: {
    label: 'Sin anclaje',
    tooltip: 'No se pudo registrar el hash on-chain. La transferencia no se vio afectada.',
    Icon: ShieldAlert,
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SKIPPED: {
    label: 'Sin anclaje',
    tooltip: 'Esta transacción no fue anclada en la blockchain.',
    Icon: ShieldOff,
    classes: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

export function OnChainBadge({
  status,
  txHash,
  anchoredAt,
  variant = 'compact',
}: OnChainBadgeProps) {
  if (!status) return null;

  const meta = STATUS_META[status];
  const { Icon } = meta;
  const isAnchored = status === 'ANCHORED' && !!txHash;
  const isPending = status === 'PENDING';

  if (variant === 'detailed') {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border p-3 ${meta.classes.replace('hover:bg-emerald-100', '')}`}
      >
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${isPending ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{meta.label}</p>
          <p className="text-xs opacity-80 mt-0.5">{meta.tooltip}</p>
          {anchoredAt && isAnchored && (
            <p className="text-[11px] opacity-70 mt-1">
              Anclado: {new Date(anchoredAt).toLocaleString('es-CO')}
            </p>
          )}
          {isAnchored && (
            <a
              href={`${BASESCAN_TX_URL}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold mt-2 underline decoration-dotted hover:decoration-solid"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-mono truncate max-w-[180px]">{txHash}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
      </div>
    );
  }

  const pill = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${meta.classes}`}
    >
      <Icon className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
      {meta.label}
    </span>
  );

  if (!isAnchored) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{pill}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{meta.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`${BASESCAN_TX_URL}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {pill}
          </a>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{meta.tooltip}</p>
          <p className="text-[10px] font-mono opacity-70 mt-1 break-all">{txHash}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
