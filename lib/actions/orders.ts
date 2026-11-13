"use server";

import { SHIPPING_FEE } from "../config";
import { parseOrderInput, type FieldErrors } from "../domain/order-schema";
import { slotStart } from "../domain/slots";
import { createSecretClient } from "../supabase/secret";

export type OrderSummaryResult = {
  id: number;
  subtotal: number;
  shippingFee: number;
  total: number;
};

export type SubmitOrderResult =
  | {
      ok: true;
      order: OrderSummaryResult;
    }
  | {
      ok: false;
      fieldErrors: FieldErrors;
      unavailable?: string[];
    };

type RpcCreateOrderResponse =
  | {
      ok: true;
      id: number;
      subtotal: number;
      shipping_fee: number;
      total: number;
    }
  | {
      ok: false;
      error: "rate_limit" | "invalid" | "missing" | "unavailable";
      names?: string[];
    };

export async function submitOrder(
  prevOrFormData: SubmitOrderResult | null | FormData,
  maybeFormData?: FormData,
): Promise<SubmitOrderResult> {
  const formData = prevOrFormData instanceof FormData ? prevOrFormData : maybeFormData;
  if (!formData) {
    return { ok: false, fieldErrors: { form: ["Datos del pedido no recibidos."] } };
  }

  // Parse cart JSON from form
  const rawCart = formData.get("cart");
  let cartData: unknown;
  try {
    cartData = typeof rawCart === "string" ? JSON.parse(rawCart) : rawCart;
  } catch {
    return {
      ok: false,
      fieldErrors: { cart: ["El formato del carrito es inválido."] },
    };
  }

  const rawInput = {
    cart: cartData,
    name: formData.get("name"),
    phone: formData.get("phone"),
    deliveryType: formData.get("deliveryType") ?? formData.get("delivery"),
    address: formData.get("address"),
    date: formData.get("date"),
    slot: formData.get("slot") ?? formData.get("time"),
    note: formData.get("note") ?? formData.get("notes"),
    website: formData.get("website"),
  };

  const parsed = parseOrderInput(rawInput, new Date());
  if (!parsed.ok) {
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { data } = parsed;

  try {
    const supabase = createSecretClient();
    const deliveryAt = slotStart(data.date, data.slot).toISOString();

    const { data: rpcData, error } = await supabase.rpc("create_order", {
      p_name: data.name,
      p_phone: data.phone,
      p_delivery_type: data.deliveryType,
      p_address: data.deliveryType === "domicilio" ? data.address : null,
      p_delivery_at: deliveryAt,
      p_slot: data.slot,
      p_note: data.note,
      p_shipping_fee: SHIPPING_FEE,
      p_items: data.cart,
    });

    if (error || !rpcData) {
      return {
        ok: false,
        fieldErrors: {
          form: ["No pudimos procesar tu pedido. Por favor intentá de nuevo."],
        },
      };
    }

    const response = rpcData as RpcCreateOrderResponse;

    if (response.ok) {
      return {
        ok: true,
        order: {
          id: Number(response.id),
          subtotal: response.subtotal,
          shippingFee: response.shipping_fee,
          total: response.total,
        },
      };
    }

    switch (response.error) {
      case "unavailable": {
        const names = response.names ?? [];
        return {
          ok: false,
          fieldErrors: {
            cart: [
              `Ya no están disponibles: ${names.join(", ")}. Quitalos del carrito para continuar.`,
            ],
          },
          unavailable: names,
        };
      }
      case "rate_limit":
        return {
          ok: false,
          fieldErrors: {
            form: [
              "Superaste el límite de pedidos permitidos. Por favor esperá unos minutos antes de intentar de nuevo.",
            ],
          },
        };
      case "missing":
        return {
          ok: false,
          fieldErrors: {
            cart: ["Hay productos en el carrito que ya no existen. Actualizá tu carrito."],
          },
        };
      case "invalid":
      default:
        return {
          ok: false,
          fieldErrors: {
            form: ["Los datos del pedido son inválidos. Por favor revisá el formulario."],
          },
        };
    }
  } catch {
    return {
      ok: false,
      fieldErrors: {
        form: ["Ocurrió un error inesperado al procesar tu pedido."],
      },
    };
  }
}
