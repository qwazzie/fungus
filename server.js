import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const port = Number(process.env.PORT || 10000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'fungusroom';
const jwtSecret = process.env.JWT_SECRET;
const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

if (!mongoUri || !jwtSecret) throw new Error('MONGODB_URI and JWT_SECRET are required');

app.use(express.json({ limit: '2mb' }));

const client = new MongoClient(mongoUri);
let users;
let states;

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    display_name: user.displayName
  };
}

function createSession(user) {
  return {
    user: publicUser(user),
    access_token: jwt.sign({ sub: user._id.toString() }, jwtSecret, { expiresIn: '30d' })
  };
}

function readCredentials(request) {
  const username = String(request.body?.username || '').trim().replace(/^@/, '').toLowerCase();
  const password = String(request.body?.password || '');
  if (!/^[a-z0-9_]{1,32}$/.test(username) || password.length < 8 || password.length > 128) return null;
  return { username, password };
}

function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    request.userId = new ObjectId(payload.sub);
    next();
  } catch {
    response.status(401).json({ error: 'Unauthorized' });
  }
}

app.post('/api/auth/signup', async (request, response) => {
  const credentials = readCredentials(request);
  const displayName = String(request.body?.displayName || '').trim().slice(0, 80);
  if (!credentials || !displayName) return response.status(400).json({ error: 'Некорректные данные регистрации' });
  const passwordHash = await bcrypt.hash(credentials.password, 12);
  try {
    const result = await users.insertOne({
      username: credentials.username,
      displayName,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const user = await users.findOne({ _id: result.insertedId });
    response.status(201).json({ session: createSession(user) });
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'Не удалось создать аккаунт' });
    console.error('signup failed', error);
    response.status(500).json({ error: 'Не удалось создать аккаунт' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const credentials = readCredentials(request);
  if (!credentials) return response.status(400).json({ error: 'Неверные данные входа' });
  try {
    const user = await users.findOne({ username: credentials.username });
    const valid = user && await bcrypt.compare(credentials.password, user.passwordHash);
    if (!valid) return response.status(401).json({ error: 'Неверные данные входа' });
    response.json({ session: createSession(user) });
  } catch (error) {
    console.error('login failed', error);
    response.status(500).json({ error: 'Не удалось выполнить вход' });
  }
});

app.get('/api/auth/session', requireUser, async (request, response) => {
  const user = await users.findOne({ _id: request.userId });
  if (!user) return response.status(401).json({ error: 'Unauthorized' });
  response.json({ session: { user: publicUser(user) } });
});

app.get('/api/state', requireUser, async (request, response) => {
  try {
    const state = await states.findOne({ userId: request.userId }, { projection: { _id: 0, data: 1 } });
    response.json({ data: state?.data || null });
  } catch (error) {
    console.error('state read failed', error);
    response.status(500).json({ error: 'Не удалось загрузить данные' });
  }
});

app.put('/api/state', requireUser, async (request, response) => {
  const data = request.body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return response.status(400).json({ error: 'Некорректные данные' });
  try {
    await states.updateOne(
      { userId: request.userId },
      { $set: { data, updatedAt: new Date() }, $setOnInsert: { userId: request.userId } },
      { upsert: true }
    );
    response.status(204).end();
  } catch (error) {
    console.error('state write failed', error);
    response.status(500).json({ error: 'Не удалось сохранить данные' });
  }
});

app.use(express.static(distPath));
app.get(/.*/, (request, response) => response.sendFile(path.join(distPath, 'index.html')));

async function start() {
  await client.connect();
  const database = client.db(databaseName);
  users = database.collection('users');
  states = database.collection('user_states');
  await users.createIndex({ username: 1 }, { unique: true });
  await states.createIndex({ userId: 1 }, { unique: true });
  app.listen(port, () => console.log(`Fungusroom server listening on ${port}`));
}

start().catch((error) => {
  console.error('server startup failed', error);
  process.exit(1);
});
