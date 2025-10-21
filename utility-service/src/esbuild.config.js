const { build } = require('esbuild');
const { obfuscate } = require('javascript-obfuscator');
const fs = require('fs');

const outfile = 'build/server.js';

build({
    entryPoints: ['cmd/server.js'],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    outfile,
    resolveExtensions: ['.js'],
    logLevel: 'info',
    sourcemap: false,
    minify: true, // Optional: good first step before obfuscation
}).then(() => {
    const code = fs.readFileSync(outfile, 'utf8');
    const obfuscated = obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: false,
        disableConsoleOutput: true,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75
    }).getObfuscatedCode();

    fs.writeFileSync(outfile, obfuscated);
    console.log('✅ Obfuscation complete.');
}).catch(() => process.exit(1));
