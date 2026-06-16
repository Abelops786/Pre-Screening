const router = require('express').Router();
const ctrl = require('../controllers/availability.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isRecruiter, isSuperAdmin } = require('../middleware/rbac.middleware');

// Public — candidate booking
router.get('/slots/:candidateId',  ctrl.getSlotsForCandidate);
router.post('/book/:candidateId',  ctrl.bookSlot);

// Recruiter/admin — manage own weekly hours
router.use(authenticate);
router.get('/',             isRecruiter, ctrl.listMine);
router.get('/my-interviews', isRecruiter, ctrl.myInterviews);
router.post('/interviews/:id/reassign', isSuperAdmin, ctrl.reassignBookedInterview);
router.post('/',            isRecruiter, ctrl.createSlotRule);
router.delete('/:id',       isRecruiter, ctrl.deleteSlotRule);

// Recruiter/admin — one-off blocks (day off / specific slot)
router.get('/exceptions',     isRecruiter, ctrl.listExceptions);
router.post('/exceptions',    isRecruiter, ctrl.createException);
router.delete('/exceptions/:id', isRecruiter, ctrl.deleteException);

module.exports = router;
