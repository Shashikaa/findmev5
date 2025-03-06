import axios from 'axios';
import sendRiskNotification from './hooks/usePushNotifications'; // Ensure the path is correct and the file exists

// Define the data structure for the request
interface UserData {
  latitude: number;
  longitude: number;
  time_of_day: number;
  user_activity: number;
  proximity: number;
  past_incidents: number;
}

export const getRiskLevel = async (userData: UserData) => {
  try {
    const response = await axios.post('https://murmuring-shelf-63988-da26e6546f16.herokuapp.com/predict', userData);
    const riskLevel = response.data.risk_level;

    // If the risk level is high, send a notification
    if (riskLevel === 1) {
      const message = 'You are in a high-risk area! Stay alert!';
      await sendRiskNotification(message);
    }

    return riskLevel;
  } catch (error) {

    
   /* console.error('Error getting risk level:', error);
    throw error;
    
    */
  }
};
