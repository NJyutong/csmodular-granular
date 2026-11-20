export function monoPcm16Wave({ frequency = 440, sampleRate = 48000, seconds = 1, shape = 'sine', amplitude = 18000 } = {}) {
    const frames = Math.round(sampleRate * seconds);
    const dataBytes = frames * 2;
    const bytes = Buffer.alloc(44 + dataBytes);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28);
    bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
    bytes.writeUInt32LE(dataBytes, 40);
    for (let frame = 0; frame < frames; frame++) {
        const phase = (frame * frequency / sampleRate) % 1;
        const value = shape === 'ramp' ? 2 * phase - 1 : Math.sin(2 * Math.PI * phase);
        bytes.writeInt16LE(Math.round(value * amplitude), 44 + frame * 2);
    }
    return bytes;
}

export function stereoPcm16Wave(samples, sampleRate = 48000) {
    if (samples.length % 2 !== 0) throw new Error('Stereo sample array must contain complete frames');
    const dataBytes = samples.length * 2;
    const bytes = Buffer.alloc(44 + dataBytes);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
    bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 4, 28);
    bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
    bytes.writeUInt32LE(dataBytes, 40);
    for (let i = 0; i < samples.length; i++) {
        bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
    }
    return bytes;
}
