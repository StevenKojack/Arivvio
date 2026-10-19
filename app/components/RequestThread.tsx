"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import {
  getQuoteThread,
  sendQuoteMessage,
  type QuoteThread,
} from "@/lib/repositories/messagesRepository";
import {
  sendVendorQuote,
  declineQuote,
  withdrawQuoteRequest,
} from "@/lib/repositories/quotesRepository";
import { confirmAcceptedQuote } from "@/lib/services/quoteService";
import {
  actionableQuote,
  legacyRequestNote,
  requestStatus,
} from "@/lib/requests/lifecycle";
import { formatDate, formatMoney, formatTime } from "@/lib/utils/format";
import { CustomerDialog } from "./CustomerDialog";

export function RequestThread({ requestId }: { requestId: string }) {
  const [thread, setThread] = useState<QuoteThread | null>(null);
  const [error, setError] = useState(
    hasSupabaseConfig() ? "" : "Account conversations are unavailable here.",
  );
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const generation = useRef({ version: 0 });
  const [confirmation, setConfirmation] = useState<
    "accept" | "withdraw" | "decline" | null
  >(null);
  async function refresh() {
    const current = generation.current.version;
    const value = await getQuoteThread(
      createBrowserSupabaseClient(),
      requestId,
    );
    if (current === generation.current.version) setThread(value);
    return value;
  }
  useEffect(() => {
    let active = true;
    const session = generation.current;
    if (!hasSupabaseConfig()) return;
    const client = createBrowserSupabaseClient();
    void getQuoteThread(client, requestId)
      .then((value) => {
        if (active) {
          setThread(value);
          setPrice(value.quote.vendor_final_price?.toString() ?? "");
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to open this request.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        active = false;
        setLoading(false);
        session.version++;
        setThread(null);
        setBody("");
        setNote("");
        setConfirmation(null);
        setError("Sign in to open this conversation.");
      }
    });
    return () => {
      active = false;
      session.version++;
      subscription.unsubscribe();
    };
  }, [requestId]);
  async function run(action: () => Promise<unknown>, after?: () => void) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      after?.();
      setConfirmation(null);
      await refresh();
      window.dispatchEvent(new Event("arivvio:requests-changed"));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save. Refresh and try again.",
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Loading request and conversation…</p>;
  if (!thread)
    return (
      <div className="hub-card p-6">
        <h1 className="text-2xl font-semibold">Request unavailable</h1>
        <p role="alert" className="my-4">
          {error ||
            "Sign in with an account that participates in this request."}
        </p>
        <Link
          className="hub-primary"
          href={`/auth/login?next=${encodeURIComponent(`/account/requests/${requestId}`)}`}
        >
          Sign in
        </Link>
        <Link className="hub-button ml-3" href="/account">
          Your account
        </Link>
      </div>
    );
  const { quote, context, booking } = thread;
  const vendor = thread.viewer_role === "vendor";
  const finalPrice =
    quote.vendor_final_price ??
    (quote.status === "accepted" ? quote.estimated_price : null);
  const closed = thread.read_only;
  const canQuote =
    !closed &&
    !booking &&
    ["pending", "sent", "countered"].includes(quote.status);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="hub-card p-6 sm:p-8">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="eyebrow">
              {vendor ? "Customer inquiry" : "Your provider request"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {thread.provider_name}
            </h1>
            <p className="mt-2 ui-muted">
              {thread.service_name} · {context.title}
            </p>
          </div>
          <span className="h-fit rounded-full border ui-border px-4 py-2 text-sm">
            {requestStatus(
              quote.status,
              !!booking,
              vendor,
              quote.quote_revision,
            )}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="hub-button"
            href={vendor ? "/vendor/dashboard" : `/events/${quote.event_id}`}
          >
            {vendor ? "Vendor workspace" : "Event Hub"}
          </Link>
          <Link className="hub-button" href="/account">
            Your account
          </Link>
          {booking && (
            <Link className="hub-button" href={`/bookings/${booking.id}`}>
              Open booking
            </Link>
          )}
          <button
            className="hub-button"
            disabled={busy}
            onClick={() => void run(async () => undefined)}
          >
            Refresh conversation
          </button>
        </div>
      </header>
      {error && (
        <p className="hub-card p-4" role="alert">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section
          className="hub-card min-w-0 p-5 sm:p-6"
          aria-label="Conversation"
        >
          <h2 className="text-xl font-semibold">Conversation</h2>
          {quote.message &&
            (legacyRequestNote(quote.message) ? (
              <details className="mt-4 rounded-xl border ui-border p-4">
                <summary>Original request details</summary>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                  {quote.message}
                </p>
              </details>
            ) : (
              <div className="mt-4 rounded-xl border ui-border p-4">
                <p className="text-xs font-semibold ui-muted">
                  Customer request note
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {quote.message}
                </p>
              </div>
            ))}
          <ol className="my-6 space-y-4" aria-live="polite">
            {thread.messages.map((message) => (
              <li
                key={message.id}
                className={`max-w-[94%] rounded-2xl border ui-border p-4 ${message.sender_id === thread.viewer_id ? "ml-auto ui-soft" : "mr-auto"}`}
              >
                <div className="mb-2 flex flex-wrap justify-between gap-3 text-xs ui-muted">
                  <span className="font-semibold">
                    {message.sender_id === thread.viewer_id
                      ? "You"
                      : vendor
                        ? "Customer"
                        : thread.provider_name}
                  </span>
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
          {!thread.messages.length && (
            <p className="my-6 text-sm ui-muted">
              Keep questions, answers, and quote details together here.
            </p>
          )}
          {closed ? (
            <p className="border-t ui-border pt-4 text-sm ui-muted">
              This conversation is read only. Your history stays available.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  () =>
                    sendQuoteMessage(
                      createBrowserSupabaseClient(),
                      requestId,
                      body,
                    ),
                  () => setBody(""),
                );
              }}
            >
              <label className="grid gap-2 text-sm font-semibold">
                Message
                <textarea
                  className="min-h-28 w-full rounded-xl border ui-border ui-surface p-3 font-normal"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  disabled={busy}
                  placeholder={
                    vendor
                      ? "Reply to the customer…"
                      : "Ask about the service or quote…"
                  }
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs ui-muted">
                  {body.length}/4000 · Saved to this request
                </span>
                <button
                  className="hub-primary"
                  disabled={busy || !body.trim()}
                  type="submit"
                >
                  {busy ? "Saving…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </section>
        <aside className="space-y-5">
          <section className="hub-card p-5">
            <h2 className="font-semibold">Request details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact label="Occasion" value={context.event_type} />
              <Fact
                label="Date"
                value={
                  context.date
                    ? formatDate(context.date)
                    : context.date_hint || "Date to confirm"
                }
              />
              <Fact
                label="Requested time"
                value={
                  context.start_time && context.end_time
                    ? `${formatTime(context.start_time)} to ${formatTime(context.end_time)}`
                    : "Time to confirm"
                }
              />
              <Fact
                label="Guests"
                value={context.guest_count?.toString() ?? "To confirm"}
              />
              <Fact
                label="City"
                value={context.city || "Confirm location in conversation"}
              />
              <Fact label="Service" value={thread.service_name} />
            </dl>
            {context.stages?.map((stage, index) => (
              <div key={index} className="mt-4 border-t ui-border pt-3 text-sm">
                <p className="font-semibold">{stage.label}</p>
                <p className="ui-muted">
                  {stage.start_time
                    ? formatTime(stage.start_time)
                    : "Time to confirm"}
                  {stage.end_time ? ` to ${formatTime(stage.end_time)}` : ""}
                </p>
              </div>
            ))}
            <p className="mt-4 text-xs ui-muted">
              Details shared when requested. Confirm any later changes in this
              conversation.
            </p>
            {vendor && (
              <p className="mt-4 text-sm ui-muted">
                {thread.schedule_conflicts
                  ? `${thread.schedule_conflicts} other confirmed booking(s) overlap this requested time. Review your schedule before quoting.`
                  : "Confirm availability before quoting. This does not reserve the time."}
              </p>
            )}
          </section>
          <section className="hub-card p-5">
            <h2 className="font-semibold">
              {booking
                ? "Booking"
                : quote.quote_revision > 1
                  ? "Latest quote"
                  : "Quote"}
            </h2>
            <p className="mt-3 text-3xl font-semibold">
              {booking
                ? formatMoney(booking.final_price)
                : finalPrice != null
                  ? formatMoney(finalPrice)
                  : "Awaiting quote"}
            </p>
            {finalPrice == null && quote.estimated_price != null && (
              <p className="mt-2 text-sm ui-muted">
                Initial estimate: {formatMoney(quote.estimated_price)}. The
                provider confirms the final price.
              </p>
            )}
            {booking && (
              <p className="mt-3 text-sm ui-muted">
                Booking recorded. No payment collected. Payments are not
                connected.
              </p>
            )}
            {vendor && canQuote && (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      sendVendorQuote(
                        createBrowserSupabaseClient(),
                        quote,
                        Number(price),
                        note,
                      ),
                    () => setNote(""),
                  );
                }}
              >
                <label className="grid gap-2 text-sm font-semibold">
                  Final price ($)
                  <input
                    className="min-w-0 rounded-xl border ui-border ui-surface p-3"
                    type="number"
                    min="0.01"
                    max="100000000"
                    step="0.01"
                    value={price}
                    required
                    disabled={busy}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Optional quote note
                  <textarea
                    className="min-h-24 rounded-xl border ui-border ui-surface p-3 font-normal"
                    value={note}
                    maxLength={3000}
                    disabled={busy}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button
                  className="hub-primary w-full"
                  disabled={busy || !price}
                  type="submit"
                >
                  {quote.vendor_final_price == null
                    ? "Send quote"
                    : "Send updated quote"}
                </button>
                <button
                  className="hub-button w-full"
                  disabled={busy}
                  type="button"
                  onClick={() => setConfirmation("decline")}
                >
                  Decline request
                </button>
              </form>
            )}
            {!vendor &&
              !closed &&
              actionableQuote(quote.status, !!booking) &&
              finalPrice != null && (
                <button
                  className="hub-primary mt-5 w-full"
                  disabled={busy}
                  onClick={() => setConfirmation("accept")}
                >
                  Accept quote
                </button>
              )}
            {!vendor && !closed && !booking && (
              <button
                className="hub-button mt-3 w-full"
                disabled={busy}
                onClick={() => setConfirmation("withdraw")}
              >
                Withdraw request
              </button>
            )}
            {!vendor &&
              ["declined", "cancelled", "expired"].includes(quote.status) && (
                <Link
                  className="hub-primary mt-5 inline-block"
                  href={`/marketplace?eventId=${quote.event_id}`}
                >
                  Find another provider
                </Link>
              )}
          </section>
        </aside>
      </div>
      {confirmation && (
        <CustomerDialog
          title={
            confirmation === "accept"
              ? "Accept this quote?"
              : confirmation === "withdraw"
                ? "Withdraw this request?"
                : "Decline this request?"
          }
          onClose={() => {
            if (!busy) setConfirmation(null);
          }}
        >
          {confirmation === "accept" ? (
            <>
              <p>
                {thread.service_name} · {formatMoney(finalPrice)}
              </p>
              <p className="my-4 text-sm ui-muted">
                This creates an ARIVVIO booking record. No money is collected.
                Payments are not connected. A separate provider agreement may
                still apply.
              </p>
            </>
          ) : (
            <p className="my-4 text-sm ui-muted">
              The request and conversation stay available as history. No further
              quote or message can be sent.
            </p>
          )}
          {confirmation === "decline" && (
            <label className="mb-4 grid gap-2 text-sm">
              Optional explanation
              <textarea
                className="min-h-24 rounded-xl border ui-border ui-surface p-3"
                value={note}
                maxLength={3000}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          )}
          <button
            className="hub-primary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                confirmation === "accept"
                  ? confirmAcceptedQuote(createBrowserSupabaseClient(), quote)
                  : confirmation === "withdraw"
                    ? withdrawQuoteRequest(
                        createBrowserSupabaseClient(),
                        requestId,
                      )
                    : declineQuote(
                        createBrowserSupabaseClient(),
                        requestId,
                        note,
                      ),
              )
            }
          >
            {busy
              ? "Saving…"
              : confirmation === "accept"
                ? "Confirm booking without payment"
                : confirmation === "withdraw"
                  ? "Confirm withdrawal"
                  : "Confirm decline"}
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm">
              {error}
            </p>
          )}
        </CustomerDialog>
      )}
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ui-muted">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
