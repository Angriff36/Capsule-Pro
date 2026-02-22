import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isClerkAPIResponseError, useSSO, useSignIn } from "@clerk/clerk-expo";

function getErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error) && error.errors[0]?.longMessage) {
    return error.errors[0].longMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Sign in failed. Please try again.";
}

export function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setErrorText(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setErrorText("Additional sign-in steps are required for this account.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setErrorText(null);
    try {
      const { createdSessionId, setActive: setSsoActive } = await startSSOFlow({
        strategy: "oauth_google",
      });

      if (createdSessionId) {
        const activate = setSsoActive ?? setActive;
        if (activate) {
          await activate({ session: createdSessionId });
        } else {
          setErrorText("Session activation is unavailable. Please restart the app.");
        }
      } else {
        setErrorText("Google sign in did not complete. Please try again.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Use your Capsule account to continue.</Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={email}
        />

        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Pressable
          disabled={isSubmitting || !isLoaded}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            styles.button,
            (pressed || isSubmitting) && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={() => void onGoogleSignIn()}
          style={({ pressed }) => [
            styles.secondaryButton,
            (pressed || isSubmitting) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Continue with Google</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
});
