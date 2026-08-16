import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3001,

  // Cube.js REST API
  cubeUrl: process.env.CUBEJS_URL || 'http://localhost:4000/cubejs-api/v1/load',
  cubeMetaUrl: process.env.CUBEJS_META_URL || 'http://localhost:4000/cubejs-api/v1/meta',
  cubeApiSecret: process.env.CUBEJS_API_SECRET || 'change_me_to_a_long_secret',

  // DeepSeek (OpenAI-compatible)
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },

  // Direct DB (seed / check scripts only; the RAG flow goes through Cube.js)
  databaseUrl: process.env.DATABASE_URL || '',
};
