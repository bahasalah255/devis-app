import { StatusBar } from 'expo-status-bar';
import Login from './Login.js';
import Dash from './Dash.js';
import Create from './Create.js';
import Update from './Update.js';
import Archive from './Archives.js';
import Clients from './Clients.js';
import Products from './Products.js';
import Parameters from './Parameters.js';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"       component={Login} />
        <Stack.Screen name="Dash"        component={Dash} />
        <Stack.Screen name="Clients"       component={Clients} />
        <Stack.Screen name="Products"       component={Products} />
         <Stack.Screen name="Parameters"       component={Parameters} />
        <Stack.Screen name="CreateDevis" component={Create} />
        <Stack.Screen name="UpdateDevis" component={Update} />
        <Stack.Screen name='Archive' component={Archive} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
