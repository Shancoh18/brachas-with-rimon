/**
 * The Bracha App food database.
 *
 * ABSOLUTE RULE (see CLAUDE.md): every entry here is sourced ONLY from
 * chabad.org, brachos.org, or oukosher.org (OU Guide to Blessings). Claude
 * vision maps photos to these keys; it NEVER decides a bracha. All halachic
 * logic runs locally from this table + src/lib.
 *
 * B.R. = bracha rishona, B.A. = bracha achrona.
 */

export type Bracha =
  | 'Hamotzi'
  | 'Mezonos'
  | 'Hagafen'
  | 'Haetz'
  | 'Haadama'
  | 'Shehakol';

export type AfterBracha =
  | 'BirkatHamazon'
  | 'AlHamichya'
  | 'AlHagefen'
  | 'AlHaetz'
  | 'BoreiNefashos';

export type ShivaKey =
  | 'wheat'
  | 'barley'
  | 'grape'
  | 'fig'
  | 'pomegranate'
  | 'olive'
  | 'date';

export interface FoodEntry {
  key: string; // canonical id, e.g. "apple"
  names: string[]; // aliases for the vision mapping
  category:
    | 'Bread'
    | 'Grain'
    | 'Wine & Grape'
    | 'Tree Fruit'
    | 'Ground Produce'
    | 'Meat & Fish'
    | 'Dairy & Eggs'
    | 'Sweets'
    | 'Beverages'
    | 'Other';
  brachaRishona: Bracha;
  brachaAchrona: AfterBracha;
  shivasHaminim: boolean;
  shivaKey?: ShivaKey;
  isFiveGrain: boolean; // Al Hamichya eligibility
  isTreeFruit: boolean;
  isWineGrape: boolean;
  isDrink?: boolean;
  requiresSecondBracha?: { bracha: Bracha; achrona: AfterBracha; on: string };
  stateOverrides?: { cooked?: Bracha; raw?: Bracha };
  notes?: string;
  source: 'OU' | 'brachos.org' | 'chabad.org';
}

const f = (e: FoodEntry) => e;

export const FOODS: FoodEntry[] = [
  // ------------------------------------------------------------ HAMOTZI
  f({ key: 'bread', names: ['bread', 'loaf', 'sliced bread', 'toast', 'whole wheat bread', 'rye bread', 'sourdough'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Wash hands (netilat yadayim) first.', source: 'chabad.org' }),
  f({ key: 'challah', names: ['challah', 'challa', 'braided bread'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Wash hands first.', source: 'chabad.org' }),
  f({ key: 'roll', names: ['roll', 'bun', 'dinner roll', 'hamburger bun', 'hot dog bun', 'sandwich'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pita', names: ['pita', 'pita bread', 'laffa', 'flatbread'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'bagel', names: ['bagel', 'bialy'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'matzah', names: ['matzah', 'matzo', 'matza'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'pizza', names: ['pizza', 'pizza slice', 'cheese pizza'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Pas haba’ah b’kisnin; per OU two slices constitutes kevias seudah → Hamotzi / Birkat Hamazon.', source: 'brachos.org' }),

  // ------------------------------------------------------------ MEZONOS
  f({ key: 'cake', names: ['cake', 'chocolate cake', 'sponge cake', 'cupcake', 'muffin', 'brownie'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Pas haba’ah b’kisnin.', source: 'brachos.org' }),
  f({ key: 'cookies', names: ['cookie', 'cookies', 'biscuit', 'chocolate chip cookie'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'crackers', names: ['cracker', 'crackers', 'saltines', 'matzah crackers'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pretzels', names: ['pretzel', 'pretzels', 'soft pretzel'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pasta', names: ['pasta', 'noodles', 'spaghetti', 'macaroni', 'penne', 'lasagna', 'mac and cheese', 'ramen noodles', 'lokshen'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Cooked grain, not bread.', source: 'chabad.org' }),
  f({ key: 'couscous', names: ['couscous'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'cereal_grain', names: ['cheerios', 'wheaties', 'granola', 'grain cereal', 'bran flakes', 'shredded wheat', 'oat cereal'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Processed five-grain cereal (OU cereals list).', source: 'OU' }),
  f({ key: 'oatmeal', names: ['oatmeal', 'porridge', 'oats'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'barley', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'kneidlach', names: ['kneidlach', 'matzah ball', 'matzah balls', 'matzo ball'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'rice', names: ['rice', 'cooked rice', 'white rice', 'brown rice', 'fried rice'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Cooked rice that sticks together → Mezonos, but Borei Nefashos after (not a five-grain). Chabad notes a machlokes — ideally eat within a bread meal.', source: 'brachos.org' }),
  f({ key: 'rice_cereal', names: ['rice krispies', 'puffed rice', 'rice cakes', 'rice cake'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'sushi', names: ['sushi', 'sushi roll', 'california roll', 'maki'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Rice majority. A substantial piece of fish may warrant its own Shehakol — ask a rabbi.', source: 'brachos.org' }),

  // ------------------------------------------------------------ HAGAFEN
  f({ key: 'wine', names: ['wine', 'red wine', 'white wine', 'kiddush wine'], category: 'Wine & Grape', brachaRishona: 'Hagafen', brachaAchrona: 'AlHagefen', shivasHaminim: true, shivaKey: 'grape', isFiveGrain: false, isTreeFruit: false, isWineGrape: true, isDrink: true, source: 'chabad.org' }),
  f({ key: 'grape_juice', names: ['grape juice'], category: 'Wine & Grape', brachaRishona: 'Hagafen', brachaAchrona: 'AlHagefen', shivasHaminim: true, shivaKey: 'grape', isFiveGrain: false, isTreeFruit: false, isWineGrape: true, isDrink: true, source: 'chabad.org' }),
  f({ key: 'champagne', names: ['champagne', 'sparkling wine', 'prosecco'], category: 'Wine & Grape', brachaRishona: 'Hagafen', brachaAchrona: 'AlHagefen', shivasHaminim: true, shivaKey: 'grape', isFiveGrain: false, isTreeFruit: false, isWineGrape: true, isDrink: true, source: 'OU' }),
  f({ key: 'raisin_wine', names: ['raisin wine'], category: 'Wine & Grape', brachaRishona: 'Hagafen', brachaAchrona: 'AlHagefen', shivasHaminim: true, shivaKey: 'grape', isFiveGrain: false, isTreeFruit: false, isWineGrape: true, isDrink: true, source: 'OU' }),

  // ------------------------------------------------------------ HA'ETZ — Seven Species
  f({ key: 'grapes', names: ['grape', 'grapes', 'raisins', 'raisin'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'AlHaetz', shivasHaminim: true, shivaKey: 'grape', isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Seven Species.', source: 'chabad.org' }),
  f({ key: 'fig', names: ['fig', 'figs', 'dried figs'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'AlHaetz', shivasHaminim: true, shivaKey: 'fig', isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Seven Species.', source: 'chabad.org' }),
  f({ key: 'pomegranate', names: ['pomegranate', 'pomegranate seeds', 'arils'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'AlHaetz', shivasHaminim: true, shivaKey: 'pomegranate', isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Seven Species.', source: 'chabad.org' }),
  f({ key: 'olive', names: ['olive', 'olives', 'green olives', 'black olives'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'AlHaetz', shivasHaminim: true, shivaKey: 'olive', isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Seven Species.', source: 'chabad.org' }),
  f({ key: 'date', names: ['date', 'dates', 'medjool dates'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'AlHaetz', shivasHaminim: true, shivaKey: 'date', isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Seven Species.', source: 'chabad.org' }),

  // ------------------------------------------------------------ HA'ETZ — other tree fruit
  f({ key: 'apple', names: ['apple', 'apples', 'green apple', 'red apple'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'pear', names: ['pear', 'pears'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'apricot', names: ['apricot', 'apricots'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'cherry', names: ['cherry', 'cherries'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'peach', names: ['peach', 'peaches', 'nectarine'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'plum', names: ['plum', 'plums', 'prunes', 'prune'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'orange', names: ['orange', 'oranges'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'clementine', names: ['clementine', 'mandarin', 'tangerine'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'grapefruit', names: ['grapefruit'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'lemon_fruit', names: ['lemon', 'lime'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Rarely eaten alone; usually tafel or flavoring.', source: 'OU' }),
  f({ key: 'mango', names: ['mango', 'mangoes'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'avocado', names: ['avocado', 'guacamole'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'almond', names: ['almond', 'almonds'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'cashew', names: ['cashew', 'cashews'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'walnut', names: ['walnut', 'walnuts', 'pecan', 'pecans'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'chestnut', names: ['chestnut', 'chestnuts'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'coconut', names: ['coconut', 'shredded coconut'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'macaroon', names: ['macaroon', 'macaroons', 'coconut macaroon'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Shredded-coconut macaroons (STAR-K Pesach chart).', source: 'OU' }),
  f({ key: 'blueberry', names: ['blueberry', 'blueberries'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'blackberry', names: ['blackberry', 'blackberries', 'raspberry', 'raspberries'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),
  f({ key: 'currant', names: ['currant', 'currants'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'OU' }),

  // ------------------------------------------------------------ HA'ADAMA
  f({ key: 'banana', names: ['banana', 'bananas'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'melon', names: ['melon', 'cantaloupe', 'honeydew'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'watermelon', names: ['watermelon'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'strawberry', names: ['strawberry', 'strawberries'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'cranberry', names: ['cranberry', 'cranberries'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Grows in a bog.', source: 'OU' }),
  f({ key: 'craisins', names: ['craisins', 'dried cranberries'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pineapple', names: ['pineapple'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'potato', names: ['potato', 'potatoes', 'baked potato', 'roasted potatoes', 'french fries', 'fries', 'potato kugel', 'latke', 'latkes', 'hash browns'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'mashed_potato', names: ['mashed potato', 'mashed potatoes'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Still recognizable as potato; instant potato is also Ha’adama (brachos.org, R’ Belsky).', source: 'brachos.org' }),
  f({ key: 'carrot', names: ['carrot', 'carrots', 'baby carrots'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Ha’adama raw or cooked.', source: 'chabad.org' }),
  f({ key: 'tomato', names: ['tomato', 'tomatoes', 'cherry tomatoes'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'broccoli', names: ['broccoli'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'cucumber', names: ['cucumber', 'cucumbers', 'pickles', 'pickle'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, stateOverrides: { cooked: 'Shehakol' }, notes: 'Normally eaten raw; cooked → Shehakol.', source: 'OU' }),
  f({ key: 'celery', names: ['celery'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'onion', names: ['onion', 'onions', 'fried onions', 'sauteed onions'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, stateOverrides: { raw: 'Shehakol' }, notes: 'Normally eaten cooked; raw → Shehakol.', source: 'OU' }),
  f({ key: 'peas', names: ['peas', 'green peas', 'snap peas'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'corn', names: ['corn', 'corn on the cob', 'sweet corn'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'peanut', names: ['peanut', 'peanuts'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'lettuce', names: ['lettuce', 'salad', 'green salad', 'romaine', 'mixed greens', 'coleslaw'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pepper_veg', names: ['pepper', 'bell pepper', 'red pepper', 'green pepper'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'sweet_potato', names: ['sweet potato', 'yam', 'sweet potato fries'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'squash', names: ['squash', 'zucchini', 'butternut squash', 'pumpkin'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'cauliflower', names: ['cauliflower'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'spinach', names: ['spinach', 'kale', 'greens'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'beans', names: ['beans', 'chickpeas', 'hummus', 'lentils', 'edamame', 'black beans'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'veg_soup', names: ['vegetable soup', 'minestrone'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Ha’adama only if the vegetables were cooked for the soup, are eaten, taste strongly, and are visible; otherwise Shehakol.', source: 'chabad.org' }),

  // ------------------------------------------------------------ SHEHAKOL — protein & dairy
  f({ key: 'meat', names: ['meat', 'beef', 'steak', 'lamb', 'brisket', 'burger', 'hamburger patty', 'meatballs', 'deli meat', 'pastrami', 'salami'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'chicken', names: ['chicken', 'poultry', 'turkey', 'schnitzel', 'grilled chicken', 'roast chicken', 'chicken nuggets'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'fish', names: ['fish', 'salmon', 'tuna', 'tilapia', 'gefilte fish', 'herring', 'lox', 'smoked salmon'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'egg', names: ['egg', 'eggs', 'omelet', 'omelette', 'scrambled eggs', 'hard boiled egg', 'fried egg'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'cheese', names: ['cheese', 'cottage cheese', 'cream cheese', 'mozzarella', 'string cheese'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'milk', names: ['milk', 'glass of milk'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'chabad.org' }),
  f({ key: 'yogurt', names: ['yogurt', 'greek yogurt'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'butter', names: ['butter', 'margarine'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'buttermilk', names: ['buttermilk', 'kefir'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'chicken_soup', names: ['chicken soup', 'chicken broth', 'soup with chicken'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'mushroom', names: ['mushroom', 'mushrooms', 'portobello'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Doesn’t draw nourishment from soil nutrients like produce.', source: 'chabad.org' }),
  f({ key: 'tofu', names: ['tofu', 'soy protein'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),

  // ------------------------------------------------------------ SHEHAKOL — sweets
  f({ key: 'chocolate', names: ['chocolate', 'chocolate bar', 'chocolate chips', 'truffles'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'candy', names: ['candy', 'hard candy', 'lollipop', 'gummy', 'gummies', 'jelly beans', 'marshmallow'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'After-bracha rare for hard candy (a kezayis within the shiur time is uncommon).', source: 'OU' }),
  f({ key: 'ice_cream', names: ['ice cream', 'gelato', 'frozen yogurt', 'sorbet'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'ice_cream_sandwich', names: ['ice cream sandwich', 'ice cream cone with wafer'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: true, shivaKey: 'wheat', isFiveGrain: true, isTreeFruit: false, isWineGrape: false, requiresSecondBracha: { bracha: 'Shehakol', achrona: 'BoreiNefashos', on: 'the ice cream' }, notes: 'Two distinct components: Mezonos on the wafer, Shehakol on the ice cream (brachos.org).', source: 'brachos.org' }),
  f({ key: 'honey', names: ['honey'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'sugar', names: ['sugar', 'sugar cubes'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),

  // ------------------------------------------------------------ SHEHAKOL — beverages
  f({ key: 'water', names: ['water', 'glass of water', 'bottled water'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'seltzer', names: ['seltzer', 'sparkling water', 'carbonated water', 'club soda'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'coffee', names: ['coffee', 'espresso', 'latte', 'cappuccino', 'iced coffee'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'tea', names: ['tea', 'iced tea', 'herbal tea', 'green tea'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'soda', names: ['soda', 'cola', 'coke', 'sprite', 'root beer', 'soft drink', 'pop'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'orange_juice', names: ['orange juice', 'oj'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, notes: 'Squeezed fruit juice (except grape) → Shehakol (OU).', source: 'OU' }),
  f({ key: 'apple_juice', names: ['apple juice', 'apple cider', 'cider'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'cranberry_juice', names: ['cranberry juice'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'grapefruit_juice', names: ['grapefruit juice'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'pineapple_juice', names: ['pineapple juice'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'prune_juice', names: ['prune juice'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, notes: 'Most plums are not grown for juice (OU).', source: 'OU' }),
  f({ key: 'tomato_juice', names: ['tomato juice', 'v8'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'lemonade', names: ['lemonade'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'smoothie', names: ['smoothie', 'fruit smoothie', 'milkshake', 'shake'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'beer', names: ['beer', 'ale', 'lager', 'stout'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'whiskey', names: ['whiskey', 'whisky', 'scotch', 'bourbon', 'vodka', 'gin', 'rum', 'arak', 'tequila'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'brandy', names: ['brandy', 'cognac'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, notes: 'Distilled from wine → Shehakol: “Because brandy has a flavor distinct from the original wine, its brachah is Shehakol” (OU).', source: 'OU' }),
  f({ key: 'liqueur', names: ['liqueur', 'amaretto', 'baileys'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
  f({ key: 'chocolate_milk', names: ['chocolate milk', 'hot chocolate', 'cocoa', 'hot cocoa'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'OU' }),
];

export const FOOD_BY_KEY: Record<string, FoodEntry> = Object.fromEntries(
  FOODS.map((e) => [e.key, e]),
);

export const FOOD_DATABASE_KEYS = FOODS.map((e) => e.key);

/** Human-facing labels for each bracha. */
export const BRACHA_LABEL: Record<Bracha, string> = {
  Hamotzi: 'Hamotzi',
  Mezonos: 'Mezonos',
  Hagafen: 'Hagafen',
  Haetz: 'Ha’etz',
  Haadama: 'Ha’adama',
  Shehakol: 'Shehakol',
};

export const AFTER_LABEL: Record<AfterBracha, string> = {
  BirkatHamazon: 'Birkat Hamazon',
  AlHamichya: 'Al Hamichya',
  AlHagefen: 'Al Hagefen',
  AlHaetz: 'Al Ha’etz',
  BoreiNefashos: 'Borei Nefashos',
};
