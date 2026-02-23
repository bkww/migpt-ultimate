import { MiGPT } from '@mi-gpt/next';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
export class PluginManager {
    plugins = new Map();
    register(plugin) {
        if (this.plugins.has(plugin.name)) {
            return;
        }
        this.plugins.set(plugin.name, plugin);
    }
    unregister(name) {
        return this.plugins.delete(name);
    }
    list() {
        return Array.from(this.plugins.values());
    }
    async execute(ctx) {
        for (const plugin of this.plugins.values()) {
            if (this.shouldTrigger(plugin, ctx.text)) {
                try {
                    const result = await plugin.execute(ctx);
                    if (result) {
                        return result;
                    }
                }
                catch (error) {
                    console.error(`Plugin ${plugin.name} error:`, error);
                }
            }
        }
        return null;
    }
    shouldTrigger(plugin, text) {
        if (!plugin.keywords || plugin.keywords.length === 0) {
            return true;
        }
        return plugin.keywords.some((keyword) => text.includes(keyword));
    }
}
export class MemorySystem {
    records = [];
    maxRecords;
    constructor(maxRecords = 100) {
        this.maxRecords = maxRecords;
    }
    async remember(content) {
        const id = `mem_${Date.now()}`;
        this.records.push({ id, content, timestamp: Date.now() });
        if (this.records.length > this.maxRecords) {
            this.records.shift();
        }
        return id;
    }
    async recall(query, limit = 3) {
        const results = this.records
            .filter(r => r.content.includes(query) || query.includes(r.content))
            .slice(-limit);
        return results;
    }
    buildContext(records) {
        if (records.length === 0)
            return '';
        return records.map(r => r.content).join('\n');
    }
    getStats() {
        return { total: this.records.length, max: this.maxRecords };
    }
    async clear() {
        this.records = [];
    }
}
export class ConfigLoader {
    static load(configPath) {
        const content = readFileSync(configPath, 'utf-8');
        if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
            return YAML.parse(content);
        }
        else if (configPath.endsWith('.json')) {
            return JSON.parse(content);
        }
        throw new Error('Config file must be .yaml, .yml, or .json');
    }
    static getDefaults() {
        return {
            callAIKeywords: ['请', '你'],
            debug: false,
        };
    }
}
const kBanner = `
╔═══════════════════════════════════════════════════════════╗
║  MiGPT-Ultimate v0.1.0  -  小爱音箱终极解决方案           ║
╚═══════════════════════════════════════════════════════════╝
`;
export class MiGPTUltimate {
    plugins = new PluginManager();
    memory = null;
    config = null;
    isRunning = false;
    constructor() { }
    async start(configOrPath) {
        console.log(kBanner);
        let config;
        if (typeof configOrPath === 'string') {
            config = ConfigLoader.load(configOrPath);
        }
        else {
            config = configOrPath;
        }
        this.config = config;
        if (config.memory?.enabled) {
            this.memory = new MemorySystem(config.memory.maxRecords ?? 100);
            console.log('📚 Memory system enabled');
        }
        for (const plugin of config.plugins ?? []) {
            this.plugins.register(plugin);
            console.log(`✅ Plugin loaded: ${plugin.name}`);
        }
        await MiGPT.start(config);
        this.isRunning = true;
        console.log('✅ MiGPT started\n');
    }
    async stop() {
        await MiGPT.stop();
        this.isRunning = false;
        console.log('🛑 Stopped');
    }
    getStatus() {
        return {
            running: this.isRunning,
            memory: this.memory?.getStats() ?? { total: 0, max: 0 },
            plugins: this.plugins.list().map(p => p.name),
        };
    }
    getPluginManager() {
        return this.plugins;
    }
    getMemory() {
        return this.memory;
    }
    getConfig() {
        return this.config;
    }
}
export { MiGPT };
//# sourceMappingURL=index.js.map