export const getLevelInfo = (xp) => {
  // Формула: Уровень = корень из (XP / 100). 
  // 100 XP = 2 lvl, 10000 XP = 11 lvl.
  // Максимум 100 уровень (это 1.000.000 XP)
  
  let level = Math.floor(Math.sqrt(xp / 100)) + 1;
  if (level > 100) level = 100;

  // Расчет прогресса до следующего уровня
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  
  let progressPercent = (xpInLevel / xpNeeded) * 100;
  if (level === 100) progressPercent = 100;

  return { level, progressPercent: Math.min(Math.max(progressPercent, 0), 100) };
};

export const getFrameClass = (level) => {
  if (level >= 100) return 'frame-entity'; // Красная пульсирующая
  if (level >= 50) return 'frame-iridescent';
  if (level >= 20) return 'frame-gold';
  if (level >= 5) return 'frame-silver';
  return 'frame-basic';
};