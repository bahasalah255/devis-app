import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";

const navItems = [
  { label: "Home", icon: "🏠" },
  { label: "Clients", icon: "👥" },
  { label: "Products", icon: "📦" },
];

export default function Navbar() {
  const [active, setActive] = useState("Home");

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
              onPress={() => setActive(item.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, active === item.label && styles.navLabelActive]}>
                {item.label}
              </Text>
              {active === item.label && <View style={styles.activeDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Page Content */}
      <View style={styles.content}>
        <Text style={styles.contentTitle}>{active}</Text>
        <Text style={styles.contentSub}>You are on the {active} page.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    //flex: 1,
    backgroundColor: "#e3ebff",
    height: 35,
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
  brandAccent: {
    color: "#818cf8",
    fontSize: 14,
    fontWeight: "600",
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  activeDot: {
    position: "absolute",
    bottom: 2,
    left: "50%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#818cf8",
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