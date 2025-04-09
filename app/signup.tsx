import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../.expo/config/firebase';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const parseAuthError = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/email-already-in-use':
        return 'That email address is already in use.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleSignup = async () => {

    if (!email.trim()) {
      setErrorMessage('Please enter an email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created:', userCredential.user);
      setErrorMessage('');
      router.replace('/'); 
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMessage(parseAuthError(error.code));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sign Up' }} />
      <Stack.Screen options={{ headerShown: false }} />
      
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.headerBar}>
                <Text style={styles.headerText}>
                  <Text style={styles.headerBold}>HVA</Text>
                    <Text style={styles.headerItalic}>See</Text>
                </Text>
              </View>
            </SafeAreaView>
            
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Create an Account</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <TextInput
          style={[styles.input, styles.wideInput]}
          placeholder="Email"
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
        />
        <View style={[styles.passwordContainer, styles.wideInput]}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            secureTextEntry={!passwordVisible}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#49aae6"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.requirementsText}>
          Password must be at least 6 characters long.
        </Text>
        <TouchableOpacity style={[styles.button, styles.wideInput]} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/')}>
          <Text style={styles.linkText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 20, 
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff'
  },
  wideInput: { 
    width: '80%',
    alignSelf: 'center'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: '50%', 
    transform: [{ translateY: -21 }],
    padding: 4,
  },
  requirementsText: { 
    color: '#666', 
    marginBottom: 16, 
    fontSize: 14, 
    textAlign: 'center' 
  },
  button: {
    backgroundColor: '#49aae6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  link: {
    alignSelf: 'center',
    marginTop: 10,
  },
  linkText: {
    color: '#49aae6',
  },
  safeArea: {
    flex: 0,  
  },
  headerBar: {
    backgroundColor: '#49aae6', 
    paddingTop: 5, 
    paddingBottom: 5,  
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,  
  },
  headerText: {
    fontSize: 28, 
    fontWeight: 'bold',
    color: '#fff', 
  },
  headerBold: {
    fontWeight: 'bold',
  },
  headerItalic: {
    fontStyle: 'italic',
  },
  headerHome: {
    fontSize: 14,  
    color: '#fff',  
    marginTop: 0, 
  },
  headerWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
});
