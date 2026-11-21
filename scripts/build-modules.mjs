// Generate plain object UI definitions accepted by CsModular's module loader.
// Shared scheduling/playback DSP lives only in csound/GrainCore.txt.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const copy = (en, zh, ru) => ({ en, zh, ru });
const controls = [
    ['Density', copy('Grains/s', '颗粒/秒', 'Гранул/с'), 0, 120, 24, 120],
    ['Size', copy('Size ms', '粒长 ms', 'Длина, мс'), 2, 400, 80, 200],
    ['Position', copy('Position', '位置', 'Позиция'), 0, 127, 32, 1],
    ['PosJitter', copy('Pos. jitter', '位置抖动', 'Разбр. поз.'), 0, 127, 8, 1],
    ['Pitch', copy('Pitch st', '音高（半音）', 'Высота, пт'), -48, 48, 0, 12],
    ['PitchJitter', copy('Pitch jitter', '音高抖动 st', 'Разбр. выс.'), 0, 24, 0, 12],
    ['Window', copy('Window', '颗粒包络', 'Окно'), 0, 2, 0, 2],
    ['Pan', copy('Pan', '声像', 'Панорама'), 0, 127, 64, 1],
    ['Spread', copy('Pan spread', '声像扩展', 'Разбр. пан.'), 0, 127, 64, 1],
    ['Freeze', copy('Freeze', '冻结', 'Заморозка'), 0, 1, 0, 1],
    ['Mix', copy('Wet mix', '干湿比', 'Микс'), 0, 127, 127, 1],
    ['Level', copy('Output dB', '输出电平 dB', 'Уровень, дБ'), -24, 12, -3, 12],
    ['Seed', copy('Seed', '随机种子', 'Зерно'), 0, 65534, 1, 0],
    ['TimeJitter', copy('Time jitter %', '时间散布 %', 'Разбр. вр.'), 0, 100, 0, 1],
    ['Reverse', copy('Direction', '播放方向', 'Направл.'), 0, 1, 0, 1],
    ['Feedback', copy('Feedback', '反馈', 'Обратная связь'), 0, 0.95, 0, 0.25],
];
const normalized = new Set(['Position', 'PosJitter', 'Pan', 'Spread', 'Mix']);
const names = ['GrainFreeze', 'GrainSample', 'GrainOsc'];
const demoDefaults = new Map();
await mkdir(resolve(root, 'modules'), { recursive: true });
for (const name of names) {
    const sample = name === 'GrainSample';
    const live = name === 'GrainFreeze';
    const densityLimit = live || sample ? 24 : 48;
    const densityDefault = live || sample ? 12 : 24;
    const moduleControls = controls.map(([key, label, min, max, value, scale]) => key === 'Density'
        ? [key, label, 0, densityLimit, densityDefault, densityLimit]
        : [key, label, min, max, value, scale])
        .filter(([key]) => (live || key !== 'Mix')
            && (live || key !== 'Feedback'));
    const controlIndex = new Map(controls.map(([key], index) => [key, index]));
    const paramId = key => {
        if (key === 'Slot') return 14;
        if (key === 'Scan') return 15;
        if (key === 'Wave') return 14;
        if (key === 'TimeJitter') return live ? 14 : sample ? 16 : 15;
        if (key === 'Reverse') return live ? 15 : sample ? 17 : 16;
        if (key === 'Source') return 16;
        if (key === 'Feedback') return 17;
        if (key === 'Capture') return 18;
        return controlIndex.get(key) + 1;
    };
    const paramControls = moduleControls.filter(([key]) => key !== 'TimeJitter');
    const timeJitterControl = moduleControls.find(([key]) => key === 'TimeJitter');
    const params = sample
        ? [...paramControls.filter(([key]) => key !== 'Reverse'), ['Slot', copy('Slot', '采样槽', 'Слот'), 1, 8, 1, 0], ['Scan', copy('Scan %/s', '扫描 %/秒', 'Скан %/с'), -100, 100, 0, 0], timeJitterControl, moduleControls.find(([key]) => key === 'Reverse')]
        : live ? [...moduleControls.filter(([key]) => key !== 'Feedback'), ['Source', copy('Source', '播放来源', 'Источник'), 0, 1, 0, 0], moduleControls.find(([key]) => key === 'Feedback'), ['Capture', copy('Capture snapshot', '捕捉快照', 'Сохранить снимок'), 0, 1, 0, 0]]
            : [...paramControls.filter(([key]) => key !== 'Reverse'), ['Wave', copy('Wave', '波形', 'Волна'), 0, 3, 0, 0], timeJitterControl, moduleControls.find(([key]) => key === 'Reverse')];
    const source = live ? copy('LIVE RING (8s) · connect audio in first', '实时环形缓冲（8秒）· 先连接音频输入', 'БУФЕР 8 С · сначала подключите аудиовход') : sample ? copy('WAV ENGINE (8 slots) · right-click → Load WAV', 'WAV 采样引擎（8槽）· 右键 → 导入 WAV', 'СЭМПЛЕР (8 слотов) · ПКМ → загрузить WAV') : copy('WAVE: 0 sine · 1 tri · 2 saw · 3 square', '波形：0 正弦 · 1 三角 · 2 锯齿 · 3 方波', 'Волна: 0 син · 1 треуг · 2 пила · 3 меандр');
    const hint = live ? copy('Workflow: Record → Freeze → Capture → Snapshot','流程：录入 → 冻结 → 捕捉快照 → 切至快照','Поток: Запись → Стоп → Снимок → Источник')
        : sample ? copy('1. Pick slot (1–8)  2. Right-click load  3. Scan','1. 选槽 (1–8)  2. 右键导入 WAV  3. 调节扫描','1. Слот (1–8)  2. ПКМ: загрузить WAV  3. Скан')
            : copy('Pitch 0 = 220 Hz (A3) · ▲ marks 0 center','音高 0 = 220 Hz（A3）· ▲ 指示零位','Высота 0 = 220 Гц (A3) · ▲ метка нуля');
    const components = [
        {componentType:'TextLabel',id:'900',x:16,y:21,text:source.en,textI18n:source,fontSize:10},
        {componentType:'TextLabel',id:'901',x:256,y:21,text:hint.en,textI18n:hint,fontSize:10},
        {componentType:'Line',id:'920',x:12,y:94,length:476,orientation:'Horizontal',width:1,color:'#1e293b'},
    ];
    // Keep parameter and jack IDs in their original order; only visual positions change.
    // Widescreen 6-column x 3-row Bento studio deck layout (500 x 304 px):
    // Left Deck (Cols 0..2): Source/Buffer/Carrier + Grain Core + Mode/Snapshot
    // Right Deck (Cols 3..5): Pitch/Phase Scatter + Stereo/Mix + Timing/Info
    const rows = live
        ? [['Freeze','Position','PosJitter','Pitch','PitchJitter','Seed'],
           ['Density','Size','Window','Mix','Spread','Level'],
           ['Source','Feedback','Capture','Pan','TimeJitter','Reverse']]
        : sample
            ? [['Slot','Position','Scan','Pitch','PosJitter','PitchJitter'],
               ['Density','Size','Window','Pan','Spread','Level'],
               ['Freeze','Reverse',null,'TimeJitter','Seed']]
            : [['Wave','Position','Pitch','PosJitter','PitchJitter','Seed'],
               ['Density','Size','Window','Pan','Spread','Level'],
               ['Freeze','Reverse','TimeJitter']];
    const colX = [18, 94, 170, 264, 340, 416];
    const rowY = [120, 168, 216];
    const customPos = sample
        ? { Freeze: [42, 216], Reverse: [142, 216], TimeJitter: [288, 216], Seed: [390, 216] }
        : !live
            ? { PosJitter: [264, 136], PitchJitter: [340, 136], Seed: [416, 136], Pan: [264, 208], Spread: [340, 208], Level: [416, 208] }
            : {};
    const leftDeckTitle = live
        ? copy('Live Ring Buffer & Grain Core','实时环形缓冲与颗粒核','Кольцевой буфер и ядро гранул')
        : sample
            ? copy('WAV Slot Scan & Grain Core','WAV 采样扫描与颗粒核','Слот WAV, скан и ядро гранул')
            : copy('Carrier Tone Warp & Grain Core','载波音色扭曲与颗粒核','Осциллятор, фаза и ядро гранул');
    const rightDeckTitle = live
        ? copy('Pitch Scatter, Wet Mix & Timing','音高散布、干湿混音与时序','Высота, микс и тайминг')
        : sample
            ? copy('Pitch Scatter & Stereo Output','音高散布与立体声场输出','Разброс высоты и стереовыход')
            : copy('Phase/Pitch Jitter & Stereo Out','相位音高抖动与立体声输出','Разброс фазы/высоты и стерео');
    components.push(
        {componentType:'TextLabel',id:'910',x:18,y:104,text:leftDeckTitle.en,textI18n:leftDeckTitle,fontSize:11},
        {componentType:'TextLabel',id:'911',x:264,y:104,text:rightDeckTitle.en,textI18n:rightDeckTitle,fontSize:11},
    );
    params.forEach(([key, baseLabel, min, max, value]) => {
        let label = baseLabel;
        // A new Grain Osc must start as the plain wave it names: warp depth and start-phase jitter default to 0.
        // (Sample and Freeze keep 32 / 8, where these knobs mean a source position.)
        if (!live && !sample && (key === 'Position' || key === 'PosJitter')) value = 0;
        // File and built-in sources start 12 dB lower to keep level margin when grains overlap.
        // Freeze remains at -3 dB so its processed voice input is not unexpectedly quiet.
        if (!live && key === 'Level') value = -12;
        if (key === "Freeze" && !live) label = sample ? copy("Hold pos.", "锁定位置", "Фикс. поз.") : copy("Hold warp", "锁定扭曲", "Фикс. фазы");
        if (key === "Position") label = live ? copy("Lookback", "回看位置", "В прошлое") : sample ? copy("Position", "采样位置", "Позиция") : copy("Phase warp", "相位扭曲", "Деф. фазы");
        if (key === "Level") label = copy("Output dB", "输出电平 dB", "Уровень, дБ");
        // Position jitter varies the grain start on all three sources.
        if (key === "PosJitter") label = live ? copy("Lookback jit.", "回看抖动", "Разбр. буф.") : sample ? copy("Pos. jitter", "位置抖动", "Разбр. поз.") : copy("Phase jitter", "相位抖动", "Разбр. фазы");
        if (key === "Pitch" && !live && !sample) label = copy("Pitch (0=A3)", "音高（0=A3）", "Высота (A3)");
        const row = rows.findIndex(keys=>keys.includes(key));
        if(row<0)throw new Error('Missing layout for '+key);
        const col = rows[row].indexOf(key);
        const [x, y] = customPos[key] || [colX[col], rowY[row]];
        const selector = ['Window','Freeze','Reverse','Source'].includes(key);
        const bipolar = ['Pitch','Scan','Level'].includes(key);
        const items = key === 'Window' ? copy('Hann,Triangle,Blackman','汉宁窗,三角窗,布莱克曼窗','Ханн,Треуг.,Блэкман')
            : key === 'Reverse' ? copy('Forward,Reverse','正向,反向','Вперёд,Назад')
                : key === 'Source' ? copy('Live,Snapshot','实时,快照','Вход,Снимок')
                    : live ? copy('Record,Freeze','录入,冻结','Запись,Стоп') : copy('Follow,Hold','跟随,锁定','Следить,Фикс.');
        const id = paramId(key);
        const originalControlIndex = controlIndex.get(key);
        if (key === 'Capture') {
            components.push({componentType:'ButtonText',id:String(id),x,y:y+15,width:68,height:18,text:label.en,textI18n:label,
                initialState:false,mode:'momentary',returnState:false,csoundName:key});
        } else {
            components.push(selector
                ? {componentType:'ButtonIncDec',id:String(id),x,y:y+17,width:58,items:items.en,itemsI18n:items,initialIndex:value,
                    ...(items.en.split(',').length === 2 ? {binaryThreshold:true} : {indexValue:true}),csoundName:key}
                : {componentType:'Knob',id:String(id),x,y:y+13,size:'medium',min,max,defaultValue:value,
                    ...(bipolar ? {snapping:true} : {}),csoundName:key === 'Position' && !live && !sample ? 'PhaseWarp' : key});
            components.push({ componentType: 'TextLabel', id: String(299 + id), x, y,
                text: label.en, textI18n: label, fontSize: 10 });
        }
        if (originalControlIndex !== undefined && key !== 'Seed') components.push({ componentType: 'Input', id: String(102 + originalControlIndex),
            x: x + (selector ? 61 : 55), y: y + 16, jackType: 'control', bandwidth: 'static', ConnectorName: `${label.en} CV`,
            connectorNameI18n: { en: `${label.en} CV`, zh: `${label.zh} 调制输入`, ru: `Модуляция: ${label.ru}` } });
    });
    const footerBusLabel = live
        ? copy('8s Ring · Stereo Out →', '8秒环 · 立体声输出 →', 'Буфер 8 с · Стерео →')
        : sample
            ? copy('WAV Stereo Out (L / R) →', 'WAV 立体声输出 (左 / 右) →', 'Стерео WAV (Л / П) →')
            : copy('Grain Stereo Out (L / R) →', '颗粒立体声输出 (左 / 右) →', 'Стереовыход (Л / П) →');
    components.push(
        {componentType:'Line',id:'926',x:12,y:266,length:476,orientation:'Horizontal',width:1,color:'#1e293b'},
        {componentType:'TextLabel',id:'932',x:264,y:275,text:footerBusLabel.en,textI18n:footerBusLabel,fontSize:10},
    );
    for (const [id, componentType, x, label] of [
        ...(live ? [[101, 'Input', 102, copy('Audio in', '音频输入', 'Аудиовход')]] : []),
        [201, 'Output', 426, copy('L', '左', 'Л')], [202, 'Output', 468, copy('R', '右', 'П')],
    ]) {
        components.push({ componentType, id: String(id), x, y: 274,
            jackType: 'audio', bandwidth: 'static', ConnectorName: label.en, connectorNameI18n: label });
        components.push({ componentType: 'TextLabel', id: String(500 + id), x: id === 101 ? 22 : x - 14, y: 275,
            text: label.en, textI18n: label, fontSize: 10 });
    }
    const displayName = live ? copy('Pulvis Grain Freeze', '微粒 · 颗粒冻结', 'Пульвис · Гранулярная заморозка')
        : sample ? copy('Pulvis Grain Sample', '微粒 · 颗粒采样', 'Пульвис · Гранулярный сэмпл')
            : copy('Pulvis Grain Osc', '微粒 · 颗粒振荡器', 'Пульвис · Гранулярный осциллятор');
    const tip = live ? copy('Records an 8 s live ring for granular playback. Freeze stops recording; Capture copies the current ring into a private snapshot table. Choose Live or Snapshot independently of Sample WAV slots. Reverse changes grain playback direction. Feedback (0–0.95) feeds wet grains back into recording and limits stored peaks to ±1; 0 is the clean linear default. Up to 64 grains at once.',
            '录入 8 秒实时环形缓冲供颗粒播放。冻结会停止录音；“捕捉快照”把当前缓冲复制到 Freeze 私有表。实时／快照来源独立于 Sample 的 WAV 槽。反向会改变颗粒播放方向。反馈（0–0.95）把湿声颗粒回送录音，并将写入峰值限制在 ±1；默认 0 保持干净线性。最多同时 64 个颗粒。',
            'Записывает 8-секундный кольцевой буфер для гранул. «Стоп» останавливает запись; «Снимок» копирует буфер в отдельную таблицу Freeze. Источники «Вход/Снимок» не связаны со слотами WAV модуля Sample. «Назад» меняет направление гранул. Обратная связь (0–0,95) возвращает влажный сигнал в запись и ограничивает пики записи уровнем ±1; значение 0 сохраняет чистый линейный тракт. До 64 гранул одновременно.')
        : sample ? copy('Standalone WAV source. Right-click to load a WAV into the selected slot; an empty slot is silent. Scan moves through the file (percent per second; Hold pauses it). Reverse plays grains backward. Timing scatter varies trigger times independently from Position jitter while keeping mean density. Up to 64 grains at once. Small jacks beside knobs add modulation.',
            '独立 WAV 声源，无需音频输入。右键导入当前槽的 WAV；空槽无声。“扫描”让位置在文件中移动，锁定会暂停。反向会倒放颗粒。时间散布独立于位置抖动改变触发时刻，同时保持平均粒速。最多同时 64 个颗粒；可调制控件旁的小插孔可叠加控制信号。',
            'Самостоятельный WAV-источник, аудиовход не нужен. ПКМ — загрузить файл в выбранный слот; пустой слот молчит. «Скан.» двигает позицию по файлу (% в секунду; фиксация останавливает ход). Обратное направление проигрывает гранулы назад. Разброс времени отдельно от позиции меняет запуски, сохраняя среднюю плотность. До 64 гранул. Малые гнёзда принимают CV.')
        : copy('Grain generator with a built-in wave (sine, triangle, saw or square), no input needed. Pitch 0 = 220 Hz (A3). Phase warp reshapes phase progression within each cycle; phase jitter varies each grain start. Forward/reverse changes grain direction. Time scatter independently varies trigger times while keeping their mean rate. Seed repeats both random sequences. Up to 64 grains at once. Small jacks beside knobs add modulation.',
                '内置正弦、三角、锯齿或方波的颗粒发生器，无需输入。音高 0 = 220 Hz（A3）。相位扭曲改变周期内的相位推进；相位抖动改变每颗粒起始相位。正向／反向改变颗粒方向。时间散布独立改变触发时刻，同时保持平均粒速。Seed 可复现两组随机序列。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。',
                'Генератор гранул со встроенной синусоидой, треугольником, пилой или меандром. Высота 0 = 220 Гц (A3). Деформация меняет ход фазы, разброс фазы — старт гранулы. Направление «вперёд/назад» меняет ход гранулы. Разброс времени независимо меняет моменты запуска, сохраняя среднюю плотность. Seed повторяет обе случайные последовательности. До 64 гранул одновременно. Малые гнёзда принимают CV.');
    const def = { type: name, displayName: displayName.en, displayNameI18n: displayName,
        category: live ? 'fx' : sample ? 'sample' : 'osc',
        status: 'passable', pulvisStudio: true, pulvisVersion: packageJson.version, width: 500, height: 300, gridHeight: 20, originalName: name, defaultParams: [],
        tooltip: tip.en, tooltipI18n: tip,
        params: params.map(([key]) => paramId(key)),
        inputs: [...(live ? [101] : []), ...moduleControls
            .filter(([key]) => key !== 'Seed')
            .map(([key]) => 102 + controlIndex.get(key))],
        outputs: [201, 202], components };
    // Saved patches address parameter values by component ID, including gaps.
    const demoParameters = Array(Math.max(...def.params) + 1).fill(0);
    for (const component of components) {
        const id = Number(component.id);
        if (def.params.includes(id)) demoParameters[id] = component.defaultValue ?? component.initialIndex ?? (component.initialState ? 1 : 0);
    }
    demoDefaults.set(name, demoParameters);
    await writeFile(resolve(root, 'modules', `${name}.js`), `export const ${name}Module = ${JSON.stringify(def, null, 4)};\n`);
    const cvControls = moduleControls.filter(([key]) => key !== 'Seed');
    const args = [...params.map(([key]) => `k${key}`), ...(live ? ['kAudioIn'] : []), ...cvControls.map(([key]) => `k${key}In`), 'kOutL', 'kOutR'];
    const lines = [';@ requires GrainCore.txt', 'opcode ' + name + ', 0, ' + 'k'.repeat(args.length) + 'o', '    ' + args.join(', ') + ', iDisplay xin', '    aDry = 0'];
    if (live) lines.push('    aDry zar kAudioIn');
    for (const [key, , , , , scale] of cvControls) {
        lines.push(`    k${key}CV zkr k${key}In`);
        lines.push(`    k${key} = k${key}${key === 'TimeJitter' ? ' / 100' : normalized.has(key) ? ' / 127' : ''} + k${key}CV * ${scale}`);
    }
    lines.push(`    kDensity limit kDensity, 0, ${densityLimit}`, '    kSize limit kSize, 2, 400');
    if (sample) {
        // Pause at the current offset on zero speed or Hold. A different file starts at the knob position.
        lines.push('    kSlot = int(limit(kSlot, 1, 8) + 0.5) - 1',
            '    kScanPhase init 0', '    kPreviousScanSlot init -1',
            '    if kSlot != kPreviousScanSlot then',
            '        kScanPhase = 0', '        kPreviousScanSlot = kSlot',
            '    elseif kFreeze < 0.5 && kScan != 0 then',
            '        kScanPhase = kScanPhase + kScan / (100 * kr)',
            '        kScanPhase = kScanPhase - floor(kScanPhase)',
            '    endif',
            '    if kScanPhase != 0 then',
            '        kPosition = kPosition + kScanPhase',
            '        kPosition = kPosition - floor(kPosition)',
            '    endif');
    }
    if (live) lines.push('    iRingFrames = int(8 * sr)', '    iRing ftgentmp 0, 0, -iRingFrames, -2, 0',
        '    iSnapshotA ftgentmp 0, 0, -iRingFrames, -2, 0', '    iSnapshotB ftgentmp 0, 0, -iRingFrames, -2, 0',
        '    kTable = iRing', '    kSnapshotA = iSnapshotA', '    kSnapshotB = iSnapshotB', '    kFrames = iRingFrames', '    kRate = sr');
    else if (sample) lines.push('    kTable = giGrainSampleTables[kSlot]', '    kFrames = giGrainSampleFrames[kSlot]', '    kRate = giGrainSampleRates[kSlot]');
    else {
        // Select a harmonic budget at the highest pitch in the jitter range.
        // Every band uses one period of the same length to preserve the carrier phase.
        const bands = [24, 12, 6, 3];
        const waves = [
            ['Triangle', n => n > 15 || n % 2 === 0 ? 0 : ((n - 1) / 2 % 2 ? -1 : 1) / (n * n)],
            ['Saw', n => 1 / n],
            ['Square', n => n % 2 ? 1 / n : 0],
        ];
        lines.push('    iFrames = ftlen(giSin)');
        for (const [wave, amplitude] of waves) {
            for (const harmonics of bands) {
                const coefficients = Array.from({ length: harmonics }, (_, i) => amplitude(i + 1).toFixed(9));
                lines.push(`    i${wave}${harmonics} ftgentmp 0, 0, iFrames, 10, ${coefficients.join(', ')}`);
            }
        }
        const tables = ['giSin', ...waves.flatMap(([wave]) => [
            ...bands.map(harmonics => `i${wave}${harmonics}`), 'giSin',
        ])];
        const bandIndex = bands.reduceRight((otherwise, harmonics, index) =>
            `(kHarmonicBudget >= ${harmonics} ? ${index} : ${otherwise})`, String(bands.length));
        lines.push(`    iWaveTables[] fillarray ${tables.join(', ')}`,
            '    kWave = int(limit(kWave, 0, 3) + 0.5)',
            '    kHighestPitch = limit(kPitch + limit(kPitchJitter, 0, 24), -48, 48)',
            '    kHarmonicBudget = (sr * 0.5) / (220 * pow(2, kHighestPitch / 12))',
            `    kBand = ${bandIndex}`,
            `    kTableIndex = (kWave == 0 ? 0 : 1 + (kWave - 1) * ${bands.length + 1} + kBand)`,
            '    kTable = iWaveTables[kTableIndex]',
            '    kFrames = iFrames', '    kRate = 220 * kFrames');
    }
    const coreExtras = live
        ? 'kReverse, kFeedback, kSource, kSnapshotA, kSnapshotB, kCapture'
        : 'kReverse, 0, 0, 0, 0, 0';
    lines.push(`    aWetL, aWetR CMGrainCoreExtended aDry, ${live ? 1 : sample ? 0 : 2}, kTable, kFrames, kRate, kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed, kTimeJitter, ${coreExtras}, iDisplay`,
        '    kLevel limit kLevel, -24, 12', '    kLevel = pow(10, kLevel / 20)', '    aLevel interp kLevel');
    if (live) lines.push('    kMix limit kMix, 0, 1', '    aMix interp kMix',
        '    aOutL limit ((1 - aMix) * aDry + aMix * aWetL) * aLevel, -1, 1',
        '    aOutR limit ((1 - aMix) * aDry + aMix * aWetR) * aLevel, -1, 1');
    else lines.push('    aOutL limit aWetL * aLevel, -1, 1', '    aOutR limit aWetR * aLevel, -1, 1');
    lines.push('    if iDisplay > 0 then');
    if (sample) lines.push('        tablewkt kSlot + 1, 659, iDisplay');
    if (!live && !sample) lines.push('        tablewkt kWave, 659, iDisplay', '        tablewkt kBand, 660, iDisplay');
    lines.push('        CMPulvisOutputView aOutL, iDisplay', '    endif',
        '    if kOutL > 1 then', '        zaw aOutL, kOutL', '    endif',
        '    if kOutR > 1 then', '        zaw aOutR, kOutR', '    endif', 'endop', '');
    await writeFile(resolve(root, 'modules', `${name}.txt`), lines.join('\n'));
}
const moduleDisplayNames = {
    GrainFreeze: copy('Pulvis Grain Freeze', '微粒 · 颗粒冻结', 'Пульвис · Гранулярная заморозка'),
    GrainSample: copy('Pulvis Grain Sample', '微粒 · 颗粒采样', 'Пульвис · Гранулярный сэмпл'),
    GrainOsc: copy('Pulvis Grain Osc', '微粒 · 颗粒振荡器', 'Пульвис · Гранулярный осциллятор'),
};
await writeFile(resolve(root, '_index.json'), JSON.stringify({ modules: names.map(name => ({ name,
    displayName: moduleDisplayNames[name].en, displayNameI18n: moduleDisplayNames[name],
    category: name === 'GrainFreeze' ? 'fx' : name === 'GrainSample' ? 'sample' : 'osc', status: 'passable' })) }, null, 2) + '\n');
await writeFile(resolve(root, '_meta.json'), JSON.stringify({
    name: 'pulvis',
    displayName: 'Pulvis',
    displayNameI18n: copy('Pulvis', '微粒', 'Пульвис'),
    version: packageJson.version,
    description: 'Original Csound granular synthesis: live ring, sample table and periodic wave sources.',
}, null, 2) + '\n');
await mkdir(resolve(root, 'examples'), { recursive: true });
const module = (name, id, x, y, values) => ({ name, library: name.startsWith('Grain') ? 'pulvis' : 'my-lib', id, type: 0,
    parameters: JSON.stringify(values), modes: [], area: 'VOICE', hpos: x, vpos: y });
const cable = (from, output, to, input) => ({ from: { id: from, jack: output, pin: 'out' }, to: { id: to, jack: input, pin: 'in' }, type: 'out-in', area: 'VOICE' });
await writeFile(resolve(root, 'examples/pulvis-demo.json'), JSON.stringify({ filename: 'pulvis-demo.json',
    modules: [module('GrainOsc',1,1,2,demoDefaults.get('GrainOsc')), module('GrainFreeze',2,27,2,demoDefaults.get('GrainFreeze')), module('Outs2',3,27,22,[0,0,0,1]), module('GrainSample',4,1,22,demoDefaults.get('GrainSample'))],
    cables: [cable(1,0,2,0),cable(2,0,3,0),cable(2,1,3,1)], stickers: [], textpad: 'EN: Grain Osc → Grain Freeze → Outs2. Record, Freeze, then Capture and choose Snapshot. Grain Sample stays an independent WAV source.\n中文：Grain Osc → Grain Freeze → Outs2。录入后冻结，再捕捉快照并选择“快照”。Grain Sample 始终是独立 WAV 声源。\nРусский: Grain Osc → Grain Freeze → Outs2. Запишите, остановите, сохраните снимок и выберите «Снимок». Grain Sample остаётся отдельным WAV-источником.' }, null, 2) + '\n');
