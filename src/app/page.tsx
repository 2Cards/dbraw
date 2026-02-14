'use client';

import React, { useState, useEffect } from 'react';
import { VisualCanvas } from '@/components/editor/VisualCanvas';
import { storage, Schema } from '@/lib/storage';
import { parseDBML } from '@/lib/dbml-parser';
import { 
  Loader2, Plus, Save, Download, Database, Trash2, 
  Code, Eye, Sparkles, AlertCircle, Share2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

export default function Home() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbmlInput, setDbmlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = storage.getSchemas();
    setSchemas(saved);
    if (saved.length > 0) {
      setCurrentSchema(saved[0]);
      setDbmlInput(saved[0].dbml);
    }
  }, []);

  const handleGenerate = async () => {
    if (!userInput) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: userInput }),
      });
      const data = await res.json();
      
      if (res.ok && data.dbml) {
        const cleanDbml = data.dbml.replace(/```dbml|```/g, '').trim();
        setDbmlInput(cleanDbml);
        const newSchema: Schema = {
          id: Date.now().toString(),
          name: 'AI Draft ' + new Date().toLocaleTimeString(),
          dbml: cleanDbml,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setCurrentSchema(newSchema);
      } else {
        setError(data.error || 'AI limit reached. Try again later.');
      }
    } catch (err) {
      setError('Connection refused.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!dbmlInput) return;
    const name = window.prompt('Project Name', currentSchema?.name || 'My Schema') || 'Untitled';
    const schemaToSave: Schema = {
      id: currentSchema?.id || Date.now().toString(),
      name,
      dbml: dbmlInput,
      createdAt: currentSchema?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    storage.saveSchema(schemaToSave);
    setSchemas(storage.getSchemas());
    setCurrentSchema(schemaToSave);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this project?')) {
      storage.deleteSchema(id);
      const updated = storage.getSchemas();
      setSchemas(updated);
      if (currentSchema?.id === id) {
        if (updated.length > 0) {
          setCurrentSchema(updated[0]);
          setDbmlInput(updated[0].dbml);
        } else {
          setCurrentSchema(null);
          setDbmlInput('');
        }
      }
    }
  };

  const handleDownload = () => {
    if (!dbmlInput) return;
    const blob = new Blob([dbmlInput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSchema?.name || 'schema'}.dbml`;
    a.click();
  };

  const { nodes, edges } = parseDBML(dbmlInput || '');

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 antialiased selection:bg-indigo-500/30">
      {/* 1. Projects Sidebar (Left) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} border-r border-slate-800 bg-slate-900 transition-all duration-300 flex flex-col overflow-hidden shrink-0`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/40">
              <Database size={18} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-white">SchemaForge</span>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-3 space-y-4">
          <div className="px-2 pt-2">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Saved Projects</h2>
            <div className="space-y-1">
              {schemas.map((s) => (
                <div 
                  key={s.id} 
                  className={`group p-2.5 rounded-xl border transition-all flex justify-between items-center ${
                    currentSchema?.id === s.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' 
                    : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700 text-slate-400'
                  }`}
                  onClick={() => {
                    setCurrentSchema(s);
                    setDbmlInput(s.dbml);
                  }}
                >
                  <span className="text-xs font-semibold truncate">{s.name}</span>
                  <Trash2 
                    size={14} 
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace (Split View) */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Top Navbar */}
        <nav className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-4 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-sm font-bold text-white px-2 py-1 bg-slate-800 rounded-md">
              {currentSchema?.name || 'New Project'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all"
            >
              <Save size={14} /> Save
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition-all"
            >
              <Download size={14} /> Export DBML
            </button>
          </div>
        </nav>

        {/* Editor & Canvas Split */}
        <div className="flex-grow flex overflow-hidden">
          {/* Editor Pane (Left part of workspace) */}
          <div className="w-1/3 min-w-[400px] border-r border-slate-800 flex flex-col bg-slate-950">
            <div className="flex-grow flex flex-col p-4 space-y-4">
              {/* AI Prompt */}
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask AI to design or update..."
                  className="w-full h-24 p-4 text-xs bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 resize-none shadow-inner"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !userInput}
                  className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-30 disabled:bg-slate-800"
                >
                  {isLoading ? <Loader2 className="animate-spin text-white" size={16} /> : <Sparkles className="text-white" size={16} />}
                </button>
              </div>

              {/* Code Editor */}
              <div className="flex-grow flex flex-col min-h-0">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                  <Code size={12} />
                  <span>DBML Schema Editor</span>
                </div>
                <textarea
                  value={dbmlInput}
                  onChange={(e) => setDbmlInput(e.target.value)}
                  placeholder="Paste or write DBML here..."
                  className="flex-grow w-full p-5 bg-slate-900/50 border border-slate-800 rounded-2xl text-indigo-400 font-mono text-[13px] leading-relaxed outline-none resize-none scrollbar-thin scrollbar-thumb-slate-700"
                  spellCheck={false}
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-xl flex items-center gap-2 text-red-400 text-[11px] animate-pulse">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Canvas Pane (Right part of workspace) */}
          <div className="flex-grow relative bg-slate-950">
            <VisualCanvas nodes={nodes} edges={edges} />
            {!dbmlInput && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-4 text-slate-700">
                  <div className="p-8 rounded-full bg-slate-900/30 border border-slate-800/30">
                    <Database size={60} className="opacity-10" />
                  </div>
                  <p className="text-sm font-medium tracking-wide">Workspace Empty</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
