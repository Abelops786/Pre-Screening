// ── VPN / proxy detection ─────────────────────────────────────────────
// Best-effort heuristic. Commercial VPNs and datacenter/hosting IPs are
// reliably caught; residential proxies generally are not. On any error we
// fail OPEN (vpn:false) so a flaky third-party API never blocks a real
// candidate. An optional PROXYCHECK_API_KEY raises the free quota.

const PRIVATE_RE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80|169\.254\.)/i;

const fetchJson = async (url, ms = 4000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'TalentScreen/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * @param {string} ip          public IP of the candidate
 * @param {string} [browserTz] IANA timezone reported by the browser (optional corroborating signal)
 * @returns {Promise<{vpn:boolean, reason:string|null, country:string|null}>}
 */
const checkVpn = async (ip, browserTz) => {
  if (!ip || PRIVATE_RE.test(ip)) {
    return { vpn: false, reason: null, country: null };
  }

  let country = null;

  // ── Primary: proxycheck.io (keyless works at low volume) ──
  try {
    const key = process.env.PROXYCHECK_API_KEY ? `&key=${process.env.PROXYCHECK_API_KEY}` : '';
    const data = await fetchJson(`https://proxycheck.io/v2/${ip}?vpn=1&asn=1${key}`);
    if (data && data.status === 'ok' && data[ip]) {
      const rec = data[ip];
      country = rec.country || null;
      if (String(rec.proxy).toLowerCase() === 'yes') {
        const type = rec.type ? String(rec.type) : 'Proxy';
        return { vpn: true, reason: `${type} detected (${rec.provider || rec.organisation || 'unknown provider'})`, country };
      }
      // proxycheck answered "no" — trust it and stop here
      return { vpn: false, reason: null, country };
    }
  } catch { /* fall through to secondary */ }

  // ── Secondary: ip-api.com (free tier gives geo + timezone). ──
  // proxy/hosting fields are only populated on paid plans, but when present
  // they are authoritative. We also use a timezone mismatch as a soft signal.
  try {
    const data = await fetchJson(`http://ip-api.com/json/${ip}?fields=status,country,timezone,proxy,hosting`);
    if (data && data.status === 'success') {
      country = country || data.country || null;
      if (data.proxy === true) return { vpn: true, reason: 'Anonymous proxy/VPN detected', country };
      if (data.hosting === true) return { vpn: true, reason: 'Datacenter / hosting IP detected', country };
      if (browserTz && data.timezone && browserTz !== data.timezone) {
        return {
          vpn: true,
          reason: `Location mismatch: your device timezone (${browserTz}) does not match your network location (${data.timezone})`,
          country,
        };
      }
    }
  } catch { /* fail open */ }

  return { vpn: false, reason: null, country };
};

module.exports = { checkVpn };
