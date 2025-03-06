import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import Card from "./Card";
import { db } from "../firebase"; // Assuming you have a firebase config
import { doc, getDoc } from "firebase/firestore"; // Firestore methods for accessing data

interface FoundItem {
  id: string;
  itemName: string;
  location: string;
  description: string;
  image: string;
  userName: string;
  createdAt: string; // Firestore Timestamp or ISO string
  profilePhoto: string; // Placeholder for profile photo
  phoneNumber: string; // Add phoneNumber to the interface
  uid: string; // UID to fetch profile photo
}

interface FoundItemsListProps {
  items: FoundItem[];
  onCall: (phoneNumber: string) => void; // Pass phone number handler
  onMessage: (postUserId: string, postId: string, postUserName: string, profilePhoto: string) => void; // Pass message handler
}

const FoundItemsList: React.FC<FoundItemsListProps> = ({ items, onCall, onMessage }) => {
  const [profilePhotos, setProfilePhotos] = useState<{ [key: string]: string }>({});

  // Fetch profile photo for each user dynamically based on their UID
  useEffect(() => {
    const fetchProfilePhoto = async (uid: string) => {
      try {
        const userDocRef = doc(db, "users", uid); // Access the user's document by UID
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
        <Text style={styles.noItemsText}>No found items available.</Text>
      ) : (
        items.map((item) => (
          <Card
            key={item.id}
            id={item.id}
            image={item.image}
            itemName={item.itemName}
            description={item.description}
            location={item.location}
            userName={item.userName}
            createdAt={item.createdAt}
            profilePhoto={profilePhotos[item.uid] || ""} // Dynamically fetch profile photo URL
            onCall={() => onCall(item.phoneNumber)} // Pass phoneNumber to onCall
            onMessage={() =>
              onMessage(item.uid, item.id, item.userName || "Unknown", profilePhotos[item.uid] || "")
            }
            dateLost={""} // Leave as empty if not available
            reward={""}
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

export default FoundItemsList;
