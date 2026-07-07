import 'dotenv/config';
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Apto Admin backend escuchando en http://0.0.0.0:${PORT}`);
});
