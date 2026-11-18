// Generate plain object UI definitions accepted by CsModular's module loader.
// Shared scheduling/playback DSP lives only in csound/GrainCore.txt.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copy = (en, zh, ru) => ({ en, zh, ru });
const controls = [
    ['Density', copy('Grains/s', '颗粒/秒', 'Гранул/с'), 0, 200, 24, 100],
    ['Size', copy('Size ms', '粒长（ms）', 'Длина, мс'), 2, 500, 80, 250],
    ['Position', copy('Position', '位置', 'Позиция'), 0, 127, 32, 1],
    ['PosJitter', copy('Position jitter', '位置抖动', 'Разброс поз.'), 0, 127, 8, 1],
    ['Pitch', copy('Pitch st', '音高（半音）', 'Высота, пт'), -48, 48, 0, 12],
    ['PitchJitter', copy('Pitch jitter', '音高抖动（半音）', 'Разброс выс.'), 0, 24, 0, 12],
    ['Window', copy('Grain window', '颗粒包络', 'Окно гранулы'), 0, 1, 0, 1],
    ['Pan', copy('Pan', '声像', 'Панорама'), 0, 127, 64, 1],
    ['Spread', copy('Pan spread', '声像扩展', 'Разброс пан.'), 0, 127, 64, 1],
    ['Freeze', copy('Freeze', '冻结', 'Заморозка'), 0, 1, 0, 1],
    ['Mix', copy('Wet mix', '干湿比', 'Микс'), 0, 127, 127, 1],
    ['Level', copy('Output level', '输出电平', 'Уровень'), 0, 127, 90, 1],
    ['Seed', copy('Random seed', '随机种子', 'Случ. зерно'), 0, 65534, 1, 0],
];
const normalized = new Set(['Position', 'PosJitter', 'Pan', 'Spread', 'Mix', 'Level']);
const names = ['GrainFreeze', 'GrainSample', 'GrainOsc'];
await mkdir(resolve(root, 'modules'), { recursive: true });
for (const name of names) {
    const sample = name === 'GrainSample';
    const live = name === 'GrainFreeze';
    const params = sample
        ? [...controls, ['Slot', copy('Sample slot', '采样槽', 'Слот сэмпла'), 1, 8, 1, 0], ['Scan', copy('Scan %/s', '扫描 %/秒', 'Скан. %/с'), -100, 100, 0, 0]]
        : live ? controls
            : [...controls, ['Wave', copy('Waveform', '波形', 'Форма волны'), 0, 3, 0, 0]];
    const source = live ? copy('LIVE: connect audio first', '实时处理：先连接音频输入', 'Вход: подключите звук') : sample ? copy('FILE: right-click → Load WAV', '文件播放：右键 → 导入 WAV', 'Файл: ПКМ → загрузить WAV') : copy('WAVE: 0 sine · 1 tri · 2 saw · 3 square', '波形：0 正弦 · 1 三角 · 2 锯齿 · 3 方波', 'Волна: 0 син · 1 треуг · 2 пила · 3 меандр');
    const hint = live ? copy('Record, then Freeze','先录入再冻结','Запись → заморозка')
        : sample ? copy('Empty slot is silent','空槽无声','Пустой слот молчит')
            : copy('Pitch 0 = 220 Hz (A3)','音高 0 = 220 Hz（A3）','Высота 0 = 220 Гц (A3)');
    const components = [{componentType:'TextLabel',id:'900',x:12,y:25,text:source.en,textI18n:source,fontSize:10},
        {componentType:'TextLabel',id:'901',x:12,y:40,text:hint.en,textI18n:hint,fontSize:9}];
    // Keep parameter and jack IDs in their original order; only visual positions change.
    // Controls that shape the first sound come first; randomness stays together; rarely needed controls last.
    const rows = live
        ? [['Freeze','Position','PosJitter'], ['Density','Size','Window'], ['Pitch','PitchJitter','Seed'], ['Mix','Spread','Level'], ['Pan']]
        : sample
            ? [['Slot','Position','Scan'], ['Density','Size','Pitch'], ['Window','PosJitter','PitchJitter'], ['Pan','Spread','Level'], ['Freeze','Mix','Seed']]
            : [['Wave','Position','Pitch'], ['Density','Size','Window'], ['PosJitter','PitchJitter','Seed'], ['Pan','Spread','Level'], ['Freeze','Mix']];
    const rowY = [86,174,231,323,414];
    const randomness = copy('2 · Shape & randomness','2 · 颗粒塑形与随机','2 · Форма и случайность');
    const sections = [
        [64, live ? copy('1 · Record & freeze','1 · 录入与冻结','1 · Запись и захват') : sample ? copy('1 · WAV source','1 · WAV 文件声源','1 · Источник WAV') : copy('1 · Tone','1 · 音色','1 · Тон')],
        [152, randomness],
        [301, live ? copy('3 · Mix & output','3 · 混合与输出','3 · Микс и выход') : copy('3 · Stereo output','3 · 立体声输出','3 · Стереовыход')],
        [392, live ? copy('Advanced · stereo centre','进阶 · 声像中心','Далее · центр панорамы') : copy('Advanced · hold & dry input','进阶 · 锁定与干声混合','Далее · фиксация и микс')],
    ];
    sections.forEach(([y,label],i)=>components.push({componentType:'TextLabel',id:String(910+i),x:12,y,text:label.en,textI18n:label,fontSize:11}));
    params.forEach(([key, baseLabel, min, max, value], n) => {
        let label = baseLabel;
        // A new Grain Osc must start as the plain wave it names: warp depth and start-phase jitter default to 0.
        // (Sample and Freeze keep 32 / 8, where these knobs mean a source position.)
        if (!live && !sample && (key === 'Position' || key === 'PosJitter')) value = 0;
        if (key === "Freeze" && !live) label = sample ? copy("Hold position", "锁定位置", "Фикс. позицию") : copy("Hold warp", "锁定扭曲", "Фикс. деформ.");
        if (key === "Position") label = live ? copy("Lookback", "回看位置", "В прошлое") : sample ? copy("Sample position", "采样位置", "Позиция файла") : copy("Phase warp", "相位扭曲", "Деформ. фазы");
        // Position jitter varies the grain start on all three sources.
        if (key === "PosJitter") label = live ? copy("Lookback jitter", "回看抖动", "Разброс назад") : sample ? copy("Position jitter", "位置抖动", "Разброс поз.") : copy("Phase jitter", "相位抖动", "Разброс фазы");
        if (key === "Pitch" && !live && !sample) label = copy("Pitch st (0=A3)", "音高（0=A3）", "Высота (0=A3)");
        if (key === "Mix") label = live ? copy("Dry/wet", "干湿比", "Сухой/влажн.") : copy("Grain/dry mix", "颗粒/干声比", "Гран./сухой");
        const row = rows.findIndex(keys=>keys.includes(key));
        if(row<0)throw new Error('Missing layout for '+key);
        const x = 12 + rows[row].indexOf(key) * 82, y = rowY[row];
        const selector = key === 'Window' || key === 'Freeze';
        const items = key === 'Window' ? copy('Hann,Triangle','汉宁窗,三角窗','Ханн,Треуг.') : live ? copy('Record,Freeze','录入,冻结','Запись,Стоп') : copy('Follow,Hold','跟随,锁定','Следить,Фикс.');
        components.push(selector
            ? {componentType:'ButtonIncDec',id:String(n+1),x,y:y+20,width:57,items:items.en,itemsI18n:items,initialIndex:value,binaryThreshold:true,csoundName:key}
            : {componentType:'Knob',id:String(n+1),x,y:y+14,size:'medium',min,max,defaultValue:value,csoundName:key === 'Position' && !live && !sample ? 'PhaseWarp' : key});
        components.push({ componentType: 'TextLabel', id: String(300 + n), x, y,
            text: label.en, textI18n: label, fontSize: 9 });
        if (n < 12) components.push({ componentType: 'Input', id: String(102 + n),
            x: x + (selector ? 66 : 39), y: y + 17, jackType: 'control', bandwidth: 'static', ConnectorName: `${label.en} CV`,
            connectorNameI18n: { en: `${label.en} CV`, zh: `${label.zh} 调制输入`, ru: `Модуляция: ${label.ru}` } });
    });
    for (const [id, componentType, x, label] of [
        [101, 'Input', 18, live ? copy('Audio in', '音频输入', 'Аудиовход') : copy('Dry in (optional)', '干声输入（可选）', 'Сухой (необяз.)')],
        [201, 'Output', 168, copy('L', '左', 'Л')], [202, 'Output', 216, copy('R', '右', 'П')],
    ]) {
        components.push({ componentType, id: String(id), x, y: 499,
            jackType: 'audio', bandwidth: 'static', ConnectorName: label.en, connectorNameI18n: label });
        components.push({ componentType: 'TextLabel', id: String(500 + id), x: x - 3, y: 480,
            text: label.en, textI18n: label, fontSize: 10 });
    }
    const displayName = live ? copy('Grain Freeze', '颗粒冻结', 'Гранулярная заморозка')
        : sample ? copy('Grain Sample', '颗粒采样', 'Гранулярный сэмпл')
            : copy('Grain Osc', '颗粒振荡器', 'Гранулярный осциллятор');
    const tip = live ? copy('Freezes live audio into grains. Density = grains per second, Size = grain length, Lookback = how far back in the last ~4 s. Up to 64 grains at once. Small jacks beside knobs add modulation.',
            '把实时音频冻结成颗粒。颗粒/秒 = 每秒颗粒数，粒长 = 每颗粒时长，回看位置 = 回到最近约 4 秒中的哪里。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。',
            'Замораживает живой звук в гранулы. Плотность — гранул в секунду, длина — длительность, «в прошлое» — на сколько назад в последних ~4 с. До 64 гранул одновременно. Малые гнёзда рядом с регуляторами принимают модуляцию.')
        : sample ? copy('Plays a loaded WAV as grains. Right-click to load a WAV into the selected slot; an empty slot is silent. Scan moves the position through the file by itself (percent of the file per second; Hold pauses it). Up to 64 grains at once. Small jacks beside knobs add modulation.',
            '把导入的 WAV 切成颗粒播放。右键把 WAV 导入当前采样槽；空槽没有声音。“扫描”让位置自动在文件中移动（每秒走过文件的百分比；“锁定位置”会暂停它）。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。',
            'Воспроизводит загруженный WAV гранулами. ПКМ — загрузить WAV в выбранный слот; пустой слот молчит. «Скан.» сам двигает позицию по файлу (% файла в секунду; фиксация его останавливает). До 64 гранул одновременно. Малые гнёзда рядом с регуляторами принимают модуляцию.')
            : copy('Grain generator with a built-in wave (sine, triangle, saw or square), no input needed. Pitch 0 = 220 Hz (A3). Phase warp reshapes phase progression within each cycle and changes harmonic balance; 0 leaves the selected wave unchanged. Phase jitter varies the starting phase of each grain, with Seed setting the repeatable sequence. Up to 64 grains at once. Small jacks beside knobs add modulation.',
                '内置波形（正弦、三角、锯齿、方波）的颗粒发生器，无需输入。音高 0 = 220 Hz（A3）。相位扭曲会在每个周期内改变相位推进速度并重塑谐波；0 保持所选波形不变。相位抖动会改变每个颗粒在波表中的起始相位，Seed 决定可重复的随机序列。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。',
                'Генератор гранул со встроенной волной (синус, треугольник, пила, меандр), вход не нужен. Высота 0 = 220 Гц (A3). Деформация фазы меняет её ход внутри каждого цикла и перераспределяет гармоники; 0 оставляет выбранную волну без изменений. Разброс фазы меняет начальную фазу для каждой гранулы, а Seed задаёт повторяемую последовательность. До 64 гранул одновременно. Малые гнёзда рядом с регуляторами принимают модуляцию.');
    const def = { type: name, displayName: displayName.en, displayNameI18n: displayName,
        category: live ? 'fx' : sample ? 'sample' : 'osc',
        status: 'passable', gridHeight: 35, originalName: name, defaultParams: [],
        tooltip: tip.en, tooltipI18n: tip,
        params: params.map((_, i) => i + 1), inputs: Array.from({ length: 13 }, (_, i) => 101 + i),
        outputs: [201, 202], components };
    await writeFile(resolve(root, 'modules', `${name}.js`), `export const ${name}Module = ${JSON.stringify(def, null, 4)};\n`);
    const args = [...params.map(([key]) => `k${key}`), 'kAudioIn', ...controls.slice(0, 12).map(([key]) => `k${key}In`), 'kOutL', 'kOutR'];
    const lines = [';@ requires GrainCore.txt', 'opcode ' + name + ', 0, ' + 'k'.repeat(args.length), '    ' + args.join(', ') + ' xin', '    aDry zar kAudioIn'];
    for (const [key, , , , , scale] of controls.slice(0, 12)) {
        lines.push(`    k${key}CV zkr k${key}In`);
        lines.push(`    k${key} = k${key}${normalized.has(key) ? ' / 127' : ''} + k${key}CV * ${scale}`);
    }
    if (sample) {
        // Automatic position scan: a phase that walks through the file; Hold (Freeze) pauses it, zero returns to the knob.
        lines.push('    kScanPhase init 0',
            '    if kScan == 0 then', '        kScanPhase = 0', '    else',
            '        if kFreeze < 0.5 then', '            kScanPhase = kScanPhase + kScan / (100 * kr)', '            kScanPhase = kScanPhase - floor(kScanPhase)', '        endif',
            '        kPosition = kPosition + kScanPhase', '        kPosition = kPosition - floor(kPosition)', '    endif');
    }
    if (live) lines.push('    iRing ftgentmp 0, 0, -192000, -2, 0', '    kTable = iRing', '    kFrames = 192000', '    kRate = sr');
    else if (sample) lines.push('    kSlot = int(limit(kSlot, 1, 8) + 0.5) - 1', '    kTable = giGrainSampleTables[kSlot]', '    kFrames = giGrainSampleFrames[kSlot]', '    kRate = giGrainSampleRates[kSlot]');
    else {
        // One period per table, same length as giSin, so the 220 Hz root and wrap logic are shared. Peaks are normalised by GEN10.
        const series = (count, amp) => Array.from({ length: count }, (_, i) => amp(i + 1).toFixed(9)).join(', ');
        const triangle = series(15, n => n % 2 ? ((n - 1) / 2 % 2 ? -1 : 1) / (n * n) : 0);
        const saw = series(24, n => 1 / n);
        const square = series(23, n => n % 2 ? 1 / n : 0);
        lines.push('    iFrames = ftlen(giSin)',
            `    iTriangle ftgentmp 0, 0, iFrames, 10, ${triangle}`,
            `    iSaw ftgentmp 0, 0, iFrames, 10, ${saw}`,
            `    iSquare ftgentmp 0, 0, iFrames, 10, ${square}`,
            '    kWave = int(limit(kWave, 0, 3) + 0.5)',
            '    kTable = (kWave == 0 ? giSin : (kWave == 1 ? iTriangle : (kWave == 2 ? iSaw : iSquare)))',
            '    kFrames = iFrames', '    kRate = 220 * kFrames');
    }
    lines.push(`    aWetL, aWetR CMGrainCore aDry, ${live ? 1 : sample ? 0 : 2}, kTable, kFrames, kRate, kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed`,
        '    kMix limit kMix, 0, 1', '    kLevel limit kLevel, 0, 1',
        '    aMix interp kMix', '    aLevel interp kLevel',
        '    aOutL limit ((1 - aMix) * aDry + aMix * aWetL) * aLevel, -1, 1',
        '    aOutR limit ((1 - aMix) * aDry + aMix * aWetR) * aLevel, -1, 1',
        '    zaw aOutL, kOutL', '    zaw aOutR, kOutR', 'endop', '');
    await writeFile(resolve(root, 'modules', `${name}.txt`), lines.join('\n'));
}
await writeFile(resolve(root, '_index.json'), JSON.stringify({ modules: names.map(name => ({ name, displayName: name.replace('Grain', 'Grain '), category: name === 'GrainFreeze' ? 'fx' : name === 'GrainSample' ? 'sample' : 'osc', status: 'passable' })) }, null, 2) + '\n');
await writeFile(resolve(root, '_meta.json'), JSON.stringify({ name: 'granular', displayName: 'Granular', version: '0.1.0', description: 'Original Csound granular synthesis: live ring, sample table and periodic wave sources.' }, null, 2) + '\n');
await mkdir(resolve(root, 'examples'), { recursive: true });
const module = (name, id, x, y, values) => ({ name, library: name.startsWith('Grain') ? 'granular' : 'my-lib', id, type: 0,
    parameters: JSON.stringify(values), modes: [], area: 'VOICE', hpos: x, vpos: y });
const cable = (from, output, to, input) => ({ from: { id: from, jack: output, pin: 'out' }, to: { id: to, jack: input, pin: 'in' }, type: 'out-in', area: 'VOICE' });
const defaults = [0, ...controls.map(c => c[4])];
await writeFile(resolve(root, 'examples/granular-demo.json'), JSON.stringify({ filename: 'granular-demo.json',
    modules: [module('GrainOsc',1,2,4,[...defaults.map((v, i) => (i === 3 || i === 4 ? 0 : v)), 0]), module('GrainFreeze',2,17,4,defaults), module('Outs2',3,32,12,[0,0,0,1]), module('GrainSample',4,32,17,[...defaults,1,0])],
    cables: [cable(1,0,2,0),cable(2,0,3,0),cable(2,1,3,1)], stickers: [], textpad: 'Grain Osc -> Grain Freeze -> Outs2. Grain Sample: right-click to load a WAV into its selected slot. Connect its L/R to Outs2 to audition it.' }, null, 2) + '\n');
