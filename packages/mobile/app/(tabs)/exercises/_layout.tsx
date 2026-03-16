import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function ExercisesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Exercises" }} />
      <Stack.Screen name="[id]" options={{ title: "Exercise" }} />
      <Stack.Screen name="create" options={{ title: "New Exercise" }} />
    </Stack>
  );
}
