
// Types for admin API
interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'blocked' | 'pending_verification' | 'inactive' | 'suspended';
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
  verified: boolean;
  accountBalance?: number;
  transactionCount?: number;
  riskScore?: number;
}

interface AdminTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  description: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  status: 'completed' | 'pending' | 'failed' | 'flagged' | 'reviewed';
  date: string;
  flags: TransactionFlag[];
}

interface TransactionFlag {
  id: string;
  type: 'high_amount' | 'unusual_location' | 'multiple_attempts' | 'unusual_pattern' | 'velocity';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface UserFilters {
  status?: string;
  verified?: boolean;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface TransactionFilters {
  status?: string;
  type?: string;
  flagType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: UserFilters | TransactionFilters;
  fields?: string[];
  includeHeaders?: boolean;
  includeStats?: boolean;
}

interface DashboardStats {
  totalUsers: number;
  newUsers: {
    count: number;
    percentage: number;
  };
  totalTransactions: number;
  transactionGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  flaggedTransactions: number;
  pendingReview: number;
}

// Types for block user
interface BlockUserParams {
  userId: string;
  reason: string;
  permanent: boolean;
  durationDays?: number;
  endDate?: string; // ISO date string for end of blocking period
  notifyUser: boolean;
  comments?: string;
}

interface BlockUserResponse {
  success: boolean;
  message: string;
  userId: string;
  status: string;
  blockedUntil?: string; // ISO date string
}

interface UnblockUserParams {
  userId: string;
  adminId?: string;
  adminName?: string;
  reason?: string;
  comments?: string;
  notifyUser?: boolean;
}

interface ExportUsersParams {
  format: 'excel' | 'csv' | 'pdf';
  fields: string[];
  filters?: AdminUserFilters;
  includeHeaders: boolean;
  includeStats: boolean;
  fileNaming?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  targetId?: string;
  details: Record<string, any>;
}

interface AdminUserFilters {
  status?: string;
  verified?: boolean;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Mock user data for testing
const mockAdminUsers: AdminUser[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan.perez@example.com',
    status: 'active',
    role: 'user',
    createdAt: '2023-01-15T10:30:00Z',
    lastLogin: '2023-06-01T08:45:00Z',
    verified: true,
  },
  {
    id: '2',
    name: 'María González',
    email: 'maria.gonzalez@example.com',
    status: 'active',
    role: 'admin',
    createdAt: '2023-02-20T14:15:00Z',
    lastLogin: '2023-06-02T11:30:00Z',
    verified: true,
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@example.com',
    status: 'inactive',
    role: 'user',
    createdAt: '2023-03-05T09:45:00Z',
    lastLogin: '2023-05-15T16:20:00Z',
    verified: true,
  },
  {
    id: '4',
    name: 'Ana López',
    email: 'ana.lopez@example.com',
    status: 'suspended',
    role: 'user',
    createdAt: '2023-04-10T13:00:00Z',
    lastLogin: '2023-05-10T10:05:00Z',
    verified: false,
  }
];

// Audit log for tracking admin actions
const auditLog: AuditLogEntry[] = [];

// Admin API endpoints
export const adminApi = {
  // Dashboard
  getDashboardStats: async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<DashboardStats> => {
    // In a real app:
    // const { data } = await apiClient.get('/admin/dashboard-stats', { params: { period } });
    // return data;
    
    // Mock implementation
    return {
      totalUsers: 2350,
      newUsers: {
        count: 180,
        percentage: 8.3,
      },
      totalTransactions: 12234,
      transactionGrowth: 19,
      totalRevenue: 345678.9,
      revenueGrowth: 20.1,
      flaggedTransactions: 573,
      pendingReview: 201,
    };
  },
  
  // User Management
  getUsers: async (filters?: AdminUserFilters): Promise<AdminUser[]> => {
    // In a real app:
    // const { data } = await apiClient.get('/admin/users', { params: filters });
    // return data.users;
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    
    // Apply filters if provided
    if (filters) {
      let filteredUsers = [...mockAdminUsers];
      
      if (filters.status) {
        filteredUsers = filteredUsers.filter(user => user.status === filters.status);
      }
      
      if (filters.verified !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.verified === filters.verified);
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(
          user => user.name.toLowerCase().includes(search) || 
                 user.email.toLowerCase().includes(search)
        );
      }
      
      return filteredUsers;
    }
    
    return mockAdminUsers;
  },
  
  getUserById: async (userId: string): Promise<AdminUser> => {
    // In a real app:
    // const { data } = await apiClient.get(`/admin/users/${userId}`);
    // return data.user;
    
    // Mock implementation
    return {
      id: userId,
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      status: 'active',
      role: 'user',
      createdAt: '2023-01-15T10:30:00Z',
      lastLogin: '2023-06-01T08:45:00Z',
      verified: true,
    };
  },
  
  updateUser: async (userId: string, updates: Partial<AdminUser>): Promise<AdminUser> => {
    // In a real app:
    // const { data } = await apiClient.patch(`/admin/users/${userId}`, updates);
    // return data.user;
    
    // Mock implementation
    return {
      id: userId,
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      status: updates.status || 'active',
      role: updates.role || 'user',
      createdAt: '2023-01-15T10:30:00Z',
      lastLogin: '2023-06-01T08:45:00Z',
      verified: updates.verified || true,
    };
  },
  
  // Transaction Management
  getTransactions: async (filters?: TransactionFilters): Promise<AdminTransaction[]> => {
    // In a real app:
    // const { data } = await apiClient.get('/admin/transactions', { params: filters });
    // return data.transactions;
    
    // Mock implementation
    const mockTransactions: AdminTransaction[] = [
      {
        id: 'txn-1',
        userId: 'user-1',
        userName: 'Juan Pérez',
        userEmail: 'juan.perez@example.com',
        amount: 150000,
        description: 'Depósito',
        type: 'deposit',
        status: 'flagged',
        date: '2023-06-01T14:30:00Z',
        flags: [
          {
            id: 'flag-1',
            type: 'high_amount',
            description: 'Monto inusualmente alto para este usuario',
            severity: 'high',
          },
        ],
      },
      // More mock transactions would be here
    ];
    
    return mockTransactions;
  },
  
  getTransactionById: async (transactionId: string): Promise<AdminTransaction> => {
    // In a real app:
    // const { data } = await apiClient.get(`/admin/transactions/${transactionId}`);
    // return data.transaction;
    
    // Mock implementation
    return {
      id: transactionId,
      userId: 'user-1',
      userName: 'Juan Pérez',
      userEmail: 'juan.perez@example.com',
      amount: 150000,
      description: 'Depósito',
      type: 'deposit',
      status: 'flagged',
      date: '2023-06-01T14:30:00Z',
      flags: [
        {
          id: 'flag-1',
          type: 'high_amount',
          description: 'Monto inusualmente alto para este usuario',
          severity: 'high',
        },
      ],
    };
  },
  
  updateTransactionStatus: async (transactionId: string, status: AdminTransaction['status']): Promise<AdminTransaction> => {
    // In a real app:
    // const { data } = await apiClient.patch(`/admin/transactions/${transactionId}/status`, { status });
    // return data.transaction;
    
    // Mock implementation
    return {
      id: transactionId,
      userId: 'user-1',
      userName: 'Juan Pérez',
      userEmail: 'juan.perez@example.com',
      amount: 150000,
      description: 'Depósito',
      type: 'deposit',
      status,
      date: '2023-06-01T14:30:00Z',
      flags: [
        {
          id: 'flag-1',
          type: 'high_amount',
          description: 'Monto inusualmente alto para este usuario',
          severity: 'high',
        },
      ],
    };
  },
  
  // Export functionality
  exportUsers: async (userIds?: string[], options?: ExportOptions): Promise<string> => {
    // In a real app:
    // const { data } = await apiClient.post('/admin/export/users', { userIds, ...options });
    // return data.downloadUrl;
    
    // Mock implementation
    return '/api/downloads/users-export-12345.csv';
  },
  
  exportTransactions: async (transactionIds?: string[], options?: ExportOptions): Promise<string> => {
    // In a real app:
    // const { data } = await apiClient.post('/admin/export/transactions', { transactionIds, ...options });
    // return data.downloadUrl;
    
    // Mock implementation
    return '/api/downloads/transactions-export-12345.csv';
  },
  
  // Enhanced block user function
  async blockUser(params: BlockUserParams): Promise<BlockUserResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app, this would call the actual API
    console.log('Blocking user with params:', params);
    
    const { userId, reason, permanent, durationDays, notifyUser, comments } = params;
    
    // Calculate end date if temporary
    let blockedUntil = undefined;
    if (!permanent && durationDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);
      blockedUntil = endDate.toISOString();
    }
    
    // Create audit log entry
    await adminApi.createAuditLog({
      adminId: 'current-admin-id',  // This would be the actual admin ID in a real app
      action: 'BLOCK_USER',
      targetId: userId,
      details: {
        reason,
        permanent,
        durationDays,
        blockedUntil,
        comments
      }
    });
    
    // If notification is enabled, simulate sending email
    if (notifyUser) {
      console.log(`Sending block notification email to user ${userId}`);
      // In a real app, this would call a notification service
    }
    
    return {
      success: true,
      message: `Usuario ${permanent ? 'bloqueado permanentemente' : `suspendido por ${durationDays} días`}`,
      userId,
      status: 'blocked',
      blockedUntil
    };
  },
  
  // Enhanced unblock user function
  async unblockUser(params: UnblockUserParams): Promise<BlockUserResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const { userId, adminId = 'current-admin-id', adminName = 'Administrador', reason = 'Desbloqueo manual', comments, notifyUser = true } = params;
    
    // In a real app, this would call the actual API
    console.log(`Unblocking user ${userId} by admin ${adminId}`, comments ? `with comments: ${comments}` : '');
    
    // Create audit log entry
    await adminApi.createAuditLog({
      adminId,
      action: 'UNBLOCK_USER',
      targetId: userId,
      details: {
        reason,
        adminName,
        comments
      }
    });
    
    // If notification is enabled, simulate sending email
    if (notifyUser) {
      console.log(`Sending unblock notification email to user ${userId}`);
      // In a real app, this would call a notification service
    }
    
    return {
      success: true,
      message: 'Usuario desbloqueado exitosamente',
      userId,
      status: 'active'
    };
  },
  
  // Mock function to create audit log
  async createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const timestamp = new Date().toISOString();
    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real app, this would be saved to a database
    const logEntry: AuditLogEntry = {
      id,
      timestamp,
      ...entry,
    };
    
    console.log('Audit log created:', logEntry);
    auditLog.push(logEntry);
    
    return logEntry;
  },
  
  // Enhanced function to export users data
  async exportData(options: ExportUsersParams): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Log the export action
    await adminApi.createAuditLog({
      adminId: 'current-admin-id',
      action: 'EXPORT_USERS',
      details: {
        format: options.format,
        fields: options.fields,
        filters: options.filters,
        includeStats: options.includeStats
      }
    });
    
    // In a real app, this would generate and return a download URL
    console.log('Exporting data with options:', options);
    return Promise.resolve(`https://example.com/downloads/users-export-${Date.now()}.${options.format}`);
  },
  
  // Mock function to start a background export task
  async startExportTask(options: ExportOptions): Promise<string> {
    // In a real app, this would start a background task and return its ID
    console.log('Starting export task with options:', options);
    const taskId = `export-task-${Date.now()}`;
    return Promise.resolve(taskId);
  },
  
  // Mock function to check export task status
  async checkExportTaskStatus(taskId: string): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed', downloadUrl?: string }> {
    // In a real app, this would check the actual status
    return Promise.resolve({
      status: 'completed',
      downloadUrl: 'https://example.com/downloads/export-123.xlsx',
    });
  },
  
  // Function to get audit logs
  async getAuditLogs(filters?: { 
    adminId?: string, 
    action?: string, 
    targetId?: string,
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  }): Promise<AuditLogEntry[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    let filteredLogs = [...auditLog];
    
    if (filters) {
      if (filters.adminId) {
        filteredLogs = filteredLogs.filter(log => log.adminId === filters.adminId);
      }
      
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      
      if (filters.targetId) {
        filteredLogs = filteredLogs.filter(log => log.targetId === filters.targetId);
      }
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
      }
      
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }
    }
    
    // Sort by timestamp (newest first)
    return filteredLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  // Get users pending identity verification
  async getPendingVerifications(): Promise<AdminUser[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '5',
        name: 'Roberto Martínez',
        email: 'roberto.martinez@example.com',
        status: 'pending_verification',
        role: 'user',
        createdAt: '2023-05-25T15:30:00Z',
        verified: false,
      },
      {
        id: '4',
        name: 'Ana López',
        email: 'ana.lopez@example.com',
        status: 'active',
        role: 'user',
        createdAt: '2023-04-10T13:00:00Z',
        lastLogin: '2023-05-10T10:05:00Z',
        verified: false,
      },
      {
        id: '9',
        name: 'Diego Fernández',
        email: 'diego.fernandez@example.com',
        status: 'active',
        role: 'user',
        createdAt: '2023-06-01T09:00:00Z',
        lastLogin: '2023-06-03T14:20:00Z',
        verified: false,
      },
    ];
  },

  // Approve identity verification
  async approveVerification(userId: string, adminId: string, adminName: string, comments?: string): Promise<{ success: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    await adminApi.createAuditLog({
      adminId,
      action: 'VERIFY_USER',
      targetId: userId,
      details: { approved: true, adminName, comments },
    });
    return { success: true };
  },

  // Reject identity verification
  async rejectVerification(userId: string, adminId: string, adminName: string, reason: string): Promise<{ success: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    await adminApi.createAuditLog({
      adminId,
      action: 'REJECT_VERIFICATION',
      targetId: userId,
      details: { approved: false, adminName, reason },
    });
    return { success: true };
  },
}; 