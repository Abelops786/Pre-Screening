const msService = require('../services/microsoft.service');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const login = async (req, res) => {
  try {
    const url = await msService.getAuthCodeUrl();
    res.redirect(url);
  } catch (error) {
    res.status(500).send('Error initiating MS login');
  }
};

const callback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('No code provided');
    }

    const tokenResponse = await msService.acquireTokenByCode(code);
    const { accessToken, refreshToken, account } = tokenResponse;

    // Store the tokens against the first super admin (single-tenant MVP)
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (admin) {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          msAccessToken: accessToken,
          // Persist the real refresh token so meetings keep working after the
          // access token expires. Fall back to keeping any existing value.
          msRefreshToken: refreshToken || admin.msRefreshToken || null,
        },
      });
      logger.info('Microsoft account connected', { username: account?.username, hasRefresh: !!refreshToken });
    }

    res.redirect(`${process.env.FRONTEND_URL}/admin/settings?ms_connected=true`);
  } catch (error) {
    logger.error('Error in MS callback', { error });
    res.redirect(`${process.env.FRONTEND_URL}/admin/settings?ms_connected=false`);
  }
};

// Report whether a Microsoft account is connected (a refresh token is stored)
const status = async (req, res) => {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', msRefreshToken: { not: null } },
      select: { id: true },
    });
    return res.json({ success: true, data: { connected: !!admin } });
  } catch (error) {
    return res.json({ success: true, data: { connected: false } });
  }
};

module.exports = {
  login,
  callback,
  status,
};
