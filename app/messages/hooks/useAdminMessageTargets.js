import { useMemo } from 'react';

const ROLE_LABELS = {
  admin: 'מנהל',
  agent: 'סוכן',
  customer: 'לקוח',
  all: 'כולם',
};

export function useAdminMessageTargets(messages = [], currentTargetRole, currentTargetUserId) {
  return useMemo(() => {
    const usersMap = new Map();

    messages.forEach((item) => {
      const senderId = item.senderId;
      if (senderId && item.senderRole !== 'admin') {
        usersMap.set(senderId, {
          userId: senderId,
          role: item.senderRole,
          lastMessageAt: item.createdAt,
          label: `${ROLE_LABELS[item.senderRole] || item.senderRole} • ${senderId.slice(-6)}`,
        });
      }
      if (item.targetUserId && item.targetRole !== 'admin') {
        usersMap.set(item.targetUserId, {
          userId: item.targetUserId,
          role: item.targetRole,
          lastMessageAt: item.createdAt,
          label: `${ROLE_LABELS[item.targetRole] || item.targetRole} • ${item.targetUserId.slice(-6)}`,
        });
      }
    });

    const list = Array.from(usersMap.values()).sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    const active =
      currentTargetRole === 'direct' && currentTargetUserId
        ? list.find((item) => item.userId === currentTargetUserId) || null
        : null;

    return { targets: list, activeTarget: active };
  }, [messages, currentTargetRole, currentTargetUserId]);
}
