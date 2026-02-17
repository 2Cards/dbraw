import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TableNode = memo(({ data, onColorChange }: any) => {
  const headerColor = data.color || '#f8f9fa';
  
  const colors = [
    '#f8f9fa', '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#34495e', '#95a5a6', '#f1c40f',
  ];

  return (
    <div className="min-w-[200px] bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-handwritten rounded-[2px_3px_2px_4px] transform transition-transform group/node">
      {/* Header */}
      <div 
        className="px-4 py-2 border-b-2 border-slate-900 rounded-t-[2px_3px_0px_0px] relative transition-colors duration-200 ease-in-out"
        style={{ backgroundColor: headerColor }}
      >
        <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
          {data.name}
        </h3>
        
        {/* Color Palette on Hover */}
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
      <div className="py-2 bg-white rounded-b-[0px_0px_2px_4px]">
        {data.fields.map((field: any) => (
          <div key={field.name} className="px-4 py-1.5 flex justify-between items-center relative group hover:bg-slate-50 transition-colors">
            {/* Left Multi-purpose Handle */}
            <Handle
              type="source"
              position={Position.Left}
              id={`${field.name}-left`}
              className="!w-2.5 !h-2.5 !bg-slate-900 !border-white !-left-1.5 hover:!scale-150 transition-transform"
            />
            
            <div className="flex items-center gap-2 overflow-hidden mr-4">
              <span className={`text-sm ${field.pk ? 'text-indigo-600 font-bold' : 'text-slate-800'}`}>
                {field.name}
                {field.pk && ' (pk)'}
                {field.unique && ' (u)'}
                {field.notNull && ' *'}
              </span>
            </div>
            
            <span className="text-[10px] text-slate-400 lowercase ml-4 shrink-0 font-sans">
              {field.type}
            </span>

            {/* Right Multi-purpose Handle */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${field.name}-right`}
              className="!w-2.5 !h-2.5 !bg-slate-900 !border-white !-right-1.5 hover:!scale-150 transition-transform"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
