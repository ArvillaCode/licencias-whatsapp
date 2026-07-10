process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Para tests locales: apuntar a una BD de test separada
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
