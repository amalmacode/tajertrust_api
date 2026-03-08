
import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Layers, 
  Globe, 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  ChevronRight, 
  FileCode, 
  Folder,
  Play,
  MessageSquare,
  Settings,
  AlertTriangle,
  Key,
  User,
  Shield,
  Briefcase,
  Plus,
  Trash2,
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Skull,
  Users,
  Smartphone,
  Lock,
  LogOut
} from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { FileNode, RefactorStep } from './types';

// Declaring global aistudio for TS
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const INITIAL_STEPS: RefactorStep[] = [
  { id: '1', title: 'Service Layer Extraction', description: 'Extracted business logic into /services/ for Auth, Users, and Blacklist.', status: 'completed', filesAffected: ['services/auth.service.js', 'services/user.service.js', 'services/blacklist.service.js'] },
  { id: '2', title: 'Implement API v1 Auth', description: 'Created /api/v1/auth endpoints including login, logout, and me.', status: 'completed', filesAffected: ['routes/api/v1/auth.api.js', 'middleware/apiAuth.js'] },
  { id: '3', title: 'Production Hardening', description: 'Implemented JWT stateless tokens, Rate Limiting, Helmet security, and CORS.', status: 'completed', filesAffected: ['app.js', 'services/auth.service.js'] },
  { id: '4', title: 'Mobile App Sync', description: 'Optimized /api/v1/me and /api/v1/blacklist for mobile consumption.', status: 'completed', filesAffected: ['routes/api/v1/users.api.js'] },
  { id: '5', title: 'Audit & Logging', description: 'Finalized activity logging for blacklist contributions and admin actions.', status: 'current', filesAffected: ['services/blacklist.service.js', 'services/admin.service.js'] },
];

const MOCK_FILES: FileNode[] = [
  { path: 'app.js', name: 'app.js (Main)', type: 'file' },
  {
    path: 'services',
    name: 'services',
    type: 'folder',
    children: [
      { path: 'services/auth.service.js', name: 'auth.service.js', type: 'file' },
      { path: 'services/user.service.js', name: 'user.service.js', type: 'file' },
      { path: 'services/blacklist.service.js', name: 'blacklist.service.js', type: 'file' },
      { path: 'services/security.service.js', name: 'security.service.js', type: 'file' },
      { path: 'services/admin.service.js', name: 'admin.service.js', type: 'file' },
    ]
  },
  {
    path: 'routes',
    name: 'routes',
    type: 'folder',
    children: [
      {
        path: 'routes/api',
        name: 'api',
        type: 'folder',
        children: [
          {
            path: 'routes/api/v1',
            name: 'v1',
            type: 'folder',
            children: [
              { path: 'routes/api/v1/auth.api.js', name: 'auth.api.js', type: 'file' },
              { path: 'routes/api/v1/users.api.js', name: 'users.api.js', type: 'file' },
              { path: 'routes/api/v1/blacklist.api.js', name: 'blacklist.api.js', type: 'file' },
              { path: 'routes/api/v1/admin.api.js', name: 'admin.api.js', type: 'file' },
              { path: 'routes/api/v1/keys.api.js', name: 'keys.api.js', type: 'file' },
            ]
          }
        ]
      },
      { path: 'routes/auth.js', name: 'auth.js (Web)', type: 'file' },
      { path: 'routes/users.js', name: 'users.js (Web)', type: 'file' },
    ]
  },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'explorer' | 'terminal' | 'chat'>('blueprint');
  const [selectedFile, setSelectedFile] = useState<string | null>('app.js');
  const [codeContent, setCodeContent] = useState<string>('// Select a file to view generated refactor code...');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasCustomKey(hasKey);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setIsQuotaExceeded(false);
      handleFileSelect(selectedFile || 'app.js');
    }
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    setIsLoadingCode(true);
    setIsQuotaExceeded(false);
    
    const gemini = new GeminiService();
    const result = await gemini.generateRefactoredCode(path, "/* Hardened logic from tajertrust repo... */", 'API_Route');
    
    if (result === "QUOTA_EXCEEDED") {
      setIsQuotaExceeded(true);
      setCodeContent("// QUOTA EXCEEDED: Connect a personal API key.");
    } else if (result === "KEY_NOT_FOUND") {
      setHasCustomKey(false);
      await handleSelectKey();
    } else {
      setCodeContent(result || '// No content generated');
    }
    setIsLoadingCode(false);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage('');
    
    const gemini = new GeminiService();
    const response = await gemini.askArchitectureQuestion(userMsg);
    setChatHistory(prev => [...prev, { role: 'ai', text: response === "QUOTA_EXCEEDED" ? "Quota reached." : response }]);
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-200">
      <nav className="w-16 md:w-64 bg-[#161920] border-r border-gray-800 flex flex-col">
        <div className="p-4 flex items-center space-x-3 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <Lock className="text-white w-5 h-5" />
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight text-white italic">HardenedAPI</span>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <NavItem icon={<Layers />} label="Blueprint" active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} />
          <NavItem icon={<FileCode />} label="Explorer" active={activeTab === 'explorer'} onClick={() => setActiveTab('explorer')} />
          <NavItem icon={<Smartphone />} label="Mobile Tester" active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
          <NavItem icon={<MessageSquare />} label="AI Advisor" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        </div>

        <div className="p-4 border-t border-gray-800">
           <button onClick={handleSelectKey} className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-white uppercase font-bold px-2 py-1 mb-4">
             <span>{hasCustomKey ? 'Production Key' : 'Shared Key'}</span>
             <ShieldCheck className="w-3 h-3 text-green-500" />
           </button>
           <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 flex items-center justify-center space-x-2 text-sm transition-colors shadow-lg">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:block font-semibold">Deploy Build</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 bg-[#0f1115] overflow-hidden flex flex-col">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0f1115]/80 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-100">Production Engine <span className="text-indigo-400">V1.0.2</span></h1>
            <div className="hidden lg:flex items-center space-x-2 bg-green-900/20 px-3 py-1 rounded-full text-[10px] text-green-400 border border-green-500/20 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              <span>Hardened & Verified</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'blueprint' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
              <section className="bg-[#161920] border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <span className="text-gray-100 uppercase tracking-widest text-sm">Hardening Roadmap</span>
                </h2>
                <div className="space-y-4">
                  {INITIAL_STEPS.map((step) => (
                    <div key={step.id} className={`p-4 rounded-lg border flex items-start space-x-4 transition-all ${
                      step.status === 'current' 
                        ? 'bg-indigo-900/10 border-indigo-500/50 shadow-lg' 
                        : 'bg-gray-800/10 border-gray-700/50'
                    }`}>
                      <div className="mt-1">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : step.status === 'current' ? (
                          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-600"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-200">{step.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              <div className="bg-[#0a0a0c] rounded-lg shadow-2xl border border-gray-800 overflow-hidden">
                <div className="bg-[#1c1c1c] px-4 py-2 flex items-center justify-between border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-gray-400 font-mono">POST /api/v1/auth/login</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">Mobile Client (Stateless)</span>
                </div>
                <div className="p-6 font-mono text-sm space-y-4">
                   <div className="text-gray-500">// Returns Bearer JWT Token</div>
                   <div className="p-4 bg-gray-900 rounded border border-gray-800">
                    <pre className="text-green-300">
                    {`{
                    "success": true,
                    "data": {
                        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "user": { "id": 42, "email": "seller@tajertrust.com" }
                    }
                    }`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0a0c] rounded-lg shadow-2xl border border-gray-800 overflow-hidden">
                <div className="bg-[#1c1c1c] px-4 py-2 flex items-center justify-between border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4 text-orange-400" />
                    <span className="text-xs text-gray-400 font-mono">POST /api/v1/auth/logout</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">Mobile Client</span>
                </div>
                <div className="p-6 font-mono text-sm space-y-4">
                   <div className="text-gray-500">// Terminates session or notifies client</div>
                   <div className="p-4 bg-gray-900 rounded border border-gray-800">
                    <pre className="text-green-300">
                    {`{
                    "success": true,
                    "data": {
                        "message": "Logout successful. Please delete your local credentials.",
                        "method": "JWT"
                    }
                    }`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0a0c] rounded-lg shadow-2xl border border-gray-800 overflow-hidden opacity-80">
                <div className="bg-[#1c1c1c] px-4 py-2 flex items-center justify-between border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400 font-mono">GET /api/v1/auth/me</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">Auth: Bearer Token</span>
                </div>
                <div className="p-6 font-mono text-sm space-y-4 text-gray-400">
                  <p>Endpoint verified. Mobile clients use this to check session validity without cookies.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'explorer' && (
             <div className="flex h-full border border-gray-800 rounded-xl overflow-hidden bg-[#161920] shadow-2xl">
                <div className="w-1/3 border-r border-gray-800 p-4 overflow-y-auto bg-[#13161b]">
                  <div className="space-y-1">
                    {MOCK_FILES.map(node => (
                      <FileExplorerNode key={node.path} node={node} selectedPath={selectedFile} onSelect={handleFileSelect} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col bg-[#0d0d0d]">
                  <div className="h-10 bg-[#1c1c1c] flex items-center px-4 border-b border-gray-800">
                    <span className="text-[11px] font-mono text-indigo-300">{selectedFile || 'Editor'}</span>
                  </div>
                  <div className="flex-1 p-6 overflow-auto code-font text-[13px]">
                    <pre className="text-indigo-100 whitespace-pre-wrap">{codeContent}</pre>
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col border border-gray-800 rounded-xl bg-[#161920] overflow-hidden">
               <div className="p-4 border-b border-gray-800 flex items-center space-x-3 bg-gray-800/10">
                 <Shield className="w-5 h-5 text-indigo-500" />
                 <h3 className="text-sm font-bold text-gray-100 uppercase tracking-tighter">Architecture Security Auditor</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {chatHistory.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                       msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'
                     }`}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
               </div>
               <div className="p-4 border-t border-gray-800 flex space-x-3 bg-black/20">
                 <input 
                   type="text" 
                   value={chatMessage}
                   onChange={(e) => setChatMessage(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                   placeholder="Ask about JWT implementation or security..." 
                   className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
                 <button onClick={handleSendMessage} className="bg-indigo-600 p-2.5 rounded-xl"><ChevronRight className="w-5 h-5 text-white" /></button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Sub-components
const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center px-4 py-3.5 space-x-4 transition-all relative ${
    active ? 'text-indigo-400 bg-indigo-600/5' : 'text-gray-500 hover:bg-gray-800/30'
  }`}>
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
    <span className="hidden md:block font-medium text-[10px] tracking-widest uppercase">{label}</span>
  </button>
);

const FileExplorerNode: React.FC<{ node: FileNode, selectedPath: string | null, onSelect: (p: string) => void, level?: number }> = ({ node, selectedPath, onSelect, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedPath === node.path;
  return (
    <div>
      <div 
        onClick={() => node.type === 'folder' ? setIsOpen(!isOpen) : onSelect(node.path)}
        className={`flex items-center space-x-2 py-1.5 px-3 rounded-md cursor-pointer ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-gray-800/40 text-gray-400'}`}
        style={{ paddingLeft: `${(level * 16) + 12}px` }}
      >
        {node.type === 'folder' ? <Folder className="w-4 h-4 text-indigo-400" /> : <FileCode className="w-4 h-4" />}
        <span className="text-[13px] truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && isOpen && node.children?.map(child => (
        <FileExplorerNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} level={level + 1} />
      ))}
    </div>
  );
};

export default App;
