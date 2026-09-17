# OpenPay Mobile App Implementation Plan

## Overview

This document outlines the technical implementation plan for the OpenPay React Native mobile app. The app will replicate the core functionality of the web platform, focusing on key user flows including authentication, transaction management, biometric security, and push notifications.

## Tech Stack

- **Framework**: React Native (with TypeScript)
- **State Management**: React Query + Context API
- **Navigation**: React Navigation
- **UI Components**: React Native Paper or Native Base
- **Authentication**: JWT-based (same as web)
- **Biometrics**: React Native Biometrics
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **API Integration**: Axios
- **Testing**: Jest with React Native Testing Library

## Project Structure

```
/src
  /api              # API client and endpoints
  /assets           # Images, fonts, etc.
  /components       # Reusable UI components
  /context          # Context providers (auth, theme, etc.)
  /hooks            # Custom hooks
  /navigation       # Navigation configuration
  /screens          # App screens
  /services         # Business logic services
  /theme            # Theme configuration
  /types            # TypeScript type definitions
  /utils            # Utility functions
  App.tsx           # Entry point
```

## Core Features Implementation

### 1. Authentication (Login/Registration)

#### Implementation Details:

- Adapt the web auth service to mobile, maintaining similar JWT authentication flow
- Create login and registration screens with form validation
- Implement session management with secure storage of tokens
- Match biometric authentication flow with the web version

#### Key Components:

```typescript
// AuthService.ts (adapted from web version)
export class AuthService {
  // Singleton pattern (like web version)
  private static instance: AuthService;
  
  // Session state management
  private sessionState: {
    authenticated: boolean;
    user?: {
      id: string;
      email: string;
      name: string;
    };
    lastActivity: number;
    expiresAt: number;
  }
  
  // Auth methods
  public async login(credentials: { email: string; password: string }): Promise<{success: boolean}> {
    // Similar to web implementation
    // API call to /auth/login
    // Store token in secure storage
  }
  
  // Registration method
  public async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{success: boolean}> {
    // API call to /auth/register
  }
  
  // Context hook for components
  export function useAuth() {
    // Similar to web implementation
    // Provide auth state and methods to components
  }
}
```

### 2. Dashboard & Balance View

#### Implementation Details:

- Implement account summary screen showing current balance
- Display recent transactions in a scrollable list
- Create transaction details screen
- Implement account statistics and charts

#### Key Components:

```typescript
// AccountSummaryScreen.tsx
export function AccountSummaryScreen() {
  const { user } = useAuth();
  const { data: balance, isLoading } = useQuery(['balance'], fetchBalance);
  const { data: recentTransactions } = useQuery(['transactions', 'recent'], fetchRecentTransactions);
  
  // Render UI with balance card, transaction list, quick actions, etc.
}

// TransactionsList.tsx
export function TransactionsList({ transactions, limit }) {
  // Similar to web implementation
  // Render transaction items with proper formatting and icons
}
```

### 3. Money Transfer

#### Implementation Details:

- Create screens for sending money to contacts or accounts
- Implement confirmation flow with security checks
- Add transaction history and status tracking
- Enable transfer receipt generation

#### Key Components:

```typescript
// SendMoneyScreen.tsx
export function SendMoneyScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  
  const handleSend = async () => {
    // Validate input
    // Request confirmation
    // Call API to process transfer
    // Navigate to confirmation screen
  }
  
  // Render form UI
}

// TransferService.ts
export class TransferService {
  public async sendMoney(transferData: {
    recipientId: string;
    amount: number;
    concept: string;
  }): Promise<{success: boolean; transactionId?: string}> {
    // API call to process transfer
  }
}
```

### 4. Biometric Authentication

#### Implementation Details:

- Integrate React Native Biometrics library
- Implement biometric enrollment and verification
- Match security model from web version
- Enable transaction authorization with biometrics

#### Key Components:

```typescript
// BiometricService.ts
import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricService {
  private rnBiometrics = new ReactNativeBiometrics();
  
  // Check if biometrics are available
  public async isBiometricAvailable(): Promise<{available: boolean; type: BiometricType}> {
    const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
    return {
      available,
      type: this.mapBiometryType(biometryType)
    };
  }
  
  // Register biometric
  public async registerBiometric(userId: string): Promise<{success: boolean}> {
    // Generate keys and register with server
    const { publicKey } = await this.rnBiometrics.createKeys();
    // Send public key to server
    // Store registration status
  }
  
  // Authenticate using biometrics
  public async authenticateWithBiometric(): Promise<{success: boolean}> {
    const { success } = await this.rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to continue',
      cancelButtonText: 'Cancel'
    });
    return { success };
  }
}
```

### 5. Push Notifications with Firebase

#### Implementation Details:

- Integrate Firebase Cloud Messaging (FCM)
- Implement notification permission request flow
- Create notification handling for foreground and background states
- Match notification preferences from web version

#### Key Components:

```typescript
// NotificationService.ts
import messaging from '@react-native-firebase/messaging';

export class NotificationService {
  // Request permission
  public async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
  }
  
  // Register device token with server
  public async registerDevice(): Promise<void> {
    const token = await messaging().getToken();
    // Send token to server
    await apiClient.post('/notifications/register-device', { token });
  }
  
  // Handle notifications
  public setupListeners(onNotificationReceived: (notification: any) => void): void {
    // Set up foreground handler
    const unsubscribeForeground = messaging().onMessage((message) => {
      onNotificationReceived(message);
    });
    
    // Return cleanup function
    return () => {
      unsubscribeForeground();
    };
  }
  
  // Update user preferences (matching web version)
  public async updateNotificationPreferences(preferences: NotificationPreference[]): Promise<boolean> {
    // Call API to update preferences
  }
}
```

## Implementation Strategy

### Phase 1: Setup and Authentication
- Project setup with React Native and TypeScript
- Authentication screens (login, register, password reset)
- Session management and API integration
- Basic navigation structure

### Phase 2: Core Functionality
- Account dashboard and balance display
- Transaction list and detail views
- Money transfer functionality
- Quick actions

### Phase 3: Security Features
- Biometric authentication integration
- Security alerts
- PIN code backup

### Phase 4: Push Notifications
- Firebase integration
- Notification handling
- Notification preferences

### Phase 5: Polish and Testing
- UI/UX refinement
- Performance optimization
- Comprehensive testing
- Production deployment preparation

## Integration with Backend

The mobile app will connect to the same API endpoints as the web application, ensuring consistency in business logic and data. The existing JWT authentication system will be reused, with mobile-specific considerations for token storage and refresh mechanisms.

## Security Considerations

- Secure storage of authentication tokens using React Native Keychain
- Implementation of certificate pinning for API communication
- Proper handling of sensitive information
- Timeout and auto-logout mechanisms
- Biometric data handling according to platform guidelines

## Testing Strategy

- Unit tests for core services and utility functions
- Component tests for UI elements
- Integration tests for key user flows
- E2E tests for critical paths (login, transactions)
- Manual security testing

## Conclusion

This implementation plan provides a structured approach to building the OpenPay mobile app, ensuring feature parity with the web application while leveraging native mobile capabilities for enhanced user experience and security. 