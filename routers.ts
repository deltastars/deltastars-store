import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getAllProducts, getProductById, getProductsByCategory, getUserOrders, getOrderById, getUserCart, getUserInvoices, getUserAccountBalance, getOrderShipment } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Products Router
  products: router({
    list: publicProcedure.query(async () => {
      return await getAllProducts();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductById(input.id);
      }),
    
    getByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await getProductsByCategory(input.category);
      }),
  }),

  // Orders Router
  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserOrders(ctx.user.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getOrderById(input.id);
      }),
  }),

  // Cart Router
  cart: router({
    getCart: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCart(ctx.user.id);
    }),
  }),

  // Invoices Router
  invoices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserInvoices(ctx.user.id);
    }),
  }),

  // Account Router
  account: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      return await getUserAccountBalance(ctx.user.id);
    }),
  }),

  // Shipments Router
  shipments: router({
    getByOrderId: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await getOrderShipment(input.orderId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
