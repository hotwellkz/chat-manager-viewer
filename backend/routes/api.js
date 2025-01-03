import express from 'express';
import { handlePrompt } from '../controllers/prompt.controller.js';
import { handleUpdateFiles } from '../controllers/files.controller.js';

const router = express.Router();

router.post('/prompt', handlePrompt);
router.post('/update-files', handleUpdateFiles);

export default router;