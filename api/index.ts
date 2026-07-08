import { createApp } from '../backend/src/app';

// Vercel serverless function: exportamos la app de Express como handler.
// Vercel enruta /api/* a esta función (ver vercel.json) y Express resuelve
// las rutas conservando el prefijo /api original de la petición.
const app = createApp();

export default app;
