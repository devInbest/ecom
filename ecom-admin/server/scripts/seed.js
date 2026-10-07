require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const { USER_STATUS, normalizeEmail } = require('../src/models/User');
const connectDB = require('../src/config/db');

const seed = async () => {
  await connectDB();

  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL || 'admin@nonsense.store');
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@Secure123!';
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';

  const existing = await User.findOne({ normalizedEmail: email });
  if (existing) {
    if (!existing.normalizedEmail) {
      existing.normalizedEmail = email;
      existing.status = USER_STATUS.ACTIVE;
      await existing.save({ validateBeforeSave: false });
      console.log(`Migrated existing user: ${email}`);
    } else {
      console.log(`Seed skipped: user already exists (${email})`);
    }
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name,
    email,
    normalizedEmail: email,
    password,
    role: 'SUPERADMIN',
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
  });

  console.log(`Created SUPERADMIN: ${email}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
