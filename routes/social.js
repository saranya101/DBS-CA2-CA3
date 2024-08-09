const express = require('express');
const multer = require('multer');
const path = require('path');
const socialMediaController = require('../controllers/socialController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const router = express.Router();

router.use(jwtMiddleware.verifyToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Route to handle engagement submission
router.post('/submit',socialMediaController.submitEngagement);

router.get('/list', socialMediaController.listEngagements);
router.post('/update', socialMediaController.updateEngagement);

module.exports = router;
