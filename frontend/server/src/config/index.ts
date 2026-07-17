export const config = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@netvora.com',
  },
  site: {
    url: process.env.SITE_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || '/api',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'ibrahimseleme0@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'Meo20102010',
  },
  whatsapp: {
    number: process.env.WHATSAPP_NUMBER || '905010287780',
  },
  media: {
    baseUrl: process.env.MEDIA_BASE_URL || '/media',
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
  },
};
