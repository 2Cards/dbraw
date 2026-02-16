import { Parser } from '@dbml/core';
import { Node, Edge, MarkerType } from 'reactflow';

export const parseDBML = (dbml: string, existingNodes: Node[] = []) => {
  if (!dbml || typeof dbml !== 'string') return { nodes: [], edges: [] };
  
  try {
    const database = Parser.parse(dbml, 'dbml');
    if (!database || !database.schemas || database.schemas.length === 0) {
      return { nodes: [], edges: [] };
    }

    const schema = database.schemas[0];
    const tables = schema.tables || [];
    const refs = schema.refs || [];

    const nodes: Node[] = tables.map((table: any, index: number) => {
      const existingNode = existingNodes.find(n => n.id === table.name);
      
      return {
        id: table.name,
        type: 'dbTable',
        data: { 
          name: table.name,
          color: table.headerColor,
          fields: table.fields.map((f: any) => ({
            name: f.name,
            type: f.type.type_name,
            pk: f.pk,
          }))
        },
        // Use existing position or generate grid
        position: existingNode?.position || { 
          x: (index % 3) * 350, 
          y: Math.floor(index / 3) * (table.fields.length * 30 + 100) 
        },
      };
    });

    const edges: Edge[] = refs.map((ref: any, index: number) => {
      const targetEndpoint = ref.endpoints[0];
      const sourceEndpoint = ref.endpoints[1];
      
      const sourceFieldName = sourceEndpoint.fieldNames[0];
      const targetFieldName = targetEndpoint.fieldNames[0];

      // Cardinality detection
      // 1:1 (-), 1:N (>), N:1 (<), N:M (<>)
      // ref.endpoints[i].relation is '1' or '*'
      const relSource = sourceEndpoint.relation === '1' ? '1' : 'N';
      const relTarget = targetEndpoint.relation === '1' ? '1' : 'N';
      const label = `${relSource}:${relTarget}`;

      return {
        id: `ref-${index}`,
        source: sourceEndpoint.tableName,
        sourceHandle: `${sourceFieldName}-source`,
        target: targetEndpoint.tableName,
        targetHandle: `${targetFieldName}-target`,
        type: 'smoothstep',
        label: label,
        labelStyle: { fill: '#1e293b', fontWeight: 800, fontSize: 10, fontFamily: 'inherit' },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#f8f9fa', fillOpacity: 1, stroke: '#1e293b', strokeWidth: 1 },
        style: { stroke: '#1e293b', strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#1e293b',
        },
      };
    });

    return { nodes, edges };
  } catch (error) {
    return { nodes: [], edges: [] };
  }
};
