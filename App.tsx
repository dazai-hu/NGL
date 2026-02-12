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
  ChevronRight
} from 'lucide-react';
import { MessageTheme, GeneratedMessage } from './types';
import { generateNGLMessages } from './services/geminiService';
import { sendToNGL } from './services/nglSender';

const MAX_USERS = 12;
const STORAGE_KEY = 'ngl_wave_pro_v5';
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

  const replenishQueue = async (count: number = 20) => {
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
      await replenishQueue(10);
    }
  };

  const validateUsername = (val: string) => {
    const sanitized = val.toLowerCase().trim().replace('@', '');
    if (sanitized && !USERNAME_REGEX.test(sanitized)) {
      setInputError('Invalid chars (a-z, 0-9, ., _)');
    } else if (sanitized.length > 30) {
      setInputError('Too long');
    } else {
      setInputError('');
    }
    setUserInput(sanitized);
  };

  const addUser = () => {
    if (inputError || !userInput) return;
    if (targetUsers.length >= MAX_USERS) return;
    if (targetUsers.includes(userInput)) {
      setInputError('Already added');
      return;
    }
    setTargetUsers([...targetUsers, userInput]);
    setUserInput('');
  };

  const startWave = async () => {
    if (targetUsers.length === 0) return alert("Add a target username.");
    const delay = ((intH * 3600) + (intM * 60) + intS) * 1000;
    if (delay < 1000) return alert("Min delay is 1s.");
    
    setIsActive(true);
    if (queueRef.current.length === 0) await replenishQueue(20);
    workerRef.current?.postMessage({ type: 'START', delay });
  };

  const stopWave = () => {
    setIsActive(false);
    workerRef.current?.postMessage({ type: 'STOP' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-pink-500/30">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 italic">
              NGL WAVE <span className="not-italic text-[10px] bg-white text-black px-2 py-0.5 rounded-full mono">PRO</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Hinglish Contextual Engine v5.0</p>
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 text-green-500">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Secure Cloud</span>
             </div>
             {isActive && <div className="text-[9px] text-gray-600 animate-pulse mt-1">Background Thread Running...</div>}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="premium-card rounded-3xl p-6 flex flex-col justify-between h-32">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" /> Lifetime Dispatches
            </p>
            <p className="text-4xl font-black mono">{totalSent.toLocaleString()}</p>
          </div>
          <div className="premium-card rounded-3xl p-6 flex flex-col justify-between h-32">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-500" /> Active Pool
            </p>
            <p className="text-4xl font-black mono">{targetUsers.length}<span className="text-lg text-gray-600">/{MAX_USERS}</span></p>
          </div>
        </div>

        {/* Main Controls */}
        <div className="premium-card rounded-[40px] p-8 space-y-8">
          <div className="space-y-6">
            {/* Target Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Database</label>
                {inputError && <span className="text-[10px] font-bold text-red-500 animate-bounce">{inputError}</span>}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="text" 
                    placeholder="ngl_id"
                    value={userInput}
                    onChange={(e) => validateUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addUser()}
                    className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl pl-12 pr-4 focus:ring-1 focus:ring-white/20 transition-all font-bold text-white placeholder:text-gray-700"
                  />
                </div>
                <button onClick={addUser} className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {targetUsers.map(user => (
                  <div key={user} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <span className="text-xs font-bold text-gray-300">@{user}</span>
                    <button onClick={() => setTargetUsers(prev => prev.filter(u => u !== user))} className="text-gray-600 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vibe Archetype</label>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as MessageTheme)}
                  className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-5 focus:ring-1 focus:ring-white/20 font-bold appearance-none cursor-pointer"
                >
                  {Object.values(MessageTheme).map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Timer className="w-3 h-3" /> Interval</label>
                <div className="flex gap-2">
                  <input type="number" value={intS} onChange={e => setIntS(Math.max(1, parseInt(e.target.value) || 0))} className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl text-center font-black mono focus:ring-1 focus:ring-white/20" />
                  <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase">Seconds</div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={isActive ? stopWave : startWave}
            className={`w-full py-6 rounded-3xl font-black tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl active:scale-[0.98] ${
              isActive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {isActive ? <><Square className="w-5 h-5 fill-current" /> TERMINATE WAVE</> : <><Play className="w-5 h-5 fill-current" /> INITIATE DEPLOYMENT</>}
          </button>
        </div>

        {/* Log Transcript */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
               <Cpu className="w-3 h-3" /> Live Kernel Log
             </h2>
             <button onClick={() => setMessages([])} className="text-[10px] font-bold text-gray-700 hover:text-white uppercase tracking-widest transition-colors">Clear</button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {messages.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <Send className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Signal</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="premium-card rounded-2xl p-5 border-l-4 border-l-white/20 animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-black mono text-white/60">@{msg.targetUser}</span>
                      <span className="text-[9px] font-medium text-gray-600 mono">{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {msg.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {msg.status === 'sending' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                    {msg.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <p className="text-sm font-bold text-gray-300 leading-relaxed mb-3">{msg.text}</p>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                    <span className={msg.status === 'sent' ? 'text-green-500' : msg.status === 'failed' ? 'text-red-500' : 'text-blue-500'}>
                      {msg.status}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(msg.text)} className="text-gray-700 hover:text-gray-400 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="text-center py-10 opacity-30">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] mb-2">Developed for Scale</p>
          <p className="text-[8px] mono">2025 Wave Pro Distribution</p>
        </footer>
      </div>
    </div>
  );
};

export default App;