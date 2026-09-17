'use client';

import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Define notification variants
const notificationVariants = cva(
  "relative flex w-full items-center gap-3 rounded-lg border p-4 shadow-sm",
  {
    variants: {
      variant: {
        success: "bg-green-50 text-green-800 border-green-200",
        error: "bg-red-50 text-red-800 border-red-200",
        warning: "bg-yellow-50 text-yellow-800 border-yellow-200", 
        info: "bg-blue-50 text-blue-800 border-blue-200",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

// Define notification icon
const notificationIcon = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  error: <AlertCircle className="h-5 w-5 text-red-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

export interface NotificationProps extends VariantProps<typeof notificationVariants> {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
  onDismiss?: () => void;
}

export function Notification({ 
  title, 
  description, 
  variant, 
  className, 
  children, 
  onDismiss,
}: NotificationProps) {
  return (
    <div className={cn(notificationVariants({ variant }), className)}>
      <div className="shrink-0">
        {variant && notificationIcon[variant]}
      </div>
      <div className="flex-1">
        <h5 className="font-medium">{title}</h5>
        {description && <p className="mt-1 text-sm">{description}</p>}
        {children}
      </div>
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-1 right-1 h-7 w-7 rounded-full" 
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </Button>
      )}
    </div>
  );
}

// Animated notification that auto-dismisses
interface AnimatedNotificationProps extends NotificationProps {
  id: string;
  duration?: number; // ms
  onClose: () => void;
}

export function AnimatedNotification({ 
  id, 
  duration = 5000, 
  onClose,
  ...props 
}: AnimatedNotificationProps) {
  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => {
          if (duration > 0) {
            const timer = setTimeout(() => {
              onClose();
            }, duration);
            return () => clearTimeout(timer);
          }
        }}
      >
        <Notification {...props} onDismiss={onClose} />
      </motion.div>
    </AnimatePresence>
  );
}

// Notification container that stacks notifications
interface NotificationsContainerProps {
  notifications: Array<Omit<AnimatedNotificationProps, 'onClose'> & { id: string }>;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  max?: number;
}

export function NotificationsContainer({
  notifications,
  onClose,
  position = 'top-right',
  max = 5,
}: NotificationsContainerProps) {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50 flex flex-col gap-2',
    'top-left': 'fixed top-4 left-4 z-50 flex flex-col gap-2',
    'bottom-right': 'fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2',
    'bottom-left': 'fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2',
    'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2',
    'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2',
  }[position];

  // Show only the last `max` notifications
  const visibleNotifications = notifications.slice(-max);
  
  return (
    <div className={positionClasses}>
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: position.includes('top') ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <AnimatedNotification
              {...notification}
              onClose={() => onClose(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Usage examples as components
export function SuccessNotification({ 
  title = 'Operación exitosa', 
  description, 
  ...props 
}: Omit<NotificationProps, 'variant'>) {
  return <Notification variant="success" title={title} description={description} {...props} />;
}

export function ErrorNotification({ 
  title = 'Error', 
  description, 
  ...props 
}: Omit<NotificationProps, 'variant'>) {
  return <Notification variant="error" title={title} description={description} {...props} />;
}

export function WarningNotification({ 
  title = 'Advertencia', 
  description, 
  ...props 
}: Omit<NotificationProps, 'variant'>) {
  return <Notification variant="warning" title={title} description={description} {...props} />;
}

export function InfoNotification({ 
  title = 'Información', 
  description, 
  ...props 
}: Omit<NotificationProps, 'variant'>) {
  return <Notification variant="info" title={title} description={description} {...props} />;
} 