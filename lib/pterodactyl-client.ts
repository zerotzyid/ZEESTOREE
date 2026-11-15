/**
 * Klien Client API Pterodactyl (/api/client) memakai Client API key (ptlc_…).
 * Key milik akun ROOT ADMIN dapat mengakses semua server, jadi satu key per panel cukup.
 */
const ACCEPT = 'Application/vnd.pterodactyl.v1+json';

export type ClientPanel = { baseUrl: string; capiKey: string };

const base = (u: string) => u.trim().replace(/\/+$/, '');

async function cfetch<T>(
  p: ClientPanel,
  path: string,
  init?: { method?: string; json?: unknown; text?: string }
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${p.capiKey}`, Accept: ACCEPT };
  let body: string | undefined;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init?.text !== undefined) {
    headers['Content-Type'] = 'text/plain';
    body = init.text;
  }
  const res = await fetch(`${base(p.baseUrl)}${path}`, { method: init?.method ?? 'GET', headers, body, cache: 'no-store' });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try {
      detail = (JSON.parse(text) as { errors?: Array<{ detail?: string }> }).errors?.[0]?.detail ?? detail;
    } catch {
      /* teks mentah */
    }
    throw new Error(`Pterodactyl ${res.status}: ${detail || 'tanpa detail'}`);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

const sv = (id: string) => `/api/client/servers/${encodeURIComponent(id)}`;

export type ServerState = {
  state: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  uptimeMs: number;
};

export async function getResources(p: ClientPanel, id: string): Promise<ServerState> {
  const r = await cfetch<{
    attributes: { current_state: string; resources: { cpu_absolute: number; memory_bytes: number; disk_bytes: number; uptime: number } };
  }>(p, `${sv(id)}/resources`);
  const a = r.attributes;
  return {
    state: a.current_state,
    cpu: a.resources.cpu_absolute,
    memoryBytes: a.resources.memory_bytes,
    diskBytes: a.resources.disk_bytes,
    uptimeMs: a.resources.uptime,
  };
}

export async function sendPower(p: ClientPanel, id: string, signal: 'start' | 'stop' | 'restart' | 'kill'): Promise<void> {
  await cfetch(p, `${sv(id)}/power`, { method: 'POST', json: { signal } });
}

export async function sendCommand(p: ClientPanel, id: string, command: string): Promise<void> {
  await cfetch(p, `${sv(id)}/command`, { method: 'POST', json: { command } });
}

export type FileItem = { name: string; isFile: boolean; size: number; modifiedAt: string; mime: string };

export async function listFiles(p: ClientPanel, id: string, dir: string): Promise<FileItem[]> {
  const r = await cfetch<{
    data: Array<{ attributes: { name: string; is_file: boolean; size: number; modified_at: string; mimetype: string } }>;
  }>(p, `${sv(id)}/files/list?directory=${encodeURIComponent(dir)}`);
  return r.data.map((d) => ({
    name: d.attributes.name,
    isFile: d.attributes.is_file,
    size: d.attributes.size,
    modifiedAt: d.attributes.modified_at,
    mime: d.attributes.mimetype,
  }));
}

export async function readFile(p: ClientPanel, id: string, file: string): Promise<string> {
  const res = await fetch(`${base(p.baseUrl)}${sv(id)}/files/contents?file=${encodeURIComponent(file)}`, {
    headers: { Authorization: `Bearer ${p.capiKey}`, Accept: ACCEPT },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Pterodactyl ${res.status}: gagal membaca file.`);
  return res.text();
}

export async function writeFile(p: ClientPanel, id: string, file: string, content: string): Promise<void> {
  await cfetch(p, `${sv(id)}/files/write?file=${encodeURIComponent(file)}`, { method: 'POST', text: content });
}

export async function deleteFiles(p: ClientPanel, id: string, root: string, files: string[]): Promise<void> {
  await cfetch(p, `${sv(id)}/files/delete`, { method: 'POST', json: { root, files } });
}

export async function renameFile(p: ClientPanel, id: string, root: string, from: string, to: string): Promise<void> {
  await cfetch(p, `${sv(id)}/files/rename`, { method: 'PUT', json: { root, files: [{ from, to }] } });
}

export async function createFolder(p: ClientPanel, id: string, root: string, name: string): Promise<void> {
  await cfetch(p, `${sv(id)}/files/create-folder`, { method: 'POST', json: { root, name } });
}

export async function getDownloadUrl(p: ClientPanel, id: string, file: string): Promise<string> {
  const r = await cfetch<{ attributes: { url: string } }>(p, `${sv(id)}/files/download?file=${encodeURIComponent(file)}`);
  return r.attributes.url;
}

/**
 * Ambil log console via websocket Wings (dari server, jadi tidak terkena allowed_origins browser).
 * Mengumpulkan output ±1.5 detik lalu menutup koneksi.
 */
export async function fetchConsole(p: ClientPanel, id: string): Promise<string[]> {
  const cred = await cfetch<{ data: { token: string; socket: string } }>(p, `${sv(id)}/websocket`);
  const { default: WebSocket } = await import('ws');
  return new Promise<string[]>((resolve) => {
    const lines: string[] = [];
    const ws = new WebSocket(cred.data.socket, { headers: { Origin: base(p.baseUrl) } });
    const done = () => {
      try {
        ws.close();
      } catch {
        /* abaikan */
      }
      resolve(lines.slice(-300));
    };
    const timer = setTimeout(done, 3000);
    let idle: ReturnType<typeof setTimeout> | null = null;
    ws.on('open', () => ws.send(JSON.stringify({ event: 'auth', args: [cred.data.token] })));
    ws.on('message', (raw: Buffer) => {
      try {
        const m = JSON.parse(raw.toString()) as { event: string; args?: string[] };
        if (m.event === 'auth success') ws.send(JSON.stringify({ event: 'send logs', args: [null] }));
        if (m.event === 'console output' && m.args?.[0] !== undefined) {
          lines.push(m.args[0].replace(/\u001b\[[0-9;]*[A-Za-z]/g, ''));
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => {
            clearTimeout(timer);
            done();
          }, 700);
        }
      } catch {
        /* abaikan pesan non-JSON */
      }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      done();
    });
  });
}

/** Upload file ke server via Client API (two-step: get signed URL then upload). */
export async function uploadFile(p: ClientPanel, id: string, file: File, dir: string): Promise<void> {
  // Step 1: Get signed upload URL
  const uploadResp = await cfetch<{ attributes: { url: string } }>(p, `${sv(id)}/files/upload?directory=${encodeURIComponent(dir)}`);
  const signedUrl = uploadResp.attributes.url;

  // Step 2: Upload file to signed URL
  const form = new FormData();
  form.append('files', file);
  form.append('directory', dir);
  const res = await fetch(signedUrl, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try { detail = (JSON.parse(text) as { errors?: Array<{ detail?: string }> }).errors?.[0]?.detail ?? detail; } catch {}
    throw new Error(`Pterodactyl ${res.status}: ${detail || 'upload gagal'}`);
  }
}

/** Ekstrak archive (.zip, .tar.gz, .tar) via Client API. */
export async function decompressFile(p: ClientPanel, id: string, file: string, dir: string): Promise<void> {
  await cfetch(p, `${sv(id)}/files/decompress`, {
    method: 'POST',
    json: { file, directory: dir },
  });
}