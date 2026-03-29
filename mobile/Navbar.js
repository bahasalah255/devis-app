import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
const navItems = [
  { label: "Dash", icon: <FontAwesome name="home" size={28} color="#fff" /> },
  { label: "Clients", icon: <FontAwesome name="users" size={28} color="#fff" /> },
  { label: "Products", icon: <FontAwesome name="cube" size={28} color="#fff" /> },
  { label: "Parameters", icon: <MaterialIcons name="settings" size={28} color="#fff" /> },
];

export default function Navbar({ onChange }) {
  const [active, setActive] = useState("Home");
  const handlePress = (label) => {
    setActive(label);
    if (onChange) onChange(label); // call parent callback
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Horizontal Navbar */}
      <View style={styles.navbar}>

        {/* Nav Links */}
        <View style={styles.navLinks}>
            
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.navItem, active === item.label && styles.navItemActive]}
              onPress={() => {setActive(item.label)
                handlePress(item.label)}
              }
              
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              {/*
              <Text style={[styles.navLabel, active === item.label && styles.navLabelActive]}>
                {item.label}
              </Text>
              */}
              {/* 
              {active === item.label && <View style={styles.activeDot} />}
              */}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 0,
    backgroundColor: "#e3ebff",
    //height: 35,
  },
  navbar: {
    backgroundColor: "#e2e5ec",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 35,
  },
  brand: {
    fontWeight: "700",
    fontSize: 18,
    color: "#fff",
    letterSpacing: -0.5,
  },
 
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 50,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "rgba(99,102,241,0.15)",
  },
  navIcon: {
    fontSize: 14,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.45)",
  },
  navLabelActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  contentSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
  },
});