import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TableNode = memo(({ data }: any) => {
  return (
    <div className="min-w-[200px] bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-handwritten rounded-[2px_3px_2px_4px] transform hover:-translate-y-0.5 transition-transform">
      {/* Header */}
      <div className="px-4 py-2 border-b-2 border-slate-900 bg-slate-50 rounded-t-[2px_3px_0px_0px]">
        <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
          {data.name}
        </h3>
      </div>
      
      {/* Fields */}
      <div className="py-2 bg-white rounded-b-[0px_0px_2px_4px]">
        {data.fields.map((field: any) => (
          <div key={field.name} className="px-4 py-1 flex justify-between items-center relative group">
            <Handle
              type="target"
              position={Position.Left}
              id={field.name}
              className="!w-2 !h-2 !bg-slate-900 !border-white !-left-1.5"
            />
            
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`text-sm ${field.pk ? 'text-indigo-600 font-bold' : 'text-slate-800'}`}>
                {field.name}{field.pk && ' (*)'}
              </span>
            </div>
            
            <span className="text-[10px] text-slate-400 lowercase ml-4 shrink-0">
              {field.type}
            </span>

            <Handle
              type="source"
              position={Position.Right}
              id={field.name}
              className="!w-2 !h-2 !bg-slate-900 !border-white !-right-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
