'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VisualCanvas } from '@/components/editor/VisualCanvas';
import { storage, Schema } from '@/lib/storage';
import { parseDBML } from '@/lib/dbml-parser';
import { useNodesState, useEdgesState, Node, Edge, ReactFlowProvider, useReactFlow, updateEdge, Connection } from 'reactflow';
import Editor from 'react-simple-code-editor';
import { toPng } from 'html-to-image';
import dagre from 'dagre';
// @ts-ignore
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-sql';

import { 
  Loader2, Database, Trash2, 
  Code, Sparkles, AlertCircle, PanelLeftClose, PanelLeftOpen, PencilLine, FilePlus, Download,
  Menu, X, Eye, Image as ImageIcon, Wand2, Terminal
} from 'lucide-react';

const dbmlHighlight = (code: string) => {
  return highlight(code, {
    ...languages.sql,
    'keyword': /\b(Table|Ref|Enum|indexes|Project|Note|as|pk|unique|not null|increment|headercolor)\b/i,
    'string': /(['"])(?:(?!\1)[^\\\r\n]|\\.)*\1/,
    'comment': /\/\/.*|(?:\/\*[\s\S]*?\*\/)/,
    'class-name': /\b[A-Z_][a-z0-9_]*\b/,
  }, 'dbml');
};

type MobileTab = 'prompt' | 'code' | 'canvas';

interface EdgeHandleMetadata {
  sh?: string | null;
  th?: string | null;
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <HomeContent />
    </ReactFlowProvider>
  );
}

function HomeContent() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbmlInput, setDbmlInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
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
  const { getNodes, fitView } = useReactFlow();

  const handleAutoLayout = useCallback((currentNodes?: Node[], currentEdges?: Edge[]) => {
    const nodesToLayout = currentNodes || nodes;
    const edgesToLayout = currentEdges || edges;
    if (nodesToLayout.length === 0) return;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 200 });
    g.setDefaultEdgeLabel(() => ({}));
    nodesToLayout.forEach((node) => { g.setNode(node.id, { width: 250, height: node.data.fields.length * 30 + 80 }); });
    edgesToLayout.forEach((edge) => { g.setEdge(edge.source, edge.target); });
    dagre.layout(g);
    const layoutedNodes = nodesToLayout.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return { ...node, position: { x: nodeWithPosition.x - 125, y: nodeWithPosition.y - 40 } };
    });
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [nodes, edges, setNodes, fitView]);

  const onConnect = useCallback((params: any) => {
    const { source, sourceHandle, target, targetHandle } = params;
    if (!source || !sourceHandle || !target || !targetHandle) return;
    const sourceField = sourceHandle.split('-')[0];
    const targetField = targetHandle.split('-')[0];
    const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingRefRegex = new RegExp(`Ref:\\s*${escapedSource}\\.${sourceField}\\s*(>|<|-)\\s*${escapedTarget}\\.${targetField}`, 'i');
    setDbmlInput(prev => {
      if (existingRefRegex.test(prev)) return prev;
      return prev.trim() + `\n\nRef: ${source}.${sourceField} > ${target}.${targetField}`;
    });
  }, [setDbmlInput]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    const { source, sourceHandle, target, targetHandle } = newConnection;
    const oldSourceField = oldEdge.sourceHandle?.split('-')[0];
    const oldTargetField = oldEdge.targetHandle?.split('-')[0];
    const newSourceField = sourceHandle?.split('-')[0];
    const newTargetField = targetHandle?.split('-')[0];
    const isSameEdge = source === oldEdge.source && target === oldEdge.target && newSourceField === oldSourceField && newTargetField === oldTargetField;
    if (isSameEdge) {
      setEdges((els) => updateEdge(oldEdge, newConnection, els));
    }
  }, [setEdges]);

  const onTableColorChange = useCallback((tableName: string, color: string) => {
    setDbmlInput(prev => {
      const tableRegex = new RegExp(`(Table\\s+${tableName}\\s*\\[)(.*?)(\\])`, 'i');
      const tableWithoutSettingsRegex = new RegExp(`(Table\\s+${tableName})(\\s*\\{)`, 'i');
      if (tableRegex.test(prev)) {
        return prev.replace(tableRegex, (match, p1, p2, p3) => {
          if (p2.includes('headercolor:')) {
            return `${p1}${p2.replace(/headercolor:\s*#[a-f0-9]{3,6}/i, `headercolor: ${color}`)}${p3}`;
          } else {
            return `${p1}${p2.trim()}${p2.trim() ? ', ' : ''}headercolor: ${color}${p3}`;
          }
        });
      } else {
        return prev.replace(tableWithoutSettingsRegex, `$1 [headercolor: ${color}]$2`);
      }
    });
  }, [setDbmlInput]);

  // Initial Data Loading
  useEffect(() => {
    let saved = storage.getSchemas();
    if (saved.length === 0 && storage.isFirstRun()) {
      const demoSchema = storage.initDefault();
      saved = [demoSchema];
      const { nodes: dNodes, edges: dEdges } = parseDBML(demoSchema.dbml);
      setTimeout(() => handleAutoLayout(dNodes, dEdges), 500);
    }
    setSchemas(saved);
    const lastId = storage.getLastSchemaId();
    const lastSchema = saved.find(s => s.id === lastId);
    if (lastSchema) { setCurrentSchema(lastSchema); } else if (saved.length > 0) { setCurrentSchema(saved[0]); }
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isInitialLoad.current) setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    setTimeout(() => { isInitialLoad.current = false; }, 100);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle Switching between Schemas
  useEffect(() => {
    if (!currentSchema) return;
    storage.setLastSchemaId(currentSchema.id);
    setDbmlInput(currentSchema.dbml);
    setSchemaName(currentSchema.name);
    const { nodes: parsedNodes, edges: parsedEdges, error: parseErr } = parseDBML(currentSchema.dbml);
    setValidationError(parseErr);
    
    const layout = currentSchema.layout || {};
    const layoutNodes = parsedNodes.map(n => ({ ...n, position: layout[n.id] || n.position }));
    setNodes(layoutNodes);
    
    const savedHandles = (layout.edgeHandles || {}) as Record<string, EdgeHandleMetadata>;
    const edgesWithHandles = parsedEdges.map(e => {
      const metadata = savedHandles[e.id];
      if (metadata) { 
        return { 
          ...e, 
          sourceHandle: metadata.sh || e.sourceHandle, 
          targetHandle: metadata.th || e.targetHandle 
        }; 
      }
      return e;
    });
    setEdges(edgesWithHandles);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [currentSchema?.id]);

  // Handle live updates
  useEffect(() => {
    if (isInitialLoad.current || !currentSchema) return;
    const { nodes: nextNodes, edges: nextEdges, error: parseErr } = parseDBML(dbmlInput, nodes);
    setValidationError(parseErr);
    if (!parseErr) {
      if (JSON.stringify(nodes.map(n => ({ id: n.id, data: n.data }))) !== JSON.stringify(nextNodes.map(n => ({ id: n.id, data: n.data })))) { setNodes(nextNodes); }
      
      const currentHandleState = (currentSchema.layout?.edgeHandles || {}) as Record<string, EdgeHandleMetadata>;
      const nextEdgesWithHandles = nextEdges.map(e => {
        const existing = edges.find(old => old.id === e.id) || { sourceHandle: currentHandleState[e.id]?.sh, targetHandle: currentHandleState[e.id]?.th };
        if (existing.sourceHandle) { return { ...e, sourceHandle: existing.sourceHandle, targetHandle: existing.targetHandle }; }
        return e;
      });

      const currentEdgesJson = JSON.stringify(edges.map(e => ({ id: e.id, sh: e.sourceHandle, th: e.targetHandle })));
      const nextEdgesJson = JSON.stringify(nextEdgesWithHandles.map(e => ({ id: e.id, sh: e.sourceHandle, th: e.targetHandle })));
      if (currentEdgesJson !== nextEdgesJson) {
        setEdges(nextEdgesWithHandles);
      }
    }
  }, [dbmlInput]);

  // Autosave
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!currentSchema) return;
    const layout: any = {};
    nodes.forEach(n => { layout[n.id] = n.position; });
    layout.edgeHandles = {};
    edges.forEach(e => { layout.edgeHandles[e.id] = { sh: e.sourceHandle, th: e.targetHandle }; });

    const hasChanges = dbmlInput !== currentSchema.dbml || schemaName !== currentSchema.name || JSON.stringify(layout) !== JSON.stringify(currentSchema.layout || {});
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
  }, [dbmlInput, schemaName, nodes, edges]);

  // Restored Panel Resize Logic
  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const sidebarWidth = isSidebarOpen ? 256 : 0;
    const newWidth = e.clientX - sidebarWidth;
    if (newWidth > 300 && newWidth < 800) setLeftPanelWidth(newWidth);
  }, [isSidebarOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleNewSchema = () => {
    const name = window.prompt('New Sketch Name', 'Untitled Sketch') || 'New Sketch';
    const newSchema: Schema = { id: Date.now().toString(), name, dbml: '', createdAt: Date.now(), updatedAt: Date.now() };
    storage.saveSchema(newSchema);
    const updated = storage.getSchemas();
    setSchemas(updated);
    setCurrentSchema(newSchema);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleGenerate = async () => {
    if (!userInput) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify({ prompt: userInput, currentDbml: dbmlInput }) });
      const data = await res.json();
      if (res.ok && data.dbml) {
        setDbmlInput(data.dbml.replace(/```dbml|```/g, '').trim());
        setUserInput('');
        if (isMobile) setActiveTab('canvas');
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this design?')) {
      storage.deleteSchema(id);
      const updated = storage.getSchemas();
      setSchemas(updated);
      if (currentSchema?.id === id) { setCurrentSchema(updated.length > 0 ? updated[0] : null); }
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

  const handleExportImage = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    try {
      setIsLoading(true);
      await fitView({ padding: 0.2 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await toPng(element, {
        backgroundColor: '#fdfdfd',
        filter: (node: HTMLElement) => !['react-flow__controls', 'react-flow__attribution'].some((cls) => node.classList?.contains(cls)),
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.setAttribute('download', `${schemaName || 'schema'}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    } catch (err) {} finally { setIsLoading(false); }
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#fdfdfd] text-slate-900 font-handwritten antialiased selection:bg-indigo-100 relative">
      <aside className={`fixed md:relative z-50 h-full border-r-2 border-slate-900 bg-[#f8f9fa] transition-all duration-300 flex flex-col overflow-hidden shrink-0 ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'}`}>
        <div className="p-5 border-b-2 border-slate-900 flex justify-between items-center bg-white text-slate-900">
          <div className="flex items-center gap-2"><PencilLine size={20} className="text-slate-900" /><span className="font-bold text-lg tracking-tight">DBRaw</span></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-900"><X size={20} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-3 space-y-4">
          <button onClick={handleNewSchema} className="w-full py-2 px-4 border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-white rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2"><FilePlus size={14} /> New Sketch</button>
          <div className="px-2 pt-2">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Saved Sketches</h2>
            <div className="space-y-2">
              {schemas.map((s) => (
                <div key={s.id} className={`group p-3 rounded-lg border-2 transition-all flex justify-between items-center cursor-pointer ${currentSchema?.id === s.id ? 'bg-indigo-50 border-slate-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-white border-slate-200 hover:border-slate-400'}`} onClick={() => { setCurrentSchema(s); if (isMobile) setIsSidebarOpen(false); }}>
                  <span className="text-xs font-bold truncate pr-2">{s.name}</span>
                  <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-grow flex flex-col min-w-0 h-full">
        <nav className="h-14 border-b-2 border-slate-900 bg-white flex items-center justify-between px-4 z-20 shrink-0 shadow-sm text-slate-900">
          <div className="flex items-center gap-3 flex-grow max-w-xl">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-900 border border-slate-200"><Menu size={18} /></button>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <input value={schemaName} onChange={(e) => setSchemaName(e.target.value)} placeholder="Untitled Sketch" className="flex-grow text-sm font-bold border-2 border-slate-900 px-3 py-1 bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] outline-none focus:bg-indigo-50/50 transition-colors text-slate-900 placeholder:text-slate-300 min-w-0" />
            {isSaving && <span className="text-[10px] text-slate-400 animate-pulse shrink-0 hidden sm:block">Saving...</span>}
          </div>
          <div className="flex items-center gap-2 font-sans ml-2 shrink-0">
            <button onClick={() => handleAutoLayout()} title="Auto-layout schema" className="p-2 md:px-3 md:py-1.5 bg-indigo-50 border-2 border-slate-900 hover:bg-indigo-100 text-slate-900 text-xs font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"><Wand2 size={16} className="md:mr-2 inline" /><span className="hidden md:inline">Magic</span></button>
            <button onClick={handleExportImage} title="Export to PNG" className="p-2 md:px-3 md:py-1.5 bg-white border-2 border-slate-900 hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"><ImageIcon size={16} className="md:mr-2 inline" /><span className="hidden md:inline">PNG</span></button>
            <button onClick={handleDownload} title="Export DBML" className="p-2 md:px-4 md:py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"><Download size={16} className="md:mr-2 inline" /><span className="hidden md:inline">DBML</span></button>
          </div>
        </nav>
        <div className="md:hidden flex border-b-2 border-slate-900 bg-[#f8f9fa] p-1 font-sans">
          {(['prompt', 'code', 'canvas'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-grow py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}>
              {tab === 'prompt' && <Sparkles size={12} />}
              {tab === 'code' && <Code size={12} />}
              {tab === 'canvas' && <Eye size={12} />}
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-grow flex overflow-hidden bg-white relative">
          <div style={{ width: !isMobile ? `${leftPanelWidth}px` : '100%' }} className={`${activeTab === 'canvas' ? 'hidden md:flex' : 'flex'} border-r-2 border-slate-900 flex-col bg-[#fcfcfc] z-10 shrink-0 relative ${activeTab !== 'canvas' ? 'absolute inset-0 md:relative' : ''}`}>
            <div className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
              <div className={`${activeTab === 'prompt' ? 'hidden md:flex' : 'flex'} flex-grow flex flex-col min-h-0 text-slate-900 relative`}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Code size={12} /><span>DBML Blueprint</span></div>
                  {validationError && <div className="flex items-center gap-1.5 text-red-600 animate-pulse"><AlertCircle size={12} /><span className="text-[10px] font-bold uppercase tracking-tight">Syntax Error</span></div>}
                </div>
                <div className={`flex-grow bg-white border-2 rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,0.05)] text-slate-900 flex flex-col relative overflow-hidden transition-colors duration-300 ${validationError ? 'border-red-500 ring-2 ring-red-50' : 'border-slate-900'}`}>
                  <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                    <Editor value={dbmlInput} onValueChange={code => setDbmlInput(code)} highlight={code => dbmlHighlight(code)} padding={20} style={{ fontFamily: '"Geist Mono", monospace', fontSize: 13, outline: 'none', color: '#1e293b', minHeight: '100%' }} className="dbml-editor text-slate-900 pb-20" />
                  </div>
                  {validationError && <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-[11px] font-sans flex items-start gap-2 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]"><Terminal size={14} className="shrink-0 mt-0.5" /><span className="leading-tight">{validationError}</span></div>}
                </div>
              </div>
              <div className={`${activeTab === 'code' ? 'hidden md:block' : 'block'} relative shrink-0`}>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1"><Sparkles size={12} /><span>AI Architect</span></div>
                <div className="relative">
                  <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Explain changes (e.g. 'add a status field to users')..." className="w-full h-24 md:h-28 p-4 text-sm bg-white border-2 border-slate-900 rounded-xl focus:ring-0 outline-none placeholder:text-slate-300 resize-none shadow-[4px_4px_0_0_rgba(0,0,0,0.05)] text-slate-900" />
                  <button onClick={handleGenerate} disabled={isLoading || !userInput} className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-30 shadow-[2px_2px_0_0_rgba(0,0,0,1)] border border-slate-900">{isLoading ? <Loader2 className="animate-spin text-white" size={16} /> : <Sparkles className="text-white" size={16} />}</button>
                </div>
              </div>
            </div>
            <div onMouseDown={() => { isResizing.current = true; document.body.style.cursor = 'col-resize'; }} className="hidden md:flex absolute top-0 -right-1.5 w-3 h-full cursor-col-resize hover:bg-indigo-500/10 active:bg-indigo-500/20 transition-colors z-30 items-center justify-center group"><div className="w-0.5 h-12 bg-slate-200 group-hover:bg-indigo-400 rounded-full transition-colors" /></div>
          </div>
          <div className={`flex-grow relative overflow-hidden bg-[#fdfdfd] ${activeTab !== 'canvas' ? 'hidden md:block' : 'block'}`}>
            <VisualCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onEdgeUpdate={onEdgeUpdate} onTableColorChange={onTableColorChange} />
            {!dbmlInput && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-900"><div className="flex flex-col items-center gap-4 text-slate-300"><Database size={60} className="opacity-10 text-slate-900" /><p className="text-sm font-bold tracking-widest opacity-20 uppercase">Empty Canvas</p></div></div>}
          </div>
        </div>
      </div>
    </main>
  );
}
