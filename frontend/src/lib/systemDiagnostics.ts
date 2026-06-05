// ── Silent system diagnostics ─────────────────────────────────────────
// Everything here is gathered WITHOUT showing the candidate any result.
// The values are sent with the system-check POST and surfaced only to
// admins/recruiters in the candidate profile. No extra permission prompts
// are triggered (mic sampling reuses the stream already granted).

export interface Diagnostics {
  screenResolution: string | null;
  cpuCores: number | null;
  deviceMemory: number | null;
  connectionType: string | null;
  networkLatency: number | null;   // ms
  networkJitter: number | null;    // ms
  micInputLevel: number | null;    // 0–100 peak
  backgroundNoise: number | null;  // 0–100 avg
  browserVersion: string | null;
  timezone: string | null;
  cpuArchitecture: string | null;  // e.g. "x86-64bit" (browsers can't expose CPU model/generation)
  gpuRenderer: string | null;      // e.g. "Intel(R) UHD Graphics 630" — best hint at the hardware era
}

// GPU / graphics chip via WebGL. The integrated-GPU name is the closest signal
// to the actual CPU on a web page (browsers never expose the CPU model itself).
export function detectGpu(): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    if (typeof raw !== 'string' || !raw) return null;
    // Pull the human-readable chip name out of strings like
    // "ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 ..., D3D11)"
    const angle = raw.match(/ANGLE \(([^,]+),\s*([^,]+?)(?:\s*\([^)]*\))?\s*(?:Direct3D|OpenGL|Vulkan|,|$)/i);
    const name = angle ? angle[2].trim() : raw.replace(/\s*\([^)]*\)/g, '').trim();
    return (name || raw).slice(0, 120);
  } catch { return null; }
}

// CPU architecture/bitness via User-Agent Client Hints (async, Chromium only).
export async function getCpuArchitecture(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uaData = (navigator as any).userAgentData;
    if (!uaData?.getHighEntropyValues) return null;
    const hev = await uaData.getHighEntropyValues(['architecture', 'bitness']);
    if (!hev?.architecture) return null;
    return `${hev.architecture}${hev.bitness ? `-${hev.bitness}bit` : ''}`;
  } catch { return null; }
}

// Parse a friendly "Browser 124" version string from the UA.
export function detectBrowserVersion(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const tests: Array<[string, RegExp]> = [
    ['Edge', /Edg\/(\d+)/],
    ['Chrome', /Chrome\/(\d+)/],
    ['Firefox', /Firefox\/(\d+)/],
    ['Safari', /Version\/(\d+).*Safari/],
  ];
  for (const [name, re] of tests) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return null;
}

// Static, instantly-available metrics.
export function collectStaticDiagnostics(): Diagnostics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  return {
    screenResolution:
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : null,
    cpuCores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    connectionType: conn?.effectiveType || conn?.type || null,
    networkLatency: null,
    networkJitter: null,
    micInputLevel: null,
    backgroundNoise: null,
    browserVersion: detectBrowserVersion(),
    timezone:
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || null : null,
    cpuArchitecture: null, // filled in asynchronously via getCpuArchitecture()
    gpuRenderer: detectGpu(),
  };
}

// Ping latency + jitter via tiny Cloudflare requests.
export async function measureLatency(): Promise<{ latency: number | null; jitter: number | null }> {
  const samples: number[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const t0 = performance.now();
      // eslint-disable-next-line no-await-in-loop
      await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
      const dt = performance.now() - t0;
      if (i > 0) samples.push(dt); // drop first (TLS warmup)
    }
  } catch {
    /* ignore – return whatever we have */
  }
  if (!samples.length) return { latency: null, jitter: null };
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const jitter = samples.reduce((a, b) => a + Math.abs(b - avg), 0) / samples.length;
  return { latency: Math.round(avg), jitter: Math.round(jitter) };
}

// Sample the (already-granted) mic stream for ~1.2s to gauge input level and
// ambient background noise. Returns 0–100 values. Stream is NOT stopped here.
export async function measureMic(
  stream: MediaStream,
): Promise<{ micInputLevel: number | null; backgroundNoise: number | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return { micInputLevel: null, backgroundNoise: null };
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    let peak = 0;
    let sum = 0;
    let frames = 0;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128; // -1..1
          sq += v * v;
        }
        const rms = Math.sqrt(sq / buf.length); // 0..1
        peak = Math.max(peak, rms);
        sum += rms;
        frames++;
        if (performance.now() - start < 1200) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    try { source.disconnect(); } catch { /* noop */ }
    try { await ctx.close(); } catch { /* noop */ }

    const avg = frames ? sum / frames : 0;
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 100)));
    return { micInputLevel: clamp(peak), backgroundNoise: clamp(avg) };
  } catch {
    return { micInputLevel: null, backgroundNoise: null };
  }
}
