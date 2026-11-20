import { resolve } from 'node:path';

export function getHostRoot(pluginRoot, variable = 'CSMODULAR_HOST_ROOT') {
    const configured = process.env[variable] || (variable === 'CSMODULAR_UI_HOST_ROOT' ? process.env.CSMODULAR_HOST_ROOT : undefined);
    return resolve(configured || resolve(pluginRoot, '../csmodular-main'));
}
