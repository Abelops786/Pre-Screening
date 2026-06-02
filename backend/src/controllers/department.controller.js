const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');

const DEFAULTS = [
  { name: 'Interpretation',   questionnaireType: 'INTERPRETATION' },
  { name: 'Sales',            questionnaireType: 'SALES' },
  { name: 'Customer Service', questionnaireType: 'CUSTOMER_SERVICE' },
];

// Ensure the three built-in departments always exist (idempotent)
const ensureDefaults = async () => {
  const count = await prisma.departmentConfig.count();
  if (count === 0) {
    for (const d of DEFAULTS) {
      await prisma.departmentConfig.upsert({
        where: { name: d.name },
        create: d,
        update: {},
      });
    }
  }
};

const listDepartments = async (_req, res, next) => {
  try {
    await ensureDefaults();
    const departments = await prisma.departmentConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return success(res, departments);
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, questionnaireType } = req.body;
    if (!name?.trim()) return error(res, 'Department name is required', 422);
    if (!['INTERPRETATION', 'SALES', 'CUSTOMER_SERVICE'].includes(questionnaireType)) {
      return error(res, 'A valid questionnaire type is required', 422);
    }
    const department = await prisma.departmentConfig.create({
      data: { name: name.trim(), questionnaireType },
    });
    return success(res, department, 'Department created', 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'A department with this name already exists', 409);
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { name, questionnaireType, isActive } = req.body;
    const data = {};
    if (name !== undefined)              data.name = name.trim();
    if (questionnaireType !== undefined) data.questionnaireType = questionnaireType;
    if (isActive !== undefined)          data.isActive = isActive;

    const department = await prisma.departmentConfig.update({
      where: { id: req.params.id },
      data,
    });
    return success(res, department, 'Department updated');
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'A department with this name already exists', 409);
    next(err);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    await prisma.departmentConfig.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Department deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };
