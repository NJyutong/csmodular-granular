import { createServer } from 'node:net';

export const loopbackHost = '127.0.0.1';

export async function loopbackViteOptions() {
    const probe = createServer();
    await new Promise((resolve, reject) => {
        probe.once('error', reject);
        probe.listen(0, loopbackHost, resolve);
    });
    const address = probe.address();
    await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
    if (!address || typeof address === 'string') throw new Error('Could not reserve an IPv4 loopback port');
    return { host: loopbackHost, port: address.port, strictPort: true };
}

export async function listenLoopback(server) {
    await new Promise((resolve, reject) => {
        const onError = error => reject(error);
        server.once('error', onError);
        server.listen(0, loopbackHost, () => {
            server.off('error', onError);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Loopback server did not receive an IPv4 port');
    return `http://${loopbackHost}:${address.port}/`;
}

export function viteLoopbackUrl(server) {
    const address = server.httpServer?.address();
    if (address && typeof address !== 'string') return `http://${loopbackHost}:${address.port}/`;
    const local = server.resolvedUrls?.local?.map(value => new URL(value))
        .find(url => url.hostname === loopbackHost);
    if (local) return local.href;
    throw new Error('Vite server did not expose an IPv4 loopback URL');
}
