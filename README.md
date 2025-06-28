# 🥦 Nature's Basket – An Organic Marketplace

Welcome to **Nature's Basket**, a full-stack web application where users can shop fresh, organic produce directly from local farmers. It supports **farmer onboarding**, **product management**, **cart functionality**, and a **community feature** – all backed by **Supabase** and deployed via **Render + Netlify**.

---

## 📸 Project Logo

![Nature's Basket Logo](FRONT-END/Photos/logo1.jpg)

---

## 🚀 Features

- 👤 **User Signup & Login**  
- 👨‍🌾 **Farmer Signup & Product Upload**  
- 🛒 **Product Browsing, Filtering & Cart Management**  
- 📦 **Checkout with Live Stock Update**  
- 💬 **Community Section with Comment & Image Upload**  
- 🔐 **Session-Based Authentication (Express + Supabase)**  
- ☁️ **Supabase Database + Render Hosted Backend**

---

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Express Sessions
- **Deployment**: Netlify (Frontend), Render (Backend)
- **Image Upload**: `URL.createObjectURL()` for local previews

---

## 📁 Folder Structure

```bash
natures-basket/
├── FRONT-END/                  # Frontend HTML/CSS/JS files
│   ├── index.html
│   ├── dashboard.html
│   ├── farmerdashboard.html
│   ├── contact.html
│   ├── login.html
│   ├── selllogin.html
│   └── Photos/
├── loginserver.js             # Express server with routes
├── supabaseClient.js          # Supabase client connection
├── .env                       # Environment file (Not pushed)
├── package.json
├── README.md
