import type { Metadata } from "next";
import { ClientBook, type BookItem } from "@/components/clients/ClientBook";
import { ClientDrawer, type DrawerData } from "@/components/clients/ClientDrawer";
import { loadBook } from "@/lib/data/load";
import { retryOnJwtClaims } from "@/lib/data/retry";
import {
  agoLabel, computeAliases, displayName, FIELD_DEFS, fieldValue, fmtStamp, fmtWhen, googleCalendarLink,
  isClosed, isVagueArea, leaseReminderLine, missingFields, summary, type FieldKey,
} from "@/lib/rules";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "客戶簿｜房客簿" };

export default async function ClientsPage({ searchParams }: PageProps<"/app/clients">) {
  const { open } = await searchParams;
  const { supabase, now, today, clients, viewings } = await loadBook();
  const aliases = computeAliases(clients, today);

  const items: BookItem[] = clients.map((c) => {
    const a = aliases.get(c.id)!;
    return {
      id: c.id,
      alias: displayName(a),
      raw: a.raw,
      summary: summary(c),
      missing: missingFields(c).length,
      stage: c.stage,
      closed: isClosed(c.stage),
      ago: agoLabel(c.updatedAt, now),
      hay: [a.text, c.name, fieldValue(c, "phone"), fieldValue(c, "area"), fieldValue(c, "job"), c.stage].join(" ").toLowerCase(),
    };
  });

  let drawer: DrawerData | null = null;
  const openId = typeof open === "string" && idSchema.safeParse(open).success ? open : null;
  const c = openId ? clients.find((x) => x.id === openId) : undefined;
  if (c) {
    const a = aliases.get(c.id)!;
    const { data: logs } = await retryOnJwtClaims(() =>
      supabase.from("client_logs").select("id, text, created_at").eq("client_id", c.id).order("created_at", { ascending: false }),
    );
    const phone = fieldValue(c, "phone");
    drawer = {
      id: c.id,
      name: c.name,
      stage: c.stage,
      fields: Object.fromEntries(FIELD_DEFS.map((f) => [f.key, fieldValue(c, f.key)])) as Record<FieldKey, string>,
      moveInDate: c.moveInDate ?? "",
      leaseEnd: c.leaseEnd ?? "",
      isStudent: c.isStudent,
      needsSubsidy: c.needsSubsidy,
      handoff: c.handoffQuestion,
      alias: { text: displayName(a), raw: a.raw, why: a.why },
      missing: missingFields(c).map((f) => f.short),
      vague: isVagueArea(fieldValue(c, "area")),
      remindLine: leaseReminderLine(c),
      hasPhone: !!phone,
      viewings: viewings
        .filter((v) => v.clientId === c.id)
        .map((v) => ({
          id: v.id,
          when: fmtWhen(v.startsAt),
          address: v.address,
          gcal: googleCalendarLink({ alias: displayName(a), clientName: c.name, phone, summary: summary(c), startsAt: v.startsAt, address: v.address }),
        })),
      logs: (logs ?? []).map((l) => ({ id: l.id, when: fmtStamp(l.created_at), text: l.text })),
    };
  }

  return (
    <>
      <ClientBook items={items} />
      {drawer && <ClientDrawer key={drawer.id} data={drawer} />}
    </>
  );
}
