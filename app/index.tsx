import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../src/config/firebase";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import * as SecureStore from 'expo-secure-store'

export default function Login() {
  const nav = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const msg = (c: string) =>
    c === "auth/invalid-email"
      ? "Invalid e-mail"
      : c === "auth/user-not-found"
      ? "User not found"
      : c === "auth/wrong-password"
      ? "Incorrect password"
      : "Something went wrong";

  const handleLogin = async () => {
    if (!email.trim()) return setErr("Enter e-mail");
    if (!pw) return setErr("Enter password");
    setErr("");
    try {
      setBusy(true);
      await SecureStore.setItemAsync('userEmail', email)
      await SecureStore.setItemAsync('userPassword', pw)
      await signInWithEmailAndPassword(auth, email, pw);
      nav.replace("/home");
    } catch (e: any) {
      setErr(msg(e.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tw`flex-1 items-center pt-20`}
      >
        <Text style={tw`text-4xl font-extrabold text-white mb-10`}>
          HVA<Text style={tw`italic`}>See</Text>
        </Text>

        <View style={tw`w-11/12 max-w-md bg-[#1C1C1E] px-6 py-8 rounded-3xl`}>
          {err ? (
            <Text style={tw`text-red-400 text-center mb-4`}>{err}</Text>
          ) : null}

          <TextInput
            style={tw`bg-[#111113] text-white px-4 py-3 rounded-xl mb-4`}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            value={email}
          />

          <View style={tw`relative mb-6`}>
            <TextInput
              style={tw`bg-[#111113] text-white px-4 py-3 pr-12 rounded-xl`}
              placeholder="Password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPw}
              onChangeText={setPw}
              value={pw}
            />
            <TouchableOpacity
              onPress={() => setShowPw(!showPw)}
              style={tw`absolute right-4 top-3`}
            >
              <Ionicons
                name={showPw ? "eye-off" : "eye"}
                size={22}
                color="#8E8E93"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={tw`bg-[#0A84FF] py-3 rounded-xl items-center`}
            disabled={busy}
            onPress={handleLogin}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white font-semibold text-lg`}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={tw`mt-6`}
          onPress={() => nav.push("/signup")}
        >
          <Text style={tw`text-[#0A84FF]`}>
            Don’t have an account? <Text style={tw`font-semibold`}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
