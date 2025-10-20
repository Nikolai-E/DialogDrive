import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { OnboardingBanner } from '@/entrypoints/popup/components/OnboardingBanner';

describe('OnboardingBanner', () => {
  test('invokes dismiss handler when button clicked', () => {
    const onDismiss = vi.fn();
    render(<OnboardingBanner onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss tips/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
