import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TableNode = memo(({ data }: any) => {
  return (
    <div className="min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden font-sans">
      <div className="bg-slate-800 px-4 py-2.5 border-b border-slate-700">
        <h3 className="text-sm font-bold text-blue-400 tracking-wide truncate">
          {data.name}
        </h3>
      </div>
      <div className="bg-slate-900/50 py-2 relative">
        {data.fields.map((field: any) => (
          <div key={field.name} className="px-4 py-1.5 flex justify-between items-center relative group hover:bg-slate-800/50 transition-colors">
            {/* Left Handle for incoming refs */}
            <Handle
              type="target"
              position={Position.Left}
              id={field.name}
              className="!w-2 !h-2 !bg-blue-500 !border-slate-900 !-left-1 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            
            <div className="flex items-center gap-2 overflow-hidden mr-4">
              <span className={`text-[11px] font-mono truncate ${field.pk ? 'text-yellow-500 font-bold' : 'text-slate-300'}`}>
                {field.name}{field.pk && ' 🔑'}
              </span>
            </div>
            
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter shrink-0 font-mono">
              {field.type}
            </span>

            {/* Right Handle for outgoing refs */}
            <Handle
              type="source"
              position={Position.Right}
              id={field.name}
              className="!w-2 !h-2 !bg-blue-500 !border-slate-900 !-right-1 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
