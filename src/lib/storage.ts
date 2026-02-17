export interface Schema {
  id: string;
  name: string;
  dbml: string;
  layout?: Record<string, { x: number; y: number }>;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'schemaforge_schemas';

const DEFAULT_DBML = `// Welcome to DBRaw ⚙️
// This is a demo schema to get you started.

Table users [headercolor: #3498db] {
  id uuid [pk]
  username varchar [unique]
  email varchar [unique]
  full_name varchar
  created_at timestamp
}

Table posts [headercolor: #e74c3c] {
  id uuid [pk]
  user_id uuid
  title varchar
  content text
  status varchar
  created_at timestamp
}

Table comments [headercolor: #2ecc71] {
  id uuid [pk]
  post_id uuid
  user_id uuid
  content text
  created_at timestamp
}

Table tags [headercolor: #f39c12] {
  id uuid [pk]
  name varchar [unique]
}

Table post_tags [headercolor: #95a5a6] {
  post_id uuid
  tag_id uuid
}

Ref: users.id < posts.user_id
Ref: posts.id < comments.post_id
Ref: users.id < comments.user_id
Ref: posts.id < post_tags.post_id
Ref: tags.id < post_tags.tag_id`;

const DEFAULT_LAYOUT = {
  "users": { "x": 0, "y": 0 },
  "posts": { "x": 400, "y": 0 },
  "comments": { "x": 400, "y": 400 },
  "tags": { "x": 800, "y": 400 },
  "post_tags": { "x": 800, "y": 0 }
};

export const storage = {
  getSchemas: (): Schema[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSchema: (schema: Schema) => {
    const schemas = storage.getSchemas();
    const index = schemas.findIndex((s) => s.id === schema.id);
    if (index > -1) {
      schemas[index] = { ...schema, updatedAt: Date.now() };
    } else {
      schemas.push({ ...schema, createdAt: Date.now(), updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
  },

  deleteSchema: (id: string) => {
    const schemas = storage.getSchemas().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
  },

  getSchema: (id: string): Schema | undefined => {
    return storage.getSchemas().find((s) => s.id === id);
  },

  initDefault: (): Schema => {
    const schema: Schema = {
      id: 'demo-v1',
      name: 'Blog Engine (Demo)',
      dbml: DEFAULT_DBML,
      layout: DEFAULT_LAYOUT,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    storage.saveSchema(schema);
    return schema;
  }
};
