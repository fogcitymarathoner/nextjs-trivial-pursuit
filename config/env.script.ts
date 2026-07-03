// config/env.server.ts
import { loadEnvConfig } from '@next/env';
import { envServer } from './env.server'
loadEnvConfig(process.cwd());

export const CLIENT_SECRET_FILE = envServer('CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2');
