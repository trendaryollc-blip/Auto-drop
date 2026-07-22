import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  db: {
    adapter: process.env.DB_ADAPTER || 'firestore',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,https://auto-drop-nine.vercel.app').split(',').map(s => s.trim()),
  },

  debug: process.env.DEBUG === 'true',
};

export default config;
