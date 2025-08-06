import * as React from 'react';

export const useWorkspaceSelector = (all: string[], initial: string = 'General') => {
  const [workspace, setWorkspace] = React.useState<string>(initial);
  const options = React.useMemo(() => Array.from(new Set(['General', ...all])), [all]);
  return { workspace, setWorkspace, options };
};
