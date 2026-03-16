import { Redirect } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/workout" />;
}
