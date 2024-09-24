/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App, { onDisplayNotification } from './App';
import { name as appName } from './app.json';
import { Text, TextInput, Alert } from 'react-native';
import { NotificationManagerAndroid } from './NotificationManager';
import messaging from '@react-native-firebase/messaging';
import { LogBox } from 'react-native';
import { notificationManager } from './NotificationManagerIOS';
import { chatClient } from './ChatConfig';
import notifee, { AndroidImportance,AuthorizationStatus,EventType } from '@notifee/react-native';
import { Channel } from 'stream-chat-react-native';
import { navigate } from './src/navigation/RootNavigation';


LogBox.ignoreLogs(['Warning: ...']); // Ignore log notification by message
LogBox.ignoreAllLogs();//Ignore all log notifications
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;


NotificationManagerAndroid.createChannel();
// android
notifee.onBackgroundEvent(async ({detail,type}) => {
   if (type === EventType.PRESS  &&detail.notification.data.channel_id!="notNotification") {
   console.log("Notification Clicked in Background ", detail.notification.data.channel_id);
   navigate(detail.notification.data.channel_id)
     }
       await Promise.resolve();
     
  });
messaging().setBackgroundMessageHandler(async remoteMessage => {
   console.log("background...." ,remoteMessage)
   if(remoteMessage?.data?.channel_type){
      console.log("chattting message  notifee");
      const message = await chatClient.getMessage(remoteMessage.data.id);
        onDisplayNotification(message.message.user.name,message.message.text ,remoteMessage.data.channel_id);
        await notifee.setBadgeCount(5);
         return;
      //onDisplayNotification(remoteMessage.notification.title,remoteMessage.notification.body);
       }
   const { notification, messageId } = remoteMessage
   if (Platform.OS === 'android') {
      onDisplayNotification(remoteMessage.data.title,remoteMessage.data.body) ;
      await notifee.incrementBadgeCount();

     } 
      else {
         onDisplayNotification(remoteMessage.data.title,remoteMessage.data.body) ;
         await notifee.incrementBadgeCount();

        }

});

AppRegistry.registerComponent(appName, () => App);



