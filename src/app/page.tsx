'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VisualCanvas } from '@/components/editor/VisualCanvas';
import { storage, Schema } from '@/lib/storage';
import { parseDBML } from '@/lib/dbml-parser';
import { useNodesState, useEdgesState, Node, Edge } from 'reactflow';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-sql';

import { 
  Loader2, Save, Database, Trash2, 
  Code, Sparkles, AlertCircle, PanelLeftClose, PanelLeftOpen, PencilLine, FilePlus, Download,
  Menu, X, Eye
} from 'lucide-react';

const dbmlHighlight = (code: string) => {
  return highlight(code, {
    ...languages.sql,
    'keyword': /\b(Table|Ref|Enum|indexes|Project|Note|as|pk|unique|not null|increment)\b/i,
    'string': /(['"])(?:(?!\1)[^\\\r\n]|\\.)*\1/,
    'comment': /\/\/.*|(?:\/\*[\s\S]*?\*\/)/,
    'class-name': /\b[A-Z_][a-z0-9_]*\b/,
  }, 'dbml');
};

type MobileTab = 'prompt' | 'code' | 'canvas';

export default function Home() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbmlInput, setDbmlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [activeTab, setActiveTab] = useState<MobileTab>('prompt');
  const [isMobile, setIsMobile] = useState(false);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const isResizing = useRef(false);
  const isInitialLoad = useRef(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params: any) => {
    const { source, sourceHandle, target, targetHandle } = params;
    if (!source || !sourceHandle || !target || !targetHandle) return;

    // Handle ID format: `${field.name}-source` or `${field.name}-target`
    const sourceField = sourceHandle.split('-')[0];
    const targetField = targetHandle.split('-')[0];

    const newRef = `\n\nRef: ${source}.${sourceField} > ${target}.${targetField}`;
    setDbmlInput(prev => prev.trim() + newRef);
  }, [setDbmlInput]);

  const onTableColorChange = useCallback((tableName: string, color: string) => {
    setDbmlInput(prev => {
      // Look for table definition: Table tableName [settings] {
      // We want to add or replace headercolor in settings
      const tableRegex = new RegExp(`(Table\\s+${tableName}\\s*\\[)(.*?)(\\])`, 'i');
      const tableWithoutSettingsRegex = new RegExp(`(Table\\s+${tableName})(\\s*\\{)`, 'i');

      if (tableRegex.test(prev)) {
        // Replace existing or add to existing settings
        return prev.replace(tableRegex, (match, p1, p2, p3) => {
          if (p2.includes('headercolor:')) {
            return `${p1}${p2.replace(/headercolor:\s*#[a-f0-9]{3,6}/i, `headercolor: ${color}`)}${p3}`;
          } else {
            return `${p1}${p2.trim()}${p2.trim() ? ', ' : ''}headercolor: ${color}${p3}`;
          }
        });
      } else {
        // Add settings block if not exists
        return prev.replace(tableWithoutSettingsRegex, `$1 [headercolor: ${color}]$2`);
      }
    });
  }, [setDbmlInput]);

  // 1. Initial Load & Window Size
  useEffect(() => {
    let saved = storage.getSchemas();
    
    // Fix: If no schemas exist, create the first one immediately
    if (saved.length === 0) {
      const firstSchema: Schema = { 
        id: 'initial', 
        name: 'Untitled Sketch', 
        dbml: '', 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      };
      storage.saveSchema(firstSchema);
      saved = [firstSchema];
    }

    setSchemas(saved);
    const initial = saved[0];
    setCurrentSchema(initial);
    setDbmlInput(initial.dbml);
    setSchemaName(initial.name);
    
    const { nodes: initialNodes, edges: initialEdges } = parseDBML(initial.dbml);
    if (initial.layout) {
      setNodes(initialNodes.map(n => ({
        ...n,
        position: initial.layout![n.id] || n.position
      })));
    } else {
      setNodes(initialNodes);
    }
    setEdges(initialEdges);

    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isInitialLoad.current) setIsSidebarOpen(true);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    setTimeout(() => { isInitialLoad.current = false; }, 100);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [setNodes, setEdges]);

  // 2. Sync Visuals
  useEffect(() => {
    if (isInitialLoad.current) return;
    const { nodes: nextNodes, edges: nextEdges } = parseDBML(dbmlInput, nodes);
    const currentIds = nodes.map(n => n.id).sort().join(',');
    const nextIds = nextNodes.map(n => n.id).sort().join(',');
    if (currentIds !== nextIds || nodes.length === 0) setNodes(nextNodes);
    setEdges(nextEdges);
  }, [dbmlInput]);

  // 3. Autosave
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!currentSchema) return;
    const layout: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => { layout[n.id] = n.position; });
    const hasChanges = dbmlInput !== currentSchema.dbml || 
                       schemaName !== currentSchema.name ||
                       JSON.stringify(layout) !== JSON.stringify(currentSchema.layout || {});
    if (!hasChanges) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSaving(true);
    timerRef.current = setTimeout(() => {
      const updatedSchema: Schema = { ...currentSchema, name: schemaName, dbml: dbmlInput, layout, updatedAt: Date.now() };
      storage.saveSchema(updatedSchema);
      setSchemas(storage.getSchemas());
      setCurrentSchema(updatedSchema);
      setIsSaving(false);
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dbmlInput, schemaName, nodes, currentSchema]);

  // 4. Resize
  const startResizing = useCallback(() => { isResizing.current = true; document.body.style.cursor = 'col-resize'; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; document.body.style.cursor = 'default'; }, []);
  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const sidebarWidth = isSidebarOpen ? 256 : 0;
    const newWidth = e.clientX - sidebarWidth;
    if (newWidth > 300 && newWidth < 800) setLeftPanelWidth(newWidth);
  }, [isSidebarOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stopResizing); };
  }, [resize, stopResizing]);

  const handleNewSchema = () => {
    const name = window.prompt('New Sketch Name', 'Untitled Sketch') || 'New Sketch';
    const newSchema: Schema = { id: Date.now().toString(), name, dbml: '', createdAt: Date.now(), updatedAt: Date.now() };
    storage.saveSchema(newSchema);
    setSchemas(storage.getSchemas());
    setCurrentSchema(newSchema);
    setDbmlInput('');
    setSchemaName(newSchema.name);
    setNodes([]);
    setEdges([]);
    setUserInput('');
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleGenerate = async () => {
    if (!userInput) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify({ prompt: userInput }) });
      const data = await res.json();
      if (res.ok && data.dbml) {
        const cleanDbml = data.dbml.replace(/```dbml|```/g, '').trim();
        setDbmlInput(cleanDbml);
        if (isMobile) setActiveTab('canvas');
      } else {
        setError(data.error || 'AI limit reached.');
      }
    } catch (err) { setError('Connection refused.'); } finally { setIsLoading(false); }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this design?')) {
      storage.deleteSchema(id);
      const updated = storage.getSchemas();
      setSchemas(updated);
      if (currentSchema?.id === id) {
        if (updated.length > 0) {
          const next = updated[0];
          setCurrentSchema(next);
          setDbmlInput(next.dbml);
          setSchemaName(next.name);
        } else {
          setCurrentSchema(null);
          setDbmlInput('');
          setSchemaName('');
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
    a.download = `${schemaName || 'schema'}.dbml`;
    a.click();
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#fdfdfd] text-slate-900 font-handwritten antialiased selection:bg-indigo-100 relative">
      {/* 1. Sidebar */}
      <aside className={`
        fixed md:relative z-50 h-full border-r-2 border-slate-900 bg-[#f8f9fa] transition-all duration-300 flex flex-col overflow-hidden shrink-0
        ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'}
      `}>
        <div className="p-5 border-b-2 border-slate-900 flex justify-between items-center bg-white text-slate-900">
          <div className="flex items-center gap-2">
            <PencilLine size={20} className="text-slate-900" />
            <span className="font-bold text-lg tracking-tight">DBRaw</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-900">
            <X size={20} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-3 space-y-4">
          <button onClick={handleNewSchema} className="w-full py-2 px-4 border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-white rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2">
            <FilePlus size={14} /> New Sketch
          </button>
          <div className="px-2 pt-2">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Saved Sketches</h2>
            <div className="space-y-2">
              {schemas.map((s) => (
                <div key={s.id} 
                  className={`group p-3 rounded-lg border-2 transition-all flex justify-between items-center ${currentSchema?.id === s.id ? 'bg-indigo-50 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                  onClick={() => { setCurrentSchema(s); setDbmlInput(s.dbml); setSchemaName(s.name); if (isMobile) setIsSidebarOpen(false); }}
                >
                  <span className="text-xs font-bold truncate pr-2">{s.name}</span>
                  <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        {/* Top Navbar */}
        <nav className="h-14 border-b-2 border-slate-900 bg-white flex items-center justify-between px-4 z-20 shrink-0 shadow-sm text-slate-900">
          <div className="flex items-center gap-3 flex-grow max-w-xl">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-900 border border-slate-200">
              <Menu size={18} />
            </button>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <input value={schemaName} onChange={(e) => setSchemaName(e.target.value)} placeholder="Untitled Sketch" className="flex-grow text-sm font-bold border-2 border-slate-900 px-3 py-1 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-indigo-50/50 transition-colors text-slate-900 placeholder:text-slate-300 min-w-0" />
            {isSaving && <span className="text-[10px] text-slate-400 animate-pulse shrink-0 hidden sm:block">Saving...</span>}
          </div>
          <div className="flex items-center gap-2 font-sans ml-2">
            <button onClick={handleDownload} className="p-2 md:px-4 md:py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
              <Download size={16} className="md:mr-2 inline" /><span className="hidden md:inline">Export DBML</span>
            </button>
          </div>
        </nav>

        {/* Mobile Tabs */}
        <div className="md:hidden flex border-b-2 border-slate-900 bg-[#f8f9fa] p-1 font-sans">
          {(['prompt', 'code', 'canvas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-grow py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              {tab === 'prompt' && <Sparkles size={12} />}
              {tab === 'code' && <Code size={12} />}
              {tab === 'canvas' && <Eye size={12} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Editor & Canvas Container */}
        <div className="flex-grow flex overflow-hidden bg-white relative">
          
          {/* Editor/Prompt Pane */}
          <div 
            style={{ width: !isMobile ? `${leftPanelWidth}px` : '100%' }} 
            className={`
              ${activeTab === 'canvas' ? 'hidden md:flex' : 'flex'}
              border-r-2 border-slate-900 flex-col bg-[#fcfcfc] z-10 shrink-0 relative
              ${activeTab !== 'canvas' ? 'absolute inset-0 md:relative' : ''}
            `}
          >
            <div className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
              {/* AI Prompt */}
              <div className={`${activeTab === 'code' ? 'hidden md:block' : 'block'} relative shrink-0`}>
                <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Ask AI to design..." className="w-full h-24 md:h-32 p-4 text-sm bg-white border-2 border-slate-900 rounded-xl focus:ring-0 outline-none placeholder:text-slate-300 resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] text-slate-900" />
                <button onClick={handleGenerate} disabled={isLoading || !userInput} className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all disabled:opacity-30 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {isLoading ? <Loader2 className="animate-spin text-white" size={16} /> : <Sparkles className="text-white" size={16} />}
                </button>
              </div>

              {/* Code Editor */}
              <div className={`${activeTab === 'prompt' ? 'hidden md:flex' : 'flex'} flex-grow flex flex-col min-h-0 text-slate-900`}>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                  <Code size={12} /><span>DBML Blueprint</span>
                </div>
                <div className="flex-grow bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] text-slate-900 flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                    <Editor value={dbmlInput} onValueChange={code => setDbmlInput(code)} highlight={code => dbmlHighlight(code)} padding={20} style={{ fontFamily: '"Geist Mono", monospace', fontSize: 13, outline: 'none', color: '#1e293b', minHeight: '100%' }} className="dbml-editor text-slate-900 pb-20" />
                  </div>
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 border-2 border-red-900 rounded-xl flex items-center gap-2 text-red-900 text-[11px] shrink-0"><AlertCircle size={14} /><span>{error}</span></div>}
            </div>
            {/* Desktop Resize Handle */}
            <div onMouseDown={startResizing} className="hidden md:flex absolute top-0 -right-1.5 w-3 h-full cursor-col-resize hover:bg-indigo-500/10 active:bg-indigo-500/20 transition-colors z-30 items-center justify-center group">
              <div className="w-0.5 h-12 bg-slate-200 group-hover:bg-indigo-400 rounded-full transition-colors" />
            </div>
          </div>

          {/* Canvas Pane */}
          <div className={`flex-grow relative overflow-hidden bg-[#fdfdfd] ${activeTab !== 'canvas' ? 'hidden md:block' : 'block'}`}>
            <VisualCanvas 
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange} 
              onEdgesChange={onEdgesChange} 
              onConnect={onConnect} 
              onTableColorChange={onTableColorChange}
            />
            {!dbmlInput && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-900">
                <div className="flex flex-col items-center gap-4 text-slate-300">
                  <Database size={60} className="opacity-10 text-slate-900" />
                  <p className="text-sm font-bold tracking-widest opacity-20 uppercase">Empty Canvas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
