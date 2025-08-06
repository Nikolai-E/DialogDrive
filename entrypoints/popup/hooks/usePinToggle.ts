import * as React from 'react';

export const usePinToggle = (initial = false) => {
  const [pinned, setPinned] = React.useState<boolean>(initial);
  const togglePinned = () => setPinned((v) => !v);
  return { pinned, togglePinned, setPinned };
};
