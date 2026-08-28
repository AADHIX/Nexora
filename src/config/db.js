const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('./logger');

// Use Google Public DNS to resolve MongoDB Atlas SRV records
// (some ISP routers fail to resolve SRV/TXT records)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection error: ', error);
    process.exit(1);
  }
};

module.exports = connectDB;
