
    sr = 48000
    ksmps = 4
    nchnls = 2
    0dbfs = 1.0

    gkBPM init 120
    gkMVOL init 1
    gaFX1 init 0
    gaFX2 init 0
    gaFX3 init 0
    gaFX4 init 0

    opcode K2Y, k, k
        kin xin
        kout = (kin > 0 ? 1 : 0)
        xout kout
    endop

    opcode A2O, a, a
        ; setksmps 1  ; ⭐ закомментировано для стабильности
        ain xin
        kin = k(ain)
        kout = (kin > 0 ? 1 : 0)
        xout a(kout)
    endop

    ; -------- converters (strict inputs) --------
    opcode K2A, 0, kk
        kzkIn, kzaOut xin
        kIn zkr kzkIn
        zaw a(kIn), kzaOut
    endop

    opcode A2K, 0, kk
        kzaIn, kzkOut xin
        aIn zar kzaIn
        zkw k(aIn), kzkOut
    endop

    gkNote init 64
    gkGate init 0
    zakinit 5, 2
    massign 1,0
    massign 2,0
    massign 3,0
    massign 4,0

    giSin ftgen 1, 0, 16384, 10, 1
    giCos ftgen 11, 0, 16384, 11, 1, 1
    giTri ftgen 2, 0, 16384, 7, 0, 4096, 1, 8192, -1, 4096, 0
    giTriF ftgen 24, 0, 16384, 7, -1, 8192, 1, 8192, -1
    giSaw ftgen 3, 0, 16384, 7, 1, 16384, -1
    giSqr50 ftgen 4, 0, 16384, 7, 1, 8192, 1, 0, -1, 8192, -1
    giSqr25 ftgen 5, 0, 16384, 7, 1, 4096, 1, 0, -0.25, 12288, -0.25
    giSqr10 ftgen 6, 0, 16384, 7, 1, 1024, 1, 0, -0.0625, 15360, -0.0625
    giSq400 ftgen 21, 0, 16384, 7,1,41,1,0,0,16343,0
    giSq96 ftgen 22, 0, 16384, 7,1,1366,1,0,0,15018,0
    giSq16 ftgen 23, 0, 16384, 7,1,910,1,0,0,15474,0
    ;---------------------------------
    ; MAPPING TABLES (auto from value_maps.json)
    ; no mapping tables in use
    ;---------------------------------
    ; SCOPE TABLES (oscilloscope ring buffers)
    giScope_9000 ftgen 9000, 0, 4096, 2, 0
    ;---------------------------------
    ; UDO section (inlined from /csound/modules/*.txt)
    giGrainSample1 ftgen 0, 0, 2, -2, 0
giGrainSample2 ftgen 0, 0, 2, -2, 0
giGrainSample3 ftgen 0, 0, 2, -2, 0
giGrainSample4 ftgen 0, 0, 2, -2, 0
giGrainSample5 ftgen 0, 0, 2, -2, 0
giGrainSample6 ftgen 0, 0, 2, -2, 0
giGrainSample7 ftgen 0, 0, 2, -2, 0
giGrainSample8 ftgen 0, 0, 2, -2, 0
giGrainSampleTables[] fillarray giGrainSample1, giGrainSample2, giGrainSample3, giGrainSample4, giGrainSample5, giGrainSample6, giGrainSample7, giGrainSample8
giGrainSampleFrames[] fillarray ftlen(giGrainSample1), ftlen(giGrainSample2), ftlen(giGrainSample3), ftlen(giGrainSample4), ftlen(giGrainSample5), ftlen(giGrainSample6), ftlen(giGrainSample7), ftlen(giGrainSample8)
giGrainSampleRates[] fillarray sr, sr, sr, sr, sr, sr, sr, sr
    ; LED RMS indicator
; Input: kIn  — zak-bus number (a-rate signal source)
;        SChannel — Csound channel name for chnset
opcode led_rms, 0, kS
kIn, SChannel xin

; Read control signal from zak
kin zkr kIn

; RMS via envelope follower
;kRms portk kin, 0.1
kRms = kin
; Send to channel
chnset kRms, SChannel
endop

; Original CsModular granular engine. No granular synthesis opcodes.
; A private 64-voice pool renders one control block at a time with audio-rate
; vector operations: a grain costs a few dozen opcode calls per block instead of per
; sample, an idle engine costs almost nothing, and results stay identical to a
; per-sample renderer (bit-identical at ksmps=1; the only difference at larger ksmps
; is that the voice-count gain smoother is updated once per block).
; Grain starts stay sample-accurate: a grain born at offset j of a block has age -j,
; and its envelope is clamped so every sample before its start or after its end is silent.
; mode: 0 = sample, 1 = live ring, 2 = periodic waveform (220 Hz root).
opcode CMGrainCore, aa, aikkkkkkkkkkkkkk
    aInput, iMode, kTable, kFrames, kSourceRate, kDensity, kSizeMs, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed xin
    iBlock = ksmps
    ; Exact 0..ksmps-1 sample offsets of the current block.
    iRampTable ftgentmp 0, 0, -iBlock, -2, 0
    iFill = 0
    while iFill < iBlock do
        tableiw iFill, iFill, iRampTable
        iFill = iFill + 1
    od
    ; Live ring: the whole block is written before any grain reads it, so grains keep
    ; (ksmps - 4) extra samples away from the oldest data. Zero at the host's ksmps = 4.
    iMargin = max(0, iBlock - 4)

    kLength[] init 64
    kSource[] init 64
    kList[] init 64
    kAge[] init 64
    kSpan[] init 64
    kRead[] init 64
    kStep[] init 64
    kWarpScale[] init 64
    kWarpRadians[] init 64
    kSourceLength[] init 64
    kShape[] init 64
    kLeft[] init 64
    kRight[] init 64
    kClock init 0
    kWrite init 0
    kFilled init 0
    kRandom init 1
    kLastSeed init -1
    kHeldPosition init 0
    kLastFreeze init -1
    kCount init 0
    kSmoothedActive init 1

    aRamp tablera iRampTable, 0, 0

    kFrames = max(2, int(kFrames))
    kDensity limit kDensity, 0, 200
    kSizeMs limit kSizeMs, 2, 500
    kPosition limit kPosition, 0, 1
    kPosJitter limit kPosJitter, 0, 1
    kPitch limit kPitch, -48, 48
    kPitchJitter limit kPitchJitter, 0, 24
    kPan limit kPan, 0, 1
    kSpread limit kSpread, 0, 1
    kSeedValue = 1 + int(limit(kSeed, 0, 65534))
    if kSeedValue != kLastSeed then
        kRandom = kSeedValue
        kLastSeed = kSeedValue
    endif
    if kFreeze < 0.5 || kLastFreeze < 0 then
        kHeldPosition = kPosition
    endif
    kLastFreeze = kFreeze

    ; Only the live source writes; freezing never suspends existing voices.
    ; The block is written first; each grain start sees the writer position of its own sample.
    if iMode == 1 && kFreeze < 0.5 then
        aWriteIndex = kWrite + aRamp
        tablewkt aInput, aWriteIndex, kTable, 0, 0, 1
    endif

    ; Fractional accumulator, advanced sample by sample: density zero produces no new grains.
    kTick = kDensity / sr
    kOffset = 0
    while kOffset < iBlock do
        kClock = kClock + kTick
        if kClock >= 1 then
            kClock = kClock - 1
            kSlot = 0
            kFound = 0
            while kSlot < 64 && kFound == 0 do
                if kLength[kSlot] == 0 then
                    kFound = 1
                else
                    kSlot = kSlot + 1
                endif
            od
            if kFound == 1 then
                ; Park-Miller state belongs to this UDO instance, not Csound globally.
                kRandom = (kRandom * 16807) % 2147483647
                kPositionRandom = 2 * kRandom / 2147483647 - 1
                kRandom = (kRandom * 16807) % 2147483647
                kPitchRandom = 2 * kRandom / 2147483647 - 1
                kRandom = (kRandom * 16807) % 2147483647
                kPanRandom = 2 * kRandom / 2147483647 - 1
                kRatio = pow(2, limit(kPitch + kPitchRandom * kPitchJitter, -48, 48) / 12)
                kRate = kRatio * kSourceRate / sr
                kDuration = max(2, int(kSizeMs * sr / 1000))
                if iMode == 2 then
                    ; Warp and wavetable start are independent at grain creation.
                    kWarpScale[kSlot] = kHeldPosition * kFrames / 6.283185307179586
                    kWarpRadians[kSlot] = 6.283185307179586 / kFrames
                    kStart = limit(kPositionRandom * kPosJitter, 0, 1)
                else
                    kStart = limit(kHeldPosition + kPositionRandom * kPosJitter, 0, 1)
                endif
                if iMode == 1 then
                    ; Writer state exactly as it is at this sample.
                    if kFreeze < 0.5 then
                        kWriteNow = (kWrite + kOffset + 1) % kFrames
                        kFilledNow = min(kFilled + kOffset + 1, kFrames)
                    else
                        kWriteNow = kWrite
                        kFilledNow = kFilled
                    endif
                    ; Reserve the whole read trajectory AND future writer trajectory.
                    ; This remains safe if Freeze is released during a grain.
                    kDuration = min(kDuration, int((kFilledNow - 4 - iMargin) / (kRate + 1)))
                    kNear = kDuration * kRate + 2
                    kFar = kFilledNow - kDuration - 2 - iMargin
                    kStart = kWriteNow - (kNear + kStart * max(0, kFar - kNear))
                else
                    kStart = kStart * (kFrames - 1)
                endif
                if kDuration >= 2 then
                    kVoicePan = limit(kPan + 0.5 * kSpread * kPanRandom, 0, 1)
                    ; Read position the grain would have at sample 0 of this block.
                    kBlockRead = kStart - kRate * kOffset
                    kLength[kSlot] = kDuration
                    kAge[kSlot] = -kOffset
                    kSpan[kSlot] = kDuration - 1
                    kRead[kSlot] = kBlockRead - floor(kBlockRead / kFrames) * kFrames
                    kStep[kSlot] = kRate
                    kSource[kSlot] = kTable
                    kSourceLength[kSlot] = kFrames
                    kShape[kSlot] = (kWindow >= 0.5 ? 1 : 0)
                    kLeft[kSlot] = sqrt(1 - kVoicePan)
                    kRight[kSlot] = sqrt(kVoicePan)
                    kList[kCount] = kSlot
                    kCount = kCount + 1
                endif
            endif
        endif
        kOffset = kOffset + 1
    od

    aSumL = 0
    aSumR = 0
    kItem = 0
    kKeep = 0
    while kItem < kCount do
        kVoice = kList[kItem]
        kAgeNow = kAge[kVoice]
        kReadNow = kRead[kVoice]
        kRateNow = kStep[kVoice]
        ; Phase is clamped, so samples before the start or after the end are silent.
        aPhase limit (aRamp + kAgeNow) / kSpan[kVoice], 0, 1
        if kShape[kVoice] == 0 then
            aEnvelope = 0.5 - 0.5 * cos(6.283185307179586 * aPhase)
        else
            aEnvelope = 1 - abs(2 * aPhase - 1)
        endif
        ; Two-point linear interpolation with independent wrap of each index.
        aIndex = kReadNow + kRateNow * aRamp
        if iMode == 2 && kWarpScale[kVoice] > 0 then
            ; φ' = φ + β sin(2πφ)/(2π), 0 ≤ β ≤ 1. The warp keeps each
            ; cycle boundary fixed, moves waveform transitions within the cycle,
            ; and never reverses phase.
            aIndex = aIndex + kWarpScale[kVoice] * sin(kWarpRadians[kVoice] * aIndex)
        endif
        aSample tablexkt aIndex, kSource[kVoice], 0, 2, 0, 0, 1
        aVoice = aSample * aEnvelope
        aSumL = aSumL + aVoice * kLeft[kVoice]
        aSumR = aSumR + aVoice * kRight[kVoice]
        if kAgeNow + iBlock >= kLength[kVoice] then
            kLength[kVoice] = 0
        else
            kAge[kVoice] = kAgeNow + iBlock
            kNewRead = kReadNow + kRateNow * iBlock
            kRead[kVoice] = kNewRead - floor(kNewRead / kSourceLength[kVoice]) * kSourceLength[kVoice]
            kList[kKeep] = kVoice
            kKeep = kKeep + 1
        endif
        kItem = kItem + 1
    od
    kCount = kKeep

    if iMode == 1 && kFreeze < 0.5 then
        kWrite = (kWrite + iBlock) % kFrames
        kFilled = min(kFilled + iBlock, kFrames)
    endif

    ; Smooth actual voice count over 10 ms, then bound pathological coherent peaks.
    kSmoothedActive = kSmoothedActive + (max(1, kCount) - kSmoothedActive) * (1 - exp(-iBlock / (0.01 * sr)))
    kGain = 1 / sqrt(max(1, kSmoothedActive))
    aLeft = tanh(aSumL * kGain)
    aRight = tanh(aSumR * kGain)
    xout aLeft, aRight
endop


;@ requires GrainCore.txt
opcode GrainFreeze, 0, kkkkkkkkkkkkkkkkkkkkkkkkkkkk
    kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kMix, kLevel, kSeed, kAudioIn, kDensityIn, kSizeIn, kPositionIn, kPosJitterIn, kPitchIn, kPitchJitterIn, kWindowIn, kPanIn, kSpreadIn, kFreezeIn, kMixIn, kLevelIn, kOutL, kOutR xin
    aDry zar kAudioIn
    kDensityCV zkr kDensityIn
    kDensity = kDensity + kDensityCV * 100
    kSizeCV zkr kSizeIn
    kSize = kSize + kSizeCV * 250
    kPositionCV zkr kPositionIn
    kPosition = kPosition / 127 + kPositionCV * 1
    kPosJitterCV zkr kPosJitterIn
    kPosJitter = kPosJitter / 127 + kPosJitterCV * 1
    kPitchCV zkr kPitchIn
    kPitch = kPitch + kPitchCV * 12
    kPitchJitterCV zkr kPitchJitterIn
    kPitchJitter = kPitchJitter + kPitchJitterCV * 12
    kWindowCV zkr kWindowIn
    kWindow = kWindow + kWindowCV * 1
    kPanCV zkr kPanIn
    kPan = kPan / 127 + kPanCV * 1
    kSpreadCV zkr kSpreadIn
    kSpread = kSpread / 127 + kSpreadCV * 1
    kFreezeCV zkr kFreezeIn
    kFreeze = kFreeze + kFreezeCV * 1
    kMixCV zkr kMixIn
    kMix = kMix / 127 + kMixCV * 1
    kLevelCV zkr kLevelIn
    kLevel = kLevel / 127 + kLevelCV * 1
    iRing ftgentmp 0, 0, -192000, -2, 0
    kTable = iRing
    kFrames = 192000
    kRate = sr
    aWetL, aWetR CMGrainCore aDry, 1, kTable, kFrames, kRate, kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed
    kMix limit kMix, 0, 1
    kLevel limit kLevel, 0, 1
    aMix interp kMix
    aLevel interp kLevel
    aOutL limit ((1 - aMix) * aDry + aMix * aWetL) * aLevel, -1, 1
    aOutR limit ((1 - aMix) * aDry + aMix * aWetR) * aLevel, -1, 1
    zaw aOutL, kOutL
    zaw aOutR, kOutR
endop


;@ requires GrainCore.txt
opcode GrainOsc, 0, kkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kMix, kLevel, kSeed, kWave, kAudioIn, kDensityIn, kSizeIn, kPositionIn, kPosJitterIn, kPitchIn, kPitchJitterIn, kWindowIn, kPanIn, kSpreadIn, kFreezeIn, kMixIn, kLevelIn, kOutL, kOutR xin
    aDry zar kAudioIn
    kDensityCV zkr kDensityIn
    kDensity = kDensity + kDensityCV * 100
    kSizeCV zkr kSizeIn
    kSize = kSize + kSizeCV * 250
    kPositionCV zkr kPositionIn
    kPosition = kPosition / 127 + kPositionCV * 1
    kPosJitterCV zkr kPosJitterIn
    kPosJitter = kPosJitter / 127 + kPosJitterCV * 1
    kPitchCV zkr kPitchIn
    kPitch = kPitch + kPitchCV * 12
    kPitchJitterCV zkr kPitchJitterIn
    kPitchJitter = kPitchJitter + kPitchJitterCV * 12
    kWindowCV zkr kWindowIn
    kWindow = kWindow + kWindowCV * 1
    kPanCV zkr kPanIn
    kPan = kPan / 127 + kPanCV * 1
    kSpreadCV zkr kSpreadIn
    kSpread = kSpread / 127 + kSpreadCV * 1
    kFreezeCV zkr kFreezeIn
    kFreeze = kFreeze + kFreezeCV * 1
    kMixCV zkr kMixIn
    kMix = kMix / 127 + kMixCV * 1
    kLevelCV zkr kLevelIn
    kLevel = kLevel / 127 + kLevelCV * 1
    iFrames = ftlen(giSin)
    iTriangle ftgentmp 0, 0, iFrames, 10, 1.000000000, 0.000000000, -0.111111111, 0.000000000, 0.040000000, 0.000000000, -0.020408163, 0.000000000, 0.012345679, 0.000000000, -0.008264463, 0.000000000, 0.005917160, 0.000000000, -0.004444444
    iSaw ftgentmp 0, 0, iFrames, 10, 1.000000000, 0.500000000, 0.333333333, 0.250000000, 0.200000000, 0.166666667, 0.142857143, 0.125000000, 0.111111111, 0.100000000, 0.090909091, 0.083333333, 0.076923077, 0.071428571, 0.066666667, 0.062500000, 0.058823529, 0.055555556, 0.052631579, 0.050000000, 0.047619048, 0.045454545, 0.043478261, 0.041666667
    iSquare ftgentmp 0, 0, iFrames, 10, 1.000000000, 0.000000000, 0.333333333, 0.000000000, 0.200000000, 0.000000000, 0.142857143, 0.000000000, 0.111111111, 0.000000000, 0.090909091, 0.000000000, 0.076923077, 0.000000000, 0.066666667, 0.000000000, 0.058823529, 0.000000000, 0.052631579, 0.000000000, 0.047619048, 0.000000000, 0.043478261
    kWave = int(limit(kWave, 0, 3) + 0.5)
    kTable = (kWave == 0 ? giSin : (kWave == 1 ? iTriangle : (kWave == 2 ? iSaw : iSquare)))
    kFrames = iFrames
    kRate = 220 * kFrames
    aWetL, aWetR CMGrainCore aDry, 2, kTable, kFrames, kRate, kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed
    kMix limit kMix, 0, 1
    kLevel limit kLevel, 0, 1
    aMix interp kMix
    aLevel interp kLevel
    aOutL limit ((1 - aMix) * aDry + aMix * aWetL) * aLevel, -1, 1
    aOutR limit ((1 - aMix) * aDry + aMix * aWetR) * aLevel, -1, 1
    zaw aOutL, kOutL
    zaw aOutR, kOutR
endop


;@ requires GrainCore.txt
opcode GrainSample, 0, kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kMix, kLevel, kSeed, kSlot, kScan, kAudioIn, kDensityIn, kSizeIn, kPositionIn, kPosJitterIn, kPitchIn, kPitchJitterIn, kWindowIn, kPanIn, kSpreadIn, kFreezeIn, kMixIn, kLevelIn, kOutL, kOutR xin
    aDry zar kAudioIn
    kDensityCV zkr kDensityIn
    kDensity = kDensity + kDensityCV * 100
    kSizeCV zkr kSizeIn
    kSize = kSize + kSizeCV * 250
    kPositionCV zkr kPositionIn
    kPosition = kPosition / 127 + kPositionCV * 1
    kPosJitterCV zkr kPosJitterIn
    kPosJitter = kPosJitter / 127 + kPosJitterCV * 1
    kPitchCV zkr kPitchIn
    kPitch = kPitch + kPitchCV * 12
    kPitchJitterCV zkr kPitchJitterIn
    kPitchJitter = kPitchJitter + kPitchJitterCV * 12
    kWindowCV zkr kWindowIn
    kWindow = kWindow + kWindowCV * 1
    kPanCV zkr kPanIn
    kPan = kPan / 127 + kPanCV * 1
    kSpreadCV zkr kSpreadIn
    kSpread = kSpread / 127 + kSpreadCV * 1
    kFreezeCV zkr kFreezeIn
    kFreeze = kFreeze + kFreezeCV * 1
    kMixCV zkr kMixIn
    kMix = kMix / 127 + kMixCV * 1
    kLevelCV zkr kLevelIn
    kLevel = kLevel / 127 + kLevelCV * 1
    kScanPhase init 0
    if kScan == 0 then
        kScanPhase = 0
    else
        if kFreeze < 0.5 then
            kScanPhase = kScanPhase + kScan / (100 * kr)
            kScanPhase = kScanPhase - floor(kScanPhase)
        endif
        kPosition = kPosition + kScanPhase
        kPosition = kPosition - floor(kPosition)
    endif
    kSlot = int(limit(kSlot, 1, 8) + 0.5) - 1
    kTable = giGrainSampleTables[kSlot]
    kFrames = giGrainSampleFrames[kSlot]
    kRate = giGrainSampleRates[kSlot]
    aWetL, aWetR CMGrainCore aDry, 0, kTable, kFrames, kRate, kDensity, kSize, kPosition, kPosJitter, kPitch, kPitchJitter, kWindow, kPan, kSpread, kFreeze, kSeed
    kMix limit kMix, 0, 1
    kLevel limit kLevel, 0, 1
    aMix interp kMix
    aLevel interp kLevel
    aOutL limit ((1 - aMix) * aDry + aMix * aWetL) * aLevel, -1, 1
    aOutR limit ((1 - aMix) * aDry + aMix * aWetR) * aLevel, -1, 1
    zaw aOutL, kOutL
    zaw aOutR, kOutR
endop


opcode Outs2, 0, kkk
kButton1, kIn1, kIn2 xin
ain1 zar kIn1
ain2 zar kIn2

; --- module body ---
; Add your DSP code here
kVol = gkMVOL
outs ain1*kButton1*kVol,ain2*kButton1*kVol
endop


; miniVU indicator
; Input: kIn  — zak-bus number (a-rate signal source)
;        SChannel — Csound channel name for chnset
opcode mVU_rms, 0, kS
kIn, SChannel xin

; Read control signal from zak
ain zar kIn

; RMS via envelope follower
kRms rms ain
; Send to channel
chnset kRms, SChannel
endop

    ;---------------------------------
    ; VOICE AREA
    instr 1
    k_GrainOsc_1_1 chnget "module_GrainOsc_1_1"
k_GrainOsc_1_2 chnget "module_GrainOsc_1_2"
k_GrainOsc_1_3 chnget "module_GrainOsc_1_3"
k_GrainOsc_1_4 chnget "module_GrainOsc_1_4"
k_GrainOsc_1_5 chnget "module_GrainOsc_1_5"
k_GrainOsc_1_6 chnget "module_GrainOsc_1_6"
k_GrainOsc_1_7 chnget "module_GrainOsc_1_7"
k_GrainOsc_1_8 chnget "module_GrainOsc_1_8"
k_GrainOsc_1_9 chnget "module_GrainOsc_1_9"
k_GrainOsc_1_10 chnget "module_GrainOsc_1_10"
k_GrainOsc_1_11 chnget "module_GrainOsc_1_11"
k_GrainOsc_1_12 chnget "module_GrainOsc_1_12"
k_GrainOsc_1_13 chnget "module_GrainOsc_1_13"
k_GrainOsc_1_14 chnget "module_GrainOsc_1_14"
GrainOsc k_GrainOsc_1_1, k_GrainOsc_1_2, k_GrainOsc_1_3, k_GrainOsc_1_4, k_GrainOsc_1_5, k_GrainOsc_1_6, k_GrainOsc_1_7, k_GrainOsc_1_8, k_GrainOsc_1_9, k_GrainOsc_1_10, k_GrainOsc_1_11, k_GrainOsc_1_12, k_GrainOsc_1_13, k_GrainOsc_1_14, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0
k_GrainFreeze_2_1 chnget "module_GrainFreeze_2_1"
k_GrainFreeze_2_2 chnget "module_GrainFreeze_2_2"
k_GrainFreeze_2_3 chnget "module_GrainFreeze_2_3"
k_GrainFreeze_2_4 chnget "module_GrainFreeze_2_4"
k_GrainFreeze_2_5 chnget "module_GrainFreeze_2_5"
k_GrainFreeze_2_6 chnget "module_GrainFreeze_2_6"
k_GrainFreeze_2_7 chnget "module_GrainFreeze_2_7"
k_GrainFreeze_2_8 chnget "module_GrainFreeze_2_8"
k_GrainFreeze_2_9 chnget "module_GrainFreeze_2_9"
k_GrainFreeze_2_10 chnget "module_GrainFreeze_2_10"
k_GrainFreeze_2_11 chnget "module_GrainFreeze_2_11"
k_GrainFreeze_2_12 chnget "module_GrainFreeze_2_12"
k_GrainFreeze_2_13 chnget "module_GrainFreeze_2_13"
GrainFreeze k_GrainFreeze_2_1, k_GrainFreeze_2_2, k_GrainFreeze_2_3, k_GrainFreeze_2_4, k_GrainFreeze_2_5, k_GrainFreeze_2_6, k_GrainFreeze_2_7, k_GrainFreeze_2_8, k_GrainFreeze_2_9, k_GrainFreeze_2_10, k_GrainFreeze_2_11, k_GrainFreeze_2_12, k_GrainFreeze_2_13, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 4
k_Outs2_3_3 chnget "module_Outs2_3_3"
Outs2 k_Outs2_3_3, 3, 4
mVU_rms 4, "mvu_Outs2_3_5"
mVU_rms 3, "mvu_Outs2_3_4"
k_GrainSample_4_1 chnget "module_GrainSample_4_1"
k_GrainSample_4_2 chnget "module_GrainSample_4_2"
k_GrainSample_4_3 chnget "module_GrainSample_4_3"
k_GrainSample_4_4 chnget "module_GrainSample_4_4"
k_GrainSample_4_5 chnget "module_GrainSample_4_5"
k_GrainSample_4_6 chnget "module_GrainSample_4_6"
k_GrainSample_4_7 chnget "module_GrainSample_4_7"
k_GrainSample_4_8 chnget "module_GrainSample_4_8"
k_GrainSample_4_9 chnget "module_GrainSample_4_9"
k_GrainSample_4_10 chnget "module_GrainSample_4_10"
k_GrainSample_4_11 chnget "module_GrainSample_4_11"
k_GrainSample_4_12 chnget "module_GrainSample_4_12"
k_GrainSample_4_13 chnget "module_GrainSample_4_13"
k_GrainSample_4_14 chnget "module_GrainSample_4_14"
k_GrainSample_4_15 chnget "module_GrainSample_4_15"
GrainSample k_GrainSample_4_1, k_GrainSample_4_2, k_GrainSample_4_3, k_GrainSample_4_4, k_GrainSample_4_5, k_GrainSample_4_6, k_GrainSample_4_7, k_GrainSample_4_8, k_GrainSample_4_9, k_GrainSample_4_10, k_GrainSample_4_11, k_GrainSample_4_12, k_GrainSample_4_13, k_GrainSample_4_14, k_GrainSample_4_15, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0
    aScopeIdx_9000 phasor (sr / ksmps) / 4096
aScopeSig_9000 zar 3
tablew aScopeSig_9000, aScopeIdx_9000, 9000, 1
    endin

    ;---------------------------------
    ; FX AREA
    instr 2
    ; no fx modules
    ; no fx scope tables
    endin

    ;---------------------------------
    ; GLOBAL MIDI
    gkstat init 0
    gkchan init 0
    gkdata1 init 0
    gkdata2 init 0
    instr 3
      gkstat, gkchan, gkdata1, gkdata2 midiin
      if gkstat != 144 goto Next
        gkGate = 1
        gkNote = gkdata1
    Next:
      if gkstat!=128 goto Over
        gkGate = 0
    Over:
      if (gkdata1 != 0) && (gkdata2 == 0) then
            gkGate = 0
      endif 
    ;printk2 gkGate
    endin

    ;---------------------------------
    ; FOR OFFLINE RENDERING 
    instr 4
      xtratim 0.1
      gkGate linsegr 1, p3, 1, 0, 0
      gkNote = p4
    endin
    ;=================================
    instr 5
        kBPM chnget "bpm"
        kBPM limit kBPM, 1, 300
        gkBPM = kBPM
        kMasterVol chnget "mvol"
        kMasterVol portk kMasterVol, 0.1
        gkMVOL = kMasterVol         
    endin
    