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
        // Grid-like layout
        position: { x: (index % 3) * 350, y: Math.floor(index / 3) * 400 },
      };
    });

    const edges = refs.map((ref: any, index: number) => {
      // ref.endpoints usually has 2 elements: [source, target]
      const targetSide = ref.endpoints[0];
      const sourceSide = ref.endpoints[1];
      
      return {
        id: `ref-${index}`,
        source: sourceSide.tableName,
        sourceHandle: sourceSide.fieldNames[0], // Direct link to field ID
        target: targetSide.tableName,
        targetHandle: targetSide.fieldNames[0], // Direct link to field ID
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 3 },
      };
    });

    return { nodes, edges };
  } catch (error) {
    return { nodes: [], edges: [] };
  }
};
