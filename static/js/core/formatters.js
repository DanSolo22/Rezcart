// static/js/core/formatters.js
// Utilidades de formateo y clasificacion visual con FontAwesome 6

export const CATEGORY_METADATA = {
  meat: { label: 'Carnes / Aves', icon: 'fa-drumstick-bite', isCulinary: true, decayDays: 4 },
  fish: { label: 'Pescados / Mariscos', icon: 'fa-fish', isCulinary: true, decayDays: 3 },
  vegetables: { label: 'Verduras / Hortalizas', icon: 'fa-carrot', isCulinary: true, decayDays: 7 },
  fruits: { label: 'Frutas', icon: 'fa-apple-whole', isCulinary: true, decayDays: 8 },
  dairy: { label: 'Lácteos / Quesos', icon: 'fa-cheese', isCulinary: true, decayDays: 12 },
  eggs: { label: 'Huevos', icon: 'fa-egg', isCulinary: true, decayDays: 25 },
  dry_goods: { label: 'Pastas / Legumbres / Arroz', icon: 'fa-bowl-rice', isCulinary: true, decayDays: 180 },
  oils: { label: 'Aceites / Condimentos', icon: 'fa-bottle-droplet', isCulinary: true, decayDays: 200 },
  spices: { label: 'Especias', icon: 'fa-mortar-pestle', isCulinary: true, decayDays: 365 },
  cleaning: { label: 'Limpieza / Droguería', icon: 'fa-soap', isCulinary: false, decayDays: 999 },
  hardware: { label: 'Ferretería / Tecnología', icon: 'fa-wrench', isCulinary: false, decayDays: 999 },
  general: { label: 'General / Otros', icon: 'fa-box', isCulinary: false, decayDays: 999 }
};

// Diccionario local rapido para clasificacion offline (0 ms)
const LOCAL_DICTIONARY = {
  pollo: 'meat', pechuga: 'meat', ternera: 'meat', cerdo: 'meat', jamon: 'meat', bacon: 'meat', pavo: 'meat',
  salmon: 'fish', merluza: 'fish', atun: 'fish', gambas: 'fish', bacalao: 'fish',
  tomate: 'vegetables', cebolla: 'vegetables', ajo: 'vegetables', espinaca: 'vegetables', lechuga: 'vegetables',
  pimiento: 'vegetables', patata: 'vegetables', zanahoria: 'vegetables', calabacin: 'vegetables',
  manzana: 'fruits', platano: 'fruits', naranja: 'fruits', limon: 'fruits', aguacate: 'fruits', fresa: 'fruits',
  leche: 'dairy', queso: 'dairy', yogur: 'dairy', mantequilla: 'dairy', nata: 'dairy',
  huevo: 'eggs', huevos: 'eggs',
  arroz: 'dry_goods', pasta: 'dry_goods', espagueti: 'dry_goods', macarrones: 'dry_goods', garbanzos: 'dry_goods', lentejas: 'dry_goods',
  aceite: 'oils', vinagre: 'oils', salsa: 'oils',
  sal: 'spices', pimienta: 'spices', oregano: 'spices', pimenton: 'spices', canela: 'spices',
  detergente: 'cleaning', jabon: 'cleaning', suavizante: 'cleaning', lejia: 'cleaning', estropajo: 'cleaning', papel: 'cleaning',
  cable: 'hardware', usb: 'hardware', pilas: 'hardware', tornillo: 'hardware', bombilla: 'hardware'
};

/**
 * Clasifica un nombre de producto usando el diccionario local
 */
export function classifyItemLocal(name) {
  const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, category] of Object.entries(LOCAL_DICTIONARY)) {
    if (clean.includes(key)) {
      const meta = CATEGORY_METADATA[category] || CATEGORY_METADATA.general;
      return {
        category,
        isCulinary: meta.isCulinary,
        label: meta.label,
        icon: meta.icon
      };
    }
  }
  // Por defecto, si no coincide
  return {
    category: 'general',
    isCulinary: false,
    label: CATEGORY_METADATA.general.label,
    icon: CATEGORY_METADATA.general.icon
  };
}

/**
 * Calcula la frescura implicita basada en categoria y dias transcurridos
 */
export function calculateFreshness(categoryKey, daysAgo) {
  const meta = CATEGORY_METADATA[categoryKey] || { decayDays: 7 };
  const ratio = daysAgo / meta.decayDays;
  if (ratio >= 1.0) {
    return {
      status: 'warning',
      color: 'warning',
      label: `Lleva ${daysAgo} días (Revisar)`,
      badgeClass: 'pill-warning',
      indicatorClass: 'freshness-warning',
      icon: 'fa-triangle-exclamation'
    };
  }
  return {
    status: 'fresh',
    color: 'culinary',
    label: `Fresco (${daysAgo}d)`,
    badgeClass: 'pill-culinary',
    indicatorClass: 'freshness-fresh',
    icon: 'fa-circle-check'
  };
}
