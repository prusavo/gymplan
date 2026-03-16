import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY } from "../api/trpc";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

let authListeners: Array<(token: string | null) => void> = [];

function notifyListeners(token: string | null) {
  authListeners.forEach((l) => l(token));
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        setState({
          token,
          isAuthenticated: !!token,
          isLoading: false,
        });
      } catch {
        setState({ token: null, isAuthenticated: false, isLoading: false });
      }
    };

    loadToken();

    const listener = (token: string | null) => {
      setState({
        token,
        isAuthenticated: !!token,
        isLoading: false,
      });
    };
    authListeners.push(listener);
    return () => {
      authListeners = authListeners.filter((l) => l !== listener);
    };
  }, []);

  const login = useCallback(async (token: string) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    notifyListeners(token);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    notifyListeners(null);
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
