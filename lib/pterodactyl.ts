/**
 * Klien Application API Pterodactyl.
 *
 * VERIFIKASI sumber (diakses 15 Nov 2026):
 * - https://docs.pterodactyl.io/v1/api — "Authorization: Bearer YOUR_API_KEY";
 *   Application API = /api/application (Admin → Application API).
 * - https://docs.pterodactyl.io/v2/api/application-api/applicationListUsers
 *   — GET /api/application/users, query per_page, filter[email].
 * - https://docs.pterodactyl.io/v2/api/application-api/applicationCreateServer
 *   — POST /api/application/servers, respons 400 "Automatic deployment could not
 *     find a viable node or allocation" (deploy find_available didukung).
 * - https://github.com/pterodactyl/panel/blob/develop/routes/api-application.php
 *   — route GET/POST /users, GET/POST /servers (dan nests di kelompok route terpisah).
 * - Body POST /servers (email dari docs v1 mirror resmi): name, user, egg,
 *   limits{memory,swap,disk,io,cpu}, feature_limits{databases,allocations,backups},
 *   allocation{default} ATAU deploy, environment, docker_image?, startup?.
 *
 * Catatan: docs v2 menyebut "The nest endpoints have been removed" (Pterodactyl 2.0);
 * pembuatan server cukup memakai id egg, jadi integrasi ini tidak bergantung nest.
 */

const ACCEPT = 'Application/vnd.pterodactyl.v1+json';

export type PteroPanel = {
  baseUrl: string;
  apiKey: string;
};

export type PteroUser = {
  id: number;
  email: string;
  username: string;
};

export type CreateServerPayload = {
  name: string;
  user: number;
  egg: number;
  environment?: Record<string, string>;
  docker_image?: string;
  startup?: string;
  limits: { memory: number; swap: number; disk: number; io: number; cpu: number };
  feature_limits: { databases: number; allocations: number; backups: number };
} & (
  | { allocation: { default: number }; deploy?: undefined }
  | { deploy: { find_available: true }; allocation?: undefined }
);

export type CreatedServer = {
  id: number;
  uuid: string;
  name: string;
  identifiers?: { uuid?: string; short?: string };
};

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

async function pteroFetch<T>(
  panel: PteroPanel,
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const url = `${normalizeBase(panel.baseUrl)}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${panel.apiKey}`,
    Accept: ACCEPT,
  };
  let body: string | undefined;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body,
    cache: 'no-store',
  });
  const text = await res.text().catch(() => '');
  if (path.includes('eggs/') && path.includes('include=variables')) {
    console.error('EGG_FETCH_URL:', url);
    console.error('EGG_FETCH_RAW:', text.slice(0, 2000));
  }
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { errors?: Array<{ detail?: string }> };
      detail = parsed.errors?.[0]?.detail ?? detail;
    } catch {
      /* pakai teks mentah */
    }
    throw new Error(`Pterodactyl ${res.status} di ${path}: ${detail || 'tanpa detail'}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respons Pterodactyl tidak valid di ${path}.`);
  }
}

type ListEnvelope<T> = { data: Array<{ attributes: T }> };

/** VERIFIKASI: GET /api/application/users?filter[email]= — docs v2 applicationListUsers. */
export async function findPanelUser(panel: PteroPanel, email: string): Promise<PteroUser | null> {
  const data = await pteroFetch<ListEnvelope<PteroUser>>(
    panel,
    `/api/application/users?per_page=1&filter[email]=${encodeURIComponent(email)}`
  );
  const attrs = data.data[0]?.attributes;
  return attrs ? { id: attrs.id, email: attrs.email, username: attrs.username } : null;
}

/** VERIFIKASI: POST /api/application/users (email, username, first_name, last_name, password). */
export async function createPanelUser(
  panel: PteroPanel,
  input: { email: string; username: string; password: string }
): Promise<PteroUser> {
  const res = await pteroFetch<{ attributes: PteroUser }>(panel, '/api/application/users', {
    method: 'POST',
    json: {
      email: input.email,
      username: input.username,
      first_name: input.username,
      last_name: 'Customer',
      password: input.password,
      root_admin: false,
    },
  });
  return res.attributes;
}

/** VERIFIKASI: POST /api/application/servers (lihat CreateServerPayload). */
export async function createPanelServer(
  panel: PteroPanel,
  payload: CreateServerPayload
): Promise<CreatedServer> {
  const res = await pteroFetch<{ attributes: CreatedServer }>(panel, '/api/application/servers', {
    method: 'POST',
    json: payload,
  });
  return res.attributes;
}

/** VERIFIKASI: GET /api/application/users?per_page=1 — uji koneksi & izin API key. */
export async function testPanelConnection(
  panel: PteroPanel
): Promise<{ ok: true; users: number } | { ok: false; error: string }> {
  try {
    const res = await pteroFetch<ListEnvelope<PteroUser> & { meta?: { pagination?: { total?: number } } }>(
      panel,
      '/api/application/users?per_page=1'
    );
    return { ok: true, users: res.meta?.pagination?.total ?? res.data.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Koneksi gagal.' };
  }
}

/** VERIFIKASI: GET /api/application/nests lalu /api/application/nests/{nest}/eggs (v1; hilang di v2). */
export async function listNestsAndEggs(
  panel: PteroPanel
): Promise<Array<{ nestId: number; nestName: string; eggs: Array<{ id: number; name: string }> }>> {
  const nests = await pteroFetch<ListEnvelope<{ id: number; name: string }>>(
    panel,
    '/api/application/nests?per_page=100'
  );
  const out: Array<{ nestId: number; nestName: string; eggs: Array<{ id: number; name: string }> }> = [];
  for (const nest of nests.data) {
    let eggs: Array<{ id: number; name: string }> = [];
    try {
      const fetched = await pteroFetch<ListEnvelope<{ id: number; name: string }>>(
        panel,
        `/api/application/nests/${nest.attributes.id}/eggs?per_page=100`
      );
      eggs = fetched.data.map((e) => ({ id: e.attributes.id, name: e.attributes.name }));
    } catch {
      /* lewati nest yang gagal dimuat egg-nya */
    }
    out.push({
      nestId: nest.attributes.id,
      nestName: nest.attributes.name,
      eggs,
    });
  }
  return out;
}

/** Password acak aman untuk akun panel baru (dibuat server-side). */
export function generatePanelPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const base = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `Pw${base}${Math.floor(100 + Math.random() * 900)}!`;
}

type EggVariable = {
  attributes?: { env_variable?: string; default_value?: unknown };
};
type EggAttrs = {
  docker_image?: string;
  startup?: string;
  relationships?: { variables?: { data?: EggVariable[] } };
};
type EggItem = { attributes?: EggAttrs; relationships?: { variables?: { data?: EggVariable[] } } };

/**
 * Env var egg secara dinamis (tanpa hardcode).
 * VERIFIKASI: GET /api/application/nests/{nest}/eggs/{egg}?include=variables
 * (v1 single-egg; respons { attributes, relationships }.v1 juga bisa
 * dengan daftar eggs per nest, ditangani di bawah.)
 * seluruh variabel wajib egg ikut terkirim sehingga tidak lagi kena 422
 * "The [...] variable field is required." saat egg berganti.
 */
export async function getEggWithVariables(
  panel: PteroPanel,
  nestId: number,
  eggId: number
): Promise<{ dockerImage: string | null; startup: string | null; environment: Record<string, string> }> {
  const root = (await pteroFetch<unknown>(
    panel,
    `/api/application/nests/${nestId}/eggs/${eggId}?include=variables`
  )) as {
    data?: EggItem[];
    attributes?: EggAttrs;
    relationships?: { variables?: { data?: EggVariable[] } };
  };
  const item = root.data?.[0] ?? root;
  const attrs = item?.attributes;
  const environment: Record<string, string> = {};
  // Pterodactyl menaruh relationships DI DALAM attributes; sebagian versi di level atas. Dukung keduanya.
  const vars = attrs?.relationships?.variables?.data ?? item?.relationships?.variables?.data ?? [];
  for (const v of vars) {
    const a = v.attributes;
    if (a?.env_variable) environment[a.env_variable] = String(a.default_value ?? '');
  }
  console.error('EGG_DEBUG:', JSON.stringify({ nestId, eggId, dockerImage: attrs?.docker_image, startup: attrs?.startup, environment, hasVars: vars.length > 0 }, null, 2));
  return { dockerImage: attrs?.docker_image ?? null, startup: attrs?.startup ?? null, environment };
}

const nestEggCache = new Map<string, { nestId: number; at: number }>();

/** Cari nestId pembungkus egg (cache 10 menit). Tidak pernah melempar. */
export async function resolveNestIdForEgg(panel: PteroPanel, eggId: number): Promise<number | null> {
  try {
    const key = `${normalizeBase(panel.baseUrl)}#${eggId}`;
    const hit = nestEggCache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.nestId;
    const nests = await listNestsAndEggs(panel);
    for (const nest of nests) {
      if (nest.eggs.some((e) => e.id === eggId)) {
        nestEggCache.set(key, { nestId: nest.nestId, at: Date.now() });
        console.error('NEST_DEBUG: found eggId', eggId, 'in nest', nest.nestId, nest.nestName);
        return nest.nestId;
      }
    }
    console.error('NEST_DEBUG: eggId', eggId, 'NOT FOUND in any nest');
    return null;
  } catch {
    return null;
  }
}

/**
 * Susun environment + docker_image + startup untuk create server:
 * default egg (dinamis, dari ?include=variables) → override manual admin
 * (provision.environment / dockerImage / startup) menang di atasnya.
 * Tidak pernah melempar: bila endpoint nest/egg tidak tersedia
 * (mis. Pterodactyl v2), hasil konfigurasi produk dipakai apa adanya.
 */
export async function buildServerArgs(
  panel: PteroPanel,
  provision: {
    eggId: number;
    dockerImage: string | null;
    startup: string | null;
    environment: Record<string, string>;
  }
): Promise<{ dockerImage: string | null; startup: string | null; environment: Record<string, string> }> {
  let dockerImage = provision.dockerImage;
  let startup = provision.startup;
  let environment: Record<string, string> = { ...(provision.environment ?? {}) };
  try {
    const nestId = await resolveNestIdForEgg(panel, provision.eggId);
    if (nestId !== null) {
      try {
        const egg = await getEggWithVariables(panel, nestId, provision.eggId);
        environment = { ...egg.environment, ...environment };
        dockerImage = dockerImage || egg.dockerImage;
        startup = startup || egg.startup;
      } catch {
        /* fetch egg detail gagal, gunakan konfigurasi produk */
      }
    }
  } catch {
    /* resolusi nest gagal, gunakan konfigurasi produk */
  }
  console.error('BUILD_ARGS_DEBUG:', JSON.stringify({ eggId: provision.eggId, dockerImage, startup, environment }, null, 2));
  return { dockerImage, startup, environment };
}

/**
 * Application API: List semua server di panel.
 * GET /api/application/servers
 */
export async function listApplicationServers(
  panel: PteroPanel,
  options: { page?: number; perPage?: number } = {}
): Promise<Array<{ id: number; uuid: string; name: string; node: number; state: string; limits: { memory: number; disk: number; cpu: number }; user: number }>> {
  const { page = 1, perPage = 100 } = options;
  const res = await pteroFetch<{ data: Array<{ attributes: any }>; meta?: { pagination?: { total: number } } }>(
    panel,
    `/api/application/servers?page=${page}&per_page=${perPage}&include=user,node,allocation,egg`
  );
  return res.data.map((d) => {
    const a = d.attributes;
    return {
      id: a.id,
      uuid: a.uuid,
      name: a.name,
      node: a.relationships?.node?.data?.attributes?.id ?? a.node,
      state: a.current_state ?? a.state,
      limits: a.limits ?? { memory: 0, disk: 0, cpu: 0 },
      user: a.relationships?.user?.data?.attributes?.id ?? a.user,
    };
  });
}

/**
 * Application API: Get detail server.
 * GET /api/application/servers/{id}
 */
export async function getApplicationServer(
  panel: PteroPanel,
  serverId: number
): Promise<{ id: number; uuid: string; name: string; state: string; limits: any; user: number; node: number; egg: number } | null> {
  try {
    const res = await pteroFetch<{ attributes: any }>(
      panel,
      `/api/application/servers/${serverId}?include=user,node,allocation,egg`
    );
    const a = res.attributes;
    return {
      id: a.id,
      uuid: a.uuid,
      name: a.name,
      state: a.current_state ?? a.state,
      limits: a.limits,
      user: a.relationships?.user?.data?.attributes?.id ?? a.user,
      node: a.relationships?.node?.data?.attributes?.id ?? a.node,
      egg: a.relationships?.egg?.data?.attributes?.id ?? a.egg,
    };
  } catch {
    return null;
  }
}

/**
 * Application API: Suspend server (stop + disable).
 * POST /api/application/servers/{id}/suspend
 */
export async function suspendApplicationServer(panel: PteroPanel, serverId: number): Promise<void> {
  await pteroFetch(panel, `/api/application/servers/${serverId}/suspend`, { method: 'POST' });
}

/**
 * Application API: Unsuspend server (enable).
 * POST /api/application/servers/{id}/unsuspend
 */
export async function unsuspendApplicationServer(panel: PteroPanel, serverId: number): Promise<void> {
  await pteroFetch(panel, `/api/application/servers/${serverId}/unsuspend`, { method: 'POST' });
}

/**
 * Application API: Delete server permanently.
 * DELETE /api/application/servers/{id}
 */
export async function deleteApplicationServer(panel: PteroPanel, serverId: number, force = true): Promise<void> {
  await pteroFetch(panel, `/api/application/servers/${serverId}?force=${force}`, { method: 'DELETE' });
}

/**
 * Application API: Reinstall server.
 * POST /api/application/servers/{id}/reinstall
 */
export async function reinstallApplicationServer(panel: PteroPanel, serverId: number): Promise<void> {
  await pteroFetch(panel, `/api/application/servers/${serverId}/reinstall`, { method: 'POST' });
}

/**
 * Application API: Change server owner password.
 * POST /api/application/users/{id}/password
 */
export async function changeUserPassword(panel: PteroPanel, userId: number, password: string): Promise<void> {
  await pteroFetch(panel, `/api/application/users/${userId}/password`, {
    method: 'POST',
    json: { password },
  });
}

/**
 * Application API: Send command to server console.
 * POST /api/application/servers/{id}/command
 */
export async function sendApplicationCommand(panel: PteroPanel, serverId: number, command: string): Promise<void> {
  await pteroFetch(panel, `/api/application/servers/${serverId}/command`, {
    method: 'POST',
    json: { command },
  });
}
}
