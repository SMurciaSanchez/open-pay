# React Native Project Setup for OpenPay Mobile App

This guide provides instructions for setting up the React Native project for the OpenPay mobile application, including installing all required dependencies and initial configuration.

## Prerequisites

- Node.js (v16 or newer)
- JDK 11 or newer
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- CocoaPods (for iOS dependencies, macOS only)

## Creating the Project

```bash
# Install React Native CLI globally
npm install -g react-native-cli

# Create a new React Native project with TypeScript template
npx react-native init OpenPayMobile --template react-native-template-typescript

# Navigate to project directory
cd OpenPayMobile
```

## Core Dependencies

```bash
# Install core dependencies
npm install --save \
  axios \
  @react-navigation/native \
  @react-navigation/stack \
  @react-navigation/bottom-tabs \
  @tanstack/react-query \
  react-native-paper \
  react-native-vector-icons \
  react-native-safe-area-context \
  react-native-screens \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-biometrics \
  @react-native-firebase/app \
  @react-native-firebase/messaging \
  @react-native-async-storage/async-storage \
  @react-native-community/netinfo \
  react-native-keychain \
  react-native-chart-kit \
  react-native-svg \
  date-fns
```

## Development Dependencies

```bash
# Install development dependencies
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest \
  react-test-renderer \
  @types/react-native-vector-icons \
  eslint-plugin-react-native \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  prettier
```

## iOS-specific Setup (macOS only)

```bash
# Install iOS dependencies
cd ios
pod install
cd ..
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Register your Android and iOS apps
3. Download the configuration files:
   - `google-services.json` for Android (place in android/app/)
   - `GoogleService-Info.plist` for iOS (place in ios/OpenPayMobile/)
4. Follow the remaining setup instructions from the Firebase console

## Project Structure Setup

Create the following folder structure:

```bash
mkdir -p src/{api,assets,components,context,hooks,navigation,screens,services,theme,types,utils}
```

## Configuration Files

### babel.config.js

Update to include React Native Reanimated plugin:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

### tsconfig.json

Ensure your TypeScript configuration includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "target": "esnext",
    "module": "commonjs",
    "lib": ["es2017", "es6"],
    "allowJs": true,
    "jsx": "react-native",
    "noEmit": true,
    "isolatedModules": true,
    "strict": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

## Initial Files

### App.tsx (Basic Structure)

```typescript
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { theme } from './src/theme';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

### Basic Auth Context (src/context/AuthContext.tsx)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';

type AuthContextType = {
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  user: any | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Check for existing auth token on startup
    const loadToken = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const isValid = await authService.validateToken(token);
          if (isValid) {
            setIsSignedIn(true);
            setUser(authService.getSessionState().user);
          }
        }
      } catch (error) {
        console.error('Failed to load token', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login({ email, password });
      if (result.success) {
        setIsSignedIn(true);
        setUser(authService.getSessionState().user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sign in error', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authService.logout();
    setIsSignedIn(false);
    setUser(null);
  };

  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.register({ name, email, password });
      return result.success;
    } catch (error) {
      console.error('Sign up error', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoading, isSignedIn, signIn, signOut, signUp, user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Basic Navigation (src/navigation/AppNavigator.tsx)

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import SendMoneyScreen from '../screens/main/SendMoneyScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Define navigation types
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Send: undefined;
  Profile: undefined;
};

// Create navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Main Navigator
const MainNavigator = () => (
  <MainTab.Navigator>
    <MainTab.Screen name="Dashboard" component={DashboardScreen} />
    <MainTab.Screen name="Transactions" component={TransactionsScreen} />
    <MainTab.Screen name="Send" component={SendMoneyScreen} />
    <MainTab.Screen name="Profile" component={ProfileScreen} />
  </MainTab.Navigator>
);

// App Navigator
const AppNavigator = () => {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return isSignedIn ? <MainNavigator /> : <AuthNavigator />;
};

export default AppNavigator;
```

## Running the App

```bash
# Start Metro bundler
npx react-native start

# Run on Android
npx react-native run-android

# Run on iOS (macOS only)
npx react-native run-ios
```

## Next Steps

1. Implement the service classes for authentication, transactions, and push notifications
2. Create UI components following the web app design
3. Set up the API client with proper authentication
4. Implement biometric authentication
5. Configure Firebase for push notifications 