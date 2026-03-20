import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Login from './Login.js'
import Dash from './Dash.js';
import Create from './Create.js';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();
export default function App() {
  return (
      <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Dash"
                    component={Dash}
                    options={{ title: 'Tableau de bord' }}
                />
                 <Stack.Screen name="CreateDevis" component={Create} options={{ title: 'Créer un devis' }} />
            </Stack.Navigator>
        </NavigationContainer>
  );
}


