import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { useAuth } from "../../../src/hooks/useAuth";
import { trpc } from "../../../src/api/trpc";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}

function SettingsRow({ icon, label, value, onPress }: SettingsRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={22} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textDisabled}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingsRow icon="person-outline" label="Profile" />
        <SettingsRow icon="notifications-outline" label="Notifications" />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Workout</Text>
        <SettingsRow
          icon="timer-outline"
          label="Default Rest Timer"
          value="90s"
        />
        <SettingsRow
          icon="barbell-outline"
          label="Weight Increment"
          value="2.5 kg"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <SettingsRow icon="information-circle-outline" label="About" />
        <SettingsRow icon="document-text-outline" label="Privacy Policy" />
        <SettingsRow
          icon="code-slash-outline"
          label="Version"
          value="1.0.0"
        />
      </Card>

      <Button
        title="Log Out"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  rowValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
