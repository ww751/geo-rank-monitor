import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const client = pool.client;

async function main() {
  await client.connect();

  const clientId = "client_wantai_" + Date.now();
  const brandId = "brand_wantai_" + Date.now();

  // 1. Insert client
  await client.query(`
    INSERT INTO clients (id, name, industry, contact_name, contact_email, status)
    VALUES ($1, '济南万泰装饰集团', '装修', '王经理', 'wang@wantai.example', 'ACTIVE')
    ON CONFLICT DO NOTHING
  `, [clientId]);
  console.log("✅ Client inserted:", clientId);

  // 2. Insert brand
  await client.query(`
    INSERT INTO brands (id, client_id, name, website, category, description, geo_goal)
    VALUES ($1, $2, '万泰装饰', 'https://www.wantai.com.cn', '济南家装设计与施工',
      '济南本地家装品牌，覆盖新房装修、老房翻新和整装交付。',
      '提升在 Doubao、Kimi、通义、元宝中的本地装修推荐出现率和TOP3占比')
    ON CONFLICT DO NOTHING
  `, [brandId, clientId]);
  console.log("✅ Brand inserted:", brandId);

  // 3. Insert keywords (3 types)
  const kw1 = await client.query(
    `INSERT INTO keywords (id, brand_id, text, intent, priority, active) VALUES ($1, $2, '济南装修公司排名', 'REPUTATION', 1, true) ON CONFLICT DO NOTHING RETURNING id`,
    [`kw_wantai_rank`, brandId]
  );
  const kw2 = await client.query(
    `INSERT INTO keywords (id, brand_id, text, intent, priority, active) VALUES ($1, $2, '济南装修公司推荐', 'SOLUTION', 2, true) ON CONFLICT DO NOTHING RETURNING id`,
    [`kw_wantai_rec`, brandId]
  );
  const kw3 = await client.query(
    `INSERT INTO keywords (id, brand_id, text, intent, priority, active) VALUES ($1, $2, '济南老房翻新公司哪家好', 'COMPARISON', 3, true) ON CONFLICT DO NOTHING RETURNING id`,
    [`kw_wantai_reno`, brandId]
  );
  console.log("✅ Keywords inserted:", kw1.rowCount + kw2.rowCount + kw3.rowCount);

  // 4. Insert competitors
  const competitors = [
    { name: "业之峰装饰", website: "https://www.yizhifeng.com", notes: "全国连锁装修品牌" },
    { name: "圣都整装", website: "https://www.shengdu.com", notes: "整装交付型竞品" },
    { name: "城市人家装饰", website: "", notes: "济南本地装修竞品" },
  ];
  for (const c of competitors) {
    await client.query(
      `INSERT INTO competitors (id, brand_id, name, website, notes) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [brandId, c.name, c.website, c.notes]
    );
  }
  console.log("✅ Competitors inserted:", competitors.length);

  console.log("\n📋 数据汇总:");
  console.log("   Client ID:", clientId);
  console.log("   Brand ID:", brandId);

  const rows = await client.query(`
    SELECT id, name, industry, status FROM clients WHERE id = $1
  `, [clientId]);
  console.log("\n📊 数据库验证:");
  for (const row of rows.rows) {
    console.log("   Client:", row.name, "|", row.industry, "|", row.status);
  }

  const brands = await client.query(`
    SELECT id, name FROM brands WHERE client_id = $1
  `, [clientId]);
  for (const row of brands.rows) {
    console.log("   Brand:", row.name);
  }

  const kws = await client.query(`
    SELECT id, text, intent FROM keywords WHERE brand_id = $1
  `, [brandId]);
  for (const row of kws.rows) {
    console.log("   Keyword:", row.text, "|", row.intent);
  }

  const comps = await client.query(`
    SELECT name FROM competitors WHERE brand_id = $1
  `, [brandId]);
  for (const row of comps.rows) {
    console.log("   Competitor:", row.name);
  }
}

main()
  .then(() => {
    pool.end();
    console.log("\n🎉 Done!");
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    pool.end();
    process.exit(1);
  });
