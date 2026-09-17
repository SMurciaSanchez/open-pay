/**
 * Utility functions for the OpenPay application
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TransactionStatus, TransactionType } from "@/types";
import { format, formatDistanceToNow, formatRelative } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Combine multiple class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a currency value
 * @param amount The amount to format
 * @param currency The currency code (default: MXN)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * @param text - The text to truncate 
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize the first letter of each word in a string
 * @param text - The input text
 * @returns Text with capitalized words
 */
export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get the appropriate color for a transaction status
 * @param status - The transaction status
 * @returns CSS class for the status color
 */
export function getStatusColor(status: TransactionStatus): string {
  const statusColorMap: Record<TransactionStatus, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  
  return statusColorMap[status] || "bg-gray-100 text-gray-800";
}

/**
 * Get the appropriate icon and color for a transaction type
 * @param type - The transaction type
 * @returns CSS classes and icon name
 */
export function getTransactionTypeInfo(type: TransactionType): { icon: string; classes: string } {
  const typeMap: Record<TransactionType, { icon: string; classes: string }> = {
    deposit: { 
      icon: "arrow-down-circle", 
      classes: "bg-green-50 text-green-700" 
    },
    withdrawal: { 
      icon: "arrow-up-circle", 
      classes: "bg-red-50 text-red-700" 
    },
    payment: { 
      icon: "credit-card", 
      classes: "bg-blue-50 text-blue-700" 
    },
    transfer: { 
      icon: "repeat", 
      classes: "bg-purple-50 text-purple-700" 
    },
    fee: { 
      icon: "receipt", 
      classes: "bg-gray-50 text-gray-700" 
    },
  };
  
  return typeMap[type] || { icon: "circle", classes: "bg-gray-50 text-gray-700" };
}

/**
 * Format a date 
 * @param date Date string or Date object
 * @param formatStr Format string for date-fns (default: 'PP')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr = "PP"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: es });
}

/**
 * Format a date as relative time
 * @param date Date string or Date object
 * @returns Relative time string (e.g., "hace 5 minutos")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
}

/**
 * Format a date relative to another date
 * @param date Date to format
 * @param baseDate Date to compare to (default: now)
 * @returns Relative date string
 */
export function formatRelativeDate(
  date: string | Date,
  baseDate: Date = new Date()
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatRelative(dateObj, baseDate, { locale: es });
} 