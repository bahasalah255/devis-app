import React, { useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function CameraScreen({ onCaptured, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  const takePhoto = async () => {
    setLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        base64: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setPhoto(asset.uri);

      onCaptured?.({
        uri: asset.uri,
        name: asset.fileName || 'camera.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <TouchableOpacity
        onPress={takePhoto}
        disabled={loading}
        style={{
          height: 52,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#4F46E5',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Prendre une photo</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCancel}
        style={{
          height: 46,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E5EA',
        }}
      >
        <Text style={{ color: '#1C1C1E', fontWeight: '700' }}>Retour</Text>
      </TouchableOpacity>

      {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" /> : null}
    </View>
  );
}