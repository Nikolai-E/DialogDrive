import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Custom toast functions with consistent styling
export const showToast = {
  success: (message: string) => 
    toast.success(message, {
      duration: 3000,
      style: {
        background: '#10B981',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
      },
    }),
    
  error: (message: string) => 
    toast.error(message, {
      duration: 4000,
      style: {
        background: '#EF4444',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
      },
    }),
    
  info: (message: string) => 
    toast(message, {
      duration: 2500,
      style: {
        background: '#3B82F6',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
      },
    }),
    
  loading: (message: string) => 
    toast.loading(message, {
      style: {
        background: '#6B7280',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
      },
    }),
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            maxWidth: '300px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </>
  );
};
