import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([^#=\s]+)=(.*)$/);
  if (!match) continue;

  const [, key, rawValue] = match;
  process.env[key] = rawValue.replace(/^["']|["']$/g, '');
}

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

const randomDate = () => {
  const start = new Date('2022-01-01').getTime();
  const end = new Date().getTime();
  const date = new Date(start + Math.random() * (end - start));

  return date.toISOString().split('T')[0];
};

const randomAmountInCents = () => {
  return Math.floor(Math.random() * 99501) + 500;
};

try {
  const customers = await sql`SELECT id FROM customers`;

  if (customers.length === 0) {
    throw new Error('No customers found. Seed customers before invoices.');
  }

  const invoices = Array.from({ length: 1000 }, () => {
    const customer = customers[Math.floor(Math.random() * customers.length)];

    return {
      customer_id: customer.id,
      amount: randomAmountInCents(),
      status: Math.random() > 0.45 ? 'paid' : 'pending',
      date: randomDate(),
    };
  });

  await sql`
    INSERT INTO invoices ${sql(invoices, 'customer_id', 'amount', 'status', 'date')}
  `;

  console.log(`Seeded ${invoices.length} invoices.`);
} finally {
  await sql.end();
}
