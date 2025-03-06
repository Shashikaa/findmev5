import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export const useStripe = () => {
    const createStripeAccount = async () => {
        const user = getAuth().currentUser;
        if (!user) return alert("Please log in first");

        try {
            const response = await fetch("https://tranquil-forest-88658-c68fe352689e.herokuapp.com/create-stripe-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await response.json();
            if (data.accountId) {
                await updateDoc(doc(db, "users", user.uid), {
                    stripeAccountId: data.accountId,
                });

                alert("Stripe account created successfully!");
            } else {
                alert("Failed to create Stripe account");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating Stripe account");
        }
    };

    return { createStripeAccount };
};
