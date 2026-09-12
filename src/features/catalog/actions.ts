"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { Prisma } from "@/generated/prisma/client";
import { rebuildInventory } from "@/features/stock/rebuild";
import { prisma } from "@/server/db/client";
import { ProductImageError, removeProductImage, saveProductImage } from "./image-storage";
import {
  categorySchema,
  editableProductSchema,
  normalizeCatalogText,
  parseVariants,
  productSchema,
  type CatalogActionState,
} from "./validation";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createCategory(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireUser();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await prisma.category.create({
      data: {
        name: parsed.data.name,
        normalizedName: normalizeCatalogText(parsed.data.name),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { error: "Essa categoria já existe." };
    console.error("Falha ao criar categoria", error);
    return { error: "Não foi possível salvar a categoria." };
  }

  revalidatePath("/produtos");
  return {};
}

export async function createProduct(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireUser();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    salePrice: formData.get("salePrice"),
    variants: parseVariants(formData.get("variants")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  }

  const { name, categoryId, description, salePrice, variants } = parsed.data;
  let newImageKey: string | null = null;
  try {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, active: true },
      select: { id: true },
    });
    if (!category) return { error: "A categoria selecionada não está disponível." };

    newImageKey = await saveProductImage(formData.get("image"));

    await prisma.product.create({
      data: {
        name,
        normalizedName: normalizeCatalogText(name),
        description: description || null,
        salePrice: salePrice.replace(",", "."),
        categoryId,
        imageKey: newImageKey,
        variants: {
          create: variants.map(({ color, size }) => ({
            color: color || null,
            normalizedColor: normalizeCatalogText(color),
            size,
          })),
        },
      },
    });
  } catch (error) {
    await removeProductImage(newImageKey);
    if (error instanceof ProductImageError) return { error: error.message };
    if (isUniqueConstraintError(error)) {
      return { error: "Já existe um produto ou uma variação com esses dados." };
    }
    console.error("Falha ao criar produto", error);
    return { error: "Não foi possível salvar o produto." };
  }

  revalidatePath("/produtos");
  redirect("/produtos?criado=1");
}

export async function updateProduct(
  productId: string,
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireUser();
  const parsed = editableProductSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    salePrice: formData.get("salePrice"),
    variants: parseVariants(formData.get("variants")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  }

  const { name, categoryId, description, salePrice, variants } = parsed.data;
  try {
    const [product, category] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { imageKey: true, variants: { select: { id: true } } },
      }),
      prisma.category.findFirst({
        where: { id: categoryId, active: true },
        select: { id: true },
      }),
    ]);
    if (!product) return { error: "Produto não encontrado." };
    if (!category) return { error: "A categoria selecionada não está disponível." };

    const existingIds = new Set(product.variants.map((variant) => variant.id));
    const submittedIds = variants.flatMap((variant) => variant.id ? [variant.id] : []);
    if (
      submittedIds.length !== existingIds.size ||
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.some((id) => !existingIds.has(id))
    ) {
      return { error: "As variações existentes não podem ser excluídas." };
    }

    const uploadedImageKey = await saveProductImage(formData.get("image"));
    const removeImage = formData.get("removeImage") === "on";
    const nextImageKey = uploadedImageKey ?? (removeImage ? null : product.imageKey);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: {
            name,
            normalizedName: normalizeCatalogText(name),
            description: description || null,
            salePrice: salePrice.replace(",", "."),
            categoryId,
            imageKey: nextImageKey,
          },
        });

        for (const variant of variants) {
          const data = {
            color: variant.color || null,
            normalizedColor: normalizeCatalogText(variant.color),
            size: variant.size,
            active: variant.active,
          };
          if (variant.id) {
            await tx.productVariant.update({ where: { id: variant.id }, data });
          } else {
            await tx.productVariant.create({ data: { ...data, productId } });
          }
        }
      });
    } catch (error) {
      await removeProductImage(uploadedImageKey);
      throw error;
    }
    if (product.imageKey !== nextImageKey) await removeProductImage(product.imageKey);
  } catch (error) {
    if (error instanceof ProductImageError) return { error: error.message };
    if (isUniqueConstraintError(error)) {
      return { error: "Já existe um produto ou uma variação com esses dados." };
    }
    console.error("Falha ao atualizar produto", error);
    return { error: "Não foi possível atualizar o produto." };
  }

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${productId}/editar`);
  redirect("/produtos?atualizado=1");
}

export async function toggleProductStatus(productId: string) {
  await requireUser();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { active: true },
  });
  if (!product) redirect("/produtos");

  await prisma.product.update({
    where: { id: productId },
    data: { active: !product.active },
  });
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${productId}/editar`);
  redirect(`/produtos?status=${product.active ? "inativo" : "ativo"}`);
}

export async function deleteProduct(
  productId: string,
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireUser();
  if (formData.get("confirmation") !== "on") {
    return { error: "Confirme que deseja excluir o produto definitivamente." };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { imageKey: true },
  });
  if (!product) return { error: "Produto não encontrado." };

  try {
    await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
      const variantIds = variants.map((variant) => variant.id);
      const [saleItems, entryItems] = await Promise.all([
        tx.saleItem.findMany({ where: { productVariantId: { in: variantIds } }, select: { saleId: true } }),
        tx.stockEntryItem.findMany({ where: { productVariantId: { in: variantIds } }, select: { stockEntryId: true } }),
      ]);
      const saleIds = [...new Set(saleItems.map((item) => item.saleId))];
      const entryIds = [...new Set(entryItems.map((item) => item.stockEntryId))];
      await tx.saleItem.deleteMany({ where: { productVariantId: { in: variantIds } } });
      await tx.stockEntryItem.deleteMany({ where: { productVariantId: { in: variantIds } } });
      const affectedCancelledSales = await tx.sale.findMany({ where: { id: { in: saleIds }, status: "CANCELLED" }, include: { items: true } });
      for (const sale of affectedCancelledSales) {
        const totalRevenue = sale.items.reduce((sum, item) => sum + Number(item.lineRevenue), 0);
        const totalCost = sale.items.reduce((sum, item) => sum + Number(item.lineCost), 0);
        await tx.sale.update({ where: { id: sale.id }, data: { totalRevenue: totalRevenue.toFixed(2), totalCost: totalCost.toFixed(2), totalGrossProfit: (totalRevenue - totalCost).toFixed(2) } });
      }
      const emptySales = await tx.sale.findMany({ where: { id: { in: saleIds }, items: { none: {} } }, select: { id: true } });
      const emptySaleIds = emptySales.map((sale) => sale.id);
      await tx.sale.updateMany({ where: { replacesSaleId: { in: emptySaleIds } }, data: { replacesSaleId: null } });
      await tx.sale.deleteMany({ where: { id: { in: emptySaleIds } } });
      const emptyEntries = await tx.stockEntry.findMany({ where: { id: { in: entryIds }, items: { none: {} } }, select: { id: true } });
      const emptyEntryIds = emptyEntries.map((entry) => entry.id);
      await tx.stockEntry.updateMany({ where: { replacesEntryId: { in: emptyEntryIds } }, data: { replacesEntryId: null } });
      await tx.stockEntry.deleteMany({ where: { id: { in: emptyEntryIds } } });
      await tx.productVariant.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { error: "A exclusão deixaria outro produto com estoque negativo. Exclua os lançamentos relacionados primeiro." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a exclusão. Tente novamente." };
    console.error("Falha ao excluir produto", error);
    return { error: "Não foi possível excluir o produto." };
  }

  try {
    await removeProductImage(product.imageKey);
  } catch (error) {
    console.error("Produto excluído, mas a imagem não pôde ser removida", error);
  }
  revalidatePath("/produtos");
  revalidatePath("/entradas");
  revalidatePath("/vendas");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios");
  redirect("/produtos?excluido=1");
}
