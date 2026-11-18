import { localize } from '../utils/locale.js';
// File transport and metadata validation only. Csound decodes and processes audio.
export class GrainSamples {
    static MAX_FILE_BYTES = 256 * 1024 * 1024;
    static MAX_SESSION_BYTES = 512 * 1024 * 1024;
    static MAX_FILE_SECONDS = 300;
    // GEN01 expands each mono sample into the build's double-precision Csound table.
    static MAX_SESSION_FRAMES = 48_000_000;

    constructor() {
        this.slots = new Map();
        this.revision = 0;
        this.uploaded = new WeakMap();
    }

    async load(slot, file) {
        if (!Number.isInteger(slot) || slot < 1 || slot > 8) throw new Error(localize({"en":"Sample slot must be 1 to 8.","zh":"采样槽必须是 1 到 8。","ru":"Номер слота должен быть от 1 до 8."}));
        if (!file || !Number.isFinite(file.size) || file.size < 44) throw new Error(localize({"en":"Choose a valid WAV file.","zh":"请选择有效的 WAV 文件。","ru":"Выберите корректный файл WAV."}));
        if (file.size > GrainSamples.MAX_FILE_BYTES) throw new Error(localize({"en":"Each WAV file must be no larger than 256 MiB.","zh":"单个 WAV 文件不能超过 256 MiB。","ru":"Размер одного WAV не должен превышать 256 МиБ."}));
        const previous = this.slots.get(slot);
        const sessionBytes = [...this.slots.values()].reduce((sum, entry) => sum + entry.bytes.length, 0)
            - (previous?.bytes.length ?? 0);
        if (sessionBytes + file.size > GrainSamples.MAX_SESSION_BYTES) throw new Error(localize({"en":"This session supports up to 512 MiB of WAV files. Reload the app to clear samples.","zh":"当前会话最多可载入 512 MiB 的 WAV 文件，请先关闭应用后重新选择文件。","ru":"В одном сеансе можно загрузить до 512 МиБ WAV. Перезагрузите приложение, чтобы очистить сэмплы."}));
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.length !== file.size) throw new Error(localize({"en":"Could not read the complete file. Retry or choose a smaller WAV.","zh":"无法完整读取该文件，请重试或选择较小的 WAV 文件。","ru":"Не удалось прочитать файл полностью. Повторите попытку или выберите WAV меньшего размера."}));
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const tag = offset => String.fromCharCode(...bytes.subarray(offset, offset + 4));
        if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error(localize({"en":"Expected RIFF/WAVE. RF64 and big-endian WAV are not supported.","zh":"文件不是标准 RIFF/WAVE 格式；暂不支持 RF64 和大端 WAV。","ru":"Требуется RIFF/WAVE. RF64 и WAV с обратным порядком байтов не поддерживаются."}));
        let format, frames = 0;
        for (let offset = 12; offset + 8 <= bytes.length;) {
            const size = view.getUint32(offset + 4, true), start = offset + 8;
            if (start + size > bytes.length) throw new Error(localize({"en":"WAV data is incomplete; the file may be damaged.","zh":"WAV 文件数据不完整，文件可能已损坏。","ru":"Данные WAV неполны; возможно, файл повреждён."}));
            if (tag(offset) === 'fmt ' && size >= 16) {
                let code = view.getUint16(start, true);
                if (code === 0xfffe && size >= 40) {
                    const tail = [0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];
                    const standardGuid = view.getUint16(start + 28, true) === 0
                        && view.getUint16(start + 30, true) === 0x0010
                        && tail.every((v, i) => bytes[start + 32 + i] === v);
                    if (!standardGuid) throw new Error(localize({"en":"This WAV uses an unsupported extended audio encoding.","zh":"该 WAV 使用了不支持的扩展音频编码。","ru":"Этот WAV использует неподдерживаемый расширенный формат аудио."}));
                    code = view.getUint32(start + 24, true);
                }
                format = { code, channels: view.getUint16(start + 2, true),
                    rate: view.getUint32(start + 4, true), align: view.getUint16(start + 12, true), bits: view.getUint16(start + 14, true) };
            }
            if (tag(offset) === 'data') frames += size;
            offset = start + size + size % 2;
        }
        if (!format || ![1, 3].includes(format.code) || ![1, 2].includes(format.channels)
            || ![8, 16, 24, 32, 64].includes(format.bits) || (format.code === 3 && ![32, 64].includes(format.bits))
            || (format.code === 1 && format.bits === 64)
            || format.align !== format.channels * format.bits / 8 || format.rate < 8000 || format.rate > 192000
            || frames % format.align !== 0 || frames / format.align < 2) {
            throw new Error(localize({"en":"Use mono/stereo WAV, 8–192 kHz, PCM 8/16/24/32-bit or IEEE float32/64, with at least 2 audio frames.","zh":"WAV 格式暂不支持。请使用 8–192 kHz、单声道或立体声的 PCM 8/16/24/32 位、IEEE float32/64，且文件至少包含 2 帧音频。","ru":"Используйте моно/стерео WAV, 8–192 кГц, PCM 8/16/24/32 бит или IEEE float32/64, не менее 2 кадров."}));
        }
        const frameCount = frames / format.align;
        const seconds = frameCount / format.rate;
        if (seconds > GrainSamples.MAX_FILE_SECONDS) throw new Error(localize({"en":"Each WAV may be up to 5 minutes long.","zh":"单个 WAV 最长支持 5 分钟。","ru":"Длительность одного WAV не должна превышать 5 минут."}));
        const sessionFrames = [...this.slots.values()].reduce((sum, entry) => sum + entry.frames, 0)
            - (previous?.frames ?? 0);
        if (sessionFrames + frameCount > GrainSamples.MAX_SESSION_FRAMES) {
            throw new Error(localize({"en":"Decoded samples exceed 48 million mono frames. Reload the app and load fewer or shorter samples.","zh":"当前会话的采样总时长或采样率过高。单声道解码缓冲最多支持 4,800 万帧；请关闭应用并减少已载入采样。","ru":"Превышен предел 48 миллионов монофонических кадров. Перезагрузите приложение и загрузите меньше сэмплов или укоротите их."}));
        }
        const entry = { bytes, frames: frameCount, name: file.name, path: `grain-${slot}-${++this.revision}.wav` };
        this.slots.set(slot, entry);
        return entry;
    }

    async upload(csound) {
        let paths = this.uploaded.get(csound);
        if (!paths) { paths = new Set(); this.uploaded.set(csound, paths); }
        // reset() retains files. Remove superseded revisions before writing the next bank.
        const active = new Set(Array.from(this.slots.values(), entry => entry.path));
        for (const path of paths) {
            if (!active.has(path)) {
                await csound.fs.unlink(path);
                paths.delete(path);
            }
        }
        for (const { path, bytes } of this.slots.values()) {
            // reset() preserves the virtual filesystem. beta33 must not overwrite files.
            if (paths.has(path)) continue;
            // beta33 reports only the last buffer size to GEN01 after appendFile.
            await csound.fs.writeFile(path, bytes);
            paths.add(path);
        }
    }

    orchestra() {
        const lines = [];
        for (let slot = 1; slot <= 8; slot++) {
            const entry = this.slots.get(slot);
            lines.push(entry
                ? `giGrainSample${slot} ftgen 0, 0, 0, -1, "${entry.path}", 0, 0, 1`
                : `giGrainSample${slot} ftgen 0, 0, 2, -2, 0`);
        }
        lines.push(`giGrainSampleTables[] fillarray ${Array.from({ length: 8 }, (_, i) => `giGrainSample${i + 1}`).join(', ')}`);
        lines.push(`giGrainSampleFrames[] fillarray ${Array.from({ length: 8 }, (_, i) => `ftlen(giGrainSample${i + 1})`).join(', ')}`);
        lines.push(`giGrainSampleRates[] fillarray ${Array.from({ length: 8 }, (_, i) => this.slots.has(i + 1) ? `ftsr(giGrainSample${i + 1})` : 'sr').join(', ')}`);
        return lines.join('\n');
    }
}
