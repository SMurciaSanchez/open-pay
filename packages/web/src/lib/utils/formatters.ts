/**
 * Utility functions for formatting dates, currency, and other display values
 */

/**
 * Format a date string or Date object into a localized string
 * @param dateString ISO date string or Date object
 * @param includeTime Whether to include the time in the formatted result
 * @returns Formatted date string in local format
 */
export function formatDate(dateString: string | Date, includeTime = false): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Format a number as currency
 * @param amount Number to format as currency
 * @param currency Currency code (default: COP)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'COP'): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a large number with abbreviated suffixes (K, M, B)
 * @param value Number to format
 * @returns Abbreviated number string
 */
export function formatCompactNumber(value: number): string {
  if (!value && value !== 0) return '';
  
  return new Intl.NumberFormat('es-CO', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
}

/**
 * Format a percentage value
 * @param value Number to format as percentage
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 2): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a phone number
 * @param phoneNumber Raw phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    // Format for Colombian numbers: XXX XXX XXXX
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  // If it doesn't match expected patterns, return as is
  return phoneNumber;
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (!bytes && bytes !== 0) return '';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format a datetime to a readable format with time
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(dateObj);
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  // Simple implementation since RelativeTimeFormat might not be available
  if (diffMs > 0) {
    // Future date
    if (diffDays < 1) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        return diffMinutes === 1 
          ? 'en 1 minuto' 
          : `en ${diffMinutes} minutos`;
      }
      return diffHours === 1 
        ? 'en 1 hora' 
        : `en ${diffHours} horas`;
    } else if (diffDays < 30) {
      return diffDays === 1 
        ? 'mañana' 
        : `en ${diffDays} días`;
    } else if (diffDays < 365) {
      const diffMonths = Math.round(diffDays / 30);
      return diffMonths === 1 
        ? 'en 1 mes' 
        : `en ${diffMonths} meses`;
    } else {
      const diffYears = Math.round(diffDays / 365);
      return diffYears === 1 
        ? 'en 1 año' 
        : `en ${diffYears} años`;
    }
  } else {
    // Past date
    const absDiffDays = Math.abs(diffDays);
    if (absDiffDays < 1) {
      const absDiffHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
      if (absDiffHours < 1) {
        const absDiffMinutes = Math.abs(Math.round(diffMs / (1000 * 60)));
        return absDiffMinutes === 1 
          ? 'hace 1 minuto' 
          : `hace ${absDiffMinutes} minutos`;
      }
      return absDiffHours === 1 
        ? 'hace 1 hora' 
        : `hace ${absDiffHours} horas`;
    } else if (absDiffDays < 30) {
      return absDiffDays === 1 
        ? 'ayer' 
        : `hace ${absDiffDays} días`;
    } else if (absDiffDays < 365) {
      const absDiffMonths = Math.round(absDiffDays / 30);
      return absDiffMonths === 1 
        ? 'hace 1 mes' 
        : `hace ${absDiffMonths} meses`;
    } else {
      const absDiffYears = Math.round(absDiffDays / 365);
      return absDiffYears === 1 
        ? 'hace 1 año' 
        : `hace ${absDiffYears} años`;
    }
  }
}

/**
 * Format an account number by showing only the last 4 digits
 */
export function formatAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return accountNumber;
  }
  
  const lastFourDigits = accountNumber.slice(-4);
  
  // Use a loop to create the masked part instead of repeat()
  let maskedPart = '';
  for (let i = 0; i < accountNumber.length - 4; i++) {
    maskedPart += '*';
  }
  
  return maskedPart + lastFourDigits;
}

/**
 * Format a reference number with custom spacing for readability
 */
export function formatReferenceNumber(reference: string): string {
  // Group by chunks of 4 characters for better readability
  const chunks = [];
  for (let i = 0; i < reference.length; i += 4) {
    chunks.push(reference.slice(i, i + 4));
  }
  
  return chunks.join(' ');
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(number: number): string {
  return new Intl.NumberFormat('es-MX').format(number);
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
} 