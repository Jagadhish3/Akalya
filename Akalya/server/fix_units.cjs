const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Akalya').then(async () => {
  try {
    const res = await mongoose.connection.collection('classes').updateMany(
      { unit: { $exists: false } },
      { $set: { unit: 1 } }
    );
    console.log('Modified classes:', res.modifiedCount);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
