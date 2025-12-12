const express = require('express');
const router = express.Router();
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const { authenticateAccessToken } = require('../middleware/authMiddleware');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const sanitizeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  profilePictureUrl: user.profilePictureUrl,
  birthdate: user.birthdate,
  phoneNumber: user.phoneNumber
});

router.post('/upload-url', authenticateAccessToken, async (req, res) => {
  console.log(`📷 [UPLOAD URL] Request from User: ${req.user.id}`);
  try {
    const { fileName, fileType } = req.body;
    const key = `profilePicture/${req.user.id}/${Date.now()}.${fileName.split('.').pop()}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });
    
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const fileUrl = `${process.env.CLOUDFRONT_URL}/${key}`;
    
    console.log(`✅ [UPLOAD URL] Generated for user: ${req.user.id}`);
    res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error(`❌ [UPLOAD URL] Error:`, err.message);
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
});

router.post('/register', async (req, res) => {
  console.log(`📝 [REGISTER] Request from IP: ${req.ip}, Email: ${req.body.email}`);
  try {
    const { firstName, lastName, email, password, birthdate, phoneNumber, profilePictureUrl } = req.body;
    if (!firstName || !lastName || !email || !password || !phoneNumber) {
      console.log(`❌ [REGISTER] Validation failed - Missing fields for ${email}`);
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`❌ [REGISTER] Email already exists: ${email}`);
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      birthdate,
      phoneNumber,
      profilePictureUrl: profilePictureUrl || null
    });

    await user.save();
    console.log(`✅ [REGISTER] Success - User created: ${user._id}, Email: ${email}`);

    const accessToken = signAccessToken({ id: user._id, email: user.email });
    const refreshToken = signRefreshToken({ id: user._id, email: user.email });

    user.refreshTokens.push({ token: refreshToken, createdAt: new Date() });
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error(`❌ [REGISTER] Error for ${req.body.email}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  console.log(`🔐 [LOGIN] Request from IP: ${req.ip}, Email: ${req.body.email}`);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log(`❌ [LOGIN] Missing credentials`);
      return res.status(400).json({ message: 'Email & password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ [LOGIN] User not found: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ [LOGIN] Invalid password for: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`✅ [LOGIN] Success - User: ${user._id}, Email: ${email}`);

    const accessToken = signAccessToken({ id: user._id, email: user.email });
    const refreshToken = signRefreshToken({ id: user._id, email: user.email });

    user.refreshTokens.push({ token: refreshToken, createdAt: new Date() });
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error(`❌ [LOGIN] Error for ${req.body.email}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh-token', async (req, res) => {
  console.log(`🔄 [REFRESH] Request from IP: ${req.ip}`);
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      console.log(`❌ [REFRESH] Missing refresh token`);
      return res.status(400).json({ message: 'Refresh token required' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      console.log(`❌ [REFRESH] Invalid token:`, err.message);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokens.some(rt => rt.token === refreshToken)) {
      console.log(`❌ [REFRESH] Token not recognized for user: ${payload.id}`);
      return res.status(401).json({ message: 'Refresh token not recognized' });
    }

    console.log(`✅ [REFRESH] Success - User: ${user._id}`);

    const newAccessToken = signAccessToken({ id: user._id, email: user.email });
    const newRefreshToken = signRefreshToken({ id: user._id, email: user.email });

    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken, createdAt: new Date() });
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(`❌ [REFRESH] Error:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authenticateAccessToken, async (req, res) => {
  console.log(`✏️ [PROFILE UPDATE] Request from User: ${req.user.id}`);
  try {
    const { firstName, lastName, phoneNumber, birthdate, profilePictureUrl } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log(`❌ [PROFILE UPDATE] User not found: ${req.user.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (birthdate !== undefined) user.birthdate = birthdate;
    if (profilePictureUrl !== undefined) user.profilePictureUrl = profilePictureUrl;

    await user.save();
    console.log(`✅ [PROFILE UPDATE] Success - User: ${user._id}`);

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error(`❌ [PROFILE UPDATE] Error for user ${req.user?.id}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
