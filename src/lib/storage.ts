export interface Schema {
  id: string;
  name: string;
  dbml: string;
  layout?: Record<string, { x: number; y: number }>;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'schemaforge_schemas';

const DEFAULT_DBML = `// DBRaw Default Schema ⚙️

Table users [headercolor: #2ecc71] {
  id uuid [pk, default: \`gen_random_uuid()\`]
  username varchar [not null, unique]
  email varchar [not null, unique]
  password_hash varchar [not null]
  is_active boolean [default: true]
  metadata jsonb
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]

  indexes {
    email [unique]
    username [unique]
  }
}

Table posts [headercolor: #3498db] {
  id uuid [pk, default: \`gen_random_uuid()\`]
  user_id uuid [not null]
  title varchar [not null]
  body text
  tags varchar[]
  status post_status [default: 'draft']
  view_count integer [default: 0]
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]

  indexes {
    user_id
    created_at
    (user_id, created_at)
  }
}

Table comments [headercolor: #1abc9c] {
  id uuid [pk, default: \`gen_random_uuid()\`]
  post_id uuid [not null]
  user_id uuid [not null]
  content text [not null]
  is_flagged boolean [default: false]
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]

  indexes {
    post_id
    user_id
    created_at
  }
}

Enum post_status {
  draft
  published
  archived
  deleted
}

Ref: users.id < posts.user_id
Ref: posts.id < comments.post_id
Ref: users.id < comments.user_id`;

const DEFAULT_LAYOUT = {
  "users": { "x": 0, "y": 0 },
  "posts": { "x": 450, "y": 0 },
  "comments": { "x": 900, "y": 0 }
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
      id: 'initial-demo',
      name: 'Modern Web App (Demo)',
      dbml: DEFAULT_DBML,
      layout: DEFAULT_LAYOUT,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    storage.saveSchema(schema);
    return schema;
  }
};
