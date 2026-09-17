
// Types for service providers
export type ServiceProvider = {
  id: string;
  name: string;
  category: ServiceCategory;
  logo: string;
  requiresAccountNumber: boolean;
  accountNumberFormat?: string;
  accountNumberExample?: string;
  minAmount?: number;
  maxAmount?: number;
  fixedAmounts?: number[];
};

export type ServiceCategory = 
  | 'mobile_recharge' 
  | 'utilities' 
  | 'internet' 
  | 'tv' 
  | 'education' 
  | 'government' 
  | 'donations' 
  | 'other';

// Types for service payments
export type ServicePayment = {
  id: string;
  providerId: string;
  providerName: string;
  category: ServiceCategory;
  accountNumber: string;
  description?: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receiptUrl?: string;
  date: string;
  referenceNumber: string;
};

export type ServicePaymentRequest = {
  providerId: string;
  accountNumber: string;
  amount: number;
  description?: string;
  saveAsSubscription?: boolean;
  subscriptionName?: string;
};

// Types for subscriptions
export type ServiceSubscription = {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  category: ServiceCategory;
  accountNumber: string;
  amount: number;
  description?: string;
  frequency: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate: string;
  createdAt: string;
  lastPaymentDate?: string;
  lastPaymentStatus?: 'completed' | 'failed';
};

export type ServiceSubscriptionRequest = {
  name: string;
  providerId: string;
  accountNumber: string;
  amount: number;
  description?: string;
  frequency: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
};

// Mock data for service providers
const mockServiceProviders: ServiceProvider[] = [
  {
    id: 'telcel',
    name: 'Telcel',
    category: 'mobile_recharge',
    logo: '/logos/telcel.png',
    requiresAccountNumber: true,
    accountNumberFormat: '10 dígitos',
    accountNumberExample: '5512345678',
    minAmount: 10,
    maxAmount: 1000,
    fixedAmounts: [20, 50, 100, 200, 500],
  },
  {
    id: 'att',
    name: 'AT&T',
    category: 'mobile_recharge',
    logo: '/logos/att.png',
    requiresAccountNumber: true,
    accountNumberFormat: '10 dígitos',
    accountNumberExample: '5512345678',
    minAmount: 10,
    maxAmount: 1000,
    fixedAmounts: [20, 50, 100, 200, 500],
  },
  {
    id: 'movistar',
    name: 'Movistar',
    category: 'mobile_recharge',
    logo: '/logos/movistar.png',
    requiresAccountNumber: true,
    accountNumberFormat: '10 dígitos',
    accountNumberExample: '5512345678',
    minAmount: 10,
    maxAmount: 1000,
    fixedAmounts: [20, 50, 100, 200, 500],
  },
  {
    id: 'cfe',
    name: 'Electricidad CFE',
    category: 'utilities',
    logo: '/logos/cfe.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de servicio (12 dígitos)',
    accountNumberExample: '123456789012',
    minAmount: 1,
    maxAmount: 50000,
  },
  {
    id: 'telmex',
    name: 'Telmex',
    category: 'internet',
    logo: '/logos/telmex.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de teléfono (10 dígitos)',
    accountNumberExample: '5512345678',
    minAmount: 1,
    maxAmount: 10000,
  },
  {
    id: 'totalplay',
    name: 'TotalPlay',
    category: 'internet',
    logo: '/logos/totalplay.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de cuenta (8 dígitos)',
    accountNumberExample: '12345678',
    minAmount: 1,
    maxAmount: 10000,
  },
  {
    id: 'dish',
    name: 'Dish',
    category: 'tv',
    logo: '/logos/dish.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de cuenta',
    accountNumberExample: 'ABC123456',
    minAmount: 1,
    maxAmount: 5000,
  },
  {
    id: 'izzi',
    name: 'izzi',
    category: 'internet',
    logo: '/logos/izzi.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de cuenta',
    accountNumberExample: '123456789',
    minAmount: 1,
    maxAmount: 5000,
  },
  {
    id: 'agua',
    name: 'Agua y Drenaje',
    category: 'utilities',
    logo: '/logos/agua.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'Número de servicio',
    accountNumberExample: '123456789',
    minAmount: 1,
    maxAmount: 10000,
  },
  {
    id: 'sat',
    name: 'SAT',
    category: 'government',
    logo: '/logos/sat.png',
    requiresAccountNumber: true,
    accountNumberFormat: 'RFC',
    accountNumberExample: 'ABCD123456XYZ',
    minAmount: 1,
    maxAmount: 100000,
  },
];

// Service API endpoints
export const servicesApi = {
  // Get all service providers or filtered by category
  getProviders: async (category?: ServiceCategory): Promise<ServiceProvider[]> => {
    // In a real app, this would be an API call
    // const { data } = await apiClient.get('/services/providers', { params: { category } });
    // return data.providers;
    
    // Mock implementation
    return new Promise(resolve => {
      setTimeout(() => {
        const filteredProviders = category 
          ? mockServiceProviders.filter(provider => provider.category === category)
          : mockServiceProviders;
        resolve(filteredProviders);
      }, 500);
    });
  },
  
  // Get a specific provider by ID
  getProviderById: async (providerId: string): Promise<ServiceProvider | null> => {
    // In a real app:
    // const { data } = await apiClient.get(`/services/providers/${providerId}`);
    // return data.provider;
    
    // Mock implementation
    return new Promise(resolve => {
      setTimeout(() => {
        const provider = mockServiceProviders.find(p => p.id === providerId) || null;
        resolve(provider);
      }, 300);
    });
  },
  
  // Make a payment for a service
  makePayment: async (payment: ServicePaymentRequest): Promise<ServicePayment> => {
    // In a real app:
    // const { data } = await apiClient.post('/services/payments', payment);
    // return data.payment;
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const provider = mockServiceProviders.find(p => p.id === payment.providerId);
        
        resolve({
          id: `pay-${Math.random().toString(36).substring(2, 10)}`,
          providerId: payment.providerId,
          providerName: provider?.name || 'Unknown Provider',
          category: provider?.category || 'other',
          accountNumber: payment.accountNumber,
          description: payment.description,
          amount: payment.amount,
          status: 'completed',
          receiptUrl: `/receipts/mock-receipt-${Date.now()}.pdf`,
          date: new Date().toISOString(),
          referenceNumber: `REF${Math.floor(Math.random() * 10000000)}`,
        });
      }, 1500);
    });
  },
  
  // Get payment history
  getPaymentHistory: async (): Promise<ServicePayment[]> => {
    // In a real app:
    // const { data } = await apiClient.get('/services/payments/history');
    // return data.payments;
    
    // Mock implementation
    return new Promise(resolve => {
      setTimeout(() => {
        const mockPayments: ServicePayment[] = [];
        
        // Generate 10 random payments
        for (let i = 0; i < 10; i++) {
          const provider = mockServiceProviders[Math.floor(Math.random() * mockServiceProviders.length)];
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));
          
          mockPayments.push({
            id: `pay-${Math.random().toString(36).substring(2, 10)}`,
            providerId: provider.id,
            providerName: provider.name,
            category: provider.category,
            accountNumber: `${Math.floor(Math.random() * 10000000000)}`,
            amount: Math.floor(Math.random() * 1000) + 50,
            status: Math.random() > 0.1 ? 'completed' : 'failed',
            receiptUrl: Math.random() > 0.1 ? `/receipts/mock-receipt-${i}.pdf` : undefined,
            date: date.toISOString(),
            referenceNumber: `REF${Math.floor(Math.random() * 10000000)}`,
          });
        }
        
        // Sort by date, newest first
        mockPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        resolve(mockPayments);
      }, 800);
    });
  },
  
  // Create a subscription
  createSubscription: async (subscription: ServiceSubscriptionRequest): Promise<ServiceSubscription> => {
    // In a real app:
    // const { data } = await apiClient.post('/services/subscriptions', subscription);
    // return data.subscription;
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const provider = mockServiceProviders.find(p => p.id === subscription.providerId);
        const nextPaymentDate = new Date();
        
        // Set next payment date based on frequency
        switch (subscription.frequency) {
          case 'weekly':
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
            break;
          case 'monthly':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            break;
          case 'bimonthly':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 2);
            break;
          case 'quarterly':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
            break;
          case 'yearly':
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            break;
        }
        
        resolve({
          id: `sub-${Math.random().toString(36).substring(2, 10)}`,
          name: subscription.name,
          providerId: subscription.providerId,
          providerName: provider?.name || 'Unknown Provider',
          category: provider?.category || 'other',
          accountNumber: subscription.accountNumber,
          amount: subscription.amount,
          description: subscription.description,
          frequency: subscription.frequency,
          status: 'active',
          nextPaymentDate: nextPaymentDate.toISOString(),
          createdAt: new Date().toISOString(),
        });
      }, 1500);
    });
  },
  
  // Get all subscriptions
  getSubscriptions: async (): Promise<ServiceSubscription[]> => {
    // In a real app:
    // const { data } = await apiClient.get('/services/subscriptions');
    // return data.subscriptions;
    
    // Mock implementation
    return new Promise(resolve => {
      setTimeout(() => {
        const mockSubscriptions: ServiceSubscription[] = [];
        
        // Generate 5 random subscriptions
        for (let i = 0; i < 5; i++) {
          const provider = mockServiceProviders[Math.floor(Math.random() * mockServiceProviders.length)];
          const createdAt = new Date();
          createdAt.setMonth(createdAt.getMonth() - Math.floor(Math.random() * 6));
          
          const nextPaymentDate = new Date();
          nextPaymentDate.setDate(nextPaymentDate.getDate() + Math.floor(Math.random() * 30) + 1);
          
          const lastPaymentDate = new Date();
          lastPaymentDate.setDate(lastPaymentDate.getDate() - Math.floor(Math.random() * 30));
          
          const frequencies: ServiceSubscription['frequency'][] = ['weekly', 'monthly', 'bimonthly', 'quarterly', 'yearly'];
          const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
          
          mockSubscriptions.push({
            id: `sub-${Math.random().toString(36).substring(2, 10)}`,
            name: `Pago de ${provider.name}`,
            providerId: provider.id,
            providerName: provider.name,
            category: provider.category,
            accountNumber: `${Math.floor(Math.random() * 10000000000)}`,
            amount: Math.floor(Math.random() * 1000) + 50,
            frequency,
            status: Math.random() > 0.2 ? 'active' : 'paused',
            nextPaymentDate: nextPaymentDate.toISOString(),
            createdAt: createdAt.toISOString(),
            lastPaymentDate: Math.random() > 0.3 ? lastPaymentDate.toISOString() : undefined,
            lastPaymentStatus: Math.random() > 0.1 ? 'completed' : 'failed',
          });
        }
        
        // Sort by next payment date
        mockSubscriptions.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
        
        resolve(mockSubscriptions);
      }, 800);
    });
  },
  
  // Update subscription status (pause/resume/cancel)
  updateSubscriptionStatus: async (subscriptionId: string, status: 'active' | 'paused' | 'cancelled'): Promise<{ success: boolean }> => {
    // In a real app:
    // const { data } = await apiClient.patch(`/services/subscriptions/${subscriptionId}/status`, { status });
    // return data;
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 800);
    });
  },
  
  // Delete a subscription
  deleteSubscription: async (subscriptionId: string): Promise<{ success: boolean }> => {
    // In a real app:
    // const { data } = await apiClient.delete(`/services/subscriptions/${subscriptionId}`);
    // return data;
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 800);
    });
  },
}; 