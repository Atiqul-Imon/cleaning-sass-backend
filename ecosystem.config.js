// PM2 Ecosystem Configuration
// This file manages the backend process on the server
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'clenvora-api',
      script: 'dist/main.js',
      cwd: '/var/www/clenvora-api/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/pm2/clenvora-api-error.log',
      out_file: '/var/log/pm2/clenvora-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};



