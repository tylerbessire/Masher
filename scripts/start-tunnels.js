#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TUNNEL_CONFIGS = [
  { port: 8000, subdomain: 'tylers-remixer-analysis', name: 'Analysis API' },
  { port: 8001, subdomain: 'tylers-remixer-processing', name: 'Processing API' },
  { port: 8002, subdomain: 'tylers-remixer-scoring', name: 'Scoring API' },
  { port: 8003, subdomain: 'tylers-remixer-orchestrator', name: 'Orchestrator API' },
  { port: 8004, subdomain: 'tylers-remixer-separation', name: 'Separation API' }
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

class TunnelManager {
  constructor() {
    this.tunnels = [];
    this.isShuttingDown = false;
  }

  async startTunnel(config, retryCount = 0) {
    return new Promise((resolve, reject) => {
      console.log(`🚇 Starting ${config.name} tunnel on port ${config.port}...`);
      
      const args = ['--port', config.port.toString()];
      if (config.subdomain) {
        args.push('--subdomain', config.subdomain);
      }

      const tunnel = spawn('npx', ['lt', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let tunnelUrl = null;
      let hasStarted = false;

      tunnel.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[${config.name}] ${output}`);
        
        if (output.includes('your url is:')) {
          tunnelUrl = output.match(/https:\/\/[^\s]+/)?.[0];
          if (tunnelUrl && !hasStarted) {
            hasStarted = true;
            console.log(`✅ ${config.name} tunnel started: ${tunnelUrl}`);
            resolve({ tunnel, url: tunnelUrl, config });
          }
        }
      });

      tunnel.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[${config.name} Error] ${error}`);
        
        if (error.includes('connection refused') && retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying ${config.name} tunnel... (${retryCount + 1}/${MAX_RETRIES})`);
          tunnel.kill();
          
          setTimeout(() => {
            this.startTunnel(config, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
          return;
        }
      });

      tunnel.on('close', (code) => {
        if (!hasStarted && !this.isShuttingDown) {
          const error = new Error(`${config.name} tunnel failed to start (exit code: ${code})`);
          
          if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying ${config.name} tunnel... (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
              this.startTunnel(config, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, RETRY_DELAY);
          } else {
            console.error(`❌ ${config.name} tunnel failed after ${MAX_RETRIES} retries`);
            reject(error);
          }
        }
      });

      tunnel.on('error', (error) => {
        console.error(`[${config.name}] Process error:`, error.message);
        if (!hasStarted) {
          reject(error);
        }
      });

      // Store the tunnel reference
      this.tunnels.push({ tunnel, config });

      // Timeout if tunnel doesn't start within 30 seconds
      setTimeout(() => {
        if (!hasStarted && !this.isShuttingDown) {
          console.error(`⏰ ${config.name} tunnel timed out`);
          tunnel.kill();
          reject(new Error(`${config.name} tunnel startup timeout`));
        }
      }, 30000);
    });
  }

  async startAllTunnels() {
    const startPromises = TUNNEL_CONFIGS.map(config => 
      this.startTunnel(config).catch(error => {
        console.error(`Failed to start ${config.name} tunnel:`, error.message);
        return null; // Don't fail the whole batch
      })
    );

    const results = await Promise.allSettled(startPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;

    console.log(`\n🎯 Tunnel Summary:`);
    console.log(`✅ ${successful} tunnels started successfully`);
    if (failed > 0) {
      console.log(`❌ ${failed} tunnels failed to start`);
      console.log(`⚠️  Edge Functions may not work properly without all tunnels`);
    }

    return results;
  }

  shutdown() {
    this.isShuttingDown = true;
    console.log('\n🛑 Shutting down tunnels...');
    
    this.tunnels.forEach(({ tunnel, config }) => {
      try {
        tunnel.kill('SIGTERM');
        console.log(`📴 ${config.name} tunnel stopped`);
      } catch (error) {
        console.error(`Error stopping ${config.name} tunnel:`, error.message);
      }
    });
  }
}

// Main execution
const tunnelManager = new TunnelManager();

// Handle graceful shutdown
process.on('SIGINT', () => {
  tunnelManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tunnelManager.shutdown();
  process.exit(0);
});

// Start all tunnels
tunnelManager.startAllTunnels()
  .then((results) => {
    console.log('\n🎉 Tunnel startup complete!');
    console.log('Press Ctrl+C to stop all tunnels');
  })
  .catch((error) => {
    console.error('Failed to start tunnels:', error.message);
    process.exit(1);
  });
