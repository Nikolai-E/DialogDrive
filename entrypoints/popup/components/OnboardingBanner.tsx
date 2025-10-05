// Lightweight first-run tip banner to help users discover key actions.
import { Folder, Info, Plus, Slash, Tag, Wand2 } from 'lucide-react';
import React from 'react';
import { Button } from '../../../components/ui/button';

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
          <div className="font-semibold text-[12px] mb-0.5">Get started</div>
          <p className="text-[11px] text-foreground/80 mb-1.5">
            Save your prompts and chats in one place. Organize by project, find them fast, and
            reuse them anywhere.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li className="flex items-start gap-1.5">
              <Plus className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Click +New to save a prompt or bookmark your current chat.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Folder
                className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0"
                aria-hidden="true"
              />
              <span>
                Use workspaces to group prompts by project. Switch between them to stay focused.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Tag className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>
                Add tags to filter and find things quickly—combine them like{' '}
                <span className="font-semibold">#email</span> +{' '}
                <span className="font-semibold">#launch</span>.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Slash className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>
                In ChatGPT, type // to open the quick picker and insert any saved prompt.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Wand2 className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Use the text cleaner to fix formatting and polish your writing.</span>
            </li>
          </ul>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-7 rounded-full px-2.5 text-[11px] font-semibold"
          onClick={onDismiss}
          aria-label="Dismiss tips"
        >
          Got it
        </Button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
