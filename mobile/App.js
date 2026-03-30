import { StatusBar, Platform } from 'react-native';
import Login from './Login.js';
import Dash from './Dash.js';
import Create from './Create.js';
import Update from './Update.js';
import Archive from './Archives.js';
import Clients from './Clients.js';
import Products from './Products.js';
import Parameters from './Parameters.js';
import SmartPasteScreen from './SmartPasteScreen.jsx';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
          backgroundColor={Platform.OS === 'android' ? '#4F46E5' : 'transparent'}
          translucent={Platform.OS === 'android'}
        />
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login"       component={Login} />
          <Stack.Screen name="Dash"        component={Dash} />
          <Stack.Screen name="Clients"       component={Clients} />
          <Stack.Screen name="Products"       component={Products} />
           <Stack.Screen name="Parameters"       component={Parameters} />
          <Stack.Screen name="SmartPaste" options={{ presentation: 'modal' }}>
            {({ navigation }) => (
              <SmartPasteScreen
                onClose={() => navigation.goBack()}
                onInsert={(lines) => navigation.replace('CreateDevis', { prefilledLines: lines })}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="CreateDevis" component={Create} />
          <Stack.Screen name="UpdateDevis" component={Update} />
          <Stack.Screen name='Archive' component={Archive} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
