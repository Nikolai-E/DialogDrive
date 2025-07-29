import React from 'react';
import { usePromptStore } from '~/lib/promptStore';
import { PromptItem } from './PromptItem';

export const PromptList: React.FC = () => {
  const { prompts, isLoading, error } = usePromptStore((state) => ({
    prompts: state.prompts,
    isLoading: state.isLoading,
    error: state.error,
  }));

  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        Loading prompts...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {prompts.map((prompt) => (
        <PromptItem key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
};
