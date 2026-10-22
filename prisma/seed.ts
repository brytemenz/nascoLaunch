import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { weeklyMenu } from "./menu-data";

const db = new PrismaClient();



async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@nasco.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin1234";

  await db.user.upsert({
    where: { email },
    update: {},
    create: { name: "Lunch Admin", email, role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });

  // Employees have no password — they order with name + phone.
  await db.user.upsert({
    where: { phone: "+233240000001" },
    update: {},
    create: { name: "Ama Mensah", phone: "+233240000001", department: "Finance" },
  });

  if ((await db.menuItem.count()) === 0) {
    await db.menuItem.createMany({ data: weeklyMenu });
  }

  await db.settings.upsert({
    where: { id: "app" },
    update: {},
    create: {
      id: "app",
      restaurantName: "Restaurant",
      restaurantPhone: "+233249297167",
      restaurantWhatsapp: "+233249297167",
      showPrices: false,
    },
  });

  console.log(`Seeded. Admin login: ${email} / ${password}`);
}

main().finally(() => db.$disconnect());
