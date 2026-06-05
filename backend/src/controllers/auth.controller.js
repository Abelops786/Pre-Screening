const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) return error(res, 'Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const token = signToken(user);
    return success(res, {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, department: true, createdAt: true },
    });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

// Self-service: the logged-in user updates their own name / email / password.
// Changing email or password requires the current password for security.
const updateMe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

    const { name, email, currentPassword, newPassword } = req.body;
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me) return error(res, 'User not found', 404);

    const changingEmail    = email && email !== me.email;
    const changingPassword = !!newPassword;

    if (changingEmail || changingPassword) {
      if (!currentPassword) return error(res, 'Please enter your current password to change your email or password', 400);
      const ok = await bcrypt.compare(currentPassword, me.passwordHash);
      if (!ok) return error(res, 'Current password is incorrect', 401);
    }

    const data = {};
    if (name !== undefined && String(name).trim()) data.name = String(name).trim();
    if (changingEmail) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== me.id) return error(res, 'That email address is already in use', 409);
      data.email = email;
    }
    if (changingPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);

    if (Object.keys(data).length === 0) return error(res, 'Nothing to update', 400);

    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: { id: true, email: true, name: true, role: true, department: true },
    });

    // Re-issue the token since name/email are embedded in it.
    const token = signToken(updated);
    return success(res, { user: updated, token }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

    const { email, password, name, role, department } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, name, role, department },
      select: { id: true, email: true, name: true, role: true, department: true, createdAt: true },
    });
    return success(res, user, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, department: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, users);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, department, isActive, password } = req.body;

    const data = {};
    if (name !== undefined)       data.name = name;
    if (role !== undefined)       data.role = role;
    if (department !== undefined) data.department = department;
    if (isActive !== undefined)   data.isActive = isActive;
    if (password)                 data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, department: true, isActive: true },
    });
    return success(res, user, 'User updated');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return success(res, {}, 'User deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, updateMe, createUser, listUsers, updateUser, deleteUser };
