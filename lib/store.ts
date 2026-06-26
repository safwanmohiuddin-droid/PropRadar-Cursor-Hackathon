"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  AppUser,
  Bid,
  Conversation,
  DistressDeal,
  District,
  Investor,
  MarketData,
  ServerData,
  UserRole,
  WhatsAppMessage,
} from "./types";
import { credibilityScore, tierForScore } from "./scoring";
import { DEMO_CONVERSATIONS, DEMO_DEALS, DEMO_USERS, DEFAULT_USER_ID } from "./demo-data";

const ROLE_TO_USER: Record<UserRole, string> = {
  seller: "seller_01",
  investor: "investor_01",
  buyer: "buyer_01",
};

interface AppStore {
  users: Record<string, AppUser>;
  currentUserId: string;
  deals: DistressDeal[];
  investors: Investor[];
  districts: District[];
  market: MarketData | null;
  conversations: Conversation[];
  isOnboarded: boolean;
  hydrated: boolean;
  aiCache: Record<string, unknown>;

  // selectors
  currentUser: () => AppUser;
  currentRole: () => UserRole;
  getDeal: (id: string) => DistressDeal | undefined;
  getConversation: (id: string) => Conversation | undefined;

  // actions
  setRole: (role: UserRole) => void;
  addDeal: (deal: DistressDeal) => void;
  updateDeal: (id: string, updates: Partial<DistressDeal>) => void;
  submitBid: (dealId: string, bid: Bid) => void;
  updateCredibility: (userId: string, delta: number) => void;
  setOnboarded: () => void;
  hydrateServer: (data: ServerData) => void;
  sendMessage: (conversationId: string, message: WhatsAppMessage) => void;
  addConversation: (conversation: Conversation) => void;
  cacheAi: (key: string, value: unknown) => void;
  readAi: <T>(key: string) => T | undefined;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      users: { ...DEMO_USERS },
      currentUserId: DEFAULT_USER_ID,
      deals: DEMO_DEALS,
      investors: [],
      districts: [],
      market: null,
      conversations: DEMO_CONVERSATIONS,
      isOnboarded: false,
      hydrated: false,
      aiCache: {},

      currentUser: () => get().users[get().currentUserId],
      currentRole: () => get().users[get().currentUserId]?.role ?? "seller",
      getDeal: (id) => get().deals.find((d) => d.id === id),
      getConversation: (id) => get().conversations.find((c) => c.id === id),

      setRole: (role) => {
        const id = ROLE_TO_USER[role] ?? DEFAULT_USER_ID;
        set({ currentUserId: id });
      },

      addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals] })),

      updateDeal: (id, updates) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      submitBid: (dealId, bid) =>
        set((s) => {
          const autoReject = bid.ai_legitimacy_score < 40;
          const finalBid: Bid = autoReject ? { ...bid, status: "rejected" } : bid;
          const deals = s.deals.map((d) =>
            d.id === dealId ? { ...d, bids: [finalBid, ...d.bids] } : d,
          );
          let users = s.users;
          if (autoReject && s.users[bid.bidder_id]) {
            const u = s.users[bid.bidder_id];
            const newScore = Math.max(0, u.credibility_score - 15);
            users = {
              ...users,
              [bid.bidder_id]: { ...u, credibility_score: newScore, tier: tierForScore(newScore) },
            };
          }
          return { deals, users };
        }),

      updateCredibility: (userId, delta) =>
        set((s) => {
          const u = s.users[userId];
          if (!u) return {};
          const newScore = Math.max(0, Math.min(100, u.credibility_score + delta));
          return {
            users: {
              ...s.users,
              [userId]: { ...u, credibility_score: newScore, tier: tierForScore(newScore) },
            },
          };
        }),

      setOnboarded: () => set({ isOnboarded: true }),

      hydrateServer: (data) =>
        set((s) => ({
          districts: data.districts,
          investors: data.investors,
          market: data.market,
          hydrated: true,
          // keep existing deals/conversations from persistence
          ...(s.deals.length ? {} : { deals: DEMO_DEALS }),
          ...(s.conversations.length ? {} : { conversations: DEMO_CONVERSATIONS }),
        })),

      sendMessage: (conversationId, message) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c,
          ),
        })),

      addConversation: (conversation) =>
        set((s) => {
          if (s.conversations.some((c) => c.id === conversation.id)) return {};
          return { conversations: [conversation, ...s.conversations] };
        }),

      cacheAi: (key, value) => set((s) => ({ aiCache: { ...s.aiCache, [key]: value } })),
      readAi: <T,>(key: string) => get().aiCache[key] as T | undefined,
    }),
    {
      name: "dealflow-store",
      version: 3,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        users: s.users,
        currentUserId: s.currentUserId,
        deals: s.deals,
        conversations: s.conversations,
        isOnboarded: s.isOnboarded,
        aiCache: s.aiCache,
      }),
    },
  ),
);

/** Recompute a buyer's credibility from their bid history + profile. */
export function recomputeCredibility(user: AppUser, allDeals: DistressDeal[]): number {
  const myBids = allDeals.flatMap((d) => d.bids).filter((b) => b.bidder_id === user.id);
  const failed = myBids.filter((b) => b.status === "rejected" || b.status === "withdrawn").length;
  const ageDays = Math.max(
    0,
    Math.round((Date.now() - new Date(user.joined_date).getTime()) / (24 * 3600 * 1000)),
  );
  const bidQualityAvg = myBids.length
    ? myBids.reduce((a, b) => a + b.ai_legitimacy_score, 0) / myBids.length
    : 50;
  return credibilityScore({
    deals_completed: user.deals_completed,
    deals_failed: failed,
    account_age_days: ageDays,
    verification_level: user.verification_level ?? "basic",
    bid_quality_avg: bidQualityAvg,
  });
}
