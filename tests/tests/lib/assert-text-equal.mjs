export function assertTextEqual(file, actualText, expectedText) {
    const normalize = text => text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
    const actual = normalize(actualText).split('\n');
    const expected = normalize(expectedText).split('\n');
    const lines = Math.max(actual.length, expected.length);
    for (let index = 0; index < lines; index++) {
        if (actual[index] !== expected[index]) {
            const line = index + 1;
            throw new Error(`${file} differs at line ${line}\nexpected: ${expected[index] ?? '<EOF>'}\nactual:   ${actual[index] ?? '<EOF>'}`);
        }
    }
}
