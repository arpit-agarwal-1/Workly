const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not defined in the environment variables.'
    );
  }

  try {
    await mongoose.connect(mongoUri);

    if (process.env.NODE_ENV !== 'production') {
      await mongoose.connection.syncIndexes();
      console.log('MongoDB indexes synchronized');
    }

    console.log('MongoDB connected successfully');

    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;