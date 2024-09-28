import React from 'react';
import { View, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import MainStack from './src/navigation/MainStack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/redux/store/store';
import SignInScreen from './src/screens/SignIn/SignInScreen';
import messaging from '@react-native-firebase/messaging';
import { NotificationManagerAndroid } from './NotificationManager';
import {
  GlobalContainer as UikitContainer,
} from 'react-native-chat-uikit';
import { notificationManager } from './NotificationManagerIOS';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import notifee, { AndroidImportance, AuthorizationStatus, EventType } from '@notifee/react-native';
import {
  OverlayProvider,
  Chat
} from 'stream-chat-react-native'; // Or stream-chat-expo

import { chatClient } from './ChatConfig';
import SplashScreen from 'react-native-splash-screen';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import PushNotification from 'react-native-push-notification';
import { AppState } from 'react-native';
import { navigate } from './src/navigation/RootNavigation';




export const AppContext = React.createContext({
  channel: null,
  setChannel: (channel) => { },
  thread: null,
  setThread: (thread) => { },
});

export const AppProvider = ({ children }) => {
  const [channel, setChannel] = React.useState();
  const [thread, setThread] = React.useState();

  return <AppContext.Provider value={{ channel, setChannel, thread, setThread }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => React.useContext(AppContext);




notifee.onForegroundEvent(async ({ detail, type }) => {
  if (type === EventType.PRESS && detail.notification.data.channel_id != "notNotification") {
    console.log("Notification Clicked in foreground :", detail.notification.data.channel_id);
    navigate(detail.notification.data.channel_id)
  }
  await Promise.resolve();

});
const toastConfig = {
  /*
    Overwrite 'success' type,
    by modifying the existing `BaseToast` component
  */
  success: (props) => (
    <BaseToast
      {...props}
      style={{ backgroundColor: '#b18c93', borderLeftWidth: 0 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '500',
        color: 'white'
      }}
    />
  ),
  /*
    Overwrite 'error' type,
    by modifying the existing `ErrorToast` component
  */
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ backgroundColor: '#b18c93', borderLeftWidth: 0 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '500',
        color: 'red'
      }}
    />
  ),
}
const App = () => {
  async function requestUserPermission() {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (error) {
      }
    }
    else {
      const settings = await notifee.requestPermission();
      if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied');
      }

    }
  }

  PushNotification.setApplicationIconBadgeNumber(0); //magic
  React.useEffect(() => {
    try {
      requestUserPermission();
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        const { messageId } = remoteMessage;
        const data = remoteMessage.data
        console.log(remoteMessage, "remotemessage...........")
        if (remoteMessage?.data?.channel_type) {
          console.log("chattting message foreground");
          const message = await chatClient.getMessage(remoteMessage.data.id);
          onDisplayNotification(message.message.user.name, message.message.text, remoteMessage.data.channel_id);
          // Get the current badge count
          const currentBadgeCount = await notifee.getBadgeCount();
          // Increment the badge count
          await notifee.setBadgeCount(currentBadgeCount + 1);

          console.log(currentBadgeCount, "count ....");
          return;
        }
        if (Platform.OS === 'android') {
          onDisplayNotification(data.title, data.body)
        } else {
          console.log("ios")
          onDisplayNotification(data.title, data.body)
        }
      });

    //  This method is triggered when a user clicks on a notification while the app is in the background (not killed but not in the foreground).
      messaging().onNotificationOpenedApp(async remoteMessage => {
        if (remoteMessage?.data?.channel_id) {
          console.log("Notification Clicked in background :", remoteMessage.data.channel_id);
          navigate(remoteMessage?.data?.channel_id)
        }
      });
      
       // this method is used to handle notification clicks when the app was completely killed (not running in memory) and was launched as a result of the user clicking a notification.
      messaging().getInitialNotification(async remoteMessage => {
        console.log("kill  state", remoteMessage)
      })

      return unsubscribe;
    } catch (error) {
      console.log(error.message);
    }
  }, []);

  React.useEffect(() => {
    if (Platform.OS == "android") {
      SplashScreen.hide();
    }
  }, [])


  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        await notifee.setBadgeCount(0);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    // Clean up the subscription
    return () => {
      subscription.remove();
    };
  }, [])


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <AppProvider>
          <SafeAreaProvider>
            <Provider store={store}>
              <OverlayProvider>
                <Chat client={chatClient}>
                  <MainStack />
                  <Toast config={toastConfig} />
                </Chat>
              </OverlayProvider>
            </Provider>
          </SafeAreaProvider>
        </AppProvider>

      </View>
    </GestureHandlerRootView>
  );
};



export async function onDisplayNotification(title, message, channel_id = "notNotification") {
  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'notifeeChaneel',
    name: 'notifeeChannel',
    sound: 'default',
    importance: AndroidImportance.HIGH, // Ensure high importance

  });

  // Display a notification
  await notifee.displayNotification({
    title: title,
    body: message,
    data: {
      channel_id: channel_id, // Add additional data inside the 'data' object
    },
    android: {
      channelId,
      smallIcon: 'ic_launcher', // Update with your app's small icon
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      largeIcon: 'ic_launcher'
    },
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
export default App;
