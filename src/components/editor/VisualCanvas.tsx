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
  OnEdgesChange,
  OnConnect,
  OnEdgeUpdate
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './TableNode';

interface VisualCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect?: OnConnect;
  onEdgeUpdate?: OnEdgeUpdate;
  onTableColorChange?: (tableName: string, color: string) => void;
}

export const VisualCanvas = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect,
  onEdgeUpdate,
  onTableColorChange 
}: VisualCanvasProps) => {
  const nodeTypes = React.useMemo(() => ({
    dbTable: (props: any) => <TableNode {...props} onColorChange={onTableColorChange} />,
  }), [onTableColorChange]);

  return (
    <div className="w-full h-full bg-[#fdfdfd]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.05}
        maxZoom={2}
      >
        <Background color="#cbd5e1" variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls className="!bg-white !border-2 !border-slate-900 !rounded-lg !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </ReactFlow>
    </div>
  );
};
