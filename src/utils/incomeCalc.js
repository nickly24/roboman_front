/**
 * Расчёт суммы рефералки и чистой прибыли для поступления
 */
export const calcReferralAmount = (income) => {
  if (!income?.referral_percent || income.referral_percent <= 0) return 0;
  const amt = parseFloat(income.amount) || 0;
  const tax = parseFloat(income.tax_amount) || 0;
  const pct = parseFloat(income.referral_percent) / 100;
  return income.referral_from_net ? (amt - tax) * pct : amt * pct;
};

export const calcIncomeNet = (income) => {
  const amt = parseFloat(income.amount) || 0;
  const tax = parseFloat(income.tax_amount) || 0;
  const referral = calcReferralAmount(income);
  return amt - tax - referral;
};
