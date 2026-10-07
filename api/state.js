const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const USER_KEY = process.env.MEAL_TRACKER_USER_KEY || "default";

const PLAN_DATA = {
  main: [
    ["PRE-WORKOUT SNACK","Before training",[["Rice Cakes",3,"rice cake",93,2,19,1],["Honey",10,"g",32,0,8,0],["Banana",100,"g",84,1,20,0]]],
    ["MEAL 1","Post workout",[["Greek Yoghurt (0%)",150,"g",88,16,6,0],["Whey Protein",15,"g",56,14,0,0],["Blueberries",100,"g",40,1,9,0],["Honey",10,"g",32,0,8,0],["Banana",180,"g",152,2,36,0]]],
    ["MEAL 2","Main meal",[["Tuna",130,"g",141,33,0,1],["Pasta",150,"g",507,18,102,3],["Mixed salad",50,"g",8,0,2,0],["Cheese",15,"g",61,4,0,5]]],
    ["MEAL 3","Main meal",[["Rump steak cooked",180,"g",378,45,0,22],["White Potato (raw)",450,"g",360,9,81,0],["Olive Oil",5,"g",45,0,0,5],["Mixed salad",50,"g",8,0,2,0]]],
    ["SHAKE","Protein shake",[["Whey Protein",35,"g",137,32,0,1],["Whole Milk",150,"mL",93,5,7,5],["Frozen Mixed Berries",100,"g",32,1,7,0],["Honey",25,"g",76,0,19,0],["Peanut Butter",15,"g",92,3,2,8]]]
  ],
  alt: [
    ["PRE-WORKOUT SNACK","Alternative option",[["Coco Pops",50,"g",189,3,42,1],["Almond Milk (Unsweetened)",200,"mL",22,1,0,2]]],
    ["MEAL 1","Alternative option",[["Chicken Breast (Cooked)",75,"g",105,24,0,1],["Jasmine Rice (cooked)",160,"g",255,6,51,3],["Mixed salad",50,"g",8,0,2,0]]],
    ["MEAL 2","Alternative option",[["Chicken Breast (Cooked)",130,"g",186,42,0,2],["Jasmine Rice (cooked)",300,"g",486,12,96,6],["Mixed salad",50,"g",8,0,2,0],["Cheese",10,"g",39,3,0,3]]],
    ["MEAL 3","Alternative option",[["Lean Beef Mince (Cooked)",140,"g",194,35,0,6],["Rice",125,"g",427,15,85,3],["Cheese",40,"g",166,10,0,14]]],
    ["SHAKE ALTERNATIVE","Alternative shake",[["Dark Chocolate (70%)",30,"g",173,3,11,13],["Whey Protein",35,"g",137,32,0,1],["Frozen Mixed Berries",100,"g",32,1,7,0],["Honey",25,"g",76,0,19,0]]]
  ]
};

async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS app_users (id bigserial primary key, user_key text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await sql`CREATE TABLE IF NOT EXISTS meal_plans (id bigserial primary key, code text not null unique, name text not null, target_calories numeric(8,2) not null, target_protein_g numeric(8,2) not null, target_carbs_g numeric(8,2) not null, target_fat_g numeric(8,2) not null, created_at timestamptz not null default now())`;
  await sql`CREATE TABLE IF NOT EXISTS plan_meals (id bigserial primary key, meal_plan_id bigint not null references meal_plans(id) on delete cascade, slot_number smallint not null check (slot_number between 1 and 5), name text not null, subtitle text, unique(meal_plan_id,slot_number))`;
  await sql`CREATE TABLE IF NOT EXISTS plan_foods (id bigserial primary key, plan_meal_id bigint not null references plan_meals(id) on delete cascade, food_order smallint not null, name text not null, planned_amount numeric(10,2) not null, unit text not null, calories numeric(10,2) not null default 0, protein_g numeric(10,2) not null default 0, carbs_g numeric(10,2) not null default 0, fat_g numeric(10,2) not null default 0, unique(plan_meal_id,food_order))`;
  await sql`CREATE TABLE IF NOT EXISTS daily_logs (id bigserial primary key, user_id bigint not null references app_users(id) on delete cascade, log_date date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,log_date))`;
  await sql`CREATE TABLE IF NOT EXISTS daily_meal_choices (id bigserial primary key, daily_log_id bigint not null references daily_logs(id) on delete cascade, slot_number smallint not null check(slot_number between 1 and 5), meal_plan_id bigint not null references meal_plans(id), meal_note text, unique(daily_log_id,slot_number))`;
  await sql`CREATE TABLE IF NOT EXISTS daily_food_logs (id bigserial primary key, daily_log_id bigint not null references daily_logs(id) on delete cascade, plan_food_id bigint not null references plan_foods(id), actual_amount numeric(10,2) not null, eaten boolean not null default false, updated_at timestamptz not null default now(), unique(daily_log_id,plan_food_id))`;
  await sql`CREATE TABLE IF NOT EXISTS custom_meals (id bigserial primary key, user_id bigint not null references app_users(id) on delete cascade, name text not null, subtitle text not null default 'Custom meal', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name))`;
  await sql`CREATE TABLE IF NOT EXISTS custom_meal_foods (id bigserial primary key, custom_meal_id bigint not null references custom_meals(id) on delete cascade, food_order smallint not null, name text not null, planned_amount numeric(10,2) not null, unit text not null, calories numeric(10,2) not null default 0, protein_g numeric(10,2) not null default 0, carbs_g numeric(10,2) not null default 0, fat_g numeric(10,2) not null default 0, unique(custom_meal_id,food_order))`;
  await sql`CREATE TABLE IF NOT EXISTS daily_custom_meals (id bigserial primary key, daily_log_id bigint not null references daily_logs(id) on delete cascade, custom_meal_id bigint references custom_meals(id) on delete set null, meal_name text not null, meal_note text, meal_order smallint not null, unique(daily_log_id,meal_order))`;
  await sql`CREATE TABLE IF NOT EXISTS daily_custom_food_logs (id bigserial primary key, daily_custom_meal_id bigint not null references daily_custom_meals(id) on delete cascade, custom_meal_food_id bigint references custom_meal_foods(id) on delete set null, food_name text not null, planned_amount numeric(10,2) not null, unit text not null, calories numeric(10,2) not null default 0, protein_g numeric(10,2) not null default 0, carbs_g numeric(10,2) not null default 0, fat_g numeric(10,2) not null default 0, actual_amount numeric(10,2) not null, eaten boolean not null default false, unique(daily_custom_meal_id,food_name,unit))`;
  await sql`CREATE TABLE IF NOT EXISTS weight_entries (id bigserial primary key, user_id bigint not null references app_users(id) on delete cascade, entry_date date not null, weight_kg numeric(6,2) not null check(weight_kg>0), note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,entry_date))`;
  await sql`INSERT INTO meal_plans(code,name,target_calories,target_protein_g,target_carbs_g,target_fat_g) VALUES ('main','Main Day',2515,186,328,51),('alt','Alternative Day',2515,186,328,51) ON CONFLICT(code) DO UPDATE SET name=excluded.name,target_calories=excluded.target_calories,target_protein_g=excluded.target_protein_g,target_carbs_g=excluded.target_carbs_g,target_fat_g=excluded.target_fat_g`;
  for (const code of ["main","alt"]) {
    const planId=(await sql`SELECT id FROM meal_plans WHERE code=${code}`)[0].id;
    for(let i=0;i<5;i++){
      const m=PLAN_DATA[code][i]; const mealId=(await sql`INSERT INTO plan_meals(meal_plan_id,slot_number,name,subtitle) VALUES(${planId},${i+1},${m[0]},${m[1]}) ON CONFLICT(meal_plan_id,slot_number) DO UPDATE SET name=excluded.name,subtitle=excluded.subtitle RETURNING id`)[0].id;
      for(let j=0;j<m[2].length;j++){const f=m[2][j];await sql`INSERT INTO plan_foods(plan_meal_id,food_order,name,planned_amount,unit,calories,protein_g,carbs_g,fat_g) VALUES(${mealId},${j},${f[0]},${f[1]},${f[2]},${f[3]},${f[4]},${f[5]},${f[6]}) ON CONFLICT(plan_meal_id,food_order) DO UPDATE SET name=excluded.name,planned_amount=excluded.planned_amount,unit=excluded.unit,calories=excluded.calories,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,fat_g=excluded.fat_g`}
      }
    }
  }
  return (await sql`INSERT INTO app_users(user_key) VALUES(${USER_KEY}) ON CONFLICT(user_key) DO UPDATE SET updated_at=now() RETURNING id`)[0].id;
}

async function getState(userId){
  const days=await sql`SELECT id,log_date FROM daily_logs WHERE user_id=${userId} ORDER BY log_date`;
  const choices=await sql`SELECT d.log_date,c.slot_number,p.code,c.meal_note FROM daily_meal_choices c JOIN daily_logs d ON d.id=c.daily_log_id JOIN meal_plans p ON p.id=c.meal_plan_id WHERE d.user_id=${userId}`;
  const foods=await sql`SELECT d.log_date,pm.slot_number,p.code,f.food_order,l.actual_amount,l.eaten FROM daily_food_logs l JOIN daily_logs d ON d.id=l.daily_log_id JOIN plan_foods f ON f.id=l.plan_food_id JOIN plan_meals pm ON pm.id=f.plan_meal_id JOIN meal_plans p ON p.id=pm.meal_plan_id WHERE d.user_id=${userId}`;
  const cms=await sql`SELECT id,name,subtitle FROM custom_meals WHERE user_id=${userId} ORDER BY id`;
  const cmf=await sql`SELECT f.custom_meal_id,f.food_order,f.name,f.planned_amount,f.unit,f.calories,f.protein_g,f.carbs_g,f.fat_g FROM custom_meal_foods f JOIN custom_meals m ON m.id=f.custom_meal_id WHERE m.user_id=${userId} ORDER BY f.custom_meal_id,f.food_order`;
  const dcm=await sql`SELECT d.log_date,m.id,m.meal_order,m.meal_name,m.meal_note,f.food_name,f.planned_amount,f.unit,f.calories,f.protein_g,f.carbs_g,f.fat_g,f.actual_amount,f.eaten FROM daily_custom_meals m JOIN daily_logs d ON d.id=m.daily_log_id LEFT JOIN daily_custom_food_logs f ON f.daily_custom_meal_id=m.id WHERE d.user_id=${userId} ORDER BY d.log_date,m.meal_order,f.id`;
  const weights=await sql`SELECT entry_date,weight_kg,note FROM weight_entries WHERE user_id=${userId} ORDER BY entry_date`;
  const out={days:{},weights:weights.map(w=>({date:String(w.entry_date),weight:Number(w.weight_kg),note:w.note||""})),customMeals:[]};
  for(const d of days)out.days[String(d.log_date)]={slots:["main","main","main","main","main"],foods:{},notes:{},custom:[]};
  for(const c of choices){const d=out.days[String(c.log_date)];if(d){const mi=Number(c.slot_number)-1;d.slots[mi]=c.code;if(c.meal_note)d.notes[`p-${mi}`]=c.meal_note;}}
  for(const f of foods){const d=out.days[String(f.log_date)];if(d)d.foods[`p-${Number(f.slot_number)-1}-${Number(f.food_order)}`]={actual:Number(f.actual_amount),done:!!f.eaten};}
  const cm=new Map();for(const m of cms)cm.set(m.id,{name:m.name,sub:m.subtitle||"Custom meal",foods:[]});for(const f of cmf){const m=cm.get(f.custom_meal_id);if(m)m.foods.push({name:f.name,amount:Number(f.planned_amount),unit:f.unit,cal:Number(f.calories),p:Number(f.protein_g),c:Number(f.carbs_g),f:Number(f.fat_g)});}out.customMeals=[...cm.values()];
  for(const r of dcm){const d=out.days[String(r.log_date)];if(!d)continue;let m=d.custom.find(x=>x._dbId===r.id);if(!m){m={name:r.meal_name,sub:"Custom meal",foods:[],_dbId:r.id};d.custom.push(m);}if(r.food_name)m.foods.push({name:r.food_name,amount:Number(r.planned_amount),unit:r.unit,cal:Number(r.calories),p:Number(r.protein_g),c:Number(r.carbs_g),f:Number(r.fat_g),actual:Number(r.actual_amount),done:!!r.eaten});}
  for(const d of Object.values(out.days))for(const m of d.custom)delete m._dbId;
  return out;
}

async function saveState(userId,state){
  const days=state?.days&&typeof state.days==="object"?state.days:{};
  await sql`DELETE FROM daily_logs WHERE user_id=${userId}`;
  await sql`DELETE FROM custom_meals WHERE user_id=${userId}`;
  await sql`DELETE FROM weight_entries WHERE user_id=${userId}`;
  const plans=await sql`SELECT id,code FROM meal_plans`;const planId=Object.fromEntries(plans.map(x=>[x.code,x.id]));
  const pf=await sql`SELECT f.id,pm.slot_number,p.code,f.food_order FROM plan_foods f JOIN plan_meals pm ON pm.id=f.plan_meal_id JOIN meal_plans p ON p.id=pm.meal_plan_id`;
  const fid=(code,mi,fi)=>pf.find(x=>x.code===code&&Number(x.slot_number)===mi+1&&Number(x.food_order)===fi)?.id;
  for(const [date,d] of Object.entries(days)){
    const dayId=(await sql`INSERT INTO daily_logs(user_id,log_date) VALUES(${userId},${date}) RETURNING id`)[0].id;
    const slots=Array.isArray(d.slots)?d.slots:["main","main","main","main","main"];
    for(let mi=0;mi<5;mi++){
      const code=slots[mi]==="alt"?"alt":"main";await sql`INSERT INTO daily_meal_choices(daily_log_id,slot_number,meal_plan_id,meal_note) VALUES(${dayId},${mi+1},${planId[code]},${d.notes?.[`p-${mi}`]||null})`;
      const prefix=`p-${mi}-`;for(const [k,s] of Object.entries(d.foods||{})){if(!k.startsWith(prefix))continue;const id=fid(code,mi,Number(k.slice(prefix.length)));if(id)await sql`INSERT INTO daily_food_logs(daily_log_id,plan_food_id,actual_amount,eaten) VALUES(${dayId},${id},${Number(s.actual)||0},${!!s.done})`;}
    }
    for(let mi=0;mi<(d.custom||[]).length;mi++){const m=d.custom[mi];const cmid=(await sql`INSERT INTO daily_custom_meals(daily_log_id,meal_name,meal_note,meal_order) VALUES(${dayId},${m.name||"Custom meal"},${d.notes?.[`c-${mi}`]||null},${mi}) RETURNING id`)[0].id;for(let fi=0;fi<(m.foods||[]).length;fi++){const f=m.foods[fi],s=d.foods?.[`c-${mi}-${fi}`]||{actual:f.amount,done:false};await sql`INSERT INTO daily_custom_food_logs(daily_custom_meal_id,food_name,planned_amount,unit,calories,protein_g,carbs_g,fat_g,actual_amount,eaten) VALUES(${cmid},${f.name},${Number(f.amount)||0},${f.unit||"g"},${Number(f.cal)||0},${Number(f.p)||0},${Number(f.c)||0},${Number(f.f)||0},${Number(s.actual??f.amount)||0},${!!s.done})`;}}
  }
  for(const m of Array.isArray(state?.customMeals)?state.customMeals:[]){const mid=(await sql`INSERT INTO custom_meals(user_id,name,subtitle) VALUES(${userId},${m.name||"Custom meal"},${m.sub||"Custom meal"}) ON CONFLICT(user_id,name) DO UPDATE SET subtitle=excluded.subtitle,updated_at=now() RETURNING id`)[0].id;for(let i=0;i<(m.foods||[]).length;i++){const f=m.foods[i];await sql`INSERT INTO custom_meal_foods(custom_meal_id,food_order,name,planned_amount,unit,calories,protein_g,carbs_g,fat_g) VALUES(${mid},${i},${f.name},${Number(f.amount)||0},${f.unit||"g"},${Number(f.cal)||0},${Number(f.p)||0},${Number(f.c)||0},${Number(f.f)||0})`;}}
  for(const w of Array.isArray(state?.weights)?state.weights:[])await sql`INSERT INTO weight_entries(user_id,entry_date,weight_kg,note) VALUES(${userId},${w.date},${Number(w.weight)||0},${w.note||null}) ON CONFLICT(user_id,entry_date) DO UPDATE SET weight_kg=excluded.weight_kg,note=excluded.note,updated_at=now()`;
}

module.exports=async function handler(req,res){res.setHeader("Cache-Control","no-store");if(!process.env.DATABASE_URL)return res.status(500).json({error:"DATABASE_URL is not configured in Vercel."});if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});try{const userId=await ensureSchema();if(req.method==="GET")return res.status(200).json(await getState(userId));const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};await saveState(userId,body);return res.status(200).json({ok:true,savedAt:new Date().toISOString()});}catch(error){console.error("Meal tracker API error:",error);return res.status(500).json({error:"Database operation failed."});}};
