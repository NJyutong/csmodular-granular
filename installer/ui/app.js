import { INSTALLER_VERSION } from './version.js';

const text = {
  en: {
    appTitle: 'Pulvis Installer',
    versionLabel: 'Version {version}',
    eyebrow: 'PLUGIN INSTALLER',
    title: 'CsModular Pulvis',
    heading: 'Install Pulvis',
    description: 'Install the granular synthesis library for CsModular.',
    includedModules: 'Included modules',
    engineBadge: '64-Voice Csound Granular Engine',
    modFreezeTitle: 'Grain Freeze',
    modFreezeDesc: '8s live ring, snapshot memory & feedback',
    modSampleTitle: 'Grain Sample',
    modSampleDesc: '8 session WAV slots, scan & band-limited sinc',
    modOscTitle: 'Grain Osc',
    modOscDesc: '4 carrier waves, phase warp & timing scatter',
    languageLabel: 'Language',
    locationLabel: 'Install location',
    locationDetail: 'CsModular module library',
    choose: 'Browse',
    selectFolder: 'Choose the CsModular libraries folder.',
    detectingHost: 'Looking for CsModular…',
    hostNotFound: 'CsModular was not found automatically. Browse to its libraries folder.',
    chooseFolderTitle: 'Select the CsModular libraries folder',
    checking: 'Checking installation…',
    install: 'Install',
    update: 'Update plugin',
    uninstall: 'Uninstall',
    copyright: 'Copyright © 2026 Zhang Shengwei',
    license: 'MIT License',
    note: 'Close CsModular before installing or updating. Restart it when installation is complete.',
    compatibility: 'Requires CsModular with Pulvis library integration and WAV import support.',
    selectFirst: 'Select the libraries folder from your CsModular installation.',
    absent: 'The plugin is not installed in this host folder.',
    installed: 'Installed version {version}.',
    working: 'Installing plugin files…',
    removing: 'Removing plugin files…',
    installedDone: 'Pulvis {version} is installed. Restart CsModular to load it.',
    legacyDetected: 'An older user-library copy exists and may take priority over the selected host.',
    installedLegacy: 'Installed in the host folder. An existing user-library copy may take priority.',
    removedDone: 'Plugin modules removed from the selected host folder.',
    installConfirm: 'Install or update Pulvis in this host folder? Plugin files will be replaced.',
    removeConfirm: 'Remove Pulvis from this host folder?',
    permissionDenied: 'Access denied. Close CsModular and run this installer with administrator/root privileges, then try again.',
    invalidFolder: 'Choose the CsModular libraries folder containing its _index.json file.',
    unsupportedHost: 'This is not a valid CsModular libraries folder. Update CsModular and choose its libraries folder.',
    folderMissing: 'The selected folder does not exist. Choose the CsModular libraries folder again.',
    failed: 'The operation failed: {error}',
    unavailable: 'Run this installer as a desktop application.'
  },
  zh: {
    appTitle: '微粒安装器',
    versionLabel: '版本 {version}',
    eyebrow: '插件安装器',
    title: 'CsModular 微粒',
    heading: '安装微粒',
    description: '为 CsModular 安装颗粒合成模块库。',
    includedModules: '包含的模块',
    engineBadge: '64 声部 Csound 颗粒合成引擎',
    modFreezeTitle: '颗粒冻结',
    modFreezeDesc: '8 秒实时环形缓冲、私有快照与反馈',
    modSampleTitle: '颗粒采样',
    modSampleDesc: '8 个会话 WAV 槽、扫描与带限 sinc 读表',
    modOscTitle: '颗粒振荡器',
    modOscDesc: '4 种内置载波波形、相位扭曲与时间散布',
    languageLabel: '语言',
    locationLabel: '安装位置',
    locationDetail: 'CsModular 模块库',
    choose: '浏览',
    selectFolder: '请选择 CsModular 的 libraries 文件夹。',
    detectingHost: '正在查找 CsModular…',
    hostNotFound: '未能自动找到 CsModular。请浏览选择它的 libraries 文件夹。',
    chooseFolderTitle: '选择 CsModular 的 libraries 文件夹',
    checking: '正在检查安装状态…',
    install: '安装',
    update: '更新插件',
    uninstall: '卸载',
    copyright: '版权所有 © 2026 Zhang Shengwei',
    license: 'MIT 许可证',
    note: '安装或更新前请关闭 CsModular，安装完成后重新启动。',
    compatibility: '需要集成 Pulvis（pulvis）模块库并支持 WAV 导入的 CsModular 版本。',
    selectFirst: '请先选择 CsModular 安装目录中的 libraries 文件夹。',
    absent: '此宿主目录中尚未安装插件。',
    installed: '已安装版本 {version}。',
    working: '正在安装插件文件…',
    removing: '正在移除插件文件…',
    installedDone: '微粒 {version} 已安装。请重新启动 CsModular 以加载模块。',
    legacyDetected: '检测到旧的用户模块库副本，它可能优先加载。',
    installedLegacy: '已安装到宿主目录，已有的用户模块库副本可能优先加载。',
    removedDone: '已从所选宿主目录移除颗粒模块。',
    installConfirm: '要在此宿主目录中安装或更新微粒吗？插件文件会被替换。',
    removeConfirm: '要从此宿主目录移除微粒吗？',
    permissionDenied: '没有写入权限。请关闭 CsModular，以管理员/root 权限运行安装器后重试。',
    invalidFolder: '请选择包含 _index.json 的 CsModular libraries 文件夹。',
    unsupportedHost: '此目录不是有效的 CsModular libraries 文件夹。请更新 CsModular 后重新选择。',
    folderMissing: '所选目录不存在，请重新选择 CsModular 的 libraries 文件夹。',
    failed: '操作失败：{error}',
    unavailable: '请将此安装器作为桌面应用运行。'
  },
  ru: {
    appTitle: 'Установщик «Пульвис»',
    versionLabel: 'Версия {version}',
    eyebrow: 'УСТАНОВЩИК ПЛАГИНА',
    title: 'CsModular Пульвис',
    heading: 'Установка «Пульвис»',
    description: 'Библиотека гранулярного синтеза для CsModular.',
    includedModules: 'Модули в комплекте',
    engineBadge: '64-голосный движок Csound',
    modFreezeTitle: 'Заморозка',
    modFreezeDesc: 'Кольцевой буфер 8 с, снимок и обратная связь',
    modSampleTitle: 'Сэмпл',
    modSampleDesc: '8 слотов WAV, сканирование и sinc-чтение',
    modOscTitle: 'Осциллятор',
    modOscDesc: '4 формы волны, деформация фазы и тайминг',
    languageLabel: 'Язык',
    locationLabel: 'Место установки',
    locationDetail: 'Библиотека модулей CsModular',
    choose: 'Обзор',
    selectFolder: 'Выберите папку libraries CsModular.',
    detectingHost: 'Поиск CsModular…',
    hostNotFound: 'Не удалось автоматически найти CsModular. Выберите его папку libraries.',
    chooseFolderTitle: 'Выберите папку libraries CsModular',
    checking: 'Проверка установки…',
    install: 'Установить',
    update: 'Обновить плагин',
    uninstall: 'Удалить',
    copyright: 'Авторское право © 2026 Zhang Shengwei',
    license: 'Лицензия MIT',
    note: 'Перед установкой или обновлением закройте CsModular. После установки запустите его снова.',
    compatibility: 'Требуется CsModular с интеграцией библиотеки Pulvis (pulvis) и поддержкой импорта WAV.',
    selectFirst: 'Сначала выберите папку libraries из каталога установки CsModular.',
    absent: 'В выбранной папке хоста плагин не установлен.',
    installed: 'Установлена версия {version}.',
    working: 'Установка файлов плагина…',
    removing: 'Удаление файлов плагина…',
    installedDone: '«Пульвис» {version} установлен. Перезапустите CsModular, чтобы загрузить модули.',
    legacyDetected: 'Найдена старая копия в пользовательской библиотеке. Она может загружаться первой.',
    installedLegacy: 'Плагин установлен в папку хоста, но копия в пользовательской библиотеке может загружаться первой.',
    removedDone: 'Модули гранулярного синтеза удалены из выбранной папки хоста.',
    installConfirm: 'Установить или обновить «Пульвис» в этой папке хоста? Файлы плагина будут заменены.',
    removeConfirm: 'Удалить «Пульвис» из этой папки хоста?',
    permissionDenied: 'Нет прав на запись. Закройте CsModular и запустите установщик с правами администратора/root.',
    invalidFolder: 'Выберите папку libraries CsModular, в которой находится файл _index.json.',
    unsupportedHost: 'Это недопустимая папка libraries CsModular. Обновите CsModular и выберите её снова.',
    folderMissing: 'Выбранная папка не найдена. Выберите папку libraries CsModular ещё раз.',
    failed: 'Не удалось выполнить операцию: {error}',
    unavailable: 'Запустите установщик как настольное приложение.'
  }
};

const languageNames = { en: 'English', zh: '中文', ru: 'Русский' };
const languageFromLocale = value => {
  const locale = String(value || '').toLowerCase();
  return locale.startsWith('zh') ? 'zh' : locale.startsWith('ru') ? 'ru' : 'en';
};
const systemLanguage = languageFromLocale(navigator.language);
let language = systemLanguage;
let languageManuallySelected = false;
try {
  const savedLanguage = localStorage.getItem('pulvis-installer-language');
  if (Object.hasOwn(languageNames, savedLanguage)) {
    language = savedLanguage;
    languageManuallySelected = true;
  }
} catch {}
let words = text[language];
let current = null;
let busy = false;
let librariesDirectory = null;
let statusMessage = { key: 'detectingHost', values: {}, kind: '' };

try {
  librariesDirectory = localStorage.getItem('pulvis-libraries-directory') || null;
} catch {}

const invoke = window.__TAURI__?.core?.invoke;
const chooseButton = document.querySelector('#choose');
const installButton = document.querySelector('#install');
const uninstallButton = document.querySelector('#uninstall');
const versionNode = document.querySelector('.version');
versionNode.textContent = `v${INSTALLER_VERSION}`;
const statusNode = document.querySelector('#status');
const destinationNode = document.querySelector('#destination');
const languageNode = document.querySelector('#language');

function format(key, values = {}) {
  let message = words[key] || key;
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll('{' + name + '}', value);
  }
  return message;
}

function displayPath(value) {
  const path = String(value || '');
  const longUncPrefix = '\\\\?\\UNC\\';
  const longPathPrefix = '\\\\?\\';
  if (path.startsWith(longUncPrefix)) return `\\\\${path.slice(longUncPrefix.length)}`;
  return path.startsWith(longPathPrefix) ? path.slice(longPathPrefix.length) : path;
}

function say(key, values = {}, kind = '') {
  statusMessage = { key, values, kind };
  statusNode.textContent = format(key, values);
  statusNode.dataset.kind = kind;
  statusNode.closest('.status-line')?.setAttribute('data-kind', kind);
}

function applyLanguage(nextLanguage, persist = false) {
  language = nextLanguage;
  words = text[language];
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  document.title = words.appTitle;
  versionNode.setAttribute('aria-label', format('versionLabel', { version: INSTALLER_VERSION }));
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = words[node.dataset.i18n];
  });
  document.querySelector('.module-grid').setAttribute('aria-label', words.includedModules);
  languageNode.setAttribute('aria-label', words.languageLabel);
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  if (persist) {
    try {
      localStorage.setItem('pulvis-installer-language', language);
    } catch {}
  }

  const destination = displayPath(current?.destination || librariesDirectory) || words.selectFolder;
  destinationNode.textContent = destinationNode.title = destination;
  installButton.textContent = current?.installed ? words.update : words.install;
  say(statusMessage.key, statusMessage.values, statusMessage.kind);
}

function render(state) {
  current = state;
  const destination = displayPath(state.destination) || words.selectFolder;
  destinationNode.textContent = destination;
  destinationNode.title = destination;
  installButton.textContent = state.installed ? words.update : words.install;
  installButton.disabled = !librariesDirectory || !invoke;
  uninstallButton.disabled = !librariesDirectory || !state.installed || !invoke;

  if (state.installed && state.legacyUserCopyPresent) {
    say('installedLegacy', {}, 'error');
  } else if (state.legacyUserCopyPresent) {
    say('legacyDetected');
  } else {
    say(state.installed ? 'installed' : 'absent', { version: state.version || '—' }, state.installed ? 'success' : '');
  }
}

function renderNoHost() {
  current = null;

  destinationNode.textContent = words.selectFolder;
  destinationNode.title = words.selectFolder;
  installButton.disabled = true;
  uninstallButton.disabled = true;
  chooseButton.disabled = !invoke;
  say('hostNotFound');
}

function showError(error) {
  const message = String(error);
  if (message.startsWith('permission-denied')) {
    say('permissionDenied', {}, 'error');
  } else if (message.startsWith('library-folder-invalid')) {
    say('invalidFolder', {}, 'error');
  } else if (message.startsWith('library-folder-unsupported')) {
    say('unsupportedHost', {}, 'error');
  } else if (message.startsWith('library-folder-missing')) {
    say('folderMissing', {}, 'error');
  } else {
    say('failed', { error: message }, 'error');
  }
}

async function refresh() {
  if (!invoke) {
    destinationNode.textContent = words.selectFolder;
    installButton.disabled = true;
    uninstallButton.disabled = true;
    chooseButton.disabled = true;
    say('unavailable', {}, 'error');
    return;
  }

  chooseButton.disabled = false;
  if (!librariesDirectory) {
    renderNoHost();
    return;
  }

  installButton.disabled = true;
  uninstallButton.disabled = true;
  say('checking');
  try {
    render(await invoke('installer_status', { librariesDirectory }));
  } catch (error) {
    current = null;
    destinationNode.textContent = destinationNode.title = displayPath(librariesDirectory);
    installButton.textContent = words.install;
    installButton.disabled = true;
    uninstallButton.disabled = true;
    showError(error);
  }
}

async function initialize() {
  if (!invoke) {
    await refresh();
    return;
  }

  if (librariesDirectory) {
    say('checking');
    try {
      render(await invoke('installer_status', { librariesDirectory }));

      return;
    } catch (error) {
      if (String(error).startsWith('permission-denied')) {
        showError(error);
        return;
      }
      librariesDirectory = null;
      try {
        localStorage.removeItem('pulvis-libraries-directory');
      } catch {}
    }
  }

  destinationNode.textContent = words.selectFolder;
  say('detectingHost');
  try {
    const detectedDirectory = await invoke('detect_host_libraries_directory');

    if (detectedDirectory) {
      librariesDirectory = detectedDirectory;
      try {
        localStorage.setItem('pulvis-libraries-directory', detectedDirectory);
      } catch {}
      await refresh();
    } else {
      renderNoHost();
    }
  } catch (error) {

    renderNoHost();
    showError(error);
  }
}

document.querySelectorAll('[data-language]').forEach(button => {
  button.addEventListener('click', () => {
    languageManuallySelected = true;
    applyLanguage(button.dataset.language, true);
  });
});

async function exclusive(operation) {
  if (busy) return;
  busy = true;
  chooseButton.disabled = installButton.disabled = uninstallButton.disabled = true;
  try { await operation(); }
  finally {
    busy = false;
    chooseButton.disabled = !invoke;
    installButton.disabled = !invoke || !current;
    uninstallButton.disabled = !invoke || !current?.installed;
  }
}

chooseButton.addEventListener('click', () => exclusive(async () => {
  if (!invoke) return;
  chooseButton.disabled = true;
  try {
    const selected = await invoke('select_libraries_directory', {
      title: words.chooseFolderTitle,
      initialDirectory: displayPath(librariesDirectory)
    });
    if (selected) {
      librariesDirectory = selected;
      try {
        localStorage.setItem('pulvis-libraries-directory', selected);
      } catch {}
      await refresh();
    }
  } catch (error) {
    showError(error);
  }
}));

installButton.addEventListener('click', () => exclusive(async () => {
  if (!librariesDirectory) return;
  if ((current?.installed || current?.legacyUserCopyPresent) && !window.confirm(words.installConfirm)) return;
  installButton.disabled = true;
  uninstallButton.disabled = true;
  say('working');
  try {
    const state = await invoke('install_plugin', { librariesDirectory });
    render(state);
    if (state.legacyUserCopyPresent) {
      say('installedLegacy', {}, 'error');
    } else {
      say('installedDone', { version: state.version || INSTALLER_VERSION }, 'success');
    }
  } catch (error) {
    showError(error);
  }
}));

uninstallButton.addEventListener('click', () => exclusive(async () => {
  if (!librariesDirectory || !window.confirm(words.removeConfirm)) return;
  installButton.disabled = true;
  uninstallButton.disabled = true;
  say('removing');
  try {
    render(await invoke('uninstall_plugin', { librariesDirectory }));
    say('removedDone', {}, 'success');
  } catch (error) {
    showError(error);
  }
}));

applyLanguage(language);
if (!languageManuallySelected && invoke) {
  invoke('system_locale').then(locale => {
    const nativeLanguage = languageFromLocale(locale);
    if (!languageManuallySelected && language === 'en' && nativeLanguage !== 'en') {
      applyLanguage(nativeLanguage);
    }
  }).catch(() => {});
}
exclusive(initialize);
