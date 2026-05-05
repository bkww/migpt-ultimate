#!/usr/bin/env node

import { Command } from 'commander';
import { MiGPTUltimate } from '@migpt-ultimate/core';
import { getMiNA, getMIoT } from '@mi-gpt/miot';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import YAML from 'yaml';

const PID_FILE = '/tmp/migpt-loop-speak.pid';

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

// === loop-speak 命令组 ===
const loopSpeakCmd = program
  .command('loop-speak')
  .description('循环播报文字，直到手动停止或达到指定次数');

loopSpeakCmd
  .command('start')
  .description('启动循环播报')
  .requiredOption('-t, --text <text>', '要循环播报的文本')
  .option('-n, --count <times>', '循环播报次数，0=无限循环', '0')
  .option('-c, --config <path>', '配置文件路径', './config.yaml')
  .option('-i, --interval <seconds>', 'MIoT 模式下的播报间隔秒数', '5')
  .action(async (options) => {
    const count = parseInt(options.count);
    if (isNaN(count) || count < 0) {
      console.error('❌ -n/--count 必须为非负整数（0=无限循环）');
      process.exit(1);
    }

    const interval = parseInt(options.interval);
    if (isNaN(interval) || interval < 1) {
      console.error('❌ -i/--interval 必须为正整数（最小1秒）');
      process.exit(1);
    }

    if (existsSync(PID_FILE)) {
      const oldPid = parseInt(readFileSync(PID_FILE, 'utf-8'));
      try {
        process.kill(oldPid, 0);
        console.error(`❌ 循环播报已在运行中 (PID: ${oldPid})`);
        console.log('💡 使用 migpt-ultimate loop-speak stop 来停止');
        process.exit(1);
      } catch {
        unlinkSync(PID_FILE);
      }
    }

    const child = spawn(
      process.execPath,
      [
        process.argv[1], '_loop-speak-run',
        '-t', options.text,
        '-n', options.count,
        '-c', options.config,
        '-i', options.interval,
      ],
      { detached: true, stdio: ['ignore', 'ignore', 'ignore'] }
    );
    child.unref();

    writeFileSync(PID_FILE, String(child.pid));

    const countMsg = options.count === '0'
      ? '无限循环'
      : `播报 ${options.count} 次`;
    console.log(`🔊 循环播报已启动 (PID: ${child.pid}, ${countMsg})`);
    console.log('💡 使用 migpt-ultimate loop-speak stop 来停止');
  });

loopSpeakCmd
  .command('stop')
  .description('停止循环播报')
  .option('-c, --config <path>', '配置文件路径', './config.yaml')
  .action(async (options) => {
    if (!existsSync(PID_FILE)) {
      console.error('❌ 没有正在运行的循环播报');
      process.exit(1);
    }

    const pid = parseInt(readFileSync(PID_FILE, 'utf-8'));

    try {
      process.kill(pid, 'SIGTERM');
      console.log(`🛑 已终止循环播报进程 (PID: ${pid})`);
    } catch {
      console.log('⚠️ 进程已不存在');
    }

    // 让音箱立即停止当前播报
    try {
      const configContent = readFileSync(options.config, 'utf-8');
      const config = YAML.parse(configContent);
      if (config.speaker) {
        if (!config.ttsCommand) {
          const mina = await getMiNA(config.speaker);
          if (mina) await mina.stop();
        }
        // MIoT ttsCommand 模式：TTS 是一次性触发，无需额外 stop
      }
    } catch { /* stop 失败不影响主流程 */ }

    unlinkSync(PID_FILE);
    console.log('✅ 循环播报已停止');
  });

// === 内部命令：后台循环播报的实际执行逻辑 ===
program
  .command('_loop-speak-run')
  .description('(内部命令)')
  .requiredOption('-t, --text <text>', '要循环播报的文本')
  .option('-n, --count <times>', '循环播报次数，0=无限', '0')
  .option('-c, --config <path>', '配置文件路径', './config.yaml')
  .option('-i, --interval <seconds>', 'MIoT 模式播报间隔秒数', '5')
  .action(async (options) => {
    process.on('SIGTERM', () => {
      try { unlinkSync(PID_FILE); } catch {}
      process.exit(0);
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ 循环播报异常退出:', err);
      try { unlinkSync(PID_FILE); } catch {}
      process.exit(1);
    });

    const configContent = readFileSync(options.config, 'utf-8');
    const config = YAML.parse(configContent);

    if (!config.speaker) process.exit(1);

    const maxCount = parseInt(options.count);
    let playedCount = 0;
    const useMiNA = !config.ttsCommand;

    if (useMiNA) {
      const mina = await getMiNA(config.speaker);
      if (!mina) {
        try { unlinkSync(PID_FILE); } catch {}
        process.exit(1);
      }

      await mina.play({ text: options.text });
      playedCount++;

      if (maxCount > 0 && playedCount >= maxCount) {
        cleanupAndExit();
        return;
      }

      while (maxCount === 0 || playedCount < maxCount) {
        await sleep(3000);
        const status = await mina.getStatus();

        if (!status || status.status === 'idle' || status.status === 'stopped') {
          await mina.stop();
          await sleep(500);
          await mina.play({ text: options.text });
          playedCount++;

          if (maxCount > 0 && playedCount >= maxCount) {
            cleanupAndExit();
            return;
          }
        }
      }
    } else {
      const miot = await getMIoT(config.speaker);
      if (!miot) {
        try { unlinkSync(PID_FILE); } catch {}
        process.exit(1);
      }

      while (maxCount === 0 || playedCount < maxCount) {
        await miot.doAction(config.ttsCommand[0], config.ttsCommand[1], options.text);
        playedCount++;

        if (maxCount > 0 && playedCount >= maxCount) {
          cleanupAndExit();
          return;
        }

        await sleep(parseInt(options.interval) * 1000);
      }
    }
  });

program
  .command('status')
  .description('查看状态')
  .action(() => {
    console.log('状态查看功能开发中...');
  });

program.parse();

function cleanupAndExit() {
  try { unlinkSync(PID_FILE); } catch {}
  process.exit(0);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
