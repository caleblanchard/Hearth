// Prisma 7 configuration file
// This file configures the datasource URL for Prisma migrations and client
require("dotenv/config");

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
