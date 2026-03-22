/**
 * Hierarchy access helpers for customers (RM book + ASM direct book).
 */

export function userCanAccessCustomer(customer, accessibleUserIds) {
  if (!accessibleUserIds) return true;
  const rmRef = customer.rmId?._id ?? customer.rmId;
  const okRm = rmRef && accessibleUserIds.some((id) => id.equals(rmRef));
  const asmRef = customer.asmOwnerUserId?._id ?? customer.asmOwnerUserId;
  const okAsm =
    customer.isAsmDirectClient && asmRef && accessibleUserIds.some((id) => id.equals(asmRef));
  return Boolean(okRm || okAsm);
}

/** Mongo filter for customers visible to hierarchy (used with status, etc.) */
export function buildHierarchyCustomerFilter(accessibleUserIds) {
  if (!accessibleUserIds) return {};
  return {
    $or: [
      { rmId: { $in: accessibleUserIds } },
      { asmOwnerUserId: { $in: accessibleUserIds }, isAsmDirectClient: true }
    ]
  };
}
