import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint("https://sfo.cloud.appwrite.io/v1")
  .setProject("69a25c62003576337e58");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
