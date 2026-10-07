const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeEmail, USER_STATUS } = require('../models/User');

const globalMongoose = global;
if (!globalMongoose.__mongooseCache) {
  globalMongoose.__mongooseCache = { conn: null, promise: null, migrated: false };
}

const migrateLegacyUsers = async () => {
  if (globalMongoose.__mongooseCache.migrated) return;

  const legacyUsers = await User.find({
    $or: [{ normalizedEmail: { $exists: false } }, { normalizedEmail: null }, { normalizedEmail: '' }],
  }).select('+password');

  for (const user of legacyUsers) {
    if (user.email) {
      user.normalizedEmail = normalizeEmail(user.email);
      user.email = user.normalizedEmail;
    }
    if (!user.status) {
      user.status = user.isActive === false ? USER_STATUS.SUSPENDED : USER_STATUS.ACTIVE;
    }
    await user.save({ validateBeforeSave: false });
  }

  globalMongoose.__mongooseCache.migrated = true;
};

const connectDB = async () => {
  if (globalMongoose.__mongooseCache.conn) {
    return globalMongoose.__mongooseCache.conn;
  }

  if (mongoose.connection.readyState === 1) {
    globalMongoose.__mongooseCache.conn = mongoose.connection;
    await migrateLegacyUsers();
    return mongoose.connection;
  }

  if (globalMongoose.__mongooseCache.promise) {
    return globalMongoose.__mongooseCache.promise;
  }

  try {
    globalMongoose.__mongooseCache.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000,
        maxPoolSize: 10,
        minPoolSize: 1,
      })
      .then(async (conn) => {
        globalMongoose.__mongooseCache.conn = conn.connection;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await migrateLegacyUsers();
        return conn.connection;
      });

    return await globalMongoose.__mongooseCache.promise;
  } catch (error) {
    globalMongoose.__mongooseCache.promise = null;
    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
