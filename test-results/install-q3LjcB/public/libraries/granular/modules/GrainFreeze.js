export const GrainFreezeModule = {
    "type": "GrainFreeze",
    "displayName": "Grain Freeze",
    "displayNameI18n": {
        "en": "Grain Freeze",
        "zh": "颗粒冻结",
        "ru": "Гранулярная заморозка"
    },
    "category": "fx",
    "status": "passable",
    "gridHeight": 35,
    "originalName": "GrainFreeze",
    "defaultParams": [],
    "tooltip": "Freezes live audio into grains. Density = grains per second, Size = grain length, Lookback = how far back in the last ~4 s. Up to 64 grains at once. Small jacks beside knobs add modulation.",
    "tooltipI18n": {
        "en": "Freezes live audio into grains. Density = grains per second, Size = grain length, Lookback = how far back in the last ~4 s. Up to 64 grains at once. Small jacks beside knobs add modulation.",
        "zh": "把实时音频冻结成颗粒。颗粒/秒 = 每秒颗粒数，粒长 = 每颗粒时长，回看位置 = 回到最近约 4 秒中的哪里。最多同时 64 个颗粒；旋钮旁的小插孔可叠加调制。",
        "ru": "Замораживает живой звук в гранулы. Плотность — гранул в секунду, длина — длительность, «в прошлое» — на сколько назад в последних ~4 с. До 64 гранул одновременно. Малые гнёзда рядом с регуляторами принимают модуляцию."
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
        13
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
            "text": "LIVE: connect audio first",
            "textI18n": {
                "en": "LIVE: connect audio first",
                "zh": "实时处理：先连接音频输入",
                "ru": "Вход: подключите звук"
            },
            "fontSize": 10
        },
        {
            "componentType": "TextLabel",
            "id": "901",
            "x": 12,
            "y": 40,
            "text": "Record, then Freeze",
            "textI18n": {
                "en": "Record, then Freeze",
                "zh": "先录入再冻结",
                "ru": "Запись → заморозка"
            },
            "fontSize": 9
        },
        {
            "componentType": "TextLabel",
            "id": "910",
            "x": 12,
            "y": 64,
            "text": "1 · Record & freeze",
            "textI18n": {
                "en": "1 · Record & freeze",
                "zh": "1 · 录入与冻结",
                "ru": "1 · Запись и захват"
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
            "text": "3 · Mix & output",
            "textI18n": {
                "en": "3 · Mix & output",
                "zh": "3 · 混合与输出",
                "ru": "3 · Микс и выход"
            },
            "fontSize": 11
        },
        {
            "componentType": "TextLabel",
            "id": "913",
            "x": 12,
            "y": 392,
            "text": "Advanced · stereo centre",
            "textI18n": {
                "en": "Advanced · stereo centre",
                "zh": "进阶 · 声像中心",
                "ru": "Далее · центр панорамы"
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
            "defaultValue": 32,
            "csoundName": "Position"
        },
        {
            "componentType": "TextLabel",
            "id": "302",
            "x": 94,
            "y": 86,
            "text": "Lookback",
            "textI18n": {
                "en": "Lookback",
                "zh": "回看位置",
                "ru": "В прошлое"
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
            "ConnectorName": "Lookback CV",
            "connectorNameI18n": {
                "en": "Lookback CV",
                "zh": "回看位置 调制输入",
                "ru": "Модуляция: В прошлое"
            }
        },
        {
            "componentType": "Knob",
            "id": "4",
            "x": 176,
            "y": 100,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 8,
            "csoundName": "PosJitter"
        },
        {
            "componentType": "TextLabel",
            "id": "303",
            "x": 176,
            "y": 86,
            "text": "Lookback jitter",
            "textI18n": {
                "en": "Lookback jitter",
                "zh": "回看抖动",
                "ru": "Разброс назад"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "105",
            "x": 215,
            "y": 103,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Lookback jitter CV",
            "connectorNameI18n": {
                "en": "Lookback jitter CV",
                "zh": "回看抖动 调制输入",
                "ru": "Модуляция: Разброс назад"
            }
        },
        {
            "componentType": "Knob",
            "id": "5",
            "x": 12,
            "y": 245,
            "size": "medium",
            "min": -48,
            "max": 48,
            "defaultValue": 0,
            "csoundName": "Pitch"
        },
        {
            "componentType": "TextLabel",
            "id": "304",
            "x": 12,
            "y": 231,
            "text": "Pitch st",
            "textI18n": {
                "en": "Pitch st",
                "zh": "音高（半音）",
                "ru": "Высота, пт"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "106",
            "x": 51,
            "y": 248,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Pitch st CV",
            "connectorNameI18n": {
                "en": "Pitch st CV",
                "zh": "音高（半音） 调制输入",
                "ru": "Модуляция: Высота, пт"
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
            "y": 428,
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
            "y": 414,
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
            "y": 431,
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
            "y": 106,
            "width": 57,
            "items": "Record,Freeze",
            "itemsI18n": {
                "en": "Record,Freeze",
                "zh": "录入,冻结",
                "ru": "Запись,Стоп"
            },
            "initialIndex": 0,
            "binaryThreshold": true,
            "csoundName": "Freeze"
        },
        {
            "componentType": "TextLabel",
            "id": "309",
            "x": 12,
            "y": 86,
            "text": "Freeze",
            "textI18n": {
                "en": "Freeze",
                "zh": "冻结",
                "ru": "Заморозка"
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "111",
            "x": 78,
            "y": 103,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Freeze CV",
            "connectorNameI18n": {
                "en": "Freeze CV",
                "zh": "冻结 调制输入",
                "ru": "Модуляция: Заморозка"
            }
        },
        {
            "componentType": "Knob",
            "id": "11",
            "x": 12,
            "y": 337,
            "size": "medium",
            "min": 0,
            "max": 127,
            "defaultValue": 127,
            "csoundName": "Mix"
        },
        {
            "componentType": "TextLabel",
            "id": "310",
            "x": 12,
            "y": 323,
            "text": "Dry/wet",
            "textI18n": {
                "en": "Dry/wet",
                "zh": "干湿比",
                "ru": "Сухой/влажн."
            },
            "fontSize": 9
        },
        {
            "componentType": "Input",
            "id": "112",
            "x": 51,
            "y": 340,
            "jackType": "control",
            "bandwidth": "static",
            "ConnectorName": "Dry/wet CV",
            "connectorNameI18n": {
                "en": "Dry/wet CV",
                "zh": "干湿比 调制输入",
                "ru": "Модуляция: Сухой/влажн."
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
            "componentType": "Input",
            "id": "101",
            "x": 18,
            "y": 499,
            "jackType": "audio",
            "bandwidth": "static",
            "ConnectorName": "Audio in",
            "connectorNameI18n": {
                "en": "Audio in",
                "zh": "音频输入",
                "ru": "Аудиовход"
            }
        },
        {
            "componentType": "TextLabel",
            "id": "601",
            "x": 15,
            "y": 480,
            "text": "Audio in",
            "textI18n": {
                "en": "Audio in",
                "zh": "音频输入",
                "ru": "Аудиовход"
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
