import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Users, 
  Trash2, 
  Play, 
  Square, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Info,
  Timer,
  BarChart3,
  UserPlus,
  X,
  MessageSquare,
  Cpu,
  AtSign,
  ShieldCheck,
  ChevronRight,
  Clock,
  ArrowRight
} from 'lucide-react';
import { MessageTheme, GeneratedMessage } from './types';
import { generateNGLMessages } from './services/geminiService';
import { sendToNGL } from './services/nglSender';

const MAX_USERS = 10;
const STORAGE_KEY = 'ngl_wave_pro_v6';
const USERNAME_REGEX = /^[a-z0-9._]+$/;

const WORKER_CODE = `
  let timer = null;
  self.onmessage = function(e) {
    const { type, delay } = e.data;
    if (type === 'START') {
      if (timer) clearInterval(timer);
      self.postMessage({ type: 'TICK' });
      timer = setInterval(() => {
        self.postMessage({ type: 'TICK' });
      }, delay);
    }
    if (type === 'STOP') {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
`;

const App: React.FC = () => {
  const [targetUsers, setTargetUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).targetUsers : [];
  });
  
  const [userInput, setUserInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [theme, setTheme] = useState<MessageTheme>(MessageTheme.AUTO);
  
  // Refined Interval State
  const [intH, setIntH] = useState(0);
  const [intM, setIntM] = useState(0);
  const [intS, setIntS] = useState(10);

  const [totalSent, setTotalSent] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).totalSent : 0;
  });
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<string[]>([]);
  const userPointerRef = useRef(0);
  const stateRef = useRef({ targetUsers, isActive, theme, isGenerating });

  useEffect(() => {
    stateRef.current = { targetUsers, isActive, theme, isGenerating };
  }, [targetUsers, isActive, theme, isGenerating]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ targetUsers, totalSent }));
  }, [targetUsers, totalSent]);

  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK' && stateRef.current.isActive) {
        processNextMessage();
      }
    };

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const replenishQueue = async (count: number = 15) => {
    if (stateRef.current.isGenerating) return;
    setIsGenerating(true);
    try {
      const newBatch = await generateNGLMessages(stateRef.current.theme, count);
      queueRef.current = [...queueRef.current, ...newBatch];
    } catch (e) {
      console.error("AI Generation failed:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const processNextMessage = async () => {
    const { targetUsers } = stateRef.current;
    if (targetUsers.length === 0) {
      stopWave();
      return;
    }

    const currentTarget = targetUsers[userPointerRef.current % targetUsers.length];
    userPointerRef.current++;

    if (queueRef.current.length < 3) replenishQueue();

    if (queueRef.current.length > 0) {
      const text = queueRef.current.shift()!;
      const msgId = Math.random().toString(36).substr(2, 9);
      
      const newMsg: GeneratedMessage = {
        id: msgId, 
        text, 
        targetUser: currentTarget, 
        status: 'sending', 
        timestamp: new Date()
      };
      
      setMessages(prev => [newMsg, ...prev].slice(0, 50));
      const result = await sendToNGL(currentTarget, text);
      
      if (result.success) setTotalSent(prev => prev + 1);

      setMessages(prev => prev.map(m => m.id === msgId ? { 
        ...m, status: result.success ? 'sent' : 'failed', error: result.error 
      } : m));
    } else {
      await replenishQueue(5);
    }
  };

  const validateUsername = (val: string) => {
    const sanitized = val.toLowerCase().trim().replace('@', '');
    if (sanitized && !USERNAME_REGEX.test(sanitized)) {
      setInputError('Invalid characters');
    } else if (sanitized.length > 30) {
      setInputError('Too long');
    } else {
      setInputError('');
    }
    setUserInput(sanitized);
  };

  const addUser = () => {
    if (inputError || !userInput) return;
    if (targetUsers.length >= MAX_USERS) {
      alert(`Max ${MAX_USERS} users allowed.`);
      return;
    };
    if (targetUsers.includes(userInput)) {
      setInputError('User already in pool');
      return;
    }
    setTargetUsers([...targetUsers, userInput]);
    setUserInput('');
  };

  const startWave = async () => {
    if (targetUsers.length === 0) return alert("Add at least one target username.");
    
    // Calculate total ms
    const totalSeconds = (intH * 3600) + (intM * 60) + intS;
    const delay = totalSeconds * 1000;
    
    if (delay < 1000) return alert("Minimum interval is 1 second.");
    
    setIsActive(true);
    if (queueRef.current.length === 0) await replenishQueue(15);
    workerRef.current?.postMessage({ type: 'START', delay });
  };

  const stopWave = () => {
    setIsActive(false);
    workerRef.current?.postMessage({ type: 'STOP' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-pink-500/30">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 italic">
              NGL WAVE <span className="not-italic text-[10px] bg-white text-black px-2 py-0.5 rounded-full mono uppercase tracking-widest">v6 PRO</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-bold">Autopilot Hinglish Engine</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <div className="flex items-center gap-2 text-green-500">
               <ShieldCheck className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black uppercase tracking-widest">AI ACTIVE</span>
            </div>
            <div className="w-[1px] h-4 bg-white/10"></div>
            <div className="flex items-center gap-2 text-yellow-500">
               <Cpu className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black uppercase tracking-widest mono">{queueRef.current.length} QUEUED</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="premium-card rounded-3xl p-6 border-b-2 border-b-pink-500/20">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Total Dispatched</p>
            <p className="text-4xl font-black mono">{totalSent.toLocaleString()}</p>
          </div>
          <div className="premium-card rounded-3xl p-6 border-b-2 border-b-blue-500/20">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">User Pool</p>
            <p className="text-4xl font-black mono">{targetUsers.length}<span className="text-sm text-gray-700">/{MAX_USERS}</span></p>
          </div>
        </div>

        {/* Console Interface */}
        <div className="premium-card rounded-[32px] overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Target Entry */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">User Enrollment</h3>
                {inputError && <span className="text-[10px] font-bold text-red-500">{inputError}</span>}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="text" 
                    placeholder="Enter NGL username"
                    value={userInput}
                    onChange={(e) => validateUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addUser()}
                    className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 focus:ring-1 focus:ring-white/10 transition-all font-bold text-sm tracking-tight placeholder:text-gray-800"
                  />
                </div>
                {userInput && !inputError && (
                  <button 
                    onClick={addUser} 
                    className="h-14 px-6 bg-white text-black rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/5"
                  >
                    <UserPlus className="w-4 h-4" /> Add User
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {targetUsers.length === 0 && <p className="text-[10px] text-gray-700 font-bold italic">No active targets in database...</p>}
                {targetUsers.map(user => (
                  <div key={user} className="group flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] px-4 py-2 rounded-xl hover:border-white/20 transition-all">
                    <span className="text-xs font-black text-gray-400">@{user}</span>
                    <button onClick={() => setTargetUsers(prev => prev.filter(u => u !== user))} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-white/5 w-full"></div>

            {/* Config Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-pink-500" /> Vibe Profile
                </label>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as MessageTheme)}
                  className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl px-5 focus:ring-1 focus:ring-white/10 font-black text-xs appearance-none cursor-pointer tracking-wider"
                >
                  {Object.values(MessageTheme).map(t => <option key={t} value={t} className="bg-[#0a0a0a]">{t}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-500" /> Interval Config
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <input 
                      type="number" 
                      min="0"
                      value={intH} 
                      onChange={e => setIntH(Math.max(0, parseInt(e.target.value) || 0))} 
                      className="w-full h-12 bg-black/40 border border-white/5 rounded-xl text-center font-black mono text-xs" 
                    />
                    <div className="text-[8px] text-center text-gray-600 font-bold uppercase tracking-tighter">Hrs</div>
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="number" 
                      min="0"
                      max="59"
                      value={intM} 
                      onChange={e => setIntM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                      className="w-full h-12 bg-black/40 border border-white/5 rounded-xl text-center font-black mono text-xs" 
                    />
                    <div className="text-[8px] text-center text-gray-600 font-bold uppercase tracking-tighter">Min</div>
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="number" 
                      min="1"
                      max="59"
                      value={intS} 
                      onChange={e => setIntS(Math.min(59, Math.max(1, parseInt(e.target.value) || 0)))} 
                      className="w-full h-12 bg-black/40 border border-white/5 rounded-xl text-center font-black mono text-xs" 
                    />
                    <div className="text-[8px] text-center text-gray-600 font-bold uppercase tracking-tighter">Sec</div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={isActive ? stopWave : startWave}
              className={`w-full py-6 rounded-2xl font-black tracking-[0.3em] text-[11px] flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl active:scale-[0.98] ${
                isActive 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {isActive ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                  ABORT SEQUENCE
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  INITIALIZE WAVE DEPLOYMENT
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Kernel Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center gap-2">
               <BarChart3 className="w-3 h-3" /> Mission Transcript
             </h2>
             <button onClick={() => setMessages([])} className="text-[10px] font-bold text-gray-800 hover:text-white uppercase tracking-widest transition-colors">Wipe Logs</button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {messages.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[32px] opacity-10">
                <MessageSquare className="w-10 h-10 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">System Idle</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="premium-card rounded-2xl p-5 border-l-2 border-l-white/10 hover:border-l-white/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black mono text-white/40">
                        {msg.targetUser.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/80">@{msg.targetUser}</p>
                        <p className="text-[8px] font-bold text-gray-700 mono">{msg.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {msg.status === 'sent' && <span className="text-[8px] font-black text-green-500 px-2 py-0.5 bg-green-500/10 rounded uppercase tracking-tighter">Dispatched</span>}
                       {msg.status === 'sending' && <span className="text-[8px] font-black text-blue-500 px-2 py-0.5 bg-blue-500/10 rounded uppercase tracking-tighter animate-pulse">Syncing</span>}
                       {msg.status === 'failed' && <span className="text-[8px] font-black text-red-500 px-2 py-0.5 bg-red-500/10 rounded uppercase tracking-tighter">Blocked</span>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-300 leading-relaxed mb-4 pl-11 italic">"{msg.text}"</p>
                  <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-3">
                    <button onClick={() => navigator.clipboard.writeText(msg.text)} className="text-[9px] font-black text-gray-600 hover:text-white flex items-center gap-1 transition-colors uppercase">
                      <Copy className="w-3 h-3" /> Copy Text
                    </button>
                    <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                    <span className="text-[9px] font-black text-gray-800 uppercase mono">ID: {msg.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="text-center py-12 opacity-20 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] mb-2">Refined Distribution Protocol</p>
          <div className="flex items-center justify-center gap-4 text-[8px] mono text-gray-500">
             <span>ENCRYPTED LAYER</span>
             <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
             <span>GLOBAL NODE ACTIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;