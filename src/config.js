require('dotenv').config();

module.exports = {
  PORT: process.env.PORT,
  DB_USER: process.env.DB_USER,
  HOST: process.env.DB_HOST,
  DATABASE: process.env.DB_NAME,
  PASSWORD: process.env.DB_PASSWORD,
  DBPORT: process.env.DB_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRATION: process.env.JWT_EXPIRES_IN
};