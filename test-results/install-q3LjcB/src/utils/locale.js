// Grain library interface languages follow the preferred browser/system locale.
const supported = new Set(['zh', 'ru', 'en']);

export function getUiLanguage(languages = undefined) {
    const preferences = languages ?? (typeof navigator !== 'undefined'
        ? [...(navigator.languages || []), navigator.language]
        : []);
    for (const preference of Array.isArray(preferences) ? preferences : [preferences]) {
        const code = String(preference || '').toLowerCase().split(/[-_]/, 1)[0];
        if (supported.has(code)) return code;
    }
    return 'en';
}

export function localize(text, language = getUiLanguage()) {
    if (!text || typeof text !== 'object' || Array.isArray(text)) return text ?? '';
    return text[language] ?? text.en ?? text.zh ?? text.ru ?? '';
}
