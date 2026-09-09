import os from 'os';
import { Bonjour } from 'bonjour-service';
import { env } from '../config/env.js';

let bonjourInstance: Bonjour | null = null;
let isPublishing = false;

/**
 * Discovers the active physical LAN/Wi-Fi IPv4 address on the host machine.
 * Skips virtual adapters (VirtualBox 192.168.56.x, Hyper-V vEthernet, WSL switches).
 */
function findMatchingIp(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
  nameMatcher: (name: string) => boolean,
  addrMatcher: (addr: os.NetworkInterfaceInfo) => boolean,
): string | undefined {
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs || !nameMatcher(name.toLowerCase())) continue;
    const match = addrs.find(addrMatcher);
    if (match) return match.address;
  }
  return undefined;
}

export function getPrimaryLanIp(): string | undefined {
  const interfaces = os.networkInterfaces();

  // 1. First priority: Physical Wi-Fi / Wireless adapter
  const wifiIp = findMatchingIp(
    interfaces,
    (name) => name.includes('wi-fi') || name.includes('wireless') || name.includes('wlan'),
    (a) => a.family === 'IPv4' && !a.internal,
  );
  if (wifiIp) return wifiIp;

  // 2. Second priority: Physical Ethernet adapter (excluding virtual switches)
  const isExcluded = (name: string) =>
    name.includes('vethernet') || name.includes('virtual') || name.includes('switch') || name.includes('vbox');

  return findMatchingIp(
    interfaces,
    (name) => !isExcluded(name),
    (a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('192.168.56.'),
  );
}

/**
 * Starts advertising the Money Card Backend API service via mDNS/DNS-SD.
 * Service type: _moneycard-api._tcp
 * Active strictly in local development environments.
 */
export function startMdnsAdvertisement(port: number): void {
  // Only advertise in development or when explicitly enabled
  const isDev = !env.NODE_ENV || env.NODE_ENV === 'development';
  if (!isDev && process.env.ENABLE_MDNS !== 'true') {
    return;
  }

  if (isPublishing || bonjourInstance) {
    return;
  }

  try {
    const primaryIp = getPrimaryLanIp();
    // Explicitly bind mDNS to 0.0.0.0 while routing multicast via the primary Wi-Fi/LAN interface
    const opts = primaryIp
      ? { interface: primaryIp, bind: '0.0.0.0' }
      : { bind: '0.0.0.0' };
    bonjourInstance = new Bonjour(opts as any);

    const service = bonjourInstance.publish({
      name: 'Money Card Backend',
      type: 'moneycard-api',
      port: port,
      txt: {
        version: '1.0.0',
        path: '/api/v1',
        health: '/api/v1/health',
        ip: primaryIp || '',
      },
    });

    isPublishing = true;

    console.log(`📡 [mDNS] Registered service: ${service.name} (${service.type} on port ${service.port})`);
    if (primaryIp) {
      console.log(`📡 [mDNS] Emitting mDNS advertisements on active LAN interface: ${primaryIp}`);
    }
    console.log(`📡 [mDNS] Mobile Flutter devices on the same Wi-Fi can now discover this backend automatically.`);

    // Cleanup handlers
    const cleanUp = () => {
      stopMdnsAdvertisement().catch(() => {});
    };

    process.once('SIGINT', cleanUp);
    process.once('SIGTERM', cleanUp);
    process.once('beforeExit', cleanUp);
  } catch (err) {
    console.error('⚠️ [mDNS] Failed to publish mDNS service:', err);
  }
}

/**
 * Gracefully unpublishes the mDNS service on server shutdown.
 */
export function stopMdnsAdvertisement(): Promise<void> {
  return new Promise((resolve) => {
    if (!bonjourInstance) {
      isPublishing = false;
      return resolve();
    }

    try {
      console.log('📡 [mDNS] Unpublishing mDNS service...');
      bonjourInstance.unpublishAll(() => {
        try {
          bonjourInstance?.destroy();
        } catch (_) {}
        bonjourInstance = null;
        isPublishing = false;
        console.log('📡 [mDNS] mDNS service unregistered.');
        resolve();
      });
    } catch (_) {
      bonjourInstance = null;
      isPublishing = false;
      resolve();
    }
  });
}
