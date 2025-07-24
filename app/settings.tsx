import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../src/config/firebase";

const tabs = [
  { name: "Home", icon: "home", route: "/home" },
  { name: "Devices", icon: "list", route: "/devices" },
  { name: "Power", icon: "stats-chart", route: "/powergraphs" },
  { name: "Alerts", icon: "notifications", route: "/alerts" },
  { name: "Settings", icon: "settings", route: "/settings" },
] as const;

const BottomNav = () => {
  const router = useRouter();
  const segs = useSegments();
  const current = `/${segs.join("/")}`;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tw`flex-row justify-between bg-[#1C1C1E] px-4`,
        { paddingBottom: insets.bottom + 6, paddingTop: 6 },
      ]}
    >
      {tabs.map((t) => {
        const active = current.startsWith(t.route);
        return (
          <TouchableOpacity
            key={t.route}
            style={tw`flex-1 items-center`}
            onPress={() => !active && router.replace(t.route)}
          >
            <Ionicons
              name={t.icon}
              size={22}
              color={active ? "#0A84FF" : "#8E8E93"}
            />
            <Text
              style={tw`text-xs ${
                active ? "text-blue-500" : "text-gray-400"
              }`}
            >
              {t.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const Card = ({ children }: any) => (
  <View style={[tw`mb-6 p-5 rounded-3xl`, { backgroundColor: "#1C1C1E" }]}>
    {children}
  </View>
);
const Label = ({ children }: any) => (
  <Text style={tw`text-sm font-semibold text-gray-300 mb-2`}>{children}</Text>
);
const Input = (props: any) => (
  <TextInput
    placeholderTextColor="#777"
    {...props}
    style={[
      tw`mb-4 px-4 py-3 rounded-2xl text-white border`,
      { borderColor: "#333", backgroundColor: "#111113" },
      props.style,
    ]}
  />
);
const Btn = ({
  title,
  onPress,
  color = "#0A84FF",
}: {
  title: string;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      tw`mt-2 py-3 rounded-2xl items-center`,
      { backgroundColor: color },
    ]}
  >
    <Text style={tw`text-white font-semibold`}>{title}</Text>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [curPwEmail, setCurPwEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showCurPwEmail, setShowCurPwEmail] = useState(false);

  const [curPwPwd, setCurPwPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurPwPwd, setShowCurPwPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);

  const [delModal, setDelModal] = useState(false);
  const [delText, setDelText] = useState("");

  const reauth = async (pw: string) => {
    if (!user || !user.email) return;
    const cred = EmailAuthProvider.credential(user.email, pw);
    await reauthenticateWithCredential(user, cred);
  };

  const handleUpdateEmail = async () => {
    try {
      if (!user) return;
      if (!curPwEmail || !newEmail.trim()) {
        Alert.alert("Missing info", "Enter your current password and new e‑mail");
        return;
      }
      await reauth(curPwEmail);
      await updateEmail(user, newEmail.trim());
      Alert.alert("Success", "E‑mail updated");
      setCurPwEmail("");
      setNewEmail("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!user) return;
      if (!curPwPwd || !newPwd || !confirmPwd) {
        Alert.alert("Missing info", "Fill in all password fields");
        return;
      }
      if (newPwd !== confirmPwd) {
        Alert.alert("Mismatch", "New passwords don’t match");
        return;
      }
      await reauth(curPwPwd);
      await updatePassword(user, newPwd);
      Alert.alert("Success", "Password updated");
      setCurPwPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(user!);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Settings", animation: "none" }} />

      <SafeAreaView style={tw`flex-0 bg-black`} edges={["top", "left", "right"]}>
        <View
          style={[
            tw`flex-row items-center px-4 py-3`,
            { backgroundColor: "#0C0C0E" },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`flex-1 text-center text-2xl font-extrabold text-white`}>
            Settings
          </Text>
          <View style={tw`w-6`} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={tw`flex-1 bg-black`} edges={["left", "right"]}>
        <ScrollView contentContainerStyle={tw`p-6 pb-24`}>
          <Card>
            <Text style={tw`text-lg font-semibold text-white mb-4`}>Update E‑mail</Text>
            <Label>Current password</Label>
            <View>
              <Input
                secureTextEntry={!showCurPwEmail}
                value={curPwEmail}
                onChangeText={setCurPwEmail}
                placeholder="••••••••"
              />
              <TouchableOpacity
                style={tw`absolute right-3 top-3.5`}
                onPress={() => setShowCurPwEmail((v) => !v)}
              >
                <Ionicons
                  name={showCurPwEmail ? "eye-off" : "eye"}
                  size={20}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>
            <Label>New e‑mail</Label>
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Btn title="Save" onPress={handleUpdateEmail} />
          </Card>

          <Card>
            <Text style={tw`text-lg font-semibold text-white mb-4`}>Update Password</Text>
            <Label>Current password</Label>
            <View>
              <Input
                secureTextEntry={!showCurPwPwd}
                value={curPwPwd}
                onChangeText={setCurPwPwd}
                placeholder="••••••••"
              />
              <TouchableOpacity
                style={tw`absolute right-3 top-3.5`}
                onPress={() => setShowCurPwPwd((v) => !v)}
              >
                <Ionicons
                  name={showCurPwPwd ? "eye-off" : "eye"}
                  size={20}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>

            <Label>New password</Label>
            <View>
              <Input
                secureTextEntry={!showNewPwd}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="At least 6 chars"
              />
              <TouchableOpacity
                style={tw`absolute right-3 top-3.5`}
                onPress={() => setShowNewPwd((v) => !v)}
              >
                <Ionicons
                  name={showNewPwd ? "eye-off" : "eye"}
                  size={20}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>

            <Label>Confirm new password</Label>
            <View>
              <Input
                secureTextEntry={!showConfPwd}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Repeat new password"
              />
              <TouchableOpacity
                style={tw`absolute right-3 top-3.5`}
                onPress={() => setShowConfPwd((v) => !v)}
              >
                <Ionicons
                  name={showConfPwd ? "eye-off" : "eye"}
                  size={20}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>

            <Btn title="Save" onPress={handleUpdatePassword} />
          </Card>

          <Btn title="Sign out" onPress={handleSignOut} color="#FF453A" />
          <Btn
            title="Delete account"
            onPress={() => setDelModal(true)}
            color="#FF3B30"
          />
        </ScrollView>
      </SafeAreaView>

      <BottomNav />

      <Modal
        transparent
        animationType="fade"
        visible={delModal}
        onRequestClose={() => setDelModal(false)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center px-8`}>
          <View
            style={[
              tw`w-full p-6 rounded-3xl`,
              { backgroundColor: "#1C1C1E" },
            ]}
          >
            <Text style={tw`text-xl font-semibold text-white mb-2`}>
              Confirm deletion
            </Text>
            <Text style={tw`text-sm text-gray-300 mb-4`}>
              Type <Text style={tw`text-red-400 font-bold`}>DELETE</Text> to
              permanently remove your account.
            </Text>
            <Input
              value={delText}
              onChangeText={setDelText}
              placeholder="DELETE"
              autoCapitalize="characters"
            />
            <View style={tw`flex-row justify-end`}>
              <TouchableOpacity
                onPress={() => setDelModal(false)}
                style={tw`px-4 py-2 mr-2`}
              >
                <Text style={tw`text-gray-300`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  delText.trim() === "DELETE"
                    ? (setDelModal(false), handleDelete())
                    : Alert.alert("Type DELETE to confirm")
                }
                style={[
                  tw`px-4 py-2 rounded-2xl`,
                  { backgroundColor: "#FF3B30" },
                ]}
              >
                <Text style={tw`text-white font-semibold`}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
