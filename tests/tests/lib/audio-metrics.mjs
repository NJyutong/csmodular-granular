export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

export function rms(samples, channel = 0, from = 0, to = samples.length / 2) {
    let sum = 0;
    for (let frame = from; frame < to; frame++) sum += samples[2 * frame + channel] ** 2;
    return Math.sqrt(sum / Math.max(1, to - from));
}

export function windowedAmplitude(samples, frequency, sampleRate, fromSeconds, windowSeconds, channel = 0) {
    const first = Math.round(fromSeconds * sampleRate);
    const count = Math.round(windowSeconds * sampleRate);
    let real = 0, imaginary = 0, norm = 0;
    for (let i = 0; i < count; i++) {
        const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (count - 1));
        const value = samples[2 * (first + i) + channel] * window;
        const phase = 2 * Math.PI * frequency * i / sampleRate;
        real += value * Math.cos(phase);
        imaginary -= value * Math.sin(phase);
        norm += window;
    }
    return 2 * Math.hypot(real, imaginary) / norm;
}
