import { prisma } from "../lib/db/prisma";

async function verifyConnection() {
  console.log("Connecting to MongoDB Atlas...");
  const startTime = Date.now();

  try {
    // 1. Check connection by counting tenants
    const tenantCount = await prisma.tenant.count();
    console.log(`Connection successful! Current tenants in database: ${tenantCount}`);

    // 2. Count other core collections
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const invoiceCount = await prisma.salesInvoice.count();

    console.log(`Database Status:`);
    console.log(` - Users: ${userCount}`);
    console.log(` - Tenants: ${tenantCount}`);
    console.log(` - Products: ${productCount}`);
    console.log(` - Sales Invoices: ${invoiceCount}`);
    console.log(`Latency: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();
