import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function PlansLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Plans" }} />
      <Stack.Screen name="[id]" options={{ title: "Plan" }} />
      <Stack.Screen name="builder" options={{ title: "Plan Builder" }} />
    </Stack>
  );
}
