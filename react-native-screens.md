# OpenPay Mobile App - Key Screens

This document outlines the main screens to be implemented in the OpenPay mobile application, grouped by user flow. Each screen includes a brief description of its purpose and key components.

## Authentication Flow

### 1. Login Screen

- **Purpose**: Allow existing users to authenticate
- **Key Components**:
  - Email and password input fields
  - "Remember me" checkbox
  - Login button with loading state
  - Biometric authentication option (if enabled)
  - Forgot password link
  - Link to registration screen
- **Interactions**:
  - Form validation (email format, required fields)
  - Error handling for invalid credentials
  - Biometric prompt when selected
  - Navigation to dashboard on success

### 2. Registration Screen

- **Purpose**: Allow new users to create an account
- **Key Components**:
  - Full name input
  - Email input
  - Password input with strength indicator
  - Password confirmation
  - Terms & conditions acceptance checkbox
  - Registration button with loading state
- **Interactions**:
  - Form validation (email format, password strength)
  - Error handling for existing accounts
  - Navigation to verification or dashboard on success

### 3. Verification Screen

- **Purpose**: Verify user identity via email/SMS code
- **Key Components**:
  - Code input fields
  - Resend code option
  - Verification button with loading state
  - Timer for code expiration
- **Interactions**:
  - Code validation
  - Resend functionality with cooldown
  - Navigation to dashboard on success

### 4. Forgot Password Screen

- **Purpose**: Allow users to reset their password
- **Key Components**:
  - Email input
  - Request reset button
  - Back to login link
- **Interactions**:
  - Email validation
  - Success message on valid request
  - Error handling for invalid emails

## Main Dashboard Flow

### 5. Dashboard Screen

- **Purpose**: Main app screen showing account overview
- **Key Components**:
  - Account balance card with currency
  - Quick actions (Send, Receive, Services, Savings)
  - Recent transactions list (limited to 5)
  - Spending summary chart
  - Notifications indicator
- **Interactions**:
  - Pull to refresh for latest data
  - Navigation to transaction details on tap
  - Navigation to various sections via quick actions

### 6. Transactions List Screen

- **Purpose**: Show complete transaction history
- **Key Components**:
  - Transaction list with infinite scroll
  - Filter options (date range, type, status)
  - Search functionality
  - Transaction items with icon, title, amount, date
- **Interactions**:
  - Load more transactions on scroll
  - Filter application
  - Navigation to transaction details on tap

### 7. Transaction Detail Screen

- **Purpose**: Show complete information about a transaction
- **Key Components**:
  - Transaction status indicator
  - Transaction amount and type
  - Date and time
  - Sender/recipient information
  - Reference number and concept
  - Receipt download option
- **Interactions**:
  - Share transaction details
  - Download/view receipt
  - Report issue button

## Money Transfer Flow

### 8. Send Money Screen

- **Purpose**: Allow users to send money to others
- **Key Components**:
  - Recipient selection (recent/contacts/new)
  - Amount input with available balance
  - Concept/description field
  - Continue button
- **Interactions**:
  - Recipient validation
  - Amount validation (min/max/available balance)
  - Navigation to confirmation screen

### 9. Transfer Confirmation Screen

- **Purpose**: Confirm transaction details before sending
- **Key Components**:
  - Transaction summary (recipient, amount, concept)
  - Fee information (if applicable)
  - Biometric authentication prompt (if enabled)
  - Confirm and cancel buttons
- **Interactions**:
  - Biometric verification
  - Loading state during processing
  - Success/error handling
  - Navigation to success screen or error resolution

### 10. Transfer Success Screen

- **Purpose**: Confirm successful transaction
- **Key Components**:
  - Success animation/icon
  - Transaction summary
  - Reference number
  - Share receipt option
  - Return to dashboard button
- **Interactions**:
  - Share functionality
  - Navigation back to dashboard or new transfer

## Service Payments Flow

### 11. Services Screen

- **Purpose**: Allow payment of services and bills
- **Key Components**:
  - Service categories (utilities, mobile, etc.)
  - Recent payments
  - Saved billers
- **Interactions**:
  - Category selection
  - Navigation to service payment form

### 12. Service Payment Form

- **Purpose**: Enter service payment details
- **Key Components**:
  - Service provider selection
  - Account/reference number input
  - Amount input
  - Payment button
  - Save as recurring option
- **Interactions**:
  - Form validation
  - Navigation to confirmation
  - Processing with loading state

## Security Settings Flow

### 13. Security Settings Screen

- **Purpose**: Manage security preferences
- **Key Components**:
  - Biometric authentication toggle
  - Two-factor authentication settings
  - PIN code setup/change
  - Active sessions list
  - Security alerts
- **Interactions**:
  - Toggle biometric authentication
  - Enable/disable 2FA
  - Revoke active sessions
  - View security alerts

### 14. Biometric Setup Screen

- **Purpose**: Enable biometric authentication
- **Key Components**:
  - Explanation of biometric security
  - Setup instructions
  - Biometric registration prompt
  - Success/failure indicators
- **Interactions**:
  - Native biometric registration flow
  - Confirmation of successful setup
  - Fallback options

## Profile & Settings Flow

### 15. Profile Screen

- **Purpose**: View and manage user profile
- **Key Components**:
  - Profile picture and basic info
  - Account details
  - Settings menu
  - Support access
  - App version info
- **Interactions**:
  - Edit profile information
  - Navigate to various settings screens
  - Access support

### 16. Notification Preferences Screen

- **Purpose**: Manage notification settings
- **Key Components**:
  - Push notification toggles by category
  - Email notification toggles
  - SMS notification toggles
- **Interactions**:
  - Toggle notification channels
  - Save preferences

## UI Components

Across all screens, maintain consistent UI components:

1. **Header Bar**: App logo, screen title, back button when applicable
2. **Bottom Navigation**: Quick access to main sections (Dashboard, Transactions, Send, Profile)
3. **Loading States**: Skeleton screens or spinners during data loading
4. **Error Handling**: Consistent error messages and retry options
5. **Modals**: For confirmations and quick actions
6. **Toast Messages**: For success/error notifications

## Mobile-Specific Considerations

1. **Responsive Design**: Ensure all screens work well on various device sizes
2. **Offline Mode**: Graceful handling of connectivity issues
3. **Deep Linking**: Support for notification and external links
4. **Native Integrations**: Camera for QR scanning, contacts for recipient selection
5. **Performance**: Optimize for smooth scrolling and transitions
6. **Accessibility**: Support for screen readers and accessibility settings 