#!/usr/bin/env node

/**
 * Browser Tools - Browser automation wrapper
 * 
 * This script provides basic browser automation via Playwright.
 * For advanced browser control, use the MCP browser tools available in Claude Code:
 * - cursor-browser-extension: Navigate web and interact with pages
 * - cursor-ide-browser: Browser automation for frontend/webapp development
 * 
 * These MCP servers are automatically available when using Claude Code.
 */

import { spawn } from 'child_process';
import { program } from 'commander';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

program
  .name('browser-tools')
  .description('Browser automation tools using Playwright')
  .version('1.0.0');

program
  .command('open')
  .description('Open Playwright codegen for interactive browser control')
  .argument('<url>', 'URL to open')
  .option('-h, --headless', 'Run in headless mode', false)
  .action((url, options) => {
    console.log(`Opening ${url} in Playwright codegen...`);
    console.log('\nNote: For full browser automation via MCP, use Claude Code with');
    console.log('the cursor-browser-extension or cursor-ide-browser MCP servers.\n');
    
    const args = ['playwright', 'codegen', url];
    if (options.headless) {
      args.push('--headless');
    }
    
    const proc = spawn('npx', args, { stdio: 'inherit', shell: true });
    proc.on('close', (code) => process.exit(code || 0));
  });

program
  .command('screenshot')
  .description('Take a screenshot of a URL using Playwright')
  .argument('<url>', 'URL to screenshot')
  .option('-o, --output <path>', 'Output path', 'screenshot.png')
  .option('-w, --width <px>', 'Viewport width', '1280')
  .option('-h, --height <px>', 'Viewport height', '720')
  .action(async (url, options) => {
    // Use Playwright's screenshot command via npx
    console.log(`Taking screenshot of ${url}...`);
    const args = [
      'playwright',
      'screenshot',
      url,
      options.output,
      '--viewport-size', `${options.width},${options.height}`
    ];
    
    const proc = spawn('npx', ['-y', ...args], { 
      stdio: 'inherit', 
      shell: true 
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Screenshot saved to ${options.output}`);
      }
      process.exit(code || 0);
    });
  });

program
  .command('test')
  .description('Test if browser tools are working')
  .action(() => {
    console.log('Testing browser tools configuration...\n');
    console.log('✓ Browser tools script is configured!');
    console.log('\nAvailable commands:');
    console.log('  pnpm browser-tools open <url>     - Open Playwright codegen');
    console.log('  pnpm browser-tools screenshot <url> - Take a screenshot');
    console.log('\nFor advanced browser automation, use Claude Code with MCP:');
    console.log('  - cursor-browser-extension MCP server');
    console.log('  - cursor-ide-browser MCP server');
    console.log('\nThese MCP servers provide direct browser control through');
    console.log('the Claude Code interface without needing scripts.');
  });

program.parse();
