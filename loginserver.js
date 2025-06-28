require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const supabase = require("./supabaseClient");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "FRONT-END")));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'FRONT-END/index.html'));
});

// USER LOGIN
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

    if (error || !data) {
        console.error("User login error:", error);
        return res.send(`<h2>Invalid email or password!</h2><a href="/">Go back to Login</a>`);
    }

    req.session.userId = data.user_id;
    res.redirect("/dashboard");
});

// FARMER LOGIN
app.post("/selllogin", async (req, res) => {
    const { email, password } = req.body;

    console.log("Farmer login attempt:", email);

    const { data, error } = await supabase
        .from("farmers")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

    if (error || !data) {
        console.error("Farmer login error:", error);
        return res.send(`<h2>Invalid email or password for Farmer Login!</h2><a href="/">Go back</a>`);
    }

    req.session.farmerId = data.farmer_id;
    res.redirect("/farmerdashboard");
});

// USER SIGNUP
app.post("/signup", async (req, res) => {
    const { user_name, email, password } = req.body;

    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", email);

    if (checkError) {
        console.error("User check error:", checkError);
        return res.status(500).json({ success: false, message: "Error checking user" });
    }

    if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, message: "User already exists!" });
    }

    // Insert new user
    const { data, error } = await supabase
        .from("users")
        .insert([{ user_name, email, password }])
        .select("user_id")
        .single();  // fetch the inserted row

    if (error || !data) {
        console.error("User signup error:", error);
        return res.status(500).json({ success: false, message: "Signup failed" });
    }

    // ✅ Set session and redirect
    req.session.userId = data.user_id;
    res.json({ success: true });
});

// FARMER SIGNUP
app.post("/sellsignup", async (req, res) => {
    const { farmer_name, email, phone_number, address, farm_location, password } = req.body;

    const { data: existing, error: checkError } = await supabase
        .from("farmers")
        .select("farmer_id")
        .eq("email", email);

    if (checkError) {
        console.error("Farmer check error:", checkError);
        return res.status(500).json({ success: false, message: 'Error checking farmer' });
    }

    if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Farmer already exists!' });
    }

    const { data, error } = await supabase
        .from("farmers")
        .insert([{ farmer_name, email, phone_number, address, farm_location, password }])
        .select("farmer_id")
        .single();

    if (error || !data) {
        console.error("Farmer signup error:", error);
        return res.status(500).json({ success: false, message: 'Error registering farmer' });
    }

    // ✅ Set session and redirect
    req.session.farmerId = data.farmer_id;
    res.json({ success: true });
});


// ADD PRODUCT
app.post('/addProduct', async (req, res) => {
    const { product_name, description, category, price, quantity, image_url } = req.body;
    const farmer_id = req.session.farmerId;

    if (!farmer_id) return res.status(403).json({ success: false, message: 'Not logged in' });

    const { error } = await supabase.from("products").insert([
        { product_name, description, category, price, quantity, image_url, farmer_id }
    ]);

    if (error) {
        console.error("Add product error:", error);
        return res.status(500).json({ success: false, message: 'Error adding product' });
    }

    res.status(200).json({ success: true, message: 'Product added!' });
});

// VIEW MY PRODUCTS
app.get('/myProducts', async (req, res) => {
    const farmer_id = req.session.farmerId;

    if (!farmer_id) return res.redirect('/selllogin.html');

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("farmer_id", farmer_id);

    if (error) return res.status(500).json({ message: 'Error retrieving products' });

    res.json(data);
});

// VIEW ALL PRODUCTS
app.get('/products', async (req, res) => {
    const { searchQuery = '', category = '', price = '' } = req.query;

    let query = supabase.from("products").select("*");

    if (searchQuery) query = query.ilike("product_name", `%${searchQuery}%`);
    if (category) query = query.eq("category", category);
    if (price === 'low') query = query.order("price", { ascending: true });
    if (price === 'high') query = query.order("price", { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).send({ message: 'Error fetching products' });

    res.json(data);
});

// ✅ ADD TO CART
app.post('/update-quantity', async (req, res) => {
    const { productId, quantity } = req.body;
    const user_id = req.session.userId;

    if (!user_id) return res.status(401).json({ message: 'User not logged in' });

    const { data: product, error: productError } = await supabase
        .from("products")
        .select("quantity")
        .eq("product_id", productId)
        .single();

    if (productError || !product) return res.status(400).json({ message: 'Product not found' });
    if (product.quantity < quantity) return res.status(400).json({ message: 'Not enough stock' });

    const { error: insertError } = await supabase
        .from("cart")
        .upsert(
            { user_id, product_id: productId, quantity },
            { onConflict: ['user_id', 'product_id'] }
        );

    if (insertError) return res.status(500).json({ message: 'Failed to update cart' });

    await supabase
        .from("products")
        .update({ quantity: product.quantity - quantity })
        .eq("product_id", productId);

    res.json({ success: true, message: 'Product added to cart' });
});

// VIEW CART
app.get('/get-cart', async (req, res) => {
    const user_id = req.session.userId;
    if (!user_id) return res.status(401).json({ message: 'Login to view cart' });

    const { data, error } = await supabase
        .from("cart")
        .select(`product_id, quantity, products:product_id (product_name, price)`)
        .eq("user_id", user_id);

    if (error) return res.status(500).send({ message: 'Error fetching cart' });

    const cart = data.map(item => ({
        product_id: item.product_id,
        product_name: item.products.product_name,
        price: item.products.price,
        quantity: item.quantity
    }));

    res.send({ cart });
});

// REMOVE FROM CART
app.post('/remove-from-cart', async (req, res) => {
    const user_id = req.session.userId;
    const { productId } = req.body;

    const { error } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user_id)
        .eq("product_id", productId);

    if (error) return res.status(500).json({ success: false, message: 'Failed to remove' });

    res.json({ success: true });
});

// DASHBOARDS
app.get('/farmerdashboard', (req, res) => {
    if (!req.session.farmerId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'FRONT-END/farmerdashboard.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'FRONT-END/dashboard.html'));
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Error logging out');
        res.redirect('/');
    });
});
app.get('/getFarmerProfile', async (req, res) => {
    if (!req.session.farmerId) return res.status(401).json({ error: 'Not logged in' });

    const { data, error } = await supabase
        .from("farmers")
        .select("farmer_name")
        .eq("farmer_id", req.session.farmerId)
        .single();

    if (error) return res.status(500).json({ error: 'Failed to retrieve farmer name' });

    res.json(data);
});
app.post('/checkout', async (req, res) => {
  const user_id = req.session.userId;
  if (!user_id) return res.status(401).json({ success: false, message: 'Not logged in' });

  try {
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select('product_id, quantity')
      .eq('user_id', user_id);

    if (cartError) throw cartError;
    if (!cartItems || cartItems.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty' });

    for (const { product_id, quantity } of cartItems) {
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('quantity')
        .eq('product_id', product_id)
        .single();
      if (prodErr) throw prodErr;

      const newQty = Math.max(product.quantity - quantity, 0);
      const { error: updateErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('product_id', product_id);
      if (updateErr) throw updateErr;
    }

    const { error: clearErr } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', user_id);
    if (clearErr) throw clearErr;

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Checkout error:', err);
    res.status(500).json({ success: false, message: 'Checkout failed. Try again.' });
  }
});



// START SERVER
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
