import { describe, expect, it } from "vitest";
import { buildAdminEmail, formatDateLabel, formatSlotLabel, oneLine, type OrderSummary } from "./messages";
import { STORE } from "../config";

const order: OrderSummary = {
  id: 1001,
  customerName: "Ana Pérez",
  customerPhone: "3513445566",
  deliveryType: "domicilio",
  address: "Av. Colón 123, Córdoba",
  deliveryDate: "2026-11-17",
  deliverySlot: "08:00-09:00",
  items: [
    { name: "Caja Cumpleaños", qty: 2, unitPrice: 18500, messages: ["Feliz cumple Ana", ""] },
    { name: "Alfajores artesanales", qty: 1, unitPrice: 3200, messages: [] },
  ],
  subtotal: 40200,
  shippingFee: 3000,
  total: 43200,
};

describe("oneLine", () => {
  it("colapsa saltos de línea, tabulaciones y espacios múltiples", () => {
    expect(oneLine("  Av.\nColón \t 123   ")).toBe("Av. Colón 123");
  });
});

describe("formatDateLabel / formatSlotLabel", () => {
  it("formatea DD/MM/AAAA y 'HH:MM a HH:MM'", () => {
    expect(formatDateLabel("2026-11-17")).toBe("17/11/2026");
    expect(formatSlotLabel("08:00-09:00")).toBe("08:00 a 09:00");
  });
});

describe("buildAdminEmail", () => {
  it("asunto en una línea y cuerpo con pedido, cliente, enlace de WhatsApp, ítems, mensajes y totales", () => {
    const { subject, text } = buildAdminEmail({ ...order, note: "Dejar en recepción" });
    expect(subject).toBe("Nuevo pedido #1001 — Ana Pérez — $43.200");
    expect(text).toBe(
      [
        "Nuevo pedido #1001",
        "",
        "Cliente: Ana Pérez",
        "Responder por WhatsApp: https://wa.me/5493513445566",
        "Entrega: Envío a domicilio (Av. Colón 123, Córdoba), $3.000 de envío incluido",
        "Fecha y horario: 17/11/2026, 08:00 a 09:00",
        "",
        "Ítems:",
        "- 2 × Caja Cumpleaños — $37.000",
        "    Mensaje 1: Feliz cumple Ana",
        "- 1 × Alfajores artesanales — $3.200",
        "",
        "Subtotal: $40.200",
        "Envío: $3.000",
        "Total: $43.200",
        "",
        "Nota: Dejar en recepción",
      ].join("\n"),
    );
  });

  it("html: un único enlace wa.me con el id internacional (549 + 10 dígitos)", () => {
    const { html } = buildAdminEmail(order);
    const link = "https://wa.me/5493513445566";
    expect(html).toContain(`Responder por WhatsApp: <a href="${link}">${link}</a>`);
    expect(html).not.toContain("(WhatsApp");
    expect((html.match(/<a /g) ?? []).length).toBe(1);
  });

  it("html: escapa datos del cliente y no permite inyectar etiquetas ni enlaces", () => {
    const { html } = buildAdminEmail({
      ...order,
      customerName: '<script>alert("x")</script>',
      address: '<a href="https://evil.test">click</a>',
      items: [{ name: "<b>Caja</b>", qty: 1, unitPrice: 1000, messages: ["<img src=x onerror=alert(1)>"] }],
      note: "<i>nota</i>",
    });
    expect(html).not.toMatch(/<script|<b>|<i>|<img/);
    expect(html).not.toContain("evil.test\">");
    expect(html).toContain("&lt;script&gt;");
    expect((html.match(/<a /g) ?? []).length).toBe(1);
  });

  it("sin teléfono válido no hay enlace, pero el correo igual se arma", () => {
    const { text, html } = buildAdminEmail({ ...order, customerPhone: "123" });
    expect(text).not.toContain("wa.me");
    expect(html).not.toContain("<a ");
    expect(text).toContain("Cliente: Ana Pérez (WhatsApp 123)");
  });

  it("retiro sin envío ni nota; el nombre del cliente no rompe el asunto", () => {
    const { subject, text } = buildAdminEmail({
      ...order,
      customerName: "Ana\nPérez",
      deliveryType: "retiro",
      address: null,
      shippingFee: 0,
      total: 40200,
    });
    expect(subject).not.toMatch(/[\n\r]/);
    expect(text).toContain(`Entrega: Retiro en el local (${STORE.address})`);
    expect(text).not.toContain("Envío: ");
    expect(text).not.toContain("Nota:");
  });
});
