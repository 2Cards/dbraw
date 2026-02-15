'use client';

import React from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  ConnectionMode,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './TableNode';

const nodeTypes = {
  dbTable: TableNode,
};

interface VisualCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export const VisualCanvas = ({ nodes, edges }: VisualCanvasProps) => {
  return (
    <div className="w-full h-full bg-[#fdfdfd]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: '#1e293b', strokeWidth: 2 },
          animated: false,
        }}
      >
        <Background color="#e2e8f0" variant={BackgroundVariant.Lines} gap={25} size={1} />
        <Controls className="!bg-white !border-2 !border-slate-900 !rounded-lg !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </ReactFlow>
    </div>
  );
};
