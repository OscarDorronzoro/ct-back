module.exports = {
  apps: [
    {
      name: 'ct-back',
      script: './dist/app.js',
      cwd: "/var/www/collar_project/backend",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
    },
  ],
};
