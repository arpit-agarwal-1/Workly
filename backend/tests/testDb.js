const getTestMongoUri = () => {
  const testMongoUri = process.env.TEST_MONGODB_URI;

  if (!testMongoUri || !testMongoUri.trim()) {
    throw new Error(
      'TEST_MONGODB_URI is not configured. Set TEST_MONGODB_URI to a dedicated test database before running backend tests. Do not use MONGODB_URI for tests.'
    );
  }

  return testMongoUri;
};

const connectTestDb = async (mongoose) => {
  const mongoUri = getTestMongoUri();
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
};

const clearCollections = async (models) => {
  await Promise.all(
    models.map((model) => model.deleteMany({}))
  );
};

module.exports = {
  getTestMongoUri,
  connectTestDb,
  clearCollections,
};
