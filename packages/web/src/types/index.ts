export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'fee';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'processing' | 'cancelled';

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  sourceAccount?: string;
  destinationAccount?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type AccountSummary = {
  balance: number;
  currency: string;
  accountNumber: string;
  accountType: string;
};

export type DashboardData = {
  user: User;
  accounts: AccountSummary[];
  recentTransactions: Transaction[];
}; 