import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TableNode = memo(({ data, onColorChange }: any) => {
  const headerColor = data.color || '#f8f9fa';
  
  const colors = [
    '#f8f9fa', '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#34495e', '#95a5a6', '#f1c40f',
  ];

  return (
    <div className="min-w-[240px] bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-handwritten rounded-[2px_3px_2px_4px] transform transition-transform group/node overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-2 border-b-2 border-slate-900 relative transition-colors duration-200 ease-in-out"
        style={{ backgroundColor: headerColor }}
      >
        <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
          {data.name}
        </h3>
        
        <div className="absolute -top-10 left-0 hidden group-hover/node:flex gap-1 p-2 bg-white border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-50">
          {colors.map(c => (
            <button 
              key={c}
              className="w-4 h-4 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: c }}
              onClick={(e) => { e.stopPropagation(); onColorChange?.(data.name, c); }}
            />
          ))}
        </div>
      </div>
      
      {/* Fields */}
      <div className="py-1 bg-white">
        {data.fields.map((field: any) => (
          <div key={field.name} className="px-4 py-1 flex justify-between items-center relative group hover:bg-slate-50 transition-colors">
            <Handle
              type="target"
              position={Position.Left}
              id={`${field.name}-target`}
              className="!w-2 !h-2 !bg-slate-900 !border-white !-left-1"
            />
            
            <div className="flex items-center gap-2 overflow-hidden mr-4">
              <span className={`text-sm ${field.pk ? 'text-indigo-600 font-bold underline' : 'text-slate-800'} ${field.unique ? 'italic' : ''}`}>
                {field.name}
                {field.pk && ' 🔑'}
                {field.notNull && ' *'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 font-sans">
              <span className="text-[10px] text-slate-400 lowercase">
                {field.type}
              </span>
              {field.unique && <span className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 text-slate-500 font-bold uppercase">U</span>}
            </div>

            <Handle
              type="source"
              position={Position.Right}
              id={`${field.name}-source`}
              className="!w-2 !h-2 !bg-slate-900 !border-white !-right-1"
            />
          </div>
        ))}
      </div>

      {/* Constraints Footer (Optional representation) */}
      {(data.indexes && data.indexes.length > 0) && (
        <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50/50 text-[9px] text-slate-400 font-sans flex flex-wrap gap-1">
          {data.indexes.map((idx: any, i: number) => (
            <span key={i} className="bg-white px-1 rounded border border-slate-200">
              ⚡ {idx.unique ? 'UNIQ' : 'IDX'}: {idx.columns.join(', ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

TableNode.displayName = 'TableNode';
