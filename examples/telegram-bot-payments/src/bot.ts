import { Telegraf, Markup } from "telegraf";
import { PRODUCTS } from "./products";
import { RateLimiter } from "./rateLimiter";
import { logger } from "./logger";
import { notify } from "./monitoring";
import { TelePayGateClient } from "./telepaygate";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEPAYGATE_URL =
  process.env.TELEPAYGATE_API_URL || "http://localhost:3000";
const WEBAPP_NAME = process.env.WEBAPP_NAME || "TelePayGate Store";

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Telegraf(BOT_TOKEN);
const tgLimiter = new RateLimiter(20, 10);
const gateway = new TelePayGateClient({ apiBaseUrl: TELEPAYGATE_URL });

function formatPrice(amount: number): string {
  const stars = amount / 100;
  return `${stars} XTR`;
}

bot.start(async (ctx) => {
  const buttons = PRODUCTS.map((p) =>
    Markup.button.callback(`${p.name} — ${formatPrice(p.amount)}`, `buy:${p.id}`)
  );
  await tgLimiter.schedule(() =>
    ctx.reply(
      `Welcome to ${WEBAPP_NAME}! Choose a product to purchase:`,
      Markup.inlineKeyboard(buttons, { columns: 1 })
    )
  );
});

bot.action(/^buy:(.+)$/, async (ctx) => {
  try {
    const itemId = ctx.match?.[1];
    const product = PRODUCTS.find((p) => p.id === itemId);
    if (!product) {
      await tgLimiter.schedule(() =>
        ctx.answerCbQuery("Product not found", { show_alert: true })
      );
      return;
    }

    const payload = JSON.stringify({
      user_id: ctx.from?.id,
      item_id: product.id
    });

    await tgLimiter.schedule(() =>
      ctx.replyWithInvoice({
        title: product.name,
        description: product.description,
        payload,
        provider_token: process.env.TELEGRAM_PROVIDER_TOKEN || "STARS",
        currency: "XTR",
        prices: [{ label: product.name, amount: product.amount }],
        start_parameter: `sp_${product.id}`
      })
    );
    await tgLimiter.schedule(() =>
      ctx.answerCbQuery(`Invoice created for ${product.name}`)
    );
  } catch (err) {
    logger.error("sendInvoice error", err as any);
    await tgLimiter.schedule(() =>
      ctx.answerCbQuery("Failed to create invoice", { show_alert: true })
    );
  }
});

bot.on("pre_checkout_query", async (ctx) => {
  try {
    const q = ctx.preCheckoutQuery;
    const validCurrency = q.currency === "XTR";
    const payloadOk =
      typeof q.invoice_payload === "string" &&
      q.invoice_payload.includes("item_id");
    if (!validCurrency || !payloadOk) {
      await ctx.answerPreCheckoutQuery(false, "Invalid currency or payload");
      await notify("payment.precheckout.error", {
        userId: q.from.id,
        currency: q.currency
      });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    await notify("payment.precheckout.ok", {
      userId: q.from.id,
      amount: q.total_amount
    });
  } catch (err) {
    logger.error("pre_checkout_query error", err as any);
    await ctx.answerPreCheckoutQuery(false, "Internal error");
    await notify("payment.precheckout.error", { error: "internal" });
  }
});

bot.on("successful_payment", async (ctx) => {
  try {
    const payment = ctx.message.successful_payment;
    const userId = ctx.from.id.toString();
    logger.info("successful_payment", {
      userId,
      total_amount: payment.total_amount,
      currency: payment.currency,
      tg_charge_id: payment.telegram_payment_charge_id,
      provider_charge_id: payment.provider_payment_charge_id
    });
    await notify("payment.success", {
      userId,
      amount: payment.total_amount,
      currency: payment.currency
    });

    const updatePayload = {
      update_id: ctx.update.update_id,
      message: {
        from: {
          id: ctx.from.id,
          username: ctx.from.username
        },
        successful_payment: {
          currency: payment.currency,
          total_amount: payment.total_amount,
          invoice_payload: payment.invoice_payload,
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
          provider_payment_charge_id: payment.provider_payment_charge_id
        }
      }
    };

    const webhookRes = await gateway.postWebhookUpdate(userId, updatePayload);
    if (webhookRes.status >= 200 && webhookRes.status < 300) {
      await notify("telepaygate.webhook.ok", {
        paymentId: webhookRes.paymentId
      });
    } else {
      await notify("telepaygate.webhook.error", {
        status: webhookRes.status,
        body: webhookRes.body
      });
    }

    const paymentId = webhookRes.paymentId;
    let delivered = false;
    if (paymentId) {
      const ok = await gateway.verifySettlement(userId, paymentId, {
        retry: 5,
        backoffMs: 750
      });
      if (ok) {
        await notify("telepaygate.verify.ok", { paymentId });
        delivered = true;
      } else {
        await notify("telepaygate.verify.error", { paymentId });
      }
    }

    if (delivered) {
      await tgLimiter.schedule(() =>
        ctx.reply(
          "✅ Payment confirmed. Here is your digital good:\nhttps://example.com/downloads/" +
            (ctx.from.username || userId)
        )
      );
    } else {
      await tgLimiter.schedule(() =>
        ctx.reply(
          "✅ Payment received. Your purchase will be delivered after settlement."
        )
      );
    }
  } catch (err) {
    logger.error("successful_payment handler error", err as any);
    await tgLimiter.schedule(() =>
      ctx.reply("❌ Error processing payment. Support has been notified.")
    );
  }
});

if (process.env.TELEGRAM_WEBHOOK_URL) {
  bot.telegram
    .setWebhook(process.env.TELEGRAM_WEBHOOK_URL)
    .then(() => logger.info("Webhook set", process.env.TELEGRAM_WEBHOOK_URL))
    .catch((e) => logger.error("Webhook set error", e as any));
}

bot.launch().then(() => logger.info("Bot launched")).catch((e) => {
  logger.error("Bot launch error", e as any);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
