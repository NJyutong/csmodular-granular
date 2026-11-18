# Troubleshooting

Known issues, workarounds, and fixes.

## HTML inside Csound ORC

**Symptom:** Csound fails to compile, ORC contains `<!DOCTYPE html>` or similar.

**Cause:** Vite SPA-fallback returns `index.html` for missing `/csound/modules/user/*.txt` (status 200, content-type HTML). The ORC then gets HTML instead of Csound code.

**Fix:** `_loadUdoByPath()` and `_fetchText()` both detect HTML via `looksLikeHtml()`. If you add a new UDO loader, **always** go through `libraryStore.loadUdo()` — never raw `fetch` for user UDOs.

## LED / MiniVU does not light up

**Symptom:** indicator renders but stays dark.

**Cause:** `sourceComponentId` missing, or points to a component that is not an Input/Output of the same module.

**Fix:** set `sourceComponentId` in the editor (Properties → *Source*) or in the module JS. On **Inputs** without a cable — disabled by design. On **Outputs** — tap-bus allocated automatically.

## Jack color changes when a cable is connected

**Cause:** jack painted with cable color (legacy bug).

**Fix:** jack color = its own `jackType`, never the cable's. `BaseJack.getEffectiveColor()`. `PatchManager` no longer paints jacks with cable color. `synchronizeInputCables` / `findColoredCable` removed.

## `logic` / `logicAudio` jacks turn red/blue

**Cause:** `logic`/`logicAudio` are a separate family. Only re-color to each other, and only if `dynamic`.

**In Csound:** both are `control` — no converter between them. `audio ↔ logicAudio`, `control ↔ logic`, `logic ↔ logicAudio` — no converter.

## MIDI dies after recompile

**Symptom:** MIDI works until a patch change; after recompile — silent.

**Cause:** `@csound/browser` IPC ports not recreated after recompile.

**Workaround:** restart Csound (reload page). Upstream issue.

## LED / oscilloscope erratic after load

**Cause:** `mappingTable` was not serialized for `Knob`/`Slider` — scope reads wrong bus.

**Fix:** `mappingTable` is serialized in `ComponentRegistry`. Re-save modules from the editor if they were created before this fix.

## HiDPI drag is off

**Cause:** `resizeCanvasToWindow` uses `dpr = 1` workaround.

**Status:** known, planned fix.
## 自由画布 / Free canvas / Свободный холст

- 中文：按住空白处左键拖动底板；也可空格加左键或中键拖动。滚轮上下移动，Shift+滚轮左右移动，Ctrl+滚轮缩放。模块可放在原点任意方向，也可远离其他模块；同层模块仍避免重叠。新保存的工程使用世界坐标，恢复后保留 FX 的位置。
- English: Drag empty space with the left button to pan; Space+left drag and middle drag also work. Wheel pans vertically, Shift+wheel horizontally, Ctrl+wheel zooms. Modules can use negative and distant coordinates. Same-layer collision checks remain active. New saves preserve world coordinates, including FX positions.
- Русский: Перетаскивайте пустое место левой кнопкой; также работают пробел+левая кнопка и средняя кнопка. Колесо перемещает по вертикали, Shift+колесо — по горизонтали, Ctrl+колесо меняет масштаб. Допустимы отрицательные и удалённые координаты. Модули одного слоя не перекрываются. Новые сохранения сохраняют мировые координаты, включая FX.
