export const GrainOscModule = {
    "type": "GrainOsc",
    "displayName": "Grain Osc",
    "displayNameI18n": {
        "en": "Grain Osc",
        "zh": "颗粒振荡器",
        "ru": "Гранулярный осциллятор"
    },
    "category": "osc",
    "status": "passable",
    "gridHeight": 35,
    "originalName": "GrainOsc",
    "defaultParams": [],
    "tooltip": "Grain generator with a built-in wave (sine, triangle, saw or square), no input needed. Pitch 0 = 220 Hz (A3). Phase warp reshapes phase progression within each cycle and changes harmonic balance; 0 leaves the selected wave unchanged. Phase jitter varies the starting phase of each grain, with Seed setting the repeatable sequence. Up to 64 grains at once. Small jacks beside knobs add modulation.",
    "tooltipI18n": {
        "en": "Grain generator with a built-in wave (sine, triangle, saw or square), no input needed. Pitch 0 = 220 Hz (A3). Phase warp reshapes phase progression within each cycle and changes harmonic balance; 0 leaves the selected wave unchanged. Phase jitter varies the starting phase of each grain, with Seed setting the repeatable sequence. Up to 64 grains at once. Small jacks beside knobs add modulation.",
        "zh": "内置波形（正弦、三角、锯齿、方波）的颗粒发生器，无需输入。音高 0 = 220 Hz（A3）。相位扭曲会在每个周期内改变相位推进速度并重塑谐波；0 保持所选波形不变。相位抖动会改变每个颗粒在波表中的起始相位，Seed 决定可重复的随机序列。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。",
        "ru": "Генератор гранул со встроенной волной (синус, треугольник, пила, меандр), вход не нужен. Высота 0 = 220 Гц (A3). Деформация фазы меняет её ход внутри каждого цикла и перераспределяет гармоники; 0 оставляет выбранную волну без изменений. Разброс фазы меняет начальную фазу для каждой гранулы, а Seed задаёт повторяемую последовательность. До 64 гранул одновременно. Малые гнёзда рядом с регуляторами принимают модуляцию."
    },
    "params": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
    ],
    "inputs": [
        101,
        102,
        103,
        104,
        105,
        106,
        107,
        108,
        109,
        110,
        111,
        112,
        113
    ],
    "outputs": [
        201,
        202
    ],
    "components": [
        {
            "componentType": "TextLabel",
            "id": "900",
            "x": 12,
            "y": 25,
            "text": "WAVE: 0 sine · 1 tri · 2 saw · 3 square",
            "textI18n": {
                "en": "WAVE: 0 sine · 1 tri · 2 saw · 3 square",
                "zh": "波形：0 正弦 · 1 三角 · 2 锯齿 · 3 方波",
                "ru": "Волна: 0 син · 1 треуг · 2 пила · 3 меандр"
            },
            "fontSize": 10
        },
        {
            "componentType": "TextLabel",
            "id": "901",
            "x": 12,
            "y": 40,
            "text": "Pitch 0 = 220 Hz (A3)",
            "textI18n": {
                "en": "Pitch 0 = 220 Hz (A3)",
                "zh": "音高 0 = 220 Hz（A3）",
                "ru": "Высота 0 = 220 Гц (A3)"
            },
            "fontSize": 9
        },
        {
            "componentType": "TextLabel",
            "id": "910",
            "x": 12,
            "y": 64,
            "text": "1 · Tone",
            "textI18n": {
                "en": "1 · Tone",
                "zh": "1 · 音色",
                "ru": "1 · Тон"
            },
            "fontSize": 11
        },
        {
            "componentType": "TextLabel",
            "id": "911",
            "x": 12,
            "y": 152,
            "text": "2 · Shape & randomness",
            "textI18n": {
                "en": "2 · Shape & randomness",
                "zh": "2 · 颗粒塑形与随机",
                "ru": "2 · Форма и случайность"
            },
            "fontSize": 11
        },
        {
            "componentType": "TextLabel",
            "id": "912",
            "x": 12,
            "y": 301,
            "text": "3 · Stereo output",
            "textI18n": {
                "en": "3 · Stereo output",
                "zh": "3 · 立体声输出",
                "ru": "3 · Стереовыход"
            },
            "fontSize": 11
        },
        {
            "componentType": "TextLabel",
            "id": "913",
            "x": 12,
            "y": 392,
            "text": "Advanced · hold & dry input",
            "textI18n": {
                "en": "Advanced · hold & dry input",
                "zh": "进阶 · 锁定与干声混合",
                "ru": "Далее · фиксация и микс"
            },
            "fontSize": 11
        },
        {
            "componentType": "Knob",
            "id": "1",
            "x": 12,
            "y": 188,
            "size": "medium",
            "min": 0,
            "max": 200,
            "defaultValue": 24,
            "csoundName": "Density"
        },
        {
            "componentType": "TextLabel",
            "id": "300",
            "x": 12,
            "y": 174,
            "text": "Grains/s",
            "textI18n": {
                "en": "Grains/s",
                "zh": "颗粒/秒",
                "ru": "Гранул/с"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "102",
            "x": 51,
            "y": 191,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Grains/s CV",
            "connectorNameI18n": {
                "en": "Grains/s CV",
                "zh": "颗粒/秒 调制输入",
                "ru": "Модуляция: Гранул/с"
            }
        },
        {
            "componentType": "Knob",
            "id": "2",
            "x": 94,
            "y": 188,
            "size": "medium",
            "min": 2,
            "max": 500,
            "defaultValue": 80,
            "csoundName": "Size"
        },
        {
            "componentType": "TextLabel",
            "id": "301",
            "x": 94,
            "y": 174,
            "text": "Size ms",
            "textI18n": {
                "en": "Size ms",
                "zh": "粒长（ms）",
                "ru": "Длина, мс"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "103",
            "x": 133,
            "y": 191,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Size ms CV",
            "connectorNameI18n": {
                "en": "Size ms CV",
                "zh": "粒长（ms） 调制输入",
                "ru": "Модуляция: Длина, мс"
            }
        },
        {
            "componentType": "Knob",
            "id": "3",
            "x": 94,
            "y": 100,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 0,
            "csoundName": "PhaseWarp"
        },
        {
            "componentType": "TextLabel",
            "id": "302",
            "x": 94,
            "y": 86,
            "text": "Phase warp",
            "textI18n": {
                "en": "Phase warp",
                "zh": "相位扭曲",
                "ru": "Деформ. фазы"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "104",
            "x": 133,
            "y": 103,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Phase warp CV",
            "connectorNameI18n": {
                "en": "Phase warp CV",
                "zh": "相位扭曲 调制输入",
                "ru": "Модуляция: Деформ. фазы"
            }
        },
        {
            "componentType": "Knob",
            "id": "4",
            "x": 12,
            "y": 245,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 0,
            "csoundName": "PosJitter"
        },
        {
            "componentType": "TextLabel",
            "id": "303",
            "x": 12,
            "y": 231,
            "text": "Phase jitter",
            "textI18n": {
                "en": "Phase jitter",
                "zh": "相位抖动",
                "ru": "Разброс фазы"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "105",
            "x": 51,
            "y": 248,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Phase jitter CV",
            "connectorNameI18n": {
                "en": "Phase jitter CV",
                "zh": "相位抖动 调制输入",
                "ru": "Модуляция: Разброс фазы"
            }
        },
        {
            "componentType": "Knob",
            "id": "5",
            "x": 176,
            "y": 100,
            "size": "medium",
            "min": -48,
            "max": 48,
            "defaultValue": 0,
            "csoundName": "Pitch"
        },
        {
            "componentType": "TextLabel",
            "id": "304",
            "x": 176,
            "y": 86,
            "text": "Pitch st (0=A3)",
            "textI18n": {
                "en": "Pitch st (0=A3)",
                "zh": "音高（0=A3）",
                "ru": "Высота (0=A3)"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "106",
            "x": 215,
            "y": 103,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Pitch st (0=A3) CV",
            "connectorNameI18n": {
                "en": "Pitch st (0=A3) CV",
                "zh": "音高（0=A3） 调制输入",
                "ru": "Модуляция: Высота (0=A3)"
            }
        },
        {
            "componentType": "Knob",
            "id": "6",
            "x": 94,
            "y": 245,
            "size": "medium",
            "min": 0,
            "max": 24,
            "defaultValue": 0,
            "csoundName": "PitchJitter"
        },
        {
            "componentType": "TextLabel",
            "id": "305",
            "x": 94,
            "y": 231,
            "text": "Pitch jitter",
            "textI18n": {
                "en": "Pitch jitter",
                "zh": "音高抖动（半音）",
                "ru": "Разброс выс."
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "107",
            "x": 133,
            "y": 248,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Pitch jitter CV",
            "connectorNameI18n": {
                "en": "Pitch jitter CV",
                "zh": "音高抖动（半音） 调制输入",
                "ru": "Модуляция: Разброс выс."
            }
        },
        {
            "componentType": "ButtonIncDec",
            "id": "7",
            "x": 176,
            "y": 194,
            "width": 57,
            "items": "Hann,Triangle",
            "itemsI18n": {
                "en": "Hann,Triangle",
                "zh": "汉宁窗,三角窗",
                "ru": "Ханн,Треуг."
            },
            "initialIndex": 0,
            "binaryThreshold": true,
            "csoundName": "Window"
        },
        {
            "componentType": "TextLabel",
            "id": "306",
            "x": 176,
            "y": 174,
            "text": "Grain window",
            "textI18n": {
                "en": "Grain window",
                "zh": "颗粒包络",
                "ru": "Окно гранулы"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "108",
            "x": 242,
            "y": 191,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Grain window CV",
            "connectorNameI18n": {
                "en": "Grain window CV",
                "zh": "颗粒包络 调制输入",
                "ru": "Модуляция: Окно гранулы"
            }
        },
        {
            "componentType": "Knob",
            "id": "8",
            "x": 12,
            "y": 337,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 64,
            "csoundName": "Pan"
        },
        {
            "componentType": "TextLabel",
            "id": "307",
            "x": 12,
            "y": 323,
            "text": "Pan",
            "textI18n": {
                "en": "Pan",
                "zh": "声像",
                "ru": "Панорама"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "109",
            "x": 51,
            "y": 340,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Pan CV",
            "connectorNameI18n": {
                "en": "Pan CV",
                "zh": "声像 调制输入",
                "ru": "Модуляция: Панорама"
            }
        },
        {
            "componentType": "Knob",
            "id": "9",
            "x": 94,
            "y": 337,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 64,
            "csoundName": "Spread"
        },
        {
            "componentType": "TextLabel",
            "id": "308",
            "x": 94,
            "y": 323,
            "text": "Pan spread",
            "textI18n": {
                "en": "Pan spread",
                "zh": "声像扩展",
                "ru": "Разброс пан."
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "110",
            "x": 133,
            "y": 340,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Pan spread CV",
            "connectorNameI18n": {
                "en": "Pan spread CV",
                "zh": "声像扩展 调制输入",
                "ru": "Модуляция: Разброс пан."
            }
        },
        {
            "componentType": "ButtonIncDec",
            "id": "10",
            "x": 12,
            "y": 434,
            "width": 57,
            "items": "Follow,Hold",
            "itemsI18n": {
                "en": "Follow,Hold",
                "zh": "跟随,锁定",
                "ru": "Следить,Фикс."
            },
            "initialIndex": 0,
            "binaryThreshold": true,
            "csoundName": "Freeze"
        },
        {
            "componentType": "TextLabel",
            "id": "309",
            "x": 12,
            "y": 414,
            "text": "Hold warp",
            "textI18n": {
                "en": "Hold warp",
                "zh": "锁定扭曲",
                "ru": "Фикс. деформ."
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "111",
            "x": 78,
            "y": 431,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Hold warp CV",
            "connectorNameI18n": {
                "en": "Hold warp CV",
                "zh": "锁定扭曲 调制输入",
                "ru": "Модуляция: Фикс. деформ."
            }
        },
        {
            "componentType": "Knob",
            "id": "11",
            "x": 94,
            "y": 428,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 127,
            "csoundName": "Mix"
        },
        {
            "componentType": "TextLabel",
            "id": "310",
            "x": 94,
            "y": 414,
            "text": "Grain/dry mix",
            "textI18n": {
                "en": "Grain/dry mix",
                "zh": "颗粒/干声比",
                "ru": "Гран./сухой"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "112",
            "x": 133,
            "y": 431,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Grain/dry mix CV",
            "connectorNameI18n": {
                "en": "Grain/dry mix CV",
                "zh": "颗粒/干声比 调制输入",
                "ru": "Модуляция: Гран./сухой"
            }
        },
        {
            "componentType": "Knob",
            "id": "12",
            "x": 176,
            "y": 337,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 90,
            "csoundName": "Level"
        },
        {
            "componentType": "TextLabel",
            "id": "311",
            "x": 176,
            "y": 323,
            "text": "Output level",
            "textI18n": {
                "en": "Output level",
                "zh": "输出电平",
                "ru": "Уровень"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "113",
            "x": 215,
            "y": 340,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Output level CV",
            "connectorNameI18n": {
                "en": "Output level CV",
                "zh": "输出电平 调制输入",
                "ru": "Модуляция: Уровень"
            }
        },
        {
            "componentType": "Knob",
            "id": "13",
            "x": 176,
            "y": 245,
            "size": "medium",
            "min": 0,
            "max": 65534,
            "defaultValue": 1,
            "csoundName": "Seed"
        },
        {
            "componentType": "TextLabel",
            "id": "312",
            "x": 176,
            "y": 231,
            "text": "Random seed",
            "textI18n": {
                "en": "Random seed",
                "zh": "随机种子",
                "ru": "Случ. зерно"
            },
            "fontSize": 9
        },
        {
            "componentType": "Knob",
            "id": "14",
            "x": 12,
            "y": 100,
            "size": "medium",
            "min": 0,
            "max": 3,
            "defaultValue": 0,
            "csoundName": "Wave"
        },
        {
            "componentType": "TextLabel",
            "id": "313",
            "x": 12,
            "y": 86,
            "text": "Waveform",
            "textI18n": {
                "en": "Waveform",
                "zh": "波形",
                "ru": "Форма волны"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "101",
            "x": 18,
            "y": 499,
            "jackType": "audio",
            "bandwidth": "static",
            "ConnectorName": "Dry in (optional)",
            "connectorNameI18n": {
                "en": "Dry in (optional)",
                "zh": "干声输入（可选）",
                "ru": "Сухой (необяз.)"
            }
        },
        {
            "componentType": "TextLabel",
            "id": "601",
            "x": 15,
            "y": 480,
            "text": "Dry in (optional)",
            "textI18n": {
                "en": "Dry in (optional)",
                "zh": "干声输入（可选）",
                "ru": "Сухой (необяз.)"
            },
            "fontSize": 10
        },
        {
            "componentType": "Output",
            "id": "201",
            "x": 168,
            "y": 499,
            "jackType": "audio",
            "bandwidth": "static",
            "ConnectorName": "L",
            "connectorNameI18n": {
                "en": "L",
                "zh": "左",
                "ru": "Л"
            }
        },
        {
            "componentType": "TextLabel",
            "id": "701",
            "x": 165,
            "y": 480,
            "text": "L",
            "textI18n": {
                "en": "L",
                "zh": "左",
                "ru": "Л"
            },
            "fontSize": 10
        },
        {
            "componentType": "Output",
            "id": "202",
            "x": 216,
            "y": 499,
            "jackType": "audio",
            "bandwidth": "static",
            "ConnectorName": "R",
            "connectorNameI18n": {
                "en": "R",
                "zh": "右",
                "ru": "П"
            }
        },
        {
            "componentType": "TextLabel",
            "id": "702",
            "x": 213,
            "y": 480,
            "text": "R",
            "textI18n": {
                "en": "R",
                "zh": "右",
                "ru": "П"
            },
            "fontSize": 10
        }
    ]
};
