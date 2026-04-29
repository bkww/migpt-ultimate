#!/usr/bin/env node

import { Command } from 'commander';
import { MiGPTUltimate } from '@migpt-ultimate/core';
import { getMiNA, getMIoT } from '@mi-gpt/miot';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

const program = new Command();

program
  .name('migpt-ultimate')
  .description('MiGPT Ultimate - 小爱音箱终极解决方案')
  .version('0.1.0');

program
  .command('start')
  .description('启动 MiGPT Ultimate')
  .option('-c, --config <path>', '配置文件路径', './config.yaml')
  .action(async (options) => {
    try {
      console.log('🚀 正在启动 MiGPT Ultimate...\n');

      const configContent = readFileSync(options.config, 'utf-8');
      const config = YAML.parse(configContent);

      const engine = new MiGPTUltimate();
      await engine.start(config);

      console.log('\n✅ MiGPT Ultimate 已启动');
      console.log('按 Ctrl+C 停止\n');

      process.on('SIGINT', async () => {
        console.log('\n🛑 正在停止...');
        await engine.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ 启动失败:', error);
      process.exit(1);
    }
  });

program
  .command('speak')
  .description('让小爱音箱直接说话')
  .requiredOption('-t, --text <text>', '要播放的文本')
  .option('-c, --config <path>', '配置文件路径', './config.yaml')
  .action(async (options) => {
    try {
      const configContent = readFileSync(options.config, 'utf-8');
      const config = YAML.parse(configContent);

      if (!config.speaker) {
        console.error('❌ 配置文件中缺少 speaker 配置');
        process.exit(1);
      }

      console.log(`🔊 正在让小爱说: "${options.text}"`);

      if (config.ttsCommand) {
        const miot = await getMIoT(config.speaker);
        if (!miot) {
          console.error('❌ 无法连接到小爱音箱');
          process.exit(1);
        }
        await miot.doAction(config.ttsCommand[0], config.ttsCommand[1], options.text);
      } else {
        const mina = await getMiNA(config.speaker);
        if (!mina) {
          console.error('❌ 无法连接到小爱音箱');
          process.exit(1);
        }
        await mina.play({ text: options.text });
      }

      console.log('✅ 已发送');
    } catch (error) {
      console.error('❌ 说话失败:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看状态')
  .action(() => {
    console.log('状态查看功能开发中...');
  });

program.parse();
