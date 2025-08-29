import Product from "@/models/Product";
import User from "@/models/User";
import Order from "@/models/Order"; // Add Order model
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db"; // ensure DB connection

export async function POST(request) {
    try {
        await connectDB(); // connect to MongoDB

        const { userId } = getAuth(request);
        const { address, items } = await request.json();

        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid data' });
        }

        // calculate amount properly using Promise.all
        const products = await Promise.all(
            items.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product not found: ${item.product}`);
                return product.offerPrice * item.quantity;
            })
        );

        const amount = products.reduce((acc, val) => acc + val, 0);

        // create order directly in DB
        const order = new Order({
            userId,
            address,
            items,
            amount: amount + Math.floor(amount * 0.02), // add 2% extra
            date: Date.now()
        });

        await order.save();

        // clear user cart
        const user = await User.findById(userId);
        if (user) {
            user.cartItems = {};
            await user.save();
        }

        return NextResponse.json({ success: true, message: 'Order Placed', order });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ success: false, message: error.message });
    }
}
