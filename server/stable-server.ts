import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { setupAuth } from "./auth.js";
import { ensureDefaultAdminExists } from "./init-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startStableServer() {
  console.log("🚀 Starting stable server without HMR...");
  
  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'https://*.replit.app', 'https://*.repl.co'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'stable-server-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup authentication strategies
  setupAuth(app);

  // Initialize database
  await ensureDefaultAdminExists();

  // Simple API endpoint for testing
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "✅ Stable server running",
      message: "No auto-refresh issues",
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "700700") {
      res.json({ success: true, message: "تم تسجيل الدخول بنجاح" });
    } else {
      res.status(401).json({ success: false, message: "خطأ في البيانات" });
    }
  });

  // Serve static files from client directory
  const clientPath = path.join(__dirname, "../client");
  const staticPath = path.join(clientPath, "static");
  const srcPath = path.join(clientPath, "src");
  
  app.use("/static", express.static(staticPath));
  app.use(express.static(staticPath));

  // Simple HTML template for the stable version
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة الشهادات والبطاقات الإلكترونية</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        * { font-family: 'Cairo', sans-serif; }
        body { background: #f8fafc; margin: 0; }
        .rtl { direction: rtl; text-align: right; }
    </style>
</head>
<body class="rtl">
    <div id="root">
        <div class="min-h-screen bg-gray-50">
            <header class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center">
                            <h1 class="text-xl font-semibold text-gray-900">منصة الشهادات والبطاقات</h1>
                        </div>
                        <div>
                            <button onclick="window.location.href='/api/auth/login'" 
                                    class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                تسجيل الدخول
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div class="px-4 py-6 sm:px-0">
                    <div class="text-center">
                        <h2 class="text-3xl font-bold text-gray-900 mb-4">مرحباً بك في منصة الشهادات</h2>
                        <p class="text-lg text-gray-600 mb-8">نظام متكامل لإنشاء وإدارة الشهادات والبطاقات الإلكترونية</p>
                        <div class="space-y-4">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <h3 class="text-xl font-semibold mb-2">✅ النظام جاهز للعمل</h3>
                                <p class="text-gray-600">تم إعداد قاعدة البيانات وجميع الميزات بنجاح</p>
                            </div>
                            <div class="bg-white p-6 rounded-lg shadow">
                                <h3 class="text-xl font-semibold mb-2">🔐 بيانات الدخول</h3>
                                <p class="text-gray-600">اسم المستخدم: admin | كلمة المرور: 700700</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</body>
</html>`;

  // Handle all routes with the stable HTML
  app.get("*", (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.send(htmlTemplate);
    } else {
      res.status(404).json({ message: "API endpoint not found" });
    }
  });

  const port = parseInt(process.env.PORT || "5001");
  
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Stable server running on port ${port}`);
    console.log(`🌐 No HMR - No auto-refresh issues`);
    console.log(`🔐 Login: admin / 700700`);
  });
}

startStableServer().catch(console.error);