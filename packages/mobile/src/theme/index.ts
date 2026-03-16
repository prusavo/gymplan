export const colors = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceVariant: "#2C2C2C",
  primary: "#BB86FC",
  primaryVariant: "#9C64FF",
  secondary: "#03DAC6",
  error: "#CF6679",
  text: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textDisabled: "#666666",
  success: "#4CAF50",
  warning: "#FF9800",
  border: "#333333",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const },
  h2: { fontSize: 24, fontWeight: "600" as const },
  h3: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodySmall: { fontSize: 14, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
} as const;
