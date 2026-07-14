const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function checkOrder(orderId) {
  try {
    console.log(`Checking Razorpay Order: ${orderId}`);
    const order = await razorpay.orders.fetch(orderId);
    console.log("Order Details:");
    console.log(JSON.stringify(order, null, 2));

    console.log("\nFetching payments for this order:");
    const payments = await razorpay.orders.fetchPayments(orderId);
    console.log(JSON.stringify(payments, null, 2));
  } catch (error) {
    console.error("❌ Error fetching from Razorpay:", error);
  }
}

const targetOrderId = process.argv[2] || "order_TCPkSae6YAP7HH";
checkOrder(targetOrderId);
