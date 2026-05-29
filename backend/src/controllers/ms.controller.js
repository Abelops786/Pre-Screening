const msService = require('../../services/microsoft.service');
const prisma = require('../../config/database');
const logger = require('../../utils/logger');

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
    const { accessToken, account } = tokenResponse;

    // For the MVP, we store the token for a specific "admin" user or a system config.
    // In a multi-tenant app, you'd link this to the logged-in admin's ID.
    // Here we just store it in a general setting or against a specific admin email.

    // We find the first super admin and attach the tokens to them
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (admin) {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          msAccessToken: accessToken,
          // tokenResponse.refreshToken might not exist if offline_access was not fully granted yet, but we try
          // MSAL node acquireTokenByCode might abstract refreshToken away into a token cache,
          // but for this MVP we store the token payload we have.
          msRefreshToken: tokenResponse.account?.username || 'linked',
        },
      });
      logger.info('Microsoft account connected', { username: account.username });
    }

    // Redirect back to frontend settings page with success
    res.redirect(`${process.env.FRONTEND_URL}/admin/settings?ms_connected=true`);
  } catch (error) {
    logger.error('Error in MS callback', { error });
    res.redirect(`${process.env.FRONTEND_URL}/admin/settings?ms_connected=false`);
  }
};

module.exports = {
  login,
  callback,
};
