// Lightweight first-run tip banner to help users discover key actions.
import { Filter, Info, Plus } from 'lucide-react';
import React from 'react';

type Props = {
  onDismiss: () => void;
};

export const OnboardingBanner: React.FC<Props> = ({ onDismiss }) => {
  return (
    <div
      role="region"
      aria-label="Getting started tips"
      className="mx-2 mt-2 mb-0 rounded-md border border-primary/30 bg-primary/10 text-foreground"
    >
      <div className="px-3 py-2 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
        <div className="flex-1 text-[11px] leading-5">
          <div className="font-semibold text-[12px] mb-0.5">Quick tour</div>
          <ul className="list-disc pl-4 space-y-1">
            <li className="flex items-start gap-1.5">
              <Plus className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Use the + button (top right) to create a new Prompt or bookmark a Chat.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Filter className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Filter by Workspace or Tags using the chips and the filter menu.</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 h-7 px-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[11px]"
          aria-label="Dismiss tips"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
