import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

export const client: MongoClient =
  global._mongoClient ?? new MongoClient(process.env.MONGODB_URI);

if (process.env.NODE_ENV === "development") {
  global._mongoClient = client;
}

export const db = client.db("whisk-auto");