/* ============================================================
   ARable — GLB -> USDZ converter + Supabase uploader
   - Detects animation in the GLB
   - Converts with Google usd_from_gltf (keeps rigid/skinned animation)
   - Uploads GLB + USDZ to Supabase Storage and creates the share row
   - Returns { id, glbUrl, usdzUrl, animated }
   ============================================================ */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

/* ---- Config (override via env vars on your host) ---- */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ogmtrdzimqlxhzomnnzl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXRyZHppbXFseGh6b21ubnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI4ODgsImV4cCI6MjA5NjI5ODg4OH0.fXdfuU7iELLJC2ZJXrQMBq3YxZd2hRQc7Mi2TjZR7N8';
const BUCKET = process.env.BUCKET || 'ar-models';
const TABLE = process.env.TABLE || 'shared_models';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

/* ---- Locate usd_from_gltf binary ---- */
function resolveUfgBin() {
  if (process.env.UFG_BIN) return process.env.UFG_BIN;
  const candidates = [
    '/usr/local/bin/usd_from_gltf',
    '/usr/bin/usd_from_gltf',
    '/opt/ufg/bin/usd_from_gltf',
    '/usr/app/usd_from_gltf',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return 'usd_from_gltf'; // PATH lookup
}
const UFG_BIN = resolveUfgBin();

function runUfg(inPath, outPath) {
  return new Promise((resolve, reject) => {
    execFile(UFG_BIN, [inPath, outPath], { timeout: 120000 }, (err, _out, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve();
    });
  });
}

/* ---- Detect animation in GLB (binary) or glTF (json) ---- */
function hasAnimation(buf, name) {
  try {
    if (name.endsWith('.gltf')) {
      const json = JSON.parse(buf.toString('utf8'));
      return Array.isArray(json.animations) && json.animations.length > 0;
    }
    // GLB: 12-byte header, then chunks (len, type, data). First chunk = JSON.
    if (buf.length < 12 || buf.readUInt32LE(0) !== 0x46546c67) return false; // 'glTF'
    let off = 12;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32LE(off);
      const type = buf.readUInt32LE(off + 4);
      const start = off + 8;
      if (type === 0x4e4f534a) { // 'JSON'
        const json = JSON.parse(buf.slice(start, start + len).toString('utf8'));
        return Array.isArray(json.animations) && json.animations.length > 0;
      }
      off = start + len;
    }
  } catch { /* ignore parse errors */ }
  return false;
}

async function uploadToStorage(buffer, ext, contentType) {
  const objPath = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(objPath, buffer, { contentType, upsert: false });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(objPath).data.publicUrl;
}

/* ---- Health check ---- */
app.get('/', (_req, res) => res.json({ ok: true, bin: UFG_BIN }));

/* ---- Main: convert + upload + create share row ---- */
app.post('/convert', upload.single('model'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field "model").' });
  const name = (req.file.originalname || 'model.glb').toLowerCase();
  if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
    return res.status(400).json({ error: 'Only .glb / .gltf accepted.' });
  }

  const animated = hasAnimation(req.file.buffer, name);
  const work = path.join(os.tmpdir(), crypto.randomUUID());
  await fs.mkdir(work, { recursive: true });
  const inPath = path.join(work, name.endsWith('.gltf') ? 'in.gltf' : 'in.glb');
  const outPath = path.join(work, 'out.usdz');

  try {
    await fs.writeFile(inPath, req.file.buffer);

    // 1) Upload the original GLB
    const glbUrl = await uploadToStorage(req.file.buffer, 'glb', 'model/gltf-binary');

    // 2) Convert to USDZ (animation preserved automatically). Non-fatal on failure.
    let usdzUrl = null;
    try {
      await runUfg(inPath, outPath);
      const usdz = await fs.readFile(outPath);
      usdzUrl = await uploadToStorage(usdz, 'usdz', 'model/vnd.usdz+zip');
    } catch (convErr) {
      console.error('USDZ conversion failed (sharing GLB only):', convErr.message);
    }

    // 3) Create the share row
    const id = crypto.randomUUID();
    const { error } = await db.from(TABLE).insert({ id, glb_url: glbUrl, usdz_url: usdzUrl });
    if (error) throw error;

    res.json({ id, glbUrl, usdzUrl, animated });
  } catch (err) {
    console.error('Request failed:', err);
    res.status(500).json({ error: 'Failed', detail: String(err.message || err) });
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Converter on :${PORT} (bin: ${UFG_BIN})`));
