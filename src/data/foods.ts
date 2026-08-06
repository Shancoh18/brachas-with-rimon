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

  // ------------------------------------------------------- 2026-08-06 expansion
  // Sourced + independently re-verified against brachos.org / OU / chabad.org
  // (per-entry citations recorded in the expansion audit).
  f({ key: 'corn-bread', names: ['corn bread', 'cornbread'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'french-toast', names: ['french toast'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'melba-toast', names: ['melba toast'], category: 'Bread', brachaRishona: 'Hamotzi', brachaAchrona: 'BirkatHamazon', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'barley-soup', names: ['barley soup', 'mushroom barley soup'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU: to say Al Hamichya one must eat a k’zayit of barley within 2-9 minutes.', source: 'OU' }),
  f({ key: 'bourekas', names: ['bourekas', 'burekas', 'boureka', 'cheese bourekas', 'potato bourekas'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'One Mezonos on the pastry covers the filling, per the source’s dough-base rule.', source: 'chabad.org' }),
  f({ key: 'cheese-blintzes', names: ['blintzes', 'blintz', 'cheese blintzes', 'cheese blintz'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'cheesecake', names: ['cheesecake', 'cheese cake'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU: as with all cakes, the dough is considered the primary ingredient and only Mezonot is necessary.', source: 'OU' }),
  f({ key: 'cinnamon-toast-crunch', names: ['cinnamon toast crunch'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'cocoa-puffs', names: ['cocoa puffs'], category: 'Grain', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'corn-chex', names: ['corn chex'], category: 'Grain', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'corn-flakes', names: ['corn flakes', 'cornflakes', 'kellogg\'s corn flakes'], category: 'Grain', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'crepes', names: ['crepe', 'crepes'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'doughnut', names: ['doughnut', 'donut', 'donuts', 'doughnuts', 'jelly donut', 'sufganiya', 'sufganiyot'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'dumplings', names: ['dumplings', 'dumpling'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'farfel', names: ['farfel', 'egg barley'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'farina', names: ['farina', 'cream of wheat'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'froot-loops', names: ['froot loops', 'fruit loops'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'golden-grahams', names: ['golden grahams'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'granola-bar', names: ['granola bar', 'granola bars', 'oat bar'], category: 'Grain', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU comment cites the Shulchan Aruch’s stringency to try to avoid eating a k’zayit of the five grains when their bracha is Ha-adamah.', source: 'OU' }),
  f({ key: 'hamantaschen', names: ['hamantaschen', 'hamantasch', 'hamentashen', 'hamantash'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'honey-nut-cheerios', names: ['honey nut cheerios'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'kasha-varnishkes', names: ['kasha varnishkes', 'kasha and bows'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'kishka', names: ['kishka', 'kishke'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Mezonos when the ingredients contain flour from one of the five grains.', source: 'brachos.org' }),
  f({ key: 'kishke', names: ['stuffed derma'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU: provided the ingredients include flour made of any of the Five Principal Species.', source: 'OU' }),
  f({ key: 'kix', names: ['kix', 'kix cereal'], category: 'Grain', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'kreplach', names: ['kreplach'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'lokshen-kugel', names: ['lukshen kugel'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'matza-brei', names: ['matza brei', 'matzah brei', 'matzo brei'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'If any piece of matza is a K’zayis or larger, the bracha is Hamotzi instead.', source: 'brachos.org' }),
  f({ key: 'noodle-kugel', names: ['noodle kugel', 'lokshen kugel', 'noodle pudding'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'pancakes', names: ['pancakes', 'pancake', 'flapjacks', 'hotcakes'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'pie', names: ['pie', 'apple pie', 'fruit pie'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU: as with all cakes, the dough (crust) is considered the primary ingredient.', source: 'OU' }),
  f({ key: 'potato-knish', names: ['knish', 'knishes', 'potato knish'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'OU: provided the ingredients include flour made from one of the Five Principal Species.', source: 'OU' }),
  f({ key: 'ptitim', names: ['ptitim', 'israeli couscous', 'pearl couscous'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'Regular couscous is already in the database; this adds the Israeli/pearl couscous names.', source: 'chabad.org' }),
  f({ key: 'raisin-bran', names: ['raisin bran', 'raisin bran cereal'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'rice-chex', names: ['rice chex'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Rice-based cereal; OU chart lists Borei Nefashot as the after-blessing (like rice, no Al Hamichya).', source: 'OU' }),
  f({ key: 'special-k', names: ['special k', 'special k original'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'trix', names: ['trix', 'trix cereal'], category: 'Grain', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'waffles', names: ['waffles', 'waffle', 'belgian waffle'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'wheat-chex', names: ['wheat chex'], category: 'Grain', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'brazil-nut', names: ['brazil nut', 'brazil nuts'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'canned-peaches', names: ['canned peaches', 'canned pears', 'peaches in syrup'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Based on the source’s resembles-original-form rule; canned pineapple would be Haadama like fresh pineapple.', source: 'chabad.org' }),
  f({ key: 'dragon-fruit', names: ['dragon fruit', 'dragonfruit', 'pitaya'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'dried-fruit', names: ['dried fruit', 'dried apricot', 'dried apricots', 'dried mango', 'dried apple', 'apple chips', 'dried peach', 'dried pear', 'dried cherries'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, notes: 'Dried figs, dates and raisins (seven species, Al Haetz after-blessing) are separate entries already in the database; this entry covers non-shiva dried tree fruits.', source: 'chabad.org' }),
  f({ key: 'hazelnut', names: ['hazelnut', 'hazelnuts', 'filbert', 'filberts'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'kiwi', names: ['kiwi', 'kiwis', 'kiwi fruit'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'macadamia', names: ['macadamia', 'macadamias', 'macadamia nuts'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'persimmon', names: ['persimmon', 'persimmons'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'pistachio', names: ['pistachio', 'pistachios', 'pistachio nuts'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'pitanga', names: ['pitanga', 'surinam cherry', 'suriname cherry'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'tamarind', names: ['tamarind', 'tamarindo'], category: 'Tree Fruit', brachaRishona: 'Haetz', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: true, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'artichoke', names: ['artichoke', 'artichokes'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'asparagus', names: ['asparagus'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'baked-beans', names: ['baked beans', 'beans in tomato sauce'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'beet', names: ['roasted beets', 'pickled beets'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'beets', names: ['beet', 'beets', 'beetroot'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'brussels-sprouts', names: ['brussels sprouts', 'brussel sprouts', 'brussels sprout'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'cabbage', names: ['cabbage', 'red cabbage', 'green cabbage', 'shredded cabbage'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'eggplant', names: ['eggplant', 'eggplants', 'aubergine'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'garlic', names: ['garlic', 'garlic clove', 'garlic cloves'], category: 'Ground Produce', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, stateOverrides: { raw: 'Shehakol' }, notes: 'Raw or boiled garlic is Shehakol; fried in oil is Hoadama.', source: 'brachos.org' }),
  f({ key: 'ginger', names: ['ginger', 'fresh ginger', 'candied ginger'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Hoadama applies when the ginger is raw or dry and candied.', source: 'brachos.org' }),
  f({ key: 'green-beans', names: ['haricot verts'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'hearts-of-palm', names: ['hearts of palm', 'heart of palm', 'palm hearts'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'kasha', names: ['kasha', 'buckwheat', 'buckwheat groats'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Buckwheat is not one of the five grains; if five-grain flour is added the bracha changes.', source: 'brachos.org' }),
  f({ key: 'kidney-beans', names: ['kidney beans', 'red kidney beans', 'red beans'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'papaya', names: ['papaya', 'papayas'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Treated as a vegetable for brachos because the papaya tree bears fruit in its first year.', source: 'brachos.org' }),
  f({ key: 'parsnip', names: ['parsnip', 'parsnips'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'popcorn', names: ['popcorn', 'popped corn'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'potato-chips', names: ['potato chips', 'chips', 'crisps'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'potato-salad', names: ['potato salad'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'pringles', names: ['pringles'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Hoadama per Rav Belsky even though made from processed potato flakes/flour.', source: 'brachos.org' }),
  f({ key: 'pumpkin-seeds', names: ['pumpkin seeds', 'pepitas', 'roasted pumpkin seeds'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'quinoa', names: ['quinoa', 'cooked quinoa'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Not one of the five grains, so no Al Hamichya.', source: 'brachos.org' }),
  f({ key: 'radish', names: ['radish', 'radishes'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'scallion', names: ['scallion', 'scallions', 'green onion', 'green onions', 'leek', 'leeks'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'string-beans', names: ['string beans', 'green beans', 'string bean'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'turnip', names: ['turnip', 'turnips'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'tzimmes', names: ['tzimmes', 'tsimmes', 'carrot tzimmes'], category: 'Ground Produce', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'chicken-salad', names: ['chicken salad'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'hot-dog', names: ['hot dog', 'hotdog', 'frankfurter', 'frank', 'wiener'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'OU ruling is for a hot dog without the bun.', source: 'OU' }),
  f({ key: 'sardines', names: ['sardines', 'sardine', 'anchovies', 'anchovy', 'cod', 'flounder', 'halibut'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'shawarma', names: ['shawarma', 'shwarma', 'kebab', 'kabob', 'shish kebab'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'For the meat itself; eaten in a pita or laffa, the bread’s Hamotzi covers the meal.', source: 'chabad.org' }),
  f({ key: 'tuna-salad', names: ['tuna salad', 'tuna fish salad'], category: 'Meat & Fish', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'american-cheese', names: ['american cheese', 'cheese slices'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'egg-salad', names: ['egg salad'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'feta-cheese', names: ['feta', 'feta cheese'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'sour-cream', names: ['sour cream'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'swiss-cheese', names: ['swiss cheese', 'swiss'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'whipped-cream', names: ['whipped cream', 'whip cream'], category: 'Dairy & Eggs', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'apple-pie', names: ['cherry pie', 'blueberry pie', 'pie crust'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, notes: 'The mezonot crust covers the whole pie; one blessing only.', source: 'chabad.org' }),
  f({ key: 'babka', names: ['babka', 'chocolate babka', 'cinnamon babka'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'bread-pudding', names: ['bread pudding', 'bread kugel'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'caramel', names: ['caramel', 'caramels', 'toffee', 'taffy'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'cotton-candy', names: ['cotton candy', 'candy floss'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'croissant', names: ['croissant', 'croissants', 'danish', 'cheese danish', 'puff pastry', 'rugelach'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'AlHamichya', shivasHaminim: false, isFiveGrain: true, isTreeFruit: false, isWineGrape: false, source: 'chabad.org' }),
  f({ key: 'custard', names: ['custard'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'fruit-leather', names: ['fruit leather', 'fruit roll up', 'fruit roll-ups', 'fruit rollup'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Shehakol because the fruit is liquified and reconstituted during processing.', source: 'brachos.org' }),
  f({ key: 'fudge', names: ['fudge', 'chocolate fudge'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'gluten-free-cake', names: ['gluten free cake', 'almond flour cake', 'flourless cake', 'gluten free bagel', 'gluten free bread', 'cassava bread', 'gluten free cookies'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Gluten-free items made WITH oat flour remain five-grain (Mezonos/Hamotzi) per the same source.', source: 'chabad.org' }),
  f({ key: 'halva', names: ['halva', 'halvah', 'chalva'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'halvah', names: ['halavah'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'ices', names: ['ices', 'italian ices', 'ice pop', 'ice pops', 'freeze pop', 'popsicle', 'popsicles'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'jam', names: ['jam', 'preserves', 'fruit preserves'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'jello', names: ['jello', 'jell-o', 'gelatin dessert'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'jelly-jam', names: ['jelly', 'fruit jam'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'OU' }),
  f({ key: 'licorice', names: ['licorice', 'liquorice', 'licorice candy'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'marzipan', names: ['marzipan'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'pudding', names: ['pudding', 'chocolate pudding', 'vanilla pudding'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'rice-pudding', names: ['rice pudding'], category: 'Sweets', brachaRishona: 'Mezonos', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Rice: Mezonos but Borei Nefashos (not Al Hamichya).', source: 'brachos.org' }),
  f({ key: 'sherbet', names: ['sherbet', 'sherbert'], category: 'Sweets', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'almond-milk', names: ['almond milk'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'brachos.org' }),
  f({ key: 'carrot-juice', names: ['carrot juice'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'brachos.org' }),
  f({ key: 'coconut-water', names: ['coconut water'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, notes: 'Shehakol when drunk from a cup/utensil; Haetz if drunk directly from the coconut.', source: 'brachos.org' }),
  f({ key: 'energy-drink', names: ['energy drink', 'energy drinks', 'red bull', 'monster energy', 'celsius'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'chabad.org' }),
  f({ key: 'fruit-punch', names: ['fruit punch', 'fruit drink', 'kool aid', 'kool-aid', 'capri sun', 'flavored drink', 'juice drink', 'flavored water'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'chabad.org' }),
  f({ key: 'ginger-ale', names: ['ginger ale'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'brachos.org' }),
  f({ key: 'oat-milk', names: ['oat milk', 'oatmilk'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'brachos.org' }),
  f({ key: 'plant-milk', names: ['rice milk', 'coconut milk', 'plant milk', 'non-dairy milk', 'nondairy milk'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, notes: 'Oat milk deliberately excluded from this entry: it is a five-grain product and the source does not address it.', source: 'chabad.org' }),
  f({ key: 'soy-milk', names: ['soy milk', 'soymilk'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'brachos.org' }),
  f({ key: 'sports-drink', names: ['sports drink', 'gatorade', 'powerade', 'electrolyte drink'], category: 'Beverages', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, isDrink: true, source: 'chabad.org' }),
  f({ key: 'applesauce', names: ['applesauce', 'apple sauce'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Store-bought finely pureed applesauce is Shehakol; with apple chunks it is Haetz.', source: 'brachos.org' }),
  f({ key: 'borscht', names: ['borscht', 'borsht', 'beet soup'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, notes: 'Clear borscht or small beet pieces: Shehakol; large beet pieces: Hoadama.', source: 'brachos.org' }),
  f({ key: 'corn-chips', names: ['corn chips', 'fritos'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'lentil-soup', names: ['lentil soup'], category: 'Other', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'mushroom-soup', names: ['mushroom soup'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'onion-soup', names: ['onion soup'], category: 'Other', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'peanut-butter', names: ['peanut butter', 'creamy peanut butter', 'chunky peanut butter'], category: 'Other', brachaRishona: 'Shehakol', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
  f({ key: 'tomato-soup', names: ['tomato soup'], category: 'Other', brachaRishona: 'Haadama', brachaAchrona: 'BoreiNefashos', shivasHaminim: false, isFiveGrain: false, isTreeFruit: false, isWineGrape: false, source: 'brachos.org' }),
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
