'use client';

import React, { useMemo } from 'react';
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
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background color="#1e293b" variant={BackgroundVariant.Dots} gap={20} />
        <Controls className="!bg-slate-800 !border-slate-700 !fill-slate-300 shadow-xl" />
      </ReactFlow>
    </div>
  );
};
