import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "History" }} />
      <Stack.Screen name="[id]" options={{ title: "Workout Detail" }} />
      <Stack.Screen name="progress" options={{ title: "Progress" }} />
      <Stack.Screen name="records" options={{ title: "Personal Records" }} />
    </Stack>
  );
}
