// Admin management edge function for Foodbrite.
// - Hashes the admin passcode (PBKDF2-SHA256) before storing.
// - Verifies the passcode for every privileged action.
// - Uses the service role to bypass RLS on writes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PBKDF2_ITERATIONS = 100_000;

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return bytes;
};

const hashPasscode = async (passcode: string, saltHex?: string) => {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  return { hash: toHex(bits), salt: toHex(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength)) };
};

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const verifyPasscode = async (passcode: string) => {
  const { data, error } = await admin
    .from("admin_credentials")
    .select("passcode_hash, salt")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, isSetup: false } as const;
  if (!data.passcode_hash || !data.salt) return { ok: false, isSetup: false } as const;
  const { hash } = await hashPasscode(passcode, data.salt);
  return { ok: constantTimeEqual(hash, data.passcode_hash), isSetup: true } as const;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "";

    if (action === "status") {
      const { data, error } = await admin
        .from("admin_credentials")
        .select("passcode_hash")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return json(200, { isSetup: Boolean(data?.passcode_hash) });
    }

    if (action === "setup") {
      const passcode: string = body?.passcode ?? "";
      if (typeof passcode !== "string" || passcode.length < 4) {
        return json(400, { error: "Passcode must be at least 4 characters." });
      }
      const { data, error: readErr } = await admin
        .from("admin_credentials")
        .select("passcode_hash")
        .eq("id", 1)
        .maybeSingle();
      if (readErr) throw readErr;
      if (data?.passcode_hash) {
        return json(409, { error: "Admin passcode is already set. Use change-passcode." });
      }
      const { hash, salt } = await hashPasscode(passcode);
      const { error: upErr } = await admin
        .from("admin_credentials")
        .upsert({ id: 1, passcode_hash: hash, salt });
      if (upErr) throw upErr;
      return json(200, { ok: true });
    }

    if (action === "verify") {
      const passcode: string = body?.passcode ?? "";
      const result = await verifyPasscode(passcode);
      return json(200, result);
    }

    // Public action: place an order and decrement plates_left.
    if (action === "place-order") {
      const o = body?.order ?? {};
      const customer_name = String(o.customerName ?? "").trim().slice(0, 100);
      const phone = String(o.phone ?? "").trim().slice(0, 30);
      const drop_id = String(o.dropId ?? "").trim().slice(0, 100);
      const meal_name = String(o.mealName ?? "").trim().slice(0, 200);
      const quantity = Math.min(Math.max(parseInt(String(o.quantity ?? "1"), 10) || 1, 1), 50);
      const fulfillment = o.fulfillment === "Delivery" ? "Delivery" : "Pickup";

      if (!customer_name) return json(400, { error: "Customer name is required." });

      const { error: insErr } = await admin.from("orders").insert({
        customer_name, phone, drop_id, meal_name, quantity, fulfillment, status: "pending",
      });
      if (insErr) throw insErr;

      // Decrement plates_left if drop exists (best-effort, don't fail order)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(drop_id);
      if (drop_id && isUuid) {
        try {
          const { data: drop } = await admin
            .from("weekly_drops")
            .select("plates_left")
            .eq("id", drop_id)
            .maybeSingle();
          if (drop) {
            const next = Math.max((drop.plates_left ?? 0) - quantity, 0);
            await admin.from("weekly_drops").update({ plates_left: next }).eq("id", drop_id);
          }
        } catch (e) {
          console.warn("plates_left decrement skipped:", e);
        }
      }
      return json(200, { ok: true });
    }

    if (action === "change-passcode") {
      const current: string = body?.current ?? "";
      const next: string = body?.next ?? "";
      if (next.length < 4) return json(400, { error: "New passcode must be at least 4 characters." });
      const v = await verifyPasscode(current);
      if (!v.ok) return json(401, { error: "Current passcode is incorrect." });
      const { hash, salt } = await hashPasscode(next);
      const { error } = await admin
        .from("admin_credentials")
        .update({ passcode_hash: hash, salt })
        .eq("id", 1);
      if (error) throw error;
      return json(200, { ok: true });
    }

    // Privileged actions below — require valid passcode.
    const passcode: string = body?.passcode ?? "";
    const v = await verifyPasscode(passcode);
    if (!v.ok) return json(401, { error: "Wrong admin passcode." });

    if (action === "save-settings") {
      const s = body?.settings ?? {};
      const payload = {
        id: 1,
        call_phone: String(s.callPhone ?? ""),
        whatsapp_phone: String(s.whatsappPhone ?? ""),
        delivery_badge_text: String(s.deliveryBadgeText ?? ""),
        delivery_fee_note: String(s.deliveryFeeNote ?? ""),
        pickup_note: String(s.pickupNote ?? ""),
        instagram_url: String(s.instagramUrl ?? ""),
        tiktok_url: String(s.tiktokUrl ?? ""),
      };
      const { error } = await admin.from("site_settings").upsert(payload);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "save-drops") {
      const drops = Array.isArray(body?.drops) ? body.drops : [];
      // Replace strategy: delete all then insert. Single-row site, low volume.
      const { error: delErr } = await admin.from("weekly_drops").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) throw delErr;
      if (drops.length > 0) {
        const rows = drops.map((d: any, idx: number) => ({
          meal_name: String(d.mealName ?? "Untitled"),
          price: Number(d.price) || 0,
          portion: String(d.portion ?? ""),
          deadline_weekday: Number(d.deadlineWeekday) || 0,
          deadline_hour: Number(d.deadlineHour) || 0,
          cook_weekday: Number(d.cookWeekday) || 0,
          plates_left: Number(d.platesLeft) || 0,
          total_plates: Number(d.totalPlates) || 1,
          pickup_window: String(d.pickupWindow ?? ""),
          sort_order: idx,
        }));
        const { error: insErr } = await admin.from("weekly_drops").insert(rows);
        if (insErr) throw insErr;
      }
      return json(200, { ok: true });
    }

    if (action === "list-orders") {
      const { data, error } = await admin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return json(200, { orders: data ?? [] });
    }

    if (action === "update-order-status") {
      const id = String(body?.id ?? "");
      const status = String(body?.status ?? "");
      if (!id || !["pending", "confirmed", "cancelled"].includes(status)) {
        return json(400, { error: "Invalid order id or status." });
      }
      const { error } = await admin.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("admin-manage error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: message });
  }
});
