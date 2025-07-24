/* ---------------------------------------------------------------------------
 *  signup.tsx  –  Instagram-style sign-up (confirm-password)      2025-07-08
 *--------------------------------------------------------------------------- */
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../src/config/firebase";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";

/* ────────── util ────────── */
const fmtErr = (c: string) =>
  c === "auth/invalid-email"
    ? "Invalid e-mail"
    : c === "auth/weak-password"
    ? "Password ≥ 6 chars"
    : c === "auth/email-already-in-use"
    ? "E-mail already in use"
    : "Something went wrong";

export default function Signup() {
  const nav = useRouter();
  const [email, setEmail]             = useState("");
  const [pw, setPw]                   = useState("");
  const [pw2, setPw2]                 = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState("");

  /* ──────── actions ──────── */
  const submit = async () => {
    if (!email.trim())          return setErr("Enter e-mail");
    if (!pw)                    return setErr("Enter password");
    if (pw.length < 6)          return setErr("Password ≥ 6 chars");
    if (pw !== pw2)             return setErr("Passwords don’t match");
    setErr("");
    try {
      setBusy(true);
      await createUserWithEmailAndPassword(auth, email, pw);
      nav.replace("/");                       // back to login
    } catch (e: any) {
      setErr(fmtErr(e.code));
    } finally {
      setBusy(false);
    }
  };

  /* ──────── ui ──────── */
  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tw`flex-1 items-center pt-20`}
      >
        {/* word-mark */}
        <Text style={tw`text-4xl font-extrabold text-white mb-10`}>
          HVA<Text style={tw`italic`}>See</Text>
        </Text>

        {/* card */}
        <View style={tw`w-11/12 max-w-md bg-[#1C1C1E] px-6 py-8 rounded-3xl`}>
          {err ? <Text style={tw`text-red-400 text-center mb-4`}>{err}</Text> : null}

          {/* e-mail */}
          <TextInput
            style={tw`bg-[#111113] text-white px-4 py-3 rounded-xl mb-4`}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
            value={email}
          />

          {/* password */}
          <View style={tw`relative mb-4`}>
            <TextInput
              style={tw`bg-[#111113] text-white px-4 py-3 pr-12 rounded-xl`}
              placeholder="Password (≥ 6 chars)"
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

          {/* confirm password */}
          <TextInput
            style={tw`bg-[#111113] text-white px-4 py-3 rounded-xl mb-6`}
            placeholder="Confirm Password"
            placeholderTextColor="#6B7280"
            secureTextEntry={!showPw}
            onChangeText={setPw2}
            value={pw2}
          />

          {/* sign-up btn */}
          <TouchableOpacity
            style={tw`bg-[#0A84FF] py-3 rounded-xl items-center`}
            disabled={busy}
            onPress={submit}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white font-semibold text-lg`}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* link back to login */}
        <TouchableOpacity style={tw`mt-6`} onPress={() => nav.replace("/")}>
          <Text style={tw`text-[#0A84FF]`}>
            Already have an account? <Text style={tw`font-semibold`}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
