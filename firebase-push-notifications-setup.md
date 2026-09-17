# Firebase Push Notifications Implementation Guide for OpenPay Mobile App

This guide outlines the steps to implement Firebase Cloud Messaging (FCM) for push notifications in the OpenPay React Native mobile app.

## Prerequisites

- Firebase project created
- OpenPay mobile app project set up with React Native
- Android and iOS development environments configured

## Setup Process

### 1. Firebase Project Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select your existing OpenPay project
3. Add Android and iOS apps to your Firebase project:
   - Use the package name/bundle ID that matches your React Native app
   - Download the configuration files:
     - `google-services.json` for Android
     - `GoogleService-Info.plist` for iOS

### 2. Installing Required Dependencies

```bash
# Install Firebase Core and Messaging
npm install --save @react-native-firebase/app @react-native-firebase/messaging

# For iOS, install pods
cd ios && pod install && cd ..
```

### 3. Android Setup

1. Place `google-services.json` in the `android/app/` directory
2. Modify `android/build.gradle`:

```gradle
buildscript {
  dependencies {
    // Add this line
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

3. Modify `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // Add this line

// ...rest of the file
```

4. Add required permissions in `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- ... other permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <application>
        <!-- ... -->
        
        <!-- Add for background notifications handling -->
        <service
            android:name=".java.MyFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        
        <!-- ... -->
    </application>
</manifest>
```

### 4. iOS Setup

1. Place `GoogleService-Info.plist` in the `ios/OpenPayMobile/` directory
2. Add the file to your Xcode project (drag and drop in Xcode)
3. Enable Push Notifications in Xcode:
   - Select your project
   - Go to "Signing & Capabilities"
   - Click "+ Capability"
   - Add "Push Notifications"
   - Add "Background Modes" and check "Remote Notifications"

4. Update `ios/AppDelegate.mm` (or `.m` if not using the new architecture):

```objective-c
#import <Firebase.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Add this line before the React initialization
  [FIRApp configure];
  
  // ... rest of your existing code
}

@end
```

### 5. Notification Service Implementation

Create a notification service in `src/services/NotificationService.ts`:

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export class NotificationService {
  private static instance: NotificationService;
  private deviceToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request permission for push notifications
   */
  public async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
    
    return enabled;
  }

  /**
   * Get FCM token and save it
   */
  public async getAndSaveToken(): Promise<string | null> {
    try {
      // Retrieve saved token
      let fcmToken = await AsyncStorage.getItem('fcm_token');
      
      if (!fcmToken) {
        // Request permission first if on iOS
        if (Platform.OS === 'ios') {
          await this.requestPermission();
        }
        
        // Get token
        fcmToken = await messaging().getToken();
        
        if (fcmToken) {
          // Save token locally
          await AsyncStorage.setItem('fcm_token', fcmToken);
          // Save token on server
          await this.registerTokenWithServer(fcmToken);
        }
      }
      
      this.deviceToken = fcmToken;
      return fcmToken;
    } catch (error) {
      console.error('Failed to get FCM token', error);
      return null;
    }
  }

  /**
   * Register token with OpenPay server
   */
  private async registerTokenWithServer(token: string): Promise<boolean> {
    try {
      // Call your API to save the token for this user
      const response = await apiClient.post('/notifications/register-device', {
        token,
        platform: Platform.OS,
        device: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Failed to register token with server', error);
      return false;
    }
  }

  /**
   * Unregister device token
   */
  public async unregisterToken(): Promise<boolean> {
    try {
      if (this.deviceToken) {
        // Unregister from server
        await apiClient.post('/notifications/unregister-device', {
          token: this.deviceToken,
        });
        
        // Clear from storage
        await AsyncStorage.removeItem('fcm_token');
        this.deviceToken = null;
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unregister device token', error);
      return false;
    }
  }

  /**
   * Configure notification listeners
   */
  public configureListeners(
    onNotification: (notification: any) => void,
    onNotificationOpened: (notification: any) => void
  ): () => void {
    // Background notification opened handler
    const backgroundOpenedUnsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background state:', remoteMessage);
      onNotificationOpened(remoteMessage);
    });

    // Foreground notification handler
    const foregroundUnsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Notification received in foreground:', remoteMessage);
      onNotification(remoteMessage);
    });

    // Handle notifications that opened the app
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification opened the app from quit state:', remoteMessage);
          onNotificationOpened(remoteMessage);
        }
      });

    // Return cleanup function
    return () => {
      backgroundOpenedUnsubscribe();
      foregroundUnsubscribe();
    };
  }

  /**
   * Update notification preferences
   */
  public async updateNotificationPreferences(preferences: {
    transactions: boolean;
    security: boolean;
    marketing: boolean;
    appUpdates: boolean;
  }): Promise<boolean> {
    try {
      const response = await apiClient.post('/user/notification-preferences', preferences);
      return response.data.success;
    } catch (error) {
      console.error('Failed to update notification preferences', error);
      return false;
    }
  }

  /**
   * Get notification history
   */
  public async getNotificationHistory(limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const response = await apiClient.get('/notifications/history', {
        params: { limit, offset }
      });
      return response.data.notifications || [];
    } catch (error) {
      console.error('Failed to fetch notification history', error);
      return [];
    }
  }
}
```

### 6. Foreground Notification Display Component

Create `src/components/ui/NotificationBanner.tsx` for displaying foreground notifications:

```typescript
import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface NotificationBannerProps {
  title: string;
  body: string;
  data?: any;
  onPress?: () => void;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissTime?: number;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title,
  body,
  data,
  onPress,
  onDismiss,
  autoDismiss = true,
  autoDismissTime = 5000,
}) => {
  const [animation] = useState(new Animated.Value(-100));
  const navigation = useNavigation();

  useEffect(() => {
    // Animate in
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after timeout
    if (autoDismiss) {
      const timer = setTimeout(() => {
        dismiss();
      }, autoDismissTime);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    Animated.timing(animation, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const handlePress = () => {
    dismiss();
    
    if (onPress) {
      onPress();
    } else if (data && data.screen) {
      // Navigate based on notification data
      navigation.navigate(data.screen, data.params);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: animation }] }
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#333',
    padding: 15,
    zIndex: 9999,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  body: {
    color: '#ddd',
    fontSize: 14,
  },
  closeButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default NotificationBanner;
```

### 7. Notification Manager Context

Create `src/context/NotificationContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationService } from '../services/NotificationService';
import NotificationBanner from '../components/ui/NotificationBanner';
import { useAuth } from './AuthContext';

type NotificationContextType = {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  notificationCount: number;
  markAllAsRead: () => Promise<boolean>;
  getHistory: () => Promise<any[]>;
  updatePreferences: (preferences: {
    transactions: boolean;
    security: boolean;
    marketing: boolean;
    appUpdates: boolean;
  }) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // Only setup notifications when signed in
    if (isSignedIn) {
      setupNotifications();
    } else {
      // Clean up if user signs out
      cleanup();
    }
    
    return () => cleanup();
  }, [isSignedIn]);

  const setupNotifications = async () => {
    // Check/request permission
    const permission = await notificationService.requestPermission();
    setHasPermission(permission);
    
    if (permission) {
      // Get and register token
      await notificationService.getAndSaveToken();
      
      // Set up listeners
      const unsubscribe = notificationService.configureListeners(
        // Foreground notification handler
        (notification) => {
          // Show in-app banner
          setCurrentNotification(notification);
          // Update unread count
          setNotificationCount(prev => prev + 1);
        },
        // Notification opened handler
        (notification) => {
          // Handle navigation based on notification type
          handleNotificationNavigation(notification);
        }
      );
      
      // Get unread notification count from API
      fetchUnreadCount();
      
      return unsubscribe;
    }
  };

  const cleanup = async () => {
    setHasPermission(false);
    setNotificationCount(0);
    setCurrentNotification(null);
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      const data = await response.json();
      setNotificationCount(data.count);
    } catch (error) {
      console.error('Failed to fetch unread notification count', error);
    }
  };

  const handleNotificationNavigation = (notification: any) => {
    // Extract navigation data from notification
    const { data } = notification;
    
    if (data) {
      // Handle different notification types
      switch (data.type) {
        case 'transaction':
          // Navigate to transaction details
          // navigation.navigate('TransactionDetails', { id: data.transactionId });
          break;
        case 'security_alert':
          // Navigate to security alerts
          // navigation.navigate('Security', { screen: 'Alerts' });
          break;
        // Add more types as needed
      }
    }
  };

  const requestPermission = async () => {
    const permission = await notificationService.requestPermission();
    setHasPermission(permission);
    return permission;
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setNotificationCount(0);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
      return false;
    }
  };

  const getHistory = async () => {
    return await notificationService.getNotificationHistory();
  };

  const updatePreferences = async (preferences: {
    transactions: boolean;
    security: boolean;
    marketing: boolean;
    appUpdates: boolean;
  }) => {
    return await notificationService.updateNotificationPreferences(preferences);
  };

  return (
    <NotificationContext.Provider
      value={{
        hasPermission,
        requestPermission,
        notificationCount,
        markAllAsRead,
        getHistory,
        updatePreferences,
      }}
    >
      {children}
      
      {/* Render the notification banner when a notification is received */}
      {currentNotification && (
        <NotificationBanner
          title={currentNotification.notification?.title || 'New Notification'}
          body={currentNotification.notification?.body || ''}
          data={currentNotification.data}
          onDismiss={() => setCurrentNotification(null)}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};
```

### 8. Integration with App.tsx

Update your `App.tsx` to include the NotificationProvider:

```typescript
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { theme } from './src/theme';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </PaperProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

### 9. Notification Preferences Screen Implementation

Create `src/screens/settings/NotificationPreferencesScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useNotifications } from '../../context/NotificationContext';

const NotificationPreferencesScreen = () => {
  const { hasPermission, requestPermission, updatePreferences } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    transactions: true,
    security: true,
    marketing: false,
    appUpdates: true,
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch current preferences
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    // In a real app, get these from your API
    setLoading(false);
  };

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(preferences);
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!hasPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Las notificaciones están desactivadas para esta aplicación
          </Text>
          <Button mode="contained" onPress={handleRequestPermission}>
            Activar Notificaciones
          </Button>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos de Notificaciones</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Transacciones</Text>
            <Text style={styles.preferenceDescription}>
              Notificaciones sobre pagos, transferencias y movimientos de cuenta
            </Text>
          </View>
          <Switch
            value={preferences.transactions}
            onValueChange={() => handleToggle('transactions')}
            disabled={!hasPermission}
          />
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Seguridad</Text>
            <Text style={styles.preferenceDescription}>
              Alertas importantes sobre la seguridad de tu cuenta
            </Text>
          </View>
          <Switch
            value={preferences.security}
            onValueChange={() => handleToggle('security')}
            disabled={!hasPermission}
          />
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Marketing</Text>
            <Text style={styles.preferenceDescription}>
              Promociones, ofertas y novedades
            </Text>
          </View>
          <Switch
            value={preferences.marketing}
            onValueChange={() => handleToggle('marketing')}
            disabled={!hasPermission}
          />
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Actualizaciones</Text>
            <Text style={styles.preferenceDescription}>
              Nuevas funciones y mejoras de la aplicación
            </Text>
          </View>
          <Switch
            value={preferences.appUpdates}
            onValueChange={() => handleToggle('appUpdates')}
            disabled={!hasPermission}
          />
        </View>
      </View>
      
      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.saveButton}
        loading={isSaving}
        disabled={isSaving || !hasPermission}
      >
        Guardar Preferencias
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionBanner: {
    backgroundColor: '#ffe8e8',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionText: {
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
  },
  preferenceTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    margin: 16,
  },
});

export default NotificationPreferencesScreen;
```

### 10. Backend API Implementation

On your server-side, you need to implement these endpoints:

1. `/api/notifications/register-device` - Register a new device token
2. `/api/notifications/unregister-device` - Unregister a device token
3. `/api/notifications/unread-count` - Get unread notification count
4. `/api/notifications/history` - Get notification history
5. `/api/notifications/mark-all-read` - Mark all notifications as read
6. `/api/user/notification-preferences` - Update notification preferences

For sending push notifications from the server:

```javascript
// Using Firebase Admin SDK on your server
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send a push notification to a specific user
 */
async function sendNotificationToUser(userId, notification) {
  try {
    // Get user's device tokens from your database
    const userDevices = await getUserDeviceTokens(userId);
    
    // Prepare notification message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      tokens: userDevices.map(device => device.token),
    };
    
    // Send the notification
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`${response.successCount} notifications sent successfully`);
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}
```

## Testing Push Notifications

### 1. Using Firebase Console

1. Go to Firebase Console > Your Project > Messaging > Create your first campaign
2. Choose "Send test message"
3. Enter your device's FCM token that you registered
4. Configure the notification (title, body, data)
5. Send the test message

### 2. Using Postman

You can also use Postman to test notifications against the Firebase API:

1. Set up a POST request to `https://fcm.googleapis.com/fcm/send`
2. Add headers:
   - `Authorization: key=YOUR_SERVER_KEY` (from Firebase Project Settings > Cloud Messaging)
   - `Content-Type: application/json`
3. Request body:
   ```json
   {
     "to": "DEVICE_TOKEN",
     "notification": {
       "title": "Test Notification",
       "body": "This is a test notification from Postman",
       "sound": "default"
     },
     "data": {
       "type": "transaction",
       "screen": "TransactionDetails",
       "transactionId": "12345"
     }
   }
   ```
4. Send the request

## Notification Best Practices

1. **Categorize notifications** - Use consistent types and categories
2. **Deep linking** - Always include screen/route information in data payload
3. **User control** - Allow users to customize notification preferences
4. **Timing** - Be mindful of when you send notifications
5. **Batching** - Group similar notifications to avoid overwhelming users
6. **Security** - Never include sensitive information in notification text
7. **Testing** - Test on both iOS and Android as behavior differs
8. **Analytics** - Track notification interactions and open rates

## Troubleshooting

### Common Issues:

1. **Notifications not appearing**
   - Check if permissions are granted
   - Verify FCM token is valid
   - Check if device is connected to FCM

2. **iOS notifications only work in background**
   - Make sure you've properly configured foreground notification handling

3. **Android notifications missing icon**
   - Add a proper notification icon in Android resources

4. **Notification data not received**
   - iOS doesn't deliver data in foreground mode automatically
   - Use `onMessage` handler for foreground data delivery 