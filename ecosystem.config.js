/**
 * PM2 Ecosystem Configuration
 * 
 * Run with: pm2 start ecosystem.config.js
 * 
 * Features:
 * - Cluster mode for multi-core utilization
 * - Auto-restart on crash
 * - Memory limit monitoring
 * - Log rotation
 */

module.exports = {
    apps: [
        {
            name: 'aster-backend',
            script: 'dist/server.js',
            cwd: './backend',

            // Cluster mode - use all available CPUs
            instances: 'max',
            exec_mode: 'cluster',

            // Environment
            env: {
                NODE_ENV: 'development',
                PORT: 3001,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
            },

            // Auto-restart
            autorestart: true,
            watch: false, // Disable in production
            max_restarts: 10,
            restart_delay: 1000,

            // Memory management
            max_memory_restart: '500M',

            // Logging
            log_file: './logs/combined.log',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Graceful shutdown
            kill_timeout: 5000,
            listen_timeout: 10000,

            // Health check
            wait_ready: true,

            // Metrics (for PM2 Plus)
            max_memory_restart: '500M',
        },
        {
            name: 'aster-worker',
            script: 'dist/worker.js',
            cwd: './backend',

            // Workers don't need cluster mode
            instances: 2,
            exec_mode: 'fork',

            env_production: {
                NODE_ENV: 'production',
            },

            autorestart: true,
            max_restarts: 10,
            restart_delay: 2000,

            log_file: './logs/worker-combined.log',
            error_file: './logs/worker-error.log',
            out_file: './logs/worker-out.log',
        },
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server.com'],
            ref: 'origin/main',
            repo: 'git@github.com:your-username/ai-trader.git',
            path: '/var/www/aster',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
        },
    },
};
