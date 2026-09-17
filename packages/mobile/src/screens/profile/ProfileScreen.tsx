import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { label: 'Verificación de identidad', icon: '🪪' },
  { label: 'Seguridad y contraseña', icon: '🔒' },
  { label: 'Notificaciones', icon: '🔔' },
  { label: 'Límites y niveles', icon: '📊' },
  { label: 'Ayuda y soporte', icon: '💬' },
  { label: 'Términos y privacidad', icon: '📄' },
];

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => Alert.alert('Info', 'Próximamente disponible')}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
      <Text style={styles.version}>OpenPay v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: { alignItems: 'center', padding: 32, backgroundColor: '#fff', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  menu: { backgroundColor: '#fff' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIcon: { fontSize: 20, marginRight: 14, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1F2937' },
  menuArrow: { fontSize: 22, color: '#9CA3AF' },
  signOutBtn: { margin: 20, padding: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center' },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 24 },
});

export default ProfileScreen;
