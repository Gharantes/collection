// Preferência salva no localStorage; volta ao padrão se não houver ou for inválida.
export const readPref = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

export const savePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem storage, a preferência só não fica salva.
  }
};

// Momento salvo (ms), ou 0 se não houver.
export const readTime = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

// JSON salvo, ou o padrão se não houver ou for inválido.
export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
