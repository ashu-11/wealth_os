import express from 'express';
import User from '../models/User.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Login with email/password
router.post('/login', async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.ssoProvider) {
      return res.status(400).json({ 
        error: `This account uses ${user.ssoProvider} SSO. Please login with ${user.ssoProvider}.`
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        regionCode: user.regionCode,
        branchCode: user.branchCode
      }
    });
  } catch (err) {
    next(err);
  }
});

// Google SSO callback
router.post('/sso/google', async (req, res, next) => {
  try {
    const { googleToken, profile } = req.body;
    
    // In production, verify googleToken with Google's API
    // For now, we trust the profile data
    
    if (!profile || !profile.email) {
      return res.status(400).json({ error: 'Invalid Google profile' });
    }
    
    let user = await User.findOne({ email: profile.email });
    
    if (!user) {
      // Map job title to role
      const roleMap = {
        'relationship manager': 'RM',
        'rm': 'RM',
        'area sales manager': 'ASM',
        'asm': 'ASM',
        'branch manager': 'BM',
        'bm': 'BM',
        'regional sales manager': 'RSM',
        'rsm': 'RSM'
      };
      
      const jobTitle = (profile.jobTitle || '').toLowerCase();
      const role = roleMap[jobTitle] || 'RM';
      
      user = await User.create({
        email: profile.email,
        name: profile.name,
        role,
        ssoProvider: 'google',
        ssoId: profile.sub,
        avatar: profile.picture
      });
    } else if (!user.ssoProvider) {
      return res.status(400).json({ 
        error: 'This account uses password login. Please login with email/password.'
      });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Azure AD SSO callback
router.post('/sso/azure', async (req, res, next) => {
  try {
    const { azureToken, profile } = req.body;
    
    if (!profile || !profile.email) {
      return res.status(400).json({ error: 'Invalid Azure profile' });
    }
    
    let user = await User.findOne({ email: profile.email });
    
    if (!user) {
      // Map job title to role
      const roleMap = {
        'relationship manager': 'RM',
        'area sales manager': 'ASM',
        'branch manager': 'BM',
        'regional sales manager': 'RSM'
      };
      
      const jobTitle = (profile.jobTitle || '').toLowerCase();
      const role = roleMap[jobTitle] || 'RM';
      
      user = await User.create({
        email: profile.email,
        name: profile.displayName || profile.name,
        role,
        ssoProvider: 'azure',
        ssoId: profile.oid
      });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    regionCode: req.user.regionCode,
    branchCode: req.user.branchCode,
    targetAum: req.user.targetAum,
    targetSip: req.user.targetSip
  });
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticate, async (req, res) => {
  // In a real app, you might blacklist the token
  res.json({ success: true });
});

export default router;
