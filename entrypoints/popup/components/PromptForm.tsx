import React, { useState, useEffect } from 'react';
import { usePromptStore } from '~/lib/promptStore';
import { showToast } from './ToastProvider';
import type { Prompt } from '~/types/prompt';

export const PromptForm: React.FC = () => {
  const { 
    activePromptId, 
    prompts, 
    workspaces,
    allTags,
    addPrompt, 
    updatePrompt, 
    setActivePromptId 
  } = usePromptStore();
  
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [workspace, setWorkspace] = useState('General');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [includeVoiceTag, setIncludeVoiceTag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePrompt = prompts.find((p) => p.id === activePromptId);

  useEffect(() => {
    if (activePrompt) {
      setTitle(activePrompt.title);
      setText(activePrompt.text);
      setWorkspace(activePrompt.workspace);
      setTags(activePrompt.tags);
      setIncludeTimestamp(activePrompt.includeTimestamp);
      setIncludeVoiceTag(activePrompt.includeVoiceTag);
    } else {
      // Reset form when there's no active prompt
      setTitle('');
      setText('');
      setWorkspace('General');
      setTags([]);
      setTagInput('');
      setIncludeTimestamp(false);
      setIncludeVoiceTag(false);
    }
  }, [activePrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !text.trim()) {
      showToast.error('Title and prompt text are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const promptData = {
        title: title.trim(),
        text: text.trim(),
        workspace,
        tags,
        includeTimestamp,
        includeVoiceTag,
        usageCount: activePrompt?.usageCount || 0,
        isPinned: activePrompt?.isPinned || false,
      };

      if (activePrompt) {
        await updatePrompt({ 
          ...activePrompt, 
          ...promptData 
        });
        showToast.success('Prompt updated successfully!');
      } else {
        await addPrompt(promptData);
        showToast.success('Prompt created successfully!');
      }
      
      // Reset form and close
      setActivePromptId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast.error(`Failed to save prompt: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setActivePromptId(null);
  };

  const addTag = (tagToAdd?: string) => {
    const newTag = (tagToAdd || tagInput).trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setTagInput('');
    }
  };

  // Get suggested tags based on input
  const suggestedTags = tagInput.trim() 
    ? allTags.filter(tag => 
        tag.toLowerCase().includes(tagInput.toLowerCase()) && 
        !tags.includes(tag)
      ).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {activePrompt ? 'Edit Prompt' : 'Create New Prompt'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-4 space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., 'Summarize Article'"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Prompt Text */}
        <div className="flex-1">
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            required
            className="w-full h-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Workspace */}
        <div>
          <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-1">
            Workspace
          </label>
          <select
            id="workspace"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {workspaces.map(ws => (
              <option key={ws} value={ws}>{ws}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="space-y-2">
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder="Add tags..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Tag suggestions */}
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            
            {/* Current tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Checkboxes */}
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Include Timestamp
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVoiceTag}
              onChange={(e) => setIncludeVoiceTag(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Voice-friendly
          </label>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {activePrompt ? 'Update Prompt' : 'Create Prompt'}
          </button>
        </div>
      </form>
    </div>
  );
};
