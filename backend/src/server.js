const dotenv = require('dotenv');
const http = require('http');

const app = require('./app');
const connectDB = require('./config/db');

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Workly API running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server failed to start:', error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
};

startServer();