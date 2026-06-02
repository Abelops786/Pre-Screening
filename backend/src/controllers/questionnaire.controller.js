const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');
const defaults = require('../config/questionnaireDefaults');

const DEPARTMENTS = ['CUSTOMER_SERVICE', 'SALES', 'INTERPRETATION'];

// Ensure all three templates exist, seeded from defaults (idempotent)
const ensureDefaults = async () => {
  for (const dept of DEPARTMENTS) {
    const existing = await prisma.questionnaireTemplate.findUnique({ where: { department: dept } });
    if (!existing) {
      await prisma.questionnaireTemplate.create({
        data: { department: dept, schema: defaults.byDepartment[dept] },
      });
    }
  }
};

const listTemplates = async (_req, res, next) => {
  try {
    await ensureDefaults();
    const templates = await prisma.questionnaireTemplate.findMany({ orderBy: { department: 'asc' } });
    return success(res, templates);
  } catch (err) {
    next(err);
  }
};

const getTemplate = async (req, res, next) => {
  try {
    await ensureDefaults();
    const template = await prisma.questionnaireTemplate.findUnique({ where: { department: req.params.department } });
    if (!template) return error(res, 'Questionnaire not found', 404);
    return success(res, template);
  } catch (err) {
    next(err);
  }
};

// Public — candidate apply page fetches the schema for its department
const getPublicTemplate = async (req, res, next) => {
  try {
    await ensureDefaults();
    const template = await prisma.questionnaireTemplate.findUnique({ where: { department: req.params.department } });
    if (!template) return error(res, 'Questionnaire not found', 404);
    return success(res, { department: template.department, schema: template.schema });
  } catch (err) {
    next(err);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { schema } = req.body;
    if (!schema || !Array.isArray(schema.sections)) {
      return error(res, 'A valid schema with a sections array is required', 422);
    }
    const template = await prisma.questionnaireTemplate.update({
      where: { department: req.params.department },
      data: { schema },
    });
    return success(res, template, 'Questionnaire updated');
  } catch (err) {
    next(err);
  }
};

// Reset a department's questionnaire back to the built-in default
const resetTemplate = async (req, res, next) => {
  try {
    const dept = req.params.department;
    if (!defaults.byDepartment[dept]) return error(res, 'Unknown department', 422);
    const template = await prisma.questionnaireTemplate.upsert({
      where: { department: dept },
      create: { department: dept, schema: defaults.byDepartment[dept] },
      update: { schema: defaults.byDepartment[dept] },
    });
    return success(res, template, 'Questionnaire reset to default');
  } catch (err) {
    next(err);
  }
};

module.exports = { listTemplates, getTemplate, getPublicTemplate, updateTemplate, resetTemplate };
