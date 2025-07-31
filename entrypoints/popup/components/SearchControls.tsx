import React, { useRef, useEffect } from 'react';
import { usePromptStore } from '../../../lib/promptStore';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Search, Filter, SortAsc, X } from 'lucide-react';
import { motion } from 'framer-motion';

export const SearchControls: React.FC = () => {
  const {
    searchTerm,
    sortBy,
    filterTag,
    showPinned,
    allTags,
    setSearchTerm,
    setSortBy,
    setFilterTag,
    setShowPinned,
    resetFilters,
  } = usePromptStore();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const hasActiveFilters = searchTerm || filterTag !== 'all' || showPinned;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-4 border-b border-gray-100 bg-white space-y-3"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder="Search prompts..."
          className="pl-10 border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-colors"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-gray-100 rounded-full"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {(allTags.length > 0 || hasActiveFilters) && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={showPinned}
              onCheckedChange={setShowPinned}
              className="scale-90"
            />
            <Label className="text-xs text-gray-600">Pinned only</Label>
          </div>

          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-auto h-8 border-gray-200 rounded-lg text-xs">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map((tag: string) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
