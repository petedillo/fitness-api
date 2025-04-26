import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['dotenv/config'],
        testTimeout: 15000,
        isolate: false,
    },
});