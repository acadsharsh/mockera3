import { Client, Databases, Users } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("Missing Appwrite admin configuration.");
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

export const appwriteDb = new Databases(client);
export const appwriteUsers = new Users(client);
export const appwriteDatabaseId = databaseId;
