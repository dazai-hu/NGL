
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Users, 
  Trash2, 
  Play, 
  Square, 
  Clock, 
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
  Save,
  Cpu,
  AtSign
} from 'lucide-react';
import { MessageTheme, GeneratedMessage } from './types';
import { generateNGLMessages } from './services/geminiService';
import { sendToNGL } from './services/nglSender';

const MAX_USERS = 10;
const STORAGE_KEY = 'ngl_wave_state_v4';
const USERNAME_REGEX = /^[a-z0-9._]+$/;

const App: React.FC = () => {
  const loadState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          targetUsers: parsed.targetUsers || [],
          totalSent: parsed.totalSent || 0,
          theme: parsed.theme || MessageTheme.AUTO,
          intH: parsed.intH ?? 0,
          intM: parsed.intM ?? 0,
          intS: parsed.intS ?? 10,
          isActive: parsed.isActive || false
        };
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    return null;
  };

  const initialState = loadState();

  const [userInput, setUserInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [targetUsers, setTargetUsers] = useState<string[]>(initialState?.targetUsers || []);
  const [theme, setTheme] = useState<MessageTheme>(initialState?.theme || MessageTheme.AUTO);
  const [intH, setIntH] = useState(initialState?.intH ?? 0);
  const [intM, setIntM] = useState(initialState?.intM ?? 0);
  const [intS, setIntS] = useState(initialState?.intS ?? 10);
  const [totalSent, setTotalSent] = useState(initialState?.totalSent || 0);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);

  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [counterTrigger, setCounterTrigger] = useState(0);
  
  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<string[]>([]);
  const userPointerRef = useRef(0);
  const stateRef = useRef({ targetUsers, isActive, theme, isGenerating });

  useEffect(() => {
    stateRef.current = { targetUsers, isActive, theme, isGenerating };
  }, [targetUsers, isActive, theme, isGenerating]);

  useEffect(() => {
    const stateToSave = { targetUsers, totalSent, theme, intH, intM, intS, isActive };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [targetUsers, totalSent, theme, intH, intM, intS, isActive]);

  useEffect(() => {
    // FIX: Using a direct string for the worker path is safer in non-bundled ESM environments
    // This avoids the 'Failed to construct URL' error on Render/Production
    try {
      workerRef.current = new Worker('worker.js');
      
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'TICK' && stateRef.current.isActive) {
          processNextMessage();
        }
      };

      if (initialState?.isActive) {
        const delay = ((intH * 3600) + (intM * 60) + intS) * 1000;
        workerRef.current.postMessage({ type: 'START', delay });
      }
    } catch (err) {
      console.error("Worker initialization failed:", err);
    }

    return () => workerRef.current?.terminate();
  }, []);

  const replenishQueue = async (forceCount?: number) => {
    if (stateRef.current.isGenerating) return;
    setIsGenerating(true);
    try {
      // Fetch high variety batch (20 messages)
      const newBatch = await generateNGLMessages(stateRef.current.theme, forceCount || 20);
      queueRef.current = [...queueRef.current, ...newBatch];
    } catch (e) {
      console.error("Queue replenish failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const processNextMessage = async () => {
    const { targetUsers } = stateRef.current;
    if (targetUsers.length === 0) return;

    // Pick next user in rotation
    const currentTarget = targetUsers[userPointerRef.current % targetUsers.length];
    userPointerRef.current++;

    // Ensure we always have fresh messages in the hopper
    if (queueRef.current.length < 5) {
      replenishQueue();
    }

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
      
      setMessages(prev => [newMsg, ...prev].slice(0, 100));
      const result = await sendToNGL(currentTarget, text);
      
      if (result.success) {
        setTotalSent(prev => prev + 1);
        setCounterTrigger(prev => prev + 1);
      }

      setMessages(prev => prev.map(m => m.id === msgId ? { 
        ...m, status: result.success ? 'sent' : 'failed', error: result.error 
      } : m));
    } else {
      await replenishQueue();
    }
  };

  const validateUsername = (val: string) => {
    const sanitized = val.toLowerCase().trim().replace('@', '');
    if (sanitized && !USERNAME_REGEX.test(sanitized)) {
      setInputError('Invalid characters (use a-z, 0-9, ., _)');
    } else if (sanitized.length > 30) {
      setInputError('Too long (max 30 chars)');
    } else {
      setInputError('');
    }
    setUserInput(sanitized);
  };

  const addUser = () => {
    if (inputError || !userInput) return;
    if (targetUsers.length >= MAX_USERS) {
      setInputError('Max targets reached');
      return;
    }
    if (targetUsers.includes(userInput)) {
      setInputError('Already in list');
      return;
    }
    setTargetUsers([...targetUsers, userInput]);
    setUserInput('');
    setInputError('');
  };

  const removeUser = (username: string) => {
    setTargetUsers(targetUsers.filter(u => u !== username));
  };

  const startWave = async () => {
    if (targetUsers.length === 0) {
      alert("Please add at least one username.");
      return;
    }
    const delay = ((intH * 3600) + (intM * 60) + intS) * 1000;
    if (delay < 1000) {
      alert("Minimum interval is 1 second.");
      return;
    }
    setIsActive(true);
    if (queueRef.current.length === 0) {
      await replenishQueue(25); // Large initial batch for variety
    }
    workerRef.current?.postMessage({ type: 'START', delay });
  };

  const stopWave = () => {
    setIsActive(false);
    workerRef.current?.postMessage({ type: 'STOP' });
  };

  const resetAll = () => {
    if (confirm("Reset system state? This wipes all logs and targets.")) {
      workerRef.current?.postMessage({ type: 'STOP' });
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-10 px-4 bg-[#f9fafb]">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">NGL Wave</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">Multi-Target Intelligence</span>
            <span className="inline-flex items-center gap-1 text-[9px] bg-gray-900 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
              <Cpu className="w-2.5 h-2.5" /> Engine v4.0 (Live)
            </span>
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="premium-card rounded-[32px] p-6 flex items-center justify-between shadow-sm border-none ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-inner">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Dispatches</p>
              <p key={counterTrigger} className={`text-3xl font-black text-gray-900 transition-all ${counterTrigger > 0 ? 'animate-counter-bump' : ''}`}>
                {totalSent.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {isActive ? 'Mission Active' : 'Standby'}
            </span>
            {isActive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />}
          </div>
        </div>

        {/* Configuration Card */}
        <div className="premium-card rounded-[40px] p-8 md:p-10 space-y-8 border-none ring-1 ring-gray-100 shadow-xl">
          <div className="space-y-6">
            
            {/* Input & Target List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> Target Batch ({targetUsers.length}/{MAX_USERS})
                </label>
                {inputError && (
                  <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> {inputError}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold transition-colors ${inputError ? 'text-red-400' : 'text-gray-400'}`}>
                    <AtSign className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    placeholder="ngl_username"
                    value={userInput}
                    onChange={(e) => validateUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addUser()}
                    disabled={targetUsers.length >= MAX_USERS}
                    className={`w-full h-14 bg-gray-50/50 border-none rounded-2xl pl-10 pr-4 focus:ring-2 transition-all font-semibold text-gray-900 placeholder:text-gray-300 shadow-sm ${inputError ? 'focus:ring-red-500 ring-1 ring-red-100' : 'focus:ring-gray-900'}`}
                  />
                </div>
                <button 
                  onClick={addUser}
                  disabled={!!inputError || !userInput || targetUsers.length >= MAX_USERS}
                  className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all disabled:bg-gray-200 shadow-lg active:scale-95"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {targetUsers.length === 0 ? (
                  <p className="text-[11px] text-gray-300 italic px-1 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Targets auto-saved to device memory
                  </p>
                ) : (
                  targetUsers.map(user => (
                    <div key={user} className="flex items-center gap-2 bg-white ring-1 ring-gray-200 px-3 py-2 rounded-xl group hover:ring-gray-300 transition-all animate-in fade-in zoom-in duration-300 shadow-sm">
                      <span className="text-[11px] font-bold text-gray-700">@{user}</span>
                      <button onClick={() => removeUser(user)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vibe Archetype</label>
                <div key={theme} className="relative animate-theme-pop">
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as MessageTheme)}
                    className="w-full h-14 bg-gray-50/50 border-none rounded-2xl px-5 focus:ring-2 focus:ring-gray-900 font-semibold text-gray-900 appearance-none cursor-pointer shadow-sm"
                  >
                    {Object.values(MessageTheme).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Loop Delay
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input type="number" value={intH} onChange={e => setIntH(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-14 text-center bg-gray-50/50 rounded-xl font-bold focus:ring-1 focus:ring-gray-200" />
                    <div className="text-[8px] text-center font-bold text-gray-300 mt-1 uppercase">hr</div>
                  </div>
                  <div className="flex-1">
                    <input type="number" value={intM} onChange={e => setIntM(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-14 text-center bg-gray-50/50 rounded-xl font-bold focus:ring-1 focus:ring-gray-200" />
                    <div className="text-[8px] text-center font-bold text-gray-300 mt-1 uppercase">min</div>
                  </div>
                  <div className="flex-1">
                    <input type="number" value={intS} onChange={e => setIntS(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-14 text-center bg-gray-50/50 rounded-xl font-bold focus:ring-1 focus:ring-gray-200" />
                    <div className="text-[8px] text-center font-bold text-gray-300 mt-1 uppercase">sec</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={isActive ? stopWave : startWave}
            className={`w-full py-6 rounded-[28px] font-black tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-500 shadow-xl active:scale-95 ${
              isActive ? 'bg-red-50 text-red-500 hover:bg-red-100 ring-1 ring-red-200' : 'bg-gray-900 text-white hover:bg-black ring-1 ring-gray-800'
            }`}
          >
            {isActive ? <><Square className="w-5 h-5 fill-current" /> STOP MISSION</> : <><Play className="w-5 h-5 fill-current" /> INITIATE WAVE</>}
          </button>
        </div>

        {/* Logs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Mission Transcript
            </h3>
            <button onClick={resetAll} className="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3" /> Wipe History
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {messages.length === 0 ? (
              <div className="premium-card rounded-[32px] p-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center"><Send className="w-6 h-6 text-gray-200" /></div>
                <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Awaiting First Transmission</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`premium-card rounded-[32px] p-6 flex flex-col gap-3 transition-all duration-700 ${msg.status === 'sent' ? 'animate-success-pop ring-1 ring-green-100 border-green-100' : ''}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-lg">@{msg.targetUser}</span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-[16px] font-bold text-gray-800 leading-snug">{msg.text}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(msg.text)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all text-gray-300 hover:text-gray-900 active:scale-90 shrink-0">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                    {msg.status === 'sent' && <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase"><CheckCircle2 className="w-3 h-3 animate-check" /> Dispatched</span>}
                    {msg.status === 'sending' && <span className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase animate-pulse">Processing...</span>}
                    {msg.status === 'failed' && <span className="flex items-center gap-1 text-[9px] font-black text-red-400 uppercase"><AlertCircle className="w-3 h-3" /> Network Error</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center pt-10 pb-10">
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
            Multi-Threaded Background Engine <br/>
            Hinglish Context Protocol Enabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
