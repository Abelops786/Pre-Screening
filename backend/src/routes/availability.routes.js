const router = require('express').Router();
const ctrl = require('../controllers/availability.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isRecruiter } = require('../middleware/rbac.middleware');

// Public — candidate booking
router.get('/slots/:candidateId',  ctrl.getSlotsForCandidate);
router.post('/book/:candidateId',  ctrl.bookSlot);

// Recruiter/admin — manage own weekly hours
router.use(authenticate);
router.get('/',             isRecruiter, ctrl.listMine);
router.get('/my-interviews', isRecruiter, ctrl.myInterviews);
router.post('/',            isRecruiter, ctrl.createSlotRule);
router.delete('/:id',       isRecruiter, ctrl.deleteSlotRule);

module.exports = router;
