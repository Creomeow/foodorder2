import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Load env from monorepo root then local override.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });
loadEnv({ path: resolve(here, '../.env'), override: true });

const prisma = new PrismaClient();

const env = (k: string, d: string) => process.env[k] ?? d;
const hash = (p: string) => bcrypt.hash(p, 10);

const IMG = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=600&q=70`;

async function main() {
  console.log('🌱 Seeding…');

  // Clean (idempotent dev seed).
  await prisma.auditLog.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.brand.deleteMany();

  // ---- Brand + outlets ----
  const brand = await prisma.brand.create({
    data: { name: 'Tertiary Eats', logo: null },
  });

  const main = await prisma.restaurant.create({
    data: {
      brandId: brand.id,
      name: 'Tertiary Eats — Orchard',
      address: '123 Orchard Road, Singapore',
      phone: '+65 6123 4567',
      taxRate: new Prisma.Decimal(9), // GST 9%
      serviceCharge: new Prisma.Decimal(10),
      currency: 'SGD',
      paymentMethods: ['CASH', 'CARD', 'PAYNOW', 'GRABPAY'],
      operatingHours: [
        { day: 1, open: '11:00', close: '22:00', closed: false },
        { day: 2, open: '11:00', close: '22:00', closed: false },
      ],
    },
  });

  const second = await prisma.restaurant.create({
    data: {
      brandId: brand.id,
      name: 'Tertiary Eats — Jurong',
      address: '50 Jurong Gateway Road, Singapore',
      phone: '+65 6234 5678',
      taxRate: new Prisma.Decimal(9),
      serviceCharge: new Prisma.Decimal(10),
      currency: 'SGD',
      paymentMethods: ['CASH', 'CARD'],
    },
  });

  // ---- Users ----
  await prisma.user.createMany({
    data: [
      {
        name: 'Super Admin',
        email: env('SEED_SUPER_ADMIN_EMAIL', 'superadmin@foodorder.dev'),
        passwordHash: await hash(env('SEED_SUPER_ADMIN_PASSWORD', 'Admin123!')),
        role: 'SUPER_ADMIN',
      },
      {
        name: 'Brand Manager',
        email: env('SEED_MANAGER_EMAIL', 'manager@foodorder.dev'),
        passwordHash: await hash(env('SEED_MANAGER_PASSWORD', 'Manager123!')),
        role: 'MANAGER',
        brandId: brand.id,
      },
      {
        name: 'Outlet Staff',
        email: env('SEED_STAFF_EMAIL', 'staff@foodorder.dev'),
        passwordHash: await hash(env('SEED_STAFF_PASSWORD', 'Staff123!')),
        role: 'STAFF',
        brandId: brand.id,
        restaurantId: main.id,
      },
    ],
  });

  // ---- Modifier groups (main outlet) ----
  const size = await prisma.modifierGroup.create({
    data: {
      restaurantId: main.id,
      name: 'Size',
      required: true,
      multiple: false,
      minSelect: 1,
      maxSelect: 1,
      options: {
        create: [
          { name: 'Small', price: 0, isDefault: true, sortOrder: 0 },
          { name: 'Medium', price: new Prisma.Decimal(1.5), sortOrder: 1 },
          { name: 'Large', price: new Prisma.Decimal(3), sortOrder: 2 },
        ],
      },
    },
  });
  const protein = await prisma.modifierGroup.create({
    data: {
      restaurantId: main.id,
      name: 'Protein',
      required: false,
      multiple: false,
      maxSelect: 1,
      options: {
        create: [
          { name: 'Chicken', price: 0, isDefault: true, sortOrder: 0 },
          { name: 'Pork', price: new Prisma.Decimal(1), sortOrder: 1 },
          { name: 'Beef', price: new Prisma.Decimal(2), sortOrder: 2 },
        ],
      },
    },
  });
  const addons = await prisma.modifierGroup.create({
    data: {
      restaurantId: main.id,
      name: 'Add-ons',
      required: false,
      multiple: true,
      maxSelect: 4,
      options: {
        create: [
          { name: 'Egg', price: new Prisma.Decimal(1), sortOrder: 0 },
          { name: 'Cheese', price: new Prisma.Decimal(1.5), sortOrder: 1 },
          { name: 'Extra Meat', price: new Prisma.Decimal(3), sortOrder: 2 },
          { name: 'Extra Rice', price: new Prisma.Decimal(1), sortOrder: 3 },
        ],
      },
    },
  });

  // ---- Categories + items (main outlet) ----
  const categories: { name: string; items: { name: string; desc: string; price: number; img: string; mods?: string[]; popular?: boolean; recommended?: boolean }[] }[] = [
    {
      name: 'Signature Dishes',
      items: [
        { name: 'Hainanese Chicken Rice', desc: 'Fragrant rice, poached chicken, chilli', price: 6.5, img: 'photo-1569058242253-92a9c755a0ec', popular: true, recommended: true, mods: ['Size', 'Add-ons'] },
        { name: 'Char Kway Teow', desc: 'Wok-fried flat noodles with prawns', price: 7.0, img: 'photo-1585032226651-759b368d7246', popular: true, mods: ['Add-ons'] },
        { name: 'Laksa', desc: 'Spicy coconut noodle soup', price: 7.5, img: 'photo-1604908176997-125f25cc6f3d', recommended: true },
      ],
    },
    {
      name: 'Rice',
      items: [
        { name: 'Nasi Lemak', desc: 'Coconut rice, sambal, anchovies, egg', price: 6.0, img: 'photo-1567337710282-00832b415979', mods: ['Protein', 'Add-ons'] },
        { name: 'Fried Rice', desc: 'Classic egg fried rice', price: 5.5, img: 'photo-1603133872878-684f208fb84b', mods: ['Protein', 'Add-ons'] },
      ],
    },
    {
      name: 'Noodles',
      items: [
        { name: 'Wonton Noodles', desc: 'Springy noodles, char siu, wontons', price: 6.0, img: 'photo-1612927601601-6638404737ce', mods: ['Add-ons'] },
        { name: 'Beef Hor Fun', desc: 'Flat rice noodles in egg gravy', price: 7.0, img: 'photo-1623341214825-9f4f963727da' },
      ],
    },
    {
      name: 'Soup',
      items: [
        { name: 'Bak Kut Teh', desc: 'Peppery pork rib soup', price: 8.0, img: 'photo-1547928576-b822bc410bdf' },
        { name: 'Fish Soup', desc: 'Sliced fish in clear broth', price: 7.0, img: 'photo-1604909052743-94e838986d24' },
      ],
    },
    {
      name: 'Drinks',
      items: [
        { name: 'Teh Tarik', desc: 'Pulled milk tea', price: 2.5, img: 'photo-1571934811356-5cc061b6821f', mods: ['Size'] },
        { name: 'Kopi', desc: 'Local coffee', price: 2.0, img: 'photo-1509042239860-f550ce710b93', mods: ['Size'] },
        { name: 'Bandung', desc: 'Rose syrup milk', price: 3.0, img: 'photo-1551538827-9c037cb4f32a', mods: ['Size'] },
      ],
    },
    {
      name: 'Desserts',
      items: [
        { name: 'Chendol', desc: 'Shaved ice, coconut, palm sugar', price: 4.0, img: 'photo-1488900128323-21503983a07e' },
        { name: 'Ice Kacang', desc: 'Shaved ice dessert mountain', price: 4.5, img: 'photo-1551024601-bec78aea704b' },
      ],
    },
  ];

  const modMap: Record<string, string> = { Size: size.id, Protein: protein.id, 'Add-ons': addons.id };

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const category = await prisma.category.create({
      data: { restaurantId: main.id, name: cat.name, sortOrder: ci },
    });
    for (let ii = 0; ii < cat.items.length; ii++) {
      const item = cat.items[ii];
      await prisma.menuItem.create({
        data: {
          restaurantId: main.id,
          categoryId: category.id,
          name: item.name,
          description: item.desc,
          price: new Prisma.Decimal(item.price),
          imageUrl: IMG(item.img),
          sortOrder: ii,
          popular: item.popular ?? false,
          recommended: item.recommended ?? false,
          modifierGroups: {
            create: (item.mods ?? []).map((m, i) => ({ modifierGroupId: modMap[m], sortOrder: i })),
          },
        },
      });
    }
  }

  // A minimal menu for the second outlet so it isn't empty.
  const drinksCat = await prisma.category.create({
    data: { restaurantId: second.id, name: 'Drinks', sortOrder: 0 },
  });
  await prisma.menuItem.create({
    data: {
      restaurantId: second.id,
      categoryId: drinksCat.id,
      name: 'Iced Milo',
      description: 'Malt chocolate drink',
      price: new Prisma.Decimal(3),
      imageUrl: IMG('photo-1572490122747-3968b75cc699'),
    },
  });

  // ---- Tables (main outlet) ----
  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: { restaurantId: main.id, tableNumber: String(i), capacity: i % 2 === 0 ? 4 : 2 },
    });
  }
  for (let i = 1; i <= 4; i++) {
    await prisma.table.create({
      data: { restaurantId: second.id, tableNumber: `J${i}`, capacity: 4 },
    });
  }

  // ---- Coupons ----
  await prisma.coupon.createMany({
    data: [
      { brandId: brand.id, code: 'WELCOME10', type: 'PERCENT', value: new Prisma.Decimal(10), minSpend: new Prisma.Decimal(15), active: true },
      { restaurantId: main.id, code: 'SAVE5', type: 'FIXED', value: new Prisma.Decimal(5), minSpend: new Prisma.Decimal(30), active: true },
    ],
  });

  // ---- Promotions (shown on the customer app's welcome screen) ----
  await prisma.promotion.createMany({
    data: [
      {
        restaurantId: main.id,
        name: '1 FOR 1 Soups',
        description: 'Monday–Thursday, 11am–5pm. Dine-in only, applies to all soups.',
        bannerImageUrl: IMG('photo-1547592180-85f173990554'),
        ctaText: '1 FOR 1 — Dine-in only, all soups',
        active: true,
      },
      {
        restaurantId: main.id,
        name: 'Welcome 10% Off',
        description: 'First-time customers get 10% off with code WELCOME10.',
        bannerImageUrl: IMG('photo-1565299624946-b28f40a0ae38'),
        ctaText: 'Use code WELCOME10',
        active: true,
      },
    ],
  });

  // ---- A few historical orders (for reports) ----
  const items = await prisma.menuItem.findMany({ where: { restaurantId: main.id }, take: 5 });
  for (let d = 1; d <= 6; d++) {
    const created = new Date();
    created.setDate(created.getDate() - d);
    const picks = items.slice(0, (d % 3) + 1);
    const subtotal = picks.reduce((s, p) => s + Number(p.price), 0);
    const tax = +(subtotal * 0.09).toFixed(2);
    const svc = +(subtotal * 0.1).toFixed(2);
    await prisma.order.create({
      data: {
        restaurantId: main.id,
        orderNumber: `H${d}`,
        orderType: d % 2 === 0 ? 'DINE_IN' : 'TAKEAWAY',
        status: 'COMPLETED',
        customerName: 'Past Customer',
        subtotal: new Prisma.Decimal(subtotal),
        tax: new Prisma.Decimal(tax),
        serviceCharge: new Prisma.Decimal(svc),
        total: new Prisma.Decimal(subtotal + tax + svc),
        createdAt: created,
        items: {
          create: picks.map((p) => ({
            menuItemId: p.id,
            name: p.name,
            quantity: 1,
            unitPrice: p.price,
          })),
        },
      },
    });
  }

  console.log('✅ Seed complete.');
  console.log(`   Main outlet id: ${main.id}`);
  console.log(`   Super admin: ${env('SEED_SUPER_ADMIN_EMAIL', 'superadmin@foodorder.dev')} / ${env('SEED_SUPER_ADMIN_PASSWORD', 'Admin123!')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
