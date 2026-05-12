/**
 * 智能购物清单 - 食材合并算法
 * 
 * 核心功能：
 * 1. 将多个菜谱的食材合并为购物清单
 * 2. 相同名称 + 相同单位 → 合并数量
 * 3. 相同名称 + 不同单位 → 不合并
 * 4. "适量"、"少许" → 不合并
 */

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Recipe {
  id: string;
  ingredients: Ingredient[];
}

export interface MergedShoppingListItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  recipeIds: string[];
  checked: boolean;
  isManual: boolean;
}

/**
 * 合并多个菜谱的食材
 * @param recipes 菜谱列表
 * @returns 合并后的购物清单项
 */
export function mergeIngredients(recipes: Recipe[]): MergedShoppingListItem[] {
  const map = new Map<string, MergedShoppingListItem>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.name}:${ingredient.unit}`;

      // 特殊处理："适量"、"少许" 不合并
      if (ingredient.unit === '适量' || ingredient.unit === '少许') {
        const item: MergedShoppingListItem = {
          id: generateId(),
          name: ingredient.name,
          amount: 0,
          unit: ingredient.unit,
          recipeIds: [recipe.id],
          checked: false,
          isManual: false,
        };
        // 为适量/少许添加 recipeId 后缀，避免同菜谱多次出现时被覆盖
        map.set(`${key}_${recipe.id}`, item);
        continue;
      }

      // 解析数量
      const amount = parseFloat(ingredient.amount);
      if (isNaN(amount)) {
        console.warn(`⚠️ 无法解析食材数量: ${ingredient.name} - ${ingredient.amount}${ingredient.unit}`);
        continue;
      }

      // 合并逻辑
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.amount += amount;
        // 避免重复添加同一个菜谱 ID
        if (!existing.recipeIds.includes(recipe.id)) {
          existing.recipeIds.push(recipe.id);
        }
      } else {
        map.set(key, {
          id: generateId(),
          name: ingredient.name,
          amount,
          unit: ingredient.unit,
          recipeIds: [recipe.id],
          checked: false,
          isManual: false,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 规范化单位（可选：用于更智能的单位转换）
 * 例如：毫升 → ml，克 → g
 */
export function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    '毫升': 'ml',
    '升': 'L',
    '克': 'g',
    '千克': 'kg',
    '公斤': 'kg',
    '斤': 'jin',
    '两': 'liang',
  };
  return unitMap[unit] || unit;
}

/**
 * 智能单位转换（未来可扩展）
 * 例如：1000g → 1kg
 */
export function convertUnits(amount: number, fromUnit: string, toUnit: string): number | null {
  const conversions: Record<string, Record<string, number>> = {
    g: { kg: 0.001, mg: 1000 },
    kg: { g: 1000 },
    ml: { L: 0.001 },
    L: { ml: 1000 },
  };

  if (fromUnit === toUnit) return amount;

  const from = conversions[fromUnit];
  if (!from || !from[toUnit]) return null;

  return amount * from[toUnit];
}
