import prisma from "@/lib/db/prisma";
import { createNotification } from "./notifications";
import { publishAutomationEvent } from "./events";

export interface StockAlertResult {
  variantsEvaluated: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  items: Array<{
    variantId: string;
    productName: string;
    sku: string;
    currentStock: number;
    minStockAlert: number;
    status: "OUT_OF_STOCK" | "LOW_STOCK";
  }>;
}

/**
 * Scans inventory stock levels against thresholds and generates non-duplicate alerts.
 */
export async function processInventoryStockAlerts(
  tenantId: string,
  client: any = prisma
): Promise<StockAlertResult> {
  const products = await client.product.findMany({
    where: { tenantId, isActive: true },
    include: {
      variants: {
        where: { isActive: true },
      },
    },
    take: 200,
  });

  let lowStockAlerts = 0;
  let outOfStockAlerts = 0;
  const items: StockAlertResult["items"] = [];

  for (const product of products) {
    const minAlert = product.minStockAlert || 5;

    for (const variant of product.variants) {
      const stock = variant.currentStock;

      if (stock <= 0) {
        // Out of stock
        // Prevent duplicate unread notifications for this variant
        const existingNotif = await client.notification.findFirst({
          where: {
            tenantId,
            category: "INVENTORY",
            isRead: false,
            linkUrl: `/inventory`,
            title: { contains: variant.sku },
          },
        });

        if (!existingNotif) {
          await createNotification(
            {
              tenantId,
              title: `Out of Stock: ${product.name} (${variant.sku})`,
              message: `Available stock has reached 0 units. Reorder immediately.`,
              category: "INVENTORY",
              priority: "URGENT",
              linkUrl: `/inventory`,
              metadata: {
                productId: product.id,
                variantId: variant.id,
                sku: variant.sku,
                currentStock: stock,
              },
            },
            client
          );

          await publishAutomationEvent(
            {
              tenantId,
              eventType: "STOCK_OUT",
              entityType: "PRODUCT_VARIANT",
              entityId: variant.id,
              payload: {
                productId: product.id,
                productName: product.name,
                sku: variant.sku,
                currentStock: stock,
              },
            },
            client
          );

          outOfStockAlerts++;
          items.push({
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            currentStock: stock,
            minStockAlert: minAlert,
            status: "OUT_OF_STOCK",
          });
        }
      } else if (stock <= minAlert) {
        // Low stock
        const existingNotif = await client.notification.findFirst({
          where: {
            tenantId,
            category: "INVENTORY",
            isRead: false,
            linkUrl: `/inventory`,
            title: { contains: variant.sku },
          },
        });

        if (!existingNotif) {
          await createNotification(
            {
              tenantId,
              title: `Low Stock Alert: ${product.name} (${variant.sku})`,
              message: `Stock is at ${stock} units, below minimum threshold (${minAlert}).`,
              category: "INVENTORY",
              priority: "HIGH",
              linkUrl: `/inventory`,
              metadata: {
                productId: product.id,
                variantId: variant.id,
                sku: variant.sku,
                currentStock: stock,
                minStockAlert: minAlert,
              },
            },
            client
          );

          await publishAutomationEvent(
            {
              tenantId,
              eventType: "STOCK_LOW",
              entityType: "PRODUCT_VARIANT",
              entityId: variant.id,
              payload: {
                productId: product.id,
                productName: product.name,
                sku: variant.sku,
                currentStock: stock,
                minStockAlert: minAlert,
              },
            },
            client
          );

          lowStockAlerts++;
          items.push({
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            currentStock: stock,
            minStockAlert: minAlert,
            status: "LOW_STOCK",
          });
        }
      }
    }
  }

  return {
    variantsEvaluated: products.reduce((acc: number, p: any) => acc + p.variants.length, 0),
    lowStockAlerts,
    outOfStockAlerts,
    items,
  };
}
