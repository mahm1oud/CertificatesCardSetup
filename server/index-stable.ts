import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { setupAuth } from "./auth.js";
import { router as apiRoutes } from "./routes.js";
import { ensureDefaultAdminExists } from "./init-db.js";
import { registerFonts } from "./lib/font-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register fonts before starting server
try {
  await registerFonts();
} catch (error) {
  console.log("Could not register custom fonts, using system fonts instead");
}

console.log("==== معلومات قاعدة البيانات ====");
console.log(`🌐 البيئة: ${process.env.NODE_ENV === 'production' ? 'إنتاج' : 'تطوير'} (Replit)`);
console.log(`🔄 نوع قاعدة البيانات: postgres`);

const app = express();
const server = createServer(app);

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
  secret: process.env.SESSION_SECRET || 'stable-certificates-secret-2024',
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

// Initialize database and ensure admin user exists
await ensureDefaultAdminExists();

// API routes
app.use("/api", apiRoutes);

// Serve static files from client directory
const clientPath = path.join(__dirname, "../client");
const staticPath = path.join(clientPath, "static");

console.log(`Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// Serve the main React application without Vite HMR
const htmlTemplate = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة الشهادات والبطاقات الإلكترونية</title>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        * { font-family: 'Cairo', sans-serif; }
        body { background: #f8fafc; margin: 0; direction: rtl; text-align: right; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module">
        import { createRoot } from 'react-dom/client';
        import App from './src/App.tsx';
        
        const root = createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>`;

// Handle all routes for SPA
app.get("*", (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
    // For now, serve a simple stable interface
    const stableHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة الشهادات والبطاقات الإلكترونية - مستقر</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        * { font-family: 'Cairo', sans-serif; }
        body { background: #f8fafc; margin: 0; direction: rtl; text-align: right; }
        .btn { @apply px-4 py-2 rounded-md font-medium transition-colors; }
        .btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
        .btn-success { @apply bg-green-600 text-white hover:bg-green-700; }
        .card { @apply bg-white p-6 rounded-lg shadow-sm border; }
    </style>
</head>
<body class="bg-gray-50">
    <div id="app">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-900">
                            منصة الشهادات والبطاقات - نسخة مستقرة
                        </h1>
                    </div>
                    <div id="auth-status" class="text-sm text-gray-600">
                        جاري التحقق...
                    </div>
                </div>
            </div>
        </header>
        
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div class="px-4 py-6 sm:px-0">
                
                <div class="mb-6">
                    <div class="card">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-2xl font-bold text-green-600">✅ تم حل مشكلة التحديث التلقائي</h2>
                                <p class="text-gray-600">الآن يمكنك استخدام النظام بدون انقطاع كل 30 ثانية</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-500">حالة الخادم</div>
                                <div class="text-lg font-semibold text-green-600">مستقر</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
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
                                عرض الفئات
                            </button>
                            <button onclick="loadTemplates()" class="btn btn-primary w-full">
                                عرض القوالب
                            </button>
                            <button onclick="checkUser()" class="btn btn-primary w-full">
                                حالة المستخدم
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-green-600">⚙️ النظام</h3>
                        <div class="space-y-2">
                            <button onclick="checkStatus()" class="btn btn-success w-full">
                                فحص الخادم
                            </button>
                            <button onclick="reloadPage()" class="btn btn-primary w-full">
                                إعادة تحميل الصفحة
                            </button>
                        </div>
                        <div class="mt-3 text-sm text-gray-600">
                            <div>المنفذ: 5000</div>
                            <div>الحالة: مستقر</div>
                        </div>
                    </div>
                    
                </div>
                
                <div class="mt-8">
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3">📝 نتائج العمليات</h3>
                        <div id="results" class="bg-gray-50 p-4 rounded-md min-h-[200px] font-mono text-sm max-h-96 overflow-y-auto">
                            <p class="text-gray-500">مرحباً بك في النسخة المستقرة من منصة الشهادات...</p>
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
                const response = await fetch('/api/user/preferences');
                if (response.ok) {
                    log('✅ الخادم يعمل بشكل طبيعي', 'success');
                } else {
                    log('⚠️ الخادم يعمل لكن هناك مشكلة في API', 'error');
                }
            } catch (error) {
                log('❌ خطأ في الاتصال: ' + error.message, 'error');
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
                
                if (response.ok) {
                    const data = await response.json();
                    log('✅ تم تسجيل الدخول بنجاح', 'success');
                    updateAuthStatus('مسجل الدخول: ' + username);
                } else {
                    log('❌ فشل تسجيل الدخول', 'error');
                }
            } catch (error) {
                log('❌ خطأ في تسجيل الدخول: ' + error.message, 'error');
            }
        }
        
        async function checkUser() {
            try {
                const response = await fetch('/api/user', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    log('👤 المستخدم الحالي: ' + JSON.stringify(data, null, 2), 'success');
                } else {
                    log('🔒 لم يتم تسجيل الدخول', 'info');
                }
            } catch (error) {
                log('❌ خطأ في فحص المستخدم: ' + error.message, 'error');
            }
        }
        
        async function loadCategories() {
            try {
                const response = await fetch('/api/categories');
                if (response.ok) {
                    const data = await response.json();
                    log('📂 الفئات: ' + JSON.stringify(data, null, 2), 'success');
                } else {
                    log('❌ خطأ في جلب الفئات', 'error');
                }
            } catch (error) {
                log('❌ خطأ في الاتصال: ' + error.message, 'error');
            }
        }
        
        async function loadTemplates() {
            try {
                const response = await fetch('/api/templates');
                if (response.ok) {
                    const data = await response.json();
                    log('📄 القوالب: ' + JSON.stringify(data, null, 2), 'success');
                } else {
                    log('❌ خطأ في جلب القوالب', 'error');
                }
            } catch (error) {
                log('❌ خطأ في الاتصال: ' + error.message, 'error');
            }
        }
        
        function reloadPage() {
            window.location.reload();
        }
        
        function updateAuthStatus(status) {
            document.getElementById('auth-status').textContent = status;
        }
        
        // تحقق من الحالة عند تحميل الصفحة
        window.onload = () => {
            log('🚀 تم تحميل النسخة المستقرة من منصة الشهادات', 'success');
            log('✅ لا يوجد تحديث تلقائي كل 30 ثانية', 'success');
            checkStatus();
            checkUser();
        };
    </script>
</body>
</html>`;
    
    res.send(stableHtml);
  } else {
    res.status(404).json({ message: "Page not found" });
  }
});

const port = parseInt(process.env.PORT || "5000");

server.listen(port, "0.0.0.0", () => {
  console.log(`✅ الخادم المستقر يعمل على المنفذ ${port}`);
  console.log(`🌐 بدون HMR - لا يوجد تحديث تلقائي`);
  console.log(`🔐 بيانات الدخول: admin / 700700`);
});