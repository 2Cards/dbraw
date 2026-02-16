import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TableNode = memo(({ data, onColorChange }: any) => {
  const headerColor = data.color || '#f8f9fa';
  
  const colors = [
    '#f8f9fa', // Default
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#34495e', // Dark
    '#95a5a6', // Grey
    '#f1c40f', // Yellow
  ];

  return (
    <div className="min-w-[200px] bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-handwritten rounded-[2px_3px_2px_4px] transform transition-transform group/node">
      {/* Header */}
      <div 
        className="px-4 py-2 border-b-2 border-slate-900 rounded-t-[2px_3px_0px_0px] relative"
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
              className="w-4 h-4 rounded-full border border-slate-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => onColorChange?.(data.name, c)}
            />
          ))}
        </div>
      </div>
      
      {/* Fields */}
      <div className="py-2 bg-white rounded-b-[0px_0px_2px_4px]">
        {data.fields.map((field: any) => (
          <div key={field.name} className="px-4 py-1.5 flex justify-between items-center relative group hover:bg-slate-50 transition-colors">
            {/* Target handle (incoming) on the left */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${field.name}-target`}
              className="!w-2.5 !h-2.5 !bg-slate-900 !border-white !-left-1.5"
            />
            
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`text-sm ${field.pk ? 'text-indigo-600 font-bold' : 'text-slate-800'}`}>
                {field.name}{field.pk && ' (*)'}
              </span>
            </div>
            
            <span className="text-[10px] text-slate-400 lowercase ml-4 shrink-0 font-sans">
              {field.type}
            </span>

            {/* Source handle (outgoing) on the right */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${field.name}-source`}
              className="!w-2.5 !h-2.5 !bg-slate-900 !border-white !-right-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
