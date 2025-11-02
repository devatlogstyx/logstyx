const dotenv = require("dotenv")

const fs = require("fs")
const randomstring = require("randomstring")
const MASTER_KEY = randomstring.generate(32)
const algorithm = "aes-256-ctr";
const crypto = require("crypto")
const { spawn } = require('child_process');

const buildFrontend = () => {
    return new Promise((resolve, reject) => {
        const npmProcess = spawn('npm', ['run', 'build'], {
            cwd: "./../microservice/frontend",
            stdio: 'inherit',
            shell: true // Required for Windows compatibility
        });

        npmProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Build completed successfully!');
                resolve();
            } else {
                reject(new Error(`Build failed with exit code ${code}`));
            }
        });

        npmProcess.on('error', (error) => {
            reject(error);
        });
    });
}


const setupFrontend = async () => {
    try {
        const sourceFile = './.env.vite';
        const destFile = './../microservice/frontend/.env.local';

        fs.copyFileSync(sourceFile, destFile);
        await buildFrontend()

    } catch (error) {
        console.error('Error copying file:', error);
    }
}

const encryptSecret = (secret) => {

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
    return [iv, encrypted]?.map((n) => n?.toString("hex"))?.join(":")

}


const setupEncryptedENV = () => {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    const keys = Object.keys(envConfig)

    // Example original values (replace with your actual values)
    const values = {
        ...envConfig
    };

    const res = {};

    for (const key of keys) {
        const original = values[key];

        // res[key] = original;
        const encrypted = encryptSecret(original)
        res[`ENC_${key}`] = encrypted;
        // res[`DEC_${key}`] = decryptSecret(encrypted);
    }

    res[`MASTER_KEY`] = MASTER_KEY

    const newEnvContent = Object.entries(res)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");


    fs.writeFileSync("../.env.encrypted", newEnvContent);
    console.log("Encrypted .env written to .env.encrypted");
}

const start = async () => {
    setupEncryptedENV()
    await setupFrontend();
}

start()