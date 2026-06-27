module.exports = {
  apps: [
    {
      name: 'collar-backend',
      script: 'src/app.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
