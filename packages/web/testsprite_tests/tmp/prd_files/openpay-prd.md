# OpenPay - Product Requirements Document

## Overview
OpenPay is a fintech/payments platform built with Next.js 14 (App Router) that allows users to manage their finances, send/receive money, pay for utility services, and manage account security. The application is deployed at https://web-kohl-sigma-30.vercel.app.

## Target Users
- Individual consumers who need a digital wallet/payment platform
- Users in Mexico (Spanish-language interface) who want to manage money transfers and service payments

## Core Features

### 1. User Authentication
- **Login**: Users can authenticate with email and password via Supabase Auth
- **Registration**: New users can create accounts with full name, email, and password
- **Password Reset**: Users can request password reset via email
- **Session Management**: JWT-based sessions via Supabase

### 2. Dashboard
- View available account balance (MXN currency)
- Quick action buttons: Send money, Top-up/Recharge
- Recent transactions list (5 most recent)
- Send money form in sidebar
- Navigation to all main sections

### 3. Transaction History (/transactions)
- Full paginated transaction history
- Transaction types: deposits, withdrawals, transfers
- Transaction details: amount, date, description, status
- Status indicators: completed, pending, failed

### 4. Service Payments (/services)
- Pay utility services: electricity (CFE), water, internet, phone, etc.
- Select service provider from dropdown
- Enter reference/account number
- Enter payment amount
- Payment history tab (currently shows empty state)

### 5. Security Settings (/security)
- **Password Tab**: Change current password with confirmation
- **2FA Tab**: Enable/disable two-factor authentication
- **Biometrics Tab**: Configure biometric authentication

### 6. Customer Support (/support)
- **Contact Tab**: Contact form with subject and message fields
- **FAQ Tab**: Frequently asked questions about the platform
- **Resources Tab**: Links to guides, blog, terms and conditions

### 7. Send Money (/send-money)
- Enter recipient email address
- Enter amount in MXN
- Enter description/concept
- Real-time validation
- Success/error feedback via toast

### 8. Transfers (/transfers)
- View all transfer history
- Create new transfers (/transfers/new)

### 9. Contacts (/contacts)
- Manage list of frequent contacts for money transfers

### 10. Settings (/settings)
- Profile settings (/settings/profile)
- Notification preferences (/settings/notifications)

### 11. Verification (/verification)
- Identity verification flow
- Upload official ID documents

## Non-Functional Requirements
- All protected routes redirect to /login if user is not authenticated
- Root path / redirects to /login
- Spanish-language interface throughout
- Responsive design using Tailwind CSS
- Toast notifications for user feedback
- Loading states while fetching data

## Authentication Flow
1. User visits any route -> if not authenticated -> redirect to /login
2. User logs in -> redirected to /dashboard
3. User registers -> account created -> redirected to /dashboard or /login

## API Endpoints
- POST /api/services/payment - Process service payments
- GET /api/services/providers - List available service providers
- All other data operations use Supabase client-side SDK

## Known Issues / Limitations
1. Dashboard balance card shows hardcoded value ($12,520.35) rather than real account balance
2. Service payment history is always empty (not persisted)
3. Admin page (/admin) exists but may lack proper role-based access control
