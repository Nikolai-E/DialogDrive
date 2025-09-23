import { Building2, FileText, Filter, MessageSquare, Pin, Search, SortAsc, X } from 'lucide-react';
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

export const EnhancedSearchControls: React.FC = () => {
  const {
    searchTerm,
    sortBy,
    filterTag,
    showPinned,
    contentFilter,
    selectedWorkspace,
    allTags,
    workspaces,
    setSearchTerm,
    setSortBy,
    setFilterTag,
    setShowPinned,
    setContentFilter,
    setSelectedWorkspace,
    resetFilters,
  } = useUnifiedStore();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const hasActiveFilters = searchTerm || filterTag !== 'all' || showPinned || 
                          contentFilter !== 'all' || selectedWorkspace !== 'all';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="px-4 py-3 space-y-3 bg-gray-50 border-b border-gray-200">
      {/* Search Input - LOCKED SPECIFICATION */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={searchInputRef}
          placeholder="Search prompts and chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search prompts and chats"
          className="pl-10 pr-10 h-10 bg-white border-gray-300 rounded-lg text-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Enhanced Controls Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Column */}
        <div className="space-y-2">
          {/* Content Type Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <Select value={contentFilter} onValueChange={(value) => setContentFilter(value as typeof contentFilter)}>
              <SelectTrigger className="h-8 px-3 bg-white border-gray-300 rounded-md text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 shadow-lg">
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="prompts">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Prompts Only
                  </div>
                </SelectItem>
                <SelectItem value="chats">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chats Only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workspace Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger className="h-8 px-3 bg-white border-gray-300 rounded-md text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 shadow-lg">
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace} value={workspace}>{workspace}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as any)}>
              <SelectTrigger className="h-8 px-3 bg-white border-gray-300 rounded-md text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 shadow-lg">
                <SelectItem value="lastUsed">Recent</SelectItem>
                <SelectItem value="title">A-Z</SelectItem>
                <SelectItem value="usageCount">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="h-8 px-3 bg-white border-gray-300 rounded-md text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-gray-200 shadow-lg">
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-gray-500" />
          <Label htmlFor="pinned-filter" className="text-sm text-gray-700 font-medium">
            Show Pinned Only
          </Label>
        </div>
        <Switch
          id="pinned-filter"
          checked={showPinned}
          onCheckedChange={setShowPinned}
          className="data-[state=checked]:bg-blue-600"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            <X className="h-4 w-4 mr-2" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
};
