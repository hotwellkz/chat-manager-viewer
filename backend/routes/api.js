import express from 'express';
import { handlePrompt } from '../controllers/prompt.controller.js';
import { handleDeployment } from '../controllers/deployment.controller.js';
import { handleFiles } from '../controllers/files.controller.js';

const router = express.Router();

router.post('/prompt', handlePrompt);
router.post('/deploy', handleDeployment);
router.post('/files', handleFiles);

export default router;