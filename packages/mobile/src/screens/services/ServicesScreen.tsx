import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  CATEGORY_LABELS,
  EntityCategory,
  EntityReceiver,
  getOrCreateProfile,
  listEntities,
  payToEntity,
} from '../../lib/supabase';

type CategoryFilter = 'ALL' | EntityCategory;

const CATEGORY_ORDER: CategoryFilter[] = [
  'ALL', 'TAX', 'SOCIAL', 'DONATION', 'UTILITIES', 'TELECOM', 'OTHER',
];

const ServicesScreen = () => {
  const [entities, setEntities] = useState<EntityReceiver[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>('ALL');

  const [selected, setSelected] = useState<EntityReceiver | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await listEntities();
        setEntities(list);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'No se pudieron cargar las entidades');
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (category === 'ALL') return entities;
    return entities.filter(e => e.category === category);
  }, [entities, category]);

  const closeModal = () => {
    setSelected(null);
    setDescription('');
    setAmount('');
  };

  const handlePay = async () => {
    if (!selected) return;
    const amt = Number(amount);
    if (!description.trim()) {
      Alert.alert('Error', 'Agrega un concepto o referencia');
      return;
    }
    if (!amount.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setPaying(true);
    try {
      const profile = await getOrCreateProfile();
      const result = await payToEntity({
        senderId: profile.id,
        entityCode: selected.entityCode,
        amount: amt,
        description: description.trim(),
      });
      Alert.alert(
        '¡Pago exitoso!',
        `Pagaste $${amt.toLocaleString('es-MX')} a ${selected.name}`,
        [{ text: 'OK', onPress: closeModal }]
      );
      if (!result) return;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar el pago');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pagar a entidades</Text>
      <Text style={styles.sub}>Impuestos, servicios, donaciones verificadas on-chain</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {CATEGORY_ORDER.map(cat => {
          const active = category === cat;
          const label = cat === 'ALL' ? 'Todas' : CATEGORY_LABELS[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loadingList ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              {item.logoUrl ? (
                <Image source={{ uri: item.logoUrl }} style={styles.cardLogo} />
              ) : (
                <View style={styles.cardLogoFallback}>
                  <Text style={styles.cardLogoEmoji}>🏛</Text>
                </View>
              )}
              <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardCategory}>{CATEGORY_LABELS[item.category]}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay entidades en esta categoría</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              {selected?.logoUrl ? (
                <Image source={{ uri: selected.logoUrl }} style={styles.modalLogo} />
              ) : (
                <View style={[styles.modalLogo, styles.cardLogoFallback]}>
                  <Text style={styles.cardLogoEmoji}>🏛</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selected?.name}</Text>
                <Text style={styles.modalSub}>
                  {selected ? CATEGORY_LABELS[selected.category] : ''} · {selected?.entityCode}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Concepto / referencia</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Predial 2026, factura #123…"
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.label}>Monto (MXN)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.button, paying && styles.buttonDisabled]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Pagar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={paying}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  chips: { paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF2FF', marginRight: 8 },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { color: '#4F46E5', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, margin: 6, padding: 14,
    alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  cardLogo: { width: 44, height: 44, borderRadius: 10, marginBottom: 8 },
  cardLogoFallback: { backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  cardLogoEmoji: { fontSize: 22 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  cardCategory: { fontSize: 11, color: '#6366F1', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  modalLogo: { width: 48, height: 48, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#4F46E5', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontSize: 15 },
});

export default ServicesScreen;
