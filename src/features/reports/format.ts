export const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const integer = new Intl.NumberFormat("pt-BR");
export const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export const paymentLabels = { PIX: "Pix", CASH: "Dinheiro", DEBIT_CARD: "Cartão de débito", CREDIT_CARD: "Cartão de crédito" } as const;
