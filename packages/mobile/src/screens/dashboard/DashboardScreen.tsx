import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateProfile, getAccount, getTransactions, Profile, Account, Transaction } from '../../lib/supabase';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const prof = await getOrCreateProfile();
      setProfile(prof);
      const [acc, txs] = await Promise.all([
        getAccount(prof.id),
        getTransactions(prof.id, 5),
      ]);
      setAccount(acc);
      setTransactions(txs);
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const getTxType = (tx: Transaction): 'credit' | 'debit' =>
    profile && tx.receiverId === profile.id ? 'credit' : 'debit';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.balanceCard}>
        <Text style={styles.greeting}>Hola, {profile?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Usuario'}</Text>
        <Text style={styles.balanceLabel}>Saldo disponible</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(account?.balance ?? 0)}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Transfer')}>
            <Text style={styles.actionBtnText}>Enviar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('Transactions')}>
            <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Historial</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transacciones recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <Text style={styles.empty}>No hay transacciones aún</Text>
        ) : (
          transactions.map(tx => {
            const type = getTxType(tx);
            return (
              <View key={tx.id} style={styles.txItem}>
                <View style={[styles.txIcon, type === 'credit' ? styles.txIconCredit : styles.txIconDebit]}>
                  <Text style={styles.txIconText}>{type === 'credit' ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{tx.description || (type === 'credit' ? 'Transferencia recibida' : 'Transferencia enviada')}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={[styles.txAmount, type === 'credit' ? styles.txCredit : styles.txDebit]}>
                  {type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  balanceCard: { backgroundColor: '#3B82F6', padding: 24, margin: 16, borderRadius: 16 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 4 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center' },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#fff' },
  actionBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 15 },
  actionBtnTextOutline: { color: '#fff' },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  seeAll: { color: '#3B82F6', fontSize: 14 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIconCredit: { backgroundColor: '#D1FAE5' },
  txIconDebit: { backgroundColor: '#FEE2E2' },
  txIconText: { fontSize: 18 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '600' },
  txCredit: { color: '#059669' },
  txDebit: { color: '#DC2626' },
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 },
});

export default DashboardScreen;
