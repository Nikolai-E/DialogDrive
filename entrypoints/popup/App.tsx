import { useState, FC } from 'react';
import { 
  PlusIcon, 
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  LinkIcon,
  FolderIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- Data Structures & Mock Data (for demonstration) ---
interface WorkspaceItem {
  id: string;
  name: string;
  type: 'text' | 'file' | 'image' | 'url';
}

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  items: WorkspaceItem[];
}

const MOCK_WORKSPACES: Workspace[] = [
  { id: 'ws1', name: 'Nova AI Research', createdAt: new Date(2023, 10, 5).toISOString(), items: [ { id: 'item1', name: 'Initial Q&A Transcript', type: 'text' }, { id: 'item2', name: 'User Persona Doc', type: 'file' }, { id: 'item3', name: 'Moodboard AI App', type: 'image' }, { id: 'item4', name: 'Github Repo: core-ai', type: 'url' }, ], },
  { id: 'ws2', name: 'Project Phoenix', createdAt: new Date(2023, 11, 15).toISOString(), items: [ { id: 'item5', name: 'Sprint Planning Notes', type: 'text' }, { id: 'item6', name: 'Architecture Diagram', type: 'image' }, { id: 'item7', name: 'Competitor Analysis Report', type: 'file' }, ], },
  { id: 'ws3', name: 'Website Redesign', createdAt: new Date(2023, 9, 20).toISOString(), items: [] },
];

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// --- Polished Sub-Components ---
const WorkspaceListItem: FC<{ workspace: Workspace; onSelect: () => void }> = ({ workspace, onSelect }) => (
  <button onClick={onSelect} className="w-full text-left p-4 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 transition-all duration-300 cursor-pointer group border border-transparent hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transform hover:scale-[1.02]">
    <div className="flex justify-between items-center">
      <h3 className="font-semibold text-zinc-200 truncate group-hover:text-white">{workspace.name}</h3>
      <ArrowRightIcon className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1" />
    </div>
    <p className="text-xs text-zinc-500 mt-1 group-hover:text-zinc-400">{workspace.items.length} items · Created {formatDate(workspace.createdAt)}</p>
  </button>
);

const DetailItem: FC<{ item: WorkspaceItem }> = ({ item }) => {
  const ICONS = { 
    text: { icon: DocumentTextIcon, color: 'text-sky-400', bg: 'bg-gradient-to-br from-sky-500/20 to-blue-500/20', border: 'border-sky-500/30' }, 
    file: { icon: FolderIcon, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' }, 
    image: { icon: PhotoIcon, color: 'text-violet-400', bg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20', border: 'border-violet-500/30' }, 
    url: { icon: LinkIcon, color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30' }, 
  };
  const { icon: Icon, color, bg, border } = ICONS[item.type];
  return ( 
    <div className="p-3 rounded-lg bg-gradient-to-r from-zinc-800/80 to-zinc-700/40 border border-zinc-700/50 hover:border-zinc-600/80 flex items-center space-x-3 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 transform hover:scale-[1.01]"> 
      <div className={`p-2.5 rounded-lg ${bg} border ${border}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <h4 className="font-medium text-sm text-zinc-200 truncate">{item.name}</h4>
        <p className="text-xs text-zinc-500 capitalize">{item.type}</p>
      </div>
    </div> 
  );
};

// --- Main App Component ---
const App: FC = () => {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const selectedWorkspace = MOCK_WORKSPACES.find(ws => ws.id === selectedWorkspaceId);
  const viewAnimation = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } };
  return (
    <div className="w-[380px] h-[580px] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl border border-white/10 shadow-2xl shadow-black/40 flex flex-col p-4 text-zinc-100 font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-500/10 to-purple-500/10 rounded-full blur-2xl translate-y-12 -translate-x-12"></div>
      
      <AnimatePresence mode="wait">
        {!selectedWorkspace ? (
          <motion.div key="list" {...viewAnimation} className="flex flex-col flex-grow overflow-hidden h-full relative z-10">
            <div className="mb-6 shrink-0">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                DialogDrive
              </h1>
              <p className="text-sm text-zinc-400 mt-1">Your AI Project Workspaces</p>
              <div className="w-12 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mt-2"></div>
            </div>
            <div className="overflow-y-auto flex-grow space-y-1.5 pr-2 -mr-2 mb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800/50">
              {MOCK_WORKSPACES.map((ws) => (<WorkspaceListItem key={ws.id} workspace={ws} onSelect={() => setSelectedWorkspaceId(ws.id)} />))}
            </div>
            <footer className="mt-auto shrink-0 border-t border-white/10 pt-4">
              <button className="w-full flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-zinc-900 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <PlusIcon className="w-5 h-5 mr-2 relative z-10" /> 
                <span className="relative z-10">New Workspace</span>
              </button>
            </footer>
          </motion.div>
        ) : (
          <motion.div key="detail" {...viewAnimation} className="flex flex-col flex-grow overflow-hidden h-full">
            <div className="flex items-center mb-4 shrink-0">
              <button onClick={() => setSelectedWorkspaceId(null)} className="p-2 rounded-full hover:bg-zinc-700/80 mr-3 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Back to list"><ArrowLeftIcon className="w-5 h-5 text-zinc-400" /></button>
              <div className="min-w-0"><h2 className="text-xl font-bold text-zinc-100 truncate">{selectedWorkspace.name}</h2><p className="text-xs text-zinc-400">{selectedWorkspace.items.length} items</p></div>
            </div>
            <div className="overflow-y-auto flex-grow space-y-3 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800/50">
              {selectedWorkspace.items.length > 0 ? ( selectedWorkspace.items.map((item) => <DetailItem key={item.id} item={item} />) ) : ( <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500"><FolderIcon className="w-12 h-12 text-zinc-600 mb-2"/><h3 className="font-semibold text-zinc-400">Empty Workspace</h3><p className="text-sm">Add items to get started.</p></div> )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default App;