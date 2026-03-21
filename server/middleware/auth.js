import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wealthos-dev-secret';

// Verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    next(err);
  }
};

// Role-based authorization
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Hierarchy-based access (RM sees own customers, ASM sees team's customers, etc.)
export const hierarchyAccess = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Store accessible user IDs based on hierarchy
    req.accessibleUserIds = [user._id];
    
    if (user.role === 'ASM') {
      // ASM can access their direct reports (RMs)
      const teamMembers = await User.find({ managerId: user._id });
      req.accessibleUserIds.push(...teamMembers.map(m => m._id));
    } else if (user.role === 'BM') {
      // BM can access ASMs and their RMs
      const asms = await User.find({ managerId: user._id });
      const asmIds = asms.map(a => a._id);
      const rms = await User.find({ managerId: { $in: asmIds } });
      req.accessibleUserIds.push(...asmIds, ...rms.map(r => r._id));
    } else if (user.role === 'RSM' || user.role === 'ADMIN') {
      // RSM/Admin can access everyone in their region (or all for admin)
      if (user.role === 'ADMIN') {
        req.accessibleUserIds = null; // null means all
      } else {
        const allInRegion = await User.find({ regionCode: user.regionCode });
        req.accessibleUserIds = allInRegion.map(u => u._id);
      }
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

export default { authenticate, authorize, generateToken, hierarchyAccess };
