const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');

const generateSlug = async (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  let slug = base;
  let attempt = 0;
  while (await prisma.job.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
};

// Auto-publish any scheduled jobs whose time has passed
const autoPublishScheduled = async () => {
  await prisma.job.updateMany({
    where: {
      status: 'SCHEDULED',
      scheduledPublishAt: { lte: new Date() },
    },
    data: { status: 'PUBLISHED' },
  });
};

const CLIENT_WORK_WINDOWS = {
  BIG_LANGUAGE:  { window: '5:00 AM – 6:00 PM PST',  timezone: 'PST' },
  TRANSPERFECT:  { window: '6:00 AM – 8:00 PM MST',  timezone: 'MST' },
  LANGO:         { window: '6:00 AM – 6:00 PM CST',  timezone: 'CST' },
  BOOSTLINGO:    { window: '6:00 AM – 6:00 PM PST',  timezone: 'PST' },
};

const listJobs = async (req, res, next) => {
  try {
    await autoPublishScheduled();
    const { status, department } = req.query;
    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;

    const jobs = await prisma.job.findMany({
      where,
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, jobs);
  } catch (err) {
    next(err);
  }
};

const listPublishedJobs = async (req, res, next) => {
  try {
    await autoPublishScheduled();
    const jobs = await prisma.job.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, slug: true, title: true, department: true, departmentLabel: true, language: true, description: true,
        positionType: true, roleType: true, client: true,
        minDownloadSpeed: true, minUploadSpeed: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = jobs.map((j) => ({
      ...j,
      urlKey: j.slug || j.id,
      workWindow: j.client ? CLIENT_WORK_WINDOWS[j.client]?.window : null,
      client: undefined,
    }));
    return success(res, mapped);
  } catch (err) {
    next(err);
  }
};

const getJob = async (req, res, next) => {
  try {
    await autoPublishScheduled();
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!job) return error(res, 'Job not found', 404);
    return success(res, job);
  } catch (err) {
    next(err);
  }
};

const getPublicJob = async (req, res, next) => {
  try {
    await autoPublishScheduled();
    const param = req.params.id;
    // Support lookup by slug OR by CUID id
    const job = await prisma.job.findFirst({
      where: { OR: [{ id: param }, { slug: param }] },
      select: {
        id: true, slug: true, title: true, department: true, departmentLabel: true, language: true, description: true,
        status: true, positionType: true, roleType: true,
        minDownloadSpeed: true, minUploadSpeed: true, client: true,
      },
    });
    if (!job || job.status !== 'PUBLISHED') return error(res, 'Job not found', 404);
    const result = {
      ...job,
      urlKey: job.slug || job.id,
      workWindow: job.client ? CLIENT_WORK_WINDOWS[job.client]?.window : null,
      client: undefined,
    };
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const createJob = async (req, res, next) => {
  try {
    const {
      title, department, departmentLabel, language, status, scheduledPublishAt,
      client, positionType, roleType, description,
      minDownloadSpeed, minUploadSpeed,
    } = req.body;

    if (!title?.trim()) return error(res, 'Title is required', 422);
    if (!department)    return error(res, 'Department is required', 422);

    if (status === 'SCHEDULED' && !scheduledPublishAt) {
      return error(res, 'Scheduled publish date is required for scheduled jobs', 422);
    }

    const slug = await generateSlug(title.trim());
    const job = await prisma.job.create({
      data: {
        title: title.trim(),
        slug,
        department,
        departmentLabel: departmentLabel?.trim() || null,
        language: language?.trim() || null,
        status: status || 'DRAFT',
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
        client: client || null,
        positionType: positionType || null,
        roleType: roleType || null,
        description: description?.trim() || null,
        minDownloadSpeed: minDownloadSpeed ?? 20,
        minUploadSpeed: minUploadSpeed ?? 10,
      },
    });
    return success(res, { ...job, urlKey: job.slug || job.id }, 'Job created', 201);
  } catch (err) {
    next(err);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const {
      title, department, departmentLabel, language, status, scheduledPublishAt,
      client, positionType, roleType, description,
      minDownloadSpeed, minUploadSpeed,
    } = req.body;

    if (status === 'SCHEDULED' && !scheduledPublishAt) {
      return error(res, 'Scheduled publish date is required', 422);
    }

    const data = {};
    if (title !== undefined)              data.title = title.trim();
    if (department !== undefined)         data.department = department;
    if (departmentLabel !== undefined)    data.departmentLabel = departmentLabel?.trim() || null;
    if (language !== undefined)           data.language = language?.trim() || null;
    if (status !== undefined)             data.status = status;
    if (scheduledPublishAt !== undefined) data.scheduledPublishAt = scheduledPublishAt ? new Date(scheduledPublishAt) : null;
    if (client !== undefined)             data.client = client || null;
    if (positionType !== undefined)       data.positionType = positionType || null;
    if (roleType !== undefined)           data.roleType = roleType || null;
    if (description !== undefined)        data.description = description?.trim() || null;
    if (minDownloadSpeed !== undefined)   data.minDownloadSpeed = minDownloadSpeed;
    if (minUploadSpeed !== undefined)     data.minUploadSpeed = minUploadSpeed;

    const job = await prisma.job.update({ where: { id: req.params.id }, data });
    return success(res, job, 'Job updated');
  } catch (err) {
    next(err);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Job deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { listJobs, listPublishedJobs, getJob, getPublicJob, createJob, updateJob, deleteJob };
