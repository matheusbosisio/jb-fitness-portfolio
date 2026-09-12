type InventoryPosition = {
  quantity: number;
  averageUnitCost: number;
  salePrice: number;
};

export function calculateInventoryMetrics(positions: InventoryPosition[]) {
  const totals = positions.reduce(
    (result, position) => ({
      units: result.units + position.quantity,
      costValue: result.costValue + position.quantity * position.averageUnitCost,
      potentialRevenue: result.potentialRevenue + position.quantity * position.salePrice,
    }),
    { units: 0, costValue: 0, potentialRevenue: 0 },
  );

  return { ...totals, potentialProfit: totals.potentialRevenue - totals.costValue };
}
