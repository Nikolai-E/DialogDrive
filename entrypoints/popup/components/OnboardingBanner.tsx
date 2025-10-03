// Lightweight first-run tip banner to help users discover key actions.
import { Folder, Info, Plus, Slash, Tag, Wand2 } from 'lucide-react';
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
          <div className="font-semibold text-[12px] mb-0.5">Quick start</div>
          <p className="text-[11px] text-foreground/80 mb-1.5">
            DialogDrive is your prompt locker: save things once, sort them by context, and drop them
            into chats fast.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li className="flex items-start gap-1.5">
              <Plus className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Tap + (top right) to save a new prompt or bookmark the current chat.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Folder
                className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0"
                aria-hidden="true"
              />
              <span>
                Workspaces act like mini folders for projects. Swap them above the list to change
                focus.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Tag className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>
                Tags are quick labels you can stack to filter, e.g.{' '}
                <span className="font-semibold">#email</span> +{' '}
                <span className="font-semibold">#launch</span>.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Slash className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>
                While typing in ChatGPT, type // to pop the prompt picker and paste a saved prompt
                instantly.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Wand2 className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span>Cleaner: paste text, toggle tone fixes, then copy the polished version.</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 h-7 px-2 rounded-md bg-[#1f1f21] text-white hover:bg-[#1f1f21]/94 text-[11px]"
          aria-label="Dismiss tips"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
