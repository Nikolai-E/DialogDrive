import * as React from 'react';

export const useTaggableInput = (initial: string[] = []) => {
  const [tags, setTags] = React.useState<string[]>(initial);
  const addTag = (t: string) => {
    const v = t.trim();
    if (!v) return;
    setTags((prev) => Array.from(new Set([...prev, v])));
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));
  const clearTags = () => setTags([]);
  return { tags, addTag, removeTag, clearTags, setTags };
};
