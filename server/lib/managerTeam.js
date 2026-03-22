import User from '../models/User.js';

/**
 * RMs to show on manager dashboards: ASM → direct RMs; BM → RMs under ASMs;
 * RSM → RMs under BM→ASM chain; ADMIN → sample of all RMs.
 */
export async function getTeamRmsForDashboard(req) {
  const { user } = req;
  const direct = await User.find({ managerId: user._id, isActive: true }).lean();

  if (user.role === 'ASM') {
    return direct.filter((u) => u.role === 'RM');
  }
  if (user.role === 'BM') {
    const asmIds = direct.filter((u) => u.role === 'ASM').map((u) => u._id);
    if (!asmIds.length) return [];
    return User.find({ managerId: { $in: asmIds }, role: 'RM', isActive: true }).lean();
  }
  if (user.role === 'RSM') {
    const bmIds = direct.filter((u) => u.role === 'BM').map((u) => u._id);
    if (!bmIds.length) return [];
    const asms = await User.find({ managerId: { $in: bmIds }, role: 'ASM', isActive: true }).lean();
    const asmIds = asms.map((a) => a._id);
    if (!asmIds.length) return [];
    return User.find({ managerId: { $in: asmIds }, role: 'RM', isActive: true }).lean();
  }
  if (user.role === 'ADMIN') {
    return User.find({ role: 'RM', isActive: true }).limit(200).lean();
  }
  return [];
}

export async function assertManagerCanAccessRm(req, rmId) {
  const team = await getTeamRmsForDashboard(req);
  const ok = team.some((r) => String(r._id) === String(rmId));
  if (!ok) {
    const err = new Error('RM not in your team');
    err.code = 'RM_NOT_IN_TEAM';
    throw err;
  }
}

/** BM may only load ASM detail for direct reports. */
export async function assertBmCanAccessAsm(req, asmId) {
  if (req.user.role !== 'BM') {
    const err = new Error('Only BM can access ASM cluster detail here');
    err.code = 'FORBIDDEN_ROLE';
    throw err;
  }
  const asm = await User.findById(asmId).lean();
  if (!asm || asm.role !== 'ASM' || String(asm.managerId) !== String(req.user._id)) {
    const err = new Error('ASM not in your branch');
    err.code = 'ASM_NOT_IN_BRANCH';
    throw err;
  }
}
