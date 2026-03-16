import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Type-only import from monorepo API package
import type { AppRouter } from "../../../api/src/router/index.js";

export type { AppRouter };

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Android emulator uses 10.0.2.2 to reach host machine's localhost
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:3000/trpc`;
};

export const AUTH_TOKEN_KEY = "gymplan_auth_token";

export const createTRPCClient = () =>
  trpc.createClient({
    links: [
      httpBatchLink({
        url: getBaseUrl(),
        async headers() {
          const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
