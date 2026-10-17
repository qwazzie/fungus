import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const port = Number(process.env.PORT || 10000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'fungusroom';
const collectionName = process.env.MONGODB_COLLECTION || 'app_state';
const client = mongoUri ? new MongoClient(mongoUri) : null;
let databasePromise;

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

async function database() {
  if (!client) throw new Error('MONGODB_URI is not configured');
  if (!databasePromise) databasePromise = client.connect().then(() => client.db(databaseName));
  return databasePromise;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error('Request body is too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.url === '/api/health' && req.method === 'GET') {
    return json(res, mongoUri ? 200 : 503, { ok: Boolean(mongoUri) });
  }
  if (req.url !== '/api/state') {
    const root = path.dirname(fileURLToPath(import.meta.url));
    const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.resolve(root, 'dist', `.${requested}`);
    if (!filePath.startsWith(path.resolve(root, 'dist'))) return json(res, 403, { error: 'Forbidden' });
    try {
      const content = await readFile(filePath);
      const type = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : filePath.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8';
      res.writeHead(200, {'Content-Type': type});
      return res.end(content);
    } catch {
      return json(res, 404, { error: 'Not found' });
    }
  }

  try {
    const collection = (await database()).collection(collectionName);
    if (req.method === 'GET') {
      const state = await collection.findOne({ _id: 'main' });
      return json(res, 200, state?.value || null);
    }
    if (req.method === 'PUT') {
      const payload = JSON.parse(await readBody(req));
      if (!payload || !Array.isArray(payload.chars) || !Array.isArray(payload.chats)) {
        return json(res, 400, { error: 'Invalid state' });
      }
      await collection.updateOne(
        { _id: 'main' },
        { $set: { value: { me: payload.me || null, chars: payload.chars, chats: payload.chats }, updatedAt: new Date() } },
        { upsert: true }
      );
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Database operation failed' });
  }
});

server.listen(port, () => console.log(`Fungusroom API listening on ${port}`));
