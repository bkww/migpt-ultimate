import { MiGPT, type MiGPTConfig } from '@mi-gpt/next';
export interface PluginContext {
    text: string;
    timestamp: number;
}
export interface PluginResult {
    text?: string;
    handled?: boolean;
}
export interface Plugin {
    name: string;
    description: string;
    keywords?: string[];
    execute(ctx: PluginContext): Promise<PluginResult | null>;
}
export declare class PluginManager {
    private plugins;
    register(plugin: Plugin): void;
    unregister(name: string): boolean;
    list(): Plugin[];
    execute(ctx: PluginContext): Promise<PluginResult | null>;
    private shouldTrigger;
}
export interface MemoryRecord {
    id: string;
    content: string;
    timestamp: number;
}
export declare class MemorySystem {
    private records;
    private maxRecords;
    constructor(maxRecords?: number);
    remember(content: string): Promise<string>;
    recall(query: string, limit?: number): Promise<MemoryRecord[]>;
    buildContext(records: MemoryRecord[]): string;
    getStats(): {
        total: number;
        max: number;
    };
    clear(): Promise<void>;
}
export interface UltimateConfig extends MiGPTConfig {
    plugins?: Plugin[];
    memory?: {
        enabled: boolean;
        maxRecords?: number;
    };
}
export declare class ConfigLoader {
    static load(configPath: string): UltimateConfig;
    static getDefaults(): Partial<UltimateConfig>;
}
export declare class MiGPTUltimate {
    private plugins;
    private memory;
    private config;
    private isRunning;
    constructor();
    start(configOrPath: string | UltimateConfig): Promise<void>;
    stop(): Promise<void>;
    getStatus(): {
        running: boolean;
        memory: {
            total: number;
            max: number;
        };
        plugins: string[];
    };
    getPluginManager(): PluginManager;
    getMemory(): MemorySystem | null;
    getConfig(): UltimateConfig | null;
}
export { MiGPT };
//# sourceMappingURL=index.d.ts.map