import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptOffer } from "@/lib/offerHelpers";
import { completeTrip, settleTrip } from "@/lib/completeTrip";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: supabaseMock }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));
vi.mock("@/lib/avatarUrl", () => ({ resolveAvatarUrl: vi.fn((url) => Promise.resolve(url)) }));
vi.mock("@/lib/queryCache", () => ({ getCached: vi.fn(() => null), setCache: vi.fn() }));

function mockOfferAcceptChain() {
  const offerSingle = vi.fn().mockResolvedValue({ data: { driver_id: "driver-user-1" }, error: null });
  const offerEq1 = vi.fn(() => ({ single: offerSingle }));
  const offerSelect = vi.fn(() => ({ eq: offerEq1 }));

  const driverMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "driver-row-1" }, error: null });
  const driverEq = vi.fn(() => ({ maybeSingle: driverMaybeSingle }));
  const driverSelect = vi.fn(() => ({ eq: driverEq }));

  const updateResult = { error: null };
  const offerUpdateEq = vi.fn().mockResolvedValue(updateResult);
  const offerUpdateNeq = vi.fn().mockResolvedValue(updateResult);
  const offerUpdateEqForRide = vi.fn(() => ({ neq: offerUpdateNeq }));
  const offerUpdate = vi
    .fn()
    .mockReturnValueOnce({ eq: offerUpdateEq })
    .mockReturnValueOnce({ eq: offerUpdateEqForRide });

  const rideUpdateEq = vi.fn().mockResolvedValue(updateResult);
  const rideUpdate = vi.fn(() => ({ eq: rideUpdateEq }));

  supabaseMock.from.mockImplementation((table: string) => {
    if (table === "offers") return { select: offerSelect, update: offerUpdate };
    if (table === "drivers") return { select: driverSelect };
    if (table === "rides") return { update: rideUpdate };
    throw new Error(`Unexpected table ${table}`);
  });

  return { offerUpdate, rideUpdate };
}

describe("API call helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "rider-1" } }, error: null });
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
  });

  it("acceptOffer updates offer, ride assignment, and competing offers", async () => {
    const chain = mockOfferAcceptChain();

    await acceptOffer("ride-1", "offer-1");

    expect(chain.offerUpdate).toHaveBeenCalledWith({ status: "accepted" });
    expect(chain.rideUpdate).toHaveBeenCalledWith({ status: "accepted", driver_id: "driver-row-1" });
    expect(chain.offerUpdate).toHaveBeenCalledWith({ status: "rejected" });
  });

  it("acceptOffer fails safely on an empty offer response", async () => {
    const offerSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: offerSingle })) })),
    });

    await expect(acceptOffer("ride-1", "missing-offer")).rejects.toThrow("Offer not found");
  });

  it("completeTrip calls RPC and then settlement when completion succeeds", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "ride-1", status: "in_progress", fare: 8, payment_method: "cash", driver_id: "driver-1" },
            error: null,
          }),
        })),
      })),
    });
    supabaseMock.rpc.mockResolvedValue({
      data: { ok: true, fare_usd: 8, commission_usd: 1.2, driver_earnings_usd: 6.8 },
      error: null,
    });
    supabaseMock.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await completeTrip("ride-1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("complete_trip_with_commission", { p_trip_id: "ride-1" });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("settle-trip", { body: { tripId: "ride-1" } });
    expect(result.ok).toBe(true);
  });

  it("completeTrip throws RPC errors", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "ride-1", status: "in_progress", fare: 8, payment_method: "cash", driver_id: "driver-1" },
            error: null,
          }),
        })),
      })),
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: new Error("RPC failed") });

    await expect(completeTrip("ride-1")).rejects.toThrow("RPC failed");
  });

  it("completeTrip rejects trips that have not started", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "ride-1", status: "arrived", fare: 8, payment_method: "cash", driver_id: "driver-1" },
            error: null,
          }),
        })),
      })),
    });

    await expect(completeTrip("ride-1")).rejects.toThrow("Trip can only be completed after it has started");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("settleTrip rejects invalid user/session", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(settleTrip("ride-1")).rejects.toThrow("Not authenticated");
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });
});