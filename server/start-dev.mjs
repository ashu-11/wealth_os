/**
 * Dev entry: use MONGODB_URI / MONGO_URI (e.g. Atlas) when set; otherwise in-memory Mongo + seed.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { hasExplicitMongoUri } from './mongoUri.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function runSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, 'seeds/index.js')], {
      cwd: __dirname,
      env: { ...process.env },
      stdio: 'inherit',
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`seed exited with code ${code}`))
    );
  });
}

if (hasExplicitMongoUri()) {
  console.log('✓ Using MongoDB from MONGODB_URI / MONGO_URI (no in-memory server)');
} else {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  console.log('✓ In-memory MongoDB (mongodb-memory-server) — no local mongod/Docker required');
  await runSeed();
}

await import('./index.js');
