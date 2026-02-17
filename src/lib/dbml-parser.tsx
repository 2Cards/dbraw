import { Parser } from '@dbml/core';
import { Node, Edge, MarkerType } from 'reactflow';

export interface ParseResult {
  nodes: Node[];
  edges: Edge[];
  error: string | null;
}

export const parseDBML = (dbml: string, existingNodes: Node[] = []): ParseResult => {
  if (!dbml || typeof dbml !== 'string') return { nodes: [], edges: [], error: null };
  
  try {
    const database = Parser.parse(dbml, 'dbml');
    if (!database || !database.schemas || database.schemas.length === 0) {
      return { nodes: [], edges: [], error: null };
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
          color: table.headerColor || table.settings?.headercolor || table.settings?.headerColor,
          fields: table.fields.map((f: any) => ({
            name: f.name,
            type: f.type.type_name,
            pk: f.pk,
            unique: f.unique,
            notNull: f.not_null,
            dbdefault: f.dbdefault,
          })),
          indexes: table.indexes?.map((idx: any) => ({
            columns: idx.columns.map((c: any) => c.value),
            unique: idx.unique,
            name: idx.name
          }))
        },
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

      const relSource = sourceEndpoint.relation === '1' ? '1' : 'N';
      const relTarget = targetEndpoint.relation === '1' ? '1' : 'N';
      const label = `${relSource}:${relTarget}`;

      // Handle sides (default to left/right logic if not specified in comments/meta)
      // For now we use -right for source and -left for target as default visual standard
      return {
        id: `ref-${index}`,
        source: sourceEndpoint.tableName,
        sourceHandle: `${sourceFieldName}-right`,
        target: targetEndpoint.tableName,
        targetHandle: `${targetFieldName}-left`,
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

    return { nodes, edges, error: null };
  } catch (error: any) {
    console.error('Parsing error:', error);
    const message = error.message || 'Syntax error in DBML code';
    return { nodes: [], edges: [], error: message };
  }
};
