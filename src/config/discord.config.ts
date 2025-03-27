import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ 
  path: path.resolve(__dirname, '../../src/environments/.env') 
});


export const discordConfig = {
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: process.env.DISCORD_REDIRECT_URI!,
  scopes: ['identify', 'email', 'guilds']
};
