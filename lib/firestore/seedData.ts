import { Product } from './productTypes';

export const sampleProducts: Omit<Product, 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Wireless Bluetooth Headphones',
        price: 79.99,
        description: 'Premium noise-canceling wireless headphones with 30-hour battery life',
        category: 'Electronics',
        inStock: true,
    },
    {
        name: 'Organic Cotton T-Shirt',
        price: 24.99,
        description: 'Comfortable 100% organic cotton t-shirt, eco-friendly',
        category: 'Clothing',
        inStock: true,
    },
    {
        name: 'Stainless Steel Water Bottle',
        price: 19.99,
        description: 'Insulated 20oz water bottle, keeps drinks cold for 24 hours',
        category: 'Home & Kitchen',
        inStock: false,
    },
    {
        name: 'Yoga Mat Premium',
        price: 45.00,
        description: 'Non-slip 6mm thick yoga mat with alignment lines',
        category: 'Sports & Outdoors',
        inStock: true,
    },
    {
        name: 'Smartphone Stand',
        price: 12.99,
        description: 'Adjustable desktop phone stand, compatible with all smartphones',
        category: 'Electronics',
        inStock: true,
    },
    {
        name: 'Coffee Mug Set',
        price: 29.99,
        description: 'Set of 4 ceramic coffee mugs with unique designs',
        category: 'Home & Kitchen',
        inStock: true,
    },
    {
        name: 'Running Shoes',
        price: 89.99,
        description: 'Lightweight running shoes with cushioned soles',
        category: 'Sports & Outdoors',
        inStock: true,
    },
    {
        name: 'LED Desk Lamp',
        price: 34.99,
        description: 'Adjustable LED desk lamp with 3 color temperatures',
        category: 'Electronics',
        inStock: false,
    },
    {
        name: 'Canvas Backpack',
        price: 49.99,
        description: 'Durable canvas backpack with laptop sleeve',
        category: 'Clothing',
        inStock: true,
    },
    {
        name: 'Bluetooth Speaker',
        price: 59.99,
        description: 'Portable waterproof Bluetooth speaker with 360° sound',
        category: 'Electronics',
        inStock: true,
    },
];

export const sampleCategories = [
    'Electronics',
    'Clothing',
    'Home & Kitchen',
    'Sports & Outdoors',
    'Books',
    'Toys & Games',
];