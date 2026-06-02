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

const SCOPES = ['User.Read', 'OnlineMeetings.ReadWrite', 'offline_access'];

const acquireTokenByCode = async (code) => {
  const tokenRequest = { code, scopes: SCOPES, redirectUri: process.env.MS_REDIRECT_URI };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);

    // Extract the long-lived refresh token from the MSAL cache so we can mint
    // fresh access tokens later (access tokens expire after ~1 hour).
    let refreshToken = null;
    try {
      const cache = JSON.parse(cca.getTokenCache().serialize());
      const rtStore = cache.RefreshToken || {};
      const firstKey = Object.keys(rtStore)[0];
      if (firstKey) refreshToken = rtStore[firstKey]?.secret || null;
    } catch (e) {
      logger.warn('Could not extract MS refresh token from cache', { error: e.message });
    }

    return { ...response, refreshToken };
  } catch (error) {
    logger.error('Error acquiring token by code', { error });
    throw error;
  }
};

// Exchange a stored refresh token for a fresh access token
const refreshAccessToken = async (refreshToken) => {
  const response = await cca.acquireTokenByRefreshToken({ refreshToken, scopes: SCOPES });
  return response.accessToken;
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

// Create a meeting using a refresh token — always gets a fresh access token first,
// so it keeps working long after the original login (no "token expired" errors).
const createOnlineMeetingWithRefresh = async (refreshToken, subject) => {
  const accessToken = await refreshAccessToken(refreshToken);
  return createOnlineMeeting(accessToken, subject);
};

module.exports = {
  getAuthCodeUrl,
  acquireTokenByCode,
  refreshAccessToken,
  createOnlineMeeting,
  createOnlineMeetingWithRefresh,
};
