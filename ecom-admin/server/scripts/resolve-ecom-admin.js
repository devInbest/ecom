require('dotenv').config();

const mongoose = require('mongoose');

async function main() {
  const uri = process.env.ECOM_WEB_MONGODB_URI || 'mongodb://localhost:27017/forma';
  const email = (process.env.ECOM_WEB_ADMIN_EMAIL || 'admin@nonsense.store').toLowerCase();

  await mongoose.connect(uri);
  let user = await mongoose.connection.db.collection('users').findOne({ email });

  if (!user) {
    user = await mongoose.connection.db.collection('users').findOne({ role: 'ADMIN' });
  }

  if (!user) {
    console.error(`No storefront admin found for ${email}. Run "pnpm db:seed" in ecom-web first.`);
    process.exit(1);
  }

  console.log(`ECOM_WEB_ADMIN_USER_ID=${user._id.toString()}`);
  console.log(`# Copy the line above into server/.env along with ECOM_WEB_JWT_SECRET from ecom-web/.env`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
