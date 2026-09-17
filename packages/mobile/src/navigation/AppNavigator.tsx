import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

// Importación de pantallas (se implementarán después)
// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import TransferScreen from '../screens/transfer/TransferScreen';
import ServicesScreen from '../screens/services/ServicesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Tipos para las rutas de autenticación
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Tipos para las rutas principales (tabs)
type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Transfer: undefined;
  Services: undefined;
  Profile: undefined;
};

// Tipos para la navegación principal que incluye auth y main
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Crear navegadores
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// Navegador para rutas de autenticación
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Navegador de pestañas para usuarios autenticados
const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6', // Azul de OpenPay
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: true,
      }}
    >
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="Transactions" 
        component={TransactionsScreen} 
        options={{
          title: 'Transacciones',
          tabBarIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="Transfer" 
        component={TransferScreen} 
        options={{
          title: 'Enviar',
          tabBarIcon: ({ color, size }) => (
            <Icon name="send" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          title: 'Entidades',
          tabBarIcon: ({ color, size }) => (
            <Icon name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
};

// Navegador principal que decide qué mostrar según el estado de autenticación
const AppNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();
  
  // Mostrar indicador de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isSignedIn ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator; 