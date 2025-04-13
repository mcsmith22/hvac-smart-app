import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { auth } from '../.expo/config/firebase';
import {
  updateEmail,
  updatePassword,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SettingsScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showCurrentPasswordForEmail, setShowCurrentPasswordForEmail] = useState(false);

  const [currentPasswordForPassword, setCurrentPasswordForPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPasswordForPassword, setShowCurrentPasswordForPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const reauthenticate = async (currentPassword: string) => {
    if (!currentUser || !currentUser.email) return;
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
  };

  const handleUpdateEmail = async () => {
    try {
      if (!currentUser) return;
      if (!newEmail.trim() || !currentPasswordForEmail) {
        Alert.alert('Input Error', 'Please provide both your current password and new email.');
        return;
      }
      await reauthenticate(currentPasswordForEmail);
      await updateEmail(currentUser, newEmail.trim());
      Alert.alert('Success', 'Email updated successfully.');
      setCurrentPasswordForEmail('');
      setNewEmail('');
    } catch (error: any) {
      Alert.alert('Error updating email', error.message);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!currentUser) return;
      if (!currentPasswordForPassword || !newPassword || !confirmNewPassword) {
        Alert.alert('Input Error', 'Please fill out all password fields.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Alert.alert('Mismatch', 'New Password and Confirm New Password do not match.');
        return;
      }
      await reauthenticate(currentPasswordForPassword);
      await updatePassword(currentUser, newPassword);
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPasswordForPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Error updating password', error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(currentUser!);
      Alert.alert('Account Deleted', 'Your account has been deleted.');
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error deleting account', error.message);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmationText.trim() === 'DELETE') {
      setDeleteModalVisible(false);
      handleDeleteAccount();
    } else {
      Alert.alert('Confirmation Error', 'Please type DELETE to confirm account deletion.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={25} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            <Text style={styles.headerBold}>HVA</Text>
            <Text style={styles.headerItalic}>See</Text>
          </Text>
          <Text style={styles.headerHome}>Settings</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>Account Settings</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Email</Text>

            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showCurrentPasswordForEmail}
                value={currentPasswordForEmail}
                onChangeText={setCurrentPasswordForEmail}
                placeholder="Enter current password"
              />
              <TouchableOpacity onPress={() => setShowCurrentPasswordForEmail(prev => !prev)} style={styles.eyeButton}>
                <Ionicons name={showCurrentPasswordForEmail ? 'eye-off' : 'eye'} size={20} color="#49aae6" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Email</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdateEmail}>
              <Text style={styles.buttonText}>Update Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Password</Text>
            
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showCurrentPasswordForPassword}
                value={currentPasswordForPassword}
                onChangeText={setCurrentPasswordForPassword}
                placeholder="Enter current password"
              />
              <TouchableOpacity onPress={() => setShowCurrentPasswordForPassword(prev => !prev)} style={styles.eyeButton}>
                <Ionicons name={showCurrentPasswordForPassword ? 'eye-off' : 'eye'} size={20} color="#49aae6" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(prev => !prev)} style={styles.eyeButton}>
                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#49aae6" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showConfirmNewPassword}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Confirm new password"
              />
              <TouchableOpacity onPress={() => setShowConfirmNewPassword(prev => !prev)} style={styles.eyeButton}>
                <Ionicons name={showConfirmNewPassword ? 'eye-off' : 'eye'} size={20} color="#49aae6" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
              <Text style={styles.buttonText}>Update Password</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={openDeleteModal}>
              <Text style={styles.buttonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={modalStyles.modalText}>Type DELETE to confirm:</Text>
            <TextInput
              style={modalStyles.modalInput}
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              placeholder="DELETE"
              autoCapitalize="characters"
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity style={modalStyles.modalButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={modalStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.modalButton, modalStyles.modalDeleteButton]} onPress={confirmDelete}>
                <Text style={modalStyles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safeArea: { flex: 0, backgroundColor: '#49aae6' },
  contentContainer: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
  section: { marginBottom: 30, backgroundColor: '#f7f7f7', padding: 16, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16, backgroundColor: '#fff' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', position: 'relative', marginBottom: 12 },
  passwordInput: { flex: 1, paddingRight: 40 },
  eyeButton: { 
    position: 'absolute', 
    right: 10, 
    top: '50%', 
    transform: [{ translateY: -15 }]
  },
  button: { backgroundColor: '#49aae6', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  signOutButton: { backgroundColor: '#ff3b30' },
  deleteButton: { backgroundColor: '#ff3b30' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerBar: { backgroundColor: '#49aae6', paddingTop: 5, paddingBottom: 5, justifyContent: 'center', alignItems: 'center', height: 70, position: 'relative' },
  backButton: { position: 'absolute', top: 20, left: 10, padding: 10 },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerBold: { fontWeight: 'bold' },
  headerItalic: { fontStyle: 'italic' },
  headerHome: { fontSize: 16, color: '#fff', marginTop: 0 },
});

const modalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalText: { fontSize: 16, marginBottom: 12 },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { flex: 1, padding: 10, alignItems: 'center' },
  modalDeleteButton: { backgroundColor: '#ff3b30', borderRadius: 8 },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
});
