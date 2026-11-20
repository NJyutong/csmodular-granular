import { existsSync } from 'node:fs';

export function getChromePath() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    if (process.platform !== 'win32') return undefined;
    const paths = [
        process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`,
        process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}/Google/Chrome/Application/chrome.exe`,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    ].filter(Boolean);
    return paths.find(existsSync);
}
