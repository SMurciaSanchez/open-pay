import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Linking } from 'react-native';
import type { OnChainStatus } from '../../lib/supabase';

const BASESCAN_TX_URL = 'https://sepolia.basescan.org/tx/';

interface Props {
  status?: OnChainStatus | null;
  txHash?: string | null;
  compact?: boolean;
}

const META: Record<
  OnChainStatus,
  { label: string; icon: string; bg: string; fg: string; border: string }
> = {
  ANCHORED: { label: 'On-chain',  icon: '✓', bg: '#D1FAE5', fg: '#047857', border: '#A7F3D0' },
  PENDING:  { label: 'Anclando',  icon: '⋯', bg: '#EDE9FE', fg: '#6D28D9', border: '#DDD6FE' },
  FAILED:   { label: 'Sin anclaje', icon: '!', bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' },
  SKIPPED:  { label: 'Sin anclaje', icon: '·', bg: '#F1F5F9', fg: '#475569', border: '#E2E8F0' },
};

export const OnChainBadge: React.FC<Props> = ({ status, txHash, compact = true }) => {
  if (!status) return null;
  const m = META[status];
  const isAnchored = status === 'ANCHORED' && !!txHash;

  const pill = (
    <View style={[styles.pill, { backgroundColor: m.bg, borderColor: m.border }]}>
      <Text style={[styles.icon, { color: m.fg }]}>{m.icon}</Text>
      <Text style={[styles.text, { color: m.fg }]}>{m.label}</Text>
    </View>
  );

  if (!isAnchored) return pill;

  return (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation?.();
        Linking.openURL(`${BASESCAN_TX_URL}${txHash}`);
      }}
      activeOpacity={0.7}
    >
      {pill}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    gap: 3,
    marginTop: 3,
  },
  icon: { fontSize: 9, fontWeight: '700' },
  text: { fontSize: 10, fontWeight: '600' },
});
