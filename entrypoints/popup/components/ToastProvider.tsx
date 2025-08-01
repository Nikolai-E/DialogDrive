import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Custom toast functions with Discord-style theming
export const showToast = {
  success: (message: string) => 
    toast.success(message, {
      duration: 2000,
      style: {
        background: 'hsl(var(--success))',
        color: 'hsl(var(--success-foreground))',
        fontSize: '11px',
        fontWeight: '500',
        padding: '6px 8px',
        minHeight: '24px',
        borderRadius: '6px',
        border: 'none',
      },
    }),
    
  error: (message: string) => 
    toast.error(message, {
      duration: 3000,
      style: {
        background: 'hsl(var(--destructive))',
        color: 'hsl(var(--destructive-foreground))',
        fontSize: '11px',
        fontWeight: '500',
        padding: '6px 8px',
        minHeight: '24px',
        borderRadius: '6px',
        border: 'none',
      },
    }),
    
  info: (message: string) => 
    toast(message, {
      duration: 2000,
      style: {
        background: 'hsl(var(--info))',
        color: 'hsl(var(--info-foreground))',
        fontSize: '11px',
        fontWeight: '500',
        padding: '6px 8px',
        minHeight: '24px',
        borderRadius: '6px',
        border: 'none',
      },
    }),
    
  loading: (message: string) => 
    toast.loading(message, {
      style: {
        background: 'hsl(var(--card))',
        color: 'hsl(var(--text-secondary))',
        fontSize: '11px',
        fontWeight: '500',
        padding: '6px 8px',
        minHeight: '24px',
        borderRadius: '6px',
        border: 'none',
      },
    }),
};

// Toast Provider Component with Discord-style positioning
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            maxWidth: '140px',
            minWidth: '100px',
            borderRadius: '6px',
            boxShadow: 'var(--shadow)',
            fontSize: '11px',
            padding: '6px 8px',
            margin: '4px',
            border: 'none',
          },
        }}
      />
    </>
  );
};
