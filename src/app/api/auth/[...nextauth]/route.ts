import { handlers } from "@/auth";

// Mount NextAuth v5's route handler. The `handlers` object exposes GET + POST
// for all NextAuth-managed routes (signin, callback, session, csrf, etc.).
export const { GET, POST } = handlers;
