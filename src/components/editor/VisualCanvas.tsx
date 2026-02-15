'use client';

import React from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  ConnectionMode,
  BackgroundVariant,
  OnNodesChange,
  OnEdgesChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './TableNode';

const nodeTypes = {
  dbTable: TableNode,
};

interface VisualCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export const VisualCanvas = ({ nodes, edges, onNodesChange, onEdgesChange }: VisualCanvasProps) => {
  return (
    <div className="w-full h-full bg-[#fdfdfd]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#1e293b', strokeWidth: 2.5 },
        }}
      >
        <Background color="#cbd5e1" variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls className="!bg-white !border-2 !border-slate-900 !rounded-lg !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </ReactFlow>
    </div>
  );
};
