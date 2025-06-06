import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { setupAuth } from "./auth.js";
import { ensureDefaultAdminExists } from "./init-db.js";
import { storage } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startNoHMRServer() {
  console.log("🚀 بدء تشغيل الخادم المستقر بدون HMR...");
  
  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'no-hmr-secret-2024',
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

  // API routes for basic functionality
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "تم تشغيل الخادم المستقر بنجاح",
      message: "لا يوجد تحديث تلقائي - النظام مستقر",
      timestamp: new Date().toISOString(),
      user: req.user ? "مسجل الدخول" : "غير مسجل"
    });
  });

  // User authentication endpoints
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ 
      success: true, 
      message: "تم تسجيل الدخول بنجاح",
      user: req.user 
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "خطأ في تسجيل الخروج" });
      }
      res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "غير مصرح به" });
    }
  });

  // Categories endpoint
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الفئات" });
    }
  });

  // Templates endpoint
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json({ templates, total: templates.length });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب القوالب" });
    }
  });

  // Settings endpoints
  app.get("/api/seo/global", (req, res) => {
    res.json({
      title: "منصة الشهادات والبطاقات الإلكترونية",
      description: "نظام متكامل لإنشاء وإدارة الشهادات والبطاقات",
      keywords: "شهادات، بطاقات، إلكترونية"
    });
  });

  app.get("/api/display-settings", (req, res) => {
    res.json({
      settings: {
        displayMode: "multi",
        theme: "light",
        language: "ar"
      }
    });
  });

  app.get("/api/user/preferences", (req, res) => {
    res.json({
      layout: "boxed",
      theme: "light"
    });
  });

  // Static HTML page
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة الشهادات والبطاقات الإلكترونية - النسخة المستقرة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        * { font-family: 'Cairo', sans-serif; }
        body { background: #f8fafc; margin: 0; }
        .rtl { direction: rtl; text-align: right; }
        .btn { @apply px-4 py-2 rounded-md font-medium transition-colors; }
        .btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
        .btn-success { @apply bg-green-600 text-white hover:bg-green-700; }
        .card { @apply bg-white p-6 rounded-lg shadow-sm border; }
    </style>
</head>
<body class="rtl bg-gray-50">
    <div id="app">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-900">
                            منصة الشهادات والبطاقات - النسخة المستقرة
                        </h1>
                    </div>
                    <div id="auth-section">
                        <button onclick="checkAuth()" class="btn btn-primary">
                            تحقق من الحالة
                        </button>
                    </div>
                </div>
            </div>
        </header>
        
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div class="px-4 py-6 sm:px-0">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-green-600">✅ النظام مستقر</h3>
                        <p class="text-gray-600 mb-4">لا يوجد تحديث تلقائي كل 30 ثانية</p>
                        <button onclick="checkStatus()" class="btn btn-success w-full">
                            فحص حالة الخادم
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-blue-600">🔐 تسجيل الدخول</h3>
                        <div class="space-y-3">
                            <input type="text" id="username" placeholder="اسم المستخدم" 
                                   class="w-full p-2 border rounded-md" value="admin">
                            <input type="password" id="password" placeholder="كلمة المرور" 
                                   class="w-full p-2 border rounded-md" value="700700">
                            <button onclick="login()" class="btn btn-primary w-full">
                                تسجيل الدخول
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-purple-600">📊 البيانات</h3>
                        <div class="space-y-2">
                            <button onclick="loadCategories()" class="btn btn-primary w-full">
                                جلب الفئات
                            </button>
                            <button onclick="loadTemplates()" class="btn btn-primary w-full">
                                جلب القوالب
                            </button>
                        </div>
                    </div>
                    
                </div>
                
                <div class="mt-8">
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3">📝 نتائج العمليات</h3>
                        <div id="results" class="bg-gray-50 p-4 rounded-md min-h-[200px] font-mono text-sm">
                            <p class="text-gray-500">انقر على أي زر لرؤية النتائج هنا...</p>
                        </div>
                    </div>
                </div>
                
            </div>
        </main>
    </div>

    <script>
        const results = document.getElementById('results');
        
        function log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString('ar-SA');
            const colors = {
                info: 'text-blue-600',
                success: 'text-green-600',
                error: 'text-red-600'
            };
            results.innerHTML += \`<div class="\${colors[type]}">[\${timestamp}] \${message}</div>\`;
            results.scrollTop = results.scrollHeight;
        }
        
        async function checkStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                log('حالة الخادم: ' + JSON.stringify(data, null, 2), 'success');
            } catch (error) {
                log('خطأ في فحص الحالة: ' + error.message, 'error');
            }
        }
        
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                if (data.success) {
                    log('تم تسجيل الدخول بنجاح: ' + JSON.stringify(data, null, 2), 'success');
                } else {
                    log('فشل تسجيل الدخول: ' + JSON.stringify(data, null, 2), 'error');
                }
            } catch (error) {
                log('خطأ في تسجيل الدخول: ' + error.message, 'error');
            }
        }
        
        async function checkAuth() {
            try {
                const response = await fetch('/api/user', {
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    log('المستخدم مسجل الدخول: ' + JSON.stringify(data, null, 2), 'success');
                } else {
                    log('المستخدم غير مسجل الدخول', 'info');
                }
            } catch (error) {
                log('خطأ في فحص المصادقة: ' + error.message, 'error');
            }
        }
        
        async function loadCategories() {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();
                log('الفئات: ' + JSON.stringify(data, null, 2), 'success');
            } catch (error) {
                log('خطأ في جلب الفئات: ' + error.message, 'error');
            }
        }
        
        async function loadTemplates() {
            try {
                const response = await fetch('/api/templates');
                const data = await response.json();
                log('القوالب: ' + JSON.stringify(data, null, 2), 'success');
            } catch (error) {
                log('خطأ في جلب القوالب: ' + error.message, 'error');
            }
        }
        
        // تحقق من الحالة عند تحميل الصفحة
        window.onload = () => {
            log('تم تحميل النسخة المستقرة من منصة الشهادات', 'success');
            checkStatus();
        };
    </script>
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
    console.log(`✅ الخادم المستقر يعمل على المنفذ ${port}`);
    console.log(`🌐 بدون HMR - لا يوجد تحديث تلقائي`);
    console.log(`🔐 بيانات الدخول: admin / 700700`);
    console.log(`📱 الرابط: http://localhost:${port}`);
  });
}

startNoHMRServer().catch(console.error);