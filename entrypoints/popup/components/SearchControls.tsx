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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/80 p-3 space-y-3"
    >
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search prompts... (⌘F)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 h-9 bg-muted/30 border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/70"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchTerm('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-muted rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-2 text-sm">
        {/* Sort */}
        <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as any)}>
          <SelectTrigger className="w-auto h-8 px-3 bg-muted/30 border-border/50 rounded-md">
            <SortAsc className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-border/50">
            <SelectItem value="lastUsed">Recent</SelectItem>
            <SelectItem value="title">A-Z</SelectItem>
            <SelectItem value="usageCount">Most Used</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter */}
        {allTags.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-auto h-8 px-3 bg-muted/30 border-border/50 rounded-md">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border/50">
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Pinned Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="pinned-filter" className="text-xs text-muted-foreground">
            Pinned only
          </Label>
          <Switch
            id="pinned-filter"
            checked={showPinned}
            onCheckedChange={setShowPinned}
            className="data-[state=checked]:bg-accent"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="pt-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground rounded-md"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
