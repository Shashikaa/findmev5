import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import Card from "./Card";
import { db } from "../firebase"; // Assuming you have a firebase config
import { doc, getDoc } from "firebase/firestore"; // Firestore methods for accessing data

interface LostItem {
  id: string;
  itemName: string;
  location: string;
  description: string;
  reward: string;
  image: string;
  dateLost: string;
  userName: string;
  createdAt: string; // Ensure this matches the Firestore timestamp format
  profilePhoto: string; // Placeholder for profile photo
  uid: string; // Add userId for messaging
  phoneNumber: string; // Add phoneNumber for calling
}

interface LostItemsListProps {
  items: LostItem[];
  onCall: (id: string) => void;
  onMessage: (
    postUserId: string,
    postId: string,
    postUserName: string,
    profilePhoto: string
  ) => void;
}

const LostItemsList: React.FC<LostItemsListProps> = ({ items, onCall, onMessage }) => {
  const [profilePhotos, setProfilePhotos] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Function to fetch the profile photo for each user
    const fetchProfilePhoto = async (uid: string) => {
      try {
        const userDocRef = doc(db, "users", uid); // Access user's document by UID
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          return userData.profilePhoto; // Return the profile photo URL
        } else {
          console.log("No such document!");
          return "";
        }
      } catch (error) {
        console.error("Error fetching user profile photo:", error);
        return "";
      }
    };

    // Fetch profile photos for all items
    const fetchAllProfilePhotos = async () => {
      const newProfilePhotos: { [key: string]: string } = {};
      
      for (const item of items) {
        if (!newProfilePhotos[item.uid]) {
          const photoUrl = await fetchProfilePhoto(item.uid);
          newProfilePhotos[item.uid] = photoUrl;
        }
      }
      
      setProfilePhotos(newProfilePhotos);
    };

    fetchAllProfilePhotos();
  }, [items]);

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <Text style={styles.noItemsText}>No lost items available.</Text>
      ) : (
        items.map((item) => (
          <Card
            key={item.id}
            id={item.id}
            image={item.image}
            itemName={item.itemName}
            description={item.description}
            location={item.location}
            dateLost={item.dateLost}
            reward={item.reward}
            userName={item.userName || "Unknown"}
            createdAt={item.createdAt} // Pass Firestore timestamp directly
            profilePhoto={profilePhotos[item.uid] || ""} // Dynamically fetch profile photo URL
            onCall={() => onCall(item.phoneNumber)}

            onMessage={() =>
              onMessage(item.uid, item.id, item.userName || "Unknown", profilePhotos[item.uid] || "")
            }
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  noItemsText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
});

export default LostItemsList;
