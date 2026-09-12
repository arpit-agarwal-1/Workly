const getHealthStatus = () => ({
  status: 'success',
  message: 'Workly API is running',
});

const getReadyStatus = () => {
  const isReady = require('mongoose').connection.readyState === 1;

  return {
    status: isReady ? 'success' : 'error',
    message: isReady ? 'MongoDB connected' : 'MongoDB not connected',
    ready: isReady,
  };
};

module.exports = {
  getHealthStatus,
  getReadyStatus,
};
