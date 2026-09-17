import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { getOrCreateProfile, getProfileByEmail, transferFunds } from '../../lib/supabase';

const TransferScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const handleContinue = () => {
    if (!email.trim() || !amount.trim()) {
      Alert.alert('Error', 'Completa el correo y el monto');
      return;
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const [senderProfile, recipientProfile] = await Promise.all([
        getOrCreateProfile(),
        getProfileByEmail(email.trim()),
      ]);

      if (!recipientProfile) {
        Alert.alert('Error', 'No se encontró un usuario con ese correo');
        setLoading(false);
        return;
      }

      if (senderProfile.id === recipientProfile.id) {
        Alert.alert('Error', 'No puedes enviarte dinero a ti mismo');
        setLoading(false);
        return;
      }

      const result = await transferFunds(
        senderProfile.id,
        recipientProfile.id,
        Number(amount),
        concept || 'Transferencia'
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo completar la transferencia');
        return;
      }

      Alert.alert(
        '¡Listo!',
        `Transferencia de $${Number(amount).toLocaleString('es-MX')} enviada correctamente`,
        [{
          text: 'OK',
          onPress: () => {
            setStep('form');
            setEmail('');
            setAmount('');
            setConcept('');
            navigation.navigate('Dashboard');
          },
        }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        {step === 'form' ? (
          <>
            <Text style={styles.title}>Enviar dinero</Text>
            <Text style={styles.label}>Correo del destinatario</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Monto (MXN)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.label}>Concepto (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Préstamo, pago de cena..."
              value={concept}
              onChangeText={setConcept}
            />
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Confirmar transferencia</Text>
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Para</Text>
                <Text style={styles.summaryValue}>{email}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Monto</Text>
                <Text style={styles.summaryValueBig}>${Number(amount).toLocaleString('es-MX')} MXN</Text>
              </View>
              {concept ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Concepto</Text>
                  <Text style={styles.summaryValue}>{concept}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirmar envío</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('form')}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 16 },
  button: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#6B7280', fontSize: 15 },
  summary: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  summaryLabel: { color: '#6B7280', fontSize: 14 },
  summaryValue: { color: '#1F2937', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  summaryValueBig: { color: '#1F2937', fontSize: 18, fontWeight: 'bold' },
});

export default TransferScreen;
