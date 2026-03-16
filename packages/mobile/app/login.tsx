import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { colors, spacing, borderRadius, typography } from "../src/theme";
import { Button } from "../src/components/ui/Button";
import { useAuth } from "../src/hooks/useAuth";
import { trpc } from "../src/api/trpc";

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (isRegister && !displayName) {
      Alert.alert("Error", "Please enter your display name");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const result = await registerMutation.mutateAsync({
          email,
          password,
          displayName,
        });
        await login(result.token);
      } else {
        const result = await loginMutation.mutateAsync({ email, password });
        await login(result.token);
      }
      router.replace("/(tabs)/workout");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>GymPlan</Text>
          <Text style={styles.subtitle}>
            {isRegister ? "Create your account" : "Welcome back"}
          </Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 8 characters"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
            />
          </View>

          <Button
            title={isRegister ? "Create Account" : "Sign In"}
            onPress={handleSubmit}
            size="large"
            loading={loading}
            style={styles.submitButton}
          />

          <Button
            title={
              isRegister
                ? "Already have an account? Sign In"
                : "Don't have an account? Register"
            }
            onPress={() => setIsRegister(!isRegister)}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
