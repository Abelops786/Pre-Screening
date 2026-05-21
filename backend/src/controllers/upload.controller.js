const prisma = require('../config/database');
const storageService = require('../services/storage.service');
const { success, error } = require('../utils/responseHelper');

const uploadDocuments = async (req, res, next) => {
  try {
    const { candidateId } = req.params;

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return error(res, 'Candidate not found', 404);

    const updates = {};

    if (req.files?.cv?.[0]) {
      const file = req.files.cv[0];
      updates.cvUrl = await storageService.upload(file.buffer, file.originalname, file.mimetype, `cv/${candidateId}`);
    }

    if (req.files?.certificate?.[0]) {
      const file = req.files.certificate[0];
      updates.certificateUrl = await storageService.upload(file.buffer, file.originalname, file.mimetype, `certs/${candidateId}`);
    }

    if (Object.keys(updates).length === 0) {
      return error(res, 'No files provided', 400);
    }

    await prisma.candidate.update({ where: { id: candidateId }, data: updates });

    return success(res, updates, 'Documents uploaded successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocuments };
