import './module-menu.css';
import { positionContextMenu } from './positionContextMenu.js';
// src/ui/ModuleContextMenu.js
import { ColorPicker } from './ColorPicker.js';
import { localize } from '../utils/locale.js';
const IS_DEV = import.meta.env.DEV;
export class ModuleContextMenu {
  constructor(system) {
    this.system = system;
    this.menuElement = null;
    this.currentModule = null;

    this.createMenuElement();
    this.setupEventListeners();
    ColorPicker.injectStyles();
  }

  createMenuElement() {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'module-context-menu';
    document.body.appendChild(this.menuElement);
  }

  show(module, x, y) {
    if (this.system?.locked) {
      this.system.showNotification?.(localize({"en":"🔒 Patch is locked","zh":"🔒 补丁已锁定","ru":"🔒 Патч заблокирован"}));
      return;
    }
    this.currentModule = module;
    this.updateMenuContent();

    positionContextMenu(this.menuElement, x, y);

    if (this.system.contextMenu?.hide) this.system.contextMenu.hide();
    if (this.system.jackContextMenu?.hide) this.system.jackContextMenu.hide();
  }

  hide() {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
      this.currentModule = null;
    }
  }

  updateMenuContent() {
    if (!this.currentModule) return;

    this.menuElement.innerHTML = '';

    // === ЗАГОЛОВОК ===
    this.menuElement.appendChild(this.createHeader());

    if (this.currentModule.jsonName === 'GrainSample') {
      const slotControl = this.currentModule.components.find(c => String(c.id) === '14');
      const slot = Math.max(1, Math.min(8, Math.round(slotControl?.value ?? 1)));
      const sample = this.system.csoundEngine.grainSamples.slots.get(slot);
      const info = document.createElement('div');
      info.className = 'sample-info';
      const labels = {
        en: `Slot ${slot}: ${sample?.name || 'empty'} · kept for this session · stereo WAV uses its left channel`,
        zh: `采样槽 ${slot}：${sample?.name || '空'} · 仅保留在本次会话 · 立体声 WAV 使用左声道`,
        ru: `Слот ${slot}: ${sample?.name || 'пусто'} · только на время сеанса · у стерео WAV используется левый канал`,
      };
      info.textContent = localize(labels);
      this.menuElement.appendChild(info);
      const loadLabels = {
        en: `Load WAV → slot ${slot}…`,
        zh: `导入 WAV → 采样槽 ${slot}…`,
        ru: `Загрузить WAV → слот ${slot}…`,
      };
      this.menuElement.appendChild(this.createMenuItem(localize(loadLabels), () => {
        this.hide();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wav,audio/wav,audio/wave,audio/x-wav';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            await this.system.csoundEngine.loadGrainSample(slot, file);
            this.system.showNotification(localize({
              en: `Loaded ${file.name} into slot ${slot}. It will be available until the app closes.`,
              zh: `已将 ${file.name} 导入采样槽 ${slot}，关闭应用后需要重新导入。`,
              ru: `${file.name} загружен в слот ${slot}. После закрытия приложения его нужно загрузить снова.`,
            }));
          } catch (error) {
            this.system.showNotification(error.message);
          }
        };
        input.click();
      }));
    }

    // === LAYER SWITCHER ===
    const layerSection = document.createElement('div');
    layerSection.className = 'module-layers';
    const layerTitle = document.createElement('span');
    layerTitle.textContent = localize({en:'Layer', zh:'图层', ru:'Слой'});
    layerSection.append(layerTitle);
    const current = this.currentModule.layer || 'voice';
    for (const [layer, label] of [['voice', localize({en:'Voice', zh:'声部', ru:'Голос'})], ['fx', 'FX']]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.setAttribute('aria-pressed', String(current === layer));
      button.onclick = () => this.setLayer(layer);
      layerSection.append(button);
    }
    this.menuElement.append(layerSection);

    // === PANEL COLOR (per-module override, both theme modes) ===
    if (IS_DEV) {
        const colorSection = document.createElement('div');
        colorSection.style.cssText = `
                padding: 4px 8px;
                border-bottom: 1px solid #333;
            `;

        const colorTitle = document.createElement('div');
        colorTitle.style.cssText = `
                padding: 6px 8px;
                color: #aaa;
                font-size: 10px;
            `;
        colorTitle.textContent = localize({"en":"Panel color:","zh":"面板颜色：","ru":"Цвет панели:"});
        colorSection.appendChild(colorTitle);

        if (!this.colorPicker) {
            this.colorPicker = new ColorPicker({
                columns: 8,
                rows: 4,
                cellSize: 14,
                showReset: true,
                resetText: localize({"en":"↺ Follow theme","zh":"↺ 跟随系统主题","ru":"↺ Цвет темы"}),
                onSelect: (color) => this.changePanelColor(color),
                onReset: () => this.resetPanelColor(),
            });

            const pickerElement = this.colorPicker.create();
            colorSection.appendChild(pickerElement);
        } else {
            colorSection.appendChild(this.colorPicker.element);


        }

        this.colorPicker.setColor(this.currentModule.customColor);
        this.menuElement.appendChild(colorSection);
    }

    // === DELETE ===

    this.menuElement.appendChild(
      this.createMenuItem(
        localize({"en":"Delete module","zh":"删除模块","ru":"Удалить модуль"}),
        () => this.deleteModule(),
        'destructive',
      ),
    );
  }

  // ============================================================
  //  ЗАГОЛОВОК
  // ============================================================

  createHeader() {
    const header = document.createElement('div');
    header.className = 'module-menu-title';
    const title = document.createElement('span');
    title.textContent = this.currentModule?.title || localize({"en":"Module","zh":"模块","ru":"Модуль"});

    // ⭐ Категория (справа, серым) — вместо дублирующего jsonName
    const category = document.createElement('span');
    category.className = 'module-category';
    category.textContent = this._getModuleCategoryLabel();

    header.appendChild(title);
    header.appendChild(category);

    return header;
  }

  _getModuleCategoryLabel() {
      const m = this.currentModule;
      if (!m) return '';

      const category = m.category || this.system.moduleFactory?.moduleRegistry[m.jsonName]?.category;
      if (category) {
          const labels = {
              fx: { en: 'FX', zh: '效果', ru: 'Эффекты' },
              sample: { en: 'Sample', zh: '采样', ru: 'Сэмплы' },
              osc: { en: 'Oscillator', zh: '振荡器', ru: 'Осциллятор' },
          };
          return labels[category] ? localize(labels[category]) : category.charAt(0).toUpperCase() + category.slice(1);
      }
      if (m.isUser) return localize({"en":"User","zh":"用户","ru":"Пользователь"});
      return localize({"en":"Unknown","zh":"未知","ru":"Неизвестно"});
  }

  // ============================================================
  //  ПУНКТЫ МЕНЮ
  // ============================================================

  createMenuItem(text, onClick, variant = '') {
    const item = document.createElement('button');
    item.className = 'module-action ' + variant;
    item.textContent = text;
    item.onclick = (e) => {
      e.stopPropagation();
      onClick();
      this.hide();
    };

    return item;
  }

  setLayer(newLayer) {
    if (this.system?.locked) {
      this.system.showNotification?.(localize({"en":"🔒 Patch is locked","zh":"🔒 补丁已锁定","ru":"🔒 Патч заблокирован"}));
      return;
    }
    if (!this.currentModule) return;

    const currentLayer = this.currentModule.layer || 'voice';
    if (currentLayer === newLayer) return;

    const cables = this.system.patchManager.findCablesByModule(this.currentModule.moduleId);
    if (cables.length > 0) {
      const layerNames = { voice: localize({"en":"Voice","zh":"声部","ru":"Голос"}), fx: 'FX' };
      const ok = confirm(localize({
        en: `Module "${this.currentModule.title}" has ${cables.length} cable(s). Switching to ${layerNames[newLayer]} will remove them. Continue?`,
        zh: `模块“${this.currentModule.title}”有 ${cables.length} 条连线。切换到 ${layerNames[newLayer]} 层将删除这些连线。继续吗？`,
        ru: `У модуля «${this.currentModule.title}» кабелей: ${cables.length}. При смене слоя на ${layerNames[newLayer]} они будут удалены. Продолжить?`,
      }));
      if (!ok) return;

      cables.forEach(cable => {
        this.system.patchManager.removeCable(cable);
      });
    }

    const module = this.currentModule;

    this.system.layerManager.removeModuleFromLayer(module);

    this.system.csoundGen.removeModule(
      module.jsonId,
      module.jsonName || module.type,
      module.typeID,
      currentLayer
    );

    module.layer = newLayer;

    this.system.layerManager.addModuleToLayer(module, newLayer);

    this.system.csoundGen.addModule({
      typeId: module.jsonName || module.type,
      instanceId: module.jsonId,
      instanceName: module.jsonName || module.type,
      layer: newLayer,
      parameters: [],
      mode: [],
      defaultParams: [],
      defaultMode: [],
      inlets: 1,
      outlets: 1,
      isUser: false,
    });

    this.system._voiceDirty = true;
    this.system._fxDirty = true;
    this.system._cablesDirty = true;

    if (this.system.csoundEngine?.state === 'running') {
      this.system._recompileDebounced();
    }

    this.system.showNotification(`✓ ${module.title} → ${newLayer.toUpperCase()}`);
    this.hide();
  }

  // ============================================================
  //  ЦВЕТ ПАНЕЛИ
  // ============================================================

  getContrastColor(hexColor) {
    if (!hexColor) return '#000';

    const hex = hexColor.replace('#', '');

    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    } else if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    }

    return '#000000';
  }

  changePanelColor(colorHex) {
    if (!this.currentModule) return;

    if (this._changingColor) return;
    this._changingColor = true;

    this.currentModule.customColor = colorHex;
    this.currentModule.setDirty?.(true);

    if (this.currentModule.layer === 'voice') {
        this.system._voiceDirty = true;
    } else {
        this.system._fxDirty = true;
    }
    this.system.forceRedraw?.();
    this.system.showNotification(localize({en:'🎨 Panel color changed',zh:'🎨 面板颜色已更改',ru:'🎨 Цвет панели изменён'}));

    setTimeout(() => {
      this._changingColor = false;
    }, 100);
  }

  resetPanelColor() {
    if (!this.currentModule) return;

    if (this._changingColor) return;
    this._changingColor = true;

    this.currentModule.customColor = null;

    this.currentModule.setDirty?.(true);
    this.system.forceRedraw?.();

    this.system.showNotification(localize({en:'↺ Panel color reset to default',zh:'↺ 面板颜色已重置',ru:'↺ Восстановлен цвет панели по умолчанию'}));

    setTimeout(() => {
      this._changingColor = false;
    }, 100);
  }

  // ============================================================
  //  DELETE
  // ============================================================

  deleteModule() {
      if (this.system?.locked) {
          this.system.showNotification?.(localize({"en":"🔒 Patch is locked","zh":"🔒 补丁已锁定","ru":"🔒 Патч заблокирован"}));
          return;
      }
      if (!this.currentModule) return;

      this.system.removeModule(this.currentModule);
  }

  // ============================================================
  //  EVENTS / STYLES
  // ============================================================

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (
        this.menuElement &&
        !this.menuElement.contains(e.target) &&
        this.menuElement.style.display === 'block'
      ) {
        this.hide();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.menuElement.style.display === 'block') {
        this.hide();
      }
    });
  }

}
