import { Filter, Pin, Plus, Search, SortAsc, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { useUnifiedStore } from '../../../lib/unifiedStore';

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
    setCurrentView,
  } = useUnifiedStore();
  
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
    <div className="bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 border-b border-gray-200/80 px-3 py-2">
      {/* Search Row with Create button */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search prompts... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-9 bg-white border-gray-200 rounded-md text-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          onClick={() => setCurrentView('form')}
          className="h-9 px-3 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Controls Row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as any)}>
              <SelectTrigger className="h-8 px-2.5 bg-white border-gray-200 rounded-md text-xs min-w-[92px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md border-gray-200 shadow-lg bg-white">
                <SelectItem value="lastUsed">Recent</SelectItem>
                <SelectItem value="title">A-Z</SelectItem>
                <SelectItem value="usageCount">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Tag */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="h-8 px-2.5 bg-white border-gray-200 rounded-md text-xs min-w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md border-gray-200 shadow-lg bg-white max-h-52 overflow-auto">
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Pinned Filter */}
        <div className="flex items-center gap-1.5">
          <Pin className="h-4 w-4 text-gray-500" />
          <Label htmlFor="pinned-filter" className="text-xs text-gray-700 font-medium">
            Pinned
          </Label>
          <Switch
            id="pinned-filter"
            checked={showPinned}
            onCheckedChange={setShowPinned}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="pt-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            <X className="h-4 w-4 mr-1.5" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};
