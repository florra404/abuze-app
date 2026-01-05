// --- СИСТЕМА УРОВНЕЙ ---
export const getLevelInfo = (xp) => {
  // Формула: Уровень = корень из (XP / 100)
  // 0 xp = 1 lvl
  // 100 xp = 2 lvl
  // 400 xp = 3 lvl
  // 2500 xp = 6 lvl ...
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
  
  const progressPercent = ((xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100;

  return { level, progressPercent, nextLevelXp };
};

// --- CSS КЛАССЫ РАМОК ---
export const getFrameClass = (level) => {
  if (level >= 50) return 'frame-entity'; // Красная пульсация
  if (level >= 20) return 'frame-iridescent'; // Радужная/Глитч
  if (level >= 10) return 'frame-gold'; // Золотая
  if (level >= 5) return 'frame-silver'; // Серебряная
  return 'frame-basic'; // Обычная
};