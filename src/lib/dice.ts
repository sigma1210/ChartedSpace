export const roll1d6 = (): number => Math.floor(Math.random() * 6) + 1;
export const roll2d6 = (): number => roll1d6() + roll1d6();

export const statDM = (stat: number): number => {
  if (stat <= 2) return -2;
  if (stat <= 5) return -1;
  if (stat <= 8) return 0;
  if (stat <= 11) return 1;
  if (stat <= 14) return 2;
  return 3;
};
