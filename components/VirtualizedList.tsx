/**
 * Virtualized List Component for DialogDrive
 * Addresses performance issues with large datasets
 * Uses TanStack Virtual for efficient DOM virtualization
 */

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  height?: number;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  estimateSize,
  renderItem,
  className = '',
  height = 400,
  overscan = 5
}: VirtualizedListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Specialized virtualized prompt list
interface VirtualizedPromptListProps {
  prompts: any[];
  onPromptSelect: (prompt: any) => void;
  onPromptEdit: (prompt: any) => void;
  onPromptDelete: (id: string) => void;
  className?: string;
  height?: number;
}

export function VirtualizedPromptList({
  prompts,
  onPromptSelect,
  onPromptEdit,
  onPromptDelete,
  className = '',
  height = 400
}: VirtualizedPromptListProps) {
  const renderPromptItem = (prompt: any, index: number) => (
    <div 
      key={prompt.id}
      className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0" onClick={() => onPromptSelect(prompt)}>
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {prompt.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {prompt.text}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {prompt.workspace}
            </span>
            {prompt.tags.map((tag: string) => (
              <span 
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
            {prompt.isPinned && (
              <span className="text-yellow-500 text-xs">📌</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPromptEdit(prompt);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPromptDelete(prompt.id);
            }}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={prompts}
      estimateSize={120} // Estimated height per prompt item
      renderItem={renderPromptItem}
      className={className}
      height={height}
      overscan={3}
    />
  );
}

// Grid virtualization for card layouts
interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  itemsPerRow: number;
  gap?: number;
  className?: string;
  height?: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  itemHeight,
  itemsPerRow,
  gap = 16,
  className = '',
  height = 400
}: VirtualizedGridProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Calculate rows needed
  const rowCount = Math.ceil(items.length / itemsPerRow);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * itemsPerRow;
          const endIndex = Math.min(startIndex + itemsPerRow, items.length);
          const rowItems = items.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                gap: `${gap}px`,
              }}
            >
              {rowItems.map((item, itemIndex) =>
                renderItem(item, startIndex + itemIndex)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Performance monitoring hook
export function useVirtualizationMetrics() {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    itemCount: 0,
    visibleItems: 0,
  });

  const startTimer = React.useCallback(() => {
    return performance.now();
  }, []);

  const endTimer = React.useCallback((start: number, itemCount: number, visibleItems: number) => {
    const renderTime = performance.now() - start;
    setMetrics({ renderTime, itemCount, visibleItems });
  }, []);

  return { metrics, startTimer, endTimer };
}
