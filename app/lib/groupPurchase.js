'use client';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function isGroupPurchase(product) {
  return product?.purchaseType === 'group' || product?.type === 'group';
}

export function getGroupEndDate(product) {
  if (!product) return null;

  if (isGroupPurchase(product)) {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  if (product.groupEndDate) {
    const date = new Date(product.groupEndDate);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const closingDays = Number(product?.groupPurchaseDetails?.closingDays) || 0;
  if (closingDays > 0) {
    const baseDate = product?.createdAt ? new Date(product.createdAt) : new Date();
    if (!Number.isNaN(baseDate.getTime())) {
      return new Date(baseDate.getTime() + closingDays * DAY_MS);
    }
  }

  return null;
}

export function getGroupTimeRemaining(product, referenceTime = Date.now()) {
  if (!isGroupPurchase(product)) {
    return null;
  }

  const endDate = getGroupEndDate(product);
  if (!endDate) {
    return null;
  }

  const totalMs = endDate.getTime() - referenceTime;
  if (totalMs <= 0) {
    return { totalMs, days: 0, hours: 0, minutes: 0, expired: true };
  }

  const days = Math.floor(totalMs / DAY_MS);
  const hours = Math.floor((totalMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((totalMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((totalMs % MINUTE_MS) / 1000);

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    expired: false,
  };
}

export function formatGroupCountdown(timeLeft) {
  if (!timeLeft) {
    return '';
  }

  if (timeLeft.expired) {
    return 'הסתיים';
  }

  if (timeLeft.days > 0) {
    if (timeLeft.hours > 0) {
      return `נסגר בעוד ${timeLeft.days} ימים ו-${timeLeft.hours} שעות`;
    }
    return `נסגר בעוד ${timeLeft.days} ימים`;
  }

  if (timeLeft.hours > 0) {
    return `נסגר בעוד ${timeLeft.hours} שעות`;
  }

  if (timeLeft.minutes > 0) {
    return 'נסגר בעוד פחות משעה';
  }

  return 'נסגר בקרוב';
}
