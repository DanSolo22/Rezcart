// static/js/core/state.js
// Almacen reactivo central con datos semilla realistas para la maqueta

import { classifyItemLocal } from './formatters.js';

class AppState {
  constructor() {
    this.listeners = [];

    // Carritos iniciales simulados
    this.carts = [
      {
        id: 'cart-1',
        name: 'Mercadona Semanal',
        type: 'mixed',
        items: [
          { id: 'item-101', name: 'Pechuga de pollo fileteada', category: 'meat', isCulinary: true, bought: false },
          { id: 'item-102', name: 'Tomates pera para ensalada', category: 'vegetables', isCulinary: true, bought: true },
          { id: 'item-103', name: 'Leche entera fresca', category: 'dairy', isCulinary: true, bought: true },
          { id: 'item-104', name: 'Detergente lavadora lavanda', category: 'cleaning', isCulinary: false, bought: true },
          { id: 'item-105', name: 'Arroz redondo 1kg', category: 'dry_goods', isCulinary: true, bought: false },
          { id: 'item-106', name: 'Papel higiénico 12 rollos', category: 'cleaning', isCulinary: false, bought: false }
        ]
      },
      {
        id: 'cart-2',
        name: 'AliExpress Brico',
        type: 'non_food',
        items: [
          { id: 'item-201', name: 'Cable USB-C trenzado 2m', category: 'hardware', isCulinary: false, bought: true },
          { id: 'item-202', name: 'Juego destornilladores precisión', category: 'hardware', isCulinary: false, bought: false }
        ]
      },
      {
        id: 'cart-3',
        name: 'Frutería de Barrio',
        type: 'grocery',
        items: [
          { id: 'item-301', name: 'Aguacates maduros', category: 'fruits', isCulinary: true, bought: false },
          { id: 'item-302', name: 'Plátanos de Canarias', category: 'fruits', isCulinary: true, bought: true },
          { id: 'item-303', name: 'Cebollas moradas', category: 'vegetables', isCulinary: true, bought: true }
        ]
      }
    ];

    this.activeCartId = 'cart-1';

    // Despensa virtual con frescura implicita estimada
    this.pantry = [
      { id: 'pan-1', name: 'Huevos camperos', category: 'eggs', inStock: true, daysAgo: 3 },
      { id: 'pan-2', name: 'Aceite de oliva virgen extra', category: 'oils', inStock: true, daysAgo: 8 },
      { id: 'pan-3', name: 'Ajo morado', category: 'vegetables', inStock: true, daysAgo: 6 },
      { id: 'pan-4', name: 'Sal fina y pimienta negra', category: 'spices', inStock: true, daysAgo: 14 },
      { id: 'pan-5', name: 'Pechuga de pollo', category: 'meat', inStock: true, daysAgo: 5 }, // Warning (4d max)
      { id: 'pan-6', name: 'Espinacas frescas bolsa', category: 'vegetables', inStock: true, daysAgo: 8 }, // Warning (7d max)
      { id: 'pan-7', name: 'Pasta espaguetis', category: 'dry_goods', inStock: true, daysAgo: 12 },
      { id: 'pan-8', name: 'Queso parmesano cuña', category: 'dairy', inStock: true, daysAgo: 5 }
    ];

    // Catalogo base de recetas
    this.recipes = [
      {
        id: 'rec-1',
        title: 'Pollo al Ajillo Dorado',
        time: '20 min',
        difficulty: 'Fácil',
        dietary: ['sin_gluten', 'sin_lactosa'],
        description: 'Pechuga troceada salteada en aceite de oliva con láminas de ajo crujiente y pimienta negra recién molida.',
        ingredients: ['Pechuga de pollo', 'Ajo morado', 'Aceite de oliva virgen extra', 'Sal fina y pimienta negra'],
        optional: ['Perejil fresco']
      },
      {
        id: 'rec-2',
        title: 'Espaguetis al Parmesano y Ajo',
        time: '15 min',
        difficulty: 'Muy fácil',
        dietary: ['vegetariano'],
        description: 'Pasta al dente emulsionada con aceite aromático de ajo y abundante parmesano rallado.',
        ingredients: ['Pasta espaguetis', 'Ajo morado', 'Queso parmesano cuña', 'Aceite de oliva virgen extra'],
        optional: ['Pimienta negra']
      },
      {
        id: 'rec-3',
        title: 'Revuelto Cremoso de Espinacas y Pollo',
        time: '15 min',
        difficulty: 'Fácil',
        dietary: ['sin_gluten', 'keto'],
        description: 'Huevos de corral batidos suavemente con espinacas rehogadas y tiras de pollo a la plancha.',
        ingredients: ['Huevos camperos', 'Espinacas frescas bolsa', 'Pechuga de pollo', 'Aceite de oliva virgen extra'],
        optional: []
      },
      {
        id: 'rec-4',
        title: 'Pasta cremosa con Pollo y Queso',
        time: '22 min',
        difficulty: 'Media',
        dietary: [],
        description: 'Plato reconfortante con salsa suave de nata y parmesano fundido.',
        ingredients: ['Pasta espaguetis', 'Pechuga de pollo', 'Queso parmesano cuña', 'Nata para cocinar'],
        missingFallback: 'Falta nata: Chef IA sugiere emulsionar leche con mantequilla o agua de cocción con parmesano.'
      }
    ];

    // Perfiles dieteticos activos en el hogar
    this.dietaryFilters = []; // ['sin_gluten', 'sin_lactosa', 'vegano', 'vegetariano', 'keto']
    
    // Vista activa
    this.currentView = 'carts'; // 'carts', 'pantry', 'vision', 'recipes', 'household'
  }

  // Suscripcion a cambios
  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // --- Metodos de Carritos ---
  getActiveCart() {
    return this.carts.find(c => c.id === this.activeCartId) || this.carts[0];
  }

  setActiveCart(cartId) {
    this.activeCartId = cartId;
    this.notify();
  }

  createCart(name, type = 'mixed') {
    const newCart = {
      id: 'cart-' + Date.now(),
      name,
      type,
      items: []
    };
    this.carts.push(newCart);
    this.activeCartId = newCart.id;
    this.notify();
    return newCart;
  }

  addItemToCart(rawName, cartId = null) {
    const targetCartId = cartId || this.activeCartId;
    const cart = this.carts.find(c => c.id === targetCartId);
    if (!cart) return;

    const classification = classifyItemLocal(rawName);
    const newItem = {
      id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 4),
      name: rawName.trim(),
      category: classification.category,
      isCulinary: classification.isCulinary,
      bought: false
    };

    cart.items.unshift(newItem);
    this.notify();
    return newItem;
  }

  toggleItemBought(itemId) {
    const cart = this.getActiveCart();
    if (!cart) return;
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      item.bought = !item.bought;
      this.notify();
    }
  }

  removeItemFromCart(itemId) {
    const cart = this.getActiveCart();
    if (!cart) return;
    cart.items = cart.items.filter(i => i.id !== itemId);
    this.notify();
  }

  // Finalizar compra: traspaso guiado a la despensa
  confirmPurchaseCheckout(cartId) {
    const cart = this.carts.find(c => c.id === cartId);
    if (!cart) return { culinaryAdded: 0, nonFoodArchived: 0, pendingKept: 0 };

    const boughtCulinary = cart.items.filter(i => i.bought && i.isCulinary);
    const boughtNonFood = cart.items.filter(i => i.bought && !i.isCulinary);
    const pendingItems = cart.items.filter(i => !i.bought);

    // 1. Traspasar culinarios a la despensa
    boughtCulinary.forEach(item => {
      // Si ya existia, actualizamos frescura
      const existing = this.pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.inStock = true;
        existing.daysAgo = 0;
      } else {
        this.pantry.unshift({
          id: 'pan-' + Date.now() + Math.random().toString(36).substr(2, 3),
          name: item.name,
          category: item.category,
          inStock: true,
          daysAgo: 0
        });
      }
    });

    // 2. En el carrito solo conservamos los pendientes
    cart.items = pendingItems;

    this.notify();
    return {
      culinaryAdded: boughtCulinary.length,
      nonFoodArchived: boughtNonFood.length,
      pendingKept: pendingItems.length
    };
  }

  // --- Metodos de Despensa ---
  depletePantryItem(itemId, returnToCart = true) {
    const item = this.pantry.find(p => p.id === itemId);
    if (!item) return;

    // Eliminar de despensa
    this.pantry = this.pantry.filter(p => p.id !== itemId);

    // Opcionalmente devolver al carrito activo de la compra
    if (returnToCart) {
      const activeCart = this.getActiveCart();
      if (activeCart) {
        this.addItemToCart(item.name, activeCart.id);
      }
    }

    this.notify();
  }

  verifyFreshnessPantryItem(itemId) {
    const item = this.pantry.find(p => p.id === itemId);
    if (item) {
      item.daysAgo = 0; // Confirmado fresco hoy
      this.notify();
    }
  }

  // Reconciliacion por Foto de Nevera
  applyVisionReconciliation(newFoundItems, confirmedItems, missingToArchive) {
    // 1. Nuevos encontrados en foto
    newFoundItems.forEach(name => {
      const classification = classifyItemLocal(name);
      this.pantry.unshift({
        id: 'pan-vision-' + Date.now() + Math.random().toString(36).substr(2, 3),
        name,
        category: classification.category,
        inStock: true,
        daysAgo: 0
      });
    });

    // 2. Confirmados
    confirmedItems.forEach(id => {
      const item = this.pantry.find(p => p.id === id);
      if (item) item.daysAgo = 0;
    });

    // 3. Ausentes marcados como terminados
    missingToArchive.forEach(id => {
      this.pantry = this.pantry.filter(p => p.id !== id);
    });

    this.notify();
  }

  // --- Dietas ---
  toggleDietaryRestriction(restrictionKey) {
    if (this.dietaryFilters.includes(restrictionKey)) {
      this.dietaryFilters = this.dietaryFilters.filter(k => k !== restrictionKey);
    } else {
      this.dietaryFilters.push(restrictionKey);
    }
    this.notify();
  }
}

export const state = new AppState();
