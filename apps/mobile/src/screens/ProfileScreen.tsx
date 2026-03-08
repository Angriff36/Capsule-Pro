import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "../store/auth";
import { apiClient } from "../api/client";
import ErrorState from "../components/ErrorState";

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

interface ProfileResponse {
  user: UserProfile;
}

interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const token = await getAuthToken();
  const response = await apiClient<ProfileResponse>("/api/user/profile", {
    token: token ?? undefined,
  });
  return response.user;
}

async function updateUserProfile(data: ProfileUpdateRequest): Promise<UserProfile> {
  const token = await getAuthToken();
  const response = await apiClient<ProfileResponse>("/api/user/profile", {
    method: "PATCH",
    token: token ?? undefined,
    body: data,
  });
  return response.user;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    select: (data) => data,
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["userProfile"], updatedProfile);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update profile"
      );
    },
  });

  const handleEdit = useCallback(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setPhone(profile.phone ?? "");
      setIsEditing(true);
    }
  }, [profile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  }, [firstName, lastName, phone, updateMutation]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => void signOut(),
        },
      ]
    );
  }, [signOut]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load profile"}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.firstName?.[0]?.toUpperCase() ?? "U"}
          </Text>
        </View>
        <Text style={styles.userName}>
          {profile?.firstName && profile?.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : "User"}
        </Text>
        <Text style={styles.userEmail}>{profile?.email ?? user?.primaryEmailAddress?.emailAddress}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile?.role ?? "Staff"}</Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleEdit}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
                value={firstName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
                value={lastName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
                value={phone}
              />
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleCancel}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={updateMutation.isPending}
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>First Name</Text>
              <Text style={styles.infoValue}>{profile?.firstName ?? "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Name</Text>
              <Text style={styles.infoValue}>{profile?.lastName ?? "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email ?? "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone ?? "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Sign Out Button */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563eb",
    textTransform: "capitalize",
  },
  section: {
    backgroundColor: "#ffffff",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  editButton: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563eb",
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#475569",
  },
  saveButton: {
    backgroundColor: "#2563eb",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ffffff",
  },
  signOutButton: {
    backgroundColor: "#fef2f2",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#dc2626",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 24,
  },
});
