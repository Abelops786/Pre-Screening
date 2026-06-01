const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const logger = require('../utils/logger');

const msalConfig = {
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID || 'common'}`,
    clientSecret: process.env.MS_CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

const getGraphClient = (accessToken) => {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

const getAuthCodeUrl = async () => {
  const authCodeUrlParameters = {
    scopes: ['User.Read', 'OnlineMeetings.ReadWrite', 'offline_access'],
    redirectUri: process.env.MS_REDIRECT_URI,
  };

  try {
    const response = await cca.getAuthCodeUrl(authCodeUrlParameters);
    return response;
  } catch (error) {
    logger.error('Error generating auth code url', { error });
    throw error;
  }
};

const acquireTokenByCode = async (code) => {
  const tokenRequest = {
    code,
    scopes: ['User.Read', 'OnlineMeetings.ReadWrite', 'offline_access'],
    redirectUri: process.env.MS_REDIRECT_URI,
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    return response;
  } catch (error) {
    logger.error('Error acquiring token by code', { error });
    throw error;
  }
};

const createOnlineMeeting = async (accessToken, subject) => {
  const client = getGraphClient(accessToken);

  // startDateTime = 1 week from now, endDateTime = 1 week + 1 hour
  // Both are required by the Graph API
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);

  const meeting = {
    subject:       subject || 'TalentScreen Interview',
    startDateTime: start.toISOString(),
    endDateTime:   end.toISOString(),
  };

  try {
    const response = await client.api('/me/onlineMeetings').post(meeting);
    return response;
  } catch (error) {
    logger.error('Error creating online meeting', { error });
    throw error;
  }
};

module.exports = {
  getAuthCodeUrl,
  acquireTokenByCode,
  createOnlineMeeting,
};
