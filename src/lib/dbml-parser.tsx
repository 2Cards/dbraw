import { Parser } from '@dbml/core';

export const parseDBML = (dbml: string) => {
  if (!dbml || typeof dbml !== 'string') return { nodes: [], edges: [] };
  
  try {
    const database = Parser.parse(dbml, 'dbml');
    if (!database || !database.schemas || database.schemas.length === 0) {
      return { nodes: [], edges: [] };
    }

    const schema = database.schemas[0];
    const tables = schema.tables || [];
    const refs = schema.refs || [];

    const nodes = tables.map((table: any, index: number) => {
      return {
        id: table.name,
        type: 'dbTable',
        data: { 
          name: table.name,
          fields: table.fields.map((f: any) => ({
            name: f.name,
            type: f.type.type_name,
            pk: f.pk,
          }))
        },
        // Simple grid layout logic
        position: { x: (index % 4) * 300, y: Math.floor(index / 4) * 350 },
      };
    });

    const edges = refs.map((ref: any, index: number) => {
      const endpoint = ref.endpoints[0];
      const otherEndpoint = ref.endpoints[1];
      
      return {
        id: `e${index}`,
        source: otherEndpoint.tableName,
        sourceHandle: otherEndpoint.fieldNames[0],
        target: endpoint.tableName,
        targetHandle: endpoint.fieldNames[0],
        label: ref.name || '',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 },
        labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 10, fontFamily: 'var(--font-handwritten)' },
      };
    });

    return { nodes, edges };
  } catch (error) {
    // console.error('DBML Parse Error:', error);
    return { nodes: [], edges: [] };
  }
};
