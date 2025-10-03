import { X } from 'lucide-react';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItemAction,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useUnifiedStore } from '../../../lib/unifiedStore';

type Props = {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  className?: string;
};

export const WorkspaceSelect: React.FC<Props> = ({ value, onChange, id, className }) => {
  const { workspaces } = useUnifiedStore();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Select a workspace" />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItemAction
            key={ws}
            value={ws}
            action={ws !== 'General' ? <X className="h-3 w-3 text-red-600" /> : undefined}
            onActionClick={
              ws === 'General'
                ? undefined
                : () => {
                    if (confirm(`Delete workspace "${ws}" and move its items to General?`)) {
                      if (value === ws) onChange('General');
                      try {
                        (useUnifiedStore.getState().deleteWorkspace as any)(ws);
                      } catch {}
                    }
                  }
            }
          >
            {ws}
          </SelectItemAction>
        ))}
      </SelectContent>
    </Select>
  );
};

export default WorkspaceSelect;
