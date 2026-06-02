const router = require('express').Router();
const departmentController = require('../controllers/department.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',       isAdmin, departmentController.listDepartments);
router.post('/',      isAdmin, departmentController.createDepartment);
router.patch('/:id',  isAdmin, departmentController.updateDepartment);
router.delete('/:id', isAdmin, departmentController.deleteDepartment);

module.exports = router;
