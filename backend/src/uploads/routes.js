'use strict';

const express = require('express');
const cloudinary = require('cloudinary').v2;
const { requireAuth, requireRole } = require('../auth/middleware');

const router = express.Router();
const uploadFolder = 'hostel-hub/hostels';

// Returns a short-lived upload signature. The Cloudinary API secret stays on the server.
router.post('/video-signature', requireAuth, requireRole('agent', 'admin'), (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      error: {
        code: 'VIDEO_UPLOAD_NOT_CONFIGURED',
        message: 'Video uploads are not configured yet. Please contact the administrator.'
      }
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder: uploadFolder,
    timestamp
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return res.status(200).json({
    cloudName,
    apiKey,
    timestamp,
    folder: uploadFolder,
    resourceType: 'video',
    signature
  });
});

module.exports = router;
