import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Workout" }} />
      <Stack.Screen
        name="active"
        options={{
          title: "Active Workout",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="summary" options={{ title: "Workout Complete" }} />
    </Stack>
  );
}
