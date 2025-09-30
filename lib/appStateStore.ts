import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SortOption, ViewType } from '../types/app';
import { chromeLocalStateStorage } from './storage/chromeStateStorage';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './storage/constants';
// import { type PersistedState } from './storage/persistHelpers';
import { withEnvelope } from './storage/envelopeStateStorage';
import { subscribeToStorageKey } from './storage/storageEvents';
import type { PersistMeta } from './storage/types';

interface PersistedAppSlice {
  currentView: ViewType;
  searchTerm: string;
  sortBy: SortOption;
  filterTag: string;
  selectedTags: string[];
  showPinned: boolean;
  contentFilter: 'all' | 'prompts' | 'chats';
  selectedWorkspace: string;
  scrollPositions: Record<string, number>;
  _persistMeta: PersistMeta;
}

interface AppState extends PersistedAppSlice {
  _rehydrated: boolean;
  setCurrentView: (view: ViewType) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: SortOption) => void;
  setFilterTag: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setShowPinned: (value: boolean) => void;
  setContentFilter: (filter: 'all' | 'prompts' | 'chats') => void;
  setSelectedWorkspace: (workspace: string) => void;
  setScrollPosition: (key: string, offset: number) => void;
  resetFilters: () => void;
  markRehydrated: () => void;
}

const stampMeta = (updatedAt: number = Date.now()): PersistMeta => ({
  schemaVersion: STORAGE_SCHEMA_VERSION.ui,
  updatedAt,
});

const defaultPersistSlice: PersistedAppSlice = {
  currentView: 'list',
  searchTerm: '',
  sortBy: 'recent',
  filterTag: 'all',
  selectedTags: [],
  showPinned: false,
  contentFilter: 'all',
  selectedWorkspace: 'all',
  scrollPositions: {},
  _persistMeta: stampMeta(0),
};

const createPersistedState = (): PersistedAppSlice => ({
  ...defaultPersistSlice,
  _persistMeta: stampMeta(0),
});

const useAppStateInternal = create<AppState>()(
  (persist(
    (set) => ({
      ...defaultPersistSlice,
      _rehydrated: false,
      setCurrentView: (view) => set({ currentView: view, _persistMeta: stampMeta() }),
      setSearchTerm: (term) => set({ searchTerm: term, _persistMeta: stampMeta() }),
      setSortBy: (sort) => set({ sortBy: sort, _persistMeta: stampMeta() }),
      setFilterTag: (tag) => set({ filterTag: tag, _persistMeta: stampMeta() }),
      setSelectedTags: (tags) => set({ selectedTags: tags, _persistMeta: stampMeta() }),
      setShowPinned: (value) => set({ showPinned: value, _persistMeta: stampMeta() }),
      setContentFilter: (filter) => set({ contentFilter: filter, _persistMeta: stampMeta() }),
      setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace, _persistMeta: stampMeta() }),
      setScrollPosition: (key, offset) =>
        set((state) => ({
          scrollPositions: { ...state.scrollPositions, [key]: offset },
          _persistMeta: stampMeta(),
        })),
      resetFilters: () =>
        set({
          searchTerm: '',
          filterTag: 'all',
          selectedTags: [],
          showPinned: false,
          contentFilter: 'all',
          selectedWorkspace: 'all',
          _persistMeta: stampMeta(),
        }),
      markRehydrated: () => set({ _rehydrated: true }),
    }),
    {
      name: STORAGE_KEYS.ui,
      version: STORAGE_SCHEMA_VERSION.ui,
      storage: createJSONStorage(() => withEnvelope(chromeLocalStateStorage, STORAGE_SCHEMA_VERSION.ui)),
      partialize: (state): PersistedAppSlice => ({
        currentView: state.currentView,
        searchTerm: state.searchTerm,
        sortBy: state.sortBy,
        filterTag: state.filterTag,
        selectedTags: state.selectedTags,
        showPinned: state.showPinned,
        contentFilter: state.contentFilter,
        selectedWorkspace: state.selectedWorkspace,
        scrollPositions: state.scrollPositions,
        _persistMeta: state._persistMeta,
      }),
      merge: (persistedState: unknown, currentState: AppState) => ({
        ...currentState,
        ...(persistedState as PersistedAppSlice),
        scrollPositions: {
          ...currentState.scrollPositions,
          ...(persistedState as PersistedAppSlice).scrollPositions,
        },
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          useAppStateInternal.setState({ _rehydrated: true });
        }
      },
    },
  ) as any),
);

const selectPersistSlice = (state: AppState): PersistedAppSlice => ({
  currentView: state.currentView,
  searchTerm: state.searchTerm,
  sortBy: state.sortBy,
  filterTag: state.filterTag,
  selectedTags: state.selectedTags,
  showPinned: state.showPinned,
  contentFilter: state.contentFilter,
  selectedWorkspace: state.selectedWorkspace,
  scrollPositions: state.scrollPositions,
  _persistMeta: state._persistMeta,
});

subscribeToStorageKey<PersistedAppSlice>(STORAGE_KEYS.ui, (envelope) => {
  const current = useAppStateInternal.getState();
  const incoming = envelope.state ?? createPersistedState();
  const currentMeta = current._persistMeta ?? stampMeta(0);
  const incomingMeta = incoming._persistMeta ?? stampMeta(envelope.updatedAt);

  if (envelope.updatedAt < currentMeta.updatedAt) {
    return;
  }

  const currentSlice = selectPersistSlice(current);
  const currentJson = JSON.stringify({ ...currentSlice, _persistMeta: undefined });
  const incomingJson = JSON.stringify({ ...incoming, _persistMeta: undefined });
  if (currentJson === incomingJson) {
    return;
  }

  useAppStateInternal.setState({
    currentView: incoming.currentView,
    searchTerm: incoming.searchTerm,
    sortBy: incoming.sortBy,
    filterTag: incoming.filterTag,
    selectedTags: incoming.selectedTags,
    showPinned: incoming.showPinned,
    contentFilter: incoming.contentFilter,
    selectedWorkspace: incoming.selectedWorkspace,
    scrollPositions: incoming.scrollPositions,
    _persistMeta: {
      schemaVersion: incomingMeta.schemaVersion,
      updatedAt: envelope.updatedAt,
    },
  });
});

export const useAppStateStore = useAppStateInternal;
