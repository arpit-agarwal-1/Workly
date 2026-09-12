const http = require('http');
const mongoose = require('mongoose');

require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

let server;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          console.log('HTTP server closed');
          resolve();
        });
      });
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Workly API running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server failed to start:', error.message);
      process.exit(1);
    });

    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
};

startServer();